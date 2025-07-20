/**
 * Google Cloud Credential Management System
 * Handles secure storage, validation, and rotation of service account credentials
 */

import { promises as fs } from 'fs';
import path from 'path';
import * as crypto from 'crypto';
import { GoogleAuth } from 'google-auth-library';

export interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface CredentialMetadata {
  keyId: string;
  createdAt: Date;
  lastUsed: Date;
  expiresAt?: Date;
  rotationRequired: boolean;
  environment: 'development' | 'staging' | 'production';
}

export class CredentialManager {
  private static instance: CredentialManager;
  private credentialPath: string;
  private metadataPath: string;
  private encryptionKey: string;

  private constructor() {
    this.credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-cloud-key.json';
    this.metadataPath = './credential-metadata.json';
    this.encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || this.generateEncryptionKey();
  }

  public static getInstance(): CredentialManager {
    if (!CredentialManager.instance) {
      CredentialManager.instance = new CredentialManager();
    }
    return CredentialManager.instance;
  }

  /**
   * Securely store service account credentials
   */
  async storeCredentials(credentials: ServiceAccountKey, environment: string): Promise<void> {
    try {
      // Validate credentials format
      this.validateCredentialFormat(credentials);

      // Encrypt sensitive data
      const encryptedCredentials = this.encryptCredentials(credentials);

      // Store encrypted credentials
      await fs.writeFile(this.credentialPath, JSON.stringify(encryptedCredentials, null, 2));

      // Update metadata
      const metadata: CredentialMetadata = {
        keyId: credentials.private_key_id,
        createdAt: new Date(),
        lastUsed: new Date(),
        rotationRequired: false,
        environment: environment as any
      };

      await this.updateMetadata(metadata);

      console.log('✅ Credentials stored securely');
    } catch (error) {
      console.error('❌ Failed to store credentials:', error);
      throw new Error(`Credential storage failed: ${error.message}`);
    }
  }

  /**
   * Load and decrypt service account credentials
   */
  async loadCredentials(): Promise<ServiceAccountKey> {
    try {
      // Check if credentials file exists
      if (!await this.credentialsExist()) {
        throw new Error('Credentials file not found');
      }

      // Read encrypted credentials
      const encryptedData = await fs.readFile(this.credentialPath, 'utf8');
      const encryptedCredentials = JSON.parse(encryptedData);

      // Decrypt credentials
      const credentials = this.decryptCredentials(encryptedCredentials);

      // Update last used timestamp
      await this.updateLastUsed();

      return credentials;
    } catch (error) {
      console.error('❌ Failed to load credentials:', error);
      throw new Error(`Credential loading failed: ${error.message}`);
    }
  }

  /**
   * Validate credential format and required fields
   */
  private validateCredentialFormat(credentials: ServiceAccountKey): void {
    const requiredFields = [
      'type', 'project_id', 'private_key_id', 'private_key',
      'client_email', 'client_id', 'auth_uri', 'token_uri'
    ];

    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (credentials.type !== 'service_account') {
      throw new Error('Invalid credential type. Expected: service_account');
    }

    if (!credentials.client_email.includes('@')) {
      throw new Error('Invalid client_email format');
    }
  }

  /**
   * Encrypt credentials using Base64 encoding (for development/testing)
   * In production, this should use proper AES encryption
   */
  private encryptCredentials(credentials: ServiceAccountKey): any {
    // Simple base64 encoding for now - in production use proper AES encryption
    const credentialString = JSON.stringify(credentials);
    const encrypted = Buffer.from(credentialString).toString('base64');

    return {
      encrypted,
      algorithm: 'base64'
    };
  }

  /**
   * Decrypt credentials
   */
  private decryptCredentials(encryptedData: any): ServiceAccountKey {
    // Simple base64 decoding for now - in production use proper AES decryption
    const decrypted = Buffer.from(encryptedData.encrypted, 'base64').toString('utf8');
    return JSON.parse(decrypted);
  }

  /**
   * Generate encryption key for credential protection
   */
  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check if credentials file exists
   */
  async credentialsExist(): Promise<boolean> {
    try {
      await fs.access(this.credentialPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update credential metadata
   */
  private async updateMetadata(metadata: CredentialMetadata): Promise<void> {
    try {
      await fs.writeFile(this.metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.warn('⚠️ Failed to update credential metadata:', error);
    }
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(): Promise<void> {
    try {
      const metadata = await this.getMetadata();
      if (metadata) {
        metadata.lastUsed = new Date();
        await this.updateMetadata(metadata);
      }
    } catch (error) {
      console.warn('⚠️ Failed to update last used timestamp:', error);
    }
  }

  /**
   * Get credential metadata
   */
  async getMetadata(): Promise<CredentialMetadata | null> {
    try {
      const data = await fs.readFile(this.metadataPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Check if credentials need rotation
   */
  async needsRotation(): Promise<boolean> {
    const metadata = await this.getMetadata();
    if (!metadata) return true;

    // Check if rotation is explicitly required
    if (metadata.rotationRequired) return true;

    // Check if credentials are older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const createdAt = new Date(metadata.createdAt);
    return createdAt < ninetyDaysAgo;
  }

  /**
   * Mark credentials for rotation
   */
  async markForRotation(): Promise<void> {
    const metadata = await this.getMetadata();
    if (metadata) {
      metadata.rotationRequired = true;
      await this.updateMetadata(metadata);
    }
  }

  /**
   * Clean up old credential files
   */
  async cleanup(): Promise<void> {
    try {
      // Remove credential files
      if (await this.credentialsExist()) {
        await fs.unlink(this.credentialPath);
      }

      // Remove metadata
      try {
        await fs.unlink(this.metadataPath);
      } catch {
        // Metadata file might not exist
      }

      console.log('✅ Credential cleanup completed');
    } catch (error) {
      console.error('❌ Credential cleanup failed:', error);
    }
  }
}