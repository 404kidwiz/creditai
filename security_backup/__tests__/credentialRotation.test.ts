/**
 * Tests for Google Cloud Credential Rotation System
 */

// Mock dependencies first
jest.mock('../credentialManager');
jest.mock('../credentialValidator');

import { CredentialRotation, RotationConfig } from '../credentialRotation';
import { CredentialManager, ServiceAccountKey } from '../credentialManager';
import { CredentialValidator } from '../credentialValidator';

const mockCredentialManager = CredentialManager as jest.MockedClass<typeof CredentialManager>;
const mockCredentialValidator = CredentialValidator as jest.MockedClass<typeof CredentialValidator>;

describe('CredentialRotation', () => {
  let rotation: CredentialRotation;
  let mockCredentialManagerInstance: jest.Mocked<CredentialManager>;
  let mockValidatorInstance: jest.Mocked<CredentialValidator>;

  const mockCredentials: ServiceAccountKey = {
    type: 'service_account',
    project_id: 'test-project',
    private_key_id: 'new-key-id',
    private_key: '-----BEGIN PRIVATE KEY-----\nnew-key\n-----END PRIVATE KEY-----\n',
    client_email: 'test@test-project.iam.gserviceaccount.com',
    client_id: '123456789',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com'
  };

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

    mockValidatorInstance = {
      validateCredentials: jest.fn(),
      validateService: jest.fn(),
      testRotationReadiness: jest.fn()
    } as any;

    mockCredentialManager.getInstance.mockReturnValue(mockCredentialManagerInstance);
    mockCredentialValidator.mockImplementation(() => mockValidatorInstance);

    const config: RotationConfig = {
      rotationIntervalDays: 90,
      backupRetentionDays: 30,
      autoRotate: false
    };

    rotation = new CredentialRotation(config);
  });

  describe('checkAndRotate', () => {
    it('should return null if rotation is not needed', async () => {
      mockCredentialManagerInstance.needsRotation.mockResolvedValue(false);

      const result = await rotation.checkAndRotate();

      expect(result).toBeNull();
    });

    it('should return null if rotation is needed but auto-rotate is disabled', async () => {
      mockCredentialManagerInstance.needsRotation.mockResolvedValue(true);

      const result = await rotation.checkAndRotate();

      expect(result).toBeNull();
    });

    it('should perform rotation if auto-rotate is enabled and rotation is needed', async () => {
      const autoRotateConfig: RotationConfig = {
        rotationIntervalDays: 90,
        backupRetentionDays: 30,
        autoRotate: true
      };

      rotation = new CredentialRotation(autoRotateConfig);

      mockCredentialManagerInstance.needsRotation.mockResolvedValue(true);
      mockCredentialManagerInstance.getMetadata.mockResolvedValue({
        keyId: 'old-key-id',
        createdAt: new Date(),
        lastUsed: new Date(),
        rotationRequired: true,
        environment: 'development'
      });

      // Mock successful rotation
      jest.spyOn(rotation as any, 'rotateCredentials').mockResolvedValue({
        success: true,
        timestamp: new Date(),
        oldKeyId: 'old-key-id',
        newKeyId: 'new-key-id',
        backupCreated: true
      });

      const result = await rotation.checkAndRotate();

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });
  });

  describe('rotateCredentials', () => {
    it('should successfully rotate credentials', async () => {
      mockCredentialManagerInstance.getMetadata.mockResolvedValue({
        keyId: 'old-key-id',
        createdAt: new Date(),
        lastUsed: new Date(),
        rotationRequired: true,
        environment: 'development'
      });

      mockCredentialManagerInstance.loadCredentials.mockResolvedValue({
        ...mockCredentials,
        private_key_id: 'old-key-id'
      });

      // Mock successful backup creation
      jest.spyOn(rotation as any, 'createBackup').mockResolvedValue(true);

      // Mock successful validation
      mockValidatorInstance.validateCredentials.mockResolvedValue({
        overall: true,
        timestamp: new Date(),
        results: [],
        recommendations: []
      });

      const result = await rotation.rotateCredentials(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.oldKeyId).toBe('old-key-id');
      expect(result.newKeyId).toBe('new-key-id');
      expect(result.backupCreated).toBe(true);
    });

    it('should fail if new credentials are not provided', async () => {
      mockCredentialManagerInstance.getMetadata.mockResolvedValue({
        keyId: 'old-key-id',
        createdAt: new Date(),
        lastUsed: new Date(),
        rotationRequired: true,
        environment: 'development'
      });

      const result = await rotation.rotateCredentials();

      expect(result.success).toBe(false);
      expect(result.error).toBe('New credentials must be provided for rotation');
    });

    it('should fail if new credentials validation fails', async () => {
      mockCredentialManagerInstance.getMetadata.mockResolvedValue({
        keyId: 'old-key-id',
        createdAt: new Date(),
        lastUsed: new Date(),
        rotationRequired: true,
        environment: 'development'
      });

      // Mock failed validation
      mockValidatorInstance.validateCredentials.mockResolvedValue({
        overall: false,
        timestamp: new Date(),
        results: [],
        recommendations: []
      });

      jest.spyOn(rotation as any, 'createBackup').mockResolvedValue(true);

      const result = await rotation.rotateCredentials(mockCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('New credentials failed validation');
    });

    it('should reject credentials with same key ID', async () => {
      mockCredentialManagerInstance.getMetadata.mockResolvedValue({
        keyId: 'same-key-id',
        createdAt: new Date(),
        lastUsed: new Date(),
        rotationRequired: true,
        environment: 'development'
      });

      const sameKeyCredentials = {
        ...mockCredentials,
        private_key_id: 'same-key-id'
      };

      const result = await rotation.rotateCredentials(sameKeyCredentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('New credentials must have a different key ID');
    });
  });

  describe('getRotationSchedule', () => {
    it('should return correct schedule for current credentials', async () => {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - 30); // 30 days ago

      mockCredentialManagerInstance.getMetadata.mockResolvedValue({
        keyId: 'test-key',
        createdAt: createdDate,
        lastUsed: new Date(),
        rotationRequired: false,
        environment: 'development'
      });

      const schedule = await rotation.getRotationSchedule();

      expect(schedule.daysUntilRotation).toBe(60); // 90 - 30 = 60 days
      expect(schedule.rotationOverdue).toBe(false);
    });

    it('should return overdue status for old credentials', async () => {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - 100); // 100 days ago

      mockCredentialManagerInstance.getMetadata.mockResolvedValue({
        keyId: 'test-key',
        createdAt: createdDate,
        lastUsed: new Date(),
        rotationRequired: false,
        environment: 'development'
      });

      const schedule = await rotation.getRotationSchedule();

      expect(schedule.daysUntilRotation).toBe(-10); // 90 - 100 = -10 days
      expect(schedule.rotationOverdue).toBe(true);
    });

    it('should return immediate rotation needed if no metadata', async () => {
      mockCredentialManagerInstance.getMetadata.mockResolvedValue(null);

      const schedule = await rotation.getRotationSchedule();

      expect(schedule.daysUntilRotation).toBe(0);
      expect(schedule.rotationOverdue).toBe(true);
    });
  });

  describe('generateRotationReport', () => {
    it('should generate report for current credentials', async () => {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - 30);

      mockCredentialManagerInstance.getMetadata.mockResolvedValue({
        keyId: 'test-key',
        createdAt: createdDate,
        lastUsed: new Date(),
        rotationRequired: false,
        environment: 'development'
      });

      mockCredentialManagerInstance.needsRotation.mockResolvedValue(false);

      const report = await rotation.generateRotationReport();

      expect(report.currentStatus).toBe('current');
      expect(report.recommendations).toContain('Consider enabling auto-rotation for better security');
    });

    it('should generate report for overdue credentials', async () => {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - 100);

      mockCredentialManagerInstance.getMetadata.mockResolvedValue({
        keyId: 'test-key',
        createdAt: createdDate,
        lastUsed: new Date(),
        rotationRequired: false,
        environment: 'development'
      });

      mockCredentialManagerInstance.needsRotation.mockResolvedValue(true);

      const report = await rotation.generateRotationReport();

      expect(report.currentStatus).toBe('overdue');
      expect(report.recommendations).toContain('Credential rotation is required');
      expect(report.recommendations).toContain('Rotation is overdue - immediate action required');
    });
  });
});