/**
 * Real-time Collaboration Manager
 * 
 * Manages collaborative features including document sharing, real-time editing,
 * commenting, and multi-user interaction for credit repair planning and analysis.
 */

import { WebSocketManager } from './websocketManager';
import { NotificationManager } from './notificationManager';
import {
  CollaborativeEvent,
  CollaborativeDocument,
  DocumentCollaborator,
  ActiveUser,
  DocumentPermissions,
  CollaborativeComment,
  CollaborativeCommentReply,
  CollaborativeAction
} from '../../types/realtime';
import { ID } from '../../types';

export interface CollaborationManagerOptions {
  enableRealTimeEditing: boolean;
  enableComments: boolean;
  enableVersionHistory: boolean;
  maxCollaborators: number;
  autoSaveInterval: number; // milliseconds
  maxVersionHistory: number;
  conflictResolutionStrategy: 'last_write_wins' | 'operational_transform' | 'merge_conflicts';
}

export interface DocumentVersion {
  id: string;
  documentId: ID;
  version: number;
  content: string;
  changes: DocumentChange[];
  createdBy: ID;
  createdAt: string;
  description?: string;
}

export interface DocumentChange {
  id: string;
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content: string;
  length?: number;
  author: ID;
  timestamp: string;
}

export interface CollaborationSession {
  documentId: ID;
  participants: Map<ID, ActiveUser>;
  lastActivity: string;
  isActive: boolean;
}

export class CollaborationManager {
  private static instance: CollaborationManager;
  private wsManager: WebSocketManager;
  private notificationManager: NotificationManager;
  private documents: Map<ID, CollaborativeDocument> = new Map();
  private activeSessions: Map<ID, CollaborationSession> = new Map();
  private documentVersions: Map<ID, DocumentVersion[]> = new Map();
  private comments: Map<ID, CollaborativeComment[]> = new Map(); // documentId -> comments
  private userSubscriptions: Map<ID, Set<ID>> = new Map(); // userId -> documentIds
  private autoSaveTimers: Map<ID, NodeJS.Timeout> = new Map();
  private options: CollaborationManagerOptions;
  private operationQueue: Map<ID, CollaborativeEvent[]> = new Map();

  private constructor() {
    this.wsManager = WebSocketManager.getInstance();
    this.notificationManager = NotificationManager.getInstance();
    this.options = this.getDefaultOptions();
    this.initializeEventHandlers();
  }

  static getInstance(): CollaborationManager {
    if (!this.instance) {
      this.instance = new CollaborationManager();
    }
    return this.instance;
  }

  /**
   * Initialize collaboration manager with options
   */
  initialize(options: Partial<CollaborationManagerOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('Collaboration manager initialized with options:', this.options);
  }

  /**
   * Create a new collaborative document
   */
  async createDocument(
    ownerId: ID,
    title: string,
    content: string = '',
    permissions: Partial<DocumentPermissions> = {}
  ): Promise<CollaborativeDocument> {
    const documentId = this.generateDocumentId();
    
    const document: CollaborativeDocument = {
      id: documentId,
      ownerId,
      title,
      content,
      version: 1,
      collaborators: [{
        userId: ownerId,
        role: 'owner',
        addedAt: new Date().toISOString(),
        addedBy: ownerId
      }],
      activeUsers: [],
      permissions: {
        canView: true,
        canEdit: true,
        canComment: true,
        canShare: true,
        canDelete: true,
        ...permissions
      },
      lastModified: new Date().toISOString(),
      lastModifiedBy: ownerId
    };

    this.documents.set(documentId, document);
    this.comments.set(documentId, []);
    
    // Create initial version
    const initialVersion: DocumentVersion = {
      id: this.generateVersionId(),
      documentId,
      version: 1,
      content,
      changes: [],
      createdBy: ownerId,
      createdAt: new Date().toISOString(),
      description: 'Initial version'
    };
    
    this.documentVersions.set(documentId, [initialVersion]);

    // Store in database
    await this.storeDocument(document);
    await this.storeVersion(initialVersion);

    console.log(`Created collaborative document: ${documentId}`);
    return document;
  }

