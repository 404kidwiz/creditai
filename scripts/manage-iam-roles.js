#!/usr/bin/env node

/**
 * IAM Role Management Script
 * 
 * This script provides comprehensive IAM role management for the service account,
 * including role assignment, removal, and auditing capabilities.
 */

const { execSync } = require('child_process');
const fs = require('fs');

class IAMRoleManager {
  constructor() {
    this.projectId = null;
    this.serviceAccountEmail = null;
    this.requiredRoles = [
      'roles/documentai.apiUser',      // Document AI access
      'roles/ml.developer',            // Vision API access (includes vision permissions)
      'roles/storage.objectCreator',   // Create temporary files
      'roles/storage.objectViewer',    // Read temporary files
      'roles/monitoring.metricWriter', // Write metrics
      'roles/logging.logWriter'        // Write logs
    ];
  }

  /**
   * Initialize the manager
   */
  async initialize() {
    console.log('🔐 Initializing IAM Role Manager...\n');
    
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
    
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.serviceAccountEmail = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL;
    
    if (!this.projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID not found in environment variables');
    }
    
    if (!this.serviceAccountEmail) {
      // Try to construct from project ID
      this.serviceAccountEmail = `credit-report-processor@${this.projectId}.iam.gserviceaccount.com`;
    }
    
    console.log(`✅ Project ID: ${this.projectId}`);
    console.log(`✅ Service Account: ${this.serviceAccountEmail}\n`);
  }

