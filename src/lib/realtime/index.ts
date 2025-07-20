/**
 * Real-time Features Index
 * 
 * Central orchestrator for all real-time features including credit monitoring,
 * notifications, dispute tracking, chat support, and collaboration.
 */

import { WebSocketManager } from './websocketManager';
import { CreditScoreMonitor } from './creditScoreMonitor';
import { NotificationManager } from './notificationManager';
import { DisputeTracker } from './disputeTracker';
import { ChatManager } from './chatManager';
import { CollaborationManager } from './collaborationManager';
import { RealtimeConfig } from '../../types/realtime';
import { ID } from '../../types';

export interface RealtimeManagerOptions {
  userId: ID;
  enableCreditMonitoring?: boolean;
  enableNotifications?: boolean;
  enableDisputeTracking?: boolean;
  enableChat?: boolean;
  enableCollaboration?: boolean;
  websocketConfig?: Partial<RealtimeConfig['websocket']>;
  autoConnect?: boolean;
}

export interface RealtimeStatus {
  isConnected: boolean;
  features: {
    creditMonitoring: boolean;
    notifications: boolean;
    disputeTracking: boolean;
    chat: boolean;
    collaboration: boolean;
  };
  connectionHealth: {
    latency: number;
    uptime: number;
    reconnectCount: number;
  };
}

