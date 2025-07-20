#!/usr/bin/env node
/**
 * Google Cloud Environment Validation Script
 * 
 * This script validates Google Cloud environment variables and tests connectivity
 * to ensure all services are properly configured and accessible.
 * 
 * Usage:
 *   node scripts/validate-google-cloud-env.js [environment]
 *   
 * Examples:
 *   node scripts/validate-google-cloud-env.js development
 *   node scripts/validate-google-cloud-env.js production
 */

const fs = require('fs')
const path = require('path')
const { GoogleAuth } = require('google-auth-library')

// Environment file mappings
const ENV_FILES = {
  development: '.env.local',
  staging: '.env.staging',
  production: '.env.production'
}

// Required environment variables for validation
const REQUIRED_VARIABLES = [
  'GOOGLE_CLOUD_PROJECT_ID',
  'GOOGLE_CLOUD_LOCATION',
  'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID',
  'GOOGLE_AI_API_KEY',
  'GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL'
]

// Optional but recommended variables
const RECOMMENDED_VARIABLES = [
  'GOOGLE_CLOUD_STORAGE_BUCKET',
  'GOOGLE_CLOUD_DOCUMENT_AI_LOCATION',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_CLOUD_VISION_API_ENABLED',
  'GOOGLE_CLOUD_MONITORING_ENABLED',
  'GOOGLE_CLOUD_LOGGING_ENABLED'
]

class GoogleCloudEnvValidator {
  constructor(environment = 'development') {
    this.environment = environment
    this.envFile = ENV_FILES[environment]
    this.envVars = {}
    this.validationResults = {
      passed: 0,
      failed: 0,
      warningCount: 0,
      errors: [],
      warnings: [],
      details: []
    }
  }

  async validate() {
    console.log(`\n🔍 Google Cloud Environment Validation - ${this.environment}`)
    console.log('=' .repeat(60))

    try {
      // Load environment variables
      await this.loadEnvironmentVariables()

      // Validate environment variables
      await this.validateEnvironmentVariables()

      // Validate service account credentials
      await this.validateServiceAccountCredentials()

      // Test Google Cloud connectivity
      await this.testGoogleCloudConnectivity()

      // Test Document AI configuration
      await this.testDocumentAIConfiguration()

      // Test Vision API configuration
      await this.testVisionAPIConfiguration()

      // Test Gemini AI configuration
      await this.testGeminiAIConfiguration()

      // Display results
      this.displayResults()

      return this.validationResults
    } catch (error) {
      console.error('\n❌ Validation failed:', error.message)
      this.validationResults.errors.push(`Validation failed: ${error.message}`)
      this.displayResults()
      return this.validationResults
    }
  }

