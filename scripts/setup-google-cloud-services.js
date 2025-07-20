#!/usr/bin/env node

/**
 * Google Cloud Services Setup Script
 * Sets up Document AI, Vision API, and Storage for PDF processing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG_FILE = path.join(__dirname, '../.env.production');
const DEFAULT_LOCATION = 'us';
const DEFAULT_PROCESSOR_TYPE = 'FORM_PARSER_PROCESSOR';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Execute command and return output
function execCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.stderr || error.message);
    return null;
  }
}

// Check if gcloud is installed
function checkGcloudInstalled() {
  try {
    execSync('gcloud --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if user is authenticated with gcloud
function checkGcloudAuth() {
  try {
    const account = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', { encoding: 'utf8' });
    return account.trim() !== '';
  } catch (error) {
    return false;
  }
}

// Get current project
function getCurrentProject() {
  try {
    return execSync('gcloud config get-value project', { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

// Enable required APIs
async function enableRequiredApis(projectId) {
  console.log('\n📡 Enabling required Google Cloud APIs...');
  
  const requiredApis = [
    'documentai.googleapis.com',
    'vision.googleapis.com',
    'aiplatform.googleapis.com',
    'storage.googleapis.com'
  ];
  
  for (const api of requiredApis) {
    console.log(`  - Enabling ${api}...`);
    execCommand(`gcloud services enable ${api} --project=${projectId}`);
  }
  
  console.log('✅ APIs enabled successfully');
}

// Create Document AI processor
async function createDocumentAiProcessor(projectId, location) {
  console.log('\n🔍 Setting up Document AI processor...');
  
  // Check if processor already exists
  const processors = execCommand(`gcloud beta documentai processors list --project=${projectId} --location=${location} --format="value(displayName)"`);
  
  if (processors && processors.includes('Credit Report Processor')) {
    console.log('  - Credit Report Processor already exists');
    
    // Get processor ID
    const processorId = execCommand(
      `gcloud beta documentai processors list --project=${projectId} --location=${location} --filter="displayName:Credit Report Processor" --format="value(name)"`
    ).trim().split('/').pop();
    
    console.log(`  - Processor ID: ${processorId}`);
    return processorId;
  }
  
  console.log('  - Creating new Document AI processor for credit reports...');
  
  // Create processor
  const result = execCommand(
    `gcloud beta documentai processors create --project=${projectId} --location=${location} --display-name="Credit Report Processor" --type=${DEFAULT_PROCESSOR_TYPE}`
  );
  
  if (!result) {
    console.error('❌ Failed to create Document AI processor');
    return null;
  }
  
  // Extract processor ID from result
  const processorId = result.match(/processors\/([a-zA-Z0-9]+)/)[1];
  console.log(`✅ Document AI processor created with ID: ${processorId}`);
  
  return processorId;
}

// Create storage bucket
async function createStorageBucket(projectId, location) {
  console.log('\n🪣 Setting up Cloud Storage bucket...');
  
  const bucketName = `${projectId}-credit-reports`;
  
  // Check if bucket already exists
  const bucketExists = execCommand(`gsutil ls -b gs://${bucketName} 2>/dev/null`);
  
  if (bucketExists) {
    console.log(`  - Bucket ${bucketName} already exists`);
  } else {
    console.log(`  - Creating bucket ${bucketName}...`);
    const result = execCommand(`gsutil mb -l ${location} gs://${bucketName}`);
    
    if (!result) {
      console.error(`❌ Failed to create bucket ${bucketName}`);
      return null;
    }
    
    // Set lifecycle policy to delete files after 7 days
    const lifecycleConfig = {
      lifecycle: {
        rule: [
          {
            action: { type: 'Delete' },
            condition: { age: 7 }
          }
        ]
      }
    };
    
    const tempFile = path.join(__dirname, 'lifecycle.json');
    fs.writeFileSync(tempFile, JSON.stringify(lifecycleConfig, null, 2));
    
    execCommand(`gsutil lifecycle set ${tempFile} gs://${bucketName}`);
    fs.unlinkSync(tempFile);
    
    console.log(`  - Set lifecycle policy to delete files after 7 days`);
  }
  
  console.log(`✅ Storage bucket ${bucketName} configured successfully`);
  return bucketName;
}

// Update environment variables
async function updateEnvironmentVariables(projectId, processorId, bucketName) {
  console.log('\n⚙️ Updating environment variables...');
  
  let envContent = '';
  
  // Read existing .env.production file if it exists
  if (fs.existsSync(CONFIG_FILE)) {
    envContent = fs.readFileSync(CONFIG_FILE, 'utf8');
  }
  
  // Update Google Cloud variables
  const envVars = {
    GOOGLE_CLOUD_PROJECT_ID: projectId,
    GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID: processorId,
    GOOGLE_CLOUD_STORAGE_BUCKET: bucketName,
    GOOGLE_CLOUD_LOCATION: DEFAULT_LOCATION
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
  fs.writeFileSync(CONFIG_FILE, envContent);
  
  console.log(`✅ Environment variables updated in ${CONFIG_FILE}`);
}

// Main function
async function main() {
  console.log('🚀 Google Cloud Services Setup for PDF Analysis');
  console.log('==============================================');
  
  // Check if gcloud is installed
  if (!checkGcloudInstalled()) {
    console.error('❌ Google Cloud SDK (gcloud) is not installed');
    console.error('Please install it from: https://cloud.google.com/sdk/docs/install');
    process.exit(1);
  }
  
  // Check if user is authenticated
  if (!checkGcloudAuth()) {
    console.log('⚠️ You are not authenticated with Google Cloud');
    console.log('Please run: gcloud auth login');
    process.exit(1);
  }
  
  // Get or set project ID
  let projectId = getCurrentProject();
  
  if (!projectId) {
    projectId = await prompt('Enter Google Cloud Project ID: ');
    execCommand(`gcloud config set project ${projectId}`);
  }
  
  console.log(`\n📋 Configuration:`);
  console.log(`  - Project ID: ${projectId}`);
  console.log(`  - Location: ${DEFAULT_LOCATION}`);
  
  const proceed = await prompt('\nProceed with setup? (y/n): ');
  
  if (proceed.toLowerCase() !== 'y') {
    console.log('Setup cancelled');
    rl.close();
    return;
  }
  
  // Enable required APIs
  await enableRequiredApis(projectId);
  
  // Create Document AI processor
  const processorId = await createDocumentAiProcessor(projectId, DEFAULT_LOCATION);
  
  if (!processorId) {
    console.error('❌ Failed to set up Document AI processor');
    rl.close();
    return;
  }
  
  // Create storage bucket
  const bucketName = await createStorageBucket(projectId, DEFAULT_LOCATION);
  
  if (!bucketName) {
    console.error('❌ Failed to set up storage bucket');
    rl.close();
    return;
  }
  
  // Update environment variables
  await updateEnvironmentVariables(projectId, processorId, bucketName);
  
  console.log('\n🎉 Google Cloud services setup completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Set up your Google AI API key in .env.production');
  console.log('2. Run the deployment script: ./scripts/deploy-real-pdf-analysis.sh');
  console.log('3. Validate the deployment with: node scripts/production-deployment-validator.js');
  
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});