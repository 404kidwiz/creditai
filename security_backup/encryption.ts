/**
 * Encryption Utility for Sensitive Data
 * Provides AES-256-GCM encryption for sensitive credit report data
 * with enhanced security features
 */

import crypto from 'crypto'

export interface EncryptionResult {
  encryptedData: string
  iv: string
  authTag: string
  version: string
  timestamp: string
  checksum: string
}

export interface DecryptionOptions {
  encryptedData: string
  iv: string
  authTag: string
  version?: string
  checksum?: string
}

export interface EncryptionOptions {
  additionalData?: string
  userId?: string
  expiresAt?: Date
}

export class DataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32 // 256 bits
  private static readonly IV_LENGTH = 16 // 128 bits
  private static readonly CURRENT_VERSION = 'v2' // Encryption version for future compatibility
  private static readonly KEY_ROTATION_DAYS = 90 // Recommended key rotation period

  /**
   * Get encryption key from environment or generate one
   */
  private static getEncryptionKey(): Buffer {
    const keyString = process.env.ENCRYPTION_KEY
    if (!keyString) {
      throw new Error('ENCRYPTION_KEY environment variable is required')
    }
    
    // If key is base64 encoded
    if (keyString.length === 44 && keyString.endsWith('=')) {
      return Buffer.from(keyString, 'base64')
    }
    
    // If key is hex encoded
    if (keyString.length === 64) {
      return Buffer.from(keyString, 'hex')
    }
    
    // Hash the key to ensure proper length
    return crypto.createHash('sha256').update(keyString).digest()
  }
  
  /**
   * Get secondary encryption key for key rotation
   */
  private static getSecondaryKey(): Buffer | null {
    const secondaryKeyString = process.env.SECONDARY_ENCRYPTION_KEY
    if (!secondaryKeyString) {
      return null
    }
    
    // If key is base64 encoded
    if (secondaryKeyString.length === 44 && secondaryKeyString.endsWith('=')) {
      return Buffer.from(secondaryKeyString, 'base64')
    }
    
    // If key is hex encoded
    if (secondaryKeyString.length === 64) {
      return Buffer.from(secondaryKeyString, 'hex')
    }
    
    // Hash the key to ensure proper length
    return crypto.createHash('sha256').update(secondaryKeyString).digest()
  }

  /**
   * Generate a new encryption key (for setup)
   */
  static generateKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('base64')
  }
  
  /**
   * Check if key rotation is needed
   */
  static isKeyRotationNeeded(): boolean {
    const lastRotation = process.env.LAST_KEY_ROTATION_DATE
      ? new Date(process.env.LAST_KEY_ROTATION_DATE)
      : null
      
    if (!lastRotation) {
      return true
    }
    
    const daysSinceRotation = (Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceRotation >= this.KEY_ROTATION_DAYS
  }

  /**
   * Encrypt sensitive data with enhanced security
   */
  static encrypt(data: string | object, options: EncryptionOptions = {}): EncryptionResult {
    try {
      const key = this.getEncryptionKey()
      const iv = crypto.randomBytes(this.IV_LENGTH)
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)
      
      // Use additional authenticated data if provided
      const aad = options.additionalData 
        ? Buffer.from(options.additionalData)
        : Buffer.from('credit-report-data')
      
      cipher.setAAD(aad)

      const dataString = typeof data === 'string' ? data : JSON.stringify(data)
      
      let encrypted = cipher.update(dataString, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const authTag = cipher.getAuthTag()
      const timestamp = new Date().toISOString()
      
      // Generate checksum for integrity verification
      const checksum = this.generateChecksum(encrypted + iv.toString('hex') + timestamp)

      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        version: this.CURRENT_VERSION,
        timestamp,
        checksum
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt sensitive data')
    }
  }

  /**
   * Decrypt sensitive data with enhanced security
   */
  static decrypt(options: DecryptionOptions): string {
    try {
      // Verify checksum if provided
      if (options.checksum) {
        const calculatedChecksum = this.generateChecksum(
          options.encryptedData + options.iv + (options.version || '')
        )
        
        if (calculatedChecksum !== options.checksum) {
          throw new Error('Data integrity check failed')
        }
      }
      
      // Try primary key first
      try {
        const key = this.getEncryptionKey()
        return this.decryptWithKey(options, key)
      } catch (primaryKeyError) {
        // If primary key fails and we have a secondary key, try that
        const secondaryKey = this.getSecondaryKey()
        if (secondaryKey) {
          try {
            return this.decryptWithKey(options, secondaryKey)
          } catch (secondaryKeyError) {
            // Both keys failed
            throw new Error('Decryption failed with all available keys')
          }
        } else {
          // No secondary key, rethrow original error
          throw primaryKeyError
        }
      }
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt sensitive data')
    }
  }
  
  /**
   * Helper method to decrypt with a specific key
   */
  private static decryptWithKey(options: DecryptionOptions, key: Buffer): string {
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM, 
      key, 
      Buffer.from(options.iv, 'hex')
    )
    
    decipher.setAAD(Buffer.from('credit-report-data'))
    decipher.setAuthTag(Buffer.from(options.authTag, 'hex'))

    let decrypted = decipher.update(options.encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * Encrypt and store credit report data with user-specific isolation
   */
  static encryptCreditReportData(data: any, userId?: string): EncryptionResult {
    // Remove or mask PII before encryption
    const sanitizedData = this.sanitizeForStorage(data)
    
    // Add user-specific isolation if userId is provided
    const options: EncryptionOptions = {}
    if (userId) {
      options.userId = userId
      options.additionalData = `user-${userId}-credit-data`
    }
    
    return this.encrypt(sanitizedData, options)
  }

  /**
   * Sanitize data before storage
   */
  private static sanitizeForStorage(data: any): any {
    const sanitized = JSON.parse(JSON.stringify(data))

    // Remove raw document text (keep only processed data)
    if (sanitized.rawText) {
      delete sanitized.rawText
    }

    // Remove temporary processing data
    if (sanitized.tempFiles) {
      delete sanitized.tempFiles
    }

    // Mask remaining PII
    if (sanitized.personalInfo) {
      if (sanitized.personalInfo.ssn) {
        sanitized.personalInfo.ssn = 'MASKED'
      }
      
      // Additional PII masking
      if (sanitized.personalInfo.dateOfBirth) {
        sanitized.personalInfo.dateOfBirth = 'MASKED'
      }
      
      if (sanitized.personalInfo.driversLicense) {
        sanitized.personalInfo.driversLicense = 'MASKED'
      }
      
      if (sanitized.personalInfo.passportNumber) {
        sanitized.personalInfo.passportNumber = 'MASKED'
      }
    }
    
    // Add security metadata
    sanitized._securityMetadata = {
      sanitizedAt: new Date().toISOString(),
      version: this.CURRENT_VERSION
    }

    return sanitized
  }

  /**
   * Hash sensitive identifiers for indexing with salt
   */
  static hashIdentifier(identifier: string, salt?: string): string {
    const saltToUse = salt || process.env.HASH_SALT || 'default-salt'
    return crypto
      .createHash('sha256')
      .update(identifier + saltToUse)
      .digest('hex')
  }

  /**
   * Generate secure random token with optional expiration
   */
  static generateSecureToken(length: number = 32, expiresInMinutes?: number): { token: string, expires?: Date } {
    const token = crypto.randomBytes(length).toString('hex')
    
    if (expiresInMinutes) {
      const expires = new Date()
      expires.setMinutes(expires.getMinutes() + expiresInMinutes)
      return { token, expires }
    }
    
    return { token }
  }

  /**
   * Generate checksum for data integrity verification
   */
  static generateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * Verify data integrity using checksum
   */
  static verifyChecksum(data: string, expectedChecksum: string): boolean {
    const actualChecksum = this.generateChecksum(data)
    return actualChecksum === expectedChecksum
  }
  
  /**
   * Re-encrypt data with the current key (for key rotation)
   */
  static reEncryptData(encryptedData: EncryptionResult): EncryptionResult {
    try {
      // Decrypt with current keys
      const decrypted = this.decrypt(encryptedData)
      
      // Re-encrypt with current primary key
      return this.encrypt(decrypted)
    } catch (error) {
      console.error('Re-encryption failed:', error)
      throw new Error('Failed to re-encrypt data during key rotation')
    }
  }
  
  /**
   * Securely wipe sensitive data from memory
   * Note: In JavaScript, this is best-effort due to garbage collection
   */
  static secureWipe(data: any): void {
    if (typeof data === 'string') {
      // Overwrite string data (best effort)
      for (let i = 0; i < data.length; i++) {
        data = data.substring(0, i) + '\0' + data.substring(i + 1)
      }
    } else if (Buffer.isBuffer(data)) {
      // Securely wipe buffer
      crypto.randomFillSync(data)
    } else if (typeof data === 'object' && data !== null) {
      // Recursively wipe object properties
      Object.keys(data).forEach(key => {
        this.secureWipe(data[key])
        delete data[key]
      })
    }
  }
}