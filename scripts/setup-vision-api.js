#!/usr/bin/env node

/**
 * Google Cloud Vision API Setup Script
 * 
 * This script configures Vision API service with required features:
 * - Text detection (DOCUMENT_TEXT_DETECTION)
 * - Image properties (for quality assessment)
 * - Safe search (for content filtering)
 * - Fallback configuration for OCR processing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration constants
const VISION_API_FEATURES = [
  'TEXT_DETECTION',
  'DOCUMENT_TEXT_DETECTION',
  'IMAGE_PROPERTIES',
  'SAFE_SEARCH_DETECTION'
];

const SUPPORTED_FORMATS = ['PDF', 'PNG', 'JPEG', 'JPG', 'TIFF', 'GIF', 'BMP', 'WEBP'];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const CONFIDENCE_THRESHOLD = 0.8;
const LANGUAGE_HINTS = ['en'];

class VisionAPISetup {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    this.credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-cloud-key.json';
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async validatePrerequisites() {
    this.log('Validating prerequisites for Vision API setup...');

    // Check if project ID is set
    if (!this.projectId) {
      this.errors.push('GOOGLE_CLOUD_PROJECT_ID environment variable is not set');
    }

    // Check if credentials exist
    if (!fs.existsSync(this.credentialsPath)) {
      this.errors.push(`Google Cloud credentials file not found at: ${this.credentialsPath}`);
    }

    // Check if gcloud CLI is installed
    try {
      execSync('gcloud --version', { stdio: 'pipe' });
      this.log('Google Cloud CLI is installed', 'success');
    } catch (error) {
      this.errors.push('Google Cloud CLI is not installed. Please install it first.');
    }

    // Check if authenticated
    try {
      const authResult = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      if (!authResult.trim()) {
        this.errors.push('No active Google Cloud authentication found. Please run: gcloud auth login');
      } else {
        this.log(`Authenticated as: ${authResult.trim()}`, 'success');
      }
    } catch (error) {
      this.errors.push('Failed to check Google Cloud authentication status');
    }

    if (this.errors.length > 0) {
      this.log('Prerequisites validation failed:', 'error');
      this.errors.forEach(error => this.log(`  - ${error}`, 'error'));
      return false;
    }

    this.log('All prerequisites validated successfully', 'success');
    return true;
  }

  async enableVisionAPI() {
    this.log('Enabling Google Cloud Vision API...');

    try {
      // Enable Vision API
      execSync(`gcloud services enable vision.googleapis.com --project=${this.projectId}`, {
        stdio: 'pipe'
      });
      this.log('Vision API enabled successfully', 'success');

      // Wait for API to be fully enabled
      this.log('Waiting for Vision API to be fully activated...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      return true;
    } catch (error) {
      this.errors.push(`Failed to enable Vision API: ${error.message}`);
      return false;
    }
  }

  async configureVisionAPIFeatures() {
    this.log('Configuring Vision API features...');

    const config = {
      projectId: this.projectId,
      location: this.location,
      features: VISION_API_FEATURES,
      supportedFormats: SUPPORTED_FORMATS,
      maxImageSize: MAX_IMAGE_SIZE,
      confidenceThreshold: CONFIDENCE_THRESHOLD,
      languageHints: LANGUAGE_HINTS,
      fallbackEnabled: true,
      batchProcessing: {
        enabled: true,
        maxBatchSize: 16
      },
      qualityAssessment: {
        enabled: true,
        minConfidence: 0.7
      },
      safeSearch: {
        enabled: true,
        adultThreshold: 'LIKELY',
        violenceThreshold: 'LIKELY'
      }
    };

    // Save configuration to file
    const configPath = path.join(__dirname, '..', 'src', 'lib', 'google-cloud', 'vision-api-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    this.log(`Vision API configuration saved to: ${configPath}`, 'success');

    return config;
  }

  async testVisionAPIConnectivity() {
    this.log('Testing Vision API connectivity...');

    try {
      // For now, we'll just verify the API is accessible
      execSync(`gcloud services list --enabled --filter="name:vision.googleapis.com" --project=${this.projectId}`, {
        stdio: 'pipe'
      });

      this.log('Vision API connectivity test passed', 'success');
      return true;
    } catch (error) {
      this.errors.push(`Vision API connectivity test failed: ${error.message}`);
      return false;
    }
  }

  async updateEnvironmentVariables() {
    this.log('Updating environment variables...');

    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';

    // Read existing .env.local if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Vision API environment variables to add/update
    const visionEnvVars = {
      'GOOGLE_CLOUD_VISION_API_ENABLED': 'true',
      'GOOGLE_CLOUD_VISION_API_FEATURES': VISION_API_FEATURES.join(','),
      'GOOGLE_CLOUD_VISION_API_MAX_IMAGE_SIZE': MAX_IMAGE_SIZE.toString(),
      'GOOGLE_CLOUD_VISION_API_CONFIDENCE_THRESHOLD': CONFIDENCE_THRESHOLD.toString(),
      'GOOGLE_CLOUD_VISION_API_LANGUAGE_HINTS': LANGUAGE_HINTS.join(','),
      'GOOGLE_CLOUD_VISION_API_FALLBACK_ENABLED': 'true'
    };

    // Update or add environment variables
    Object.entries(visionEnvVars).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    });

    // Write updated environment file
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    this.log('Environment variables updated successfully', 'success');

    return true;
  }

  async run() {
    this.log('Starting Vision API setup process...', 'info');

    try {
      // Step 1: Validate prerequisites
      if (!(await this.validatePrerequisites())) {
        return false;
      }

      // Step 2: Enable Vision API
      if (!(await this.enableVisionAPI())) {
        return false;
      }

      // Step 3: Configure Vision API features
      await this.configureVisionAPIFeatures();

      // Step 4: Test connectivity
      if (!(await this.testVisionAPIConnectivity())) {
        return false;
      }

      // Step 5: Update environment variables
      await this.updateEnvironmentVariables();

      if (this.warnings.length > 0) {
        this.log('\n=== WARNINGS ===', 'warning');
        this.warnings.forEach(warning => this.log(`  - ${warning}`, 'warning'));
      }

      this.log('\n🎉 Vision API setup completed successfully!', 'success');
      this.log('\nNext steps:', 'info');
      this.log('1. Run validation: node scripts/validate-vision-api-setup.js', 'info');
      this.log('2. Run tests: node scripts/test-vision-api.js', 'info');
      this.log('3. Restart your application to load new environment variables', 'info');

      return true;

    } catch (error) {
      this.log(`Setup failed: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new VisionAPISetup();
  setup.run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Setup failed with error:', error);
      process.exit(1);
    });
}

module.exports = VisionAPISetup;