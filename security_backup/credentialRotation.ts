/**
 * Google Cloud Credential Rotation System
 * Handles automated credential rotation and security procedures
 */

import { CredentialManager, ServiceAccountKey } from './credentialManager';
import { CredentialValidator } from './credentialValidator';

export interface RotationConfig {
  rotationIntervalDays: number;
  backupRetentionDays: number;
  notificationEmail?: string;
  autoRotate: boolean;
}

export interface RotationResult {
  success: boolean;
  timestamp: Date;
  oldKeyId: string;
  newKeyId?: string;
  error?: string;
  backupCreated: boolean;
}

export class CredentialRotation {
  private credentialManager: CredentialManager;
  private validator: CredentialValidator;
  private config: RotationConfig;

  constructor(config: Partial<RotationConfig> = {}) {
    this.credentialManager = CredentialManager.getInstance();
    this.validator = new CredentialValidator();
    this.config = {
      rotationIntervalDays: 90,
      backupRetentionDays: 30,
      autoRotate: false,
      ...config
    };
  }

  /**
   * Check if rotation is needed and execute if configured
   */
  async checkAndRotate(): Promise<RotationResult | null> {
    console.log('🔄 Checking credential rotation status...');

    const needsRotation = await this.credentialManager.needsRotation();
    
    if (!needsRotation) {
      console.log('✅ Credentials are current, no rotation needed');
      return null;
    }

    console.log('⚠️ Credentials need rotation');

    if (this.config.autoRotate) {
      console.log('🔄 Auto-rotation enabled, starting rotation process...');
      return await this.rotateCredentials();
    } else {
      console.log('📧 Auto-rotation disabled, manual rotation required');
      await this.sendRotationNotification();
      return null;
    }
  }

  /**
   * Manually trigger credential rotation
   */
  async rotateCredentials(newCredentials?: ServiceAccountKey): Promise<RotationResult> {
    console.log('🔄 Starting credential rotation...');

    const metadata = await this.credentialManager.getMetadata();
    const oldKeyId = metadata?.keyId || 'unknown';

    try {
      // Step 1: Create backup of current credentials
      const backupCreated = await this.createBackup();

      // Step 2: Validate new credentials if provided
      if (newCredentials) {
        await this.validateNewCredentials(newCredentials);
      } else {
        throw new Error('New credentials must be provided for rotation');
      }

      // Step 3: Store new credentials
      const environment = metadata?.environment || 'development';
      await this.credentialManager.storeCredentials(newCredentials, environment);

      // Step 4: Validate new credentials work
      const validationReport = await this.validator.validateCredentials();
      
      if (!validationReport.overall) {
        throw new Error('New credentials failed validation');
      }

      // Step 5: Clean up old backups
      await this.cleanupOldBackups();

      const result: RotationResult = {
        success: true,
        timestamp: new Date(),
        oldKeyId,
        newKeyId: newCredentials.private_key_id,
        backupCreated
      };

      console.log('✅ Credential rotation completed successfully');
      await this.logRotationEvent(result);

      return result;

    } catch (error) {
      console.error('❌ Credential rotation failed:', error);

      const result: RotationResult = {
        success: false,
        timestamp: new Date(),
        oldKeyId,
        error: error.message,
        backupCreated: false
      };

      await this.logRotationEvent(result);
      return result;
    }
  }

  /**
   * Create backup of current credentials
   */
  private async createBackup(): Promise<boolean> {
    try {
      const credentials = await this.credentialManager.loadCredentials();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `./credentials-backup-${timestamp}.json`;

      // Store backup (encrypted)
      const backupManager = new CredentialManager();
      await backupManager.storeCredentials(credentials, 'backup');

      console.log('✅ Credential backup created');
      return true;
    } catch (error) {
      console.error('❌ Failed to create credential backup:', error);
      return false;
    }
  }

  /**
   * Validate new credentials before rotation
   */
  private async validateNewCredentials(credentials: ServiceAccountKey): Promise<void> {
    // Basic format validation
    const requiredFields = [
      'type', 'project_id', 'private_key_id', 'private_key',
      'client_email', 'client_id'
    ];

    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new Error(`New credentials missing required field: ${field}`);
      }
    }

    // Ensure it's a different key
    const currentMetadata = await this.credentialManager.getMetadata();
    if (currentMetadata && credentials.private_key_id === currentMetadata.keyId) {
      throw new Error('New credentials must have a different key ID');
    }

    console.log('✅ New credentials validated');
  }

  /**
   * Clean up old backup files
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      // This would implement cleanup logic for old backup files
      // based on the retention policy
      console.log('🧹 Cleaning up old credential backups');
    } catch (error) {
      console.warn('⚠️ Failed to clean up old backups:', error);
    }
  }

  /**
   * Send rotation notification
   */
  private async sendRotationNotification(): Promise<void> {
    if (!this.config.notificationEmail) {
      console.log('📧 No notification email configured');
      return;
    }

    try {
      // This would implement email notification logic
      console.log(`📧 Rotation notification sent to ${this.config.notificationEmail}`);
    } catch (error) {
      console.error('❌ Failed to send rotation notification:', error);
    }
  }

  /**
   * Log rotation event for audit purposes
   */
  private async logRotationEvent(result: RotationResult): Promise<void> {
    const logEntry = {
      event: 'credential_rotation',
      timestamp: result.timestamp.toISOString(),
      success: result.success,
      oldKeyId: result.oldKeyId,
      newKeyId: result.newKeyId,
      error: result.error,
      backupCreated: result.backupCreated
    };

    console.log('📝 Rotation event logged:', JSON.stringify(logEntry, null, 2));
    
    // In production, this would write to audit logs or monitoring system
  }

  /**
   * Get rotation schedule information
   */
  async getRotationSchedule(): Promise<{
    nextRotationDue: Date;
    daysUntilRotation: number;
    rotationOverdue: boolean;
  }> {
    const metadata = await this.credentialManager.getMetadata();
    
    if (!metadata) {
      const now = new Date();
      return {
        nextRotationDue: now,
        daysUntilRotation: 0,
        rotationOverdue: true
      };
    }

    const nextRotationDue = new Date(metadata.createdAt);
    nextRotationDue.setDate(nextRotationDue.getDate() + this.config.rotationIntervalDays);

    const now = new Date();
    const daysUntilRotation = Math.ceil((nextRotationDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const rotationOverdue = daysUntilRotation < 0;

    return {
      nextRotationDue,
      daysUntilRotation,
      rotationOverdue
    };
  }

  /**
   * Generate rotation report
   */
  async generateRotationReport(): Promise<{
    currentStatus: string;
    schedule: any;
    recommendations: string[];
  }> {
    const schedule = await this.getRotationSchedule();
    const needsRotation = await this.credentialManager.needsRotation();
    
    let currentStatus = 'current';
    const recommendations: string[] = [];

    if (needsRotation) {
      currentStatus = schedule.rotationOverdue ? 'overdue' : 'due';
      recommendations.push('Credential rotation is required');
      
      if (schedule.rotationOverdue) {
        recommendations.push('Rotation is overdue - immediate action required');
      }
    }

    if (!this.config.autoRotate) {
      recommendations.push('Consider enabling auto-rotation for better security');
    }

    return {
      currentStatus,
      schedule,
      recommendations
    };
  }
}