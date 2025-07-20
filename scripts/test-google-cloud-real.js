#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

console.log('=== Real Google Cloud Service Test ===\n');

async function testGoogleCloudServices() {
  try {
    // Test Document AI Processor Creation/Listing
    console.log('1. Testing Document AI Processor Access...');
    
    const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
    
    const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GOOGLE_CLOUD_LOCATION;
    
    const client = new DocumentProcessorServiceClient({ credentials });
    
    try {
      // List available processors
      const parent = `projects/${projectId}/locations/${location}`;
      console.log('   Listing processors in:', parent);
      
      const [processors] = await client.listProcessors({ parent });
      console.log('   ✅ Successfully connected to Document AI');
      console.log('   Available processors:', processors.length);
      
      processors.forEach((processor, index) => {
        console.log(`   ${index + 1}. ${processor.displayName} (${processor.name})`);
        console.log(`      Type: ${processor.type}, State: ${processor.state}`);
      });
      
      // Check if we need to create a processor
      const formProcessor = processors.find(p => p.type === 'FORM_PARSER_PROCESSOR');
      const ocrProcessor = processors.find(p => p.type === 'OCR_PROCESSOR');
      
      let processorToUse = formProcessor || ocrProcessor;
      
      if (!processorToUse && processors.length === 0) {
        console.log('   No processors found. Creating a new OCR processor...');
        
        try {
          const [operation] = await client.createProcessor({
            parent,
            processor: {
              displayName: 'CreditAI OCR Processor',
              type: 'OCR_PROCESSOR'
            }
          });
          
          console.log('   Waiting for processor creation...');
          const [processor] = await operation.promise();
          console.log('   ✅ Created new processor:', processor.name);
          processorToUse = processor;
        } catch (createError) {
          console.log('   ❌ Failed to create processor:', createError.message);
          console.log('   This might be due to permissions or quotas.');
        }
      }
      
      if (processorToUse) {
        const processorId = processorToUse.name.split('/').pop();
        console.log('\n   🎯 Recommended processor ID for .env.local:');
        console.log(`   GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=${processorId}`);
        
        // Test a simple document processing
        console.log('\n2. Testing Document Processing...');
        
        // Create a simple test document
        const testContent = Buffer.from('Sample credit report text for testing').toString('base64');
        
        const request = {
          name: processorToUse.name,
          rawDocument: {
            content: testContent,
            mimeType: 'text/plain'
          }
        };
        
        try {
          const [result] = await client.processDocument(request);
          console.log('   ✅ Test document processing successful');
          console.log('   Extracted text length:', result.document?.text?.length || 0);
        } catch (processError) {
          console.log('   ❌ Test document processing failed:', processError.message);
        }
      } else {
        console.log('   ⚠️  No suitable processor found and creation failed');
        console.log('   You may need to manually create a processor in the Google Cloud Console');
      }
      
    } catch (listError) {
      console.log('   ❌ Failed to list processors:', listError.message);
      console.log('   This might indicate authentication or permission issues');
    }
    
    // Test Vision API
    console.log('\n3. Testing Vision API...');
    
    const { ImageAnnotatorClient } = require('@google-cloud/vision');
    const visionClient = new ImageAnnotatorClient({ credentials });
    
    try {
      // Test with a simple image (base64 encoded simple text)
      const testImageContent = Buffer.from('Simple test text').toString('base64');
      
      const [result] = await visionClient.textDetection({
        image: { content: testImageContent }
      });
      
      console.log('   ✅ Vision API connection successful');
      // Note: This will likely fail since we're sending text instead of an image,
      // but the connection test is what matters
    } catch (visionError) {
      if (visionError.message.includes('Invalid image')) {
        console.log('   ✅ Vision API connection successful (image format error expected)');
      } else {
        console.log('   ❌ Vision API test failed:', visionError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testGoogleCloudServices().then(() => {
  console.log('\n=== Test Complete ===');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});