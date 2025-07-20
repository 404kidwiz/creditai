/**
 * Enhanced Authentication System with MFA Integration
 * Provides comprehensive authentication with multi-factor support
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { mfaService, MFAMethod } from './mfaAuthentication';
import { auditLogger, AuditEventType, RiskLevel } from './auditLogger';
import crypto from 'crypto';

/**
 * Authentication Result Types
 */
export interface AuthResult {
  success: boolean;
  user?: any;
  session?: any;
  requiresMFA?: boolean;
  mfaChallengeId?: string;
  mfaMethod?: MFAMethod;
  mfaMasked?: string;
  error?: string;
  lockoutUntil?: Date;
}

/**
 * Enhanced User Session
 */
export interface EnhancedSession {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  mfaVerified: boolean;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  riskScore: number;
}

/**
 * Authentication Context
 */
export interface AuthContext {
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
}

/**
 * Risk Assessment Result
 */
interface RiskAssessment {
  score: number; // 0-1, where 1 is highest risk
  factors: string[];
  requiresAdditionalVerification: boolean;
}

/**
 * Device Trust Levels
 */
enum DeviceTrustLevel {
  UNKNOWN = 'unknown',
  TRUSTED = 'trusted',
  SUSPICIOUS = 'suspicious',
  BLOCKED = 'blocked'
}

/**
 * Enhanced Authentication Service
 */
export class EnhancedAuthService {
  private supabase: SupabaseClient;
  private sessions = new Map<string, EnhancedSession>();
  private deviceTrust = new Map<string, DeviceTrustLevel>();
  private failedAttempts = new Map<string, { count: number; lastAttempt: Date; lockoutUntil?: Date }>();
  private trustedDevices = new Map<string, { userId: string; lastSeen: Date; trustScore: number }>();
  
