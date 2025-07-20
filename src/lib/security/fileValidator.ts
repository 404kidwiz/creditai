/**
 * Comprehensive File Validation
 * Validates file types, sizes, content signatures, and scans for malware
 */

import { auditLogger, AuditEventType, RiskLevel } from './auditLogger';
import { sanitizeErrorMessage } from './piiAuditIntegration';

/**
 * File validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    fileType: string;
    fileSize: number;
    detectedType?: string;
    signatureValid?: boolean;
    malwareScanResult?: string;
    contentValidation?: string;
  };
}

/**
 * File validation options
 */
export interface FileValidationOptions {
  allowedTypes?: string[];
  maxFileSize?: number;
  validateSignature?: boolean;
  scanForMalware?: boolean;
  validateContent?: boolean;
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: FileValidationOptions = {
  allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  validateSignature: true,
  scanForMalware: true,
  validateContent: true,
};

/**
 * File signature patterns for common file types
 */
const FILE_SIGNATURES: Record<string, Uint8Array[]> = {
  'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])], // %PDF
  'image/jpeg': [new Uint8Array([0xFF, 0xD8, 0xFF])], // JPEG SOI marker
  'image/png': [new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])], // PNG signature
};

/**
 * Comprehensive file validator
 */
export class FileValidator {
  /**
   * Validate a file with comprehensive checks
   */
  static async validateFile(
    file: File,
    options: FileValidationOptions = {}
  ): Promise<ValidationResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const metadata = {
      fileType: file.type,
      fileSize: file.size,
    };
    
    // Validate file type
    if (opts.allowedTypes && opts.allowedTypes.length > 0) {
      if (!opts.allowedTypes.includes(file.type)) {
        errors.push(`File type ${file.type} is not allowed. Allowed types: ${opts.allowedTypes.join(', ')}`);
      }
    }
    
    // Validate file size
    if (opts.maxFileSize && file.size > opts.maxFileSize) {
      errors.push(`File size ${file.size} bytes exceeds maximum allowed size of ${opts.maxFileSize} bytes`);
    }
    
    // Validate file signature
    if (opts.validateSignature) {
      try {
        const signatureValid = await this.validateFileSignature(file);
        metadata.signatureValid = signatureValid;
        
        if (!signatureValid) {
          errors.push('File signature validation failed. The file may be corrupted or its type does not match its content.');
        }
      } catch (error) {
        warnings.push(`Failed to validate file signature: ${sanitizeErrorMessage(String(error))}`);
      }
    }
    
    // Scan for malware
    if (opts.scanForMalware) {
      try {
        const scanResult = await this.scanForMalware(file);
        metadata.malwareScanResult = scanResult.status;
        
        if (scanResult.status === 'infected') {
          errors.push(`Malware detected: ${scanResult.details}`);
        }
      } catch (error) {
        warnings.push(`Failed to scan for malware: ${sanitizeErrorMessage(String(error))}`);
      }
    }
    
    // Validate content
    if (opts.validateContent) {
      try {
        const contentValidation = await this.validateFileContent(file);
        metadata.contentValidation = contentValidation.status;
        
        if (contentValidation.status === 'invalid') {
          errors.push(`Content validation failed: ${contentValidation.details}`);
        }
      } catch (error) {
        warnings.push(`Failed to validate file content: ${sanitizeErrorMessage(String(error))}`);
      }
    }
    
    // Log validation results
    this.logValidationResult(file, errors, warnings);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: metadata as any,
    };
  }
  
  /**
   * Validate file signature to ensure file type matches content
   */
  private static async validateFileSignature(file: File): Promise<boolean> {
    // Get expected signatures for the file type
    const expectedSignatures = FILE_SIGNATURES[file.type];
    
    if (!expectedSignatures) {
      // If we don't have signature data for this file type, consider it valid
      return true;
    }
    
    // Read the first 50 bytes of the file
    const buffer = await file.slice(0, 50).arrayBuffer();
    const fileHeader = new Uint8Array(buffer);
    
    // Check if the file header matches any of the expected signatures
    return expectedSignatures.some(signature => {
      // Check if the file header starts with the signature
      if (fileHeader.length < signature.length) {
        return false;
      }
      
      for (let i = 0; i < signature.length; i++) {
        if (fileHeader[i] !== signature[i]) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Scan file for malware
   * In a production environment, this would integrate with a real malware scanning service
   */
  private static async scanForMalware(file: File): Promise<{ status: 'clean' | 'infected' | 'unknown', details: string }> {
    // This is a placeholder implementation
    // In a real implementation, this would call an actual malware scanning service
    
    // Check for common malware patterns in the filename
    const suspiciousExtensions = ['.exe', '.dll', '.bat', '.cmd', '.js', '.vbs', '.ps1'];
    const hasExecutableExtension = suspiciousExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (hasExecutableExtension) {
      return {
        status: 'infected',
        details: 'File has a potentially dangerous extension'
      };
    }
    
    // For demonstration purposes, we'll consider all other files clean
    return {
      status: 'clean',
      details: 'No threats detected'
    };
  }
  
  /**
   * Validate file content
   * In a production environment, this would perform more comprehensive validation
   */
  private static async validateFileContent(file: File): Promise<{ status: 'valid' | 'invalid', details: string }> {
    // This is a placeholder implementation
    // In a real implementation, this would perform more comprehensive validation
    
    // For PDFs, we might check for proper PDF structure
    if (file.type === 'application/pdf') {
      // Read the first 1024 bytes to check for PDF header and footer markers
      const buffer = await file.slice(0, 1024).arrayBuffer();
      const content = new Uint8Array(buffer);
      const contentStr = new TextDecoder().decode(content);
      
      if (!contentStr.includes('%PDF-')) {
        return {
          status: 'invalid',
          details: 'Missing PDF header'
        };
      }
    }
    
    // For images, we might check for proper image headers
    if (file.type.startsWith('image/')) {
      // Basic size check - images should have some minimum dimensions
      if (file.size < 100) {
        return {
          status: 'invalid',
          details: 'File is too small to be a valid image'
        };
      }
    }
    
    // For demonstration purposes, we'll consider all other files valid
    return {
      status: 'valid',
      details: 'Content validation passed'
    };
  }
  
  /**
   * Log validation results
   */
  private static logValidationResult(file: File, errors: string[], warnings: string[]): void {
    const securityContext = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    };
    
    if (errors.length > 0) {
      auditLogger.logEvent(
        AuditEventType.FILE_UPLOAD,
        securityContext as any,
        {
          outcome: 'failure',
          errors,
          warnings
        },
        RiskLevel.HIGH
      );
    } else {
      auditLogger.logEvent(
        AuditEventType.FILE_UPLOAD,
        securityContext as any,
        {
          outcome: 'success',
          warnings: warnings.length > 0 ? warnings : undefined
        },
        warnings.length > 0 ? RiskLevel.MEDIUM : RiskLevel.LOW
      );
    }
  }
}