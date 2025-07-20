/**
 * Tests for Google Cloud Credential Management System
 */

import { CredentialManager, ServiceAccountKey } from '../credentialManager';
import { promises as fs } from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
    unlink: jest.fn()
  }
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('CredentialManager', () => {
  let credentialManager: CredentialManager;
  
  const mockCredentials: ServiceAccountKey = {
    type: 'service_account',
    project_id: 'test-project',
    private_key_id: 'test-key-id',
    private_key: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----\n',
    client_email: 'test@test-project.iam.gserviceaccount.com',
    client_id: '123456789',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project.iam.gserviceaccount.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (CredentialManager as any).instance = undefined;
    credentialManager = CredentialManager.getInstance();
  });

  describe('storeCredentials', () => {
    it('should store credentials securely', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);

      await credentialManager.storeCredentials(mockCredentials, 'development');

      expect(mockFs.writeFile).toHaveBeenCalledTimes(2); // credentials + metadata
    });

    it('should validate credential format before storing', async () => {
      const invalidCredentials = { ...mockCredentials };
      delete invalidCredentials.type;

      await expect(
        credentialManager.storeCredentials(invalidCredentials as any, 'development')
      ).rejects.toThrow('Missing required field: type');
    });

    it('should reject invalid credential type', async () => {
      const invalidCredentials = { ...mockCredentials, type: 'invalid' };

      await expect(
        credentialManager.storeCredentials(invalidCredentials as any, 'development')
      ).rejects.toThrow('Invalid credential type. Expected: service_account');
    });

    it('should reject invalid email format', async () => {
      const invalidCredentials = { ...mockCredentials, client_email: 'invalid-email' };

      await expect(
        credentialManager.storeCredentials(invalidCredentials, 'development')
      ).rejects.toThrow('Invalid client_email format');
    });
  });

  describe('loadCredentials', () => {
    it('should load and decrypt credentials', async () => {
      const encryptedData = {
        encrypted: 'encrypted-data',
        iv: 'test-iv',
        authTag: 'test-auth-tag',
        algorithm: 'aes-256-gcm'
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(encryptedData));

      // Mock the decryption process
      jest.spyOn(credentialManager as any, 'decryptCredentials')
        .mockReturnValue(mockCredentials);

      const result = await credentialManager.loadCredentials();

      expect(result).toEqual(mockCredentials);
      expect(mockFs.readFile).toHaveBeenCalled();
    });

    it('should throw error if credentials file not found', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      await expect(credentialManager.loadCredentials()).rejects.toThrow(
        'Credential loading failed: Credentials file not found'
      );
    });
  });

  describe('credentialsExist', () => {
    it('should return true if credentials file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await credentialManager.credentialsExist();

      expect(result).toBe(true);
    });

    it('should return false if credentials file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const result = await credentialManager.credentialsExist();

      expect(result).toBe(false);
    });
  });

  describe('needsRotation', () => {
    it('should return true if no metadata exists', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await credentialManager.needsRotation();

      expect(result).toBe(true);
    });

    it('should return true if rotation is explicitly required', async () => {
      const metadata = {
        keyId: 'test-key',
        createdAt: new Date(),
        lastUsed: new Date(),
        rotationRequired: true,
        environment: 'development' as const
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(metadata));

      const result = await credentialManager.needsRotation();

      expect(result).toBe(true);
    });

    it('should return true if credentials are older than 90 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      const metadata = {
        keyId: 'test-key',
        createdAt: oldDate.toISOString(), // Convert to string as it would be stored in JSON
        lastUsed: new Date().toISOString(),
        rotationRequired: false,
        environment: 'development' as const
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(metadata));

      const result = await credentialManager.needsRotation();

      expect(result).toBe(true);
    });

    it('should return false if credentials are current', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago

      const metadata = {
        keyId: 'test-key',
        createdAt: recentDate.toISOString(), // Convert to string as it would be stored in JSON
        lastUsed: new Date().toISOString(),
        rotationRequired: false,
        environment: 'development' as const
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(metadata));

      const result = await credentialManager.needsRotation();

      expect(result).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should remove credential and metadata files', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      await credentialManager.cleanup();

      expect(mockFs.unlink).toHaveBeenCalledTimes(2); // credentials + metadata
    });

    it('should handle missing files gracefully', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.unlink.mockRejectedValue(new Error('File not found'));

      await expect(credentialManager.cleanup()).resolves.not.toThrow();
    });
  });

  describe('markForRotation', () => {
    it('should mark credentials for rotation', async () => {
      const metadata = {
        keyId: 'test-key',
        createdAt: new Date(),
        lastUsed: new Date(),
        rotationRequired: false,
        environment: 'development' as const
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(metadata));
      mockFs.writeFile.mockResolvedValue(undefined);

      await credentialManager.markForRotation();

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/"rotationRequired"\s*:\s*true/)
      );
    });
  });
});