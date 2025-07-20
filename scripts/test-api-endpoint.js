#!/usr/bin/env node

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

console.log('=== API Endpoint Test ===\n');

async function testAPIEndpoint() {
  try {
    // Create a simple test PDF content
    const testPDFContent = Buffer.from(`
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 100 >>
stream
BT
/F1 12 Tf
100 700 Td
(CREDIT REPORT TEST) Tj
0 -20 Td
(Name: John Doe) Tj
0 -20 Td
(Score: 650) Tj
0 -20 Td
(Account: Bank Credit Card) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000229 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
379
%%EOF
    `.trim());
    
    console.log('1. Creating test PDF file...');
    const testFilePath = '/tmp/test-credit-report.pdf';
    fs.writeFileSync(testFilePath, testPDFContent);
    console.log('   Test PDF created:', testFilePath, '(' + testPDFContent.length + ' bytes)');
    
    console.log('\n2. Testing /api/process-pdf endpoint...');
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath), {
      filename: 'test-credit-report.pdf',
      contentType: 'application/pdf'
    });
    
    console.log('   Sending POST request to http://localhost:3002/api/process-pdf...');
    
    const response = await fetch('http://localhost:3002/api/process-pdf', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    console.log('   Response status:', response.status, response.statusText);
    console.log('   Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('   Response body length:', responseText.length);
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('\n3. Processing Result:');
      console.log('   Success:', responseData.success);
      console.log('   Processing method:', responseData.processingMethod);
      console.log('   Confidence:', responseData.confidence);
      console.log('   Processing time:', responseData.processingTime + 'ms');
      
      if (responseData.extractedText) {
        console.log('   Extracted text length:', responseData.extractedText.length);
        console.log('   Text preview:', responseData.extractedText.substring(0, 200) + '...');
      }
      
      if (responseData.analysis) {
        console.log('   Analysis data:', {
          accountsCount: responseData.analysis.accounts?.length || 0,
          negativeItemsCount: responseData.analysis.negativeItems?.length || 0,
          inquiriesCount: responseData.analysis.inquiries?.length || 0,
          hasPersonalInfo: !!responseData.analysis.personalInfo
        });
      }
      
      if (responseData.aiAnalysis) {
        console.log('   AI Analysis:', {
          hasExtractedData: !!responseData.aiAnalysis.extractedData,
          recommendationsCount: responseData.aiAnalysis.recommendations?.length || 0,
          hasSummary: !!responseData.aiAnalysis.summary,
          confidence: responseData.aiAnalysis.confidence
        });
      }
      
      if (responseData.securityInfo) {
        console.log('   Security Info:', responseData.securityInfo);
      }
      
    } catch (parseError) {
      console.log('   ❌ Failed to parse JSON response');
      console.log('   Raw response:', responseText.substring(0, 500));
    }
    
    console.log('\n4. Server logs (check dev-server.log for detailed processing logs)');
    
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log('   Test file cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testAPIEndpoint().then(() => {
  console.log('\n=== Test Complete ===');
  console.log('📝 Check the server logs for detailed processing information:');
  console.log('   tail -f dev-server.log | grep "🔍"');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});