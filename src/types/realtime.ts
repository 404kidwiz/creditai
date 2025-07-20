/**
 * Real-time Types and Interfaces
 * 
 * This file contains all type definitions for real-time features including
 * WebSocket connections, notifications, chat, credit monitoring, and collaborative features.
 */

import { ID, Timestamp, User, CreditBureau } from './index';

// ===================================
// WebSocket Core Types
// ===================================

export type WebSocketEventType = 
  | 'credit_score_update'
  | 'dispute_status_change'
  | 'notification'
  | 'chat_message'
  | 'processing_update'
  | 'collaboration_update'
  | 'system_alert'
  | 'heartbeat'
  | 'error';

export interface WebSocketMessage<T = unknown> {
  id: string;
  type: WebSocketEventType;
  timestamp: Timestamp;
  userId?: ID;
  sessionId?: string;
  data: T;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface WebSocketConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  lastConnected?: Timestamp;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  error?: string;
}

export interface WebSocketSubscription {
  id: string;
  userId: ID;
  eventTypes: WebSocketEventType[];
  filters?: Record<string, unknown>;
  createdAt: Timestamp;
  isActive: boolean;
}

// ===================================
// Real-time Credit Score Monitoring
// ===================================

export interface CreditScoreUpdate {
  id: ID;
  userId: ID;
  bureau: CreditBureau;
  previousScore: number;
  newScore: number;
  change: number;
  changePercentage: number;
  reportDate: string;
  factors: CreditScoreFactors;
  alerts: CreditScoreAlert[];
  timestamp: Timestamp;
}

export interface CreditScoreFactors {
  paymentHistory: {
    score: number;
    change: number;
    impact: 'positive' | 'negative' | 'neutral';
  };
  creditUtilization: {
    score: number;
    change: number;
    impact: 'positive' | 'negative' | 'neutral';
  };
  lengthOfHistory: {
    score: number;
    change: number;
    impact: 'positive' | 'negative' | 'neutral';
  };
  creditMix: {
    score: number;
    change: number;
    impact: 'positive' | 'negative' | 'neutral';
  };
  newCredit: {
    score: number;
    change: number;
    impact: 'positive' | 'negative' | 'neutral';
  };
}

export type CreditScoreAlertType = 
  | 'score_increase'
  | 'score_decrease'
  | 'new_account'
  | 'account_closed'
  | 'payment_missed'
  | 'utilization_spike'
  | 'identity_monitoring'
  | 'suspicious_activity';

export interface CreditScoreAlert {
  id: ID;
  type: CreditScoreAlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  suggestedActions?: string[];
  affectedAccounts?: string[];
  timestamp: Timestamp;
}

export interface CreditMonitoringSettings {
  userId: ID;
  alertThresholds: {
    scoreChange: number;
    utilizationIncrease: number;
    newAccounts: boolean;
    suspiciousActivity: boolean;
  };
  notificationChannels: {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
  };
  monitoringFrequency: 'daily' | 'weekly' | 'monthly';
  bureaus: CreditBureau[];
  isActive: boolean;
}

// ===================================
// Real-time Notifications
// ===================================

export type NotificationType = 
  | 'credit_alert'
  | 'dispute_update'
  | 'system_notification'
  | 'marketing'
  | 'security'
  | 'achievement'
  | 'reminder'
  | 'urgent';

export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app' | 'webhook';