  // Security configuration
  private readonly config = {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
    sessionTimeoutMinutes: 480, // 8 hours
    mfaRequiredRiskThreshold: 0.7,
    trustedDeviceThreshold: 0.8,
    maxConcurrentSessions: 5
  };
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Start session cleanup
    setInterval(() => this.cleanupExpiredSessions(), 300000); // Every 5 minutes
  }
  
  /**
   * Enhanced sign in with risk assessment
   */
  async signIn(
    email: string,
    password: string,
    context: AuthContext
  ): Promise<AuthResult> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint(context);
      
      // Check if account is locked out
      const lockoutCheck = this.checkAccountLockout(email);
      if (lockoutCheck.locked) {
        auditLogger.logEvent(
          AuditEventType.FAILED_LOGIN,
          {
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          },
          {
            email,
            reason: 'account_locked',
            lockoutUntil: lockoutCheck.lockoutUntil
          },
          RiskLevel.HIGH
        );
        
        return {
          success: false,
          error: 'Account is temporarily locked due to too many failed attempts',
          lockoutUntil: lockoutCheck.lockoutUntil
        };
      }
      
      // Attempt authentication with Supabase
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error || !data.user || !data.session) {
        // Record failed attempt
        this.recordFailedAttempt(email);
        
        auditLogger.logEvent(
          AuditEventType.FAILED_LOGIN,
          {
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          },
          {
            email,
            reason: 'invalid_credentials',
            error: error?.message
          },
          RiskLevel.MEDIUM
        );
        
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }
      
      // Clear failed attempts on successful authentication
      this.failedAttempts.delete(email);
      
      // Perform risk assessment
      const riskAssessment = await this.assessAuthenticationRisk(
        data.user.id,
        context,
        deviceFingerprint
      );
      
      // Check if MFA is required
      const mfaStatus = mfaService.getUserMFAStatus(data.user.id);
      const requiresMFA = mfaStatus.enabled || riskAssessment.requiresAdditionalVerification;
      
      if (requiresMFA) {
        // Initiate MFA challenge
        const mfaChallenge = await mfaService.initiateMFAChallenge(
          data.user.id,
          mfaStatus.primaryMethod
        );
        
        if (!mfaChallenge.success) {
          return {
            success: false,
            error: mfaChallenge.error || 'Failed to initiate MFA challenge'
          };
        }
        
        // Create temporary session (not fully authenticated)
        const tempSession = this.createEnhancedSession(
          data.user.id,
          data.session,
          context,
          riskAssessment.score,
          false // MFA not yet verified
        );
        
        this.sessions.set(tempSession.id, tempSession);
        
        auditLogger.logEvent(
          AuditEventType.USER_LOGIN,
          {
            userId: data.user.id,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          },
          {
            email,
            requiresMFA: true,
            riskScore: riskAssessment.score,
            riskFactors: riskAssessment.factors
          },
          RiskLevel.MEDIUM
        );
        
        return {
          success: true,
          user: data.user,
          session: tempSession,
          requiresMFA: true,
          mfaChallengeId: mfaChallenge.challengeId,
          mfaMethod: mfaChallenge.method,
          mfaMasked: mfaChallenge.masked
        };
      }
      
      // Create fully authenticated session
      const session = this.createEnhancedSession(
        data.user.id,
        data.session,
        context,
        riskAssessment.score,
        true
      );
      
      this.sessions.set(session.id, session);
      
      // Update device trust
      this.updateDeviceTrust(deviceFingerprint, data.user.id, riskAssessment.score);
      
      auditLogger.logEvent(
        AuditEventType.USER_LOGIN,
        {
          userId: data.user.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        },
        {
          email,
          requiresMFA: false,
          riskScore: riskAssessment.score,
          riskFactors: riskAssessment.factors
        },
        RiskLevel.LOW
      );
      
      return {
        success: true,
        user: data.user,
        session: session
      };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        },
        {
          action: 'enhanced_signin',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: 'Authentication system error'
      };
    }
  }
  
  /**
   * Complete MFA verification
   */
  async completeMFAVerification(
    sessionId: string,
    challengeId: string,
    code: string
  ): Promise<AuthResult> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Invalid session'
        };
      }
      
      if (session.mfaVerified) {
        return {
          success: false,
          error: 'MFA already verified for this session'
        };
      }
      
      // Verify MFA challenge
      const mfaResult = await mfaService.verifyMFAChallenge(challengeId, code);
      
      if (!mfaResult.success) {
        auditLogger.logEvent(
          AuditEventType.MFA_FAILURE,
          {
            userId: session.userId,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent
          },
          {
            challengeId,
            remaining: mfaResult.remaining,
            error: mfaResult.error
          },
          RiskLevel.HIGH
        );
        
        return {
          success: false,
          error: mfaResult.error
        };
      }
      
      // Update session to fully authenticated
      session.mfaVerified = true;
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
      
      auditLogger.logEvent(
        AuditEventType.MFA_SUCCESS,
        {
          userId: session.userId,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent
        },
        {
          challengeId,
          sessionId
        },
        RiskLevel.LOW
      );
      
      return {
        success: true,
        session: session
      };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {},
        {
          action: 'complete_mfa_verification',
          sessionId,
          challengeId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: 'MFA verification system error'
      };
    }
  }
  
  /**
   * Validate session
   */
  async validateSession(sessionId: string, context: AuthContext): Promise<{
    valid: boolean;
    session?: EnhancedSession;
    shouldRefresh?: boolean;
    error?: string;
  }> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return {
          valid: false,
          error: 'Session not found'
        };
      }
      
      // Check if session is expired
      if (session.expiresAt <= new Date()) {
        this.sessions.delete(sessionId);
        
        auditLogger.logEvent(
          AuditEventType.SESSION_EXPIRED,
          {
            userId: session.userId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          },
          {
            sessionId,
            expiredAt: session.expiresAt
          },
          RiskLevel.LOW
        );
        
        return {
          valid: false,
          error: 'Session expired'
        };
      }
      
      // Check for suspicious activity (IP/User-Agent change)
      const suspiciousActivity = this.detectSuspiciousActivity(session, context);
      if (suspiciousActivity.suspicious) {
        this.sessions.delete(sessionId);
        
        auditLogger.logEvent(
          AuditEventType.SUSPICIOUS_ACTIVITY,
          {
            userId: session.userId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          },
          {
            sessionId,
            reasons: suspiciousActivity.reasons,
            originalIP: session.ipAddress,
            originalUserAgent: session.userAgent
          },
          RiskLevel.HIGH
        );
        
        return {
          valid: false,
          error: 'Suspicious activity detected. Please sign in again.'
        };
      }
      
      // Update last activity
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
      
      // Check if session should be refreshed (approaching expiry)
      const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
      const shouldRefresh = timeUntilExpiry <= 30 * 60 * 1000; // 30 minutes
      
      return {
        valid: true,
        session,
        shouldRefresh
      };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        },
        {
          action: 'validate_session',
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        valid: false,
        error: 'Session validation error'
      };
    }
  }
  
  /**
   * Sign out
   */
  async signOut(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const session = this.sessions.get(sessionId);
      if (session) {
        this.sessions.delete(sessionId);
        
        auditLogger.logEvent(
          AuditEventType.USER_LOGOUT,
          {
            userId: session.userId,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent
          },
          {
            sessionId,
            duration: Date.now() - session.createdAt.getTime()
          },
          RiskLevel.LOW
        );
      }
      
      return { success: true };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {},
        {
          action: 'signout',
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.MEDIUM
      );
      
      return {
        success: false,
        error: 'Sign out error'
      };
    }
  }
  
  /**
   * Get user sessions
   */
  getUserSessions(userId: string): EnhancedSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }
  
  /**
   * Revoke user session
   */
  async revokeSession(sessionId: string, revokedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        };
      }
      
      this.sessions.delete(sessionId);
      
      auditLogger.logEvent(
        AuditEventType.USER_LOGOUT,
        {
          userId: session.userId
        },
        {
          sessionId,
          revokedBy,
          reason: 'manual_revocation'
        },
        RiskLevel.MEDIUM
      );
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: 'Failed to revoke session'
      };
    }
  }
  
  /**
   * Private helper methods
   */
  private generateDeviceFingerprint(context: AuthContext): string {
    const data = `${context.ipAddress}:${context.userAgent}:${context.deviceFingerprint || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  private async assessAuthenticationRisk(
    userId: string,
    context: AuthContext,
    deviceFingerprint: string
  ): Promise<RiskAssessment> {
    let riskScore = 0;
    const factors: string[] = [];
    
    // Check device trust
    const deviceTrust = this.deviceTrust.get(deviceFingerprint) || DeviceTrustLevel.UNKNOWN;
    if (deviceTrust === DeviceTrustLevel.SUSPICIOUS || deviceTrust === DeviceTrustLevel.BLOCKED) {
      riskScore += 0.5;
      factors.push('Suspicious or blocked device');
    } else if (deviceTrust === DeviceTrustLevel.UNKNOWN) {
      riskScore += 0.3;
      factors.push('Unknown device');
    }
    
    // Check for unusual location (simplified)
    if (context.location?.country && this.isUnusualLocation(userId, context.location.country)) {
      riskScore += 0.4;
      factors.push('Unusual location');
    }
    
    // Check time-based patterns (simplified)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 0.2;
      factors.push('Unusual time of access');
    }
    
    // Check for multiple concurrent sessions
    const userSessions = this.getUserSessions(userId);
    if (userSessions.length >= this.config.maxConcurrentSessions) {
      riskScore += 0.3;
      factors.push('Multiple concurrent sessions');
    }
    
    return {
      score: Math.min(riskScore, 1),
      factors,
      requiresAdditionalVerification: riskScore >= this.config.mfaRequiredRiskThreshold
    };
  }
  
  private createEnhancedSession(
    userId: string,
    supabaseSession: any,
    context: AuthContext,
    riskScore: number,
    mfaVerified: boolean
  ): EnhancedSession {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.sessionTimeoutMinutes * 60 * 1000);
    
    return {
      id: crypto.randomUUID(),
      userId,
      accessToken: supabaseSession.access_token,
      refreshToken: supabaseSession.refresh_token,
      expiresAt,
      mfaVerified,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      createdAt: now,
      lastActivity: now,
      riskScore
    };
  }
  
  private checkAccountLockout(email: string): { locked: boolean; lockoutUntil?: Date } {
    const attempts = this.failedAttempts.get(email);
    if (!attempts) return { locked: false };
    
    if (attempts.lockoutUntil && attempts.lockoutUntil > new Date()) {
      return { locked: true, lockoutUntil: attempts.lockoutUntil };
    }
    
    return { locked: false };
  }
  
  private recordFailedAttempt(email: string): void {
    const attempts = this.failedAttempts.get(email) || { count: 0, lastAttempt: new Date() };
    attempts.count++;
    attempts.lastAttempt = new Date();
    
    if (attempts.count >= this.config.maxFailedAttempts) {
      attempts.lockoutUntil = new Date(
        Date.now() + this.config.lockoutDurationMinutes * 60 * 1000
      );
    }
    
    this.failedAttempts.set(email, attempts);
  }
  
  private detectSuspiciousActivity(
    session: EnhancedSession,
    context: AuthContext
  ): { suspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    // Check for IP address change
    if (session.ipAddress !== context.ipAddress) {
      reasons.push('IP address changed');
    }
    
    // Check for significant User-Agent change
    if (this.isSignificantUserAgentChange(session.userAgent, context.userAgent)) {
      reasons.push('User agent changed significantly');
    }
    
    return {
      suspicious: reasons.length > 0,
      reasons
    };
  }
  
  private isSignificantUserAgentChange(original: string, current: string): boolean {
    // Simple heuristic - check if browser or OS changed
    const extractBrowser = (ua: string) => {
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'Unknown';
    };
    
    const extractOS = (ua: string) => {
      if (ua.includes('Windows')) return 'Windows';
      if (ua.includes('Mac')) return 'Mac';
      if (ua.includes('Linux')) return 'Linux';
      if (ua.includes('Android')) return 'Android';
      if (ua.includes('iOS')) return 'iOS';
      return 'Unknown';
    };
    
    return extractBrowser(original) !== extractBrowser(current) ||
           extractOS(original) !== extractOS(current);
  }
  
  private isUnusualLocation(userId: string, country: string): boolean {
    // In a real implementation, this would check historical user locations
    // For now, just flag certain high-risk countries
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR'];
    return highRiskCountries.includes(country);
  }
  
  private updateDeviceTrust(fingerprint: string, userId: string, riskScore: number): void {
    const trustScore = 1 - riskScore;
    
    if (trustScore >= this.config.trustedDeviceThreshold) {
      this.deviceTrust.set(fingerprint, DeviceTrustLevel.TRUSTED);
    } else if (trustScore >= 0.5) {
      this.deviceTrust.set(fingerprint, DeviceTrustLevel.UNKNOWN);
    } else {
      this.deviceTrust.set(fingerprint, DeviceTrustLevel.SUSPICIOUS);
    }
    
    this.trustedDevices.set(fingerprint, {
      userId,
      lastSeen: new Date(),
      trustScore
    });
  }
  
  private cleanupExpiredSessions(): void {
    const now = new Date();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(sessionId);
      }
    }
    
    // Clean up old failed attempts
    for (const [email, attempts] of this.failedAttempts.entries()) {
      if (attempts.lockoutUntil && attempts.lockoutUntil <= now) {
        this.failedAttempts.delete(email);
      }
    }
  }
}

// Export singleton instance
export const enhancedAuthService = new EnhancedAuthService();