export class RealtimeManager {
  private static instance: RealtimeManager;
  private wsManager: WebSocketManager;
  private creditMonitor: CreditScoreMonitor;
  private notificationManager: NotificationManager;
  private disputeTracker: DisputeTracker;
  private chatManager: ChatManager;
  private collaborationManager: CollaborationManager;
  private isInitialized = false;
  private currentUserId: ID | null = null;
  private enabledFeatures: Set<string> = new Set();

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.creditMonitor = CreditScoreMonitor.getInstance();
    this.notificationManager = NotificationManager.getInstance();
    this.disputeTracker = DisputeTracker.getInstance();
    this.chatManager = ChatManager.getInstance();
    this.collaborationManager = CollaborationManager.getInstance();
  }

  static getInstance(): RealtimeManager {
    if (!this.instance) {
      this.instance = new RealtimeManager();
    }
    return this.instance;
  }

  /**
   * Initialize all real-time features
   */
  async initialize(options: RealtimeManagerOptions): Promise<void> {
    if (this.isInitialized && this.currentUserId === options.userId) {
      console.log('Real-time manager already initialized for this user');
      return;
    }

    console.log('Initializing real-time manager for user:', options.userId);
    
    this.currentUserId = options.userId;

    try {
      // Initialize WebSocket connection
      if (options.autoConnect !== false) {
        await this.wsManager.connect(options.userId, options.websocketConfig);
      }

      // Initialize individual features based on options
      if (options.enableCreditMonitoring !== false) {
        await this.enableCreditMonitoring();
      }

      if (options.enableNotifications !== false) {
        await this.enableNotifications();
      }

      if (options.enableDisputeTracking !== false) {
        await this.enableDisputeTracking();
      }

      if (options.enableChat !== false) {
        await this.enableChat();
      }

      if (options.enableCollaboration !== false) {
        await this.enableCollaboration();
      }

      this.isInitialized = true;
      console.log('Real-time manager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize real-time manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown all real-time features
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down real-time manager');

    try {
      // Stop all features
      if (this.currentUserId) {
        if (this.enabledFeatures.has('creditMonitoring')) {
          this.creditMonitor.stopMonitoring(this.currentUserId);
        }

        if (this.enabledFeatures.has('disputeTracking')) {
          this.disputeTracker.stopTracking(this.currentUserId);
        }
      }

      // Disconnect WebSocket
      this.wsManager.disconnect();

      // Reset state
      this.isInitialized = false;
      this.currentUserId = null;
      this.enabledFeatures.clear();

      console.log('Real-time manager shutdown complete');

    } catch (error) {
      console.error('Error during real-time manager shutdown:', error);
    }
  }

  /**
   * Get current real-time status
   */
  getStatus(): RealtimeStatus {
    const connectionState = this.wsManager.getConnectionState();

    return {
      isConnected: connectionState.isConnected,
      features: {
        creditMonitoring: this.enabledFeatures.has('creditMonitoring'),
        notifications: this.enabledFeatures.has('notifications'),
        disputeTracking: this.enabledFeatures.has('disputeTracking'),
        chat: this.enabledFeatures.has('chat'),
        collaboration: this.enabledFeatures.has('collaboration')
      },
      connectionHealth: {
        latency: 0, // Would be calculated from ping/pong
        uptime: connectionState.lastConnected ? 
          Date.now() - new Date(connectionState.lastConnected).getTime() : 0,
        reconnectCount: connectionState.reconnectAttempts
      }
    };
  }

  /**
   * Enable/disable specific features
   */
  async toggleFeature(feature: string, enabled: boolean): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('Real-time manager not initialized');
    }

    switch (feature) {
      case 'creditMonitoring':
        if (enabled) {
          await this.enableCreditMonitoring();
        } else {
          this.creditMonitor.stopMonitoring(this.currentUserId);
          this.enabledFeatures.delete('creditMonitoring');
        }
        break;

      case 'disputeTracking':
        if (enabled) {
          await this.enableDisputeTracking();
        } else {
          this.disputeTracker.stopTracking(this.currentUserId);
          this.enabledFeatures.delete('disputeTracking');
        }
        break;

      case 'notifications':
      case 'chat':
      case 'collaboration':
        // These are always enabled when initialized
        break;

      default:
        console.warn(`Unknown feature: ${feature}`);
    }
  }

  /**
   * Access to individual managers
   */
  get credit(): CreditScoreMonitor {
    return this.creditMonitor;
  }

  get notifications(): NotificationManager {
    return this.notificationManager;
  }

  get disputes(): DisputeTracker {
    return this.disputeTracker;
  }

  get chat(): ChatManager {
    return this.chatManager;
  }

  get collaboration(): CollaborationManager {
    return this.collaborationManager;
  }

  get websocket(): WebSocketManager {
    return this.wsManager;
  }

  // Private methods

  private async enableCreditMonitoring(): Promise<void> {
    if (!this.currentUserId) return;

    await this.creditMonitor.startMonitoring(this.currentUserId, {
      enableRealTimeMonitoring: true,
      alertThresholds: {
        minScoreChange: 10,
        maxUtilizationIncrease: 15,
        enableNewAccountAlerts: true,
        enableSuspiciousActivityAlerts: true
      },
      notificationChannels: {
        email: true,
        push: true,
        sms: false,
        inApp: true
      }
    });

    this.enabledFeatures.add('creditMonitoring');
    console.log('Credit monitoring enabled');
  }

  private async enableNotifications(): Promise<void> {
    this.notificationManager.initialize({
      enablePushNotifications: true,
      enableEmailNotifications: true,
      enableSMSNotifications: false,
      maxRetries: 3,
      retryDelay: 5000
    });

    this.enabledFeatures.add('notifications');
    console.log('Notifications enabled');
  }

  private async enableDisputeTracking(): Promise<void> {
    if (!this.currentUserId) return;

    await this.disputeTracker.startTracking(this.currentUserId, {
      enableRealTimeUpdates: true,
      enableAutomaticNotifications: true,
      reminderSettings: {
        enableDeadlineReminders: true,
        reminderDaysBefore: [7, 3, 1],
        enableProgressReminders: true
      }
    });

    this.enabledFeatures.add('disputeTracking');
    console.log('Dispute tracking enabled');
  }

  private async enableChat(): Promise<void> {
    this.chatManager.initialize({
      enableFileSharing: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      enableAutoRouting: true,
      sessionTimeout: 30 // 30 minutes
    });

    this.enabledFeatures.add('chat');
    console.log('Chat support enabled');
  }

  private async enableCollaboration(): Promise<void> {
    this.collaborationManager.initialize({
      enableRealTimeEditing: true,
      enableComments: true,
      enableVersionHistory: true,
      maxCollaborators: 10,
      autoSaveInterval: 30000 // 30 seconds
    });

    this.enabledFeatures.add('collaboration');
    console.log('Collaboration features enabled');
  }
}

// Export individual managers for direct access
export {
  WebSocketManager,
  CreditScoreMonitor,
  NotificationManager,
  DisputeTracker,
  ChatManager,
  CollaborationManager
};

// Export types
export * from '../../types/realtime';

// Default export is the main manager
export default RealtimeManager;