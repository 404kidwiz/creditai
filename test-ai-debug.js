const { creditAnalyzer } = require('./src/lib/ai/creditAnalyzer.ts');

async function testAIFunctionality() {
  console.log('🧪 Starting AI debugging test...');
  
  try {
    // Test 1: Check if AI model is initialized
    console.log('\n=== Test 1: AI Initialization ===');
    const testResult = await creditAnalyzer.testAI();
    console.log('AI Test Result:', testResult);
    
    if (!testResult.success) {
      console.error('❌ AI test failed:', testResult.error);
      return;
    }
    
    // Test 2: Try a simple credit report analysis
    console.log('\n=== Test 2: Simple Credit Analysis ===');
    const sampleCreditText = `
Credit Report for John Doe
Current Address: 123 Main St, Anytown, ST 12345
Credit Score: 720 (Experian)
Date: ${new Date().toISOString().split('T')[0]}

ACCOUNTS:
TRUIST BANK - Account: 451336****1234
Type: Credit Card
Balance: $1,250
Credit Limit: $5,000
Status: Open
Last Payment: Current

CHASE BANK - Account: 789123****5678  
Type: Auto Loan
Balance: $15,500
Monthly Payment: $285
Status: Open
Last Payment: Current

NEGATIVE ITEMS:
Collection Account - Medical Services Inc
Amount: $125
Date Reported: 2023-01-15
Status: Unpaid

INQUIRIES:
Capital One - Hard Inquiry - 2023-12-01
    `;
    
    console.log('Sample text length:', sampleCreditText.length);
    console.log('Sample text preview:', sampleCreditText.substring(0, 200));
    
    const analysisResult = await creditAnalyzer.analyzeReport(sampleCreditText);
    
    console.log('\n=== Analysis Results ===');
    console.log('Confidence:', analysisResult.confidence);
    console.log('Processing Time:', analysisResult.processingTime, 'ms');
    console.log('Accounts Found:', analysisResult.extractedData.accounts.length);
    console.log('Negative Items:', analysisResult.extractedData.negativeItems.length);
    console.log('Credit Score:', analysisResult.extractedData.creditScores.experian?.score);
    console.log('Recommendations:', analysisResult.recommendations.length);
    
    console.log('\n✅ AI debugging test completed successfully!');
    
  } catch (error) {
    console.error('❌ AI debugging test failed:', error);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
testAIFunctionality().catch(console.error);