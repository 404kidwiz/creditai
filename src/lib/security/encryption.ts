/**
 * Simple data encryption utility
 * Simplified implementation for build compatibility
 */

import crypto from 'crypto'

export interface EncryptionResult {
  encryptedData: string
  iv: string
  authTag: string
  algorithm: string
  timestamp: string
}

export interface DecryptionOptions {
  encryptedData: string
  iv: string
  authTag: string
  algorithm?: string
}

export class DataEncryption {
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyLength = 32
  private readonly ivLength = 16

  constructor(private readonly encryptionKey?: string) {
    if (!encryptionKey) {
      console.warn('DataEncryption: No encryption key provided, using default (not secure for production)')
    }
  }

  private getKey(): Buffer {
    const key = this.encryptionKey || process.env.ENCRYPTION_KEY || 'default-key-not-secure'
    return crypto.scryptSync(key, 'salt', this.keyLength)
  }

  encrypt(data: string, userContext?: string): EncryptionResult {
    try {
      const key = this.getKey()
      const iv = crypto.randomBytes(this.ivLength)
      const cipher = crypto.createCipheriv(this.algorithm, key, iv)
      
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      const authTag = cipher.getAuthTag().toString('hex')
      
      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag,
        algorithm: this.algorithm,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  decrypt(options: DecryptionOptions): string {
    try {
      const key = this.getKey()
      const iv = Buffer.from(options.iv, 'hex')
      const authTag = Buffer.from(options.authTag, 'hex')
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv)
      decipher.setAuthTag(authTag)
      
      let decrypted = decipher.update(options.encryptedData, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  isEncrypted(data: string): boolean {
    try {
      return data.includes('encrypted:') || /^[a-f0-9]+$/i.test(data)
    } catch {
      return false
    }
  }

  // Static methods for API compatibility
  static encryptCreditReportData(data: any, userId: string) {
    const encryption = new DataEncryption()
    const result = encryption.encrypt(JSON.stringify(data), userId)
    return {
      encryptedData: result.encryptedData,
      iv: result.iv,
      authTag: result.authTag,
      version: '1.0',
      checksum: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16),
      encryptionMetadata: {
        algorithm: result.algorithm,
        timestamp: result.timestamp,
        userId: crypto.createHash('sha256').update(userId).digest('hex').substring(0, 8)
      }
    }
  }

  static hashIdentifier(identifier: string): string {
    return crypto.createHash('sha256').update(identifier).digest('hex')
  }

  static decrypt(options: DecryptionOptions): string {
    const encryption = new DataEncryption()
    return encryption.decrypt(options)
  }
}

// Export singleton instance
export const dataEncryption = new DataEncryption()

// Export for compatibility
export { DataEncryption as default }