export interface RealtimeNotification {
  id: ID;
  userId: ID;
  type: NotificationType;
  channel: NotificationChannel[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Timestamp;
  expiresAt?: Timestamp;
  isRead: boolean;
  isDelivered: boolean;
  deliveredAt?: Timestamp;
  readAt?: Timestamp;
  createdAt: Timestamp;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: string;
  url?: string;
  data?: Record<string, unknown>;
  style?: 'default' | 'primary' | 'destructive';
}

export interface PushNotificationSubscription {
  userId: ID;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceInfo?: {
    platform: string;
    browser: string;
    version: string;
  };
  isActive: boolean;
  createdAt: Timestamp;
  lastUsed?: Timestamp;
}

export interface NotificationPreferences {
  userId: ID;
  preferences: {
    [key in NotificationType]: {
      enabled: boolean;
      channels: NotificationChannel[];
      quietHours?: {
        start: string; // HH:mm format
        end: string;   // HH:mm format
        timezone: string;
      };
      frequency?: 'immediate' | 'digest_hourly' | 'digest_daily';
    };
  };
  updatedAt: Timestamp;
}

// ===================================
// Real-time Dispute Status Updates
// ===================================

export type DisputeStatusUpdateType = 
  | 'status_change'
  | 'response_received'
  | 'document_requested'
  | 'investigation_started'
  | 'resolution_available'
  | 'appeal_submitted'
  | 'deadline_approaching';

export interface DisputeStatusUpdate {
  id: ID;
  disputeId: ID;
  userId: ID;
  updateType: DisputeStatusUpdateType;
  previousStatus?: string;
  newStatus: string;
  message: string;
  details?: string;
  documentsRequired?: string[];
  actionRequired: boolean;
  deadline?: Timestamp;
  estimatedResolutionDate?: Timestamp;
  contactInfo?: {
    phone?: string;
    email?: string;
    referenceNumber?: string;
  };
  timestamp: Timestamp;
}

export interface DisputeTrackingState {
  disputeId: ID;
  currentStatus: string;
  progress: number;
  timeline: DisputeTimelineEvent[];
  nextAction?: {
    type: string;
    description: string;
    dueDate?: Timestamp;
  };
  estimatedCompletion?: Timestamp;
  lastUpdated: Timestamp;
}

export interface DisputeTimelineEvent {
  id: ID;
  type: DisputeStatusUpdateType;
  status: string;
  description: string;
  timestamp: Timestamp;
  isAutomated: boolean;
  source?: string;
  documents?: string[];
}

// ===================================
// Live Chat Support System
// ===================================

export type ChatMessageType = 'text' | 'image' | 'file' | 'quick_reply' | 'system' | 'typing';
export type ChatParticipantRole = 'user' | 'agent' | 'system' | 'bot';
export type ChatSessionStatus = 'waiting' | 'active' | 'on_hold' | 'resolved' | 'abandoned';

export interface ChatMessage {
  id: ID;
  sessionId: ID;
  senderId: ID;
  senderRole: ChatParticipantRole;
  type: ChatMessageType;
  content: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileUrl?: string;
    replyToMessageId?: ID;
    isEdited?: boolean;
    editedAt?: Timestamp;
  };
  timestamp: Timestamp;
  isDelivered: boolean;
  isRead: boolean;
  readAt?: Timestamp;
}

export interface ChatSession {
  id: ID;
  userId: ID;
  agentId?: ID;
  status: ChatSessionStatus;
  topic?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  department?: string;
  tags?: string[];
  language: string;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  lastMessageAt?: Timestamp;
  waitTimeMinutes?: number;
  resolutionTimeMinutes?: number;
  satisfactionRating?: number;
  feedback?: string;
  transferHistory?: ChatTransfer[];
}

export interface ChatTransfer {
  id: ID;
  fromAgentId: ID;
  toAgentId: ID;
  reason: string;
  timestamp: Timestamp;
}

export interface ChatAgent {
  id: ID;
  userId: ID;
  displayName: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  department: string;
  specializations: string[];
  currentSessions: number;
  maxSessions: number;
  rating: number;
  totalSessions: number;
  averageResolutionTime: number;
  languages: string[];
  isAvailable: boolean;
  lastSeen?: Timestamp;
}

export interface ChatTypingIndicator {
  sessionId: ID;
  userId: ID;
  isTyping: boolean;
  timestamp: Timestamp;
}