  /**
   * Join a document collaboration session
   */
  async joinDocument(documentId: ID, userId: ID): Promise<CollaborativeDocument> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Check permissions
    if (!this.hasPermission(document, userId, 'canView')) {
      throw new Error('Insufficient permissions to view document');
    }

    // Create or update collaboration session
    let session = this.activeSessions.get(documentId);
    if (!session) {
      session = {
        documentId,
        participants: new Map(),
        lastActivity: new Date().toISOString(),
        isActive: true
      };
      this.activeSessions.set(documentId, session);
    }

    // Add user to active users
    const activeUser: ActiveUser = {
      userId,
      sessionId: this.generateSessionId(),
      color: this.generateUserColor(userId),
      lastActivity: new Date().toISOString()
    };

    session.participants.set(userId, activeUser);
    document.activeUsers = Array.from(session.participants.values());

    // Subscribe user to document updates
    this.subscribeUserToDocument(userId, documentId);

    // Broadcast user joined event
    await this.broadcastToDocument(documentId, {
      id: this.generateEventId(),
      documentId,
      userId,
      action: 'document_view',
      data: { activeUser },
      timestamp: new Date().toISOString(),
      sessionId: activeUser.sessionId
    });

    // Send notification to other collaborators
    await this.notifyCollaborators(document, userId, 'joined', {
      userName: `User ${userId}`,
      documentTitle: document.title
    });

