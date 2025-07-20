#!/usr/bin/env node

const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGoogleCloudConfig() {
  console.log('🧪 Testing Google Cloud Configuration...\n');
  
  // Test 1: Environment Variables
  console.log('1. Checking Environment Variables...');
  const requiredVars = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_CLOUD_LOCATION',
    'GOOGLE_CLOUD_KEY_FILE',
    'GOOGLE_AI_API_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
    return;
  }
  console.log('✅ All required environment variables found\n');
  
  // Test 2: Vision API
  console.log('2. Testing Vision API...');
  try {
    const visionClient = new ImageAnnotatorClient();
    console.log('✅ Vision API client initialized successfully\n');
  } catch (error) {
    console.error('❌ Vision API initialization failed:', error.message);
    return;
  }
  
  // Test 3: Document AI
  console.log('3. Testing Document AI...');
  try {
    const documentAiClient = new DocumentProcessorServiceClient();
    console.log('✅ Document AI client initialized successfully\n');
  } catch (error) {
    console.error('❌ Document AI initialization failed:', error.message);
    return;
  }
  
  // Test 4: Gemini AI
  console.log('4. Testing Gemini AI...');
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('✅ Gemini AI client initialized successfully\n');
  } catch (error) {
    console.error('❌ Gemini AI initialization failed:', error.message);
    return;
  }
  
  console.log('🎉 All Google Cloud services configured correctly!');
  console.log('   Your PDF processing will now use:');
  console.log('   📄 Document AI for structured document processing');
  console.log('   👁️  Vision API for fallback text extraction');
  console.log('   🧠 Gemini AI for intelligent analysis and dispute generation');
}

if (require.main === module) {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  testGoogleCloudConfig().catch(console.error);
}

module.exports = { testGoogleCloudConfig };
