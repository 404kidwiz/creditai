/**
 * WebSocket Manager
 * 
 * Core WebSocket infrastructure with proper error handling, reconnection logic,
 * message queuing, and subscription management for real-time features.
 */

import { 
  WebSocketMessage, 
  WebSocketConnectionState, 
  WebSocketSubscription,
  WebSocketEventType,
  EventHandler,
  RealtimeEventMap,
  RealtimeConfig
} from '../../types/realtime';
import { ID } from '../../types';

export class WebSocketManager {
  private static instance: WebSocketManager;
  private websocket: WebSocket | null = null;
  private connectionState: WebSocketConnectionState;
  private eventHandlers: Map<WebSocketEventType, Set<EventHandler>> = new Map();
  private subscriptions: Map<string, WebSocketSubscription> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private userId: ID | null = null;
  private sessionId: string;
  private config: RealtimeConfig['websocket'];

  private constructor() {
    this.connectionState = {
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5
    };
    this.sessionId = this.generateSessionId();
    this.config = this.getDefaultConfig();
    
    // Bind methods to preserve context
    this.handleOpen = this.handleOpen.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  static getInstance(): WebSocketManager {
    if (!this.instance) {
      this.instance = new WebSocketManager();
    }
    return this.instance;
  }

  /**
   * Initialize WebSocket connection
   */
  async connect(userId: ID, config?: Partial<RealtimeConfig['websocket']>): Promise<void> {
    if (this.connectionState.isConnected || this.connectionState.isConnecting) {
      return;
    }

    this.userId = userId;
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.connectionState.isConnecting = true;
    this.connectionState.error = undefined;

    try {
      const wsUrl = this.buildWebSocketUrl();
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = this.handleOpen;
      this.websocket.onmessage = this.handleMessage;
      this.websocket.onclose = this.handleClose;
      this.websocket.onerror = this.handleError;

      // Set connection timeout
      setTimeout(() => {
        if (this.connectionState.isConnecting) {
          this.connectionState.isConnecting = false;
          this.connectionState.error = 'Connection timeout';
          this.websocket?.close();
        }
      }, this.config.connectionTimeout);

    } catch (error) {
      this.connectionState.isConnecting = false;
      this.connectionState.error = error instanceof Error ? error.message : 'Unknown connection error';
      throw error;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimeout();
    
    if (this.websocket) {
      this.websocket.onopen = null;
      this.websocket.onmessage = null;
      this.websocket.onclose = null;
      this.websocket.onerror = null;
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }

    this.connectionState = {
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: this.config.maxReconnectAttempts
    };

    this.eventHandlers.clear();
    this.subscriptions.clear();
    this.messageQueue = [];
  }

  /**
   * Subscribe to specific event types
   */
  subscribe<T extends WebSocketEventType>(
    eventType: T,
    handler: EventHandler<RealtimeEventMap[T]>,
    filters?: Record<string, unknown>
  ): string {
    const subscriptionId = this.generateSubscriptionId();
    
    // Add handler to event handlers map
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler as EventHandler);

    // Create subscription record
    const subscription: WebSocketSubscription = {
      id: subscriptionId,
      userId: this.userId!,
      eventTypes: [eventType],
      filters,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    
    this.subscriptions.set(subscriptionId, subscription);

    // Send subscription to server if connected
    if (this.connectionState.isConnected) {
      this.sendMessage({
        id: this.generateMessageId(),
        type: 'subscription',
        timestamp: new Date().toISOString(),
        userId: this.userId!,
        sessionId: this.sessionId,
        data: {
          action: 'subscribe',
          subscription
        }
      });
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Remove handlers
    for (const eventType of subscription.eventTypes) {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        // Note: This removes all handlers for the event type
        // In a more sophisticated implementation, we'd track which handler belongs to which subscription
        handlers.clear();
        if (handlers.size === 0) {
          this.eventHandlers.delete(eventType);
        }
      }
    }

    // Remove subscription
    this.subscriptions.delete(subscriptionId);

    // Notify server if connected
    if (this.connectionState.isConnected) {
      this.sendMessage({
        id: this.generateMessageId(),
        type: 'subscription',
        timestamp: new Date().toISOString(),
        userId: this.userId!,
        sessionId: this.sessionId,
        data: {
          action: 'unsubscribe',
          subscriptionId
        }
      });
    }
  }

  /**
   * Send message through WebSocket
   */
  sendMessage(message: Omit<WebSocketMessage, 'id' | 'timestamp'>): void {
    const fullMessage: WebSocketMessage = {
      id: this.generateMessageId(),
      timestamp: new Date().toISOString(),
      ...message
    };

    if (this.connectionState.isConnected && this.websocket?.readyState === WebSocket.OPEN) {
      try {
        this.websocket.send(JSON.stringify(fullMessage));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.queueMessage(fullMessage);
      }
    } else {
      this.queueMessage(fullMessage);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): WebSocketConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): WebSocketSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  // Private methods

  private handleOpen(): void {
    console.log('WebSocket connection established');
    
    this.connectionState = {
      isConnected: true,
      isConnecting: false,
      isReconnecting: false,
      lastConnected: new Date().toISOString(),
      reconnectAttempts: 0,
      maxReconnectAttempts: this.config.maxReconnectAttempts
    };

    // Start heartbeat
    this.startHeartbeat();

    // Send authentication message
    this.sendAuthMessage();

    // Process queued messages
    this.processMessageQueue();

    // Reestablish subscriptions
    this.reestablishSubscriptions();

    // Emit connection event
    this.emitEvent('connection', { status: 'connected' });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.routeMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket connection closed:', event.code, event.reason);
    
    this.connectionState.isConnected = false;
    this.connectionState.isConnecting = false;
    this.stopHeartbeat();

    // Attempt reconnection unless it was a clean close
    if (event.code !== 1000 && event.code !== 1001) {
      this.attemptReconnect();
    }

    // Emit disconnect event
    this.emitEvent('disconnection', { 
      code: event.code, 
      reason: event.reason,
      wasClean: event.wasClean 
    });
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.connectionState.error = 'WebSocket error occurred';
    
    // Emit error event
    this.emitEvent('error', { 
      message: 'WebSocket error occurred',
      event 
    });
  }

  private attemptReconnect(): void {
    if (this.connectionState.reconnectAttempts >= this.connectionState.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.connectionState.error = 'Max reconnection attempts reached';
      return;
    }

    this.connectionState.isReconnecting = true;
    this.connectionState.reconnectAttempts++;

    const delay = Math.min(
      1000 * Math.pow(2, this.connectionState.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.connectionState.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId);
      }
    }, delay);
  }

