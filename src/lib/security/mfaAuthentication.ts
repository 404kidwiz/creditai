/**
 * Multi-Factor Authentication (MFA) System
 * Provides comprehensive MFA capabilities including TOTP, SMS, and email
 */

import crypto from 'crypto';
import { auditLogger, AuditEventType, RiskLevel } from './auditLogger';
import { createClient } from '@supabase/supabase-js';

/**
 * MFA Method Types
 */
export enum MFAMethod {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email',
  BACKUP_CODES = 'backup_codes'
}

/**
 * MFA Challenge Status
 */
export enum MFAChallengeStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  FAILED = 'failed'
}

/**
 * MFA Configuration
 */
export interface MFAConfig {
  enabled: boolean;
  methods: MFAMethod[];
  required: boolean;
  backupCodesCount: number;
  challengeExpiryMinutes: number;
  maxAttempts: number;
  lockoutDurationMinutes: number;
}

/**
 * MFA User Settings
 */
export interface MFAUserSettings {
  userId: string;
  enabled: boolean;
  primaryMethod: MFAMethod;
  totpSecret?: string;
  phoneNumber?: string;
  email?: string;
  backupCodes: string[];
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MFA Challenge
 */
export interface MFAChallenge {
  id: string;
  userId: string;
  method: MFAMethod;
  code: string;
  status: MFAChallengeStatus;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

/**
 * TOTP Configuration
 */
interface TOTPConfig {
  issuer: string;
  algorithm: string;
  digits: number;
  period: number;
  window: number;
}

/**
 * Default MFA Configuration
 */
const DEFAULT_MFA_CONFIG: MFAConfig = {
  enabled: true,
  methods: [MFAMethod.TOTP, MFAMethod.EMAIL],
  required: false,
  backupCodesCount: 10,
  challengeExpiryMinutes: 5,
  maxAttempts: 3,
  lockoutDurationMinutes: 15
};

/**
 * TOTP Configuration
 */
const TOTP_CONFIG: TOTPConfig = {
  issuer: 'CreditAI',
  algorithm: 'sha1',
  digits: 6,
  period: 30,
  window: 1
};

/**
 * Base32 encoding/decoding utilities
 */
class Base32 {
  private static readonly alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  
  static encode(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';
    
    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;
      
      while (bits >= 5) {
        output += this.alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    
    if (bits > 0) {
      output += this.alphabet[(value << (5 - bits)) & 31];
    }
    
    return output;
  }
  
  static decode(input: string): Buffer {
    const cleanInput = input.replace(/[^A-Z2-7]/g, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const output: number[] = [];
    
    for (let i = 0; i < cleanInput.length; i++) {
      const char = cleanInput[i];
      const index = this.alphabet.indexOf(char);
      
      if (index === -1) {
        throw new Error(`Invalid character in base32: ${char}`);
      }
      
      value = (value << 5) | index;
      bits += 5;
      
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    
    return Buffer.from(output);
  }
}

/**
 * TOTP (Time-based One-Time Password) implementation
 */
class TOTPGenerator {
  /**
   * Generate a secret key
   */
  static generateSecret(): string {
    const buffer = crypto.randomBytes(20);
    return Base32.encode(buffer);
  }
  
  /**
   * Generate TOTP code
   */
  static generateTOTP(secret: string, timeStep?: number): string {
    const time = Math.floor((timeStep || Date.now()) / 1000 / TOTP_CONFIG.period);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(0, 0);
    timeBuffer.writeUInt32BE(time, 4);
    
    const secretBuffer = Base32.decode(secret);
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(timeBuffer);
    const digest = hmac.digest();
    
    const offset = digest[digest.length - 1] & 0x0f;
    const code = (
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)
    ) % Math.pow(10, TOTP_CONFIG.digits);
    
    return code.toString().padStart(TOTP_CONFIG.digits, '0');
  }
  
  /**
   * Verify TOTP code
   */
  static verifyTOTP(secret: string, code: string, window: number = TOTP_CONFIG.window): boolean {
    const now = Date.now();
    
    for (let i = -window; i <= window; i++) {
      const timeStep = now + (i * TOTP_CONFIG.period * 1000);
      const expectedCode = this.generateTOTP(secret, timeStep);
      
      if (expectedCode === code) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Generate QR code URL for TOTP setup
   */
  static generateQRCodeURL(secret: string, accountName: string, issuer: string = TOTP_CONFIG.issuer): string {
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: TOTP_CONFIG.algorithm.toUpperCase(),
      digits: TOTP_CONFIG.digits.toString(),
      period: TOTP_CONFIG.period.toString()
    });
    
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params.toString()}`;
  }
}

/**
 * MFA Service
 */
export class MFAService {
  private config: MFAConfig;
  private challenges = new Map<string, MFAChallenge>();
  private userSettings = new Map<string, MFAUserSettings>();
  private lockouts = new Map<string, Date>();
  
  constructor(config: Partial<MFAConfig> = {}) {
    this.config = { ...DEFAULT_MFA_CONFIG, ...config };
    
    // Start periodic cleanup
    setInterval(() => this.cleanupExpiredChallenges(), 60000); // Every minute
  }
  
  /**
   * Enable MFA for a user
   */
  async enableMFA(userId: string, method: MFAMethod, contact?: string): Promise<{
    success: boolean;
    secret?: string;
    qrCodeURL?: string;
    backupCodes?: string[];
    error?: string;
  }> {
    try {
      // Check if user is locked out
      if (this.isUserLockedOut(userId)) {
        return {
          success: false,
          error: 'User is temporarily locked out due to failed attempts'
        };
      }
      
      let settings = this.userSettings.get(userId);
      if (!settings) {
        settings = {
          userId,
          enabled: false,
          primaryMethod: method,
          backupCodes: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      let secret: string | undefined;
      let qrCodeURL: string | undefined;
      
      // Setup method-specific configuration
      switch (method) {
        case MFAMethod.TOTP:
          secret = TOTPGenerator.generateSecret();
          settings.totpSecret = secret;
          qrCodeURL = TOTPGenerator.generateQRCodeURL(secret, contact || userId);
          break;
          
        case MFAMethod.SMS:
          if (!contact) {
            return { success: false, error: 'Phone number required for SMS MFA' };
          }
          settings.phoneNumber = contact;
          break;
          
        case MFAMethod.EMAIL:
          if (!contact) {
            return { success: false, error: 'Email address required for email MFA' };
          }
          settings.email = contact;
          break;
      }
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      settings.backupCodes = backupCodes;
      settings.enabled = true;
      settings.primaryMethod = method;
      settings.updatedAt = new Date();
      
      this.userSettings.set(userId, settings);
      
      // Log MFA enablement
      auditLogger.logEvent(
        AuditEventType.MFA_SUCCESS,
        { userId },
        {
          action: 'mfa_enabled',
          method,
          hasBackupCodes: backupCodes.length > 0
        },
        RiskLevel.MEDIUM
      );
      
      return {
        success: true,
        secret,
        qrCodeURL,
        backupCodes
      };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        { userId },
        {
          action: 'mfa_enable_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: 'Failed to enable MFA'
      };
    }
  }
  
  /**
   * Initiate MFA challenge
   */
  async initiateMFAChallenge(userId: string, method?: MFAMethod): Promise<{
    success: boolean;
    challengeId?: string;
    method?: MFAMethod;
    masked?: string;
    error?: string;
  }> {
    try {
      // Check if user is locked out
      if (this.isUserLockedOut(userId)) {
        return {
          success: false,
          error: 'User is temporarily locked out due to failed attempts'
        };
      }
      
      const settings = this.userSettings.get(userId);
      if (!settings || !settings.enabled) {
        return {
          success: false,
          error: 'MFA is not enabled for this user'
        };
      }
      
      const selectedMethod = method || settings.primaryMethod;
      
      // Check if method is available
      if (!this.config.methods.includes(selectedMethod)) {
        return {
          success: false,
          error: `MFA method ${selectedMethod} is not available`
        };
      }
      
      // Generate challenge
      const challenge: MFAChallenge = {
        id: crypto.randomUUID(),
        userId,
        method: selectedMethod,
        code: this.generateChallengeCode(selectedMethod),
        status: MFAChallengeStatus.PENDING,
        attempts: 0,
        expiresAt: new Date(Date.now() + this.config.challengeExpiryMinutes * 60 * 1000),
        createdAt: new Date()
      };
      
      this.challenges.set(challenge.id, challenge);
      
      // Send challenge based on method
      let masked: string | undefined;
      switch (selectedMethod) {
        case MFAMethod.TOTP:
          // TOTP doesn't require sending - user generates from app
          masked = 'authenticator app';
          break;
          
        case MFAMethod.SMS:
          if (settings.phoneNumber) {
            await this.sendSMSChallenge(settings.phoneNumber, challenge.code);
            masked = this.maskPhoneNumber(settings.phoneNumber);
          }
          break;
          
        case MFAMethod.EMAIL:
          if (settings.email) {
            await this.sendEmailChallenge(settings.email, challenge.code);
            masked = this.maskEmail(settings.email);
          }
          break;
      }
      
      // Log challenge initiation
      auditLogger.logEvent(
        AuditEventType.MFA_CHALLENGE_INITIATED,
        { userId },
        {
          challengeId: challenge.id,
          method: selectedMethod,
          expiresAt: challenge.expiresAt
        },
        RiskLevel.LOW
      );
      
      return {
        success: true,
        challengeId: challenge.id,
        method: selectedMethod,
        masked
      };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        { userId },
        {
          action: 'mfa_challenge_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: 'Failed to initiate MFA challenge'
      };
    }
  }
  
  /**
   * Verify MFA challenge
   */
  async verifyMFAChallenge(challengeId: string, code: string): Promise<{
    success: boolean;
    remaining?: number;
    error?: string;
  }> {
    try {
      const challenge = this.challenges.get(challengeId);
      if (!challenge) {
        return {
          success: false,
          error: 'Invalid challenge ID'
        };
      }
      
      // Check if challenge is expired
      if (challenge.status === MFAChallengeStatus.EXPIRED || challenge.expiresAt <= new Date()) {
        challenge.status = MFAChallengeStatus.EXPIRED;
        return {
          success: false,
          error: 'Challenge has expired'
        };
      }
      
      // Check if challenge is already failed
      if (challenge.status === MFAChallengeStatus.FAILED) {
        return {
          success: false,
          error: 'Challenge has failed due to too many attempts'
        };
      }
      
      // Check if user is locked out
      if (this.isUserLockedOut(challenge.userId)) {
        return {
          success: false,
          error: 'User is temporarily locked out due to failed attempts'
        };
      }
      
      // Increment attempt counter
      challenge.attempts++;
      
      let isValid = false;
      const settings = this.userSettings.get(challenge.userId);
      
      // Verify code based on method
      switch (challenge.method) {
        case MFAMethod.TOTP:
          if (settings?.totpSecret) {
            isValid = TOTPGenerator.verifyTOTP(settings.totpSecret, code);
          }
          break;
          
        case MFAMethod.SMS:
        case MFAMethod.EMAIL:
          isValid = challenge.code === code;
          break;
          
        case MFAMethod.BACKUP_CODES:
          if (settings?.backupCodes.includes(code)) {
            isValid = true;
            // Remove used backup code
            settings.backupCodes = settings.backupCodes.filter(bc => bc !== code);
            this.userSettings.set(challenge.userId, settings);
          }
          break;
      }
      
      if (isValid) {
        challenge.status = MFAChallengeStatus.VERIFIED;
        
        // Update last used timestamp
        if (settings) {
          settings.lastUsed = new Date();
          this.userSettings.set(challenge.userId, settings);
        }
        
        // Log successful verification
        auditLogger.logEvent(
          AuditEventType.MFA_SUCCESS,
          { userId: challenge.userId },
          {
            challengeId,
            method: challenge.method,
            attempts: challenge.attempts
          },
          RiskLevel.LOW
        );
        
        return { success: true };
      } else {
        // Check if max attempts reached
        if (challenge.attempts >= this.config.maxAttempts) {
          challenge.status = MFAChallengeStatus.FAILED;
          
          // Lock out user
          const lockoutUntil = new Date(Date.now() + this.config.lockoutDurationMinutes * 60 * 1000);
          this.lockouts.set(challenge.userId, lockoutUntil);
          
          auditLogger.logEvent(
            AuditEventType.MFA_FAILURE,
            { userId: challenge.userId },
            {
              challengeId,
              method: challenge.method,
              attempts: challenge.attempts,
              lockoutUntil
            },
            RiskLevel.HIGH
          );
          
          return {
            success: false,
            error: 'Too many failed attempts. Account temporarily locked.'
          };
        }
        
        auditLogger.logEvent(
          AuditEventType.MFA_FAILURE,
          { userId: challenge.userId },
          {
            challengeId,
            method: challenge.method,
            attempts: challenge.attempts,
            remaining: this.config.maxAttempts - challenge.attempts
          },
          RiskLevel.MEDIUM
        );
        
        return {
          success: false,
          remaining: this.config.maxAttempts - challenge.attempts,
          error: 'Invalid verification code'
        };
      }
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {},
        {
          action: 'mfa_verify_failed',
          challengeId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: 'Failed to verify MFA challenge'
      };
    }
  }
  
  /**
   * Get user MFA status
   */
  getUserMFAStatus(userId: string): {
    enabled: boolean;
    methods: MFAMethod[];
    primaryMethod?: MFAMethod;
    backupCodesRemaining?: number;
    lastUsed?: Date;
  } {
    const settings = this.userSettings.get(userId);
    if (!settings) {
      return {
        enabled: false,
        methods: []
      };
    }
    
    const availableMethods: MFAMethod[] = [];
    if (settings.totpSecret) availableMethods.push(MFAMethod.TOTP);
    if (settings.phoneNumber) availableMethods.push(MFAMethod.SMS);
    if (settings.email) availableMethods.push(MFAMethod.EMAIL);
    if (settings.backupCodes.length > 0) availableMethods.push(MFAMethod.BACKUP_CODES);
    
    return {
      enabled: settings.enabled,
      methods: availableMethods,
      primaryMethod: settings.primaryMethod,
      backupCodesRemaining: settings.backupCodes.length,
      lastUsed: settings.lastUsed
    };
  }
  
  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = this.userSettings.get(userId);
      if (!settings) {
        return { success: false, error: 'MFA is not enabled for this user' };
      }
      
      // Clear all MFA data
      settings.enabled = false;
      settings.totpSecret = undefined;
      settings.phoneNumber = undefined;
      settings.email = undefined;
      settings.backupCodes = [];
      settings.updatedAt = new Date();
      
      this.userSettings.set(userId, settings);
      
      // Clear any pending challenges
      for (const [challengeId, challenge] of this.challenges.entries()) {
        if (challenge.userId === userId) {
          this.challenges.delete(challengeId);
        }
      }
      
      // Clear lockouts
      this.lockouts.delete(userId);
      
      auditLogger.logEvent(
        AuditEventType.MFA_SUCCESS,
        { userId },
        { action: 'mfa_disabled' },
        RiskLevel.MEDIUM
      );
      
      return { success: true };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        { userId },
        {
          action: 'mfa_disable_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: 'Failed to disable MFA'
      };
    }
  }
  
  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<{
    success: boolean;
    backupCodes?: string[];
    error?: string;
  }> {
    try {
      const settings = this.userSettings.get(userId);
      if (!settings || !settings.enabled) {
        return { success: false, error: 'MFA is not enabled for this user' };
      }
      
      const backupCodes = this.generateBackupCodes();
      settings.backupCodes = backupCodes;
      settings.updatedAt = new Date();
      
      this.userSettings.set(userId, settings);
      
      auditLogger.logEvent(
        AuditEventType.MFA_SUCCESS,
        { userId },
        {
          action: 'backup_codes_regenerated',
          count: backupCodes.length
        },
        RiskLevel.MEDIUM
      );
      
      return {
        success: true,
        backupCodes
      };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        { userId },
        {
          action: 'backup_codes_regeneration_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: 'Failed to regenerate backup codes'
      };
    }
  }
  
  /**
   * Private helper methods
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.config.backupCodesCount; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }
  
  private generateChallengeCode(method: MFAMethod): string {
    switch (method) {
      case MFAMethod.TOTP:
        return ''; // TOTP codes are generated by the user's app
      case MFAMethod.SMS:
      case MFAMethod.EMAIL:
        return Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      default:
        return crypto.randomBytes(3).toString('hex').toUpperCase();
    }
  }
  
  private async sendSMSChallenge(phoneNumber: string, code: string): Promise<void> {
    // In a real implementation, this would use a service like Twilio
    console.log(`SMS to ${phoneNumber}: Your verification code is ${code}`);
  }
  
  private async sendEmailChallenge(email: string, code: string): Promise<void> {
    // In a real implementation, this would use an email service
    console.log(`Email to ${email}: Your verification code is ${code}`);
  }
  
  private maskPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length >= 4) {
      return `****${cleaned.slice(-4)}`;
    }
    return '****';
  }
  
  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 2) {
      return `**@${domain}`;
    }
    return `${username.slice(0, 2)}**@${domain}`;
  }
  
  private isUserLockedOut(userId: string): boolean {
    const lockoutUntil = this.lockouts.get(userId);
    if (!lockoutUntil) return false;
    
    if (lockoutUntil <= new Date()) {
      this.lockouts.delete(userId);
      return false;
    }
    
    return true;
  }
  
  private cleanupExpiredChallenges(): void {
    const now = new Date();
    
    for (const [challengeId, challenge] of this.challenges.entries()) {
      if (challenge.expiresAt <= now) {
        challenge.status = MFAChallengeStatus.EXPIRED;
        this.challenges.delete(challengeId);
      }
    }
    
    // Clean up expired lockouts
    for (const [userId, lockoutUntil] of this.lockouts.entries()) {
      if (lockoutUntil <= now) {
        this.lockouts.delete(userId);
      }
    }
  }
}

// Export singleton instance
export const mfaService = new MFAService();

export { TOTPGenerator };
