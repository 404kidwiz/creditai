/**
 * Real-time Dispute Tracker
 * 
 * Tracks dispute status changes in real-time, manages dispute timelines,
 * and provides live updates on dispute progress and required actions.
 */

import { WebSocketManager } from './websocketManager';
import { NotificationManager } from './notificationManager';
import {
  DisputeStatusUpdate,
  DisputeTrackingState,
  DisputeTimelineEvent,
  DisputeStatusUpdateType
} from '../../types/realtime';
import { ID, DisputeStatus } from '../../types';

export interface DisputeTrackerOptions {
  enableRealTimeUpdates: boolean;
  enableAutomaticNotifications: boolean;
  trackingUpdateInterval: number;
  reminderSettings: {
    enableDeadlineReminders: boolean;
    reminderDaysBefore: number[];
    enableProgressReminders: boolean;
  };
}

export interface DisputeMetrics {
  totalDisputes: number;
  activeDisputes: number;
  resolvedDisputes: number;
  averageResolutionTime: number;
  successRate: number;
  disputesByStatus: Record<DisputeStatus, number>;
  recentActivity: DisputeTimelineEvent[];
}

export class DisputeTracker {
  private static instance: DisputeTracker;
  private wsManager: WebSocketManager;
  private notificationManager: NotificationManager;
  private disputeStates: Map<ID, DisputeTrackingState> = new Map();
  private userDisputes: Map<ID, Set<ID>> = new Map(); // userId -> disputeIds
  private subscriptions: Map<ID, string> = new Map(); // userId -> subscriptionId
  private reminderTimers: Map<ID, NodeJS.Timeout> = new Map();
  private options: DisputeTrackerOptions;

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.notificationManager = NotificationManager.getInstance();
    this.options = this.getDefaultOptions();
    this.initializeEventHandlers();
  }

  static getInstance(): DisputeTracker {
    if (!this.instance) {
      this.instance = new DisputeTracker();
    }
    return this.instance;
  }

  /**
   * Initialize dispute tracking for a user
   */
  async startTracking(userId: ID, options: Partial<DisputeTrackerOptions> = {}): Promise<void> {
    this.options = { ...this.options, ...options };

    // Subscribe to dispute status updates
    const subscriptionId = this.wsManager.subscribe(
      'dispute_status_change',
      (message) => this.handleDisputeStatusUpdate(message.data as DisputeStatusUpdate),
      { userId }
    );

    this.subscriptions.set(userId, subscriptionId);

    // Load existing disputes for the user
    await this.loadUserDisputes(userId);

    // Set up reminders for active disputes
    if (this.options.reminderSettings.enableDeadlineReminders) {
      this.setupDeadlineReminders(userId);
    }

    console.log(`Dispute tracking started for user ${userId}`);
  }

  /**
   * Stop tracking disputes for a user
   */
  stopTracking(userId: ID): void {
    const subscriptionId = this.subscriptions.get(userId);
    if (subscriptionId) {
      this.wsManager.unsubscribe(subscriptionId);
      this.subscriptions.delete(userId);
    }

    // Clear user data
    const userDisputeIds = this.userDisputes.get(userId) || new Set();
    userDisputeIds.forEach(disputeId => {
      this.disputeStates.delete(disputeId);
      const timer = this.reminderTimers.get(disputeId);
      if (timer) {
        clearTimeout(timer);
        this.reminderTimers.delete(disputeId);
      }
    });
    
    this.userDisputes.delete(userId);

    console.log(`Dispute tracking stopped for user ${userId}`);
  }

  /**
   * Get dispute tracking state
   */
  getDisputeState(disputeId: ID): DisputeTrackingState | null {
    return this.disputeStates.get(disputeId) || null;
  }

  /**
   * Get all disputes for a user
   */
  getUserDisputes(userId: ID): DisputeTrackingState[] {
    const userDisputeIds = this.userDisputes.get(userId) || new Set();
    return Array.from(userDisputeIds)
      .map(disputeId => this.disputeStates.get(disputeId))
      .filter((state): state is DisputeTrackingState => state !== undefined);
  }

  /**
   * Get dispute metrics for a user
   */
  getDisputeMetrics(userId: ID): DisputeMetrics {
    const userDisputes = this.getUserDisputes(userId);
    
    const metrics: DisputeMetrics = {
      totalDisputes: userDisputes.length,
      activeDisputes: userDisputes.filter(d => !['resolved', 'rejected'].includes(d.currentStatus)).length,
      resolvedDisputes: userDisputes.filter(d => d.currentStatus === 'resolved').length,
      averageResolutionTime: this.calculateAverageResolutionTime(userDisputes),
      successRate: this.calculateSuccessRate(userDisputes),
      disputesByStatus: this.groupDisputesByStatus(userDisputes),
      recentActivity: this.getRecentActivity(userDisputes, 10)
    };

    return metrics;
  }

  /**
   * Update dispute status manually
   */
  async updateDisputeStatus(
    disputeId: ID,
    newStatus: DisputeStatus,
    message: string,
    userId: ID,
    details?: string,
    documentsRequired?: string[]
  ): Promise<void> {
    const currentState = this.disputeStates.get(disputeId);
    if (!currentState) {
      throw new Error(`Dispute ${disputeId} not found`);
    }

    const update: DisputeStatusUpdate = {
      id: this.generateUpdateId(),
      disputeId,
      userId,
      updateType: 'status_change',
      previousStatus: currentState.currentStatus,
      newStatus,
      message,
      details,
      documentsRequired,
      actionRequired: documentsRequired ? documentsRequired.length > 0 : false,
      timestamp: new Date().toISOString()
    };

    await this.handleDisputeStatusUpdate(update);
  }

  /**
   * Simulate dispute status update (for testing)
   */
  simulateStatusUpdate(disputeId: ID, userId: ID, updateType: DisputeStatusUpdateType): void {
    const currentState = this.disputeStates.get(disputeId);
    const currentStatus = currentState?.currentStatus || 'draft';
    
    let newStatus: DisputeStatus;
    let message: string;
    let actionRequired = false;
    let documentsRequired: string[] = [];

    switch (updateType) {
      case 'status_change':
        newStatus = this.getNextStatus(currentStatus as DisputeStatus);
        message = `Dispute status changed from ${currentStatus} to ${newStatus}`;
        break;
      case 'response_received':
        newStatus = 'in_progress';
        message = 'Response received from credit bureau';
        break;
      case 'document_requested':
        newStatus = 'in_progress';
        message = 'Additional documents requested';
        actionRequired = true;
        documentsRequired = ['Identity verification', 'Proof of payment'];
        break;
      case 'investigation_started':
        newStatus = 'in_progress';
        message = 'Investigation has begun';
        break;
      case 'resolution_available':
        newStatus = 'resolved';
        message = 'Dispute has been resolved in your favor';
        break;
      default:
        return;
    }

    const update: DisputeStatusUpdate = {
      id: this.generateUpdateId(),
      disputeId,
      userId,
      updateType,
      previousStatus: currentStatus,
      newStatus,
      message,
      documentsRequired,
      actionRequired,
      deadline: actionRequired ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      timestamp: new Date().toISOString()
    };

    this.handleDisputeStatusUpdate(update);
  }

  // Private methods

  private initializeEventHandlers(): void {
    // Handle incoming dispute status updates
    console.log('Dispute tracker event handlers initialized');
  }

  private async handleDisputeStatusUpdate(update: DisputeStatusUpdate): Promise<void> {
    console.log(`Processing dispute status update:`, update);

    // Update dispute state
    let disputeState = this.disputeStates.get(update.disputeId);
    if (!disputeState) {
      // Create new dispute state
      disputeState = {
        disputeId: update.disputeId,
        currentStatus: update.newStatus,
        progress: this.calculateProgress(update.newStatus),
        timeline: [],
        lastUpdated: update.timestamp
      };
      this.disputeStates.set(update.disputeId, disputeState);

      // Add to user's disputes
      const userDisputes = this.userDisputes.get(update.userId) || new Set();
      userDisputes.add(update.disputeId);
      this.userDisputes.set(update.userId, userDisputes);
    }

    // Update state
    disputeState.currentStatus = update.newStatus;
    disputeState.progress = this.calculateProgress(update.newStatus);
    disputeState.lastUpdated = update.timestamp;

    // Add timeline event
    const timelineEvent: DisputeTimelineEvent = {
      id: this.generateEventId(),
      type: update.updateType,
      status: update.newStatus,
      description: update.message,
      timestamp: update.timestamp,
      isAutomated: false,
      source: 'manual_update',
      documents: update.documentsRequired
    };

    disputeState.timeline.unshift(timelineEvent);

    // Set next action if required
    if (update.actionRequired) {
      disputeState.nextAction = {
        type: 'submit_documents',
        description: update.message,
        dueDate: update.deadline
      };
    } else {
      disputeState.nextAction = undefined;
    }

    // Update estimated completion
    disputeState.estimatedCompletion = this.calculateEstimatedCompletion(disputeState);

    // Send notifications
    if (this.options.enableAutomaticNotifications) {
      await this.sendStatusUpdateNotification(update);
    }

    // Set up deadline reminders
    if (update.deadline && this.options.reminderSettings.enableDeadlineReminders) {
      this.setupDeadlineReminder(update.disputeId, update.deadline);
    }

    // Store in database
    await this.storeDisputeUpdate(update, disputeState);

    // Emit real-time update
    this.emitDisputeUpdate(update, disputeState);
  }

  private async sendStatusUpdateNotification(update: DisputeStatusUpdate): Promise<void> {
    const templateId = this.getNotificationTemplate(update.updateType);
    
    await this.notificationManager.sendTemplatedNotification(
      update.userId,
      templateId,
      {
        disputeId: update.disputeId,
        status: update.newStatus,
        message: update.message,
        actionRequired: update.actionRequired,
        deadline: update.deadline
      },
      ['in_app', 'push', 'email']
    );
  }

  private calculateProgress(status: DisputeStatus): number {
    const statusProgress: Record<DisputeStatus, number> = {
      'draft': 0,
      'pending_review': 20,
      'sent': 40,
      'in_progress': 70,
      'resolved': 100,
      'rejected': 100,
      'escalated': 80
    };

    return statusProgress[status] || 0;
  }

  private calculateEstimatedCompletion(state: DisputeTrackingState): string | undefined {
    const statusDays: Record<string, number> = {
      'draft': 30,
      'pending_review': 25,
      'sent': 20,
      'in_progress': 10,
      'escalated': 15
    };

    const daysRemaining = statusDays[state.currentStatus];
    if (!daysRemaining) return undefined;

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);
    return estimatedDate.toISOString();
  }

  private setupDeadlineReminder(disputeId: ID, deadline: string): void {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    
    this.options.reminderSettings.reminderDaysBefore.forEach(daysBefore => {
      const reminderDate = new Date(deadlineDate);
      reminderDate.setDate(reminderDate.getDate() - daysBefore);
      
      if (reminderDate > now) {
        const timeout = setTimeout(() => {
          this.sendDeadlineReminder(disputeId, daysBefore, deadline);
        }, reminderDate.getTime() - now.getTime());
        
        this.reminderTimers.set(`${disputeId}_${daysBefore}`, timeout);
      }
    });
  }

  private async sendDeadlineReminder(disputeId: ID, daysBefore: number, deadline: string): Promise<void> {
    const disputeState = this.disputeStates.get(disputeId);
    if (!disputeState) return;

    const userId = this.findUserIdByDisputeId(disputeId);
    if (!userId) return;

    await this.notificationManager.sendTemplatedNotification(
      userId,
      'dispute_deadline_reminder',
      {
        disputeId,
        daysBefore,
        deadline,
        actionRequired: disputeState.nextAction?.description || 'Action required'
      },
      ['in_app', 'push']
    );
  }

  private setupDeadlineReminders(userId: ID): void {
    const userDisputes = this.getUserDisputes(userId);
    
    userDisputes.forEach(disputeState => {
      if (disputeState.nextAction?.dueDate) {
        this.setupDeadlineReminder(disputeState.disputeId, disputeState.nextAction.dueDate);
      }
    });
  }

  private getNextStatus(currentStatus: DisputeStatus): DisputeStatus {
    const statusFlow: Record<DisputeStatus, DisputeStatus> = {
      'draft': 'pending_review',
      'pending_review': 'sent',
      'sent': 'in_progress',
      'in_progress': 'resolved',
      'resolved': 'resolved',
      'rejected': 'escalated',
      'escalated': 'resolved'
    };

    return statusFlow[currentStatus] || currentStatus;
  }

  private calculateAverageResolutionTime(disputes: DisputeTrackingState[]): number {
    const resolvedDisputes = disputes.filter(d => d.currentStatus === 'resolved');
    if (resolvedDisputes.length === 0) return 0;

    const totalTime = resolvedDisputes.reduce((sum, dispute) => {
      const startEvent = dispute.timeline[dispute.timeline.length - 1];
      const endEvent = dispute.timeline.find(e => e.status === 'resolved');
      
      if (startEvent && endEvent) {
        const start = new Date(startEvent.timestamp);
        const end = new Date(endEvent.timestamp);
        return sum + (end.getTime() - start.getTime());
      }
      
      return sum;
    }, 0);

    return Math.round(totalTime / resolvedDisputes.length / (1000 * 60 * 60 * 24)); // Days
  }

  private calculateSuccessRate(disputes: DisputeTrackingState[]): number {
    const completedDisputes = disputes.filter(d => 
      d.currentStatus === 'resolved' || d.currentStatus === 'rejected'
    );
    
    if (completedDisputes.length === 0) return 0;
    
    const successfulDisputes = completedDisputes.filter(d => d.currentStatus === 'resolved');
    return Math.round((successfulDisputes.length / completedDisputes.length) * 100);
  }

  private groupDisputesByStatus(disputes: DisputeTrackingState[]): Record<DisputeStatus, number> {
    const grouped: Record<DisputeStatus, number> = {
      'draft': 0,
      'pending_review': 0,
      'sent': 0,
      'in_progress': 0,
      'resolved': 0,
      'rejected': 0,
      'escalated': 0
    };

    disputes.forEach(dispute => {
      grouped[dispute.currentStatus as DisputeStatus]++;
    });

    return grouped;
  }

  private getRecentActivity(disputes: DisputeTrackingState[], limit: number): DisputeTimelineEvent[] {
    const allEvents = disputes.flatMap(dispute => 
      dispute.timeline.map(event => ({ ...event, disputeId: dispute.disputeId }))
    );

    return allEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  private getNotificationTemplate(updateType: DisputeStatusUpdateType): string {
    const templates: Record<DisputeStatusUpdateType, string> = {
      'status_change': 'dispute_status_update',
      'response_received': 'dispute_response_received',
      'document_requested': 'dispute_documents_requested',
      'investigation_started': 'dispute_investigation_started',
      'resolution_available': 'dispute_resolution_available',
      'appeal_submitted': 'dispute_appeal_submitted',
      'deadline_approaching': 'dispute_deadline_reminder'
    };

    return templates[updateType] || 'dispute_status_update';
  }

  private findUserIdByDisputeId(disputeId: ID): ID | null {
    for (const [userId, disputeIds] of this.userDisputes.entries()) {
      if (disputeIds.has(disputeId)) {
        return userId;
      }
    }
    return null;
  }

  private emitDisputeUpdate(update: DisputeStatusUpdate, state: DisputeTrackingState): void {
    // Emit via WebSocket for real-time UI updates
    this.wsManager.sendMessage({
      type: 'dispute_status_change',
      userId: update.userId,
      data: { update, state }
    });

    // Emit browser event
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('disputeStatusUpdate', {
        detail: { update, state }
      });
      window.dispatchEvent(event);
    }
  }

  private async loadUserDisputes(userId: ID): Promise<void> {
    // Implementation would load from database
    console.log(`Loading disputes for user ${userId}`);
    
    // Mock dispute data
    const mockDisputes = [
      {
        disputeId: `dispute_${userId}_1`,
        currentStatus: 'in_progress' as DisputeStatus,
        progress: 70,
        timeline: [
          {
            id: 'event_1',
            type: 'status_change' as DisputeStatusUpdateType,
            status: 'sent',
            description: 'Dispute letter sent to Experian',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            isAutomated: false,
            source: 'system'
          }
        ],
        nextAction: {
          type: 'wait_response',
          description: 'Waiting for bureau response',
          dueDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString()
        },
        estimatedCompletion: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastUpdated: new Date().toISOString()
      }
    ];

    const userDisputeIds = new Set<ID>();
    mockDisputes.forEach(dispute => {
      this.disputeStates.set(dispute.disputeId, dispute);
      userDisputeIds.add(dispute.disputeId);
    });
    
    this.userDisputes.set(userId, userDisputeIds);
  }

  private async storeDisputeUpdate(update: DisputeStatusUpdate, state: DisputeTrackingState): Promise<void> {
    // Store in database
    console.log('Storing dispute update in database:', { update, state });
  }

  private generateUpdateId(): string {
    return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultOptions(): DisputeTrackerOptions {
    return {
      enableRealTimeUpdates: true,
      enableAutomaticNotifications: true,
      trackingUpdateInterval: 30000, // 30 seconds
      reminderSettings: {
        enableDeadlineReminders: true,
        reminderDaysBefore: [7, 3, 1],
        enableProgressReminders: true
      }
    };
  }
}