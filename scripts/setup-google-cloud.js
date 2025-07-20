#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔧 Google Cloud Setup for CreditAI PDF Processing')
console.log('==================================================\n')

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local')
const envExists = fs.existsSync(envPath)

if (!envExists) {
  console.log('❌ .env.local file not found. Please create it first.')
  console.log('   Run: cp .env.local.template .env.local')
  process.exit(1)
}

console.log('📋 Google Cloud Services Setup Guide\n')

console.log('1. 🏗️  Create a Google Cloud Project:')
console.log('   - Go to https://console.cloud.google.com/')
console.log('   - Create a new project or select existing one')
console.log('   - Note your Project ID\n')

console.log('2. 🔑 Enable Required APIs:')
console.log('   - Cloud Vision API: https://console.cloud.google.com/apis/library/vision.googleapis.com')
console.log('   - Document AI API: https://console.cloud.google.com/apis/library/documentai.googleapis.com')
console.log('   - Enable both APIs for your project\n')

console.log('3. 👤 Create Service Account:')
console.log('   - Go to IAM & Admin > Service Accounts')
console.log('   - Click "Create Service Account"')
console.log('   - Name: creditai-pdf-processor')
console.log('   - Description: PDF processing for CreditAI')
console.log('   - Grant roles:')
console.log('     • Cloud Vision API User')
console.log('     • Document AI API User')
console.log('   - Create and download JSON key file\n')

console.log('4. 📄 Set up Document AI Processor (Optional but Recommended):')
console.log('   - Go to Document AI in Google Cloud Console')
console.log('   - Create a new processor')
console.log('   - Type: Document OCR')
console.log('   - Note the Processor ID\n')

console.log('5. ⚙️  Configure Environment Variables:')
console.log('   Add these to your .env.local file:\n')

const envVars = [
  '# Google Cloud Configuration',
  'GOOGLE_CLOUD_PROJECT_ID=your-project-id',
  'GOOGLE_CLOUD_LOCATION=us',
  'GOOGLE_CLOUD_VISION_API_ENABLED=true',
  'GOOGLE_CLOUD_DOCUMENT_AI_ENABLED=true',
  'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID=your-processor-id',
  '',
  '# Authentication (choose one method)',
  '# Method 1: Service Account Key File',
  'GOOGLE_CLOUD_CREDENTIALS_TYPE=service-account',
  'GOOGLE_CLOUD_KEY_FILE=path/to/your-service-account-key.json',
  '',
  '# Method 2: Service Account JSON (for deployment)',
  '# GOOGLE_CLOUD_CREDENTIALS_TYPE=environment',
  '# GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}',
  '',
  '# Method 3: Application Default Credentials (for local development)',
  '# GOOGLE_CLOUD_CREDENTIALS_TYPE=application-default',
  '# Run: gcloud auth application-default login'
]

envVars.forEach(line => {
  if (line.startsWith('#')) {
    console.log(`   ${line}`)
  } else if (line.trim()) {
    console.log(`   ${line}`)
  } else {
    console.log('')
  }
})

console.log('\n6. 🧪 Test Configuration:')
console.log('   - Start your development server: npm run dev')
console.log('   - Upload a PDF credit report')
console.log('   - Check console logs for Google Cloud processing\n')

console.log('7. 💰 Cost Considerations:')
console.log('   - Vision API: $1.50 per 1,000 images')
console.log('   - Document AI: $0.60 per 1,000 pages')
console.log('   - Set up billing alerts in Google Cloud Console\n')

console.log('8. 🔒 Security Best Practices:')
console.log('   - Store service account key securely')
console.log('   - Use least privilege principle')
console.log('   - Enable audit logging')
console.log('   - Set up VPC Service Controls if needed\n')

console.log('📚 Additional Resources:')
console.log('   - Vision API Docs: https://cloud.google.com/vision/docs')
console.log('   - Document AI Docs: https://cloud.google.com/document-ai/docs')
console.log('   - Service Account Setup: https://cloud.google.com/iam/docs/service-accounts')

console.log('\n✅ Setup complete! Follow the steps above to configure Google Cloud services.')
console.log('   Once configured, PDF processing will use Google Cloud AI for superior results.') 