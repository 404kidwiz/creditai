#!/usr/bin/env node

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

// Quick Google Cloud Configuration Test
console.log('🔍 Checking Google Cloud Configuration...\n')

// Check environment variables
const requiredVars = [
  'GOOGLE_CLOUD_PROJECT_ID',
  'GOOGLE_CLOUD_LOCATION', 
  'GOOGLE_CLOUD_VISION_API_ENABLED',
  'GOOGLE_CLOUD_DOCUMENT_AI_ENABLED',
  'GOOGLE_CLOUD_CREDENTIALS_TYPE',
  'GOOGLE_CLOUD_KEY_FILE',
  'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID',
  'GOOGLE_AI_API_KEY'
]

let missingVars = []
let configuredVars = []

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    configuredVars.push(varName)
    console.log(`✅ ${varName}: ${process.env[varName] ? 'Set' : 'Not set'}`)
  } else {
    missingVars.push(varName)
    console.log(`❌ ${varName}: Missing`)
  }
})

console.log('\n📊 Configuration Summary:')
console.log(`✅ Configured: ${configuredVars.length}/${requiredVars.length}`)
console.log(`❌ Missing: ${missingVars.length}/${requiredVars.length}`)

if (missingVars.length > 0) {
  console.log('\n🔧 Missing Variables:')
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`)
  })
  
  console.log('\n📝 To complete setup:')
  console.log('1. Enable Google Cloud APIs (Vision, Document AI, Generative AI)')
  console.log('2. Create Document AI processor and get the Processor ID')
  console.log('3. Add missing variables to .env.local')
  console.log('4. Restart your development server')
} else {
  console.log('\n🎉 All Google Cloud variables configured!')
  console.log('Next: Test PDF processing at /test-pdf-processing')
}

// Check if key file exists
const fs = require('fs')
const keyFile = process.env.GOOGLE_CLOUD_KEY_FILE || 'google-cloud-key.json'
if (fs.existsSync(keyFile)) {
  console.log(`✅ Service account key file found: ${keyFile}`)
} else {
  console.log(`❌ Service account key file missing: ${keyFile}`)
} 