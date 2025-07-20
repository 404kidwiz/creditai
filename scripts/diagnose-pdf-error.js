#!/usr/bin/env node

/**
 * Diagnostic script to identify the exact cause of PDF processing 500 errors
 */

const fs = require('fs');
const path = require('path');

console.log('=== PDF Processing Diagnostic ===\n');

// Check environment variables
console.log('1. Environment Variables Check:');
const requiredEnvVars = [
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_CLOUD_KEY_FILE',
  'GOOGLE_CLOUD_PROJECT_ID',
  'GOOGLE_CLOUD_LOCATION',
  'GOOGLE_DOCUMENT_AI_PROCESSOR_ID',
  'GOOGLE_AI_API_KEY'
];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  console.log(`   ${envVar}: ${value ? '✅ SET' : '❌ MISSING'}`);
  if (value && (envVar.includes('KEY') || envVar.includes('CREDENTIALS'))) {
    console.log(`     Path: ${value}`);
    console.log(`     Exists: ${fs.existsSync(value) ? '✅' : '❌'}`);
  }
});

// Check Google Cloud configuration
console.log('\n2. Google Cloud Configuration:');
const configPath = path.join(__dirname, '..', 'src', 'lib', 'google-cloud', 'config.ts');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf8');
  console.log('   Config file exists: ✅');
  
  // Extract configuration values
  const projectIdMatch = configContent.match(/projectId:\s*['"]([^'"]+)['"]/);
  const locationMatch = configContent.match(/location:\s*['"]([^'"]+)['"]/);
  const processorIdMatch = configContent.match(/documentAiProcessorId:\s*['"]([^'"]+)['"]/);
  
  console.log(`   Project ID: ${projectIdMatch ? projectIdMatch[1] : '❌ NOT SET'}`);
  console.log(`   Location: ${locationMatch ? locationMatch[1] : '❌ NOT SET'}`);
  console.log(`   Processor ID: ${processorIdMatch ? processorIdMatch[1] : '❌ NOT SET'}`);
} else {
  console.log('   Config file missing: ❌');
}

// Check dependencies
console.log('\n3. Dependencies Check:');
const packageJson = require('../package.json');
const requiredDeps = ['@google-cloud/documentai', '@google-cloud/vision', '@google/generative-ai'];
requiredDeps.forEach(dep => {
  console.log(`   ${dep}: ${packageJson.dependencies[dep] ? '✅' : '❌ MISSING'}`);
});

// Check service account file
console.log('\n4. Service Account Check:');
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_KEY_FILE;
if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log(`   Service account file: ✅`);
    console.log(`   Project ID: ${serviceAccount.project_id || '❌ MISSING'}`);
    console.log(`   Client email: ${serviceAccount.client_email || '❌ MISSING'}`);
  } catch (error) {
    console.log(`   Service account file: ❌ INVALID JSON`);
  }
} else {
  console.log(`   Service account file: ❌ NOT FOUND`);
}

console.log('\n=== Diagnostic Complete ===');
console.log('\nNext steps:');
console.log('1. Run: npm run setup-google-cloud');
console.log('2. Check: GOOGLE_APPLICATION_CREDENTIALS points to valid service account JSON');
console.log('3. Verify: Document AI processor is created and ID is correct');
console.log('4. Enable: Required Google Cloud APIs');