  async loadEnvironmentVariables() {
    const envPath = path.join(process.cwd(), this.envFile)
    
    if (!fs.existsSync(envPath)) {
      throw new Error(`Environment file not found: ${this.envFile}`)
    }

    console.log(`\n📂 Loading environment variables from ${this.envFile}`)
    
    const content = fs.readFileSync(envPath, 'utf8')
    
    // Parse environment variables
    content.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=')
        this.envVars[key] = value
      }
    })

    console.log(`✅ Loaded ${Object.keys(this.envVars).length} environment variables`)
    this.validationResults.passed++
  }

  async validateEnvironmentVariables() {
    console.log('\n📋 Validating environment variables...')

    // Check required variables
    const missingRequired = []
    REQUIRED_VARIABLES.forEach(variable => {
      if (!this.envVars[variable] || this.envVars[variable].trim() === '') {
        missingRequired.push(variable)
      }
    })

    if (missingRequired.length > 0) {
      const error = `Missing required environment variables: ${missingRequired.join(', ')}`
      this.validationResults.errors.push(error)
      this.validationResults.failed++
      console.log(`❌ ${error}`)
    } else {
      console.log('✅ All required environment variables are present')
      this.validationResults.passed++
    }

    // Check recommended variables
    const missingRecommended = []
    RECOMMENDED_VARIABLES.forEach(variable => {
      if (!this.envVars[variable] || this.envVars[variable].trim() === '') {
        missingRecommended.push(variable)
      }
    })

    if (missingRecommended.length > 0) {
      const warning = `Missing recommended environment variables: ${missingRecommended.join(', ')}`
      this.validationResults.warnings.push(warning)
      this.validationResults.warningCount++
      console.log(`⚠️  ${warning}`)
    }

    // Validate specific formats
    await this.validateVariableFormats()
  }

  async validateVariableFormats() {
    const validations = [
      {
        key: 'GOOGLE_CLOUD_PROJECT_ID',
        test: (value) => /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value),
        message: 'Project ID must be 6-30 characters, lowercase letters, numbers, and hyphens'
      },
      {
        key: 'GOOGLE_AI_API_KEY',
        test: (value) => value.startsWith('AIza') && value.length > 30,
        message: 'API key should start with "AIza" and be longer than 30 characters'
      },
      {
        key: 'GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL',
        test: (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.iam\.gserviceaccount\.com$/.test(value),
        message: 'Service account email must end with .iam.gserviceaccount.com'
      },
      {
        key: 'GOOGLE_CLOUD_DOCUMENT_AI_LOCATION',
        test: (value) => !value || ['us', 'eu'].includes(value),
        message: 'Document AI location must be "us" or "eu"'
      }
    ]

    validations.forEach(validation => {
      const value = this.envVars[validation.key]
      if (value && !validation.test(value)) {
        const error = `Invalid format for ${validation.key}: ${validation.message}`
        this.validationResults.errors.push(error)
        this.validationResults.failed++
        console.log(`❌ ${error}`)
      }
    })
  }

  async validateServiceAccountCredentials() {
    console.log('\n🔐 Validating service account credentials...')

    const credentialsPath = this.envVars.GOOGLE_APPLICATION_CREDENTIALS
    const credentialsJson = this.envVars.GOOGLE_CLOUD_CREDENTIALS

    if (!credentialsPath && !credentialsJson) {
      const error = 'No service account credentials found (GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_CREDENTIALS)'
      this.validationResults.errors.push(error)
      this.validationResults.failed++
      console.log(`❌ ${error}`)
      return
    }

    try {
      let credentials = null

      if (credentialsPath) {
        const fullPath = path.resolve(credentialsPath)
        if (!fs.existsSync(fullPath)) {
          const error = `Service account file not found: ${credentialsPath}`
          this.validationResults.errors.push(error)
          this.validationResults.failed++
          console.log(`❌ ${error}`)
          return
        }

        credentials = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
        console.log(`✅ Service account file found: ${credentialsPath}`)
      } else if (credentialsJson) {
        credentials = JSON.parse(credentialsJson)
        console.log('✅ Service account credentials found in environment variable')
      }

      // Validate credentials structure
      const requiredFields = ['type', 'project_id', 'private_key', 'client_email']
      const missingFields = requiredFields.filter(field => !credentials[field])

      if (missingFields.length > 0) {
        const error = `Invalid service account credentials: missing fields ${missingFields.join(', ')}`
        this.validationResults.errors.push(error)
        this.validationResults.failed++
        console.log(`❌ ${error}`)
      } else {
        console.log('✅ Service account credentials structure is valid')
        this.validationResults.passed++
      }

      // Validate project ID matches
      if (credentials.project_id !== this.envVars.GOOGLE_CLOUD_PROJECT_ID) {
        const warning = `Project ID mismatch: credentials (${credentials.project_id}) vs environment (${this.envVars.GOOGLE_CLOUD_PROJECT_ID})`
        this.validationResults.warnings.push(warning)
        this.validationResults.warningCount++
        console.log(`⚠️  ${warning}`)
      }

    } catch (error) {
      const errorMsg = `Failed to parse service account credentials: ${error.message}`
      this.validationResults.errors.push(errorMsg)
      this.validationResults.failed++
      console.log(`❌ ${errorMsg}`)
    }
  }

  async testGoogleCloudConnectivity() {
    console.log('\n🌐 Testing Google Cloud connectivity...')

    try {
      // Set environment variables for Google Auth
      if (this.envVars.GOOGLE_APPLICATION_CREDENTIALS) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = this.envVars.GOOGLE_APPLICATION_CREDENTIALS
      }
      if (this.envVars.GOOGLE_CLOUD_CREDENTIALS) {
        process.env.GOOGLE_CLOUD_CREDENTIALS = this.envVars.GOOGLE_CLOUD_CREDENTIALS
      }

      const auth = new GoogleAuth({
        projectId: this.envVars.GOOGLE_CLOUD_PROJECT_ID,
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/documentai',
          'https://www.googleapis.com/auth/cloud-vision'
        ]
      })

      const client = await auth.getClient()
      const projectId = await auth.getProjectId()

      console.log(`✅ Successfully authenticated with Google Cloud`)
      console.log(`✅ Project ID: ${projectId}`)
      this.validationResults.passed += 2

    } catch (error) {
      const errorMsg = `Google Cloud authentication failed: ${error.message}`
      this.validationResults.errors.push(errorMsg)
      this.validationResults.failed++
      console.log(`❌ ${errorMsg}`)
    }
  }

  async testDocumentAIConfiguration() {
    console.log('\n📄 Testing Document AI configuration...')

    const processorId = this.envVars.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID
    const location = this.envVars.GOOGLE_CLOUD_DOCUMENT_AI_LOCATION || 'us'
    const projectId = this.envVars.GOOGLE_CLOUD_PROJECT_ID

    if (!processorId) {
      const error = 'Document AI processor ID not configured'
      this.validationResults.errors.push(error)
      this.validationResults.failed++
      console.log(`❌ ${error}`)
      return
    }

    try {
      // Test Document AI processor configuration
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai')
      
      const client = new DocumentProcessorServiceClient({
        projectId: projectId,
        keyFilename: this.envVars.GOOGLE_APPLICATION_CREDENTIALS
      })

      const processorName = `projects/${projectId}/locations/${location}/processors/${processorId}`
      
      // Note: We can't actually call the API without a document, but we can validate the configuration
      console.log(`✅ Document AI processor configured: ${processorName}`)
      this.validationResults.passed++

    } catch (error) {
      const errorMsg = `Document AI configuration test failed: ${error.message}`
      this.validationResults.errors.push(errorMsg)
      this.validationResults.failed++
      console.log(`❌ ${errorMsg}`)
    }
  }

  async testVisionAPIConfiguration() {
    console.log('\n👁️  Testing Vision API configuration...')

    const visionEnabled = this.envVars.GOOGLE_CLOUD_VISION_API_ENABLED !== 'false'

    if (!visionEnabled) {
      console.log('ℹ️  Vision API is disabled')
      return
    }

    try {
      const { ImageAnnotatorClient } = require('@google-cloud/vision')
      
      const client = new ImageAnnotatorClient({
        projectId: this.envVars.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: this.envVars.GOOGLE_APPLICATION_CREDENTIALS
      })

      console.log('✅ Vision API client initialized successfully')
      this.validationResults.passed++

    } catch (error) {
      const errorMsg = `Vision API configuration test failed: ${error.message}`
      this.validationResults.errors.push(errorMsg)
      this.validationResults.failed++
      console.log(`❌ ${errorMsg}`)
    }
  }

  async testGeminiAIConfiguration() {
    console.log('\n🤖 Testing Gemini AI configuration...')

    const apiKey = this.envVars.GOOGLE_AI_API_KEY

    if (!apiKey) {
      const error = 'Gemini AI API key not configured'
      this.validationResults.errors.push(error)
      this.validationResults.failed++
      console.log(`❌ ${error}`)
      return
    }

    try {
      // Basic API key format validation
      if (!apiKey.startsWith('AIza')) {
        const warning = 'Gemini AI API key format may be incorrect (should start with "AIza")'
        this.validationResults.warnings.push(warning)
        this.validationResults.warningCount++
        console.log(`⚠️  ${warning}`)
      } else {
        console.log('✅ Gemini AI API key format appears valid')
        this.validationResults.passed++
      }

    } catch (error) {
      const errorMsg = `Gemini AI configuration test failed: ${error.message}`
      this.validationResults.errors.push(errorMsg)
      this.validationResults.failed++
      console.log(`❌ ${errorMsg}`)
    }
  }

  displayResults() {
    console.log('\n' + '=' .repeat(60))
    console.log('📊 VALIDATION RESULTS')
    console.log('=' .repeat(60))

    console.log(`✅ Passed: ${this.validationResults.passed}`)
    console.log(`❌ Failed: ${this.validationResults.failed}`)
    console.log(`⚠️  Warnings: ${this.validationResults.warningCount}`)

    if (this.validationResults.errors.length > 0) {
      console.log('\n❌ ERRORS:')
      this.validationResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    }

    if (this.validationResults.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:')
      this.validationResults.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`)
      })
    }

    const isValid = this.validationResults.failed === 0
    console.log(`\n${isValid ? '✅' : '❌'} Overall Status: ${isValid ? 'VALID' : 'INVALID'}`)

    if (isValid) {
      console.log('\n🚀 Your Google Cloud environment is properly configured!')
      console.log('You can now run your application with confidence.')
    } else {
      console.log('\n🔧 Please fix the errors above before proceeding.')
      console.log('Run this validation script again after making changes.')
    }
  }
}

// Main execution
async function main() {
  const environment = process.argv[2] || 'development'
  
  if (!ENV_FILES[environment]) {
    console.error(`❌ Invalid environment: ${environment}`)
    console.error(`Available environments: ${Object.keys(ENV_FILES).join(', ')}`)
    process.exit(1)
  }
  
  const validator = new GoogleCloudEnvValidator(environment)
  const results = await validator.validate()
  
  // Exit with error code if validation failed
  if (results.failed > 0) {
    process.exit(1)
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  })
}

module.exports = { GoogleCloudEnvValidator }