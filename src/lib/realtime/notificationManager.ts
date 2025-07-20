/**
 * Real-time Notification Manager
 * 
 * Manages live notifications, push notifications, and alert delivery
 * across multiple channels with proper queuing and retry mechanisms.
 */

import { WebSocketManager } from './websocketManager';
import {
  RealtimeNotification,
  NotificationType,
  NotificationChannel,
  PushNotificationSubscription,
  NotificationPreferences,
  NotificationAction
} from '../../types/realtime';
import { ID } from '../../types';

export interface NotificationManagerOptions {
  vapidKeys?: {
    publicKey: string;
    privateKey: string;
  };
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  maxRetries: number;
  retryDelay: number;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  template: {
    title: string;
    body: string;
    icon?: string;
    actions?: NotificationAction[];
  };
}

export class NotificationManager {
  private static instance: NotificationManager;
  private wsManager: WebSocketManager;
  private pushSubscriptions: Map<ID, PushNotificationSubscription[]> = new Map();
  private userPreferences: Map<ID, NotificationPreferences> = new Map();
  private notificationQueue: Map<ID, RealtimeNotification[]> = new Map();
  private retryQueue: Map<string, { notification: RealtimeNotification; attempts: number }> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private options: NotificationManagerOptions;

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.options = this.getDefaultOptions();
    this.initializeTemplates();
    this.initializeEventHandlers();
    this.startRetryProcessor();
  }

  static getInstance(): NotificationManager {
    if (!this.instance) {
      this.instance = new NotificationManager();
    }
    return this.instance;
  }

  /**
   * Initialize notification manager with options
   */
  initialize(options: Partial<NotificationManagerOptions>): void {
    this.options = { ...this.options, ...options };
    
    if (this.options.enablePushNotifications && 'serviceWorker' in navigator) {
      this.initializePushNotifications();
    }
  }

  /**
   * Send a real-time notification
   */
  async sendNotification(notification: Omit<RealtimeNotification, 'id' | 'createdAt' | 'isDelivered' | 'isRead'>): Promise<string> {
    const fullNotification: RealtimeNotification = {
      id: this.generateNotificationId(),
      createdAt: new Date().toISOString(),
      isDelivered: false,
      isRead: false,
      ...notification
    };

    // Check user preferences
    const preferences = this.userPreferences.get(notification.userId);
    if (preferences && !this.shouldSendNotification(fullNotification, preferences)) {
      console.log(`Notification blocked by user preferences:`, fullNotification);
      return fullNotification.id;
    }

    // Add to queue for the user
    this.addToQueue(fullNotification);

    // Send via requested channels
    const deliveryPromises = fullNotification.channel.map(channel => 
      this.sendViaChannel(fullNotification, channel)
    );

    try {
      await Promise.allSettled(deliveryPromises);
      fullNotification.isDelivered = true;
      fullNotification.deliveredAt = new Date().toISOString();
    } catch (error) {
      console.error('Failed to deliver notification:', error);
      this.addToRetryQueue(fullNotification);
    }

    // Store notification (would integrate with database)
    await this.storeNotification(fullNotification);

    return fullNotification.id;
  }

  /**
   * Send push notification using template
   */
  async sendTemplatedNotification(
    userId: ID,
    templateId: string,
    data: Record<string, unknown>,
    channels: NotificationChannel[] = ['in_app', 'push']
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Notification template not found: ${templateId}`);
    }

    // Render template with data
    const renderedNotification = this.renderTemplate(template, data);

    return this.sendNotification({
      userId,
      type: template.type,
      channel: channels,
      title: renderedNotification.title,
      body: renderedNotification.body,
      data,
      actions: renderedNotification.actions,
      priority: 'normal'
    });
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(userId: ID): Promise<PushNotificationSubscription | null> {
    if (!this.options.enablePushNotifications || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.options.vapidKeys!.publicKey)
      });

      const pushSubscription: PushNotificationSubscription = {
        userId,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        },
        userAgent: navigator.userAgent,
        deviceInfo: {
          platform: navigator.platform,
          browser: this.getBrowserInfo(),
          version: this.getBrowserVersion()
        },
        isActive: true,
        createdAt: new Date().toISOString()
      };

      // Store subscription
      const userSubscriptions = this.pushSubscriptions.get(userId) || [];
      userSubscriptions.push(pushSubscription);
      this.pushSubscriptions.set(userId, userSubscriptions);

      // Save to database
      await this.storePushSubscription(pushSubscription);

      return pushSubscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(userId: ID, endpoint: string): Promise<void> {
    const userSubscriptions = this.pushSubscriptions.get(userId) || [];
    const updatedSubscriptions = userSubscriptions.filter(sub => sub.endpoint !== endpoint);
    this.pushSubscriptions.set(userId, updatedSubscriptions);

    // Remove from database
    await this.removePushSubscription(userId, endpoint);
  }

  /**
   * Update notification preferences
   */
  updatePreferences(userId: ID, preferences: Partial<NotificationPreferences>): void {
    const currentPreferences = this.userPreferences.get(userId) || this.getDefaultPreferences(userId);
    const updatedPreferences = { ...currentPreferences, ...preferences };
    this.userPreferences.set(userId, updatedPreferences);

    // Save to database
    this.storePreferences(updatedPreferences);
  }

  /**
   * Get notification preferences
   */
  getPreferences(userId: ID): NotificationPreferences {
    return this.userPreferences.get(userId) || this.getDefaultPreferences(userId);
  }

  /**
   * Get notifications for a user
   */
  getNotifications(userId: ID, limit: number = 50): RealtimeNotification[] {
    const userNotifications = this.notificationQueue.get(userId) || [];
    return userNotifications.slice(0, limit);
  }

  /**
   * Mark notifications as read
   */
  markAsRead(userId: ID, notificationIds: string[]): void {
    const userNotifications = this.notificationQueue.get(userId) || [];
    
    userNotifications.forEach(notification => {
      if (notificationIds.includes(notification.id)) {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
      }
    });

    // Update in database
    this.updateNotificationStatus(notificationIds, { isRead: true });
  }

  /**
   * Clear all notifications for a user
   */
  clearNotifications(userId: ID): void {
    this.notificationQueue.set(userId, []);
    // Clear from database
    this.clearUserNotifications(userId);
  }

  // Private methods

  private initializeEventHandlers(): void {
    // Subscribe to notification events from WebSocket
    this.wsManager.subscribe('notification', (message) => {
      const notification = message.data as RealtimeNotification;
      this.handleIncomingNotification(notification);
    });
  }

  private async initializePushNotifications(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('Service worker registered for push notifications');
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }

  private initializeTemplates(): void {
    // Credit score templates
    this.templates.set('credit_score_increase', {
      id: 'credit_score_increase',
      type: 'credit_alert',
      template: {
        title: 'Credit Score Increased! 📈',
        body: 'Your {{bureau}} credit score increased by {{change}} points to {{newScore}}',
        icon: '/icons/credit-up.png',
        actions: [
          { id: 'view_details', label: 'View Details', action: 'navigate', url: '/dashboard' },
          { id: 'dismiss', label: 'Dismiss', action: 'dismiss' }
        ]
      }
    });

    this.templates.set('credit_score_decrease', {
      id: 'credit_score_decrease',
      type: 'credit_alert',
      template: {
        title: 'Credit Score Alert ⚠️',
        body: 'Your {{bureau}} credit score decreased by {{change}} points to {{newScore}}',
        icon: '/icons/credit-down.png',
        actions: [
          { id: 'view_report', label: 'View Report', action: 'navigate', url: '/analysis' },
          { id: 'get_help', label: 'Get Help', action: 'navigate', url: '/support' }
        ]
      }
    });

    // Dispute templates
    this.templates.set('dispute_status_update', {
      id: 'dispute_status_update',
      type: 'dispute_update',
      template: {
        title: 'Dispute Status Update',
        body: 'Your dispute with {{creditor}} has been {{status}}',
        icon: '/icons/dispute.png',
        actions: [
          { id: 'view_dispute', label: 'View Dispute', action: 'navigate', url: '/disputes/{{disputeId}}' }
        ]
      }
    });

    // System templates
    this.templates.set('system_maintenance', {
      id: 'system_maintenance',
      type: 'system_notification',
      template: {
        title: 'System Maintenance',
        body: 'Scheduled maintenance from {{startTime}} to {{endTime}}',
        icon: '/icons/maintenance.png'
      }
    });
  }

  private shouldSendNotification(notification: RealtimeNotification, preferences: NotificationPreferences): boolean {
    const typePreferences = preferences.preferences[notification.type];
    if (!typePreferences.enabled) {
      return false;
    }

    // Check quiet hours
    if (typePreferences.quietHours) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime >= typePreferences.quietHours.start && currentTime <= typePreferences.quietHours.end) {
        return notification.priority === 'urgent';
      }
    }

    // Check if any of the requested channels are enabled for this type
    return notification.channel.some(channel => typePreferences.channels.includes(channel));
  }

  private async sendViaChannel(notification: RealtimeNotification, channel: NotificationChannel): Promise<void> {
    switch (channel) {
      case 'in_app':
        await this.sendInAppNotification(notification);
        break;
      case 'push':
        await this.sendPushNotification(notification);
        break;
      case 'email':
        await this.sendEmailNotification(notification);
        break;
      case 'sms':
        await this.sendSMSNotification(notification);
        break;
      case 'webhook':
        await this.sendWebhookNotification(notification);
        break;
      default:
        console.warn(`Unknown notification channel: ${channel}`);
    }
  }

  private async sendInAppNotification(notification: RealtimeNotification): Promise<void> {
    // Send via WebSocket
    this.wsManager.sendMessage({
      type: 'notification',
      userId: notification.userId,
      data: notification
    });
  }

  private async sendPushNotification(notification: RealtimeNotification): Promise<void> {
    if (!this.options.enablePushNotifications) return;

    const userSubscriptions = this.pushSubscriptions.get(notification.userId) || [];
    
    for (const subscription of userSubscriptions) {
      if (!subscription.isActive) continue;

      try {
        const payload = JSON.stringify({
          title: notification.title,
          body: notification.body,
          icon: '/icons/app-icon.png',
          badge: '/icons/badge.png',
          data: {
            notificationId: notification.id,
            url: notification.actions?.[0]?.url || '/dashboard',
            ...notification.data
          },
          actions: notification.actions?.map(action => ({
            action: action.id,
            title: action.label,
            icon: action.style === 'primary' ? '/icons/primary-action.png' : '/icons/action.png'
          }))
        });

        // In a real implementation, this would send via push service API
        console.log(`Sending push notification to ${subscription.endpoint}:`, payload);
        
        // Mock API call
        await this.mockPushAPI(subscription, payload);
        
      } catch (error) {
        console.error(`Failed to send push notification to ${subscription.endpoint}:`, error);
        // Mark subscription as inactive if it fails
        subscription.isActive = false;
      }
    }
  }

  private async sendEmailNotification(notification: RealtimeNotification): Promise<void> {
    if (!this.options.enableEmailNotifications) return;

    // Mock email sending
    console.log(`Sending email notification to user ${notification.userId}:`, {
      subject: notification.title,
      body: notification.body,
      data: notification.data
    });

    // In real implementation, integrate with email service
    // await emailService.send({...});
  }

  private async sendSMSNotification(notification: RealtimeNotification): Promise<void> {
    if (!this.options.enableSMSNotifications) return;

    // Mock SMS sending
    console.log(`Sending SMS notification to user ${notification.userId}:`, {
      message: `${notification.title}: ${notification.body}`
    });

    // In real implementation, integrate with SMS service
    // await smsService.send({...});
  }

  private async sendWebhookNotification(notification: RealtimeNotification): Promise<void> {
    // Mock webhook sending
    console.log(`Sending webhook notification for user ${notification.userId}:`, notification);

    // In real implementation, send to configured webhook URLs
    // await webhookService.send({...});
  }

  private addToQueue(notification: RealtimeNotification): void {
    const userNotifications = this.notificationQueue.get(notification.userId) || [];
    userNotifications.unshift(notification);
    
    // Limit queue size
    if (userNotifications.length > 1000) {
      userNotifications.splice(1000);
    }
    
    this.notificationQueue.set(notification.userId, userNotifications);
  }

  private addToRetryQueue(notification: RealtimeNotification): void {
    this.retryQueue.set(notification.id, {
      notification,
      attempts: 0
    });
  }

  private startRetryProcessor(): void {
    setInterval(async () => {
      const retryEntries = Array.from(this.retryQueue.entries());
      
      for (const [id, entry] of retryEntries) {
        if (entry.attempts >= this.options.maxRetries) {
          this.retryQueue.delete(id);
          console.error(`Max retry attempts reached for notification ${id}`);
          continue;
        }

        entry.attempts++;
        
        try {
          const deliveryPromises = entry.notification.channel.map(channel => 
            this.sendViaChannel(entry.notification, channel)
          );
          
          await Promise.all(deliveryPromises);
          
          entry.notification.isDelivered = true;
          entry.notification.deliveredAt = new Date().toISOString();
          this.retryQueue.delete(id);
          
        } catch (error) {
          console.error(`Retry attempt ${entry.attempts} failed for notification ${id}:`, error);
        }
      }
    }, this.options.retryDelay);
  }

  private handleIncomingNotification(notification: RealtimeNotification): void {
    this.addToQueue(notification);
    
    // Emit browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.body,
        icon: '/icons/app-icon.png',
        tag: notification.id,
        data: notification.data
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.actions && notification.actions[0]?.url) {
          window.location.href = notification.actions[0].url;
        }
        browserNotification.close();
      };
    }
  }

  private renderTemplate(template: NotificationTemplate, data: Record<string, unknown>): { title: string; body: string; actions?: NotificationAction[] } {
    const renderString = (str: string): string => {
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key]?.toString() || match;
      });
    };

    return {
      title: renderString(template.template.title),
      body: renderString(template.template.body),
      actions: template.template.actions?.map(action => ({
        ...action,
        url: action.url ? renderString(action.url) : undefined
      }))
    };
  }

  // Utility methods

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[1] : 'Unknown';
  }

  private getDefaultOptions(): NotificationManagerOptions {
    return {
      enablePushNotifications: true,
      enableEmailNotifications: true,
      enableSMSNotifications: false,
      maxRetries: 3,
      retryDelay: 5000
    };
  }

  private getDefaultPreferences(userId: ID): NotificationPreferences {
    return {
      userId,
      preferences: {
        credit_alert: {
          enabled: true,
          channels: ['in_app', 'push', 'email'],
          frequency: 'immediate'
        },
        dispute_update: {
          enabled: true,
          channels: ['in_app', 'push', 'email'],
          frequency: 'immediate'
        },
        system_notification: {
          enabled: true,
          channels: ['in_app'],
          frequency: 'immediate'
        },
        marketing: {
          enabled: false,
          channels: ['email'],
          frequency: 'digest_weekly'
        },
        security: {
          enabled: true,
          channels: ['in_app', 'push', 'email', 'sms'],
          frequency: 'immediate'
        },
        achievement: {
          enabled: true,
          channels: ['in_app', 'push'],
          frequency: 'immediate'
        },
        reminder: {
          enabled: true,
          channels: ['in_app', 'push'],
          frequency: 'immediate'
        },
        urgent: {
          enabled: true,
          channels: ['in_app', 'push', 'email', 'sms'],
          frequency: 'immediate'
        }
      },
      updatedAt: new Date().toISOString()
    };
  }

  // Mock methods (would be replaced with real implementations)

  private async mockPushAPI(subscription: PushNotificationSubscription, payload: string): Promise<void> {
    // Simulate push API call
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  private async storeNotification(notification: RealtimeNotification): Promise<void> {
    // Store in database
    console.log('Storing notification in database:', notification);
  }

  private async storePushSubscription(subscription: PushNotificationSubscription): Promise<void> {
    // Store in database
    console.log('Storing push subscription in database:', subscription);
  }

  private async removePushSubscription(userId: ID, endpoint: string): Promise<void> {
    // Remove from database
    console.log(`Removing push subscription for user ${userId}, endpoint: ${endpoint}`);
  }

  private async storePreferences(preferences: NotificationPreferences): Promise<void> {
    // Store in database
    console.log('Storing notification preferences in database:', preferences);
  }

  private async updateNotificationStatus(notificationIds: string[], status: Partial<RealtimeNotification>): Promise<void> {
    // Update in database
    console.log('Updating notification status in database:', notificationIds, status);
  }

  private async clearUserNotifications(userId: ID): Promise<void> {
    // Clear from database
    console.log(`Clearing notifications for user ${userId}`);
  }
}