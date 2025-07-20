#!/usr/bin/env node

/**
 * Document AI Processor Configuration Script
 * Creates and configures Document AI processors for credit report processing
 * Supports Form Parser, OCR, and Layout Parser processor types
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG_FILE = path.join(__dirname, '../.env.local');
const PROCESSOR_CONFIG_FILE = path.join(__dirname, '../src/lib/google-cloud/processor-config.json');

// Processor type configurations
const PROCESSOR_TYPES = {
  FORM_PARSER: {
    type: 'FORM_PARSER_PROCESSOR',
    displayName: 'Credit Report Form Parser',
    description: 'Processes structured credit report forms with field extraction',
    useCase: 'Structured credit reports with clear form fields',
    priority: 1
  },
  OCR: {
    type: 'OCR_PROCESSOR',
    displayName: 'Credit Report OCR Processor',
    description: 'Extracts text from scanned credit report documents',
    useCase: 'Scanned or image-based credit reports',
    priority: 3
  },
  LAYOUT_PARSER: {
    type: 'LAYOUT_PARSER_PROCESSOR',
    displayName: 'Credit Report Layout Parser',
    description: 'Analyzes complex multi-column credit report layouts',
    useCase: 'Complex credit reports with multiple columns and sections',
    priority: 2
  }
};

// Default configuration
const DEFAULT_CONFIG = {
  location: 'us',
  processors: [],
  primaryProcessor: 'FORM_PARSER',
  fallbackOrder: ['FORM_PARSER', 'LAYOUT_PARSER', 'OCR']
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility functions
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function execCommand(command, silent = false) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return result;
  } catch (error) {
    if (!silent) {
      console.error(`Command failed: ${command}`);
      console.error(error.stderr || error.message);
    }
    return null;
  }
}

function logStep(message) {
  console.log(`\n🔧 ${message}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message) {
  console.error(`❌ ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

// Validation functions
function checkGcloudInstalled() {
  try {
    execSync('gcloud --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function checkGcloudAuth() {
  try {
    const account = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', { encoding: 'utf8' });
    return account.trim() !== '';
  } catch (error) {
    return false;
  }
}

function getCurrentProject() {
  try {
    return execSync('gcloud config get-value project', { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

// Check if Document AI API is enabled
function checkDocumentAiApiEnabled(projectId) {
  try {
    const result = execCommand(
      `gcloud services list --enabled --filter="name:documentai.googleapis.com" --format="value(name)" --project=${projectId}`,
      true
    );
    return result && result.trim() !== '';
  } catch (error) {
    return false;
  }
}

// Enable Document AI API
async function enableDocumentAiApi(projectId) {
  logStep('Enabling Document AI API...');
  
  if (checkDocumentAiApiEnabled(projectId)) {
    logInfo('Document AI API is already enabled');
    return true;
  }
  
  const result = execCommand(`gcloud services enable documentai.googleapis.com --project=${projectId}`);
  
  if (result !== null) {
    logSuccess('Document AI API enabled successfully');
    return true;
  } else {
    logError('Failed to enable Document AI API');
    return false;
  }
}

// List existing processors
async function listExistingProcessors(projectId, location) {
  try {
    const result = execCommand(
      `gcloud documentai processors list --project=${projectId} --location=${location} --format="json"`,
      true
    );
    
    if (!result) return [];
    
    return JSON.parse(result);
  } catch (error) {
    console.error('Error listing processors:', error.message);
    return [];
  }
}

// Create a Document AI processor
async function createProcessor(projectId, location, processorConfig) {
  logStep(`Creating ${processorConfig.displayName}...`);
  
  try {
    const result = execCommand(
      `gcloud documentai processors create --project=${projectId} --location=${location} --display-name="${processorConfig.displayName}" --type=${processorConfig.type} --format="json"`,
      true
    );
    
    if (!result) {
      logError(`Failed to create ${processorConfig.displayName}`);
      return null;
    }
    
    const processor = JSON.parse(result);
    const processorId = processor.name.split('/').pop();
    
    logSuccess(`Created ${processorConfig.displayName} with ID: ${processorId}`);
    
    return {
      id: processorId,
      name: processor.name,
      displayName: processorConfig.displayName,
      type: processorConfig.type,
      description: processorConfig.description,
      useCase: processorConfig.useCase,
      state: processor.state,
      createTime: processor.createTime,
      priority: processorConfig.priority
    };
  } catch (error) {
    logError(`Error creating processor: ${error.message}`);
    return null;
  }
}

// Test processor with a sample document
async function testProcessor(projectId, location, processorId, testFilePath) {
  if (!fs.existsSync(testFilePath)) {
    logInfo(`Test file not found: ${testFilePath}, skipping processor test`);
    return { success: false, reason: 'Test file not found' };
  }
  
  logStep(`Testing processor ${processorId}...`);
  
  try {
    const result = execCommand(
      `gcloud documentai processors process --project=${projectId} --location=${location} --processor=${processorId} --input-file-path="${testFilePath}" --format="json"`,
      true
    );
    
    if (!result) {
      return { success: false, reason: 'Processing failed' };
    }
    
    const response = JSON.parse(result);
    const extractedText = response.document?.text || '';
    const confidence = response.document?.pages?.[0]?.blocks?.[0]?.layout?.confidence || 0;
    
    logSuccess(`Processor test completed - Extracted ${extractedText.length} characters with confidence ${confidence.toFixed(2)}`);
    
    return {
      success: true,
      textLength: extractedText.length,
      confidence: confidence,
      pages: response.document?.pages?.length || 0
    };
  } catch (error) {
    logError(`Processor test failed: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

// Save processor configuration
function saveProcessorConfig(config) {
  try {
    // Ensure directory exists
    const configDir = path.dirname(PROCESSOR_CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(PROCESSOR_CONFIG_FILE, JSON.stringify(config, null, 2));
    logSuccess(`Processor configuration saved to ${PROCESSOR_CONFIG_FILE}`);
    return true;
  } catch (error) {
    logError(`Failed to save processor configuration: ${error.message}`);
    return false;
  }
}

// Update environment variables
function updateEnvironmentVariables(config) {
  logStep('Updating environment variables...');
  
  let envContent = '';
  
  // Read existing .env.local file if it exists
  if (fs.existsSync(CONFIG_FILE)) {
    envContent = fs.readFileSync(CONFIG_FILE, 'utf8');
  }
  
  // Find primary processor
  const primaryProcessor = config.processors.find(p => p.type === config.primaryProcessor + '_PROCESSOR');
  
  const envVars = {
    GOOGLE_CLOUD_PROJECT_ID: config.projectId,
    GOOGLE_CLOUD_LOCATION: config.location,
    GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID: primaryProcessor?.id || '',
    GOOGLE_CLOUD_DOCUMENT_AI_ENABLED: 'true',
    GOOGLE_CLOUD_DOCUMENT_AI_PROCESSORS: JSON.stringify(config.processors.map(p => ({
      id: p.id,
      type: p.type,
      displayName: p.displayName
    })))
  };
  
  // Update each variable in the content
  for (const [key, value] of Object.entries(envVars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    
    if (regex.test(envContent)) {
      // Update existing variable
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add new variable
      envContent += `\n${key}=${value}`;
    }
  }
  
  // Write updated content back to file
  fs.writeFileSync(CONFIG_FILE, envContent.trim() + '\n');
  
  logSuccess(`Environment variables updated in ${CONFIG_FILE}`);
}

// Validate processor configuration
async function validateProcessorConfiguration(config) {
  logStep('Validating processor configuration...');
  
  const validationResults = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  // Check if we have at least one processor
  if (config.processors.length === 0) {
    validationResults.valid = false;
    validationResults.errors.push('No processors configured');
  }
  
  // Check if primary processor exists
  const primaryProcessor = config.processors.find(p => p.type === config.primaryProcessor + '_PROCESSOR');
  if (!primaryProcessor) {
    validationResults.valid = false;
    validationResults.errors.push(`Primary processor type ${config.primaryProcessor} not found`);
  }
  
  // Check processor states
  for (const processor of config.processors) {
    if (processor.state !== 'ENABLED') {
      validationResults.warnings.push(`Processor ${processor.displayName} is not enabled (state: ${processor.state})`);
    }
  }
  
  // Test connectivity to each processor
  for (const processor of config.processors) {
    try {
      const testResult = execCommand(
        `gcloud documentai processors describe ${processor.id} --project=${config.projectId} --location=${config.location} --format="value(state)"`,
        true
      );
      
      if (!testResult || testResult.trim() !== 'ENABLED') {
        validationResults.warnings.push(`Processor ${processor.displayName} may not be accessible`);
      }
    } catch (error) {
      validationResults.errors.push(`Cannot access processor ${processor.displayName}: ${error.message}`);
      validationResults.valid = false;
    }
  }
  
  if (validationResults.valid) {
    logSuccess('Processor configuration validation passed');
  } else {
    logError('Processor configuration validation failed');
  }
  
  if (validationResults.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    validationResults.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  if (validationResults.errors.length > 0) {
    console.log('\n❌ Errors:');
    validationResults.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  return validationResults;
}

// Main setup function
async function setupDocumentAiProcessors() {
  console.log('🚀 Document AI Processor Configuration');
  console.log('=====================================');
  
  // Validate prerequisites
  if (!checkGcloudInstalled()) {
    logError('Google Cloud SDK (gcloud) is not installed');
    console.log('Please install it from: https://cloud.google.com/sdk/docs/install');
    process.exit(1);
  }
  
  if (!checkGcloudAuth()) {
    logError('You are not authenticated with Google Cloud');
    console.log('Please run: gcloud auth login');
    process.exit(1);
  }
  
  // Get project configuration
  let projectId = getCurrentProject();
  if (!projectId) {
    projectId = await prompt('Enter Google Cloud Project ID: ');
    execCommand(`gcloud config set project ${projectId}`);
  }
  
  const location = await prompt(`Enter location (default: ${DEFAULT_CONFIG.location}): `) || DEFAULT_CONFIG.location;
  
  console.log(`\n📋 Configuration:`);
  console.log(`  - Project ID: ${projectId}`);
  console.log(`  - Location: ${location}`);
  
  // Enable Document AI API
  const apiEnabled = await enableDocumentAiApi(projectId);
  if (!apiEnabled) {
    process.exit(1);
  }
  
  // Check existing processors
  const existingProcessors = await listExistingProcessors(projectId, location);
  
  if (existingProcessors.length > 0) {
    console.log('\n📋 Existing processors:');
    existingProcessors.forEach(processor => {
      const processorId = processor.name.split('/').pop();
      console.log(`  - ${processor.displayName} (${processorId}) - ${processor.state}`);
    });
  }
  
  // Ask which processors to create
  console.log('\n🔧 Available processor types:');
  Object.entries(PROCESSOR_TYPES).forEach(([key, config]) => {
    console.log(`  ${key}: ${config.description}`);
    console.log(`    Use case: ${config.useCase}`);
  });
  
  const processorSelection = await prompt('\nWhich processors would you like to create? (comma-separated, e.g., FORM_PARSER,OCR): ');
  const selectedProcessors = processorSelection.split(',').map(p => p.trim().toUpperCase()).filter(p => PROCESSOR_TYPES[p]);
  
  if (selectedProcessors.length === 0) {
    logError('No valid processors selected');
    process.exit(1);
  }
  
  // Create configuration object
  const config = {
    projectId,
    location,
    processors: [],
    primaryProcessor: selectedProcessors[0],
    fallbackOrder: selectedProcessors,
    createdAt: new Date().toISOString()
  };
  
  // Create processors
  for (const processorType of selectedProcessors) {
    const processorConfig = PROCESSOR_TYPES[processorType];
    
    // Check if processor already exists
    const existingProcessor = existingProcessors.find(p => 
      p.displayName === processorConfig.displayName || 
      p.type === processorConfig.type
    );
    
    if (existingProcessor) {
      logInfo(`Using existing processor: ${processorConfig.displayName}`);
      const processorId = existingProcessor.name.split('/').pop();
      
      config.processors.push({
        id: processorId,
        name: existingProcessor.name,
        displayName: processorConfig.displayName,
        type: processorConfig.type,
        description: processorConfig.description,
        useCase: processorConfig.useCase,
        state: existingProcessor.state,
        createTime: existingProcessor.createTime,
        priority: processorConfig.priority
      });
    } else {
      const processor = await createProcessor(projectId, location, processorConfig);
      if (processor) {
        config.processors.push(processor);
      }
    }
  }
  
  if (config.processors.length === 0) {
    logError('No processors were created or found');
    process.exit(1);
  }
  
  // Test processors if test file exists
  const testFilePath = path.join(__dirname, '../test-data/sample-credit-report.pdf');
  if (fs.existsSync(testFilePath)) {
    console.log('\n🧪 Testing processors...');
    
    for (const processor of config.processors) {
      const testResult = await testProcessor(projectId, location, processor.id, testFilePath);
      processor.testResult = testResult;
    }
  }
  
  // Save configuration
  saveProcessorConfig(config);
  
  // Update environment variables
  updateEnvironmentVariables(config);
  
  // Validate configuration
  const validationResult = await validateProcessorConfiguration(config);
  
  // Display summary
  console.log('\n📊 Setup Summary:');
  console.log(`  - Project: ${config.projectId}`);
  console.log(`  - Location: ${config.location}`);
  console.log(`  - Processors created: ${config.processors.length}`);
  console.log(`  - Primary processor: ${config.primaryProcessor}`);
  
  config.processors.forEach(processor => {
    console.log(`    • ${processor.displayName} (${processor.id})`);
    if (processor.testResult) {
      const result = processor.testResult;
      if (result.success) {
        console.log(`      Test: ✅ ${result.textLength} chars, confidence: ${result.confidence?.toFixed(2) || 'N/A'}`);
      } else {
        console.log(`      Test: ❌ ${result.reason}`);
      }
    }
  });
  
  if (validationResult.valid) {
    console.log('\n🎉 Document AI processors configured successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the processors with your credit report samples');
    console.log('2. Update your application configuration if needed');
    console.log('3. Run integration tests to verify functionality');
  } else {
    console.log('\n⚠️  Configuration completed with errors. Please review and fix the issues above.');
  }
  
  rl.close();
}

// Run the script
if (require.main === module) {
  setupDocumentAiProcessors().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = {
  setupDocumentAiProcessors,
  PROCESSOR_TYPES,
  validateProcessorConfiguration
};