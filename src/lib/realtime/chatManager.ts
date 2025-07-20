/**
 * Live Chat Support Manager
 * 
 * Manages real-time chat sessions, agent routing, message persistence,
 * and chat features like typing indicators and file sharing.
 */

import { WebSocketManager } from './websocketManager';
import { NotificationManager } from './notificationManager';
import {
  ChatMessage,
  ChatSession,
  ChatAgent,
  ChatTypingIndicator,
  ChatQuickReply,
  ChatTransfer,
  ChatSessionStatus,
  ChatParticipantRole,
  ChatMessageType
} from '../../types/realtime';
import { ID } from '../../types';

export interface ChatManagerOptions {
  enableFileSharing: boolean;
  maxFileSize: number; // bytes
  allowedFileTypes: string[];
  maxMessageLength: number;
  typingIndicatorTimeout: number;
  agentResponseTimeout: number; // seconds
  sessionTimeout: number; // minutes
  enableAutoRouting: boolean;
  enableChatbotIntegration: boolean;
}

export interface ChatRoutingCriteria {
  department?: string;
  language?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  specialization?: string[];
  previousAgentId?: ID;
}

export interface ChatMetrics {
  averageWaitTime: number;
  averageResolutionTime: number;
  customerSatisfactionScore: number;
  totalSessions: number;
  activeSessions: number;
  resolvedSessions: number;
  abandonedSessions: number;
  agentUtilization: number;
}

