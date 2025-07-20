import { FileValidator, ValidationResult } from '../../lib/security/fileValidator';

// Mock the auditLogger
jest.mock('../../lib/security/auditLogger', () => {
  return {
    auditLogger: {
      logEvent: jest.fn(),
    },
    AuditEventType: {
      FILE_UPLOAD: 'file_upload',
    },
    RiskLevel: {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical',
    },
  };
});

// Mock the piiAuditIntegration
jest.mock('../../lib/security/piiAuditIntegration', () => {
  return {
    sanitizeErrorMessage: (msg: string) => msg,
  };
});

describe('FileValidator', () => {
  // Helper to create a mock File
  function createMockFile(
    name: string,
    type: string,
    size: number,
    content?: Uint8Array
  ): File {
    const blob = content
      ? new Blob([content], { type })
      : new Blob(['test content'], { type });
    
    Object.defineProperty(blob, 'name', {
      value: name,
      writable: false,
    });
    
    Object.defineProperty(blob, 'size', {
      value: size,
      writable: false,
    });
    
    return blob as File;
  }

  // Create PDF signature
  const pdfSignature = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A]);
  
  // Create JPEG signature
  const jpegSignature = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
  
  // Create PNG signature
  const pngSignature = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
  ]);

  describe('validateFile', () => {
    it('should validate a valid PDF file', async () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1024, pdfSignature);
      
      // Mock the private methods
      const originalValidateSignature = (FileValidator as any).validateFileSignature;
      const originalScanForMalware = (FileValidator as any).scanForMalware;
      const originalValidateContent = (FileValidator as any).validateFileContent;
      
      (FileValidator as any).validateFileSignature = jest.fn().mockResolvedValue(true);
      (FileValidator as any).scanForMalware = jest.fn().mockResolvedValue({ status: 'clean', details: 'No threats detected' });
      (FileValidator as any).validateFileContent = jest.fn().mockResolvedValue({ status: 'valid', details: 'Content validation passed' });
      
      const result = await FileValidator.validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.metadata.fileType).toBe('application/pdf');
      expect(result.metadata.fileSize).toBe(1024);
      
      // Restore original methods
      (FileValidator as any).validateFileSignature = originalValidateSignature;
      (FileValidator as any).scanForMalware = originalScanForMalware;
      (FileValidator as any).validateFileContent = originalValidateContent;
    });

    it('should reject a file with invalid type', async () => {
      const file = createMockFile('test.exe', 'application/x-msdownload', 1024);
      
      const result = await FileValidator.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('File type application/x-msdownload is not allowed');
    });

    it('should reject a file that exceeds size limit', async () => {
      const file = createMockFile('large.pdf', 'application/pdf', 20 * 1024 * 1024);
      
      const result = await FileValidator.validateFile(file, { maxFileSize: 10 * 1024 * 1024 });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('exceeds maximum allowed size');
    });

    it('should reject a file with invalid signature', async () => {
      const file = createMockFile('fake.pdf', 'application/pdf', 1024);
      
      // Mock the private methods
      const originalValidateSignature = (FileValidator as any).validateFileSignature;
      (FileValidator as any).validateFileSignature = jest.fn().mockResolvedValue(false);
      
      const result = await FileValidator.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('File signature validation failed');
      
      // Restore original method
      (FileValidator as any).validateFileSignature = originalValidateSignature;
    });

    it('should reject a file with malware', async () => {
      const file = createMockFile('malware.pdf', 'application/pdf', 1024);
      
      // Mock the private methods
      const originalScanForMalware = (FileValidator as any).scanForMalware;
      (FileValidator as any).scanForMalware = jest.fn().mockResolvedValue({ 
        status: 'infected', 
        details: 'Malware detected' 
      });
      
      const result = await FileValidator.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Malware detected');
      
      // Restore original method
      (FileValidator as any).scanForMalware = originalScanForMalware;
    });

    it('should reject a file with invalid content', async () => {
      const file = createMockFile('invalid.pdf', 'application/pdf', 1024);
      
      // Mock the private methods
      const originalValidateContent = (FileValidator as any).validateFileContent;
      (FileValidator as any).validateFileContent = jest.fn().mockResolvedValue({ 
        status: 'invalid', 
        details: 'Invalid content' 
      });
      
      const result = await FileValidator.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Content validation failed');
      
      // Restore original method
      (FileValidator as any).validateFileContent = originalValidateContent;
    });

    it('should handle validation errors gracefully', async () => {
      const file = createMockFile('test.pdf', 'application/pdf', 1024);
      
      // Mock the private methods to throw errors
      const originalValidateSignature = (FileValidator as any).validateFileSignature;
      const originalScanForMalware = (FileValidator as any).scanForMalware;
      const originalValidateContent = (FileValidator as any).validateFileContent;
      
      (FileValidator as any).validateFileSignature = jest.fn().mockRejectedValue(new Error('Signature validation error'));
      (FileValidator as any).scanForMalware = jest.fn().mockRejectedValue(new Error('Malware scan error'));
      (FileValidator as any).validateFileContent = jest.fn().mockRejectedValue(new Error('Content validation error'));
      
      const result = await FileValidator.validateFile(file);
      
      expect(result.warnings.length).toBe(3);
      expect(result.warnings[0]).toContain('Failed to validate file signature');
      expect(result.warnings[1]).toContain('Failed to scan for malware');
      expect(result.warnings[2]).toContain('Failed to validate file content');
      
      // Restore original methods
      (FileValidator as any).validateFileSignature = originalValidateSignature;
      (FileValidator as any).scanForMalware = originalScanForMalware;
      (FileValidator as any).validateFileContent = originalValidateContent;
    });
  });
});