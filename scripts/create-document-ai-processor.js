#!/usr/bin/env node

const { execSync } = require('child_process');

async function createDocumentAIProcessor() {
  try {
    console.log('🔧 Creating Document AI processor...');
    
    // Get access token
    const accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
    
    // Project and location
    const projectId = 'creditai-465215';
    const location = 'us';
    
    // Create processor using REST API
    const createProcessorUrl = `https://documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors`;
    
    const processorData = {
      type: 'OCR_PROCESSOR',
      displayName: 'Credit Report OCR Processor'
    };
    
    const curlCommand = `curl -X POST ${createProcessorUrl} \\
      -H "Authorization: Bearer ${accessToken}" \\
      -H "Content-Type: application/json" \\
      -d '${JSON.stringify(processorData)}'`;
    
    console.log('📡 Creating processor...');
    const result = execSync(curlCommand, { encoding: 'utf8' });
    
    const response = JSON.parse(result);
    
    if (response.name) {
      const processorId = response.name.split('/').pop();
      console.log('✅ Document AI processor created successfully!');
      console.log(`📋 Processor ID: ${processorId}`);
      console.log(`📋 Full name: ${response.name}`);
      console.log(`📋 Display name: ${response.displayName}`);
      console.log(`📋 Type: ${response.type}`);
      
      console.log('\n🔧 Add this to your .env.local file:');
      console.log(`GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=${processorId}`);
      
      return processorId;
    } else {
      console.error('❌ Failed to create processor:', result);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error creating Document AI processor:', error.message);
    return null;
  }
}

// Run the function
createDocumentAIProcessor(); 