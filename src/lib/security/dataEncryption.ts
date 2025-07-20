/**
 * Advanced Data Encryption and Secure Storage System
 * Provides comprehensive encryption for sensitive data
 */

import crypto from 'crypto';
import { auditLogger, AuditEventType, RiskLevel } from './auditLogger';

/**
 * Encryption algorithms and configurations
 */
export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes-256-gcm',
  AES_256_CBC = 'aes-256-cbc',
  CHACHA20_POLY1305 = 'chacha20-poly1305'
}

/**
 * Key derivation functions
 */
export enum KeyDerivationFunction {
  PBKDF2 = 'pbkdf2',
  SCRYPT = 'scrypt',
  ARGON2 = 'argon2'
}

/**
 * Data classification levels
 */
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret'
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm: EncryptionAlgorithm;
  keyDerivation: KeyDerivationFunction;
  keySize: number;
  ivSize: number;
  tagSize: number;
  saltSize: number;
  iterations: number;
  memoryFactor?: number; // For scrypt
  parallelization?: number; // For scrypt
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  algorithm: EncryptionAlgorithm;
  keyDerivation: KeyDerivationFunction;
  ciphertext: string;
  iv: string;
  tag?: string;
  salt: string;
  iterations: number;
  keyId?: string;
  classification: DataClassification;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Key metadata
 */
export interface KeyMetadata {
  id: string;
  algorithm: EncryptionAlgorithm;
  created: Date;
  lastUsed: Date;
  rotationSchedule: Date;
  classification: DataClassification;
  purpose: string;
  status: 'active' | 'rotating' | 'deprecated' | 'revoked';
}

/**
 * Default encryption configurations by classification level
 */
const ENCRYPTION_CONFIGS: Record<DataClassification, EncryptionConfig> = {
  [DataClassification.PUBLIC]: {
    algorithm: EncryptionAlgorithm.AES_256_CBC,
    keyDerivation: KeyDerivationFunction.PBKDF2,
    keySize: 32,
    ivSize: 16,
    tagSize: 16,
    saltSize: 16,
    iterations: 10000
  },
  [DataClassification.INTERNAL]: {
    algorithm: EncryptionAlgorithm.AES_256_GCM,
    keyDerivation: KeyDerivationFunction.PBKDF2,
    keySize: 32,
    ivSize: 12,
    tagSize: 16,
    saltSize: 16,
    iterations: 50000
  },
  [DataClassification.CONFIDENTIAL]: {
    algorithm: EncryptionAlgorithm.AES_256_GCM,
    keyDerivation: KeyDerivationFunction.SCRYPT,
    keySize: 32,
    ivSize: 12,
    tagSize: 16,
    saltSize: 32,
    iterations: 100000,
    memoryFactor: 8,
    parallelization: 1
  },
  [DataClassification.RESTRICTED]: {
    algorithm: EncryptionAlgorithm.CHACHA20_POLY1305,
    keyDerivation: KeyDerivationFunction.SCRYPT,
    keySize: 32,
    ivSize: 12,
    tagSize: 16,
    saltSize: 32,
    iterations: 200000,
    memoryFactor: 16,
    parallelization: 2
  },
  [DataClassification.TOP_SECRET]: {
    algorithm: EncryptionAlgorithm.CHACHA20_POLY1305,
    keyDerivation: KeyDerivationFunction.SCRYPT,
    keySize: 32,
    ivSize: 12,
    tagSize: 16,
    saltSize: 64,
    iterations: 500000,
    memoryFactor: 32,
    parallelization: 4
  }
};

/**
 * Key rotation schedules by classification (in days)
 */
const KEY_ROTATION_SCHEDULES: Record<DataClassification, number> = {
  [DataClassification.PUBLIC]: 365,
  [DataClassification.INTERNAL]: 180,
  [DataClassification.CONFIDENTIAL]: 90,
  [DataClassification.RESTRICTED]: 30,
  [DataClassification.TOP_SECRET]: 7
};

/**
 * Advanced Encryption Service
 */
export class AdvancedEncryptionService {
  private keys = new Map<string, { key: Buffer; metadata: KeyMetadata }>();
  private masterKey: Buffer;
  private keyRotationTimer?: NodeJS.Timeout;
  
