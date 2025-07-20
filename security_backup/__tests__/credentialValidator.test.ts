/**
 * Tests for Google Cloud Credential Validation System
 */

import { CredentialValidator, ValidationResult } from '../credentialValidator';
import { CredentialManager } from '../credentialManager';

// Mock Google Cloud libraries
jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn()
}));
jest.mock('@google-cloud/documentai', () => ({
  DocumentProcessorServiceClient: jest.fn()
}));
jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn()
}));
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn()
}));

// Mock CredentialManager
jest.mock('../credentialManager');

const mockCredentialManager = CredentialManager as jest.MockedClass<typeof CredentialManager>;

describe('CredentialValidator', () => {
  let validator: CredentialValidator;
  let mockCredentialManagerInstance: jest.Mocked<CredentialManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCredentialManagerInstance = {
      loadCredentials: jest.fn(),
      storeCredentials: jest.fn(),
      credentialsExist: jest.fn(),
      getMetadata: jest.fn(),
      needsRotation: jest.fn(),
      markForRotation: jest.fn(),
      cleanup: jest.fn()
    } as any;

    mockCredentialManager.getInstance.mockReturnValue(mockCredentialManagerInstance);
    
    validator = new CredentialValidator();
  });

  describe('validateCredentials', () => {
    it('should return comprehensive validation report', async () => {
      // Mock successful validations
      jest.spyOn(validator as any, 'validateAuthentication').mockResolvedValue({
        service: 'authentication',
        valid: true,
        details: { projectId: 'test-project' }
      });

      jest.spyOn(validator as any, 'validateDocumentAI').mockResolvedValue({
        service: 'document-ai',
        valid: true,
        details: { processorsCount: 2 }
      });

      jest.spyOn(validator as any, 'validateVisionAPI').mockResolvedValue({
        service: 'vision-api',
        valid: true,
        details: { clientInitialized: true }
      });

      jest.spyOn(validator as any, 'validateCloudStorage').mockResolvedValue({
        service: 'cloud-storage',
        valid: true,
        details: { bucketsCount: 1 }
      });

      jest.spyOn(validator as any, 'validatePermissions').mockResolvedValue({
        service: 'permissions',
        valid: true,
        permissions: ['roles/documentai.apiUser']
      });

      const report = await validator.validateCredentials();

      expect(report.overall).toBe(true);
      expect(report.results).toHaveLength(5);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.recommendations).toEqual([]);
    });

    it('should return false overall status if any validation fails', async () => {
      // Mock mixed validation results
      jest.spyOn(validator as any, 'validateAuthentication').mockResolvedValue({
        service: 'authentication',
        valid: true
      });

      jest.spyOn(validator as any, 'validateDocumentAI').mockResolvedValue({
        service: 'document-ai',
        valid: false,
        error: 'API not enabled'
      });

      jest.spyOn(validator as any, 'validateVisionAPI').mockResolvedValue({
        service: 'vision-api',
        valid: true
      });

      jest.spyOn(validator as any, 'validateCloudStorage').mockResolvedValue({
        service: 'cloud-storage',
        valid: true
      });

      jest.spyOn(validator as any, 'validatePermissions').mockResolvedValue({
        service: 'permissions',
        valid: true
      });

      const report = await validator.validateCredentials();

      expect(report.overall).toBe(false);
      expect(report.recommendations).toContain('Enable Document AI API and create processors in the specified location');
    });
  });

  describe('validateService', () => {
    it('should validate specific service', async () => {
      jest.spyOn(validator as any, 'validateAuthentication').mockResolvedValue({
        service: 'authentication',
        valid: true,
        details: { projectId: 'test-project' }
      });

      const result = await validator.validateService('authentication');

      expect(result.service).toBe('authentication');
      expect(result.valid).toBe(true);
    });

    it('should return error for unknown service', async () => {
      const result = await validator.validateService('unknown-service');

      expect(result.service).toBe('unknown-service');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown service');
    });
  });

  describe('testRotationReadiness', () => {
    it('should return true if credentials are current', async () => {
      mockCredentialManagerInstance.needsRotation.mockResolvedValue(false);

      const result = await validator.testRotationReadiness();

      expect(result).toBe(true);
    });

    it('should return false if credentials need rotation', async () => {
      mockCredentialManagerInstance.needsRotation.mockResolvedValue(true);

      const result = await validator.testRotationReadiness();

      expect(result).toBe(false);
    });

    it('should return false if check fails', async () => {
      mockCredentialManagerInstance.needsRotation.mockRejectedValue(new Error('Check failed'));

      const result = await validator.testRotationReadiness();

      expect(result).toBe(false);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate appropriate recommendations for failed validations', async () => {
      const results: ValidationResult[] = [
        { service: 'authentication', valid: false, error: 'Auth failed' },
        { service: 'document-ai', valid: false, error: 'API not enabled' },
        { service: 'vision-api', valid: true },
        { service: 'cloud-storage', valid: false, error: 'No access' },
        { service: 'permissions', valid: false, error: 'Insufficient permissions' }
      ];

      const recommendations = (validator as any).generateRecommendations(results);

      expect(recommendations).toContain('Check service account key format and project ID configuration');
      expect(recommendations).toContain('Enable Document AI API and create processors in the specified location');
      expect(recommendations).toContain('Enable Cloud Storage API and verify bucket access permissions');
      expect(recommendations).toContain('Review and update service account IAM roles');
      expect(recommendations).not.toContain('Enable Vision API and verify service account permissions');
    });

    it('should return empty recommendations for all valid services', async () => {
      const results: ValidationResult[] = [
        { service: 'authentication', valid: true },
        { service: 'document-ai', valid: true },
        { service: 'vision-api', valid: true },
        { service: 'cloud-storage', valid: true },
        { service: 'permissions', valid: true }
      ];

      const recommendations = (validator as any).generateRecommendations(results);

      expect(recommendations).toEqual([]);
    });
  });
});