  private routeMessage(message: WebSocketMessage): void {
    // Handle system messages
    if (message.type === 'heartbeat') {
      this.handleHeartbeat(message);
      return;
    }

    if (message.type === 'error') {
      this.handleServerError(message);
      return;
    }

    // Route to appropriate handlers
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in event handler for ${message.type}:`, error);
        }
      });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState.isConnected) {
        this.sendMessage({
          type: 'heartbeat',
          data: { timestamp: new Date().toISOString() }
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private handleHeartbeat(message: WebSocketMessage): void {
    // Server heartbeat received, connection is healthy
    console.debug('Heartbeat received');
  }

  private handleServerError(message: WebSocketMessage): void {
    console.error('Server error:', message.data);
    this.connectionState.error = message.data?.message || 'Server error';
  }

  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);
    
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      
      if (this.websocket?.readyState === WebSocket.OPEN) {
        try {
          this.websocket.send(JSON.stringify(message));
        } catch (error) {
          console.error('Failed to send queued message:', error);
          // Put message back at front of queue
          this.messageQueue.unshift(message);
          break;
        }
      } else {
        // Put message back and stop processing
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  private reestablishSubscriptions(): void {
    for (const subscription of this.subscriptions.values()) {
      this.sendMessage({
        type: 'subscription',
        data: {
          action: 'subscribe',
          subscription
        }
      });
    }
  }

  private sendAuthMessage(): void {
    if (this.userId) {
      this.sendMessage({
        type: 'auth',
        userId: this.userId,
        data: {
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  private emitEvent(eventType: string, data: unknown): void {
    // Emit to any connection-level event listeners
    const handlers = this.eventHandlers.get(eventType as WebSocketEventType);
    if (handlers) {
      const message: WebSocketMessage = {
        id: this.generateMessageId(),
        type: eventType as WebSocketEventType,
        timestamp: new Date().toISOString(),
        data
      };

      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in connection event handler:`, error);
        }
      });
    }
  }

  private buildWebSocketUrl(): string {
    const baseUrl = this.config.url;
    const params = new URLSearchParams({
      userId: this.userId!,
      sessionId: this.sessionId
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultConfig(): RealtimeConfig['websocket'] {
    return {
      url: process.env.NODE_ENV === 'production' 
        ? `wss://${typeof window !== 'undefined' ? window.location.host : 'localhost'}/ws`
        : 'ws://localhost:3001/ws',
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000, // 30 seconds
      connectionTimeout: 10000   // 10 seconds
    };
  }
}