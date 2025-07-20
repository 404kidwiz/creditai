#!/usr/bin/env node

/**
 * Google Cloud Project Validation Script
 * 
 * This script validates that a Google Cloud project is properly configured
 * with all required services and settings for PDF processing.
 * 
 * Requirements covered:
 * - 1.5: Validate all Google Cloud services are accessible and functional
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration constants
const REQUIRED_APIS = [
  'documentai.googleapis.com',
  'vision.googleapis.com',
  'storage.googleapis.com',
  'monitoring.googleapis.com',
  'logging.googleapis.com',
  'cloudbilling.googleapis.com',
  'cloudresourcemanager.googleapis.com'
];

class GoogleCloudProjectValidator {
  constructor(projectId = null) {
    this.projectId = projectId;
    this.validationResults = {
      project: false,
      billing: false,
      apis: {},
      authentication: false,
      permissions: false,
      overall: false
    };
  }

  /**
   * Main validation orchestration method
   */
  async validate() {
    try {
      console.log('🔍 Starting Google Cloud Project Validation...\n');
      
      // Get project ID if not provided
      if (!this.projectId) {
        this.projectId = await this.getCurrentProject();
      }
      
      console.log(`Validating project: ${this.projectId}\n`);
      
      // Run all validation checks
      await this.validateProject();
      await this.validateBilling();
      await this.validateAPIs();
      await this.validateAuthentication();
      await this.validatePermissions();
      
      // Generate validation report
      this.generateValidationReport();
      
      // Determine overall status
      this.validationResults.overall = this.calculateOverallStatus();
      
      if (this.validationResults.overall) {
        console.log('\n✅ All validations passed! Google Cloud project is ready.');
        return true;
      } else {
        console.log('\n❌ Some validations failed. Please review the issues above.');
        return false;
      }
      
    } catch (error) {
      console.error('\n❌ Validation failed:', error.message);
      return false;
    }
  }

  /**
   * Get current project ID from gcloud config
   */
  async getCurrentProject() {
    try {
      const projectId = execSync('gcloud config get-value project', { encoding: 'utf8' }).trim();
      if (!projectId || projectId === '(unset)') {
        throw new Error('No project is set. Please run: gcloud config set project YOUR_PROJECT_ID');
      }
      return projectId;
    } catch (error) {
      throw new Error('Failed to get current project ID');
    }
  }

  /**
   * Validate project exists and is accessible
   */
  async validateProject() {
    console.log('🏗️  Validating project...');
    
    try {
      const projectInfo = execSync(`gcloud projects describe ${this.projectId} --format="json"`, { encoding: 'utf8' });
      const project = JSON.parse(projectInfo);
      
      if (project.lifecycleState === 'ACTIVE') {
        console.log(`✓ Project ${this.projectId} is active`);
        console.log(`  Name: ${project.name}`);
        console.log(`  Number: ${project.projectNumber}`);
        this.validationResults.project = true;
      } else {
        console.log(`❌ Project ${this.projectId} is not active (state: ${project.lifecycleState})`);
        this.validationResults.project = false;
      }
    } catch (error) {
      console.log(`❌ Project ${this.projectId} is not accessible or does not exist`);
      this.validationResults.project = false;
    }
  }

  /**
   * Validate billing is enabled
   */
  async validateBilling() {
    console.log('\n💳 Validating billing...');
    
    try {
      const billingInfo = execSync(`gcloud billing projects describe ${this.projectId} --format="json"`, { encoding: 'utf8' });
      const billing = JSON.parse(billingInfo);
      
      if (billing.billingEnabled) {
        console.log('✓ Billing is enabled');
        console.log(`  Billing Account: ${billing.billingAccountName}`);
        this.validationResults.billing = true;
      } else {
        console.log('❌ Billing is not enabled');
        this.validationResults.billing = false;
      }
    } catch (error) {
      console.log('❌ Could not validate billing status');
      this.validationResults.billing = false;
    }
  }

  /**
   * Validate all required APIs are enabled
   */
  async validateAPIs() {
    console.log('\n🔌 Validating APIs...');
    
    try {
      const enabledServices = execSync(`gcloud services list --enabled --format="value(name)"`, { encoding: 'utf8' });
      const enabledList = enabledServices.trim().split('\n');
      
      for (const api of REQUIRED_APIS) {
        if (enabledList.includes(api)) {
          console.log(`✓ ${api} is enabled`);
          this.validationResults.apis[api] = true;
        } else {
          console.log(`❌ ${api} is not enabled`);
          this.validationResults.apis[api] = false;
        }
      }
    } catch (error) {
      console.log('❌ Could not validate API status');
      for (const api of REQUIRED_APIS) {
        this.validationResults.apis[api] = false;
      }
    }
  }

  /**
   * Validate authentication
   */
  async validateAuthentication() {
    console.log('\n🔐 Validating authentication...');
    
    try {
      const authList = execSync('gcloud auth list --format="value(account,status)"', { encoding: 'utf8' });
      const accounts = authList.trim().split('\n');
      
      let hasActiveAccount = false;
      accounts.forEach(account => {
        const [email, status] = account.split('\t');
        if (status === 'ACTIVE') {
          console.log(`✓ Authenticated as: ${email}`);
          hasActiveAccount = true;
        }
      });
      
      if (hasActiveAccount) {
        this.validationResults.authentication = true;
      } else {
        console.log('❌ No active authentication found');
        this.validationResults.authentication = false;
      }
    } catch (error) {
      console.log('❌ Could not validate authentication');
      this.validationResults.authentication = false;
    }
  }

  /**
   * Validate permissions for key operations
   */
  async validatePermissions() {
    console.log('\n🔑 Validating permissions...');
    
    const permissions = [
      'resourcemanager.projects.get',
      'serviceusage.services.list',
      'documentai.processors.list',
      'vision.images.annotate',
      'storage.buckets.list',
      'monitoring.metricDescriptors.list',
      'logging.logs.list'
    ];
    
    try {
      const testResult = execSync(`gcloud projects test-iam-permissions ${this.projectId} --permissions="${permissions.join(',')}" --format="value(permissions)"`, { encoding: 'utf8' });
      const grantedPermissions = testResult.trim().split('\n').filter(p => p);
      
      let allPermissionsGranted = true;
      permissions.forEach(permission => {
        if (grantedPermissions.includes(permission)) {
          console.log(`✓ ${permission}`);
        } else {
          console.log(`❌ ${permission} - missing`);
          allPermissionsGranted = false;
        }
      });
      
      this.validationResults.permissions = allPermissionsGranted;
    } catch (error) {
      console.log('❌ Could not validate permissions');
      this.validationResults.permissions = false;
    }
  }

  /**
   * Generate detailed validation report
   */
  generateValidationReport() {
    console.log('\n📊 Validation Report');
    console.log('==================');
    
    console.log(`Project Status: ${this.validationResults.project ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Billing Status: ${this.validationResults.billing ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Authentication: ${this.validationResults.authentication ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Permissions: ${this.validationResults.permissions ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log('\nAPI Status:');
    for (const [api, status] of Object.entries(this.validationResults.apis)) {
      console.log(`  ${api}: ${status ? '✅ ENABLED' : '❌ DISABLED'}`);
    }
    
    // Save validation report to file
    const reportData = {
      projectId: this.projectId,
      validationDate: new Date().toISOString(),
      results: this.validationResults
    };
    
    const reportPath = path.join(process.cwd(), 'google-cloud-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Calculate overall validation status
   */
  calculateOverallStatus() {
    const apiResults = Object.values(this.validationResults.apis);
    const allAPIsEnabled = apiResults.length > 0 && apiResults.every(status => status);
    
    return this.validationResults.project &&
           this.validationResults.billing &&
           this.validationResults.authentication &&
           this.validationResults.permissions &&
           allAPIsEnabled;
  }

  /**
   * Get validation suggestions for failed checks
   */
  getValidationSuggestions() {
    const suggestions = [];
    
    if (!this.validationResults.project) {
      suggestions.push('• Create or select a valid Google Cloud project');
    }
    
    if (!this.validationResults.billing) {
      suggestions.push('• Enable billing for the project in Google Cloud Console');
    }
    
    if (!this.validationResults.authentication) {
      suggestions.push('• Run: gcloud auth login');
    }
    
    if (!this.validationResults.permissions) {
      suggestions.push('• Ensure your account has necessary IAM permissions');
    }
    
    for (const [api, status] of Object.entries(this.validationResults.apis)) {
      if (!status) {
        suggestions.push(`• Enable ${api}: gcloud services enable ${api}`);
      }
    }
    
    return suggestions;
  }
}

// CLI interface
if (require.main === module) {
  const projectId = process.argv[2];
  const validator = new GoogleCloudProjectValidator(projectId);
  
  validator.validate().then(success => {
    if (!success) {
      console.log('\n💡 Suggestions to fix issues:');
      const suggestions = validator.getValidationSuggestions();
      suggestions.forEach(suggestion => console.log(suggestion));
      process.exit(1);
    }
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = GoogleCloudProjectValidator;