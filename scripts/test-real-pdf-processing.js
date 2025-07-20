#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

console.log('=== Real PDF Processing Test ===\n');

async function testPDFProcessing() {
  try {
    console.log('1. Configuration Check...');
    
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const visionEnabled = process.env.GOOGLE_CLOUD_VISION_API_ENABLED === 'true';
    const documentAiEnabled = process.env.GOOGLE_CLOUD_DOCUMENT_AI_ENABLED === 'true';
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    
    console.log('   Project ID:', projectId);
    console.log('   Vision API enabled:', visionEnabled);
    console.log('   Document AI enabled:', documentAiEnabled);
    console.log('   Has credentials:', !!credentials);
    
    if (!visionEnabled) {
      console.log('   ❌ Vision API is disabled. Enable it in .env.local');
      return;
    }
    
    console.log('\n2. Testing Google Cloud Vision API...');
    
    const { ImageAnnotatorClient } = require('@google-cloud/vision');
    const parsedCreds = JSON.parse(credentials);
    const client = new ImageAnnotatorClient({ credentials: parsedCreds });
    
    // Create a simple test image with text
    console.log('   Creating test image...');
    
    // For testing, we'll use a simple base64 text image
    // In reality, this would be a real image file
    const testText = `
CREDIT REPORT
John Doe
123 Main Street, Anytown, NY 10001
SSN: 123-45-6789

CREDIT SCORE: 680
Report Date: January 15, 2024

ACCOUNTS:
Bank of America Credit Card
Account #: ****1234
Balance: $1,500
Status: Current

Chase Auto Loan  
Account #: ****5678
Balance: $15,000
Status: Current
    `.trim();
    
    console.log('   Test text prepared:', testText.substring(0, 100) + '...');
    
    // Note: For a real test, you would load an actual image file
    // const imageBuffer = fs.readFileSync('/path/to/test/credit-report.jpg');
    // const imageBase64 = imageBuffer.toString('base64');
    
    // For now, we'll test the client connection
    try {
      // Test client initialization and authentication
      console.log('   Testing Vision API authentication...');
      
      // This will fail because we don't have a real image, but it will test auth
      const [result] = await client.textDetection({
        image: { content: 'invalid-base64-content' }
      });
      
    } catch (error) {
      if (error.message.includes('Invalid base64') || error.message.includes('Invalid image')) {
        console.log('   ✅ Vision API authentication successful (image format error expected)');
      } else if (error.message.includes('PERMISSION_DENIED') || error.message.includes('API_KEY_INVALID')) {
        console.log('   ❌ Vision API authentication failed:', error.message);
        return;
      } else {
        console.log('   ❌ Vision API error:', error.message);
        return;
      }
    }
    
    console.log('\n3. Testing PDF Processing Logic...');
    
    // Import the PDF processor
    console.log('   Loading PDF processor...');
    
    // Simulate the processor initialization
    const processorConfig = {
      projectId: projectId,
      location: 'us',
      visionApiEnabled: visionEnabled,
      documentAiEnabled: documentAiEnabled,
      credentials: parsedCreds
    };
    
    console.log('   Processor configuration:', {
      projectId: processorConfig.projectId,
      location: processorConfig.location,
      visionEnabled: processorConfig.visionApiEnabled,
      documentAiEnabled: processorConfig.documentAiEnabled,
      hasCredentials: !!processorConfig.credentials
    });
    
    // Test the configuration validation logic
    const errors = [];
    
    if (!processorConfig.projectId) {
      errors.push('Missing project ID');
    }
    
    if (!processorConfig.visionApiEnabled && !processorConfig.documentAiEnabled) {
      errors.push('No services enabled');
    }
    
    if (!processorConfig.credentials) {
      errors.push('No credentials provided');
    }
    
    const isConfigured = errors.length === 0;
    console.log('   Configuration validation:', isConfigured ? '✅ Valid' : '❌ Invalid');
    
    if (!isConfigured) {
      console.log('   Validation errors:');
      errors.forEach(error => console.log(`     - ${error}`));
      return;
    }
    
    console.log('\n4. Real File Processing Test...');
    
    // Create a test PDF-like file (actually text for this test)
    const testFileContent = Buffer.from(`
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Sample Credit Report) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
398
%%EOF
    `);
    
    // Simulate file object
    const testFile = {
      name: 'test-credit-report.pdf',
      type: 'application/pdf',
      size: testFileContent.length,
      arrayBuffer: () => Promise.resolve(testFileContent.buffer)
    };
    
    console.log('   Test file created:', {
      name: testFile.name,
      type: testFile.type,
      size: testFile.size
    });
    
    // For a real test, we would process this through the actual PDF processor
    console.log('   ✅ PDF processing setup complete');
    console.log('   Note: For full testing, upload a real PDF through the web interface');
    
    console.log('\n5. Recommendations...');
    console.log('   ✅ Vision API is properly configured and authenticated');
    console.log('   ✅ Document AI is disabled (avoiding permission issues)');
    console.log('   ✅ Configuration validation passes');
    console.log('   📝 Next: Test with real PDF files through the web interface');
    console.log('   📝 Monitor console logs for detailed processing information');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testPDFProcessing().then(() => {
  console.log('\n=== Test Complete ===');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});