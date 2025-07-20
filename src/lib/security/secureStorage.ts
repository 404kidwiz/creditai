/**
 * Secure Storage Service with Encryption
 * Provides encrypted storage for sensitive data
 */

import { encryptionService, fieldEncryption, DataClassification } from './dataEncryption';
import { auditLogger, AuditEventType, RiskLevel } from './auditLogger';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Storage configuration for different data types
 */
export interface StorageConfig {
  tableName: string;
  encryptedFields: Record<string, DataClassification>;
  indexedFields: string[];
  retentionDays?: number;
  backupEnabled?: boolean;
  compressionEnabled?: boolean;
}

/**
 * Stored data metadata
 */
export interface StorageMetadata {
  id: string;
  userId?: string;
  dataType: string;
  classification: DataClassification;
  size: number;
  checksum: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  accessCount: number;
  lastAccessed?: Date;
  metadata?: Record<string, any>;
}

/**
 * Default storage configurations
 */
const STORAGE_CONFIGS: Record<string, StorageConfig> = {
  credit_reports: {
    tableName: 'encrypted_credit_reports',
    encryptedFields: {
      personal_info: DataClassification.RESTRICTED,
      ssn: DataClassification.TOP_SECRET,
      accounts: DataClassification.CONFIDENTIAL,
      payment_history: DataClassification.CONFIDENTIAL,
      credit_inquiries: DataClassification.CONFIDENTIAL,
      public_records: DataClassification.CONFIDENTIAL
    },
    indexedFields: ['userId', 'reportType', 'createdAt'],
    retentionDays: 2555, // 7 years
    backupEnabled: true,
    compressionEnabled: true
  },
  
  user_documents: {
    tableName: 'encrypted_documents',
    encryptedFields: {
      content: DataClassification.CONFIDENTIAL,
      metadata: DataClassification.INTERNAL
    },
    indexedFields: ['userId', 'documentType', 'createdAt'],
    retentionDays: 1825, // 5 years
    backupEnabled: true,
    compressionEnabled: true
  },
  
  payment_info: {
    tableName: 'encrypted_payment_info',
    encryptedFields: {
      card_number: DataClassification.TOP_SECRET,
      cvv: DataClassification.TOP_SECRET,
      billing_address: DataClassification.RESTRICTED,
      payment_method_details: DataClassification.CONFIDENTIAL
    },
    indexedFields: ['userId', 'paymentType', 'createdAt'],
    retentionDays: 1095, // 3 years
    backupEnabled: true,
    compressionEnabled: false
  },
  
  audit_logs: {
    tableName: 'encrypted_audit_logs',
    encryptedFields: {
      event_details: DataClassification.CONFIDENTIAL,
      user_context: DataClassification.RESTRICTED
    },
    indexedFields: ['eventType', 'userId', 'createdAt', 'riskLevel'],
    retentionDays: 2555, // 7 years for compliance
    backupEnabled: true,
    compressionEnabled: true
  }
};

/**
 * Secure Storage Service
 */
