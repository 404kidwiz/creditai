#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function updateEnvFile() {
  const envPath = '.env.local';
  const processorId = 'cdd1c3fd797abbb9'; // From the processor we just created
  
  console.log('🔧 Updating .env.local with Google Cloud configuration...');
  
  // Read existing .env.local
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Google Cloud configuration to add
  const googleCloudConfig = `
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=creditai-465215
GOOGLE_CLOUD_LOCATION=us
GOOGLE_CLOUD_VISION_API_ENABLED=true
GOOGLE_CLOUD_DOCUMENT_AI_ENABLED=true
GOOGLE_CLOUD_CREDENTIALS_TYPE=service-account
GOOGLE_CLOUD_KEY_FILE=google-cloud-key.json
GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=${processorId}`;
  
  // Check if Google Cloud config already exists
  if (envContent.includes('GOOGLE_CLOUD_PROJECT_ID')) {
    console.log('⚠️  Google Cloud configuration already exists in .env.local');
    console.log('📝 Please manually update GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID to:');
    console.log(`   ${processorId}`);
    return;
  }
  
  // Add Google Cloud configuration
  const updatedContent = envContent + googleCloudConfig;
  
  // Write back to .env.local
  fs.writeFileSync(envPath, updatedContent);
  
  console.log('✅ .env.local updated successfully!');
  console.log('📋 Added Google Cloud configuration:');
  console.log('   - GOOGLE_CLOUD_PROJECT_ID=creditai-465215');
  console.log('   - GOOGLE_CLOUD_LOCATION=us');
  console.log('   - GOOGLE_CLOUD_VISION_API_ENABLED=true');
  console.log('   - GOOGLE_CLOUD_DOCUMENT_AI_ENABLED=true');
  console.log('   - GOOGLE_CLOUD_CREDENTIALS_TYPE=service-account');
  console.log('   - GOOGLE_CLOUD_KEY_FILE=google-cloud-key.json');
  console.log(`   - GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=${processorId}`);
  
  console.log('\n🚀 Next steps:');
  console.log('1. Restart your development server: npm run dev');
  console.log('2. Test the configuration: npm run test-gc-config');
  console.log('3. Try uploading a PDF at /test-pdf-processing');
}

updateEnvFile(); 