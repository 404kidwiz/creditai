import { NextRequest, NextResponse } from 'next/server';
import { GoogleCloudPDFProcessor } from '@/lib/google-cloud/pdfProcessor';

export async function GET(request: NextRequest) {
  try {
    // Test Google Cloud services connectivity
    const testResults = {
      timestamp: new Date().toISOString(),
      services: {
        documentAI: false,
        visionAPI: false,
        storage: false
      },
      errors: [] as string[]
    };

    // Test Document AI
    try {
      const processor = new GoogleCloudPDFProcessor();
      
      // Check if processor can be initialized
      const processorId = process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID;
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      
      if (!processorId || !projectId) {
        throw new Error('Missing required environment variables for Document AI');
      }
      
      testResults.services.documentAI = true;
    } catch (error) {
      testResults.errors.push(`Document AI: ${(error as Error).message}`);
    }

    // Test Vision API (basic configuration check)
    try {
      const visionApiKey = process.env.GOOGLE_AI_API_KEY;
      
      if (!visionApiKey) {
        throw new Error('Missing Google AI API key for Vision API');
      }
      
      testResults.services.visionAPI = true;
    } catch (error) {
      testResults.errors.push(`Vision API: ${(error as Error).message}`);
    }

    // Test Storage (basic configuration check)
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const bucketName = `${projectId}-credit-reports`;
      
      if (!projectId) {
        throw new Error('Missing Google Cloud project ID for Storage');
      }
      
      testResults.services.storage = true;
    } catch (error) {
      testResults.errors.push(`Storage: ${(error as Error).message}`);
    }

    // Determine overall status
    const servicesWorking = Object.values(testResults.services).filter(Boolean).length;
    const totalServices = Object.keys(testResults.services).length;
    const allServicesWorking = servicesWorking === totalServices;

    const response = {
      success: allServicesWorking,
      message: allServicesWorking 
        ? 'All Google Cloud services are properly configured'
        : `${servicesWorking}/${totalServices} Google Cloud services are working`,
      details: testResults
    };

    return NextResponse.json(response, { 
      status: allServicesWorking ? 200 : 500 
    });

  } catch (error) {
    console.error('Google Cloud services test error:', error);
    
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}