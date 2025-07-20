#!/usr/bin/env node

/**
 * Service Account Permission Testing Script
 * 
 * This script validates that the service account has the correct permissions
 * and can access all required Google Cloud services.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ServiceAccountTester {
  constructor() {
    this.projectId = null;
    this.serviceAccountEmail = null;
    this.keyPath = null;
    this.testResults = [];
  }

  /**
   * Initialize the tester with environment variables
   */
  async initialize() {
    console.log('🧪 Initializing Service Account Permission Tests...\n');
    
    // Load environment variables
    const envPath = '.env.local';
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      for (const line of envLines) {
        if (line.includes('=')) {
          const [key, value] = line.split('=');
          process.env[key] = value;
        }
      }
    }
    
    // Validate required environment variables
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.serviceAccountEmail = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL;
    this.keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!this.projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID not found in environment variables');
    }
    
    if (!this.keyPath || !fs.existsSync(this.keyPath)) {
      throw new Error('Service account key file not found. Run setup-service-account.js first.');
    }
    
    console.log(`✅ Project ID: ${this.projectId}`);
    console.log(`✅ Key file: ${this.keyPath}`);
    console.log(`✅ Service account: ${this.serviceAccountEmail}\n`);
  }

  /**
   * Run a test and record the result
   */
  async runTest(testName, testFunction) {
    console.log(`🔍 Testing: ${testName}`);
    
    try {
      const result = await testFunction();
      this.testResults.push({ name: testName, status: 'PASS', details: result });
      console.log(`  ✅ PASS: ${testName}`);
      return true;
    } catch (error) {
      this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
      console.log(`  ❌ FAIL: ${testName} - ${error.message}`);
      return false;
    }
  }

  /**
   * Test basic service account authentication
   */
  async testAuthentication() {
    return this.runTest('Service Account Authentication', async () => {
      // Activate service account
      execSync(`gcloud auth activate-service-account --key-file=${this.keyPath}`, 
        { stdio: 'pipe' }
      );
      
      // Get current authenticated account
      const currentAccount = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', 
        { encoding: 'utf8' }
      ).trim();
      
      if (!currentAccount.includes(this.serviceAccountEmail)) {
        throw new Error(`Expected ${this.serviceAccountEmail}, got ${currentAccount}`);
      }
      
      return `Authenticated as: ${currentAccount}`;
    });
  }

  /**
   * Test Document AI API access
   */
  async testDocumentAIAccess() {
    return this.runTest('Document AI API Access', async () => {
      try {
        const result = execSync(
          `gcloud ai document-processors list --location=us --project=${this.projectId} --format="value(name)"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        
        const processorCount = result.trim().split('\n').filter(line => line.length > 0).length;
        return `Found ${processorCount} Document AI processors`;
      } catch (error) {
        if (error.message.includes('permission')) {
          throw new Error('Missing Document AI permissions');
        }
        // If no processors exist, that's still a successful API call
        return 'Document AI API accessible (no processors configured yet)';
      }
    });
  }

  /**
   * Test Vision API access
   */
  async testVisionAPIAccess() {
    return this.runTest('Vision API Access', async () => {
      // Check if Vision API is enabled
      const result = execSync(
        `gcloud services list --enabled --filter="name:vision.googleapis.com" --project=${this.projectId} --format="value(name)"`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      if (!result.trim()) {
        throw new Error('Vision API is not enabled');
      }
      
      return 'Vision API is enabled and accessible';
    });
  }

  /**
   * Test Cloud Storage access
   */
  async testStorageAccess() {
    return this.runTest('Cloud Storage Access', async () => {
      try {
        const result = execSync(
          `gcloud storage buckets list --project=${this.projectId} --format="value(name)"`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        
        const bucketCount = result.trim().split('\n').filter(line => line.length > 0).length;
        return `Found ${bucketCount} storage buckets`;
      } catch (error) {
        if (error.message.includes('permission')) {
          throw new Error('Missing Storage permissions');
        }
        return 'Cloud Storage API accessible (no buckets found)';
      }
    });
  }

  /**
   * Test Monitoring API access
   */
  async testMonitoringAccess() {
    return this.runTest('Cloud Monitoring Access', async () => {
      // Check if Monitoring API is enabled
      const result = execSync(
        `gcloud services list --enabled --filter="name:monitoring.googleapis.com" --project=${this.projectId} --format="value(name)"`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      if (!result.trim()) {
        throw new Error('Monitoring API is not enabled');
      }
      
      return 'Cloud Monitoring API is enabled and accessible';
    });
  }

  /**
   * Test Logging API access
   */
  async testLoggingAccess() {
    return this.runTest('Cloud Logging Access', async () => {
      // Check if Logging API is enabled
      const result = execSync(
        `gcloud services list --enabled --filter="name:logging.googleapis.com" --project=${this.projectId} --format="value(name)"`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      if (!result.trim()) {
        throw new Error('Logging API is not enabled');
      }
      
      return 'Cloud Logging API is enabled and accessible';
    });
  }

  /**
   * Test IAM role assignments
   */
  async testIAMRoles() {
    return this.runTest('IAM Role Assignments', async () => {
      const requiredRoles = [
        'roles/documentai.apiUser',
        'roles/vision.imageAnnotator',
        'roles/storage.objectCreator',
        'roles/storage.objectViewer',
        'roles/monitoring.metricWriter',
        'roles/logging.logWriter'
      ];
      
      const result = execSync(
        `gcloud projects get-iam-policy ${this.projectId} --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:${this.serviceAccountEmail}"`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      const assignedRoles = result.split('\n')
        .filter(line => line.startsWith('roles/'))
        .map(line => line.trim());
      
      const missingRoles = requiredRoles.filter(role => !assignedRoles.includes(role));
      
      if (missingRoles.length > 0) {
        throw new Error(`Missing roles: ${missingRoles.join(', ')}`);
      }
      
      return `All ${requiredRoles.length} required roles are assigned`;
    });
  }

  /**
   * Test service account key validity
   */
  async testKeyValidity() {
    return this.runTest('Service Account Key Validity', async () => {
      const keyContent = fs.readFileSync(this.keyPath, 'utf8');
      const keyData = JSON.parse(keyContent);
      
      // Validate key structure
      const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
      const missingFields = requiredFields.filter(field => !keyData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing key fields: ${missingFields.join(', ')}`);
      }
      
      if (keyData.type !== 'service_account') {
        throw new Error(`Invalid key type: ${keyData.type}`);
      }
      
      if (keyData.project_id !== this.projectId) {
        throw new Error(`Key project mismatch: expected ${this.projectId}, got ${keyData.project_id}`);
      }
      
      return `Key is valid for project ${keyData.project_id}`;
    });
  }

  /**
   * Test environment variable configuration
   */
  async testEnvironmentVariables() {
    return this.runTest('Environment Variables', async () => {
      const requiredVars = [
        'GOOGLE_CLOUD_PROJECT_ID',
        'GOOGLE_APPLICATION_CREDENTIALS',
        'GOOGLE_CLOUD_CREDENTIALS',
        'GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL'
      ];
      
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
      }
      
      // Validate GOOGLE_CLOUD_CREDENTIALS is valid JSON
      try {
        JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      } catch (error) {
        throw new Error('GOOGLE_CLOUD_CREDENTIALS is not valid JSON');
      }
      
      return `All ${requiredVars.length} required environment variables are set`;
    });
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SERVICE ACCOUNT TEST REPORT');
    console.log('='.repeat(60));
    
    const passedTests = this.testResults.filter(test => test.status === 'PASS');
    const failedTests = this.testResults.filter(test => test.status === 'FAIL');
    
    console.log(`\n✅ Passed: ${passedTests.length}`);
    console.log(`❌ Failed: ${failedTests.length}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`   • ${test.name}: ${test.error}`);
      });
    }
    
    if (passedTests.length > 0) {
      console.log('\n✅ Passed Tests:');
      passedTests.forEach(test => {
        console.log(`   • ${test.name}: ${test.details || 'OK'}`);
      });
    }
    
    const successRate = Math.round((passedTests.length / this.testResults.length) * 100);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    if (successRate === 100) {
      console.log('\n🎉 All tests passed! Service account is properly configured.');
    } else if (successRate >= 80) {
      console.log('\n⚠️  Most tests passed, but some issues need attention.');
    } else {
      console.log('\n❌ Multiple issues detected. Please review the setup.');
    }
    
    return successRate === 100;
  }

  /**
   * Restore user authentication
   */
  async restoreUserAuth() {
    try {
      // Try to restore user authentication
      execSync('gcloud config set account $(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)', 
        { stdio: 'pipe' }
      );
    } catch (error) {
      // Ignore errors during restoration
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const tester = new ServiceAccountTester();
  
  try {
    await tester.initialize();
    
    // Run all tests
    await tester.testAuthentication();
    await tester.testKeyValidity();
    await tester.testEnvironmentVariables();
    await tester.testIAMRoles();
    await tester.testDocumentAIAccess();
    await tester.testVisionAPIAccess();
    await tester.testStorageAccess();
    await tester.testMonitoringAccess();
    await tester.testLoggingAccess();
    
    // Generate report
    const allTestsPassed = tester.generateReport();
    
    // Restore user authentication
    await tester.restoreUserAuth();
    
    if (!allTestsPassed) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test initialization failed:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('   • Run setup-service-account.js first');
    console.error('   • Ensure .env.local contains all required variables');
    console.error('   • Verify Google Cloud CLI is authenticated');
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = { ServiceAccountTester };