import { EnhancedPIIMasker, PIIType, PIISeverity } from '../../lib/security/enhancedPIIMasker';
import { maskPIIWithAudit, maskObjectWithAudit } from '../../lib/security/piiAuditIntegration';

// Mock the audit logger
jest.mock('../../lib/security/auditLogger', () => {
  return {
    auditLogger: {
      logEvent: jest.fn(),
      logSecurityEvent: jest.fn(),
      logSystemEvent: jest.fn(),
    },
    AuditEventType: {
      PII_DETECTED: 'pii_detected',
      HIGH_SENSITIVITY_DOCUMENT: 'high_sensitivity_document',
    },
    RiskLevel: {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical',
    },
  };
});

describe('EnhancedPIIMasker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('maskPII', () => {
    it('should detect and mask SSN', () => {
      const text = 'My SSN is 123-45-6789 and my phone is 555-123-4567';
      const result = EnhancedPIIMasker.maskPII(text);

      expect(result.piiDetected).toBe(true);
      expect(result.detectedTypes).toContain(PIIType.SSN);
      expect(result.maskedText).toContain('***-**-6789');
      expect(result.maskedText).not.toContain('123-45-6789');
      expect(result.severity).toBe(PIISeverity.CRITICAL);
    });

    it('should detect and mask credit card numbers', () => {
      const text = 'My credit card is 4111 1111 1111 1111';
      const result = EnhancedPIIMasker.maskPII(text);

      expect(result.piiDetected).toBe(true);
      expect(result.detectedTypes).toContain(PIIType.CREDIT_CARD);
      expect(result.maskedText).toContain('****-****-****-1111');
      expect(result.maskedText).not.toContain('4111 1111 1111 1111');
      expect(result.severity).toBe(PIISeverity.CRITICAL);
    });

    it('should detect and mask phone numbers', () => {
      const text = 'Call me at (555) 123-4567 or 555-987-6543';
      const result = EnhancedPIIMasker.maskPII(text);

      expect(result.piiDetected).toBe(true);
      expect(result.detectedTypes).toContain(PIIType.PHONE_NUMBER);
      expect(result.maskedText).not.toContain('555-987-6543');
      expect(result.severity).toBe(PIISeverity.MEDIUM);
    });

    it('should detect and mask email addresses', () => {
      const text = 'My email is john.doe@example.com';
      const result = EnhancedPIIMasker.maskPII(text);

      expect(result.piiDetected).toBe(true);
      expect(result.detectedTypes).toContain(PIIType.EMAIL);
      expect(result.maskedText).toContain('jo***@example.com');
      expect(result.maskedText).not.toContain('john.doe@example.com');
      expect(result.severity).toBe(PIISeverity.MEDIUM);
    });

    it('should detect and mask addresses', () => {
      const text = 'I live at 123 Main Street, Anytown, CA 12345';
      const result = EnhancedPIIMasker.maskPII(text);

      expect(result.piiDetected).toBe(true);
      expect(result.detectedTypes).toContain(PIIType.ADDRESS);
      expect(result.maskedText).not.toContain('123 Main Street');
      expect(result.severity).toBe(PIISeverity.HIGH);
    });

    it('should handle multiple PII types and calculate correct severity', () => {
      const text = 'My SSN is 123-45-6789 and my email is john.doe@example.com';
      const result = EnhancedPIIMasker.maskPII(text);

      expect(result.piiDetected).toBe(true);
      expect(result.detectedTypes).toContain(PIIType.SSN);
      expect(result.detectedTypes).toContain(PIIType.EMAIL);
      expect(result.detectionCount).toBe(2);
      expect(result.severity).toBe(PIISeverity.CRITICAL); // SSN is critical
    });

    it('should return original text when no PII is detected', () => {
      const text = 'This text contains no PII information.';
      const result = EnhancedPIIMasker.maskPII(text);

      expect(result.piiDetected).toBe(false);
      expect(result.detectedTypes).toHaveLength(0);
      expect(result.maskedText).toBe(text);
      expect(result.severity).toBe(PIISeverity.LOW);
    });

    it('should handle empty or null input', () => {
      const result1 = EnhancedPIIMasker.maskPII('');
      expect(result1.piiDetected).toBe(false);
      expect(result1.maskedText).toBe('');

      const result2 = EnhancedPIIMasker.maskPII(null as any);
      expect(result2.piiDetected).toBe(false);
      expect(result2.maskedText).toBe('');
    });
  });

  describe('validateMasking', () => {
    it('should validate that masking was effective', () => {
      const originalText = 'SSN: 123-45-6789, Email: john.doe@example.com';
      const maskedText = EnhancedPIIMasker.maskPII(originalText).maskedText;
      
      const validation = EnhancedPIIMasker.validateMasking(originalText, maskedText);
      
      expect(validation.isValid).toBe(true);
      expect(validation.remainingPII).toHaveLength(0);
      expect(validation.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('calculateSeverity', () => {
    it('should calculate CRITICAL severity for SSN', () => {
      const severity = EnhancedPIIMasker.calculateSeverity([PIIType.SSN]);
      expect(severity).toBe(PIISeverity.CRITICAL);
    });

    it('should calculate HIGH severity for account numbers', () => {
      const severity = EnhancedPIIMasker.calculateSeverity([PIIType.ACCOUNT_NUMBER]);
      expect(severity).toBe(PIISeverity.HIGH);
    });

    it('should calculate MEDIUM severity for emails', () => {
      const severity = EnhancedPIIMasker.calculateSeverity([PIIType.EMAIL]);
      expect(severity).toBe(PIISeverity.MEDIUM);
    });

    it('should calculate LOW severity for empty array', () => {
      const severity = EnhancedPIIMasker.calculateSeverity([]);
      expect(severity).toBe(PIISeverity.LOW);
    });

    it('should prioritize highest severity when multiple types are present', () => {
      const severity = EnhancedPIIMasker.calculateSeverity([
        PIIType.EMAIL,
        PIIType.SSN,
        PIIType.PHONE_NUMBER
      ]);
      expect(severity).toBe(PIISeverity.CRITICAL);
    });
  });
});

describe('PII Audit Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up a mock audit logger
    EnhancedPIIMasker.setAuditLogger(jest.fn());
  });

  describe('maskPIIWithAudit', () => {
    it('should mask PII and trigger audit logging', async () => {
      const text = 'SSN: 123-45-6789';
      const userId = 'user123';
      const context = 'Test context';
      
      const maskedText = await maskPIIWithAudit(text, userId, context);
      
      expect(maskedText).not.toContain('123-45-6789');
      expect(maskedText).toContain('***-**-6789');
    });
  });

  describe('maskObjectWithAudit', () => {
    it('should mask PII in string properties of objects', async () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789',
        email: 'john.doe@example.com',
        nested: {
          phone: '555-123-4567',
          address: '123 Main St'
        },
        array: ['555-987-6543', 'no PII here']
      };
      
      const maskedData = await maskObjectWithAudit(data, 'user123', 'Test context');
      
      expect(maskedData.ssn).not.toBe('123-45-6789');
      expect(maskedData.email).not.toBe('john.doe@example.com');
      expect(maskedData.nested.phone).not.toBe('555-123-4567');
      expect(maskedData.array[0]).not.toBe('555-987-6543');
      expect(maskedData.array[1]).toBe('no PII here');
    });

    it('should handle arrays correctly', async () => {
      const data = ['123-45-6789', 'john.doe@example.com', 'no PII here'];
      
      const maskedData = await maskObjectWithAudit(data, 'user123', 'Test context');
      
      expect(maskedData[0]).not.toBe('123-45-6789');
      expect(maskedData[1]).not.toBe('john.doe@example.com');
      expect(maskedData[2]).toBe('no PII here');
    });

    it('should return non-object values unchanged', async () => {
      expect(await maskObjectWithAudit(123, 'user123', 'Test context')).toBe(123);
      expect(await maskObjectWithAudit(true, 'user123', 'Test context')).toBe(true);
      expect(await maskObjectWithAudit(null, 'user123', 'Test context')).toBe(null);
      expect(await maskObjectWithAudit(undefined, 'user123', 'Test context')).toBe(undefined);
    });
  });
});