    console.log(`User ${userId} joined document ${documentId}`);
    return document;
  }

  /**
   * Leave a document collaboration session
   */
  async leaveDocument(documentId: ID, userId: ID): Promise<void> {
    const session = this.activeSessions.get(documentId);
    if (!session) return;

    // Remove user from session
    session.participants.delete(userId);

    // Update document active users
    const document = this.documents.get(documentId);
    if (document) {
      document.activeUsers = Array.from(session.participants.values());
    }

    // Unsubscribe user
    this.unsubscribeUserFromDocument(userId, documentId);

    // Broadcast user left event
    await this.broadcastToDocument(documentId, {
      id: this.generateEventId(),
      documentId,
      userId,
      action: 'document_view',
      data: { action: 'user_left' },
      timestamp: new Date().toISOString(),
      sessionId: 'system'
    });

    // Clean up session if no participants
    if (session.participants.size === 0) {
      this.activeSessions.delete(documentId);
    }

    console.log(`User ${userId} left document ${documentId}`);
  }

  /**
   * Apply a collaborative edit operation
   */
  async applyEdit(
    documentId: ID,
    userId: ID,
    operation: {
      type: 'insert' | 'delete' | 'replace';
      position: number;
      content: string;
      length?: number;
    }
  ): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Check permissions
    if (!this.hasPermission(document, userId, 'canEdit')) {
      throw new Error('Insufficient permissions to edit document');
    }

    // Create change record
    const change: DocumentChange = {
      id: this.generateChangeId(),
      type: operation.type,
      position: operation.position,
      content: operation.content,
      length: operation.length,
      author: userId,
      timestamp: new Date().toISOString()
    };

    // Apply operation to document content
    const newContent = this.applyOperation(document.content, operation);
    
    // Update document
    document.content = newContent;
    document.version++;
    document.lastModified = new Date().toISOString();
    document.lastModifiedBy = userId;

    // Create collaborative event
    const event: CollaborativeEvent = {
      id: this.generateEventId(),
      documentId,
      userId,
      action: 'document_edit',
      data: { change, newContent, version: document.version },
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(documentId, userId)
    };

    // Add to operation queue for conflict resolution
    this.addToOperationQueue(documentId, event);

    // Broadcast to other users
    await this.broadcastToDocument(documentId, event, userId);

    // Auto-save
    this.scheduleAutoSave(documentId);

    console.log(`Applied edit to document ${documentId}:`, change);
  }

  /**
   * Update user cursor/selection position
   */
  updateCursor(
    documentId: ID,
    userId: ID,
    cursor?: { position: number; line: number; column: number },
    selection?: { start: number; end: number }
  ): void {
    const session = this.activeSessions.get(documentId);
    if (!session) return;

    const activeUser = session.participants.get(userId);
    if (!activeUser) return;

    // Update cursor/selection
    activeUser.cursor = cursor;
    activeUser.selection = selection;
    activeUser.lastActivity = new Date().toISOString();

    // Broadcast cursor update
    this.broadcastToDocument(documentId, {
      id: this.generateEventId(),
      documentId,
      userId,
      action: 'cursor_move',
      data: { cursor, selection },
      timestamp: new Date().toISOString(),
      sessionId: activeUser.sessionId
    }, userId);
  }

  /**
   * Add a comment to a document
   */
  async addComment(
    documentId: ID,
    userId: ID,
    content: string,
    position: { start: number; end: number; line?: number }
  ): Promise<CollaborativeComment> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Check permissions
    if (!this.hasPermission(document, userId, 'canComment')) {
      throw new Error('Insufficient permissions to comment on document');
    }

    const comment: CollaborativeComment = {
      id: this.generateCommentId(),
      documentId,
      userId,
      content,
      position,
      isResolved: false,
      replies: [],
      createdAt: new Date().toISOString()
    };

    // Add to comments
    const documentComments = this.comments.get(documentId) || [];
    documentComments.push(comment);
    this.comments.set(documentId, documentComments);

    // Broadcast comment added event
    await this.broadcastToDocument(documentId, {
      id: this.generateEventId(),
      documentId,
      userId,
      action: 'comment_add',
      data: { comment },
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(documentId, userId)
    });

    // Notify collaborators
    await this.notifyCollaborators(document, userId, 'commented', {
      documentTitle: document.title,
      commentContent: content.substring(0, 100)
    });

    // Store in database
    await this.storeComment(comment);

    console.log(`Comment added to document ${documentId}:`, comment);
    return comment;
  }

  /**
   * Reply to a comment
   */
  async replyToComment(
    commentId: ID,
    userId: ID,
    content: string
  ): Promise<CollaborativeCommentReply> {
    const comment = this.findComment(commentId);
    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    const document = this.documents.get(comment.documentId);
    if (!document) {
      throw new Error(`Document not found: ${comment.documentId}`);
    }

    // Check permissions
    if (!this.hasPermission(document, userId, 'canComment')) {
      throw new Error('Insufficient permissions to reply to comment');
    }

    const reply: CollaborativeCommentReply = {
      id: this.generateReplyId(),
      userId,
      content,
      createdAt: new Date().toISOString()
    };

    comment.replies.push(reply);
    comment.updatedAt = new Date().toISOString();

    // Broadcast reply added event
    await this.broadcastToDocument(comment.documentId, {
      id: this.generateEventId(),
      documentId: comment.documentId,
      userId,
      action: 'comment_edit',
      data: { commentId, reply },
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(comment.documentId, userId)
    });

    // Store in database
    await this.storeComment(comment);

    console.log(`Reply added to comment ${commentId}:`, reply);
    return reply;
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: ID, userId: ID): Promise<void> {
    const comment = this.findComment(commentId);
    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    comment.isResolved = true;
    comment.resolvedBy = userId;
    comment.resolvedAt = new Date().toISOString();

    // Broadcast comment resolved event
    await this.broadcastToDocument(comment.documentId, {
      id: this.generateEventId(),
      documentId: comment.documentId,
      userId,
      action: 'comment_edit',
      data: { commentId, resolved: true },
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(comment.documentId, userId)
    });

    // Store in database
    await this.storeComment(comment);

    console.log(`Comment resolved: ${commentId}`);
  }

  /**
   * Share a document with another user
   */
  async shareDocument(
    documentId: ID,
    ownerId: ID,
    targetUserId: ID,
    role: 'viewer' | 'editor' = 'viewer'
  ): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Check permissions
    if (document.ownerId !== ownerId && !this.hasPermission(document, ownerId, 'canShare')) {
      throw new Error('Insufficient permissions to share document');
    }

    // Check if user is already a collaborator
    const existingCollaborator = document.collaborators.find(c => c.userId === targetUserId);
    if (existingCollaborator) {
      existingCollaborator.role = role;
    } else {
      const collaborator: DocumentCollaborator = {
        userId: targetUserId,
        role,
        addedAt: new Date().toISOString(),
        addedBy: ownerId
      };
      document.collaborators.push(collaborator);
    }

    // Broadcast share event
    await this.broadcastToDocument(documentId, {
      id: this.generateEventId(),
      documentId,
      userId: ownerId,
      action: 'share_document',
      data: { targetUserId, role },
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(documentId, ownerId)
    });

    // Notify target user
    await this.notificationManager.sendNotification({
      userId: targetUserId,
      type: 'system_notification',
      channel: ['in_app', 'email'],
      title: 'Document Shared',
      body: `"${document.title}" has been shared with you`,
      data: { documentId, role },
      priority: 'normal'
    });

    // Store in database
    await this.storeDocument(document);

    console.log(`Document ${documentId} shared with user ${targetUserId} as ${role}`);
  }

  /**
   * Get document with all collaborative data
   */
  getDocument(documentId: ID): CollaborativeDocument | null {
    return this.documents.get(documentId) || null;
  }

  /**
   * Get document comments
   */
  getDocumentComments(documentId: ID): CollaborativeComment[] {
    return this.comments.get(documentId) || [];
  }

  /**
   * Get document version history
   */
  getVersionHistory(documentId: ID): DocumentVersion[] {
    return this.documentVersions.get(documentId) || [];
  }

  /**
   * Get documents accessible to a user
   */
  getUserDocuments(userId: ID): CollaborativeDocument[] {
    return Array.from(this.documents.values()).filter(doc => 
      doc.ownerId === userId || 
      doc.collaborators.some(c => c.userId === userId)
    );
  }

  // Private methods

  private initializeEventHandlers(): void {
    // Subscribe to collaboration events
    this.wsManager.subscribe('collaboration_update', (message) => {
      const event = message.data as CollaborativeEvent;
      this.handleCollaborativeEvent(event);
    });

    console.log('Collaboration manager event handlers initialized');
  }

  private async handleCollaborativeEvent(event: CollaborativeEvent): Promise<void> {
    console.log('Handling collaborative event:', event);
    
    // Handle different event types
    switch (event.action) {
      case 'document_edit':
        await this.handleRemoteEdit(event);
        break;
      case 'cursor_move':
        this.handleCursorUpdate(event);
        break;
      case 'comment_add':
      case 'comment_edit':
        await this.handleCommentEvent(event);
        break;
      default:
        console.log('Unhandled collaborative event:', event.action);
    }
  }

  private async handleRemoteEdit(event: CollaborativeEvent): Promise<void> {
    const document = this.documents.get(event.documentId);
    if (!document) return;

    // Apply conflict resolution if needed
    if (this.options.conflictResolutionStrategy === 'operational_transform') {
      await this.resolveConflicts(event.documentId, event);
    }

    // Update local document state
    document.content = event.data.newContent;
    document.version = event.data.version;
    document.lastModified = event.timestamp;
    document.lastModifiedBy = event.userId;
  }

  private handleCursorUpdate(event: CollaborativeEvent): void {
    const session = this.activeSessions.get(event.documentId);
    if (!session) return;

    const activeUser = session.participants.get(event.userId);
    if (!activeUser) return;

    activeUser.cursor = event.data.cursor;
    activeUser.selection = event.data.selection;
    activeUser.lastActivity = event.timestamp;
  }

  private async handleCommentEvent(event: CollaborativeEvent): Promise<void> {
    // Handle comment-related events
    console.log('Handling comment event:', event);
  }

  private async broadcastToDocument(documentId: ID, event: CollaborativeEvent, excludeUserId?: ID): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) return;

    // Send to all collaborators except the sender
    for (const collaborator of document.collaborators) {
      if (excludeUserId && collaborator.userId === excludeUserId) continue;
      
      this.wsManager.sendMessage({
        type: 'collaboration_update',
        userId: collaborator.userId,
        data: event
      });
    }
  }

  private subscribeUserToDocument(userId: ID, documentId: ID): void {
    const userDocs = this.userSubscriptions.get(userId) || new Set();
    userDocs.add(documentId);
    this.userSubscriptions.set(userId, userDocs);
  }

  private unsubscribeUserFromDocument(userId: ID, documentId: ID): void {
    const userDocs = this.userSubscriptions.get(userId);
    if (userDocs) {
      userDocs.delete(documentId);
      if (userDocs.size === 0) {
        this.userSubscriptions.delete(userId);
      }
    }
  }

  private hasPermission(document: CollaborativeDocument, userId: ID, permission: keyof DocumentPermissions): boolean {
    // Owner has all permissions
    if (document.ownerId === userId) return true;

    // Find collaborator
    const collaborator = document.collaborators.find(c => c.userId === userId);
    if (!collaborator) return false;

    // Check role-based permissions
    const rolePermissions = {
      viewer: { canView: true, canEdit: false, canComment: true, canShare: false, canDelete: false },
      editor: { canView: true, canEdit: true, canComment: true, canShare: true, canDelete: false },
      owner: { canView: true, canEdit: true, canComment: true, canShare: true, canDelete: true }
    };

    return rolePermissions[collaborator.role][permission] && document.permissions[permission];
  }

  private applyOperation(content: string, operation: { type: string; position: number; content: string; length?: number }): string {
    switch (operation.type) {
      case 'insert':
        return content.slice(0, operation.position) + operation.content + content.slice(operation.position);
      case 'delete':
        return content.slice(0, operation.position) + content.slice(operation.position + (operation.length || 1));
      case 'replace':
        return content.slice(0, operation.position) + operation.content + content.slice(operation.position + (operation.length || 0));
      default:
        return content;
    }
  }

  private addToOperationQueue(documentId: ID, event: CollaborativeEvent): void {
    const queue = this.operationQueue.get(documentId) || [];
    queue.push(event);
    this.operationQueue.set(documentId, queue);

    // Limit queue size
    if (queue.length > 100) {
      queue.shift();
    }
  }

  private async resolveConflicts(documentId: ID, newEvent: CollaborativeEvent): Promise<void> {
    // Simple conflict resolution - in a real implementation, this would use operational transform
    console.log('Resolving conflicts for document:', documentId);
  }

  private scheduleAutoSave(documentId: ID): void {
    // Clear existing timer
    const existingTimer = this.autoSaveTimers.get(documentId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.autoSaveDocument(documentId);
    }, this.options.autoSaveInterval);

    this.autoSaveTimers.set(documentId, timer);
  }

  private async autoSaveDocument(documentId: ID): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) return;

    await this.storeDocument(document);
    console.log(`Auto-saved document: ${documentId}`);
  }

  private async notifyCollaborators(document: CollaborativeDocument, actorUserId: ID, action: string, data: any): Promise<void> {
    for (const collaborator of document.collaborators) {
      if (collaborator.userId === actorUserId) continue;

      await this.notificationManager.sendNotification({
        userId: collaborator.userId,
        type: 'system_notification',
        channel: ['in_app'],
        title: 'Document Activity',
        body: `Activity in "${document.title}"`,
        data: { documentId: document.id, action, ...data },
        priority: 'low'
      });
    }
  }

  private findComment(commentId: ID): CollaborativeComment | null {
    for (const comments of this.comments.values()) {
      const comment = comments.find(c => c.id === commentId);
      if (comment) return comment;
    }
    return null;
  }

  private getSessionId(documentId: ID, userId: ID): string {
    const session = this.activeSessions.get(documentId);
    const user = session?.participants.get(userId);
    return user?.sessionId || 'unknown';
  }

  private generateUserColor(userId: ID): string {
    // Generate a consistent color for the user
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    const hash = userId.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  // Generator methods

  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVersionId(): string {
    return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommentId(): string {
    return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReplyId(): string {
    return `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultOptions(): CollaborationManagerOptions {
    return {
      enableRealTimeEditing: true,
      enableComments: true,
      enableVersionHistory: true,
      maxCollaborators: 10,
      autoSaveInterval: 30000, // 30 seconds
      maxVersionHistory: 50,
      conflictResolutionStrategy: 'last_write_wins'
    };
  }

  // Mock database methods (would be replaced with real implementations)

  private async storeDocument(document: CollaborativeDocument): Promise<void> {
    console.log('Storing collaborative document in database:', document);
  }

  private async storeVersion(version: DocumentVersion): Promise<void> {
    console.log('Storing document version in database:', version);
  }

  private async storeComment(comment: CollaborativeComment): Promise<void> {
    console.log('Storing comment in database:', comment);
  }
}