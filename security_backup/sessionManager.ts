/**
 * Session Management System
 * Handles session timeout, concurrent session management, and security policies
 */

import { createServerClient } from '@supabase/ssr'
import { auditLogger, AuditEventType, RiskLevel } from './auditLogger'

export interface SessionConfig {
  maxIdleTime: number // milliseconds
  maxSessionTime: number // milliseconds
  maxConcurrentSessions: number
  requireUniqueDevice: boolean
  enforceIPConsistency: boolean
}

export interface SessionInfo {
  sessionId: string
  userId: string
  createdAt: string
  lastActivity: string
  ipAddress: string
  userAgent: string
  deviceFingerprint?: string
  isActive: boolean
}

export interface SessionValidationResult {
  isValid: boolean
  reason?: string
  shouldRefresh?: boolean
  shouldLogout?: boolean
}

class SessionManager {
  private static instance: SessionManager
  private activeSessions = new Map<string, SessionInfo>()
  private userSessions = new Map<string, Set<string>>() // userId -> sessionIds
  
  private readonly config: SessionConfig = {
    maxIdleTime: 30 * 60 * 1000, // 30 minutes
    maxSessionTime: 8 * 60 * 60 * 1000, // 8 hours
    maxConcurrentSessions: 3, // max 3 concurrent sessions per user
    requireUniqueDevice: false, // allow same device multiple sessions
    enforceIPConsistency: false, // allow IP changes (mobile users)
  }

