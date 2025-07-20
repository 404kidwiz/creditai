#!/usr/bin/env node

/**
 * Debug script to test PDF processing pipeline
 * This script simulates uploading a PDF and traces the entire pipeline
 */

const fs = require('fs');
const path = require('path');

// Create a mock PDF file for testing
function createMockPDFFile() {
    // Create a minimal PDF content - this is a basic PDF structure
    const pdfContent = `%PDF-1.4
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
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000208 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
307
%%EOF`;

    const mockPdfPath = path.join(__dirname, 'test-credit-report.pdf');
    fs.writeFileSync(mockPdfPath, pdfContent);
    return mockPdfPath;
}

// Test the PDF processing endpoint
async function testPDFProcessing() {
    console.log('🔍 [DEBUG] Starting PDF processing pipeline test...');
    
    // Create mock PDF
    const pdfPath = createMockPDFFile();
    console.log('🔍 [DEBUG] Created mock PDF at:', pdfPath);
    
    try {
        // Read the PDF file
        const pdfBuffer = fs.readFileSync(pdfPath);
        console.log('🔍 [DEBUG] Read PDF file, size:', pdfBuffer.length, 'bytes');
        
        // Create FormData equivalent for Node.js
        const FormData = require('form-data');
        let fetch;
        try {
            fetch = require('node-fetch');
        } catch (error) {
            // Fallback to built-in fetch in Node 18+
            if (global.fetch) {
                fetch = global.fetch;
            } else {
                throw new Error('No fetch implementation available. Please install node-fetch or use Node.js 18+');
            }
        }
        
        const formData = new FormData();
        formData.append('file', pdfBuffer, {
            filename: 'test-credit-report.pdf',
            contentType: 'application/pdf'
        });
        
        console.log('🔍 [DEBUG] Sending POST request to API endpoint...');
        
        // Send request to the API
        const response = await fetch('http://localhost:3000/api/process-pdf', {
            method: 'POST',
            body: formData,
            headers: {
                ...formData.getHeaders()
            }
        });
        
        console.log('🔍 [DEBUG] Response status:', response.status);
        console.log('🔍 [DEBUG] Response headers:', response.headers.raw());
        
        const responseText = await response.text();
        console.log('🔍 [DEBUG] Response text length:', responseText.length);
        console.log('🔍 [DEBUG] Response text preview (first 1000 chars):', responseText.substring(0, 1000));
        
        if (response.ok) {
            try {
                const result = JSON.parse(responseText);
                console.log('🔍 [DEBUG] Parsed response:', {
                    success: result.success,
                    extractedTextLength: result.extractedText?.length || 0,
                    hasAnalysis: !!result.analysis,
                    confidence: result.confidence,
                    processingTime: result.processingTime,
                    processingMethod: result.processingMethod,
                    hasAiAnalysis: !!result.aiAnalysis,
                    securityInfo: result.securityInfo
                });
                
                if (result.extractedText) {
                    console.log('🔍 [DEBUG] Extracted text preview (first 500 chars):', result.extractedText.substring(0, 500));
                }
                
                if (result.analysis) {
                    console.log('🔍 [DEBUG] Analysis details:', {
                        personalInfo: result.analysis.personalInfo,
                        accountsCount: result.analysis.accounts?.length || 0,
                        negativeItemsCount: result.analysis.negativeItems?.length || 0,
                        creditScore: result.analysis.creditScore
                    });
                }
                
                if (result.aiAnalysis) {
                    console.log('🔍 [DEBUG] AI Analysis details:', {
                        hasExtractedData: !!result.aiAnalysis.extractedData,
                        recommendationsCount: result.aiAnalysis.recommendations?.length || 0,
                        scoreAnalysis: result.aiAnalysis.scoreAnalysis,
                        summaryLength: result.aiAnalysis.summary?.length || 0
                    });
                }
                
            } catch (parseError) {
                console.error('❌ [DEBUG] Failed to parse JSON response:', parseError);
                console.log('🔍 [DEBUG] Raw response:', responseText);
            }
        } else {
            console.error('❌ [DEBUG] Request failed with status:', response.status);
            console.error('❌ [DEBUG] Response text:', responseText);
        }
        
    } catch (error) {
        console.error('❌ [DEBUG] Error during PDF processing test:', error);
    } finally {
        // Clean up mock PDF
        try {
            fs.unlinkSync(pdfPath);
            console.log('🔍 [DEBUG] Cleaned up mock PDF file');
        } catch (cleanupError) {
            console.warn('⚠️ [DEBUG] Failed to clean up mock PDF:', cleanupError);
        }
    }
}

// Install required dependencies if not present
async function installDependencies() {
    const requiredPackages = ['form-data', 'node-fetch'];
    
    for (const pkg of requiredPackages) {
        try {
            require(pkg);
        } catch (error) {
            console.log(`Installing ${pkg}...`);
            const { execSync } = require('child_process');
            execSync(`npm install ${pkg}`, { stdio: 'inherit' });
        }
    }
}

// Main execution
async function main() {
    try {
        await installDependencies();
        await testPDFProcessing();
    } catch (error) {
        console.error('❌ [DEBUG] Main execution failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}