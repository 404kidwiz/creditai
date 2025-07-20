/**
 * Real-time React Hooks
 * 
 * React hooks for integrating real-time features into components,
 * providing reactive state management and automatic cleanup.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import RealtimeManager from '../lib/realtime';
import {
  CreditScoreUpdate,
  RealtimeNotification,
  DisputeStatusUpdate,
  DisputeTrackingState,
  ChatSession,
  ChatMessage,
  CollaborativeDocument,
  RealtimeStatus
} from '../types/realtime';
import { ID } from '../types';

// ===================================
// Main Real-time Hook
// ===================================

export interface UseRealtimeOptions {
  userId: ID;
  enableCreditMonitoring?: boolean;
  enableNotifications?: boolean;
  enableDisputeTracking?: boolean;
  enableChat?: boolean;
  enableCollaboration?: boolean;
  autoConnect?: boolean;
}

export interface UseRealtimeReturn {
  isConnected: boolean;
  status: RealtimeStatus | null;
  initialize: (options: UseRealtimeOptions) => Promise<void>;
  shutdown: () => Promise<void>;
  toggleFeature: (feature: string, enabled: boolean) => Promise<void>;
  manager: RealtimeManager;
}

export function useRealtime(): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<RealtimeStatus | null>(null);
  const managerRef = useRef<RealtimeManager>();

  useEffect(() => {
    managerRef.current = RealtimeManager.getInstance();
    
    // Update status periodically
    const statusInterval = setInterval(() => {
      if (managerRef.current) {
        const currentStatus = managerRef.current.getStatus();
        setStatus(currentStatus);
        setIsConnected(currentStatus.isConnected);
      }
    }, 5000);

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  const initialize = useCallback(async (options: UseRealtimeOptions) => {
    if (!managerRef.current) return;
    
    try {
      await managerRef.current.initialize(options);
      const newStatus = managerRef.current.getStatus();
      setStatus(newStatus);
      setIsConnected(newStatus.isConnected);
    } catch (error) {
      console.error('Failed to initialize real-time features:', error);
    }
  }, []);

  const shutdown = useCallback(async () => {
    if (!managerRef.current) return;
    
    try {
      await managerRef.current.shutdown();
      setIsConnected(false);
      setStatus(null);
    } catch (error) {
      console.error('Failed to shutdown real-time features:', error);
    }
  }, []);

  const toggleFeature = useCallback(async (feature: string, enabled: boolean) => {
    if (!managerRef.current) return;
    
    try {
      await managerRef.current.toggleFeature(feature, enabled);
      const newStatus = managerRef.current.getStatus();
      setStatus(newStatus);
    } catch (error) {
      console.error(`Failed to toggle feature ${feature}:`, error);
    }
  }, []);

  return {
    isConnected,
    status,
    initialize,
    shutdown,
    toggleFeature,
    manager: managerRef.current!
  };
}

// ===================================
// Credit Score Monitoring Hook
// ===================================

export interface UseCreditMonitoringReturn {
  latestUpdate: CreditScoreUpdate | null;
  pendingAlerts: any[];
  isMonitoring: boolean;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  simulateUpdate: (bureau: string, newScore: number) => void;
}

export function useCreditMonitoring(userId: ID): UseCreditMonitoringReturn {
  const [latestUpdate, setLatestUpdate] = useState<CreditScoreUpdate | null>(null);
  const [pendingAlerts, setPendingAlerts] = useState<any[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const managerRef = useRef<RealtimeManager>();

  useEffect(() => {
    managerRef.current = RealtimeManager.getInstance();

    // Listen for credit score updates
    const handleCreditUpdate = (event: CustomEvent<CreditScoreUpdate>) => {
      setLatestUpdate(event.detail);
    };

    window.addEventListener('creditScoreUpdate', handleCreditUpdate as EventListener);

    return () => {
      window.removeEventListener('creditScoreUpdate', handleCreditUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    if (managerRef.current && isMonitoring) {
      const alerts = managerRef.current.credit.getPendingAlerts(userId);
      setPendingAlerts(alerts);
    }
  }, [userId, isMonitoring, latestUpdate]);

  const startMonitoring = useCallback(async () => {
    if (!managerRef.current) return;
    
    try {
      await managerRef.current.credit.startMonitoring(userId);
      setIsMonitoring(true);
    } catch (error) {
      console.error('Failed to start credit monitoring:', error);
    }
  }, [userId]);

  const stopMonitoring = useCallback(() => {
    if (!managerRef.current) return;
    
    managerRef.current.credit.stopMonitoring(userId);
    setIsMonitoring(false);
    setLatestUpdate(null);
    setPendingAlerts([]);
  }, [userId]);

  const simulateUpdate = useCallback((bureau: string, newScore: number) => {
    if (!managerRef.current) return;
    
    managerRef.current.credit.simulateScoreUpdate(userId, bureau as any, newScore);
  }, [userId]);

  return {
    latestUpdate,
    pendingAlerts,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    simulateUpdate
  };
}

// ===================================
// Notifications Hook
// ===================================

export interface UseNotificationsReturn {
  notifications: RealtimeNotification[];
  unreadCount: number;
  markAsRead: (notificationIds: string[]) => void;
  clearAll: () => void;
  subscribeToPush: () => Promise<void>;
}

export function useNotifications(userId: ID): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const managerRef = useRef<RealtimeManager>();

  useEffect(() => {
    managerRef.current = RealtimeManager.getInstance();

    // Load initial notifications
    if (managerRef.current) {
      const initialNotifications = managerRef.current.notifications.getNotifications(userId);
      setNotifications(initialNotifications);
    }

    // Listen for new notifications
    const handleNewNotification = (event: CustomEvent<RealtimeNotification>) => {
      setNotifications(prev => [event.detail, ...prev]);
    };

    window.addEventListener('newNotification', handleNewNotification as EventListener);

    return () => {
      window.removeEventListener('newNotification', handleNewNotification as EventListener);
    };
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = useCallback((notificationIds: string[]) => {
    if (!managerRef.current) return;
    
    managerRef.current.notifications.markAsRead(userId, notificationIds);
    setNotifications(prev => 
      prev.map(n => 
        notificationIds.includes(n.id) 
          ? { ...n, isRead: true, readAt: new Date().toISOString() }
          : n
      )
    );
  }, [userId]);

  const clearAll = useCallback(() => {
    if (!managerRef.current) return;
    
    managerRef.current.notifications.clearNotifications(userId);
    setNotifications([]);
  }, [userId]);

  const subscribeToPush = useCallback(async () => {
    if (!managerRef.current) return;
    
    try {
      await managerRef.current.notifications.subscribeToPush(userId);
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  }, [userId]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    subscribeToPush
  };
}

// ===================================
// Dispute Tracking Hook
// ===================================

export interface UseDisputeTrackingReturn {
  disputes: DisputeTrackingState[];
  metrics: any;
  isTracking: boolean;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  updateDisputeStatus: (disputeId: ID, status: string, message: string) => Promise<void>;
  simulateUpdate: (disputeId: ID, updateType: string) => void;
}

export function useDisputeTracking(userId: ID): UseDisputeTrackingReturn {
  const [disputes, setDisputes] = useState<DisputeTrackingState[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);
  const managerRef = useRef<RealtimeManager>();

  useEffect(() => {
    managerRef.current = RealtimeManager.getInstance();

    // Listen for dispute updates
    const handleDisputeUpdate = (event: CustomEvent<{ update: DisputeStatusUpdate; state: DisputeTrackingState }>) => {
      const { state } = event.detail;
      setDisputes(prev => {
        const index = prev.findIndex(d => d.disputeId === state.disputeId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = state;
          return updated;
        } else {
          return [...prev, state];
        }
      });
    };

    window.addEventListener('disputeStatusUpdate', handleDisputeUpdate as EventListener);

    return () => {
      window.removeEventListener('disputeStatusUpdate', handleDisputeUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    if (managerRef.current && isTracking) {
      const userDisputes = managerRef.current.disputes.getUserDisputes(userId);
      const disputeMetrics = managerRef.current.disputes.getDisputeMetrics(userId);
      setDisputes(userDisputes);
      setMetrics(disputeMetrics);
    }
  }, [userId, isTracking]);

  const startTracking = useCallback(async () => {
    if (!managerRef.current) return;
    
    try {
      await managerRef.current.disputes.startTracking(userId);
      setIsTracking(true);
    } catch (error) {
      console.error('Failed to start dispute tracking:', error);
    }
  }, [userId]);

  const stopTracking = useCallback(() => {
    if (!managerRef.current) return;
    
    managerRef.current.disputes.stopTracking(userId);
    setIsTracking(false);
    setDisputes([]);
    setMetrics(null);
  }, [userId]);

  const updateDisputeStatus = useCallback(async (disputeId: ID, status: string, message: string) => {
    if (!managerRef.current) return;
    
    try {
      await managerRef.current.disputes.updateDisputeStatus(disputeId, status as any, message, userId);
    } catch (error) {
      console.error('Failed to update dispute status:', error);
    }
  }, [userId]);

  const simulateUpdate = useCallback((disputeId: ID, updateType: string) => {
    if (!managerRef.current) return;
    
    managerRef.current.disputes.simulateStatusUpdate(disputeId, userId, updateType as any);
  }, [userId]);

  return {
    disputes,
    metrics,
    isTracking,
    startTracking,
    stopTracking,
    updateDisputeStatus,
    simulateUpdate
  };
}

// ===================================
// Chat Hook
// ===================================

export interface UseChatReturn {
  session: ChatSession | null;
  messages: ChatMessage[];
  isTyping: boolean;
  startChat: (topic?: string) => Promise<ChatSession>;
  sendMessage: (content: string) => Promise<void>;
  endChat: (feedback?: { rating: number; comment: string }) => Promise<void>;
  setTyping: (typing: boolean) => void;
}

export function useChat(userId: ID): UseChatReturn {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const managerRef = useRef<RealtimeManager>();

  useEffect(() => {
    managerRef.current = RealtimeManager.getInstance();

    // Check for existing session
    if (managerRef.current) {
      const existingSession = managerRef.current.chat.getUserSession(userId);
      if (existingSession) {
        setSession(existingSession);
        const sessionMessages = managerRef.current.chat.getSessionMessages(existingSession.id);
        setMessages(sessionMessages);
      }
    }

    // Listen for chat events
    const handleChatMessage = (event: CustomEvent<ChatMessage>) => {
      if (session && event.detail.sessionId === session.id) {
        setMessages(prev => [...prev, event.detail]);
      }
    };

    const handleSessionStarted = (event: CustomEvent<{ session: ChatSession }>) => {
      if (event.detail.session.userId === userId) {
        setSession(event.detail.session);
        setMessages([]);
      }
    };

    window.addEventListener('chatMessage', handleChatMessage as EventListener);
    window.addEventListener('session_started', handleSessionStarted as EventListener);

    return () => {
      window.removeEventListener('chatMessage', handleChatMessage as EventListener);
      window.removeEventListener('session_started', handleSessionStarted as EventListener);
    };
  }, [userId, session]);

  const startChat = useCallback(async (topic?: string): Promise<ChatSession> => {
    if (!managerRef.current) throw new Error('Chat manager not available');
    
    const newSession = await managerRef.current.chat.startChatSession(userId, topic);
    setSession(newSession);
    setMessages([]);
    return newSession;
  }, [userId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!managerRef.current || !session) return;
    
    const message = await managerRef.current.chat.sendMessage(session.id, userId, content);
    setMessages(prev => [...prev, message]);
  }, [userId, session]);

  const endChat = useCallback(async (feedback?: { rating: number; comment: string }) => {
    if (!managerRef.current || !session) return;
    
    await managerRef.current.chat.endSession(session.id, userId, feedback);
    setSession(null);
    setMessages([]);
  }, [userId, session]);

  const setTyping = useCallback((typing: boolean) => {
    if (!managerRef.current || !session) return;
    
    managerRef.current.chat.setTypingIndicator(session.id, userId, typing);
    setIsTyping(typing);
  }, [userId, session]);

  return {
    session,
    messages,
    isTyping,
    startChat,
    sendMessage,
    endChat,
    setTyping
  };
}

// ===================================
// Collaboration Hook
// ===================================

export interface UseCollaborationReturn {
  documents: CollaborativeDocument[];
  activeDocument: CollaborativeDocument | null;
  createDocument: (title: string, content?: string) => Promise<CollaborativeDocument>;
  joinDocument: (documentId: ID) => Promise<void>;
  leaveDocument: (documentId: ID) => Promise<void>;
  applyEdit: (documentId: ID, operation: any) => Promise<void>;
  addComment: (documentId: ID, content: string, position: any) => Promise<void>;
}

export function useCollaboration(userId: ID): UseCollaborationReturn {
  const [documents, setDocuments] = useState<CollaborativeDocument[]>([]);
  const [activeDocument, setActiveDocument] = useState<CollaborativeDocument | null>(null);
  const managerRef = useRef<RealtimeManager>();

  useEffect(() => {
    managerRef.current = RealtimeManager.getInstance();

    // Load user documents
    if (managerRef.current) {
      const userDocs = managerRef.current.collaboration.getUserDocuments(userId);
      setDocuments(userDocs);
    }
  }, [userId]);

  const createDocument = useCallback(async (title: string, content = ''): Promise<CollaborativeDocument> => {
    if (!managerRef.current) throw new Error('Collaboration manager not available');
    
    const doc = await managerRef.current.collaboration.createDocument(userId, title, content);
    setDocuments(prev => [...prev, doc]);
    return doc;
  }, [userId]);

  const joinDocument = useCallback(async (documentId: ID) => {
    if (!managerRef.current) return;
    
    const doc = await managerRef.current.collaboration.joinDocument(documentId, userId);
    setActiveDocument(doc);
  }, [userId]);

  const leaveDocument = useCallback(async (documentId: ID) => {
    if (!managerRef.current) return;
    
    await managerRef.current.collaboration.leaveDocument(documentId, userId);
    if (activeDocument?.id === documentId) {
      setActiveDocument(null);
    }
  }, [userId, activeDocument]);

  const applyEdit = useCallback(async (documentId: ID, operation: any) => {
    if (!managerRef.current) return;
    
    await managerRef.current.collaboration.applyEdit(documentId, userId, operation);
  }, [userId]);

  const addComment = useCallback(async (documentId: ID, content: string, position: any) => {
    if (!managerRef.current) return;
    
    await managerRef.current.collaboration.addComment(documentId, userId, content, position);
  }, [userId]);

  return {
    documents,
    activeDocument,
    createDocument,
    joinDocument,
    leaveDocument,
    applyEdit,
    addComment
  };
}