  private constructor() {
    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000)
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  /**
   * Create a new session
   */
  public async createSession(
    sessionId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      // Check for existing sessions
      const userSessionIds = this.userSessions.get(userId) || new Set()
      
      // Enforce concurrent session limit
      if (userSessionIds.size >= this.config.maxConcurrentSessions) {
        // Remove oldest session
        const oldestSessionId = this.findOldestSession(userSessionIds)
        if (oldestSessionId) {
          await this.terminateSession(oldestSessionId, 'concurrent_limit_exceeded')
        }
      }

      // Check for duplicate device if required
      if (this.config.requireUniqueDevice && deviceFingerprint) {
        const existingSession = this.findSessionByDevice(userId, deviceFingerprint)
        if (existingSession) {
          await this.terminateSession(existingSession.sessionId, 'duplicate_device')
        }
      }

      // Create new session
      const sessionInfo: SessionInfo = {
        sessionId,
        userId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ipAddress,
        userAgent,
        deviceFingerprint,
        isActive: true,
      }

      this.activeSessions.set(sessionId, sessionInfo)
      
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set())
      }
      this.userSessions.get(userId)!.add(sessionId)

      // Log session creation
      auditLogger.logAuthEvent(AuditEventType.USER_LOGIN, {
        userId,
        sessionId: sessionId,
        ipAddress,
        userAgent
      }, 'success', {
        userId,
        ip: ipAddress,
        userAgent,
        metadata: { 
          sessionId,
          concurrentSessions: userSessionIds.size + 1,
          deviceFingerprint
        }
      })

      return { success: true }

    } catch (error) {
      auditLogger.logSecurityEvent(AuditEventType.SYSTEM_ERROR, {
        userId,
        sessionId: '',
        ipAddress,
        userAgent
      }, 'error', {
        userId,
        ip: ipAddress,
        userAgent,
        resource: 'session_manager',
        action: 'create_session',
        outcome: 'FAILURE',
        metadata: { error: error instanceof Error ? error.message : 'unknown' }
      })

      return { success: false, reason: 'session_creation_failed' }
    }
  }

  /**
   * Validate an existing session
   */
  public async validateSession(
    sessionId: string,
    currentIp?: string,
    currentUserAgent?: string
  ): Promise<SessionValidationResult> {
    const session = this.activeSessions.get(sessionId)
    
    if (!session || !session.isActive) {
      return { isValid: false, reason: 'session_not_found', shouldLogout: true }
    }

    const now = Date.now()
    const lastActivity = new Date(session.lastActivity).getTime()
    const sessionStart = new Date(session.createdAt).getTime()

    // Check idle timeout
    if (now - lastActivity > this.config.maxIdleTime) {
      await this.terminateSession(sessionId, 'idle_timeout')
      return { isValid: false, reason: 'session_expired', shouldLogout: true }
    }

    // Check maximum session time
    if (now - sessionStart > this.config.maxSessionTime) {
      await this.terminateSession(sessionId, 'max_time_exceeded')
      return { isValid: false, reason: 'session_expired', shouldLogout: true }
    }

    // Check IP consistency if enforced
    if (this.config.enforceIPConsistency && currentIp && session.ipAddress !== currentIp) {
      auditLogger.logSecurityEvent(AuditEventType.SUSPICIOUS_ACTIVITY, {
        userId: session.userId,
        sessionId: sessionId,
        ipAddress: currentIp || '',
        userAgent: currentUserAgent || ''
      }, 'error', {
        userId: session.userId,
        sessionId,
        ip: currentIp,
        userAgent: currentUserAgent,
        resource: 'session_validation',
        action: 'ip_change_detected',
        outcome: 'WARNING',
        metadata: { 
          originalIp: session.ipAddress,
          newIp: currentIp
        }
      })
      
      // Allow but log the IP change
    }

    // Update last activity
    session.lastActivity = new Date().toISOString()
    if (currentIp) session.ipAddress = currentIp
    if (currentUserAgent) session.userAgent = currentUserAgent

    // Check if session needs refresh (e.g., after 75% of idle time)
    const shouldRefresh = (now - lastActivity) > (this.config.maxIdleTime * 0.75)

    return { 
      isValid: true, 
      shouldRefresh 
    }
  }

  /**
   * Terminate a session
   */
  public async terminateSession(sessionId: string, reason: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    
    if (session) {
      // Mark as inactive
      session.isActive = false
      
      // Remove from user sessions
      const userSessionIds = this.userSessions.get(session.userId)
      if (userSessionIds) {
        userSessionIds.delete(sessionId)
        if (userSessionIds.size === 0) {
          this.userSessions.delete(session.userId)
        }
      }

      // Log session termination
      auditLogger.logAuthEvent(
        reason === 'user_logout' ? AuditEventType.USER_LOGOUT : AuditEventType.SESSION_TIMEOUT, {
          userId: session.userId,
          sessionId,
          ipAddress: '',
          userAgent: ''
        },
        'success',
        {
          userId: session.userId,
          ip: session.ipAddress,
          userAgent: session.userAgent,
          metadata: { 
            sessionId,
            reason,
            sessionDuration: Date.now() - new Date(session.createdAt).getTime()
          }
        }
      )

      // Remove from active sessions after a delay (for audit purposes)
      setTimeout(() => {
        this.activeSessions.delete(sessionId)
      }, 60000) // 1 minute delay
    }
  }

  /**
   * Get all sessions for a user
   */
  public getUserSessions(userId: string): SessionInfo[] {
    const sessionIds = this.userSessions.get(userId) || new Set()
    return Array.from(sessionIds)
      .map(id => this.activeSessions.get(id))
      .filter((session): session is SessionInfo => session !== undefined && session.isActive)
  }

  /**
   * Terminate all sessions for a user (except optionally one)
   */
  public async terminateAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId) || new Set()
    
    for (const sessionId of sessionIds) {
      if (sessionId !== exceptSessionId) {
        await this.terminateSession(sessionId, 'admin_termination')
      }
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now()
    const expiredSessions: string[] = []

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const lastActivity = new Date(session.lastActivity).getTime()
      const sessionStart = new Date(session.createdAt).getTime()

      if (!session.isActive || 
          now - lastActivity > this.config.maxIdleTime || 
          now - sessionStart > this.config.maxSessionTime) {
        expiredSessions.push(sessionId)
      }
    }

    // Terminate expired sessions
    expiredSessions.forEach(sessionId => {
      this.terminateSession(sessionId, 'expired_cleanup')
    })
  }

  /**
   * Find oldest session for a user
   */
  private findOldestSession(sessionIds: Set<string>): string | null {
    let oldestSessionId: string | null = null
    let oldestTime = Date.now()

    for (const sessionId of sessionIds) {
      const session = this.activeSessions.get(sessionId)
      if (session) {
        const sessionTime = new Date(session.createdAt).getTime()
        if (sessionTime < oldestTime) {
          oldestTime = sessionTime
          oldestSessionId = sessionId
        }
      }
    }

    return oldestSessionId
  }

  /**
   * Find session by device fingerprint
   */
  private findSessionByDevice(userId: string, deviceFingerprint: string): SessionInfo | null {
    const sessionIds = this.userSessions.get(userId) || new Set()
    
    for (const sessionId of sessionIds) {
      const session = this.activeSessions.get(sessionId)
      if (session && session.deviceFingerprint === deviceFingerprint && session.isActive) {
        return session
      }
    }

    return null
  }

  /**
   * Get session statistics
   */
  public getSessionStats(): {
    totalActiveSessions: number
    totalUsers: number
    avgSessionsPerUser: number
    oldestSession: string | null
  } {
    const totalActiveSessions = Array.from(this.activeSessions.values())
      .filter(s => s.isActive).length
    const totalUsers = this.userSessions.size
    const avgSessionsPerUser = totalUsers > 0 ? totalActiveSessions / totalUsers : 0

    let oldestSession: string | null = null
    let oldestTime = Date.now()

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.isActive) {
        const sessionTime = new Date(session.createdAt).getTime()
        if (sessionTime < oldestTime) {
          oldestTime = sessionTime
          oldestSession = sessionId
        }
      }
    }

    return {
      totalActiveSessions,
      totalUsers,
      avgSessionsPerUser: Math.round(avgSessionsPerUser * 100) / 100,
      oldestSession,
    }
  }

  /**
   * Update session configuration
   */
  public updateConfig(newConfig: Partial<SessionConfig>): void {
    Object.assign(this.config, newConfig)
    
    auditLogger.logSecurityEvent(AuditEventType.CONFIGURATION_CHANGE, {
      userId: 'system',
      sessionId: '',
      ipAddress: '',
      userAgent: ''
    }, 'success', {
      resource: 'session_manager',
      action: 'config_update',
      outcome: 'SUCCESS',
      metadata: { newConfig }
    })
  }

  /**
   * Get current configuration
   */
  public getConfig(): SessionConfig {
    return { ...this.config }
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance()

// Utility function to generate device fingerprint
export function generateDeviceFingerprint(userAgent: string, additionalData?: Record<string, any>): string {
  const data = {
    userAgent,
    timestamp: Date.now(),
    ...additionalData
  }
  
  // Simple hash function (use a proper hashing library in production)
  let hash = 0
  const str = JSON.stringify(data)
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return hash.toString(36)
}