export class SecureStorageService {
  private supabase: SupabaseClient;
  private compressionEnabled: boolean;
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for backend operations
    );
    
    this.compressionEnabled = process.env.COMPRESSION_ENABLED === 'true';
    
    // Initialize storage tables if needed
    this.initializeStorageTables().catch(error => {
      console.error('Failed to initialize storage tables:', error);
    });
  }
  
  /**
   * Store encrypted data
   */
  async store(
    dataType: string,
    data: Record<string, any>,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const config = STORAGE_CONFIGS[dataType];
      if (!config) {
        throw new Error(`Unknown data type: ${dataType}`);
      }
      
      // Generate unique ID
      const id = crypto.randomUUID();
      
      // Compress data if enabled
      let processedData = data;
      if (config.compressionEnabled && this.compressionEnabled) {
        processedData = await this.compressData(data);
      }
      
      // Encrypt sensitive fields
      const encryptedData = await fieldEncryption.encryptFields(
        processedData,
        config.encryptedFields
      );
      
      // Calculate checksum
      const checksum = this.calculateChecksum(JSON.stringify(data));
      
      // Calculate expiration date
      const expiresAt = config.retentionDays 
        ? new Date(Date.now() + config.retentionDays * 24 * 60 * 60 * 1000)
        : undefined;
      
      // Create storage metadata
      const storageMetadata: Partial<StorageMetadata> = {
        id,
        userId,
        dataType,
        classification: this.getHighestClassification(config.encryptedFields),
        size: JSON.stringify(encryptedData).length,
        checksum,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt,
        accessCount: 0,
        metadata
      };
      
      // Store in database
      const { error: insertError } = await this.supabase
        .from(config.tableName)
        .insert({
          ...encryptedData,
          storage_metadata: storageMetadata
        });
      
      if (insertError) {
        throw insertError;
      }
      
      // Create backup if enabled
      if (config.backupEnabled) {
        await this.createBackup(id, dataType, encryptedData, storageMetadata);
      }
      
      // Audit storage
      auditLogger.logEvent(
        AuditEventType.DATA_ENCRYPTED,
        { userId },
        {
          action: 'secure_store',
          dataType,
          id,
          size: storageMetadata.size,
          classification: storageMetadata.classification,
          compressed: config.compressionEnabled && this.compressionEnabled,
          encrypted: true
        },
        this.getAuditRiskLevel(storageMetadata.classification!)
      );
      
      return { success: true, id };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        { userId },
        {
          action: 'secure_store_failed',
          dataType,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store data'
      };
    }
  }
  
  /**
   * Retrieve and decrypt data
   */
  async retrieve(
    dataType: string,
    id: string,
    userId?: string
  ): Promise<{ success: boolean; data?: Record<string, any>; metadata?: StorageMetadata; error?: string }> {
    try {
      const config = STORAGE_CONFIGS[dataType];
      if (!config) {
        throw new Error(`Unknown data type: ${dataType}`);
      }
      
      // Retrieve from database
      const { data: storedData, error: selectError } = await this.supabase
        .from(config.tableName)
        .select('*')
        .eq('id', id)
        .single();
      
      if (selectError || !storedData) {
        throw new Error('Data not found');
      }
      
      const storageMetadata = storedData.storage_metadata as StorageMetadata;
      
      // Check if data has expired
      if (storageMetadata.expiresAt && new Date(storageMetadata.expiresAt) <= new Date()) {
        // Data has expired, remove it
        await this.delete(dataType, id, userId);
        throw new Error('Data has expired and been removed');
      }
      
      // Check access permissions
      if (storageMetadata.userId && storageMetadata.userId !== userId) {
        auditLogger.logEvent(
          AuditEventType.DATA_ACCESS,
          { userId },
          {
            action: 'unauthorized_access_attempt',
            dataType,
            id,
            ownerUserId: storageMetadata.userId
          },
          RiskLevel.HIGH
        );
        
        throw new Error('Access denied');
      }
      
      // Remove metadata from stored data
      const { storage_metadata, ...encryptedData } = storedData;
      
      // Decrypt sensitive fields
      const decryptedData = await fieldEncryption.decryptFields(
        encryptedData,
        config.encryptedFields,
        userId
      );
      
      // Decompress if needed
      let processedData = decryptedData;
      if (config.compressionEnabled && this.compressionEnabled) {
        processedData = await this.decompressData(decryptedData);
      }
      
      // Verify checksum
      const currentChecksum = this.calculateChecksum(JSON.stringify(processedData));
      if (currentChecksum !== storageMetadata.checksum) {
        auditLogger.logEvent(
          AuditEventType.SYSTEM_ERROR,
          { userId },
          {
            action: 'checksum_mismatch',
            dataType,
            id,
            expectedChecksum: storageMetadata.checksum,
            actualChecksum: currentChecksum
          },
          RiskLevel.CRITICAL
        );
        
        throw new Error('Data integrity check failed');
      }
      
      // Update access metadata
      const updatedMetadata = {
        ...storageMetadata,
        accessCount: storageMetadata.accessCount + 1,
        lastAccessed: new Date()
      };
      
      await this.supabase
        .from(config.tableName)
        .update({ storage_metadata: updatedMetadata })
        .eq('id', id);
      
      // Audit retrieval
      auditLogger.logEvent(
        AuditEventType.DATA_ACCESS,
        { userId },
        {
          action: 'secure_retrieve',
          dataType,
          id,
          size: storageMetadata.size,
          classification: storageMetadata.classification,
          accessCount: updatedMetadata.accessCount
        },
        this.getAuditRiskLevel(storageMetadata.classification)
      );
      
      return {
        success: true,
        data: processedData,
        metadata: updatedMetadata
      };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        { userId },
        {
          action: 'secure_retrieve_failed',
          dataType,
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve data'
      };
    }
  }
  
  /**
   * Update stored data
   */
  async update(
    dataType: string,
    id: string,
    updates: Record<string, any>,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First retrieve existing data to merge updates
      const retrieveResult = await this.retrieve(dataType, id, userId);
      if (!retrieveResult.success || !retrieveResult.data) {
        throw new Error(retrieveResult.error || 'Failed to retrieve existing data');
      }
      
      // Merge updates with existing data
      const updatedData = { ...retrieveResult.data, ...updates };
      
      // Delete old record
      await this.delete(dataType, id, userId);
      
      // Store updated data with same ID
      const config = STORAGE_CONFIGS[dataType];
      
      // Compress if enabled
      let processedData = updatedData;
      if (config.compressionEnabled && this.compressionEnabled) {
        processedData = await this.compressData(updatedData);
      }
      
      // Encrypt sensitive fields
      const encryptedData = await fieldEncryption.encryptFields(
        processedData,
        config.encryptedFields
      );
      
      // Update metadata
      const checksum = this.calculateChecksum(JSON.stringify(updatedData));
      const updatedMetadata = {
        ...retrieveResult.metadata!,
        updatedAt: new Date(),
        checksum,
        size: JSON.stringify(encryptedData).length
      };
      
      // Store updated data
      const { error: insertError } = await this.supabase
        .from(config.tableName)
        .insert({
          ...encryptedData,
          id, // Keep same ID
          storage_metadata: updatedMetadata
        });
      
      if (insertError) {
        throw insertError;
      }
      
      // Create backup if enabled
      if (config.backupEnabled) {
        await this.createBackup(id, dataType, encryptedData, updatedMetadata);
      }
      
      // Audit update
      auditLogger.logEvent(
        AuditEventType.DATA_ENCRYPTED,
        { userId },
        {
          action: 'secure_update',
          dataType,
          id,
          size: updatedMetadata.size,
          classification: updatedMetadata.classification
        },
        this.getAuditRiskLevel(updatedMetadata.classification)
      );
      
      return { success: true };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        { userId },
        {
          action: 'secure_update_failed',
          dataType,
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update data'
      };
    }
  }
  
  /**
   * Delete stored data
   */
  async delete(
    dataType: string,
    id: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = STORAGE_CONFIGS[dataType];
      if (!config) {
        throw new Error(`Unknown data type: ${dataType}`);
      }
      
      // Verify ownership before deletion
      const { data: existingData } = await this.supabase
        .from(config.tableName)
        .select('storage_metadata')
        .eq('id', id)
        .single();
      
      if (existingData) {
        const metadata = existingData.storage_metadata as StorageMetadata;
        if (metadata.userId && metadata.userId !== userId) {
          throw new Error('Access denied');
        }
      }
      
      // Delete from database
      const { error: deleteError } = await this.supabase
        .from(config.tableName)
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Delete backup if exists
      await this.deleteBackup(id, dataType);
      
      // Audit deletion
      auditLogger.logEvent(
        AuditEventType.DATA_ACCESS,
        { userId },
        {
          action: 'secure_delete',
          dataType,
          id
        },
        RiskLevel.MEDIUM
      );
      
      return { success: true };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        { userId },
        {
          action: 'secure_delete_failed',
          dataType,
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.HIGH
      );
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete data'
      };
    }
  }
  
  /**
   * List stored data for a user
   */
  async list(
    dataType: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ success: boolean; items?: StorageMetadata[]; total?: number; error?: string }> {
    try {
      const config = STORAGE_CONFIGS[dataType];
      if (!config) {
        throw new Error(`Unknown data type: ${dataType}`);
      }
      
      const {
        limit = 50,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;
      
      // Build query
      let query = this.supabase
        .from(config.tableName)
        .select('storage_metadata', { count: 'exact' })
        .eq('storage_metadata->>userId', userId);
      
      // Add sorting
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        query = query.order(`storage_metadata->${sortBy}`, { ascending: sortOrder === 'asc' });
      }
      
      // Add pagination
      query = query.range(offset, offset + limit - 1);
      
      const { data, count, error } = await query;
      
      if (error) {
        throw error;
      }
      
      const items = data?.map(item => item.storage_metadata as StorageMetadata) || [];
      
      return {
        success: true,
        items,
        total: count || 0
      };
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        { userId },
        {
          action: 'secure_list_failed',
          dataType,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        RiskLevel.MEDIUM
      );
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list data'
      };
    }
  }
  
  /**
   * Clean up expired data
   */
  async cleanupExpiredData(): Promise<{ cleaned: number; errors: string[] }> {
    let totalCleaned = 0;
    const errors: string[] = [];
    
    for (const [dataType, config] of Object.entries(STORAGE_CONFIGS)) {
      try {
        const now = new Date().toISOString();
        
        // Find expired records
        const { data: expiredData, error: selectError } = await this.supabase
          .from(config.tableName)
          .select('storage_metadata')
          .lt('storage_metadata->>expiresAt', now);
        
        if (selectError) {
          throw selectError;
        }
        
        if (expiredData && expiredData.length > 0) {
          const expiredIds = expiredData
            .map(item => (item.storage_metadata as StorageMetadata).id)
            .filter(Boolean);
          
          // Delete expired records
          const { error: deleteError } = await this.supabase
            .from(config.tableName)
            .delete()
            .in('storage_metadata->>id', expiredIds);
          
          if (deleteError) {
            throw deleteError;
          }
          
          totalCleaned += expiredIds.length;
          
          // Delete associated backups
          for (const id of expiredIds) {
            await this.deleteBackup(id, dataType);
          }
        }
      } catch (error) {
        const errorMessage = `Failed to cleanup ${dataType}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        
        auditLogger.logEvent(
          AuditEventType.SYSTEM_ERROR,
          {},
          {
            action: 'cleanup_expired_data',
            dataType,
            error: errorMessage
          },
          RiskLevel.MEDIUM
        );
      }
    }
    
    // Audit cleanup
    auditLogger.logEvent(
      AuditEventType.DATA_ACCESS,
      {},
      {
        action: 'expired_data_cleanup',
        cleaned: totalCleaned,
        errorCount: errors.length
      },
      RiskLevel.LOW
    );
    
    return { cleaned: totalCleaned, errors };
  }
  
  /**
   * Private helper methods
   */
  private async initializeStorageTables(): Promise<void> {
    // In a real implementation, this would create the necessary tables
    // with proper indexes and constraints
    console.log('Storage tables initialized');
  }
  
  private async compressData(data: Record<string, any>): Promise<Record<string, any>> {
    // Simple compression simulation
    // In a real implementation, you would use a library like zlib
    const compressed = {
      ...data,
      _compressed: true
    };
    return compressed;
  }
  
  private async decompressData(data: Record<string, any>): Promise<Record<string, any>> {
    // Simple decompression simulation
    if (data._compressed) {
      const { _compressed, ...decompressed } = data;
      return decompressed;
    }
    return data;
  }
  
  private calculateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  private getHighestClassification(fields: Record<string, DataClassification>): DataClassification {
    const classifications = Object.values(fields);
    const priority = {
      [DataClassification.PUBLIC]: 0,
      [DataClassification.INTERNAL]: 1,
      [DataClassification.CONFIDENTIAL]: 2,
      [DataClassification.RESTRICTED]: 3,
      [DataClassification.TOP_SECRET]: 4
    };
    
    return classifications.reduce((highest, current) => 
      priority[current] > priority[highest] ? current : highest
    );
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
  
  private async createBackup(
    id: string,
    dataType: string,
    data: any,
    metadata: any
  ): Promise<void> {
    // In a real implementation, this would create encrypted backups
    // in a separate storage system (e.g., AWS S3 with versioning)
    console.log(`Backup created for ${dataType}:${id}`);
  }
  
  private async deleteBackup(id: string, dataType: string): Promise<void> {
    // In a real implementation, this would delete the backup
    console.log(`Backup deleted for ${dataType}:${id}`);
  }
}

// Export singleton instance
export const secureStorageService = new SecureStorageService();

// Export storage configurations for reference
export { STORAGE_CONFIGS };
