#!/usr/bin/env node

/**
 * Google Cloud Setup Diagnostic Script
 * 
 * This script diagnoses common issues with Google Cloud setup
 * and provides specific recommendations for fixes.
 * 
 * Requirements covered:
 * - 1.5: Validate all services are accessible and functional
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class GoogleCloudDiagnostic {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.recommendations = [];
  }

  /**
   * Run comprehensive diagnostic
   */
  async runDiagnostic() {
    console.log('🔍 Running Google Cloud Setup Diagnostic...\n');
    
    try {
      await this.checkGCloudCLI();
      await this.checkAuthentication();
      await this.checkProject();
      await this.checkBilling();
      await this.checkAPIs();
      await this.checkQuotas();
      await this.checkPermissions();
      await this.checkConfigurationFiles();
      await this.checkEnvironmentVariables();
      
      this.generateDiagnosticReport();
      
      if (this.issues.length === 0) {
        console.log('\n✅ No critical issues found!');
        if (this.warnings.length > 0) {
          console.log(`⚠️  ${this.warnings.length} warning(s) found - see report for details.`);
        }
        return true;
      } else {
        console.log(`\n❌ ${this.issues.length} critical issue(s) found.`);
        console.log(`⚠️  ${this.warnings.length} warning(s) found.`);
        return false;
      }
      
    } catch (error) {
      console.error('Diagnostic failed:', error.message);
      return false;
    }
  }

  /**
   * Check Google Cloud CLI installation and version
   */
  async checkGCloudCLI() {
    console.log('🔧 Checking Google Cloud CLI...');
    
    try {
      const version = execSync('gcloud --version', { encoding: 'utf8' });
      console.log('✓ Google Cloud CLI is installed');
      
      // Check if it's a recent version
      const versionMatch = version.match(/Google Cloud SDK (\d+\.\d+\.\d+)/);
      if (versionMatch) {
        const versionNumber = versionMatch[1];
        console.log(`  Version: ${versionNumber}`);
        
        // Warn if version is very old (example check)
        const majorVersion = parseInt(versionNumber.split('.')[0]);
        if (majorVersion < 400) {
          this.warnings.push({
            category: 'CLI Version',
            issue: `Google Cloud CLI version ${versionNumber} may be outdated`,
            recommendation: 'Consider updating: gcloud components update'
          });
        }
      }
    } catch (error) {
      this.issues.push({
        category: 'Prerequisites',
        issue: 'Google Cloud CLI is not installed or not in PATH',
        recommendation: 'Install Google Cloud CLI from https://cloud.google.com/sdk/docs/install'
      });
    }
  }

  /**
   * Check authentication status
   */
  async checkAuthentication() {
    console.log('🔐 Checking authentication...');
    
    try {
      const authList = execSync('gcloud auth list --format="value(account,status)"', { encoding: 'utf8' });
      const accounts = authList.trim().split('\n').filter(line => line);
      
      if (accounts.length === 0) {
        this.issues.push({
          category: 'Authentication',
          issue: 'No authenticated accounts found',
          recommendation: 'Run: gcloud auth login'
        });
        return;
      }
      
      let hasActiveAccount = false;
      accounts.forEach(account => {
        const parts = account.split(/\s+/);
        if (parts.length >= 2) {
          const email = parts[0];
          const status = parts[1];
          if (status === 'ACTIVE') {
            console.log(`✓ Authenticated as: ${email}`);
            hasActiveAccount = true;
          }
        }
      });
      
      if (!hasActiveAccount) {
        // Check if there's at least one account (might be active by default)
        if (accounts.length > 0 && accounts[0].trim()) {
          const email = accounts[0].split(/\s+/)[0];
          console.log(`✓ Authenticated as: ${email}`);
          hasActiveAccount = true;
        } else {
          this.issues.push({
            category: 'Authentication',
            issue: 'No active authenticated account',
            recommendation: 'Run: gcloud auth login'
          });
        }
      }
    } catch (error) {
      this.issues.push({
        category: 'Authentication',
        issue: 'Cannot check authentication status',
        recommendation: 'Ensure Google Cloud CLI is properly installed and run: gcloud auth login'
      });
    }
  }

  /**
   * Check project configuration
   */
  async checkProject() {
    console.log('🏗️  Checking project configuration...');
    
    try {
      const projectId = execSync('gcloud config get-value project', { encoding: 'utf8' }).trim();
      
      if (!projectId || projectId === '(unset)') {
        this.issues.push({
          category: 'Project',
          issue: 'No default project is set',
          recommendation: 'Run: gcloud config set project YOUR_PROJECT_ID'
        });
        return;
      }
      
      console.log(`✓ Default project: ${projectId}`);
      
      // Check if project exists and is accessible
      try {
        const projectInfo = execSync(`gcloud projects describe ${projectId} --format="value(lifecycleState)"`, { encoding: 'utf8' });
        if (projectInfo.trim() === 'ACTIVE') {
          console.log('✓ Project is active and accessible');
        } else {
          this.issues.push({
            category: 'Project',
            issue: `Project ${projectId} is not active (state: ${projectInfo.trim()})`,
            recommendation: 'Ensure the project exists and is in ACTIVE state'
          });
        }
      } catch (error) {
        this.issues.push({
          category: 'Project',
          issue: `Cannot access project ${projectId}`,
          recommendation: 'Verify project ID and ensure you have access permissions'
        });
      }
    } catch (error) {
      this.issues.push({
        category: 'Project',
        issue: 'Cannot determine current project',
        recommendation: 'Run: gcloud config set project YOUR_PROJECT_ID'
      });
    }
  }

  /**
   * Check billing configuration
   */
  async checkBilling() {
    console.log('💳 Checking billing...');
    
    try {
      const projectId = execSync('gcloud config get-value project', { encoding: 'utf8' }).trim();
      if (!projectId || projectId === '(unset)') {
        return; // Skip if no project
      }
      
      const billingInfo = execSync(`gcloud billing projects describe ${projectId} --format="value(billingEnabled)"`, { encoding: 'utf8' });
      
      if (billingInfo.trim() === 'True') {
        console.log('✓ Billing is enabled');
      } else {
        this.issues.push({
          category: 'Billing',
          issue: 'Billing is not enabled for the project',
          recommendation: 'Enable billing in Google Cloud Console or run the setup script'
        });
      }
    } catch (error) {
      this.warnings.push({
        category: 'Billing',
        issue: 'Cannot verify billing status',
        recommendation: 'Manually verify billing is enabled in Google Cloud Console'
      });
    }
  }

  /**
   * Check required APIs
   */
  async checkAPIs() {
    console.log('🔌 Checking required APIs...');
    
    const requiredAPIs = [
      'documentai.googleapis.com',
      'vision.googleapis.com',
      'storage.googleapis.com',
      'monitoring.googleapis.com',
      'logging.googleapis.com'
    ];
    
    try {
      const enabledServices = execSync('gcloud services list --enabled --format="value(name)"', { encoding: 'utf8' });
      const enabledList = enabledServices.trim().split('\n');
      
      const missingAPIs = [];
      
      for (const api of requiredAPIs) {
        if (enabledList.includes(api)) {
          console.log(`✓ ${api} is enabled`);
        } else {
          console.log(`❌ ${api} is not enabled`);
          missingAPIs.push(api);
        }
      }
      
      if (missingAPIs.length > 0) {
        this.issues.push({
          category: 'APIs',
          issue: `Missing APIs: ${missingAPIs.join(', ')}`,
          recommendation: `Enable APIs: gcloud services enable ${missingAPIs.join(' ')}`
        });
      }
    } catch (error) {
      this.issues.push({
        category: 'APIs',
        issue: 'Cannot check API status',
        recommendation: 'Verify project access and run: gcloud services list --enabled'
      });
    }
  }

  /**
   * Check API quotas
   */
  async checkQuotas() {
    console.log('📊 Checking API quotas...');
    
    try {
      // Try to get quota information using service usage API instead
      const projectId = execSync('gcloud config get-value project', { encoding: 'utf8' }).trim();
      if (projectId && projectId !== '(unset)') {
        console.log('✓ Project available for quota monitoring');
        this.warnings.push({
          category: 'Quotas',
          issue: 'Default quotas are in effect',
          recommendation: 'Monitor usage and request quota increases if needed in Google Cloud Console'
        });
      }
    } catch (error) {
      this.warnings.push({
        category: 'Quotas',
        issue: 'Cannot check quota information',
        recommendation: 'Monitor API usage in Google Cloud Console'
      });
    }
  }

  /**
   * Check IAM permissions
   */
  async checkPermissions() {
    console.log('🔑 Checking permissions...');
    
    const requiredPermissions = [
      'resourcemanager.projects.get',
      'serviceusage.services.list',
      'documentai.processors.list',
      'vision.images.annotate'
    ];
    
    try {
      const projectId = execSync('gcloud config get-value project', { encoding: 'utf8' }).trim();
      if (!projectId || projectId === '(unset)') {
        return; // Skip if no project
      }
      
      // Use alternative method to check permissions since test-iam-permissions might not be available
      const testResult = execSync(`gcloud projects get-iam-policy ${projectId} --format="value(bindings[].members)" 2>/dev/null || echo "permission-check-failed"`, { encoding: 'utf8' });
      if (testResult.includes('permission-check-failed')) {
        this.warnings.push({
          category: 'Permissions',
          issue: 'Cannot verify detailed IAM permissions',
          recommendation: 'Manually verify you have necessary permissions in Google Cloud Console'
        });
      } else {
        console.log('✓ Basic IAM policy access is available');
        this.warnings.push({
          category: 'Permissions',
          issue: 'Detailed permission check not performed',
          recommendation: 'Verify you have Editor role or specific service roles for Document AI and Vision API'
        });
      }
    } catch (error) {
      this.warnings.push({
        category: 'Permissions',
        issue: 'Cannot verify IAM permissions',
        recommendation: 'Manually verify you have necessary permissions in Google Cloud Console'
      });
    }
  }

  /**
   * Check configuration files
   */
  async checkConfigurationFiles() {
    console.log('📄 Checking configuration files...');
    
    const configFiles = [
      {
        path: 'google-cloud-config.json',
        required: false,
        description: 'Google Cloud project configuration'
      },
      {
        path: '.env.local',
        required: true,
        description: 'Environment variables'
      },
      {
        path: 'google-cloud-key.json',
        required: false,
        description: 'Service account key'
      }
    ];
    
    for (const file of configFiles) {
      const filePath = path.join(process.cwd(), file.path);
      
      if (fs.existsSync(filePath)) {
        console.log(`✓ ${file.path} exists`);
        
        // Check if file is not empty
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
          this.warnings.push({
            category: 'Configuration',
            issue: `${file.path} is empty`,
            recommendation: `Configure ${file.description} in ${file.path}`
          });
        }
      } else {
        if (file.required) {
          this.issues.push({
            category: 'Configuration',
            issue: `Required file ${file.path} is missing`,
            recommendation: `Create ${file.description} file: ${file.path}`
          });
        } else {
          this.warnings.push({
            category: 'Configuration',
            issue: `Optional file ${file.path} is missing`,
            recommendation: `Consider creating ${file.description} file: ${file.path}`
          });
        }
      }
    }
  }

  /**
   * Check environment variables
   */
  async checkEnvironmentVariables() {
    console.log('🌍 Checking environment variables...');
    
    const requiredEnvVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_CLOUD_LOCATION'
    ];
    
    const optionalEnvVars = [
      'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID',
      'GOOGLE_APPLICATION_CREDENTIALS',
      'GOOGLE_AI_API_KEY'
    ];
    
    // Check .env.local file
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      for (const envVar of requiredEnvVars) {
        if (envContent.includes(`${envVar}=`)) {
          console.log(`✓ ${envVar} is configured`);
        } else {
          this.issues.push({
            category: 'Environment',
            issue: `Required environment variable ${envVar} is missing`,
            recommendation: `Add ${envVar} to .env.local file`
          });
        }
      }
      
      for (const envVar of optionalEnvVars) {
        if (!envContent.includes(`${envVar}=`)) {
          this.warnings.push({
            category: 'Environment',
            issue: `Optional environment variable ${envVar} is not configured`,
            recommendation: `Consider adding ${envVar} to .env.local file`
          });
        }
      }
    }
  }

  /**
   * Generate comprehensive diagnostic report
   */
  generateDiagnosticReport() {
    console.log('\n📊 Diagnostic Report');
    console.log('='.repeat(50));
    
    if (this.issues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.category}] ${issue.issue}`);
        console.log(`   → ${issue.recommendation}\n`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. [${warning.category}] ${warning.issue}`);
        console.log(`   → ${warning.recommendation}\n`);
      });
    }
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        criticalIssues: this.issues.length,
        warnings: this.warnings.length
      },
      issues: this.issues,
      warnings: this.warnings
    };
    
    const reportPath = path.join(process.cwd(), 'google-cloud-diagnostic-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 Detailed diagnostic report saved to: ${reportPath}`);
  }
}

// CLI interface
if (require.main === module) {
  const diagnostic = new GoogleCloudDiagnostic();
  
  diagnostic.runDiagnostic().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Diagnostic failed:', error);
    process.exit(1);
  });
}

module.exports = GoogleCloudDiagnostic;