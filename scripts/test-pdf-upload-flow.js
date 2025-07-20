#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

console.log('=== PDF Upload Flow Test ===\n');

async function testUploadFlow() {
  try {
    console.log('1. Testing isGoogleCloudConfigured() logic...');
    
    // Replicate the configuration check logic
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const visionEnabled = process.env.GOOGLE_CLOUD_VISION_API_ENABLED === 'true';
    const documentAiEnabled = process.env.GOOGLE_CLOUD_DOCUMENT_AI_ENABLED === 'true';
    const processorId = process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID;
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    console.log('   Environment variables:');
    console.log('     GOOGLE_CLOUD_PROJECT_ID:', !!projectId);
    console.log('     GOOGLE_CLOUD_VISION_API_ENABLED:', visionEnabled);
    console.log('     GOOGLE_CLOUD_DOCUMENT_AI_ENABLED:', documentAiEnabled);
    console.log('     GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID:', !!processorId);
    console.log('     GOOGLE_CLOUD_CREDENTIALS:', !!credentials);
    console.log('     GOOGLE_AI_API_KEY:', !!apiKey);
    
    // Validation logic from config.ts
    const errors = [];
    
    if (!projectId) {
      errors.push('GOOGLE_CLOUD_PROJECT_ID is required');
    }
    
    if (!visionEnabled && !documentAiEnabled) {
      errors.push('At least one Google Cloud service must be enabled (Vision API or Document AI)');
    }
    
    if (documentAiEnabled && !processorId) {
      errors.push('GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID is required when Document AI is enabled');
    }
    
    // Check authentication method
    if (!credentials && !apiKey) {
      errors.push('Service account key file or credentials are required');
    } else if (credentials) {
      try {
        const parsedCreds = JSON.parse(credentials);
        console.log('     Credentials valid JSON: ✅');
        console.log('     Service account email:', parsedCreds.client_email);
      } catch (e) {
        errors.push('GOOGLE_CLOUD_CREDENTIALS contains invalid JSON');
      }
    }
    
    const isConfigured = errors.length === 0;
    console.log('   isGoogleCloudConfigured() result:', isConfigured ? '✅ true' : '❌ false');
    
    if (!isConfigured) {
      console.log('   Configuration errors:');
      errors.forEach(error => console.log(`     - ${error}`));
    }
    
    console.log('\n2. Testing Google Cloud client initialization...');
    
    if (isConfigured) {
      try {
        const { ImageAnnotatorClient } = require('@google-cloud/vision');
        const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
        
        const parsedCreds = JSON.parse(credentials);
        const clientConfig = { credentials: parsedCreds };
        
        let visionClient = null;
        let documentAiClient = null;
        
        if (visionEnabled) {
          console.log('   Creating Vision API client...');
          visionClient = new ImageAnnotatorClient(clientConfig);
          console.log('   ✅ Vision API client created');
        }
        
        if (documentAiEnabled && processorId && processorId !== 'test-processor-id') {
          console.log('   Creating Document AI client...');
          documentAiClient = new DocumentProcessorServiceClient(clientConfig);
          console.log('   ✅ Document AI client created');
        } else if (documentAiEnabled) {
          console.log('   ⚠️  Document AI enabled but using test processor ID');
        }
        
        console.log('   Client summary:', {
          visionClient: !!visionClient,
          documentAiClient: !!documentAiClient
        });
        
      } catch (clientError) {
        console.log('   ❌ Client creation failed:', clientError.message);
      }
    }
    
    console.log('\n3. Testing processing flow logic...');
    
    const processingFlow = {
      step1: 'Check if isConfigured',
      step2: 'Try Document AI if enabled and has real processor',
      step3: 'Try Vision API if enabled', 
      step4: 'Use fallback processing'
    };
    
    console.log('   Processing flow:');
    Object.entries(processingFlow).forEach(([step, description]) => {
      console.log(`     ${step}: ${description}`);
    });
    
    // Simulate the processing decision logic
    console.log('\n   Processing decision simulation:');
    
    if (isConfigured) {
      console.log('     ✅ Google Cloud is configured');
      
      if (documentAiEnabled && processorId && processorId !== 'test-processor-id') {
        console.log('     → Would try Document AI first');
      } else if (documentAiEnabled && processorId === 'test-processor-id') {
        console.log('     → Document AI enabled but has test processor ID - would skip');
      } else {
        console.log('     → Document AI disabled - would skip');
      }
      
      if (visionEnabled) {
        console.log('     → Would try Vision API (PDF to images conversion)');
      } else {
        console.log('     → Vision API disabled - would skip');
      }
      
      if (!documentAiEnabled && !visionEnabled) {
        console.log('     → No services enabled - would use fallback');
      }
    } else {
      console.log('     → Google Cloud not configured - would use fallback immediately');
    }
    
    console.log('\n4. Recommended next steps...');
    
    if (isConfigured && visionEnabled) {
      console.log('   ✅ Configuration is ready for Vision API processing');
      console.log('   📝 Test with real PDF upload through the web interface');
      console.log('   📝 Check browser console and server logs for detailed processing info');
    }
    
    if (documentAiEnabled && processorId === 'test-processor-id') {
      console.log('   ⚠️  Document AI is enabled but using test processor ID');
      console.log('   📝 Either disable Document AI or create a real processor');
      console.log('   📝 To disable: Set GOOGLE_CLOUD_DOCUMENT_AI_ENABLED=false');
    }
    
    if (!isConfigured) {
      console.log('   ❌ Configuration issues need to be resolved');
      console.log('   📝 Fix the errors listed above');
    }
    
    console.log('\n5. Test summary...');
    console.log('   Configuration valid:', isConfigured ? '✅' : '❌');
    console.log('   Vision API available:', visionEnabled ? '✅' : '❌');
    console.log('   Document AI available:', (documentAiEnabled && processorId !== 'test-processor-id') ? '✅' : '❌');
    console.log('   Ready for real OCR:', (isConfigured && visionEnabled) ? '✅' : '❌');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testUploadFlow().then(() => {
  console.log('\n=== Test Complete ===');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});