export class ChatManager {
  private static instance: ChatManager;
  private wsManager: WebSocketManager;
  private notificationManager: NotificationManager;
  private activeSessions: Map<ID, ChatSession> = new Map();
  private sessionMessages: Map<ID, ChatMessage[]> = new Map();
  private availableAgents: Map<ID, ChatAgent> = new Map();
  private userSessions: Map<ID, ID> = new Map(); // userId -> sessionId
  private typingIndicators: Map<ID, ChatTypingIndicator> = new Map();
  private typingTimeouts: Map<ID, NodeJS.Timeout> = new Map();
  private sessionTimeouts: Map<ID, NodeJS.Timeout> = new Map();
  private options: ChatManagerOptions;

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.notificationManager = NotificationManager.getInstance();
    this.options = this.getDefaultOptions();
    this.initializeEventHandlers();
  }

  static getInstance(): ChatManager {
    if (!this.instance) {
      this.instance = new ChatManager();
    }
    return this.instance;
  }

  /**
   * Initialize chat manager with options
   */
  initialize(options: Partial<ChatManagerOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('Chat manager initialized with options:', this.options);
  }

  /**
   * Start a new chat session
   */
  async startChatSession(
    userId: ID,
    topic?: string,
    routingCriteria?: ChatRoutingCriteria
  ): Promise<ChatSession> {
    // Check if user already has an active session
    const existingSessionId = this.userSessions.get(userId);
    if (existingSessionId) {
      const existingSession = this.activeSessions.get(existingSessionId);
      if (existingSession && existingSession.status === 'active') {
        return existingSession;
      }
    }

    // Create new session
    const session: ChatSession = {
      id: this.generateSessionId(),
      userId,
      status: 'waiting',
      topic,
      priority: routingCriteria?.priority || 'normal',
      department: routingCriteria?.department || 'support',
      language: routingCriteria?.language || 'en',
      startedAt: new Date().toISOString()
    };

    this.activeSessions.set(session.id, session);
    this.userSessions.set(userId, session.id);
    this.sessionMessages.set(session.id, []);

    // Set up session timeout
    this.setupSessionTimeout(session.id);

    // Try to route to an agent
    if (this.options.enableAutoRouting) {
      await this.routeToAgent(session, routingCriteria);
    }

    // Send welcome message
    await this.sendSystemMessage(session.id, 'Welcome to CreditAI Support! How can we help you today?');

    // Store session in database
    await this.storeSession(session);

    // Emit session started event
    this.emitChatEvent('session_started', { session });

    console.log(`Chat session started: ${session.id} for user: ${userId}`);
    return session;
  }

  /**
   * Send a message in a chat session
   */
  async sendMessage(
    sessionId: ID,
    senderId: ID,
    content: string,
    messageType: ChatMessageType = 'text',
    metadata?: Record<string, unknown>
  ): Promise<ChatMessage> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Chat session not found: ${sessionId}`);
    }

    // Validate message
    if (content.length > this.options.maxMessageLength) {
      throw new Error(`Message exceeds maximum length of ${this.options.maxMessageLength} characters`);
    }

    // Determine sender role
    const senderRole: ChatParticipantRole = this.getSenderRole(senderId, session);

    const message: ChatMessage = {
      id: this.generateMessageId(),
      sessionId,
      senderId,
      senderRole,
      type: messageType,
      content,
      metadata,
      timestamp: new Date().toISOString(),
      isDelivered: false,
      isRead: false
    };

    // Add to message history
    const messages = this.sessionMessages.get(sessionId) || [];
    messages.push(message);
    this.sessionMessages.set(sessionId, messages);

    // Update session last message time
    session.lastMessageAt = message.timestamp;

    // Clear typing indicator
    this.clearTypingIndicator(sessionId, senderId);

    // Send via WebSocket to all session participants
    await this.broadcastToSession(sessionId, {
      type: 'chat_message',
      data: message
    });

    // Mark as delivered
    message.isDelivered = true;

    // Store message in database
    await this.storeMessage(message);

    // Handle agent response timeout
    if (senderRole === 'user' && session.agentId) {
      this.startAgentResponseTimer(sessionId);
    }

    // Auto-route if no agent assigned and user is asking for help
    if (!session.agentId && senderRole === 'user' && this.options.enableAutoRouting) {
      await this.routeToAgent(session);
    }

    console.log(`Message sent in session ${sessionId}:`, message);
    return message;
  }

  /**
   * Set typing indicator
   */
  setTypingIndicator(sessionId: ID, userId: ID, isTyping: boolean): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const indicator: ChatTypingIndicator = {
      sessionId,
      userId,
      isTyping,
      timestamp: new Date().toISOString()
    };

    if (isTyping) {
      this.typingIndicators.set(`${sessionId}_${userId}`, indicator);
      
      // Clear existing timeout
      const existingTimeout = this.typingTimeouts.get(`${sessionId}_${userId}`);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        this.setTypingIndicator(sessionId, userId, false);
      }, this.options.typingIndicatorTimeout);
      
      this.typingTimeouts.set(`${sessionId}_${userId}`, timeout);
    } else {
      this.typingIndicators.delete(`${sessionId}_${userId}`);
      const timeout = this.typingTimeouts.get(`${sessionId}_${userId}`);
      if (timeout) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(`${sessionId}_${userId}`);
      }
    }

    // Broadcast typing indicator
    this.broadcastToSession(sessionId, {
      type: 'typing_indicator',
      data: indicator
    });
  }

  /**
   * Transfer session to another agent
   */
  async transferSession(sessionId: ID, fromAgentId: ID, toAgentId: ID, reason: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Chat session not found: ${sessionId}`);
    }

    const toAgent = this.availableAgents.get(toAgentId);
    if (!toAgent || !toAgent.isAvailable) {
      throw new Error(`Agent ${toAgentId} is not available`);
    }

    // Create transfer record
    const transfer: ChatTransfer = {
      id: this.generateTransferId(),
      fromAgentId,
      toAgentId,
      reason,
      timestamp: new Date().toISOString()
    };

    // Update session
    session.agentId = toAgentId;
    session.transferHistory = session.transferHistory || [];
    session.transferHistory.push(transfer);

    // Update agent availability
    const fromAgent = this.availableAgents.get(fromAgentId);
    if (fromAgent) {
      fromAgent.currentSessions--;
    }
    toAgent.currentSessions++;

    // Send transfer notification
    await this.sendSystemMessage(
      sessionId,
      `Your chat has been transferred to ${toAgent.displayName}. ${reason}`
    );

    // Notify agents
    await this.notificationManager.sendNotification({
      userId: toAgentId,
      type: 'system_notification',
      channel: ['in_app'],
      title: 'Chat Transfer',
      body: `You have been assigned a transferred chat session`,
      data: { sessionId, transfer },
      priority: 'normal'
    });

    console.log(`Session ${sessionId} transferred from ${fromAgentId} to ${toAgentId}`);
  }

  /**
   * End a chat session
   */
  async endSession(sessionId: ID, endedBy: ID, feedback?: { rating: number; comment: string }): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Chat session not found: ${sessionId}`);
    }

    // Update session status
    session.status = 'resolved';
    session.endedAt = new Date().toISOString();
    
    if (feedback) {
      session.satisfactionRating = feedback.rating;
      session.feedback = feedback.comment;
    }

    // Calculate metrics
    const startTime = new Date(session.startedAt).getTime();
    const endTime = new Date(session.endedAt).getTime();
    session.resolutionTimeMinutes = Math.round((endTime - startTime) / (1000 * 60));

    // Update agent availability
    if (session.agentId) {
      const agent = this.availableAgents.get(session.agentId);
      if (agent) {
        agent.currentSessions--;
        agent.totalSessions++;
      }
    }

    // Clear timeouts
    const sessionTimeout = this.sessionTimeouts.get(sessionId);
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      this.sessionTimeouts.delete(sessionId);
    }

    // Clean up user session mapping
    this.userSessions.delete(session.userId);

    // Send end session message
    await this.sendSystemMessage(sessionId, 'This chat session has been ended. Thank you for contacting CreditAI Support!');

    // Store final session state
    await this.storeSession(session);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    console.log(`Chat session ended: ${sessionId}`);
  }

  /**
   * Get session messages
   */
  getSessionMessages(sessionId: ID, limit?: number): ChatMessage[] {
    const messages = this.sessionMessages.get(sessionId) || [];
    return limit ? messages.slice(-limit) : messages;
  }

  /**
   * Get active sessions for a user
   */
  getUserSession(userId: ID): ChatSession | null {
    const sessionId = this.userSessions.get(userId);
    return sessionId ? this.activeSessions.get(sessionId) || null : null;
  }

  /**
   * Get agent status and metrics
   */
  getAgentMetrics(agentId: ID): Partial<ChatAgent> | null {
    return this.availableAgents.get(agentId) || null;
  }

  /**
   * Get overall chat metrics
   */
  getChatMetrics(): ChatMetrics {
    const sessions = Array.from(this.activeSessions.values());
    
    return {
      averageWaitTime: this.calculateAverageWaitTime(sessions),
      averageResolutionTime: this.calculateAverageResolutionTime(sessions),
      customerSatisfactionScore: this.calculateSatisfactionScore(sessions),
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      resolvedSessions: sessions.filter(s => s.status === 'resolved').length,
      abandonedSessions: sessions.filter(s => s.status === 'abandoned').length,
      agentUtilization: this.calculateAgentUtilization()
    };
  }

  /**
   * Register/update agent availability
   */
  updateAgentStatus(agent: ChatAgent): void {
    this.availableAgents.set(agent.id, agent);
    console.log(`Agent status updated: ${agent.id} - ${agent.status}`);
  }

  // Private methods

  private initializeEventHandlers(): void {
    // Subscribe to chat message events
    this.wsManager.subscribe('chat_message', (message) => {
      const chatMessage = message.data as ChatMessage;
      this.handleIncomingMessage(chatMessage);
    });

    console.log('Chat manager event handlers initialized');
  }

  private async handleIncomingMessage(message: ChatMessage): Promise<void> {
    // Handle incoming messages from WebSocket
    console.log('Handling incoming chat message:', message);
    
    // This would be called when receiving messages from external sources
    // For now, most messages are handled directly through sendMessage
  }

  private async routeToAgent(session: ChatSession, criteria?: ChatRoutingCriteria): Promise<void> {
    const availableAgents = Array.from(this.availableAgents.values())
      .filter(agent => 
        agent.isAvailable && 
        agent.status === 'online' &&
        agent.currentSessions < agent.maxSessions
      );

    if (availableAgents.length === 0) {
      console.log(`No agents available for session ${session.id}`);
      return;
    }

    // Simple routing algorithm - could be enhanced with more sophisticated logic
    let selectedAgent = availableAgents[0];

    // Filter by department
    if (criteria?.department) {
      const departmentAgents = availableAgents.filter(a => a.department === criteria.department);
      if (departmentAgents.length > 0) {
        selectedAgent = departmentAgents[0];
      }
    }

    // Filter by language
    if (criteria?.language) {
      const languageAgents = availableAgents.filter(a => a.languages.includes(criteria.language));
      if (languageAgents.length > 0) {
        selectedAgent = languageAgents[0];
      }
    }

    // Assign agent to session
    session.agentId = selectedAgent.id;
    session.status = 'active';
    selectedAgent.currentSessions++;

    // Notify agent
    await this.notificationManager.sendNotification({
      userId: selectedAgent.id,
      type: 'system_notification',
      channel: ['in_app'],
      title: 'New Chat Assignment',
      body: `You have been assigned a new chat session`,
      data: { sessionId: session.id },
      priority: 'normal'
    });

    // Send connection message
    await this.sendSystemMessage(
      session.id,
      `You've been connected to ${selectedAgent.displayName}. How can I help you today?`
    );

    console.log(`Session ${session.id} routed to agent ${selectedAgent.id}`);
  }

  private async sendSystemMessage(sessionId: ID, content: string): Promise<void> {
    const systemMessage: ChatMessage = {
      id: this.generateMessageId(),
      sessionId,
      senderId: 'system',
      senderRole: 'system',
      type: 'system',
      content,
      timestamp: new Date().toISOString(),
      isDelivered: true,
      isRead: false
    };

    const messages = this.sessionMessages.get(sessionId) || [];
    messages.push(systemMessage);
    this.sessionMessages.set(sessionId, messages);

    await this.broadcastToSession(sessionId, {
      type: 'chat_message',
      data: systemMessage
    });

    await this.storeMessage(systemMessage);
  }

  private async broadcastToSession(sessionId: ID, message: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Send to user
    this.wsManager.sendMessage({
      type: 'chat_message',
      userId: session.userId,
      data: message.data
    });

    // Send to agent if assigned
    if (session.agentId) {
      this.wsManager.sendMessage({
        type: 'chat_message',
        userId: session.agentId,
        data: message.data
      });
    }
  }

  private getSenderRole(senderId: ID, session: ChatSession): ChatParticipantRole {
    if (senderId === 'system') return 'system';
    if (senderId === session.userId) return 'user';
    if (senderId === session.agentId) return 'agent';
    return 'user'; // Default
  }

  private clearTypingIndicator(sessionId: ID, userId: ID): void {
    const key = `${sessionId}_${userId}`;
    this.typingIndicators.delete(key);
    
    const timeout = this.typingTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(key);
    }
  }

  private setupSessionTimeout(sessionId: ID): void {
    const timeout = setTimeout(() => {
      this.handleSessionTimeout(sessionId);
    }, this.options.sessionTimeout * 60 * 1000);
    
    this.sessionTimeouts.set(sessionId, timeout);
  }

  private async handleSessionTimeout(sessionId: ID): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.status = 'abandoned';
    
    await this.sendSystemMessage(
      sessionId,
      'This chat session has timed out due to inactivity.'
    );

    await this.endSession(sessionId, 'system');
  }

  private startAgentResponseTimer(sessionId: ID): void {
    // Clear existing timer
    const existingTimer = this.sessionTimeouts.get(`${sessionId}_agent_response`);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.handleAgentResponseTimeout(sessionId);
    }, this.options.agentResponseTimeout * 1000);
    
    this.sessionTimeouts.set(`${sessionId}_agent_response`, timer);
  }

  private async handleAgentResponseTimeout(sessionId: ID): Promise<void> {
    await this.sendSystemMessage(
      sessionId,
      'Our agent will respond shortly. Thank you for your patience.'
    );
  }

  private emitChatEvent(eventType: string, data: any): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(eventType, { detail: data });
      window.dispatchEvent(event);
    }
  }

  // Calculation methods

  private calculateAverageWaitTime(sessions: ChatSession[]): number {
    const waitingSessions = sessions.filter(s => s.waitTimeMinutes !== undefined);
    if (waitingSessions.length === 0) return 0;
    
    const totalWaitTime = waitingSessions.reduce((sum, s) => sum + (s.waitTimeMinutes || 0), 0);
    return Math.round(totalWaitTime / waitingSessions.length);
  }

  private calculateAverageResolutionTime(sessions: ChatSession[]): number {
    const resolvedSessions = sessions.filter(s => s.resolutionTimeMinutes !== undefined);
    if (resolvedSessions.length === 0) return 0;
    
    const totalResolutionTime = resolvedSessions.reduce((sum, s) => sum + (s.resolutionTimeMinutes || 0), 0);
    return Math.round(totalResolutionTime / resolvedSessions.length);
  }

  private calculateSatisfactionScore(sessions: ChatSession[]): number {
    const ratedSessions = sessions.filter(s => s.satisfactionRating !== undefined);
    if (ratedSessions.length === 0) return 0;
    
    const totalRating = ratedSessions.reduce((sum, s) => sum + (s.satisfactionRating || 0), 0);
    return Math.round((totalRating / ratedSessions.length) * 10) / 10;
  }

  private calculateAgentUtilization(): number {
    const agents = Array.from(this.availableAgents.values());
    if (agents.length === 0) return 0;
    
    const totalCapacity = agents.reduce((sum, agent) => sum + agent.maxSessions, 0);
    const currentLoad = agents.reduce((sum, agent) => sum + agent.currentSessions, 0);
    
    return Math.round((currentLoad / totalCapacity) * 100);
  }

  // Generator methods

  private generateSessionId(): string {
    return `chat_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `chat_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTransferId(): string {
    return `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultOptions(): ChatManagerOptions {
    return {
      enableFileSharing: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
      maxMessageLength: 2000,
      typingIndicatorTimeout: 5000, // 5 seconds
      agentResponseTimeout: 120, // 2 minutes
      sessionTimeout: 30, // 30 minutes
      enableAutoRouting: true,
      enableChatbotIntegration: false
    };
  }

  // Mock database methods (would be replaced with real implementations)

  private async storeSession(session: ChatSession): Promise<void> {
    console.log('Storing chat session in database:', session);
  }

  private async storeMessage(message: ChatMessage): Promise<void> {
    console.log('Storing chat message in database:', message);
  }
}