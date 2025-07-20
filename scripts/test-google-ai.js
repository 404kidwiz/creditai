const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function testGoogleAI() {
  try {
    console.log('🔍 Testing Google AI API...');
    console.log('API Key present:', !!process.env.GOOGLE_AI_API_KEY);
    
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.log('❌ Google AI API key not found');
      return false;
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Hello, test response');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Google AI API is working!');
    console.log('Response:', text.substring(0, 100) + '...');
    return true;
  } catch (error) {
    console.log('❌ Google AI API error:', error.message);
    return false;
  }
}

testGoogleAI();