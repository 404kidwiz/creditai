#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

function runCommand(command, description) {
  console.log(`\n🔧 ${description}...`)
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
    console.log(`✅ ${description} completed successfully`)
    return result
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    return null
  }
}

async function setupGoogleCloudCLI() {
  console.log('🚀 Google Cloud CLI Setup for CreditAI\n')
  
  // Check if gcloud is installed
  try {
    execSync('gcloud --version', { stdio: 'pipe' })
    console.log('✅ Google Cloud CLI is installed')
  } catch (error) {
    console.log('❌ Google Cloud CLI not found')
    console.log('\n📋 Installation Instructions:')
    console.log('1. Run: curl https://sdk.cloud.google.com | bash')
    console.log('2. Restart your terminal')
    console.log('3. Run: gcloud init')
    console.log('4. Run this script again\n')
    rl.close()
    return
  }

  // Check authentication
  console.log('\n🔐 Checking authentication...')
  try {
    const authResult = execSync('gcloud auth list --filter=status:ACTIVE --format="value(account)"', { encoding: 'utf8' })
    if (authResult.trim()) {
      console.log(`✅ Authenticated as: ${authResult.trim()}`)
    } else {
      console.log('❌ Not authenticated')
      console.log('Run: gcloud auth login')
      rl.close()
      return
    }
  } catch (error) {
    console.log('❌ Authentication check failed')
    console.log('Run: gcloud auth login')
    rl.close()
    return
  }

  // Get project ID
  const projectId = await question('Enter your Google Cloud Project ID: ')
  if (!projectId.trim()) {
    console.log('❌ Project ID is required')
    rl.close()
    return
  }

  // Set project
  runCommand(`gcloud config set project ${projectId}`, 'Setting project')

  // Enable APIs
  console.log('\n🔌 Enabling required APIs...')
  runCommand(`gcloud services enable vision.googleapis.com --project=${projectId}`, 'Enabling Vision API')
  runCommand(`gcloud services enable documentai.googleapis.com --project=${projectId}`, 'Enabling Document AI API')

  // Create service account
  const serviceAccountName = 'creditai-pdf-processor'
  const serviceAccountEmail = `${serviceAccountName}@${projectId}.iam.gserviceaccount.com`
  
  console.log('\n👤 Creating service account...')
  runCommand(
    `gcloud iam service-accounts create ${serviceAccountName} --display-name="CreditAI PDF Processor" --project=${projectId}`,
    'Creating service account'
  )

  // Grant roles
  console.log('\n🔑 Granting permissions...')
  runCommand(
    `gcloud projects add-iam-policy-binding ${projectId} --member="serviceAccount:${serviceAccountEmail}" --role="roles/aiplatform.user"`,
    'Granting AI Platform access'
  )
  runCommand(
    `gcloud projects add-iam-policy-binding ${projectId} --member="serviceAccount:${serviceAccountEmail}" --role="roles/cloudvision.user"`,
    'Granting Vision API access'
  )
  runCommand(
    `gcloud projects add-iam-policy-binding ${projectId} --member="serviceAccount:${serviceAccountEmail}" --role="roles/documentai.apiUser"`,
    'Granting Document AI access'
  )

  // Create key file
  console.log('\n🔐 Creating service account key...')
  const keyFile = 'google-cloud-key.json'
  runCommand(
    `gcloud iam service-accounts keys create ${keyFile} --iam-account=${serviceAccountEmail}`,
    'Creating service account key'
  )

  // Create Document AI processor
  console.log('\n📄 Setting up Document AI processor...')
  const processorResult = runCommand(
    'gcloud ai document processors create --processor-type=ocr --display-name="CreditAI Document OCR" --location=us --format="value(name)"',
    'Creating Document AI processor'
  )

  let processorId = ''
  if (processorResult) {
    // Extract processor ID from the result
    const match = processorResult.match(/processors\/([^\/]+)$/)
    if (match) {
      processorId = match[1]
      console.log(`✅ Processor ID: ${processorId}`)
    }
  }

  // Update .env.local
  console.log('\n📝 Updating environment configuration...')
  const envPath = path.join(process.cwd(), '.env.local')
  let envContent = ''

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  // Update or add Google Cloud configuration
  const updates = {
    'GOOGLE_CLOUD_PROJECT_ID': projectId,
    'GOOGLE_CLOUD_LOCATION': 'us',
    'GOOGLE_CLOUD_VISION_API_ENABLED': 'true',
    'GOOGLE_CLOUD_DOCUMENT_AI_ENABLED': 'true',
    'GOOGLE_CLOUD_CREDENTIALS_TYPE': 'service-account',
    'GOOGLE_CLOUD_KEY_FILE': keyFile
  }

  if (processorId) {
    updates['GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID'] = processorId
  }

  Object.entries(updates).forEach(([key, value]) => {
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}=${value}`)
    } else {
      envContent += `\n${key}=${value}`
    }
  })

  fs.writeFileSync(envPath, envContent)
  console.log('✅ Environment configuration updated')

  // Test configuration
  console.log('\n🧪 Testing configuration...')
  try {
    const testResult = execSync('gcloud services list --enabled --filter="name:vision.googleapis.com OR name:documentai.googleapis.com"', { encoding: 'utf8' })
    console.log('✅ APIs are enabled:')
    console.log(testResult)
  } catch (error) {
    console.log('❌ API test failed:', error.message)
  }

  console.log('\n🎉 Google Cloud CLI setup completed!')
  console.log('\n📋 Next Steps:')
  console.log('1. Test your configuration: npm run dev')
  console.log('2. Visit: http://localhost:3000/test-google-cloud')
  console.log('3. Upload a PDF to test processing')
  console.log('\n📁 Files created:')
  console.log(`- ${keyFile} (service account key)`)
  console.log('- .env.local (updated with Google Cloud config)')
  console.log('\n⚠️  Security Note:')
  console.log('- Keep your service account key secure')
  console.log('- Add google-cloud-key.json to .gitignore')
  console.log('- For production, use environment variables instead of key files')

  rl.close()
}

setupGoogleCloudCLI().catch(console.error) 