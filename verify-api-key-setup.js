#!/usr/bin/env node

/**
 * API Key Setup Verification Script
 * 
 * This script verifies that the Google AI API key is properly configured
 * across all necessary files and components.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFYING API KEY SETUP...\n');

// Check .env.local file
function checkEnvFile() {
  console.log('1️⃣ Checking .env.local file...');
  
  if (!fs.existsSync('.env.local')) {
    console.log('❌ .env.local file not found!');
    return false;
  }
  
  const envContent = fs.readFileSync('.env.local', 'utf8');
  
  // Check for Google AI API key
  const apiKeyMatch = envContent.match(/GOOGLE_AI_API_KEY=(.+)/);
  if (!apiKeyMatch) {
    console.log('❌ GOOGLE_AI_API_KEY not found in .env.local');
    return false;
  }
  
  const apiKey = apiKeyMatch[1].trim();
  if (apiKey === 'your_actual_gemini_api_key_here' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.log('❌ GOOGLE_AI_API_KEY still has placeholder value');
    return false;
  }
  
  if (!apiKey.startsWith('AIzaSy')) {
    console.log('❌ GOOGLE_AI_API_KEY does not appear to be a valid Google API key');
    return false;
  }
  
  console.log('✅ GOOGLE_AI_API_KEY is properly configured');
  console.log(`   Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  
  // Check for Google Cloud configuration
  const requiredVars = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_CLOUD_LOCATION',
    'GOOGLE_CLOUD_VISION_API_ENABLED',
    'GOOGLE_CLOUD_DOCUMENT_AI_ENABLED',
    'GOOGLE_CLOUD_CREDENTIALS_TYPE'
  ];
  
  let allPresent = true;
  requiredVars.forEach(varName => {
    if (!envContent.includes(varName)) {
      console.log(`❌ Missing ${varName} in .env.local`);
      allPresent = false;
    } else {
      console.log(`✅ ${varName} is configured`);
    }
  });
  
  return allPresent;
}

// Check if creditAnalyzer.ts can find the API key
function checkCreditAnalyzer() {
  console.log('\n2️⃣ Checking creditAnalyzer.ts configuration...');
  
  const analyzerPath = 'src/lib/ai/creditAnalyzer.ts';
  if (!fs.existsSync(analyzerPath)) {
    console.log('❌ creditAnalyzer.ts not found!');
    return false;
  }
  
  const analyzerContent = fs.readFileSync(analyzerPath, 'utf8');
  
  // Check for proper API key handling
  if (analyzerContent.includes('process.env.GOOGLE_AI_API_KEY')) {
    console.log('✅ creditAnalyzer.ts reads GOOGLE_AI_API_KEY from environment');
  } else {
    console.log('❌ creditAnalyzer.ts does not read GOOGLE_AI_API_KEY');
    return false;
  }
  
  // Check for placeholder detection
  if (analyzerContent.includes('your_actual_gemini_api_key_here')) {
    console.log('✅ creditAnalyzer.ts has placeholder detection');
  } else {
    console.log('⚠️  creditAnalyzer.ts missing placeholder detection');
  }
  
  return true;
}

// Check Google Cloud config
function checkGoogleCloudConfig() {
  console.log('\n3️⃣ Checking Google Cloud configuration...');
  
  const configPath = 'src/lib/google-cloud/config.ts';
  if (!fs.existsSync(configPath)) {
    console.log('❌ Google Cloud config.ts not found!');
    return false;
  }
  
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  if (configContent.includes('process.env.GOOGLE_AI_API_KEY')) {
    console.log('✅ Google Cloud config reads GOOGLE_AI_API_KEY');
  } else {
    console.log('❌ Google Cloud config does not read GOOGLE_AI_API_KEY');
    return false;
  }
  
  return true;
}

// Test API key format
function testApiKeyFormat() {
  console.log('\n4️⃣ Testing API key format...');
  
  require('dotenv').config({ path: '.env.local' });
  
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ API key not loaded from environment');
    return false;
  }
  
  if (!apiKey.startsWith('AIzaSy')) {
    console.log('❌ API key does not have correct Google format');
    return false;
  }
  
  if (apiKey.length < 30) {
    console.log('❌ API key appears to be too short');
    return false;
  }
  
  console.log('✅ API key format appears valid');
  console.log(`   Length: ${apiKey.length} characters`);
  console.log(`   Format: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  
  return true;
}

// Run all checks
async function runAllChecks() {
  const results = [
    checkEnvFile(),
    checkCreditAnalyzer(),
    checkGoogleCloudConfig(),
    testApiKeyFormat()
  ];
  
  const allPassed = results.every(result => result === true);
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 ALL CHECKS PASSED!');
    console.log('✅ Your Google AI API key is properly configured');
    console.log('✅ All configuration files are set up correctly');
    console.log('\n🚀 You can now restart your development server:');
    console.log('   npm run dev');
    console.log('\n📊 Your credit analysis should now work with high accuracy!');
  } else {
    console.log('❌ SOME CHECKS FAILED');
    console.log('⚠️  Please review the errors above and fix them');
    console.log('\n🔧 Common fixes:');
    console.log('   1. Ensure GOOGLE_AI_API_KEY has a real API key value');
    console.log('   2. Get your API key from: https://aistudio.google.com/app/apikey');
    console.log('   3. Restart your development server after making changes');
  }
  
  console.log('='.repeat(50));
}

// Run the verification
runAllChecks().catch(console.error);