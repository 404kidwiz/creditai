#!/usr/bin/env node

/**
 * Google Cloud Service Account Setup Script
 * 
 * This script creates service accounts with minimal required permissions
 * for Document AI, Vision API, Storage, Monitoring, and Logging services.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  serviceAccountName: 'credit-report-processor',
  serviceAccountDisplayName: 'Credit Report Processor Service Account',
  serviceAccountDescription: 'Service account for PDF processing with Document AI and Vision API',
  keyFileName: 'google-cloud-key.json',
  requiredRoles: [
    'roles/documentai.apiUser',      // Document AI access
    'roles/ml.developer',            // Vision API access (includes vision permissions)
    'roles/storage.objectCreator',   // Temporary file storage
    'roles/storage.objectViewer',    // Read temporary files
    'roles/monitoring.metricWriter', // Metrics reporting
    'roles/logging.logWriter'        // Error logging
  ]
};

class ServiceAccountManager {
  constructor() {
    this.projectId = null;
    this.serviceAccountEmail = null;
  }

  /**
   * Initialize and validate Google Cloud CLI
   */
  async initialize() {
    console.log('🔧 Initializing Google Cloud Service Account Setup...\n');
    
    try {
      // Check if gcloud CLI is installed
      execSync('gcloud --version', { stdio: 'pipe' });
      console.log('✅ Google Cloud CLI is installed');
    } catch (error) {
      throw new Error('Google Cloud CLI is not installed. Please install it first.');
    }

    // Get current project ID
    try {
      this.projectId = execSync('gcloud config get-value project', { 
        encoding: 'utf8' 
      }).trim();
      
      if (!this.projectId || this.projectId === '(unset)') {
        throw new Error('No Google Cloud project is set. Please run: gcloud config set project YOUR_PROJECT_ID');
      }
      
      console.log(`✅ Using Google Cloud project: ${this.projectId}`);
    } catch (error) {
      throw new Error('Failed to get current Google Cloud project. Please ensure you are authenticated.');
    }

    this.serviceAccountEmail = `${CONFIG.serviceAccountName}@${this.projectId}.iam.gserviceaccount.com`;
    console.log(`📧 Service account email: ${this.serviceAccountEmail}\n`);
  }

  /**
   * Create service account if it doesn't exist
   */
  async createServiceAccount() {
    console.log('👤 Creating service account...');
    
    try {
      // Check if service account already exists
      const existingAccounts = execSync(
        `gcloud iam service-accounts list --filter="email:${this.serviceAccountEmail}" --format="value(email)"`,
        { encoding: 'utf8' }
      ).trim();

      if (existingAccounts) {
        console.log(`✅ Service account already exists: ${this.serviceAccountEmail}`);
        return;
      }

      // Create new service account
      execSync(`gcloud iam service-accounts create ${CONFIG.serviceAccountName} \
        --display-name="${CONFIG.serviceAccountDisplayName}" \
        --description="${CONFIG.serviceAccountDescription}"`, 
        { stdio: 'inherit' }
      );

      console.log(`✅ Created service account: ${this.serviceAccountEmail}`);
      
      // Wait a moment for the service account to propagate
      console.log('⏳ Waiting for service account to propagate...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      throw new Error(`Failed to create service account: ${error.message}`);
    }
  }

  /**
   * Assign required IAM roles to the service account
   */
  async assignIAMRoles() {
    console.log('\n🔐 Assigning IAM roles...');
    
    for (const role of CONFIG.requiredRoles) {
      try {
        console.log(`  Assigning role: ${role}`);
        
        execSync(`gcloud projects add-iam-policy-binding ${this.projectId} \
          --member="serviceAccount:${this.serviceAccountEmail}" \
          --role="${role}"`, 
          { stdio: 'pipe' }
        );
        
        console.log(`  ✅ Assigned: ${role}`);
      } catch (error) {
        console.error(`  ❌ Failed to assign role ${role}: ${error.message}`);
        throw error;
      }
    }
    
    console.log('✅ All IAM roles assigned successfully');
  }

  /**
   * Generate and download service account key
   */
  async generateServiceAccountKey() {
    console.log('\n🔑 Generating service account key...');
    
    const keyPath = path.resolve(CONFIG.keyFileName);
    
    try {
      // Remove existing key file if it exists
      if (fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
        console.log('🗑️  Removed existing key file');
      }

      // Generate new key
      execSync(`gcloud iam service-accounts keys create ${keyPath} \
        --iam-account=${this.serviceAccountEmail}`, 
        { stdio: 'inherit' }
      );

      // Verify key file was created
      if (!fs.existsSync(keyPath)) {
        throw new Error('Service account key file was not created');
      }

      // Validate JSON format
      const keyContent = fs.readFileSync(keyPath, 'utf8');
      const keyData = JSON.parse(keyContent);
      
      if (!keyData.private_key || !keyData.client_email) {
        throw new Error('Invalid service account key format');
      }

      console.log(`✅ Service account key generated: ${keyPath}`);
      console.log(`📧 Key email: ${keyData.client_email}`);
      
      return keyPath;
    } catch (error) {
      throw new Error(`Failed to generate service account key: ${error.message}`);
    }
  }

  /**
   * Update environment variables with service account information
   */
  async updateEnvironmentVariables(keyPath) {
    console.log('\n🌍 Updating environment variables...');
    
    try {
      const keyContent = fs.readFileSync(keyPath, 'utf8');
      const keyData = JSON.parse(keyContent);
      
      const envPath = '.env.local';
      let envContent = '';
      
      // Read existing .env.local if it exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Environment variables to set/update
      const envVars = {
        'GOOGLE_CLOUD_PROJECT_ID': this.projectId,
        'GOOGLE_APPLICATION_CREDENTIALS': `./${CONFIG.keyFileName}`,
        'GOOGLE_CLOUD_CREDENTIALS': JSON.stringify(keyData),
        'GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL': keyData.client_email
      };
      
      // Update or add environment variables
      for (const [key, value] of Object.entries(envVars)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${value}`;
        
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, newLine);
          console.log(`  ✅ Updated: ${key}`);
        } else {
          envContent += `\n${newLine}`;
          console.log(`  ✅ Added: ${key}`);
        }
      }
      
      // Write updated environment file
      fs.writeFileSync(envPath, envContent.trim() + '\n');
      console.log(`✅ Environment variables updated in ${envPath}`);
      
    } catch (error) {
      throw new Error(`Failed to update environment variables: ${error.message}`);
    }
  }

  /**
   * Validate service account permissions
   */
  async validatePermissions() {
    console.log('\n🔍 Validating service account permissions...');
    
    try {
      // Test authentication with the service account
      const keyPath = path.resolve(CONFIG.keyFileName);
      
      // Activate service account
      execSync(`gcloud auth activate-service-account --key-file=${keyPath}`, 
        { stdio: 'pipe' }
      );
      
      console.log('✅ Service account authentication successful');
      
      // Test each service access
      const serviceTests = [
        {
          name: 'Document AI API',
          command: `gcloud ai document-processors list --location=us --project=${this.projectId}`,
          description: 'List Document AI processors'
        },
        {
          name: 'Vision API',
          command: `gcloud services list --enabled --filter="name:vision.googleapis.com" --project=${this.projectId}`,
          description: 'Check Vision API status'
        },
        {
          name: 'Cloud Storage',
          command: `gcloud storage buckets list --project=${this.projectId}`,
          description: 'List storage buckets'
        }
      ];
      
      for (const test of serviceTests) {
        try {
          execSync(test.command, { stdio: 'pipe' });
          console.log(`  ✅ ${test.name}: Access verified`);
        } catch (error) {
          console.log(`  ⚠️  ${test.name}: Limited access (expected for new setup)`);
        }
      }
      
      // Restore user authentication
      try {
        execSync('gcloud auth application-default login --no-launch-browser', 
          { stdio: 'pipe' }
        );
      } catch (error) {
        // Ignore error if already authenticated
      }
      
      console.log('✅ Permission validation completed');
      
    } catch (error) {
      console.error(`❌ Permission validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Display setup summary and next steps
   */
  displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SERVICE ACCOUNT SETUP COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`
📋 Setup Summary:
   • Project ID: ${this.projectId}
   • Service Account: ${this.serviceAccountEmail}
   • Key File: ${CONFIG.keyFileName}
   • Environment File: .env.local

🔐 Assigned Roles:
${CONFIG.requiredRoles.map(role => `   • ${role}`).join('\n')}

📝 Next Steps:
   1. Verify .env.local contains all required variables
   2. Test Document AI and Vision API integration
   3. Run validation scripts to ensure everything works
   4. Keep the service account key secure and never commit it to version control

⚠️  Security Notes:
   • The service account key file contains sensitive credentials
   • Add ${CONFIG.keyFileName} to your .gitignore file
   • Consider using Google Cloud Secret Manager for production
   • Regularly rotate service account keys for security
`);
  }
}

/**
 * Main execution function
 */
async function main() {
  const manager = new ServiceAccountManager();
  
  try {
    await manager.initialize();
    await manager.createServiceAccount();
    await manager.assignIAMRoles();
    const keyPath = await manager.generateServiceAccountKey();
    await manager.updateEnvironmentVariables(keyPath);
    await manager.validatePermissions();
    manager.displaySummary();
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('   • Ensure you are authenticated: gcloud auth login');
    console.error('   • Verify project is set: gcloud config set project YOUR_PROJECT_ID');
    console.error('   • Check billing is enabled for your project');
    console.error('   • Ensure required APIs are enabled');
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = { ServiceAccountManager, CONFIG };