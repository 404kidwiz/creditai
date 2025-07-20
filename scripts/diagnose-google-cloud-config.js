#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

console.log('=== Google Cloud Configuration Diagnostics ===\n');

// Check environment variables
console.log('1. Environment Variables:');
const requiredEnvVars = [
  'GOOGLE_CLOUD_PROJECT_ID',
  'GOOGLE_CLOUD_LOCATION',
  'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID',
  'GOOGLE_AI_API_KEY',
  'GOOGLE_CLOUD_VISION_API_ENABLED',
  'GOOGLE_CLOUD_DOCUMENT_AI_ENABLED',
  'GOOGLE_CLOUD_CREDENTIALS'
];

const envStatus = {};
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  envStatus[varName] = {
    exists: !!value,
    length: value ? value.length : 0,
    preview: value ? value.substring(0, 20) + '...' : 'NOT SET'
  };
  
  console.log(`   ${varName}: ${envStatus[varName].exists ? '✅' : '❌'} (${envStatus[varName].length} chars)`);
  if (!envStatus[varName].exists) {
    console.log(`     Value: ${envStatus[varName].preview}`);
  }
});

console.log('\n2. Google Cloud Credentials Check:');
try {
  const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
  if (credentials) {
    try {
      const parsedCreds = JSON.parse(credentials);
      console.log('   ✅ Credentials JSON is valid');
      console.log('   Project ID from creds:', parsedCreds.project_id);
      console.log('   Client email:', parsedCreds.client_email);
      console.log('   Has private key:', !!parsedCreds.private_key);
      console.log('   Private key length:', parsedCreds.private_key ? parsedCreds.private_key.length : 0);
    } catch (parseError) {
      console.log('   ❌ Credentials JSON is invalid:', parseError.message);
    }
  } else {
    console.log('   ❌ No credentials found in GOOGLE_CLOUD_CREDENTIALS');
  }
} catch (error) {
  console.log('   ❌ Error checking credentials:', error.message);
}

console.log('\n3. Configuration Validation:');
try {
  // Import the config to test validation
  const configPath = path.join(__dirname, '..', 'src', 'lib', 'google-cloud', 'config.ts');
  console.log('   Config file path:', configPath);
  console.log('   Config file exists:', fs.existsSync(configPath));
  
  // Since we can't directly import TypeScript in Node.js, let's manually validate
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const visionEnabled = process.env.GOOGLE_CLOUD_VISION_API_ENABLED === 'true';
  const documentAiEnabled = process.env.GOOGLE_CLOUD_DOCUMENT_AI_ENABLED === 'true';
  const processorId = process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID;
  const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  const errors = [];
  
  if (!projectId) {
    errors.push('GOOGLE_CLOUD_PROJECT_ID is required');
  }
  
  if (!visionEnabled && !documentAiEnabled) {
    errors.push('At least one Google Cloud service must be enabled');
  }
  
  if (documentAiEnabled && !processorId) {
    errors.push('GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID is required when Document AI is enabled');
  }
  
  if (!credentials && !apiKey) {
    errors.push('Either service account credentials or API key is required');
  }
  
  if (errors.length === 0) {
    console.log('   ✅ Configuration is valid');
  } else {
    console.log('   ❌ Configuration errors:');
    errors.forEach(error => console.log(`     - ${error}`));
  }
  
} catch (error) {
  console.log('   ❌ Error validating configuration:', error.message);
}

console.log('\n4. Google Cloud Client Test:');
try {
  // Test if we can create the clients
  const { ImageAnnotatorClient } = require('@google-cloud/vision');
  const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
  
  console.log('   ✅ Google Cloud libraries are available');
  
  // Test client configuration
  const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
  if (credentials) {
    try {
      const parsedCreds = JSON.parse(credentials);
      const clientConfig = { credentials: parsedCreds };
      
      const visionClient = new ImageAnnotatorClient(clientConfig);
      console.log('   ✅ Vision API client created successfully');
      
      const documentAiClient = new DocumentProcessorServiceClient(clientConfig);
      console.log('   ✅ Document AI client created successfully');
      
    } catch (clientError) {
      console.log('   ❌ Error creating clients:', clientError.message);
    }
  } else {
    console.log('   ⚠️  Cannot test client creation without credentials');
  }
  
} catch (importError) {
  console.log('   ❌ Error importing Google Cloud libraries:', importError.message);
}

console.log('\n5. Processing Test Simulation:');
try {
  // Simulate the isGoogleCloudConfigured check
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const visionEnabled = process.env.GOOGLE_CLOUD_VISION_API_ENABLED === 'true';
  const documentAiEnabled = process.env.GOOGLE_CLOUD_DOCUMENT_AI_ENABLED === 'true';
  const processorId = process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID;
  const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
  
  console.log('   Project ID check:', !!projectId);
  console.log('   Vision API enabled:', visionEnabled);
  console.log('   Document AI enabled:', documentAiEnabled);
  console.log('   Processor ID check:', !!processorId);
  console.log('   Credentials check:', !!credentials);
  
  // Simulate the validation logic
  const errors = [];
  
  if (!projectId) {
    errors.push('Missing project ID');
  }
  
  if (!visionEnabled && !documentAiEnabled) {
    errors.push('No services enabled');
  }
  
  if (documentAiEnabled && !processorId) {
    errors.push('Document AI enabled but no processor ID');
  }
  
  if (!credentials) {
    errors.push('No credentials provided');
  }
  
  const isConfigured = errors.length === 0;
  console.log(`   isGoogleCloudConfigured() would return: ${isConfigured ? '✅ true' : '❌ false'}`);
  
  if (!isConfigured) {
    console.log('   Validation errors:');
    errors.forEach(error => console.log(`     - ${error}`));
  }
  
} catch (error) {
  console.log('   ❌ Error in processing test:', error.message);
}

console.log('\n6. Recommended Actions:');
const visionEnabled = process.env.GOOGLE_CLOUD_VISION_API_ENABLED === 'true';
const documentAiEnabled = process.env.GOOGLE_CLOUD_DOCUMENT_AI_ENABLED === 'true';
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
const processorId = process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID;

if (!projectId) {
  console.log('   1. Set GOOGLE_CLOUD_PROJECT_ID to your actual Google Cloud project ID');
}

if (!visionEnabled && !documentAiEnabled) {
  console.log('   2. Enable at least one service: GOOGLE_CLOUD_VISION_API_ENABLED=true OR GOOGLE_CLOUD_DOCUMENT_AI_ENABLED=true');
}

if (documentAiEnabled && !processorId) {
  console.log('   3. Set GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID to a valid processor ID');
}

if (!credentials) {
  console.log('   4. Set GOOGLE_CLOUD_CREDENTIALS with valid service account JSON');
}

if (processorId === 'test-processor-id') {
  console.log('   5. Replace test-processor-id with an actual Document AI processor ID');
}

console.log('\n=== Diagnosis Complete ===');