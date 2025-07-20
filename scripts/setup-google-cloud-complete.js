#!/usr/bin/env node

/**
 * Complete Google Cloud Setup Script
 * 
 * This script provides a comprehensive setup process for Google Cloud
 * infrastructure including project creation, API enablement, and validation.
 * 
 * Requirements covered:
 * - 1.1: Create Google Cloud project with billing
 * - 1.2: Enable Document AI, Vision API, Storage, Monitoring, and Logging APIs
 * - 1.5: Validate all services are accessible and functional
 */

const GoogleCloudProjectSetup = require('./setup-google-cloud-project');
const GoogleCloudProjectValidator = require('./validate-google-cloud-project');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CompleteGoogleCloudSetup {
  constructor() {
    this.setupInstance = new GoogleCloudProjectSetup();
    this.validatorInstance = null;
    this.projectId = null;
  }

  /**
   * Run complete setup process
   */
  async runCompleteSetup() {
    try {
      console.log('🚀 Starting Complete Google Cloud Infrastructure Setup\n');
      console.log('This process will:');
      console.log('1. Create or configure a Google Cloud project');
      console.log('2. Enable all required APIs');
      console.log('3. Configure billing and regional settings');
      console.log('4. Validate the complete setup');
      console.log('5. Generate configuration files\n');

      // Step 1: Run project setup
      console.log('='.repeat(60));
      console.log('STEP 1: PROJECT SETUP');
      console.log('='.repeat(60));
      await this.setupInstance.setup();
      
      // Get the project ID from the setup
      this.projectId = this.setupInstance.projectId;
      
      // Step 2: Wait for services to propagate
      console.log('\n='.repeat(60));
      console.log('STEP 2: WAITING FOR SERVICES TO PROPAGATE');
      console.log('='.repeat(60));
      await this.waitForServicePropagation();
      
      // Step 3: Validate setup
      console.log('\n='.repeat(60));
      console.log('STEP 3: VALIDATION');
      console.log('='.repeat(60));
      this.validatorInstance = new GoogleCloudProjectValidator(this.projectId);
      const validationSuccess = await this.validatorInstance.validate();
      
      if (!validationSuccess) {
        console.log('\n⚠️  Some validation checks failed, but setup may still be functional.');
        console.log('You can re-run validation later with: node scripts/validate-google-cloud-project.js');
      }
      
      // Step 4: Generate next steps
      console.log('\n='.repeat(60));
      console.log('STEP 4: NEXT STEPS');
      console.log('='.repeat(60));
      this.generateNextSteps();
      
      console.log('\n🎉 Complete Google Cloud setup finished!');
      console.log(`Project ID: ${this.projectId}`);
      
      return true;
      
    } catch (error) {
      console.error('\n❌ Complete setup failed:', error.message);
      console.log('\nYou can try running individual setup steps:');
      console.log('• Project setup: node scripts/setup-google-cloud-project.js');
      console.log('• Validation: node scripts/validate-google-cloud-project.js');
      return false;
    }
  }

  /**
   * Wait for Google Cloud services to fully propagate
   */
  async waitForServicePropagation() {
    console.log('⏳ Waiting for Google Cloud services to fully propagate...');
    console.log('This may take 1-2 minutes...');
    
    const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let spinnerIndex = 0;
    
    // Show spinner for 90 seconds
    const spinnerInterval = setInterval(() => {
      process.stdout.write(`\r${spinnerChars[spinnerIndex]} Waiting for services to be ready...`);
      spinnerIndex = (spinnerIndex + 1) % spinnerChars.length;
    }, 100);
    
    await new Promise(resolve => setTimeout(resolve, 90000));
    
    clearInterval(spinnerInterval);
    process.stdout.write('\r✓ Service propagation wait completed\n');
  }

  /**
   * Generate next steps documentation
   */
  generateNextSteps() {
    const nextSteps = `
# Next Steps for Google Cloud Setup

## Immediate Actions Required

### 1. Service Account Setup
Run the following command to create a service account:
\`\`\`bash
node scripts/setup-service-account.js
\`\`\`

### 2. Document AI Processor Setup
Create Document AI processors for PDF processing:
\`\`\`bash
node scripts/create-document-ai-processor.js
\`\`\`

### 3. Environment Configuration
Update your .env.local file with the generated configuration:
\`\`\`bash
cp .env.google-cloud.template .env.local
# Edit .env.local with your specific values
\`\`\`

## Verification Steps

### Test Google Cloud Integration
\`\`\`bash
node scripts/test-google-cloud.js
\`\`\`

### Validate Complete Setup
\`\`\`bash
node scripts/validate-google-cloud-project.js ${this.projectId}
\`\`\`

## Configuration Files Generated

- \`google-cloud-config.json\` - Project configuration
- \`.env.google-cloud.template\` - Environment variables template
- \`google-cloud-validation-report.json\` - Validation results

## Important Notes

1. **Billing**: Ensure billing is enabled for your project
2. **Quotas**: Default quotas are applied; request increases if needed
3. **Security**: Follow security best practices for credential management
4. **Monitoring**: Set up monitoring and alerting for production use

## Troubleshooting

If you encounter issues:
1. Check the validation report for specific failures
2. Ensure you have proper IAM permissions
3. Verify billing is enabled
4. Run individual setup scripts for targeted fixes

## Support Resources

- Google Cloud Documentation: https://cloud.google.com/docs
- Document AI Documentation: https://cloud.google.com/document-ai/docs
- Vision API Documentation: https://cloud.google.com/vision/docs
`;

    const nextStepsPath = path.join(process.cwd(), 'GOOGLE_CLOUD_NEXT_STEPS.md');
    fs.writeFileSync(nextStepsPath, nextSteps.trim());
    console.log(`📋 Next steps guide saved to: ${nextStepsPath}`);
  }

  /**
   * Check if prerequisites are met
   */
  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    const checks = [
      {
        name: 'Google Cloud CLI',
        command: 'gcloud --version',
        required: true
      },
      {
        name: 'Node.js',
        command: 'node --version',
        required: true
      },
      {
        name: 'Git',
        command: 'git --version',
        required: false
      }
    ];
    
    let allRequired = true;
    
    for (const check of checks) {
      try {
        execSync(check.command, { stdio: 'pipe' });
        console.log(`✓ ${check.name} is available`);
      } catch (error) {
        if (check.required) {
          console.log(`❌ ${check.name} is required but not available`);
          allRequired = false;
        } else {
          console.log(`⚠️  ${check.name} is not available (optional)`);
        }
      }
    }
    
    return allRequired;
  }
}

// CLI interface
if (require.main === module) {
  const setup = new CompleteGoogleCloudSetup();
  
  // Check prerequisites first
  setup.checkPrerequisites().then(prerequisitesMet => {
    if (!prerequisitesMet) {
      console.log('\n❌ Prerequisites not met. Please install required tools and try again.');
      process.exit(1);
    }
    
    // Run complete setup
    return setup.runCompleteSetup();
  }).then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = CompleteGoogleCloudSetup;