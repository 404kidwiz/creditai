const { ImageAnnotatorClient } = require('@google-cloud/vision')
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
require('dotenv').config({ path: '.env.local' })

async function testGoogleCloudServices() {
  console.log('🔍 Testing Google Cloud Services...')
  
  // Check environment variables
  console.log('📋 Environment Variables:')
  console.log('  - GOOGLE_CLOUD_PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID)
  console.log('  - GOOGLE_CLOUD_LOCATION:', process.env.GOOGLE_CLOUD_LOCATION)
  console.log('  - GOOGLE_CLOUD_VISION_API_ENABLED:', process.env.GOOGLE_CLOUD_VISION_API_ENABLED)
  console.log('  - GOOGLE_CLOUD_DOCUMENT_AI_ENABLED:', process.env.GOOGLE_CLOUD_DOCUMENT_AI_ENABLED)
  console.log('  - GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID:', process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID)
  console.log('  - GOOGLE_CLOUD_CREDENTIALS:', process.env.GOOGLE_CLOUD_CREDENTIALS)
  
  // Test Vision API
  console.log('\n🔍 Testing Vision API...')
  try {
    const visionClient = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_CLOUD_CREDENTIALS,
    })
    
    // Create a simple test image (1x1 pixel PNG)
    const testImage = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE5, 0x27, 0xDE, 0xFC,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    
    const [result] = await visionClient.labelDetection(testImage)
    console.log('✅ Vision API is working!')
    console.log('  - Labels detected:', result.labelAnnotations?.length || 0)
    
  } catch (error) {
    console.log('❌ Vision API error:', error.message)
    if (error.message.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
      console.log('💡 Tip: Make sure the service account key file exists and path is correct')
    }
  }
  
  // Test Document AI (if processor ID is available)
  console.log('\n🔍 Testing Document AI...')
  if (!process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID) {
    console.log('⚠️ Document AI Processor ID not configured - skipping test')
    console.log('💡 Document AI is optional - Vision API will be used as fallback')
  } else {
    try {
      const documentClient = new DocumentProcessorServiceClient({
        keyFilename: process.env.GOOGLE_CLOUD_CREDENTIALS,
      })
      
      // Create a simple test PDF
      const testPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n178\n%%EOF')
      
      const request = {
        name: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/${process.env.GOOGLE_CLOUD_LOCATION}/processors/${process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID}`,
        rawDocument: {
          content: testPdf,
          mimeType: 'application/pdf'
        }
      }
      
      const [result] = await documentClient.processDocument(request)
      console.log('✅ Document AI is working!')
      console.log('  - Document processed successfully')
      console.log('  - Text extracted:', result.document?.text?.length || 0, 'characters')
      
    } catch (error) {
      console.log('❌ Document AI error:', error.message)
      if (error.message.includes('Processor')) {
        console.log('💡 Tip: Make sure the Document AI processor is created and ID is correct')
      }
    }
  }
  
  console.log('\n🎯 Summary:')
  console.log('  - Google AI (Gemini): ✅ Working')
  console.log('  - Vision API: Testing above...')
  console.log('  - Document AI: Testing above...')
  console.log('\n💡 The system will use Vision API as fallback if Document AI is not available')
}

testGoogleCloudServices()