  /**
   * Get current IAM roles for the service account
   */
  async getCurrentRoles() {
    try {
      const result = execSync(
        `gcloud projects get-iam-policy ${this.projectId} --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:${this.serviceAccountEmail}"`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      const roles = result.split('\n')
        .filter(line => line.startsWith('roles/'))
        .map(line => line.trim());
      
      return roles;
    } catch (error) {
      throw new Error(`Failed to get current roles: ${error.message}`);
    }
  }

  /**
   * Assign all required roles
   */
  async assignRequiredRoles() {
    console.log('📝 Assigning required IAM roles...');
    
    const currentRoles = await this.getCurrentRoles();
    const missingRoles = this.requiredRoles.filter(role => !currentRoles.includes(role));
    
    if (missingRoles.length === 0) {
      console.log('✅ All required roles are already assigned');
      return;
    }
    
    console.log(`📋 Missing roles: ${missingRoles.length}`);
    
    for (const role of missingRoles) {
      try {
        console.log(`  Assigning: ${role}`);
        
        execSync(`gcloud projects add-iam-policy-binding ${this.projectId} \
          --member="serviceAccount:${this.serviceAccountEmail}" \
          --role="${role}"`, 
          { stdio: 'pipe' }
        );
        
        console.log(`  ✅ Assigned: ${role}`);
      } catch (error) {
        console.error(`  ❌ Failed to assign ${role}: ${error.message}`);
        throw error;
      }
    }
    
    console.log('✅ All required roles assigned successfully');
  }

  /**
   * Remove unnecessary roles (cleanup)
   */
  async removeUnnecessaryRoles() {
    console.log('🧹 Checking for unnecessary roles...');
    
    const currentRoles = await this.getCurrentRoles();
    const unnecessaryRoles = currentRoles.filter(role => !this.requiredRoles.includes(role));
    
    if (unnecessaryRoles.length === 0) {
      console.log('✅ No unnecessary roles found');
      return;
    }
    
    console.log(`⚠️  Found ${unnecessaryRoles.length} unnecessary roles:`);
    unnecessaryRoles.forEach(role => console.log(`   • ${role}`));
    
    // Ask for confirmation (in a real scenario, you might want to prompt the user)
    console.log('\n🤔 These roles will be removed to follow the principle of least privilege.');
    
    for (const role of unnecessaryRoles) {
      try {
        console.log(`  Removing: ${role}`);
        
        execSync(`gcloud projects remove-iam-policy-binding ${this.projectId} \
          --member="serviceAccount:${this.serviceAccountEmail}" \
          --role="${role}"`, 
          { stdio: 'pipe' }
        );
        
        console.log(`  ✅ Removed: ${role}`);
      } catch (error) {
        console.error(`  ❌ Failed to remove ${role}: ${error.message}`);
      }
    }
  }

  /**
   * Audit current role assignments
   */
  async auditRoles() {
    console.log('🔍 Auditing IAM role assignments...\n');
    
    const currentRoles = await this.getCurrentRoles();
    const missingRoles = this.requiredRoles.filter(role => !currentRoles.includes(role));
    const extraRoles = currentRoles.filter(role => !this.requiredRoles.includes(role));
    
    console.log('📊 Role Audit Report:');
    console.log('─'.repeat(50));
    
    console.log(`\n✅ Required Roles (${this.requiredRoles.length}):`);
    this.requiredRoles.forEach(role => {
      const status = currentRoles.includes(role) ? '✅' : '❌';
      console.log(`   ${status} ${role}`);
    });
    
    if (extraRoles.length > 0) {
      console.log(`\n⚠️  Extra Roles (${extraRoles.length}):`);
      extraRoles.forEach(role => console.log(`   • ${role}`));
    }
    
    if (missingRoles.length > 0) {
      console.log(`\n❌ Missing Roles (${missingRoles.length}):`);
      missingRoles.forEach(role => console.log(`   • ${role}`));
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   • Total assigned: ${currentRoles.length}`);
    console.log(`   • Required: ${this.requiredRoles.length}`);
    console.log(`   • Missing: ${missingRoles.length}`);
    console.log(`   • Extra: ${extraRoles.length}`);
    
    const isCompliant = missingRoles.length === 0;
    const isMinimal = extraRoles.length === 0;
    
    if (isCompliant && isMinimal) {
      console.log('\n🎉 Perfect! Roles are compliant and follow least privilege principle.');
    } else if (isCompliant) {
      console.log('\n✅ Compliant but has extra permissions. Consider cleanup.');
    } else {
      console.log('\n❌ Missing required permissions. Service may not function properly.');
    }
    
    return { isCompliant, isMinimal, missingRoles, extraRoles };
  }

  /**
   * Generate detailed role documentation
   */
  generateRoleDocumentation() {
    console.log('\n📚 IAM Role Documentation:');
    console.log('═'.repeat(60));
    
    const roleDescriptions = {
      'roles/documentai.apiUser': {
        description: 'Allows calling Document AI API to process PDF documents',
        permissions: ['documentai.processors.process', 'documentai.processors.get'],
        justification: 'Required for PDF text extraction and form parsing'
      },
      'roles/vision.imageAnnotator': {
        description: 'Allows calling Vision API for OCR and image analysis',
        permissions: ['vision.images.annotate'],
        justification: 'Fallback OCR when Document AI is unavailable'
      },
      'roles/storage.objectCreator': {
        description: 'Allows creating objects in Cloud Storage buckets',
        permissions: ['storage.objects.create'],
        justification: 'Temporary storage for processing large PDF files'
      },
      'roles/storage.objectViewer': {
        description: 'Allows reading objects from Cloud Storage buckets',
        permissions: ['storage.objects.get', 'storage.objects.list'],
        justification: 'Reading temporary files during processing'
      },
      'roles/monitoring.metricWriter': {
        description: 'Allows writing custom metrics to Cloud Monitoring',
        permissions: ['monitoring.timeSeries.create'],
        justification: 'Performance monitoring and alerting'
      },
      'roles/logging.logWriter': {
        description: 'Allows writing log entries to Cloud Logging',
        permissions: ['logging.logEntries.create'],
        justification: 'Error tracking and audit logging'
      }
    };
    
    this.requiredRoles.forEach(role => {
      const info = roleDescriptions[role];
      console.log(`\n🔐 ${role}`);
      console.log(`   Description: ${info.description}`);
      console.log(`   Justification: ${info.justification}`);
      console.log(`   Key Permissions: ${info.permissions.join(', ')}`);
    });
    
    console.log('\n💡 Security Best Practices:');
    console.log('   • These roles follow the principle of least privilege');
    console.log('   • Each role is necessary for specific application functionality');
    console.log('   • Regular audits ensure no unnecessary permissions accumulate');
    console.log('   • Service account keys should be rotated regularly');
  }
}

/**
 * Main execution function
 */
async function main() {
  const manager = new IAMRoleManager();
  
  try {
    await manager.initialize();
    
    // Parse command line arguments
    const command = process.argv[2] || 'audit';
    
    switch (command) {
      case 'assign':
        await manager.assignRequiredRoles();
        break;
        
      case 'cleanup':
        await manager.removeUnnecessaryRoles();
        break;
        
      case 'audit':
        await manager.auditRoles();
        break;
        
      case 'docs':
        manager.generateRoleDocumentation();
        break;
        
      case 'full':
        await manager.assignRequiredRoles();
        await manager.auditRoles();
        manager.generateRoleDocumentation();
        break;
        
      default:
        console.log('Usage: node manage-iam-roles.js [command]');
        console.log('Commands:');
        console.log('  assign  - Assign all required roles');
        console.log('  cleanup - Remove unnecessary roles');
        console.log('  audit   - Audit current role assignments (default)');
        console.log('  docs    - Generate role documentation');
        console.log('  full    - Run assign, audit, and docs');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ IAM management failed:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    console.error('   • Ensure you are authenticated: gcloud auth login');
    console.error('   • Verify project permissions for IAM management');
    console.error('   • Check that the service account exists');
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = { IAMRoleManager };