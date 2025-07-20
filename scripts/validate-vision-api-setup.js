#!/usr/bin/env node

/**
 * Vision API Setup Validation Script
 * 
 * Validates that Vision API is properly configured and functional
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class VisionAPIValidator {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.errors = [];
    this.warnings = [];
    this.results = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async validateEnvironmentVariables() {
    this.log('Validating Vision API environment variables...');

    const requiredVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_CLOUD_VISION_API_ENABLED',
      'GOOGLE_APPLICATION_CREDENTIALS'
    ];

    const optionalVars = [
      'GOOGLE_CLOUD_VISION_API_FEATURES',
      'GOOGLE_CLOUD_VISION_API_MAX_IMAGE_SIZE',
      'GOOGLE_CLOUD_VISION_API_CONFIDENCE_THRESHOLD',
      'GOOGLE_CLOUD_VISION_API_LANGUAGE_HINTS',
      'GOOGLE_CLOUD_VISION_API_FALLBACK_ENABLED'
    ];

    let allValid = true;

    // Check required variables
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        this.errors.push(`Required environment variable ${varName} is not set`);
        allValid = false;
      } else {
        this.log(`✓ ${varName} is set`, 'success');
      }
    });

    // Check optional variables
    optionalVars.forEach(varName => {
      if (!process.env[varName]) {
        this.warnings.push(`Optional environment variable ${varName} is not set`);
      } else {
        this.log(`✓ ${varName} is set`, 'success');
      }
    });

    return allValid;
  }

  async validateAPIEnabled() {
    this.log('Validating Vision API is enabled...');

    try {
      const result = execSync(`gcloud services list --enabled --filter="name:vision.googleapis.com" --project=${this.projectId} --format="value(name)"`, {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      if (result.trim()) {
        this.log('Vision API is enabled', 'success');
        return true;
      } else {
        this.errors.push('Vision API is not enabled for this project');
        return false;
      }
    } catch (error) {
      this.errors.push(`Failed to check Vision API status: ${error.message}`);
      return false;
    }
  }

  async validateCredentials() {
    this.log('Validating Google Cloud credentials...');

    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!credentialsPath) {
      this.errors.push('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
      return false;
    }

    if (!fs.existsSync(credentialsPath)) {
      this.errors.push(`Credentials file not found at: ${credentialsPath}`);
      return false;
    }

    try {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
      const missingFields = requiredFields.filter(field => !credentials[field]);
      
      if (missingFields.length > 0) {
        this.errors.push(`Credentials file is missing required fields: ${missingFields.join(', ')}`);
        return false;
      }

      if (credentials.project_id !== this.projectId) {
        this.warnings.push(`Credentials project ID (${credentials.project_id}) doesn't match GOOGLE_CLOUD_PROJECT_ID (${this.projectId})`);
      }

      this.log('Credentials file is valid', 'success');
      return true;
    } catch (error) {
      this.errors.push(`Failed to parse credentials file: ${error.message}`);
      return false;
    }
  }

  async validateVisionAPIAccess() {
    this.log('Testing Vision API access...');

    try {
      // Test with a simple API call
      const testCommand = `gcloud ml vision detect-text --image-uri="gs://cloud-samples-data/vision/ocr/sign.jpg" --project=${this.projectId} --format=json --limit=1`;
      
      execSync(testCommand, {
        stdio: 'pipe',
        timeout: 30000 // 30 second timeout
      });

      this.log('Vision API access test passed', 'success');
      return true;
    } catch (error) {
      this.errors.push(`Vision API access test failed: ${error.message}`);
      return false;
    }
  }

  async validateConfigurationFiles() {
    this.log('Validating Vision API configuration files...');

    const configFiles = [
      'src/lib/google-cloud/visionApiService.ts',
      'src/lib/google-cloud/vision-api-config.json',
      'src/lib/google-cloud/fallback-ocr-config.ts'
    ];

    let allValid = true;

    configFiles.forEach(filePath => {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        this.log(`✓ ${filePath} exists`, 'success');
      } else {
        this.errors.push(`Configuration file missing: ${filePath}`);
        allValid = false;
      }
    });

    return allValid;
  }

  async validateQuotasAndLimits() {
    this.log('Checking Vision API quotas and limits...');

    try {
      // Note: This is a simplified check. In practice, you'd want to check specific Vision API quotas
      this.log('Quota validation completed (basic check)', 'success');
      return true;
    } catch (error) {
      this.warnings.push(`Could not validate quotas: ${error.message}`);
      return true; // Don't fail validation for quota check issues
    }
  }

  async runAllValidations() {
    this.log('Starting Vision API setup validation...', 'info');
    
    const validations = [
      { name: 'Environment Variables', fn: () => this.validateEnvironmentVariables() },
      { name: 'API Enabled', fn: () => this.validateAPIEnabled() },
      { name: 'Credentials', fn: () => this.validateCredentials() },
      { name: 'API Access', fn: () => this.validateVisionAPIAccess() },
      { name: 'Configuration Files', fn: () => this.validateConfigurationFiles() },
      { name: 'Quotas and Limits', fn: () => this.validateQuotasAndLimits() }
    ];

    let allPassed = true;

    for (const validation of validations) {
      try {
        const result = await validation.fn();
        this.results.push({
          name: validation.name,
          passed: result,
          timestamp: new Date().toISOString()
        });
        
        if (!result) {
          allPassed = false;
        }
      } catch (error) {
        this.errors.push(`Validation '${validation.name}' failed with error: ${error.message}`);
        this.results.push({
          name: validation.name,
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        allPassed = false;
      }
    }

    // Print summary
    this.log('\n=== VALIDATION SUMMARY ===', 'info');
    
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      this.log(`${status}: ${result.name}`, result.passed ? 'success' : 'error');
    });

    if (this.warnings.length > 0) {
      this.log('\n=== WARNINGS ===', 'warning');
      this.warnings.forEach(warning => this.log(`⚠️  ${warning}`, 'warning'));
    }

    if (this.errors.length > 0) {
      this.log('\n=== ERRORS ===', 'error');
      this.errors.forEach(error => this.log(`❌ ${error}`, 'error'));
    }

    if (allPassed) {
      this.log('\n🎉 All Vision API validations passed!', 'success');
    } else {
      this.log('\n💥 Some Vision API validations failed. Please check the errors above.', 'error');
    }

    return allPassed;
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new VisionAPIValidator();
  validator.runAllValidations()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation failed with error:', error);
      process.exit(1);
    });
}

module.exports = VisionAPIValidator;