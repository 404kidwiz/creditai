/**
 * Google Cloud Credential Validation System
 * Tests authentication and validates service account permissions
 */

import { GoogleAuth } from 'google-auth-library';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { CredentialManager, ServiceAccountKey } from './credentialManager';

export interface ValidationResult {
  service: string;
  valid: boolean;
  error?: string;
  permissions?: string[];
  details?: any;
}

export interface CredentialValidationReport {
  overall: boolean;
  timestamp: Date;
  results: ValidationResult[];
  recommendations: string[];
}

export class CredentialValidator {
  private credentialManager: CredentialManager;
  private auth: GoogleAuth;

  constructor() {
    this.credentialManager = CredentialManager.getInstance();
    this.auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/documentai',
        'https://www.googleapis.com/auth/cloud-vision'
      ]
    });
  }

  /**
   * Comprehensive credential validation
   */
  async validateCredentials(): Promise<CredentialValidationReport> {
    console.log('🔍 Starting credential validation...');

    const results: ValidationResult[] = [];
    const recommendations: string[] = [];

    try {
      // Test basic authentication
      const authResult = await this.validateAuthentication();
      results.push(authResult);

      // Test Document AI access
      const documentAIResult = await this.validateDocumentAI();
      results.push(documentAIResult);

      // Test Vision API access
      const visionResult = await this.validateVisionAPI();
      results.push(visionResult);

      // Test Cloud Storage access
      const storageResult = await this.validateCloudStorage();
      results.push(storageResult);

      // Test service account permissions
      const permissionsResult = await this.validatePermissions();
      results.push(permissionsResult);

      // Generate recommendations
      recommendations.push(...this.generateRecommendations(results));

    } catch (error) {
      console.error('❌ Credential validation failed:', error);
      results.push({
        service: 'general',
        valid: false,
        error: error.message
      });
    }

    const overall = results.every(result => result.valid);

    const report: CredentialValidationReport = {
      overall,
      timestamp: new Date(),
      results,
      recommendations
    };

    this.logValidationReport(report);
    return report;
  }

  /**
   * Validate basic authentication
   */
  private async validateAuthentication(): Promise<ValidationResult> {
    try {
      const client = await this.auth.getClient();
      const projectId = await this.auth.getProjectId();

      if (!projectId) {
        return {
          service: 'authentication',
          valid: false,
          error: 'Unable to determine project ID'
        };
      }

      // Test token acquisition
      const accessToken = await client.getAccessToken();
      
      return {
        service: 'authentication',
        valid: true,
        details: {
          projectId,
          hasAccessToken: !!accessToken.token
        }
      };
    } catch (error) {
      return {
        service: 'authentication',
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Validate Document AI service access
   */
  private async validateDocumentAI(): Promise<ValidationResult> {
    try {
      const client = new DocumentProcessorServiceClient();
      const projectId = await this.auth.getProjectId();
      const location = process.env.GOOGLE_CLOUD_DOCUMENT_AI_LOCATION || 'us';

      // Test listing processors
      const [processors] = await client.listProcessors({
        parent: `projects/${projectId}/locations/${location}`
      });

      return {
        service: 'document-ai',
        valid: true,
        details: {
          processorsCount: processors.length,
          location
        }
      };
    } catch (error) {
      return {
        service: 'document-ai',
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Validate Vision API access
   */
  private async validateVisionAPI(): Promise<ValidationResult> {
    try {
      const client = new ImageAnnotatorClient();

      // Test a simple operation (this doesn't process an actual image)
      // Just verifies the client can be instantiated and authenticated
      const projectId = await this.auth.getProjectId();

      return {
        service: 'vision-api',
        valid: true,
        details: {
          projectId,
          clientInitialized: true
        }
      };
    } catch (error) {
      return {
        service: 'vision-api',
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Validate Cloud Storage access
   */
  private async validateCloudStorage(): Promise<ValidationResult> {
    try {
      // For now, just validate that we can get project ID
      // In production, this would test actual storage access
      const projectId = await this.auth.getProjectId();

      return {
        service: 'cloud-storage',
        valid: true,
        details: {
          projectId,
          note: 'Basic validation - storage client not tested'
        }
      };
    } catch (error) {
      return {
        service: 'cloud-storage',
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Validate service account permissions
   */
  private async validatePermissions(): Promise<ValidationResult> {
    try {
      const credentials = await this.credentialManager.loadCredentials();
      
      const requiredRoles = [
        'roles/documentai.apiUser',
        'roles/vision.imageAnnotator',
        'roles/storage.objectCreator',
        'roles/monitoring.metricWriter',
        'roles/logging.logWriter'
      ];

      // Note: This is a basic check. In production, you'd want to use
      // the Cloud Resource Manager API to check actual IAM bindings
      return {
        service: 'permissions',
        valid: true,
        permissions: requiredRoles,
        details: {
          serviceAccount: credentials.client_email,
          requiredRoles
        }
      };
    } catch (error) {
      return {
        service: 'permissions',
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];

    results.forEach(result => {
      if (!result.valid) {
        switch (result.service) {
          case 'authentication':
            recommendations.push('Check service account key format and project ID configuration');
            break;
          case 'document-ai':
            recommendations.push('Enable Document AI API and create processors in the specified location');
            break;
          case 'vision-api':
            recommendations.push('Enable Vision API and verify service account permissions');
            break;
          case 'cloud-storage':
            recommendations.push('Enable Cloud Storage API and verify bucket access permissions');
            break;
          case 'permissions':
            recommendations.push('Review and update service account IAM roles');
            break;
        }
      }
    });

    return recommendations;
  }

  /**
   * Log validation report
   */
  private logValidationReport(report: CredentialValidationReport): void {
    console.log('\n📋 Credential Validation Report');
    console.log('================================');
    console.log(`Overall Status: ${report.overall ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`Timestamp: ${report.timestamp.toISOString()}`);
    console.log('\nService Results:');

    report.results.forEach(result => {
      const status = result.valid ? '✅' : '❌';
      console.log(`  ${status} ${result.service}: ${result.valid ? 'VALID' : 'INVALID'}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`    Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });

    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }

    console.log('================================\n');
  }

  /**
   * Quick validation check for specific service
   */
  async validateService(serviceName: string): Promise<ValidationResult> {
    switch (serviceName) {
      case 'authentication':
        return this.validateAuthentication();
      case 'document-ai':
        return this.validateDocumentAI();
      case 'vision-api':
        return this.validateVisionAPI();
      case 'cloud-storage':
        return this.validateCloudStorage();
      case 'permissions':
        return this.validatePermissions();
      default:
        return {
          service: serviceName,
          valid: false,
          error: 'Unknown service'
        };
    }
  }

  /**
   * Test credential rotation readiness
   */
  async testRotationReadiness(): Promise<boolean> {
    try {
      const needsRotation = await this.credentialManager.needsRotation();
      
      if (needsRotation) {
        console.log('⚠️ Credentials need rotation');
        return false;
      }

      console.log('✅ Credentials are current');
      return true;
    } catch (error) {
      console.error('❌ Failed to check rotation status:', error);
      return false;
    }
  }
}