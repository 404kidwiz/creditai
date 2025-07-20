/**
 * Real-time Credit Score Monitor
 * 
 * Monitors credit score changes in real-time, sends instant alerts,
 * and manages credit monitoring settings and thresholds.
 */

import { WebSocketManager } from './websocketManager';
import { 
  CreditScoreUpdate, 
  CreditScoreAlert, 
  CreditMonitoringSettings,
  CreditScoreFactors,
  CreditScoreAlertType
} from '../../types/realtime';
import { ID, CreditBureau } from '../../types';

export interface CreditScoreMonitorOptions {
  enableRealTimeMonitoring: boolean;
  alertThresholds: {
    minScoreChange: number;
    maxUtilizationIncrease: number;
    enableNewAccountAlerts: boolean;
    enableSuspiciousActivityAlerts: boolean;
  };
  notificationChannels: {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
  };
  monitoringFrequency: 'realtime' | 'daily' | 'weekly';
}

export class CreditScoreMonitor {
  private static instance: CreditScoreMonitor;
  private wsManager: WebSocketManager;
  private monitoringSettings: Map<ID, CreditMonitoringSettings> = new Map();
  private subscriptions: Map<ID, string> = new Map();
  private alertQueue: Map<ID, CreditScoreAlert[]> = new Map();
  private lastScores: Map<string, number> = new Map(); // bureau_userId -> score

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.initializeEventHandlers();
  }

  static getInstance(): CreditScoreMonitor {
    if (!this.instance) {
      this.instance = new CreditScoreMonitor();
    }
    return this.instance;
  }

  /**
   * Start monitoring credit scores for a user
   */
  async startMonitoring(userId: ID, options: Partial<CreditScoreMonitorOptions> = {}): Promise<void> {
    const settings: CreditMonitoringSettings = {
      userId,
      alertThresholds: {
        scoreChange: options.alertThresholds?.minScoreChange || 10,
        utilizationIncrease: options.alertThresholds?.maxUtilizationIncrease || 15,
        newAccounts: options.alertThresholds?.enableNewAccountAlerts ?? true,
        suspiciousActivity: options.alertThresholds?.enableSuspiciousActivityAlerts ?? true
      },
      notificationChannels: {
        email: options.notificationChannels?.email ?? true,
        push: options.notificationChannels?.push ?? true,
        sms: options.notificationChannels?.sms ?? false,
        inApp: options.notificationChannels?.inApp ?? true
      },
      monitoringFrequency: options.monitoringFrequency === 'realtime' ? 'daily' : 'daily',
      bureaus: ['experian', 'equifax', 'transunion'],
      isActive: true
    };

    this.monitoringSettings.set(userId, settings);

    // Subscribe to credit score updates
    const subscriptionId = this.wsManager.subscribe(
      'credit_score_update',
      (message) => this.handleCreditScoreUpdate(message.data as CreditScoreUpdate),
      { userId }
    );

    this.subscriptions.set(userId, subscriptionId);

    // Initialize alert queue for user
    if (!this.alertQueue.has(userId)) {
      this.alertQueue.set(userId, []);
    }

    // Load historical scores for baseline
    await this.loadHistoricalScores(userId);

    console.log(`Credit score monitoring started for user ${userId}`);
  }

  /**
   * Stop monitoring credit scores for a user
   */
  stopMonitoring(userId: ID): void {
    const subscriptionId = this.subscriptions.get(userId);
    if (subscriptionId) {
      this.wsManager.unsubscribe(subscriptionId);
      this.subscriptions.delete(userId);
    }

    this.monitoringSettings.delete(userId);
    this.alertQueue.delete(userId);

    // Remove historical scores
    for (const bureau of ['experian', 'equifax', 'transunion'] as CreditBureau[]) {
      this.lastScores.delete(`${bureau}_${userId}`);
    }

    console.log(`Credit score monitoring stopped for user ${userId}`);
  }

  /**
   * Update monitoring settings for a user
   */
  updateSettings(userId: ID, settings: Partial<CreditMonitoringSettings>): void {
    const currentSettings = this.monitoringSettings.get(userId);
    if (!currentSettings) {
      throw new Error(`No monitoring settings found for user ${userId}`);
    }

    const updatedSettings = { ...currentSettings, ...settings };
    this.monitoringSettings.set(userId, updatedSettings);

    console.log(`Credit monitoring settings updated for user ${userId}`);
  }

  /**
   * Get monitoring settings for a user
   */
  getSettings(userId: ID): CreditMonitoringSettings | null {
    return this.monitoringSettings.get(userId) || null;
  }

  /**
   * Get pending alerts for a user
   */
  getPendingAlerts(userId: ID): CreditScoreAlert[] {
    return this.alertQueue.get(userId) || [];
  }

  /**
   * Mark alerts as read
   */
  markAlertsAsRead(userId: ID, alertIds: string[]): void {
    const alerts = this.alertQueue.get(userId) || [];
    const remainingAlerts = alerts.filter(alert => !alertIds.includes(alert.id));
    this.alertQueue.set(userId, remainingAlerts);
  }

  /**
   * Simulate a credit score update (for testing)
   */
  simulateScoreUpdate(userId: ID, bureau: CreditBureau, newScore: number): void {
    const previousScore = this.lastScores.get(`${bureau}_${userId}`) || 650;
    const change = newScore - previousScore;

    const factors: CreditScoreFactors = this.generateMockFactors(change);

    const update: CreditScoreUpdate = {
      id: `score_update_${Date.now()}`,
      userId,
      bureau,
      previousScore,
      newScore,
      change,
      changePercentage: (change / previousScore) * 100,
      reportDate: new Date().toISOString().split('T')[0],
      factors,
      alerts: [],
      timestamp: new Date().toISOString()
    };

    this.handleCreditScoreUpdate(update);
  }

  // Private methods

  private initializeEventHandlers(): void {
    // Additional event handlers can be added here
    console.log('Credit score monitor event handlers initialized');
  }

  private async handleCreditScoreUpdate(update: CreditScoreUpdate): Promise<void> {
    const settings = this.monitoringSettings.get(update.userId);
    if (!settings || !settings.isActive) {
      return;
    }

    console.log(`Processing credit score update for user ${update.userId}:`, update);

    // Update last known score
    const scoreKey = `${update.bureau}_${update.userId}`;
    this.lastScores.set(scoreKey, update.newScore);

    // Generate alerts based on the update
    const alerts = this.generateAlerts(update, settings);
    update.alerts = alerts;

    // Add alerts to queue
    if (alerts.length > 0) {
      const userAlerts = this.alertQueue.get(update.userId) || [];
      userAlerts.push(...alerts);
      this.alertQueue.set(update.userId, userAlerts);
    }

    // Send notifications
    await this.sendNotifications(update, settings);

    // Store update in database (would be implemented with actual database)
    await this.storeScoreUpdate(update);

    // Emit update event for UI components
    this.emitScoreUpdateEvent(update);
  }

  private generateAlerts(update: CreditScoreUpdate, settings: CreditMonitoringSettings): CreditScoreAlert[] {
    const alerts: CreditScoreAlert[] = [];

    // Score change alert
    if (Math.abs(update.change) >= settings.alertThresholds.scoreChange) {
      alerts.push({
        id: `alert_${Date.now()}_score_change`,
        type: update.change > 0 ? 'score_increase' : 'score_decrease',
        severity: Math.abs(update.change) >= 50 ? 'critical' : 'warning',
        title: update.change > 0 ? 'Credit Score Increased!' : 'Credit Score Decreased',
        message: `Your ${update.bureau.charAt(0).toUpperCase() + update.bureau.slice(1)} credit score ${update.change > 0 ? 'increased' : 'decreased'} by ${Math.abs(update.change)} points to ${update.newScore}.`,
        actionRequired: update.change < 0,
        suggestedActions: update.change < 0 ? [
          'Review your credit report for new negative items',
          'Check for any missed payments',
          'Monitor credit utilization ratio'
        ] : [
          'Keep up the good work!',
          'Continue making on-time payments',
          'Maintain low credit utilization'
        ],
        timestamp: new Date().toISOString()
      });
    }

    // Utilization spike alert
    const utilizationChange = update.factors.creditUtilization.change;
    if (utilizationChange > settings.alertThresholds.utilizationIncrease) {
      alerts.push({
        id: `alert_${Date.now()}_utilization`,
        type: 'utilization_spike',
        severity: utilizationChange > 30 ? 'critical' : 'warning',
        title: 'Credit Utilization Increased',
        message: `Your credit utilization increased significantly, which may impact your credit score.`,
        actionRequired: true,
        suggestedActions: [
          'Pay down credit card balances',
          'Consider making multiple payments per month',
          'Request credit limit increases'
        ],
        timestamp: new Date().toISOString()
      });
    }

    // Payment history impact
    if (update.factors.paymentHistory.impact === 'negative' && 
        update.factors.paymentHistory.change < -10) {
      alerts.push({
        id: `alert_${Date.now()}_payment`,
        type: 'payment_missed',
        severity: 'critical',
        title: 'Payment History Impact Detected',
        message: 'Recent payment activity has negatively impacted your credit score.',
        actionRequired: true,
        suggestedActions: [
          'Contact creditors to discuss payment arrangements',
          'Set up automatic payments',
          'Review recent payment history for errors'
        ],
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }

  private async sendNotifications(update: CreditScoreUpdate, settings: CreditMonitoringSettings): Promise<void> {
    if (update.alerts.length === 0) return;

    const notifications = [];

    // Email notification
    if (settings.notificationChannels.email) {
      notifications.push(this.sendEmailNotification(update));
    }

    // Push notification
    if (settings.notificationChannels.push) {
      notifications.push(this.sendPushNotification(update));
    }

    // SMS notification
    if (settings.notificationChannels.sms) {
      notifications.push(this.sendSMSNotification(update));
    }

    // In-app notification
    if (settings.notificationChannels.inApp) {
      notifications.push(this.sendInAppNotification(update));
    }

    await Promise.allSettled(notifications);
  }

  private async sendEmailNotification(update: CreditScoreUpdate): Promise<void> {
    // Implementation would integrate with email service
    console.log(`Sending email notification for credit score update:`, update);
    
    // Example email content
    const emailData = {
      to: `user_${update.userId}@example.com`,
      subject: `Credit Score ${update.change > 0 ? 'Increased' : 'Decreased'} - ${Math.abs(update.change)} Points`,
      template: 'credit_score_update',
      data: {
        userName: 'User',
        bureau: update.bureau,
        previousScore: update.previousScore,
        newScore: update.newScore,
        change: update.change,
        alerts: update.alerts
      }
    };

    // Would send via email service API
    console.log('Email notification queued:', emailData);
  }

  private async sendPushNotification(update: CreditScoreUpdate): Promise<void> {
    // Implementation would integrate with push notification service
    const pushData = {
      userId: update.userId,
      title: `Credit Score ${update.change > 0 ? 'Increased' : 'Decreased'}`,
      body: `Your ${update.bureau} score ${update.change > 0 ? 'went up' : 'went down'} by ${Math.abs(update.change)} points`,
      data: {
        type: 'credit_score_update',
        scoreUpdate: update
      },
      badge: update.alerts.length
    };

    console.log('Push notification queued:', pushData);
  }

  private async sendSMSNotification(update: CreditScoreUpdate): Promise<void> {
    // Implementation would integrate with SMS service
    const smsData = {
      to: `user_${update.userId}_phone`,
      message: `CreditAI Alert: Your ${update.bureau} credit score changed by ${update.change} points to ${update.newScore}. Check the app for details.`
    };

    console.log('SMS notification queued:', smsData);
  }

  private async sendInAppNotification(update: CreditScoreUpdate): Promise<void> {
    // Send in-app notification via WebSocket
    this.wsManager.sendMessage({
      type: 'notification',
      userId: update.userId,
      data: {
        id: `notif_${Date.now()}`,
        userId: update.userId,
        type: 'credit_alert',
        channel: ['in_app'],
        title: `Credit Score ${update.change > 0 ? 'Increased' : 'Decreased'}`,
        body: `Your ${update.bureau} score changed by ${update.change} points`,
        data: { scoreUpdate: update },
        priority: Math.abs(update.change) >= 50 ? 'high' : 'normal',
        isRead: false,
        isDelivered: false,
        createdAt: new Date().toISOString()
      }
    });
  }

  private async storeScoreUpdate(update: CreditScoreUpdate): Promise<void> {
    // Implementation would store in database
    console.log('Storing credit score update in database:', update);
    
    // Example database operation
    // await database.creditScoreUpdates.create(update);
  }

  private emitScoreUpdateEvent(update: CreditScoreUpdate): void {
    // Emit event for real-time UI updates
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('creditScoreUpdate', {
        detail: update
      });
      window.dispatchEvent(event);
    }
  }

  private async loadHistoricalScores(userId: ID): Promise<void> {
    // Implementation would load from database
    console.log(`Loading historical scores for user ${userId}`);
    
    // Mock historical scores
    const mockScores = {
      experian: 720,
      equifax: 715,
      transunion: 725
    };

    for (const [bureau, score] of Object.entries(mockScores)) {
      this.lastScores.set(`${bureau}_${userId}`, score);
    }
  }

  private generateMockFactors(scoreChange: number): CreditScoreFactors {
    return {
      paymentHistory: {
        score: 85 + (scoreChange > 0 ? 5 : -3),
        change: scoreChange > 0 ? 5 : -3,
        impact: scoreChange > 0 ? 'positive' : 'negative'
      },
      creditUtilization: {
        score: 75 + (scoreChange > 0 ? 3 : -5),
        change: scoreChange > 0 ? 3 : -5,
        impact: scoreChange > 0 ? 'positive' : 'negative'
      },
      lengthOfHistory: {
        score: 70,
        change: 0,
        impact: 'neutral'
      },
      creditMix: {
        score: 80,
        change: 1,
        impact: 'neutral'
      },
      newCredit: {
        score: 90 + (scoreChange > 0 ? 2 : -1),
        change: scoreChange > 0 ? 2 : -1,
        impact: scoreChange > 0 ? 'positive' : 'negative'
      }
    };
  }
}