  constructor(masterKeySource?: string) {
    // Initialize master key from environment or generate new one
    this.masterKey = masterKeySource 
      ? crypto.scryptSync(masterKeySource, 'creditai-master-salt', 32)
      : crypto.randomBytes(32);
    
    // Start key rotation scheduler
    this.startKeyRotationScheduler();
  }
  
  /**
   * Encrypt data with specified classification level
   */
  async encryptData(
    data: string | Buffer,
    classification: DataClassification,
    purpose: string = 'general',
    keyId?: string
  ): Promise<EncryptedData> {
    try {
      const config = ENCRYPTION_CONFIGS[classification];
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      
      // Get or create encryption key
      const { key, keyMetadata } = await this.getOrCreateKey(keyId, classification, purpose);
      
      // Generate random IV and salt
      const iv = crypto.randomBytes(config.ivSize);
      const salt = crypto.randomBytes(config.saltSize);
      
      // Derive encryption key
      const derivedKey = await this.deriveKey(key, salt, config);
      
      let ciphertext: Buffer;
      let tag: Buffer | undefined;
      
      // Encrypt based on algorithm
      switch (config.algorithm) {
        case EncryptionAlgorithm.AES_256_GCM:
        case EncryptionAlgorithm.CHACHA20_POLY1305:
          const gcmCipher = crypto.createCipher(config.algorithm, derivedKey);
          gcmCipher.setAAD(Buffer.from(classification + purpose)); // Additional authenticated data
          
          const gcmUpdate = gcmCipher.update(dataBuffer);
          const gcmFinal = gcmCipher.final();
          ciphertext = Buffer.concat([gcmUpdate, gcmFinal]);
          tag = gcmCipher.getAuthTag();
          break;
          
        case EncryptionAlgorithm.AES_256_CBC:
          const cbcCipher = crypto.createCipher(config.algorithm, derivedKey);
          const cbcUpdate = cbcCipher.update(dataBuffer);
          const cbcFinal = cbcCipher.final();
          ciphertext = Buffer.concat([cbcUpdate, cbcFinal]);
          break;
          
        default:
          throw new Error(`Unsupported encryption algorithm: ${config.algorithm}`);
      }
      
      // Update key usage
      keyMetadata.lastUsed = new Date();
      this.keys.set(keyMetadata.id, { key, metadata: keyMetadata });
      
      const encrypted: EncryptedData = {
        algorithm: config.algorithm,
        keyDerivation: config.keyDerivation,
        ciphertext: ciphertext.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag?.toString('base64'),
        salt: salt.toString('base64'),
        iterations: config.iterations,
        keyId: keyMetadata.id,
        classification,
        timestamp: new Date().toISOString(),
        metadata: {
          purpose,
          dataSize: dataBuffer.length
        }
      };
      
      // Audit encryption
      auditLogger.logEvent(
        AuditEventType.DATA_ENCRYPTED,
        {},
        {
          keyId: keyMetadata.id,
          algorithm: config.algorithm,
          classification,
          purpose,
          dataSize: dataBuffer.length
        },
        this.getAuditRiskLevel(classification)
      );
      
      return encrypted;
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {},
        {
          action: 'encrypt_data',
          classification,
          purpose,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt data
   */
  async decryptData(
    encryptedData: EncryptedData,
    requestingUserId?: string
  ): Promise<Buffer> {
    try {
      // Get decryption key
      const keyData = this.keys.get(encryptedData.keyId || '');
      if (!keyData) {
        throw new Error('Decryption key not found');
      }
      
      const { key, metadata } = keyData;
      const config = ENCRYPTION_CONFIGS[encryptedData.classification];
      
      // Check if key is still valid
      if (metadata.status === 'revoked') {
        throw new Error('Decryption key has been revoked');
      }
      
      // Derive decryption key
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const derivedKey = await this.deriveKey(key, salt, {
        ...config,
        keyDerivation: encryptedData.keyDerivation,
        iterations: encryptedData.iterations
      });
      
      // Decrypt based on algorithm
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
      
      let plaintext: Buffer;
      
      switch (encryptedData.algorithm) {
        case EncryptionAlgorithm.AES_256_GCM:
        case EncryptionAlgorithm.CHACHA20_POLY1305:
          const gcmDecipher = crypto.createDecipher(encryptedData.algorithm, derivedKey);
          
          if (encryptedData.tag) {
            const tag = Buffer.from(encryptedData.tag, 'base64');
            gcmDecipher.setAuthTag(tag);
          }
          
          gcmDecipher.setAAD(Buffer.from(encryptedData.classification + (encryptedData.metadata?.purpose || 'general')));
          
          const gcmUpdate = gcmDecipher.update(ciphertext);
          const gcmFinal = gcmDecipher.final();
          plaintext = Buffer.concat([gcmUpdate, gcmFinal]);
          break;
          
        case EncryptionAlgorithm.AES_256_CBC:
          const cbcDecipher = crypto.createDecipher(encryptedData.algorithm, derivedKey);
          const cbcUpdate = cbcDecipher.update(ciphertext);
          const cbcFinal = cbcDecipher.final();
          plaintext = Buffer.concat([cbcUpdate, cbcFinal]);
          break;
          
        default:
          throw new Error(`Unsupported decryption algorithm: ${encryptedData.algorithm}`);
      }
      
      // Update key usage
      metadata.lastUsed = new Date();
      this.keys.set(metadata.id, { key, metadata });
      
      // Audit decryption
      auditLogger.logEvent(
        AuditEventType.DATA_DECRYPTION_REQUESTED,
        { userId: requestingUserId },
        {
          keyId: metadata.id,
          algorithm: encryptedData.algorithm,
          classification: encryptedData.classification,
          purpose: encryptedData.metadata?.purpose,
          dataSize: plaintext.length
        },
        this.getAuditRiskLevel(encryptedData.classification)
      );
      
      return plaintext;
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        { userId: requestingUserId },
        {
          action: 'decrypt_data',
          classification: encryptedData.classification,
          keyId: encryptedData.keyId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Encrypt file with progress tracking
   */
  async encryptFile(
    filePath: string,
    outputPath: string,
    classification: DataClassification,
    chunkSize: number = 64 * 1024, // 64KB chunks
    progressCallback?: (progress: number) => void
  ): Promise<EncryptedData> {
    const fs = await import('fs');
    const path = await import('path');
    
    try {
      const stats = await fs.promises.stat(filePath);
      const totalSize = stats.size;
      let processedSize = 0;
      
      const config = ENCRYPTION_CONFIGS[classification];
      const { key, keyMetadata } = await this.getOrCreateKey(undefined, classification, 'file');
      
      // Generate IV and salt
      const iv = crypto.randomBytes(config.ivSize);
      const salt = crypto.randomBytes(config.saltSize);
      const derivedKey = await this.deriveKey(key, salt, config);
      
      // Create cipher
      const cipher = crypto.createCipher(config.algorithm, derivedKey);
      if (config.algorithm === EncryptionAlgorithm.AES_256_GCM || config.algorithm === EncryptionAlgorithm.CHACHA20_POLY1305) {
        cipher.setAAD(Buffer.from(classification + 'file'));
      }
      
      // Create streams
      const readStream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
      const writeStream = fs.createWriteStream(outputPath);
      
      // Write header with encryption metadata
      const header = JSON.stringify({
        algorithm: config.algorithm,
        keyDerivation: config.keyDerivation,
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        iterations: config.iterations,
        keyId: keyMetadata.id,
        classification,
        originalSize: totalSize
      });
      
      const headerBuffer = Buffer.from(header, 'utf8');
      const headerLength = Buffer.alloc(4);
      headerLength.writeUInt32BE(headerBuffer.length, 0);
      
      writeStream.write(headerLength);
      writeStream.write(headerBuffer);
      
      return new Promise((resolve, reject) => {
        readStream.on('data', (chunk: Buffer) => {
          const encryptedChunk = cipher.update(chunk);
          writeStream.write(encryptedChunk);
          
          processedSize += chunk.length;
          const progress = (processedSize / totalSize) * 100;
          progressCallback?.(progress);
        });
        
        readStream.on('end', () => {
          const final = cipher.final();
          writeStream.write(final);
          
          // Write authentication tag for GCM/ChaCha20
          if (config.algorithm === EncryptionAlgorithm.AES_256_GCM || config.algorithm === EncryptionAlgorithm.CHACHA20_POLY1305) {
            const tag = cipher.getAuthTag();
            writeStream.write(tag);
          }
          
          writeStream.end();
          
          const encryptedData: EncryptedData = {
            algorithm: config.algorithm,
            keyDerivation: config.keyDerivation,
            ciphertext: outputPath,
            iv: iv.toString('base64'),
            salt: salt.toString('base64'),
            iterations: config.iterations,
            keyId: keyMetadata.id,
            classification,
            timestamp: new Date().toISOString(),
            metadata: {
              purpose: 'file',
              originalPath: filePath,
              originalSize: totalSize,
              encryptedPath: outputPath
            }
          };
          
          // Audit file encryption
          auditLogger.logEvent(
            AuditEventType.DATA_ENCRYPTED,
            {},
            {
              keyId: keyMetadata.id,
              algorithm: config.algorithm,
              classification,
              purpose: 'file',
              originalPath: filePath,
              encryptedPath: outputPath,
              fileSize: totalSize
            },
            this.getAuditRiskLevel(classification)
          );
          
          resolve(encryptedData);
        });
        
        readStream.on('error', reject);
        writeStream.on('error', reject);
      });
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {},
        {
          action: 'encrypt_file',
          filePath,
          classification,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      throw new Error('Failed to encrypt file');
    }
  }
  
  /**
   * Rotate encryption keys
   */
  async rotateKey(keyId: string, newClassification?: DataClassification): Promise<{ success: boolean; newKeyId?: string; error?: string }> {
    try {
      const keyData = this.keys.get(keyId);
      if (!keyData) {
        return { success: false, error: 'Key not found' };
      }
      
      const { metadata } = keyData;
      const classification = newClassification || metadata.classification;
      
      // Create new key
      const { key: newKey, keyMetadata: newMetadata } = await this.getOrCreateKey(
        undefined,
        classification,
        metadata.purpose
      );
      
      // Mark old key as deprecated
      metadata.status = 'deprecated';
      this.keys.set(keyId, { key: keyData.key, metadata });
      
      // Schedule old key deletion (after grace period)
      setTimeout(() => {
        metadata.status = 'revoked';
        this.keys.set(keyId, { key: keyData.key, metadata });
      }, 30 * 24 * 60 * 60 * 1000); // 30 days
      
      auditLogger.logEvent(
        AuditEventType.ENCRYPTION_KEY_ROTATED,
        {},
        {
          oldKeyId: keyId,
          newKeyId: newMetadata.id,
          classification,
          purpose: metadata.purpose
        },
        RiskLevel.MEDIUM
      );
      
      return {
        success: true,
        newKeyId: newMetadata.id
      };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {},
        {
          action: 'rotate_key',
          keyId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: 'Failed to rotate key'
      };
    }
  }
  
  /**
   * Get key information
   */
  getKeyInfo(keyId: string): KeyMetadata | null {
    const keyData = this.keys.get(keyId);
    return keyData?.metadata || null;
  }
  
  /**
   * List all keys
   */
  listKeys(classification?: DataClassification): KeyMetadata[] {
    const keys = Array.from(this.keys.values())
      .map(data => data.metadata)
      .filter(metadata => !classification || metadata.classification === classification)
      .sort((a, b) => b.created.getTime() - a.created.getTime());
    
    return keys;
  }
  
  /**
   * Private helper methods
   */
  private async getOrCreateKey(
    keyId: string | undefined,
    classification: DataClassification,
    purpose: string
  ): Promise<{ key: Buffer; keyMetadata: KeyMetadata }> {
    if (keyId) {
      const existing = this.keys.get(keyId);
      if (existing) {
        return existing;
      }
    }
    
    // Create new key
    const key = crypto.randomBytes(32);
    const id = crypto.randomUUID();
    const now = new Date();
    const rotationDays = KEY_ROTATION_SCHEDULES[classification];
    
    const metadata: KeyMetadata = {
      id,
      algorithm: ENCRYPTION_CONFIGS[classification].algorithm,
      created: now,
      lastUsed: now,
      rotationSchedule: new Date(now.getTime() + rotationDays * 24 * 60 * 60 * 1000),
      classification,
      purpose,
      status: 'active'
    };
    
    this.keys.set(id, { key, metadata });
    
    return { key, keyMetadata: metadata };
  }
  
  private async deriveKey(key: Buffer, salt: Buffer, config: EncryptionConfig): Promise<Buffer> {
    switch (config.keyDerivation) {
      case KeyDerivationFunction.PBKDF2:
        return crypto.pbkdf2Sync(key, salt, config.iterations, config.keySize, 'sha256');
        
      case KeyDerivationFunction.SCRYPT:
        return crypto.scryptSync(key, salt, config.keySize, {
          N: config.iterations,
          r: config.memoryFactor || 8,
          p: config.parallelization || 1
        });
        
      default:
        throw new Error(`Unsupported key derivation function: ${config.keyDerivation}`);
    }
  }
  
  private getAuditRiskLevel(classification: DataClassification): RiskLevel {
    switch (classification) {
      case DataClassification.PUBLIC:
      case DataClassification.INTERNAL:
        return RiskLevel.LOW;
      case DataClassification.CONFIDENTIAL:
        return RiskLevel.MEDIUM;
      case DataClassification.RESTRICTED:
        return RiskLevel.HIGH;
      case DataClassification.TOP_SECRET:
        return RiskLevel.CRITICAL;
    }
  }
  
  private startKeyRotationScheduler(): void {
    this.keyRotationTimer = setInterval(() => {
      const now = new Date();
      
      for (const [keyId, keyData] of this.keys.entries()) {
        const { metadata } = keyData;
        
        if (metadata.status === 'active' && metadata.rotationSchedule <= now) {
          this.rotateKey(keyId).catch(error => {
            auditLogger.logEvent(
              AuditEventType.SYSTEM_ERROR,
              {},
              {
                action: 'automatic_key_rotation',
                keyId,
                error: error instanceof Error ? error.message : 'Unknown error'
              },
              RiskLevel.HIGH
            );
          });
        }
      }
    }, 60 * 60 * 1000); // Check every hour
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    if (this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer);
    }
    
    // Clear sensitive data
    this.keys.clear();
    this.masterKey.fill(0);
  }
}

/**
 * Field-level encryption for database storage
 */
export class FieldEncryption {
  private encryptionService: AdvancedEncryptionService;
  
  constructor(encryptionService: AdvancedEncryptionService) {
    this.encryptionService = encryptionService;
  }
  
  /**
   * Encrypt sensitive fields in an object
   */
  async encryptFields(
    data: Record<string, any>,
    fieldMappings: Record<string, DataClassification>
  ): Promise<Record<string, any>> {
    const encrypted = { ...data };
    
    for (const [field, classification] of Object.entries(fieldMappings)) {
      if (data[field] !== undefined && data[field] !== null) {
        const encryptedData = await this.encryptionService.encryptData(
          JSON.stringify(data[field]),
          classification,
          `field_${field}`
        );
        
        encrypted[field] = encryptedData;
      }
    }
    
    return encrypted;
  }
  
  /**
   * Decrypt sensitive fields in an object
   */
  async decryptFields(
    data: Record<string, any>,
    fieldMappings: Record<string, DataClassification>,
    requestingUserId?: string
  ): Promise<Record<string, any>> {
    const decrypted = { ...data };
    
    for (const field of Object.keys(fieldMappings)) {
      if (data[field] && typeof data[field] === 'object' && data[field].ciphertext) {
        try {
          const decryptedBuffer = await this.encryptionService.decryptData(
            data[field] as EncryptedData,
            requestingUserId
          );
          
          decrypted[field] = JSON.parse(decryptedBuffer.toString('utf8'));
        } catch (error) {
          // Log error but don't fail the entire operation
          auditLogger.logEvent(
            AuditEventType.SYSTEM_ERROR,
            { userId: requestingUserId },
            {
              action: 'decrypt_field',
              field,
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            RiskLevel.HIGH
          );
          
          decrypted[field] = null; // Field couldn't be decrypted
        }
      }
    }
    
    return decrypted;
  }
}

// Export singleton instance
export const encryptionService = new AdvancedEncryptionService(
  process.env.ENCRYPTION_MASTER_KEY
);

export const fieldEncryption = new FieldEncryption(encryptionService);
