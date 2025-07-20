#!/usr/bin/env node

/**
 * Setup script for Google AI API key
 * This script helps configure the Google Gemini API key for accurate AI results
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔑 Google AI API Key Setup');
console.log('==========================');
console.log('');

console.log('To get accurate AI results, you need a Google Gemini API key.');
console.log('');
console.log('📋 Steps to get your API key:');
console.log('1. Visit: https://aistudio.google.com/app/apikey');
console.log('2. Sign in with your Google account');
console.log('3. Click "Create API Key"');
console.log('4. Copy the generated API key');
console.log('');

rl.question('Enter your Google Gemini API key: ', (apiKey) => {
  if (!apiKey || apiKey.trim() === '') {
    console.log('❌ No API key provided. Please run this script again with a valid API key.');
    rl.close();
    return;
  }

  // Read the current .env.local file
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';

  try {
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
  } catch (error) {
    console.log('⚠️  Could not read existing .env.local file');
  }

  // Update or add the GOOGLE_AI_API_KEY
  const apiKeyLine = `GOOGLE_AI_API_KEY=${apiKey.trim()}`;
  
  if (envContent.includes('GOOGLE_AI_API_KEY=')) {
    // Replace existing line
    envContent = envContent.replace(
      /GOOGLE_AI_API_KEY=.*/g,
      apiKeyLine
    );
  } else {
    // Add new line
    envContent += `\n${apiKeyLine}\n`;
  }

  // Write the updated content
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Google AI API key configured successfully!');
    console.log('');
    console.log('🚀 Your AI analyzer will now provide accurate results.');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Restart your development server');
    console.log('2. Upload a credit report to test the AI analysis');
    console.log('3. Check the results page for accurate AI insights');
    console.log('');
    console.log('💡 The AI will now:');
    console.log('   - Extract accurate credit report data');
    console.log('   - Provide specific dispute recommendations');
    console.log('   - Analyze credit score factors');
    console.log('   - Generate detailed improvement insights');
  } catch (error) {
    console.log('❌ Error saving API key:', error.message);
  }

  rl.close();
});

rl.on('close', () => {
  console.log('');
  console.log('🔗 For more information, visit:');
  console.log('   https://aistudio.google.com/app/apikey');
  console.log('');
  process.exit(0);
}); 