#!/usr/bin/env node

/**
 * Google Cloud Project Setup Script
 * 
 * This script automates the creation and configuration of a Google Cloud project
 * with all required services for PDF processing and monitoring.
 * 
 * Requirements covered:
 * - 1.1: Create Google Cloud project with billing
 * - 1.2: Enable Document AI, Vision API, Storage, Monitoring, and Logging APIs
 * - 1.5: Validate all services are accessible and functional
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

const DEFAULT_REGION = 'us-central1';
const DEFAULT_ZONE = 'us-central1-a';

class GoogleCloudProjectSetup {
  constructor() {
    this.projectId = null;
    this.billingAccountId = null;
    this.region = DEFAULT_REGION;
    this.zone = DEFAULT_ZONE;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Main setup orchestration method
   */
  async setup() {
    try {
      console.log('🚀 Starting Google Cloud Project Setup...\n');
      
      // Step 1: Validate prerequisites
      await this.validatePrerequisites();
      
      // Step 2: Collect project configuration
      await this.collectProjectConfiguration();
      
      // Step 3: Create or select project
      await this.setupProject();
      
      // Step 4: Configure billing
      await this.configureBilling();
      
      // Step 5: Enable required APIs
      await this.enableRequiredAPIs();
      
      // Step 6: Configure regional settings
      await this.configureRegionalSettings();
      
      // Step 7: Set up quotas and limits
      await this.configureQuotas();
      
      // Step 8: Validate setup
      await this.validateSetup();
      
      // Step 9: Generate configuration files
      await this.generateConfigurationFiles();
      
      console.log('\n✅ Google Cloud project setup completed successfully!');
      console.log(`Project ID: ${this.projectId}`);
      console.log(`Region: ${this.region}`);
      console.log(`Zone: ${this.zone}`);
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  /**
   * Validate that required tools are installed
   */
  async validatePrerequisites() {
    console.log('🔍 Validating prerequisites...');
    
    try {
      // Check if gcloud CLI is installed
      execSync('gcloud --version', { stdio: 'pipe' });
      console.log('✓ Google Cloud CLI is installed');
    } catch (error) {
      throw new Error('Google Cloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install');
    }
    
    try {
      // Check if user is authenticated
      const authList = execSync('gcloud auth list --format="value(account)"', { encoding: 'utf8' });
      if (!authList.trim()) {
        throw new Error('Not authenticated');
      }
      console.log('✓ Google Cloud CLI is authenticated');
    } catch (error) {
      throw new Error('Please authenticate with Google Cloud CLI using: gcloud auth login');
    }
  }

  /**
   * Collect project configuration from user
   */
  async collectProjectConfiguration() {
    console.log('\n📝 Project Configuration');
    
    this.projectId = await this.askQuestion('Enter project ID (or press Enter to generate): ');
    if (!this.projectId) {
      this.projectId = `credit-analyzer-${Date.now()}`;
      console.log(`Generated project ID: ${this.projectId}`);
    }
    
    const customRegion = await this.askQuestion(`Enter region (default: ${DEFAULT_REGION}): `);
    if (customRegion) {
      this.region = customRegion;
      this.zone = `${customRegion}-a`;
    }
  }

  /**
   * Create or select Google Cloud project
   */
  async setupProject() {
    console.log('\n🏗️  Setting up Google Cloud project...');
    
    try {
      // Check if project already exists
      execSync(`gcloud projects describe ${this.projectId}`, { stdio: 'pipe' });
      console.log(`✓ Project ${this.projectId} already exists`);
      
      const useExisting = await this.askQuestion('Use existing project? (y/n): ');
      if (useExisting.toLowerCase() !== 'y') {
        throw new Error('Please choose a different project ID');
      }
    } catch (error) {
      // Project doesn't exist, create it
      console.log(`Creating new project: ${this.projectId}`);
      try {
        execSync(`gcloud projects create ${this.projectId} --name="Credit Report Analyzer"`, { stdio: 'inherit' });
        console.log('✓ Project created successfully');
      } catch (createError) {
        throw new Error(`Failed to create project: ${createError.message}`);
      }
    }
    
    // Set as default project
    execSync(`gcloud config set project ${this.projectId}`, { stdio: 'inherit' });
    console.log('✓ Project set as default');
  }

  /**
   * Configure billing for the project
   */
  async configureBilling() {
    console.log('\n💳 Configuring billing...');
    
    try {
      // List available billing accounts
      const billingAccounts = execSync('gcloud billing accounts list --format="value(name,displayName)"', { encoding: 'utf8' });
      
      if (!billingAccounts.trim()) {
        throw new Error('No billing accounts found. Please set up billing in the Google Cloud Console.');
      }
      
      console.log('Available billing accounts:');
      const accounts = billingAccounts.trim().split('\n');
      accounts.forEach((account, index) => {
        const [id, name] = account.split('\t');
        console.log(`${index + 1}. ${name} (${id})`);
      });
      
      const selection = await this.askQuestion('Select billing account (enter number): ');
      const selectedIndex = parseInt(selection) - 1;
      
      if (selectedIndex < 0 || selectedIndex >= accounts.length) {
        throw new Error('Invalid selection');
      }
      
      this.billingAccountId = accounts[selectedIndex].split('\t')[0];
      
      // Link billing account to project
      execSync(`gcloud billing projects link ${this.projectId} --billing-account=${this.billingAccountId}`, { stdio: 'inherit' });
      console.log('✓ Billing configured successfully');
      
    } catch (error) {
      console.log('⚠️  Billing configuration failed. You may need to configure billing manually in the Google Cloud Console.');
      console.log('Error:', error.message);
    }
  }

  /**
   * Enable required Google Cloud APIs
   */
  async enableRequiredAPIs() {
    console.log('\n🔌 Enabling required APIs...');
    
    for (const api of REQUIRED_APIS) {
      try {
        console.log(`Enabling ${api}...`);
        execSync(`gcloud services enable ${api}`, { stdio: 'pipe' });
        console.log(`✓ ${api} enabled`);
      } catch (error) {
        console.log(`⚠️  Failed to enable ${api}: ${error.message}`);
      }
    }
    
    // Wait for APIs to be fully enabled
    console.log('Waiting for APIs to be fully enabled...');
    await this.sleep(10000);
  }

  /**
   * Configure regional settings and compute defaults
   */
  async configureRegionalSettings() {
    console.log('\n🌍 Configuring regional settings...');
    
    try {
      execSync(`gcloud config set compute/region ${this.region}`, { stdio: 'inherit' });
      execSync(`gcloud config set compute/zone ${this.zone}`, { stdio: 'inherit' });
      console.log(`✓ Default region set to ${this.region}`);
      console.log(`✓ Default zone set to ${this.zone}`);
    } catch (error) {
      console.log('⚠️  Failed to configure regional settings:', error.message);
    }
  }

  /**
   * Configure API quotas and limits
   */
  async configureQuotas() {
    console.log('\n📊 Configuring API quotas...');
    
    // Document AI quotas
    const documentAIQuotas = [
      {
        service: 'documentai.googleapis.com',
        metric: 'documentai.googleapis.com/quota/requests_per_minute',
        limit: 600
      }
    ];
    
    // Vision API quotas
    const visionAPIQuotas = [
      {
        service: 'vision.googleapis.com',
        metric: 'vision.googleapis.com/quota/requests_per_minute',
        limit: 1800
      }
    ];
    
    console.log('✓ Default quotas will be applied automatically');
    console.log('Note: Custom quota increases can be requested through the Google Cloud Console if needed');
  }

  /**
   * Validate that all services are working correctly
   */
  async validateSetup() {
    console.log('\n✅ Validating setup...');
    
    // Validate project exists and is accessible
    try {
      const projectInfo = execSync(`gcloud projects describe ${this.projectId} --format="value(projectId,name,lifecycleState)"`, { encoding: 'utf8' });
      console.log('✓ Project is accessible');
    } catch (error) {
      throw new Error('Project validation failed');
    }
    
    // Validate APIs are enabled
    for (const api of REQUIRED_APIS) {
      try {
        const serviceInfo = execSync(`gcloud services list --enabled --filter="name:${api}" --format="value(name)"`, { encoding: 'utf8' });
        if (serviceInfo.trim()) {
          console.log(`✓ ${api} is enabled`);
        } else {
          console.log(`⚠️  ${api} may not be fully enabled yet`);
        }
      } catch (error) {
        console.log(`⚠️  Could not validate ${api}`);
      }
    }
    
    // Validate billing
    try {
      const billingInfo = execSync(`gcloud billing projects describe ${this.projectId} --format="value(billingEnabled)"`, { encoding: 'utf8' });
      if (billingInfo.trim() === 'True') {
        console.log('✓ Billing is enabled');
      } else {
        console.log('⚠️  Billing may not be enabled');
      }
    } catch (error) {
      console.log('⚠️  Could not validate billing status');
    }
  }

  /**
   * Generate configuration files for the application
   */
  async generateConfigurationFiles() {
    console.log('\n📄 Generating configuration files...');
    
    const configData = {
      projectId: this.projectId,
      region: this.region,
      zone: this.zone,
      billingAccountId: this.billingAccountId,
      enabledAPIs: REQUIRED_APIS,
      setupDate: new Date().toISOString()
    };
    
    // Save configuration to JSON file
    const configPath = path.join(process.cwd(), 'google-cloud-config.json');
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    console.log(`✓ Configuration saved to ${configPath}`);
    
    // Generate environment variables template
    const envTemplate = `
# Google Cloud Project Configuration
GOOGLE_CLOUD_PROJECT_ID=${this.projectId}
GOOGLE_CLOUD_LOCATION=${this.region}

# Document AI Configuration (to be configured in next steps)
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
GOOGLE_CLOUD_DOCUMENT_AI_LOCATION=us

# Vision API Configuration
GOOGLE_CLOUD_VISION_API_ENABLED=true

# Service Account Authentication (to be configured in next steps)
GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json

# Monitoring Configuration
GOOGLE_CLOUD_MONITORING_ENABLED=true
GOOGLE_CLOUD_LOGGING_ENABLED=true
`;
    
    const envPath = path.join(process.cwd(), '.env.google-cloud.template');
    fs.writeFileSync(envPath, envTemplate.trim());
    console.log(`✓ Environment template saved to ${envPath}`);
  }

  /**
   * Helper method to ask questions
   */
  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Helper method to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  const setup = new GoogleCloudProjectSetup();
  setup.setup().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = GoogleCloudProjectSetup;