export interface ChatQuickReply {
  id: string;
  text: string;
  value?: string;
  metadata?: Record<string, unknown>;
}

// ===================================
// Real-time Collaborative Features
// ===================================

export type CollaborativeAction = 
  | 'document_view'
  | 'document_edit'
  | 'comment_add'
  | 'comment_edit'
  | 'comment_delete'
  | 'share_document'
  | 'permission_change'
  | 'cursor_move'
  | 'selection_change';

export interface CollaborativeEvent {
  id: ID;
  documentId: ID;
  userId: ID;
  action: CollaborativeAction;
  data: Record<string, unknown>;
  timestamp: Timestamp;
  sessionId: string;
}

export interface CollaborativeDocument {
  id: ID;
  ownerId: ID;
  title: string;
  content: string;
  version: number;
  collaborators: DocumentCollaborator[];
  activeUsers: ActiveUser[];
  permissions: DocumentPermissions;
  lastModified: Timestamp;
  lastModifiedBy: ID;
}

export interface DocumentCollaborator {
  userId: ID;
  role: 'viewer' | 'editor' | 'owner';
  addedAt: Timestamp;
  addedBy: ID;
  lastAccess?: Timestamp;
}

export interface ActiveUser {
  userId: ID;
  sessionId: string;
  cursor?: {
    position: number;
    line: number;
    column: number;
  };
  selection?: {
    start: number;
    end: number;
  };
  color: string;
  lastActivity: Timestamp;
}

export interface DocumentPermissions {
  canView: boolean;
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canDelete: boolean;
  expiresAt?: Timestamp;
}

export interface CollaborativeComment {
  id: ID;
  documentId: ID;
  userId: ID;
  content: string;
  position: {
    start: number;
    end: number;
    line?: number;
  };
  isResolved: boolean;
  resolvedBy?: ID;
  resolvedAt?: Timestamp;
  replies: CollaborativeCommentReply[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface CollaborativeCommentReply {
  id: ID;
  userId: ID;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ===================================
// Real-time Analytics & Monitoring
// ===================================

export interface RealtimeMetrics {
  activeConnections: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  timestamp: Timestamp;
}

export interface WebSocketHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastHealthCheck: Timestamp;
  activeConnections: number;
  totalMessages: number;
  errorCount: number;
  averageResponseTime: number;
}

// ===================================
// Event Handlers & Subscriptions
// ===================================

export interface EventHandler<T = unknown> {
  (data: WebSocketMessage<T>): void | Promise<void>;
}

export interface RealtimeEventMap {
  'credit_score_update': CreditScoreUpdate;
  'dispute_status_change': DisputeStatusUpdate;
  'notification': RealtimeNotification;
  'chat_message': ChatMessage;
  'processing_update': any; // From existing processingUpdates.ts
  'collaboration_update': CollaborativeEvent;
  'system_alert': SystemAlert;
  'heartbeat': { timestamp: Timestamp };
  'error': { code: string; message: string; details?: unknown };
}

export interface SystemAlert {
  id: ID;
  type: 'maintenance' | 'outage' | 'security' | 'feature' | 'warning';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  affectedServices?: string[];
  estimatedResolution?: Timestamp;
  workaround?: string;
  timestamp: Timestamp;
}

// ===================================
// Configuration & Settings
// ===================================

export interface RealtimeConfig {
  websocket: {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    heartbeatInterval: number;
    connectionTimeout: number;
  };
  notifications: {
    vapidKeys: {
      publicKey: string;
      privateKey: string;
    };
    defaultTTL: number;
    maxRetries: number;
  };
  chat: {
    maxMessageLength: number;
    maxFileSize: number;
    allowedFileTypes: string[];
    agentResponseTimeout: number;
    sessionTimeout: number;
  };
  monitoring: {
    alertThresholds: {
      connectionCount: number;
      errorRate: number;
      latency: number;
    };
    metricsInterval: number;
  };
}