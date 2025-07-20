#!/usr/bin/env node

/**
 * Google Cloud Credential Management Script
 * Handles credential validation, rotation, and security operations
 */

// Note: This script requires the TypeScript files to be compiled first
// For now, we'll provide a simplified version that demonstrates the functionality
const fs = require('fs').promises;
const path = require('path');

class CredentialManagementCLI {
  constructor() {
    console.log('🔐 Credential Management CLI initialized');
    console.log('Note: This is a demonstration version. Full functionality requires TypeScript compilation.');
  }

  async run() {
    const command = process.argv[2];
    const args = process.argv.slice(3);

    console.log('🔐 Google Cloud Credential Management');
    console.log('====================================\n');

    try {
      switch (command) {
        case 'validate':
          await this.validateCredentials();
          break;
        case 'install':
          await this.installCredentials(args[0]);
          break;
        case 'rotate':
          await this.rotateCredentials(args[0]);
          break;
        case 'status':
          await this.showStatus();
          break;
        case 'cleanup':
          await this.cleanup();
          break;
        case 'backup':
          await this.createBackup();
          break;
        case 'test':
          await this.testService(args[0]);
          break;
        default:
          this.showHelp();
      }
    } catch (error) {
      console.error('❌ Operation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Validate current credentials
   */
  async validateCredentials() {
    console.log('🔍 Validating Google Cloud credentials...\n');
    
    // Check if credential file exists
    const fs = require('fs').promises;
    const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-cloud-key.json';
    
    try {
      await fs.access(credentialPath);
      console.log('✅ Credential file found');
      
      // Basic validation
      const credentialData = await fs.readFile(credentialPath, 'utf8');
      const credentials = JSON.parse(credentialData);
      
      if (credentials.type === 'service_account' && credentials.client_email) {
        console.log('✅ Credential format appears valid');
        console.log(`   Service Account: ${credentials.client_email}`);
        console.log(`   Project ID: ${credentials.project_id}`);
      } else {
        console.log('❌ Invalid credential format');
        process.exit(1);
      }
    } catch (error) {
      console.log('❌ No credentials found. Use "install" command to set up credentials.');
      console.log(`   Looking for: ${credentialPath}`);
    }
  }

  /**
   * Install new credentials from file
   */
  async installCredentials(credentialFile) {
    if (!credentialFile) {
      console.log('❌ Please provide path to service account JSON file');
      console.log('Usage: node manage-credentials.js install <path-to-json-file>');
      return;
    }

    console.log(`📥 Installing credentials from ${credentialFile}...\n`);

    try {
      const fs = require('fs').promises;
      
      // Read credential file
      const credentialData = await fs.readFile(credentialFile, 'utf8');
      const credentials = JSON.parse(credentialData);

      // Validate credential format
      if (credentials.type !== 'service_account') {
        throw new Error('Invalid credential type. Expected: service_account');
      }

      if (!credentials.client_email || !credentials.client_email.includes('@')) {
        throw new Error('Invalid client_email format');
      }

      // Copy to standard location
      const targetPath = './google-cloud-key.json';
      await fs.writeFile(targetPath, JSON.stringify(credentials, null, 2));

      console.log('✅ Credentials installed successfully!');
      console.log(`   Service Account: ${credentials.client_email}`);
      console.log(`   Project ID: ${credentials.project_id}`);
      console.log(`   Saved to: ${targetPath}`);
      
      // Show next steps
      console.log('\n📋 Next Steps:');
      console.log('1. Set GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json in your .env.local file');
      console.log('2. Test your application with the new credentials');
      console.log('3. Set up credential rotation schedule');

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`❌ Credential file not found: ${credentialFile}`);
      } else if (error instanceof SyntaxError) {
        console.log('❌ Invalid JSON format in credential file');
      } else {
        console.log(`❌ Installation failed: ${error.message}`);
      }
    }
  }

  /**
   * Rotate credentials
   */
  async rotateCredentials(newCredentialFile) {
    console.log('🔄 Starting credential rotation...\n');

    if (!newCredentialFile) {
      console.log('❌ Please provide path to new service account JSON file');
      console.log('Usage: node manage-credentials.js rotate <path-to-new-json-file>');
      return;
    }

    try {
      const fs = require('fs').promises;
      
      // Create backup of current credentials
      const currentPath = './google-cloud-key.json';
      const backupPath = `./google-cloud-key-backup-${Date.now()}.json`;
      
      try {
        const currentData = await fs.readFile(currentPath, 'utf8');
        await fs.writeFile(backupPath, currentData);
        console.log(`✅ Backup created: ${backupPath}`);
      } catch (error) {
        console.log('⚠️ No existing credentials to backup');
      }

      // Read and validate new credential file
      const credentialData = await fs.readFile(newCredentialFile, 'utf8');
      const newCredentials = JSON.parse(credentialData);

      if (newCredentials.type !== 'service_account') {
        throw new Error('Invalid credential type. Expected: service_account');
      }

      // Install new credentials
      await fs.writeFile(currentPath, JSON.stringify(newCredentials, null, 2));

      console.log('✅ Credential rotation completed successfully!');
      console.log(`   New Service Account: ${newCredentials.client_email}`);
      console.log(`   New Project ID: ${newCredentials.project_id}`);
      console.log(`   Backup saved to: ${backupPath}`);

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`❌ New credential file not found: ${newCredentialFile}`);
      } else {
        console.log(`❌ Rotation failed: ${error.message}`);
      }
    }
  }

  /**
   * Show credential status
   */
  async showStatus() {
    console.log('📊 Credential Status Report\n');

    const fs = require('fs').promises;
    const credentialPath = './google-cloud-key.json';

    try {
      await fs.access(credentialPath);
      console.log('Credentials File: ✅ Found');

      const credentialData = await fs.readFile(credentialPath, 'utf8');
      const credentials = JSON.parse(credentialData);

      console.log(`Service Account: ${credentials.client_email}`);
      console.log(`Project ID: ${credentials.project_id}`);
      console.log(`Key ID: ${credentials.private_key_id}`);
      console.log(`Type: ${credentials.type}`);

      // Check file modification time for rotation info
      const stats = await fs.stat(credentialPath);
      const createdDate = stats.mtime;
      const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`\n🔄 Rotation Status:`);
      console.log(`Created: ${createdDate.toISOString()}`);
      console.log(`Days since creation: ${daysSinceCreation}`);

      if (daysSinceCreation > 90) {
        console.log('⚠️ Credentials are older than 90 days - rotation recommended');
      } else {
        console.log('✅ Credentials are current');
      }

    } catch (error) {
      console.log('Credentials File: ❌ Not Found');
      console.log('\n💡 Use "install" command to set up credentials');
    }
  }

  /**
   * Test specific service
   */
  async testService(serviceName) {
    if (!serviceName) {
      console.log('❌ Please specify service to test');
      console.log('Available services: basic, format, environment');
      return;
    }

    console.log(`🧪 Testing ${serviceName}...\n`);

    const fs = require('fs').promises;
    const credentialPath = './google-cloud-key.json';

    try {
      switch (serviceName) {
        case 'basic':
          await fs.access(credentialPath);
          console.log('✅ Credential file exists');
          break;
          
        case 'format':
          const credentialData = await fs.readFile(credentialPath, 'utf8');
          const credentials = JSON.parse(credentialData);
          
          if (credentials.type === 'service_account') {
            console.log('✅ Valid service account format');
          } else {
            throw new Error('Invalid credential type');
          }
          break;
          
        case 'environment':
          const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
          console.log(`Environment variable: ${envPath || 'Not set'}`);
          
          if (envPath) {
            await fs.access(envPath);
            console.log('✅ Environment credential file exists');
          } else {
            console.log('⚠️ GOOGLE_APPLICATION_CREDENTIALS not set');
          }
          break;
          
        default:
          console.log(`❌ Unknown test: ${serviceName}`);
          return;
      }
      
      console.log(`✅ ${serviceName} test passed`);
      
    } catch (error) {
      console.log(`❌ ${serviceName} test failed: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Create backup of current credentials
   */
  async createBackup() {
    console.log('💾 Creating credential backup...\n');

    const fs = require('fs').promises;
    const credentialPath = './google-cloud-key.json';

    try {
      await fs.access(credentialPath);
      
      const credentialData = await fs.readFile(credentialPath, 'utf8');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `./credentials-backup-${timestamp}.json`;

      await fs.writeFile(backupPath, credentialData);
      console.log(`✅ Backup created: ${backupPath}`);
      console.log('⚠️ Store this backup securely and delete it after use');

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('❌ No credentials found to backup');
      } else {
        console.log('❌ Backup creation failed:', error.message);
      }
    }
  }

  /**
   * Clean up credential files
   */
  async cleanup() {
    console.log('🧹 Cleaning up credential files...\n');

    const confirm = process.argv.includes('--confirm');
    if (!confirm) {
      console.log('⚠️ This will permanently delete all credential files');
      console.log('Add --confirm flag to proceed: node manage-credentials.js cleanup --confirm');
      return;
    }

    const fs = require('fs').promises;
    const filesToClean = [
      './google-cloud-key.json',
      './credential-metadata.json'
    ];

    let cleaned = 0;
    for (const file of filesToClean) {
      try {
        await fs.unlink(file);
        console.log(`✅ Removed: ${file}`);
        cleaned++;
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.log(`⚠️ Failed to remove ${file}: ${error.message}`);
        }
      }
    }

    console.log(`✅ Credential cleanup completed (${cleaned} files removed)`);
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log('Available commands:');
    console.log('');
    console.log('  validate                    - Validate current credentials');
    console.log('  install <json-file>         - Install credentials from JSON file');
    console.log('  rotate <new-json-file>      - Rotate to new credentials');
    console.log('  status                      - Show credential status and rotation info');
    console.log('  test <service>              - Test specific service');
    console.log('  backup                      - Create backup of current credentials');
    console.log('  cleanup --confirm           - Remove all credential files');
    console.log('');
    console.log('Examples:');
    console.log('  node manage-credentials.js install ./service-account.json');
    console.log('  node manage-credentials.js validate');
    console.log('  node manage-credentials.js test document-ai');
    console.log('  node manage-credentials.js status');
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new CredentialManagementCLI();
  cli.run().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = CredentialManagementCLI;