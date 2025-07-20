#!/usr/bin/env node

/**
 * Document AI Setup Validation Script
 * Validates the complete Document AI processor configuration and setup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration paths
const PROCESSOR_CONFIG_FILE = path.join(__dirname, '../src/lib/google-cloud/processor-config.json');
const ENV_FILE = path.join(__dirname, '../.env.local');
const VALIDATION_REPORT_FILE = path.join(__dirname, '../document-ai-validation-report.json');

// Validation results
const validationResults = {
  timestamp: new Date().toISOString(),
  overall: { valid: true, score: 0 },
  checks: {
    prerequisites: { valid: false, details: [] },
    configuration: { valid: false, details: [] },
    processors: { valid: false, details: [] },
    connectivity: { valid: false, details: [] },
    integration: { valid: false, details: [] }
  },
  recommendations: [],
  nextSteps: []
};

// Utility functions
function logStep(message) {
  console.log(`\n🔧 ${message}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message) {
  console.error(`❌ ${message}`);
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

function addValidationResult(category, check, valid, message, details = null) {
  validationResults.checks[category].details.push({
    check,
    valid,
    message,
    details
  });
  
  if (!valid) {
    validationResults.checks[category].valid = false;
    validationResults.overall.valid = false;
  }
}

function execCommand(command, silent = true) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
  } catch (error) {
    return null;
  }
}

// Validation functions
async function validatePrerequisites() {
  logStep('Validating prerequisites...');
  
  // Check if gcloud is installed
  const gcloudVersion = execCommand('gcloud --version');
  if (gcloudVersion) {
    logSuccess('Google Cloud SDK is installed');
    addValidationResult('prerequisites', 'gcloud_installed', true, 'Google Cloud SDK is installed');
  } else {
    logError('Google Cloud SDK is not installed');
    addValidationResult('prerequisites', 'gcloud_installed', false, 'Google Cloud SDK is not installed');
    validationResults.nextSteps.push('Install Google Cloud SDK from https://cloud.google.com/sdk/docs/install');
  }
  
  // Check authentication
  const authAccount = execCommand('gcloud auth list --filter=status:ACTIVE --format="value(account)"');
  if (authAccount && authAccount.trim()) {
    logSuccess(`Authenticated as: ${authAccount.trim()}`);
    addValidationResult('prerequisites', 'gcloud_auth', true, `Authenticated as: ${authAccount.trim()}`);
  } else {
    logError('Not authenticated with Google Cloud');
    addValidationResult('prerequisites', 'gcloud_auth', false, 'Not authenticated with Google Cloud');
    validationResults.nextSteps.push('Run: gcloud auth login');
  }
  
  // Check project configuration
  const currentProject = execCommand('gcloud config get-value project');
  if (currentProject && currentProject.trim()) {
    logSuccess(`Current project: ${currentProject.trim()}`);
    addValidationResult('prerequisites', 'project_set', true, `Current project: ${currentProject.trim()}`);
  } else {
    logError('No Google Cloud project configured');
    addValidationResult('prerequisites', 'project_set', false, 'No Google Cloud project configured');
    validationResults.nextSteps.push('Set project: gcloud config set project YOUR_PROJECT_ID');
  }
  
  // Check Node.js dependencies
  const packageJsonPath = path.join(__dirname, '../package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredDeps = ['@google-cloud/documentai', '@google-cloud/vision'];
    
    let allDepsInstalled = true;
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies[dep]) {
        logError(`Missing dependency: ${dep}`);
        addValidationResult('prerequisites', 'dependencies', false, `Missing dependency: ${dep}`);
        allDepsInstalled = false;
      }
    }
    
    if (allDepsInstalled) {
      logSuccess('All required dependencies are installed');
      addValidationResult('prerequisites', 'dependencies', true, 'All required dependencies are installed');
    }
  }
  
  validationResults.checks.prerequisites.valid = 
    validationResults.checks.prerequisites.details.every(d => d.valid);
}

async function validateConfiguration() {
  logStep('Validating configuration files...');
  
  // Check processor configuration file
  if (fs.existsSync(PROCESSOR_CONFIG_FILE)) {
    try {
      const config = JSON.parse(fs.readFileSync(PROCESSOR_CONFIG_FILE, 'utf8'));
      
      logSuccess('Processor configuration file found');
      addValidationResult('configuration', 'config_file_exists', true, 'Processor configuration file found');
      
      // Validate configuration structure
      const requiredFields = ['projectId', 'location', 'processors', 'primaryProcessor'];
      let configValid = true;
      
      for (const field of requiredFields) {
        if (!config[field]) {
          logError(`Missing required field in configuration: ${field}`);
          addValidationResult('configuration', 'config_structure', false, `Missing required field: ${field}`);
          configValid = false;
        }
      }
      
      if (configValid) {
        logSuccess('Configuration structure is valid');
        addValidationResult('configuration', 'config_structure', true, 'Configuration structure is valid');
        
        // Validate processors array
        if (Array.isArray(config.processors) && config.processors.length > 0) {
          logSuccess(`Found ${config.processors.length} configured processors`);
          addValidationResult('configuration', 'processors_configured', true, `${config.processors.length} processors configured`);
        } else {
          logError('No processors configured');
          addValidationResult('configuration', 'processors_configured', false, 'No processors configured');
        }
      }
      
    } catch (error) {
      logError(`Invalid processor configuration file: ${error.message}`);
      addValidationResult('configuration', 'config_file_valid', false, `Invalid configuration file: ${error.message}`);
    }
  } else {
    logError('Processor configuration file not found');
    addValidationResult('configuration', 'config_file_exists', false, 'Processor configuration file not found');
    validationResults.nextSteps.push('Run: node scripts/setup-document-ai-processors.js');
  }
  
  // Check environment variables
  if (fs.existsSync(ENV_FILE)) {
    const envContent = fs.readFileSync(ENV_FILE, 'utf8');
    const requiredEnvVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_CLOUD_LOCATION',
      'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID',
      'GOOGLE_CLOUD_DOCUMENT_AI_ENABLED'
    ];
    
    let envValid = true;
    for (const envVar of requiredEnvVars) {
      if (!envContent.includes(`${envVar}=`)) {
        logError(`Missing environment variable: ${envVar}`);
        addValidationResult('configuration', 'env_variables', false, `Missing environment variable: ${envVar}`);
        envValid = false;
      }
    }
    
    if (envValid) {
      logSuccess('All required environment variables are configured');
      addValidationResult('configuration', 'env_variables', true, 'All required environment variables are configured');
    }
  } else {
    logError('Environment file not found');
    addValidationResult('configuration', 'env_file_exists', false, 'Environment file not found');
    validationResults.nextSteps.push('Create .env.local file with required environment variables');
  }
  
  validationResults.checks.configuration.valid = 
    validationResults.checks.configuration.details.every(d => d.valid);
}

async function validateProcessors() {
  logStep('Validating Document AI processors...');
  
  if (!fs.existsSync(PROCESSOR_CONFIG_FILE)) {
    addValidationResult('processors', 'config_available', false, 'Processor configuration not available');
    return;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(PROCESSOR_CONFIG_FILE, 'utf8'));
    
    // Check if Document AI API is enabled
    const apiEnabled = execCommand(
      `gcloud services list --enabled --filter="name:documentai.googleapis.com" --format="value(name)" --project=${config.projectId}`
    );
    
    if (apiEnabled && apiEnabled.trim()) {
      logSuccess('Document AI API is enabled');
      addValidationResult('processors', 'api_enabled', true, 'Document AI API is enabled');
    } else {
      logError('Document AI API is not enabled');
      addValidationResult('processors', 'api_enabled', false, 'Document AI API is not enabled');
      validationResults.nextSteps.push(`Enable API: gcloud services enable documentai.googleapis.com --project=${config.projectId}`);
    }
    
    // Validate each processor
    let validProcessors = 0;
    for (const processor of config.processors) {
      try {
        const processorInfo = execCommand(
          `gcloud documentai processors describe ${processor.id} --project=${config.projectId} --location=${config.location} --format="json"`
        );
        
        if (processorInfo) {
          const info = JSON.parse(processorInfo);
          if (info.state === 'ENABLED') {
            logSuccess(`Processor ${processor.displayName} is enabled and accessible`);
            validProcessors++;
          } else {
            logWarning(`Processor ${processor.displayName} is in state: ${info.state}`);
          }
        }
      } catch (error) {
        logError(`Cannot access processor ${processor.displayName}: ${error.message}`);
        addValidationResult('processors', 'processor_access', false, `Cannot access processor ${processor.displayName}`);
      }
    }
    
    if (validProcessors > 0) {
      logSuccess(`${validProcessors}/${config.processors.length} processors are accessible`);
      addValidationResult('processors', 'processors_accessible', true, `${validProcessors} processors accessible`);
    } else {
      logError('No processors are accessible');
      addValidationResult('processors', 'processors_accessible', false, 'No processors are accessible');
    }
    
  } catch (error) {
    logError(`Error validating processors: ${error.message}`);
    addValidationResult('processors', 'validation_error', false, `Error validating processors: ${error.message}`);
  }
  
  validationResults.checks.processors.valid = 
    validationResults.checks.processors.details.every(d => d.valid);
}

async function validateConnectivity() {
  logStep('Testing connectivity and permissions...');
  
  if (!fs.existsSync(PROCESSOR_CONFIG_FILE)) {
    addValidationResult('connectivity', 'config_available', false, 'Processor configuration not available');
    return;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(PROCESSOR_CONFIG_FILE, 'utf8'));
    
    // Test listing processors (basic connectivity test)
    const listResult = execCommand(
      `gcloud documentai processors list --project=${config.projectId} --location=${config.location} --format="json"`
    );
    
    if (listResult) {
      const processors = JSON.parse(listResult);
      logSuccess(`Successfully connected to Document AI service (found ${processors.length} processors)`);
      addValidationResult('connectivity', 'service_connection', true, 'Successfully connected to Document AI service');
    } else {
      logError('Cannot connect to Document AI service');
      addValidationResult('connectivity', 'service_connection', false, 'Cannot connect to Document AI service');
    }
    
    // Test permissions by trying to describe a processor
    if (config.processors.length > 0) {
      const firstProcessor = config.processors[0];
      const describeResult = execCommand(
        `gcloud documentai processors describe ${firstProcessor.id} --project=${config.projectId} --location=${config.location} --format="json"`
      );
      
      if (describeResult) {
        logSuccess('Processor access permissions are working');
        addValidationResult('connectivity', 'permissions', true, 'Processor access permissions are working');
      } else {
        logError('Insufficient permissions to access processors');
        addValidationResult('connectivity', 'permissions', false, 'Insufficient permissions to access processors');
      }
    }
    
  } catch (error) {
    logError(`Connectivity test failed: ${error.message}`);
    addValidationResult('connectivity', 'test_failed', false, `Connectivity test failed: ${error.message}`);
  }
  
  validationResults.checks.connectivity.valid = 
    validationResults.checks.connectivity.details.every(d => d.valid);
}

async function validateIntegration() {
  logStep('Validating integration with application...');
  
  // Check if processor manager can be imported
  try {
    const processorConfigPath = path.join(__dirname, '../src/lib/google-cloud/processor-config.ts');
    
    if (fs.existsSync(processorConfigPath)) {
      logSuccess('Processor configuration module exists');
      addValidationResult('integration', 'config_module', true, 'Processor configuration module exists');
    } else {
      logError('Processor configuration module missing');
      addValidationResult('integration', 'config_module', false, 'Processor configuration module missing');
    }
    
    // Check if existing PDF processor can use new configuration
    const pdfProcessorPath = path.join(__dirname, '../src/lib/google-cloud/pdfProcessor.ts');
    if (fs.existsSync(pdfProcessorPath)) {
      const pdfProcessorContent = fs.readFileSync(pdfProcessorPath, 'utf8');
      
      // Check if it imports the new configuration
      if (pdfProcessorContent.includes('processor-config')) {
        logSuccess('PDF processor is integrated with new configuration system');
        addValidationResult('integration', 'pdf_processor_integration', true, 'PDF processor is integrated');
      } else {
        logWarning('PDF processor may need to be updated to use new configuration system');
        addValidationResult('integration', 'pdf_processor_integration', false, 'PDF processor needs integration update');
        validationResults.recommendations.push('Update PDF processor to use new processor configuration system');
      }
    }
    
  } catch (error) {
    logError(`Integration validation failed: ${error.message}`);
    addValidationResult('integration', 'validation_failed', false, `Integration validation failed: ${error.message}`);
  }
  
  validationResults.checks.integration.valid = 
    validationResults.checks.integration.details.every(d => d.valid);
}

// Calculate overall score
function calculateOverallScore() {
  const categories = Object.keys(validationResults.checks);
  const weights = {
    prerequisites: 0.2,
    configuration: 0.25,
    processors: 0.25,
    connectivity: 0.2,
    integration: 0.1
  };
  
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const category of categories) {
    const categoryResult = validationResults.checks[category];
    const validChecks = categoryResult.details.filter(d => d.valid).length;
    const totalChecks = categoryResult.details.length;
    
    if (totalChecks > 0) {
      const categoryScore = (validChecks / totalChecks) * 100;
      const weight = weights[category] || 0.1;
      
      totalScore += categoryScore * weight;
      totalWeight += weight;
    }
  }
  
  validationResults.overall.score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

// Generate recommendations
function generateRecommendations() {
  const failedChecks = [];
  
  for (const [category, result] of Object.entries(validationResults.checks)) {
    const failed = result.details.filter(d => !d.valid);
    failedChecks.push(...failed.map(f => ({ category, ...f })));
  }
  
  // Add specific recommendations based on failed checks
  if (failedChecks.some(c => c.check === 'gcloud_installed')) {
    validationResults.recommendations.push('Install Google Cloud SDK to manage Document AI processors');
  }
  
  if (failedChecks.some(c => c.check === 'config_file_exists')) {
    validationResults.recommendations.push('Run the processor setup script to create initial configuration');
  }
  
  if (failedChecks.some(c => c.check === 'api_enabled')) {
    validationResults.recommendations.push('Enable Document AI API in your Google Cloud project');
  }
  
  if (failedChecks.some(c => c.check === 'processors_accessible')) {
    validationResults.recommendations.push('Verify processor IDs and permissions in Google Cloud Console');
  }
  
  if (validationResults.overall.score < 80) {
    validationResults.recommendations.push('Address critical issues before using Document AI processors in production');
  }
}

// Save validation report
function saveValidationReport() {
  try {
    fs.writeFileSync(VALIDATION_REPORT_FILE, JSON.stringify(validationResults, null, 2));
    logSuccess(`Validation report saved to ${VALIDATION_REPORT_FILE}`);
  } catch (error) {
    logError(`Failed to save validation report: ${error.message}`);
  }
}

// Display results
function displayResults() {
  console.log('\n📊 Validation Results Summary:');
  console.log(`  Overall Score: ${validationResults.overall.score}/100`);
  console.log(`  Overall Status: ${validationResults.overall.valid ? '✅ PASSED' : '❌ FAILED'}`);
  
  console.log('\n📋 Category Results:');
  for (const [category, result] of Object.entries(validationResults.checks)) {
    const validChecks = result.details.filter(d => d.valid).length;
    const totalChecks = result.details.length;
    const status = result.valid ? '✅' : '❌';
    
    console.log(`  ${status} ${category}: ${validChecks}/${totalChecks} checks passed`);
    
    // Show failed checks
    const failedChecks = result.details.filter(d => !d.valid);
    if (failedChecks.length > 0) {
      failedChecks.forEach(check => {
        console.log(`    ❌ ${check.message}`);
      });
    }
  }
  
  if (validationResults.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    validationResults.recommendations.forEach(rec => {
      console.log(`  - ${rec}`);
    });
  }
  
  if (validationResults.nextSteps.length > 0) {
    console.log('\n🔧 Next Steps:');
    validationResults.nextSteps.forEach(step => {
      console.log(`  - ${step}`);
    });
  }
}

// Main function
async function main() {
  console.log('🔍 Document AI Setup Validation');
  console.log('===============================');
  
  await validatePrerequisites();
  await validateConfiguration();
  await validateProcessors();
  await validateConnectivity();
  await validateIntegration();
  
  calculateOverallScore();
  generateRecommendations();
  
  displayResults();
  saveValidationReport();
  
  if (validationResults.overall.valid && validationResults.overall.score >= 80) {
    console.log('\n🎉 Document AI setup validation completed successfully!');
    console.log('Your Document AI processors are ready for use.');
  } else {
    console.log('\n⚠️  Document AI setup has issues that need to be addressed.');
    console.log('Please review the recommendations and next steps above.');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Validation error:', error);
    process.exit(1);
  });
}

module.exports = {
  validatePrerequisites,
  validateConfiguration,
  validateProcessors,
  validateConnectivity,
  validateIntegration
};