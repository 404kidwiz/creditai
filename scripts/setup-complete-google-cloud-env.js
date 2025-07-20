#!/usr/bin/env node
/**
 * Complete Google Cloud Environment Setup Script
 * 
 * This master script orchestrates the complete setup of Google Cloud environment
 * including credential configuration, environment variables, and validation.
 * 
 * Usage:
 *   node scripts/setup-complete-google-cloud-env.js [environment] [options]
 *   
 * Options:
 *   --skip-credentials   Skip credential configuration
 *   --skip-validation    Skip environment validation
 *   --skip-testing       Skip connectivity testing
 *   --interactive        Run in interactive mode (default)
 *   --automated          Run in automated mode with minimal prompts
 *   
 * Examples:
 *   node scripts/setup-complete-google-cloud-env.js development
 *   node scripts/setup-complete-google-cloud-env.js production --automated
 *   node scripts/setup-complete-google-cloud-env.js staging --skip-testing
 */

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const readline = require('readline')

// Import our setup modules
const { GoogleCloudEnvSetup } = require('./setup-google-cloud-env.js')
const { GoogleCloudCredentialManager } = require('./configure-google-cloud-credentials.js')
const { GoogleCloudEnvValidator } = require('./validate-google-cloud-env.js')
const { GoogleCloudEnvironmentTester } = require('./test-google-cloud-env.js')

// Environment configurations
const ENVIRONMENTS = {
  development: {
    file: '.env.local',
    description: 'Development environment (local)',
    credentialMethod: 'file'
  },
  staging: {
    file: '.env.staging',
    description: 'Staging environment',
    credentialMethod: 'both'
  },
  production: {
    file: '.env.production',
    description: 'Production environment',
    credentialMethod: 'env'
  }
}

class CompleteGoogleCloudSetup {
  constructor(environment = 'development', options = {}) {
    this.environment = environment
    this.config = ENVIRONMENTS[environment]
    this.options = options
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    this.setupResults = {
      credentials: null,
      environment: null,
      validation: null,
      testing: null,
      success: false,
      errors: [],
      warnings: []
    }
  }

  async setup() {
    try {
      console.log('\n🚀 Complete Google Cloud Environment Setup')
      console.log('=' .repeat(60))
      console.log(`Environment: ${this.config.description}`)
      console.log(`Configuration file: ${this.config.file}`)
      console.log('')

      // Show setup plan
      await this.showSetupPlan()

      // Confirm setup
      if (!this.options.automated) {
        const confirm = await this.askQuestion('Proceed with setup? (Y/n): ')
        if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
          console.log('Setup cancelled.')
          this.rl.close()
          return this.setupResults
        }
      }

      // Step 1: Configure credentials
      if (!this.options.skipCredentials) {
        await this.setupCredentials()
      }

      // Step 2: Setup environment variables
      await this.setupEnvironmentVariables()

      // Step 3: Validate configuration
      if (!this.options.skipValidation) {
        await this.validateConfiguration()
      }

      // Step 4: Test connectivity
      if (!this.options.skipTesting) {
        await this.testConnectivity()
      }

      // Step 5: Generate summary
      await this.generateSummary()

      this.setupResults.success = this.setupResults.errors.length === 0
      this.rl.close()
      return this.setupResults

    } catch (error) {
      console.error('\n❌ Complete setup failed:', error.message)
      this.setupResults.errors.push(error.message)
      this.rl.close()
      return this.setupResults
    }
  }

  async showSetupPlan() {
    console.log('📋 Setup Plan:')
    console.log('1. 🔐 Configure Google Cloud service account credentials')
    console.log('2. ⚙️  Setup environment variables for all Google Cloud services')
    console.log('3. 🔍 Validate configuration and credentials')
    console.log('4. 🧪 Test connectivity to Google Cloud services')
    console.log('5. 📊 Generate setup summary and recommendations')
    console.log('')

    if (this.options.skipCredentials) {
      console.log('⏭️  Skipping credential configuration')
    }
    if (this.options.skipValidation) {
      console.log('⏭️  Skipping configuration validation')
    }
    if (this.options.skipTesting) {
      console.log('⏭️  Skipping connectivity testing')
    }
    console.log('')
  }

  async setupCredentials() {
    console.log('\n' + '='.repeat(60))
    console.log('🔐 STEP 1: Configure Service Account Credentials')
    console.log('='.repeat(60))

    try {
      const credentialManager = new GoogleCloudCredentialManager({
        method: this.config.credentialMethod,
        environment: this.environment,
        validate: false // We'll validate separately
      })

      // Check if credentials already exist
      const hasExisting = await this.checkExistingCredentials()
      
      if (hasExisting && !this.options.automated) {
        const overwrite = await this.askQuestion('Existing credentials found. Reconfigure? (y/N): ')
        if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
          console.log('✅ Using existing credentials')
          this.setupResults.credentials = { status: 'skipped', message: 'Using existing credentials' }
          return
        }
      }

      if (this.options.automated && hasExisting) {
        console.log('✅ Using existing credentials (automated mode)')
        this.setupResults.credentials = { status: 'skipped', message: 'Using existing credentials' }
        return
      }

      await credentialManager.configure()
      this.setupResults.credentials = { status: 'success', message: 'Credentials configured successfully' }

    } catch (error) {
      const errorMsg = `Credential configuration failed: ${error.message}`
      console.error(`❌ ${errorMsg}`)
      this.setupResults.errors.push(errorMsg)
      this.setupResults.credentials = { status: 'failed', error: error.message }
    }
  }

  async checkExistingCredentials() {
    const jsonPath = path.join(process.cwd(), 'google-cloud-key.json')
    const envPath = path.join(process.cwd(), this.config.file)
    
    let hasCredentials = false
    
    if (fs.existsSync(jsonPath)) {
      hasCredentials = true
    }
    
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      if (content.includes('GOOGLE_CLOUD_CREDENTIALS=') || content.includes('GOOGLE_APPLICATION_CREDENTIALS=')) {
        hasCredentials = true
      }
    }
    
    return hasCredentials
  }

  async setupEnvironmentVariables() {
    console.log('\n' + '='.repeat(60))
    console.log('⚙️  STEP 2: Setup Environment Variables')
    console.log('='.repeat(60))

    try {
      const envSetup = new GoogleCloudEnvSetup(this.environment)
      
      if (this.options.automated) {
        // In automated mode, we'll use existing values or defaults
        console.log('Running in automated mode - using existing values and defaults')
        await this.setupEnvironmentVariablesAutomated()
      } else {
        await envSetup.setup()
      }
      
      this.setupResults.environment = { status: 'success', message: 'Environment variables configured successfully' }

    } catch (error) {
      const errorMsg = `Environment variable setup failed: ${error.message}`
      console.error(`❌ ${errorMsg}`)
      this.setupResults.errors.push(errorMsg)
      this.setupResults.environment = { status: 'failed', error: error.message }
    }
  }

  async setupEnvironmentVariablesAutomated() {
    // Load existing environment or create with defaults
    const envPath = path.join(process.cwd(), this.config.file)
    let envVars = {}

    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      content.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=')
          const value = valueParts.join('=')
          envVars[key] = value
        }
      })
    }

    // Set defaults for missing required variables
    const defaults = {
      NODE_ENV: this.environment === 'development' ? 'development' : 'production',
      NEXT_PUBLIC_ENV: this.environment,
      GOOGLE_CLOUD_LOCATION: 'us-central1',
      GOOGLE_CLOUD_DOCUMENT_AI_LOCATION: 'us',
      GOOGLE_APPLICATION_CREDENTIALS: './google-cloud-key.json',
      GOOGLE_CLOUD_VISION_API_ENABLED: 'true',
      GOOGLE_CLOUD_MONITORING_ENABLED: 'true',
      GOOGLE_CLOUD_LOGGING_ENABLED: 'true',
      PII_MASKING_ENABLED: 'true',
      PII_ENCRYPTION_ENABLED: 'true',
      TEMP_FILE_CLEANUP_ENABLED: 'true',
      SECURITY_AUDIT_LOGGING_ENABLED: 'true',
      PDF_PROCESSING_TIMEOUT: '300000',
      PDF_MAX_SIZE: '20971520',
      PDF_PROCESSING_FALLBACK_ENABLED: 'true',
      PDF_PROCESSING_CLIENT_FALLBACK_ENABLED: 'true',
      PDF_PROCESSING_CONFIDENCE_THRESHOLD: this.environment === 'production' ? '80' : '70',
      PDF_PROCESSING_MONITORING_ENABLED: 'true',
      PDF_PROCESSING_SUCCESS_RATE_THRESHOLD: this.environment === 'production' ? '95' : '85',
      PDF_PROCESSING_ERROR_RATE_THRESHOLD: this.environment === 'production' ? '5' : '15',
      PDF_PROCESSING_TIME_THRESHOLD: this.environment === 'production' ? '6000' : '10000'
    }

    // Apply defaults for missing values
    Object.keys(defaults).forEach(key => {
      if (!envVars[key]) {
        envVars[key] = defaults[key]
      }
    })

    // Generate environment file content
    const content = this.generateAutomatedEnvContent(envVars)
    
    // Create backup if file exists
    if (fs.existsSync(envPath)) {
      const timestamp = Date.now()
      const backupPath = `${envPath}.backup.${timestamp}`
      fs.copyFileSync(envPath, backupPath)
      console.log(`💾 Backup created: ${path.basename(backupPath)}`)
    }

    // Write the file
    fs.writeFileSync(envPath, content)
    console.log(`✅ Environment file updated: ${this.config.file}`)
  }

  generateAutomatedEnvContent(envVars) {
    const lines = []
    
    lines.push('# =============================================')
    lines.push(`# Google Cloud Environment Configuration`)
    lines.push(`# Environment: ${this.environment}`)
    lines.push(`# Generated: ${new Date().toISOString()}`)
    lines.push('# =============================================')
    lines.push('')

    // Group variables by category
    const categories = {
      'Environment Configuration': ['NODE_ENV', 'NEXT_PUBLIC_ENV'],
      'Google Cloud Configuration': [
        'GOOGLE_CLOUD_PROJECT_ID',
        'GOOGLE_CLOUD_LOCATION',
        'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID',
        'GOOGLE_CLOUD_DOCUMENT_AI_LOCATION',
        'GOOGLE_AI_API_KEY',
        'GOOGLE_CLOUD_STORAGE_BUCKET',
        'GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL'
      ],
      'Additional Google Cloud Configuration': [
        'GOOGLE_APPLICATION_CREDENTIALS',
        'GOOGLE_CLOUD_VISION_API_ENABLED',
        'GOOGLE_CLOUD_MONITORING_ENABLED',
        'GOOGLE_CLOUD_LOGGING_ENABLED'
      ],
      'Security Configuration': [
        'PII_MASKING_ENABLED',
        'PII_ENCRYPTION_ENABLED',
        'TEMP_FILE_CLEANUP_ENABLED',
        'SECURITY_AUDIT_LOGGING_ENABLED'
      ],
      'PDF Processing Configuration': [
        'PDF_PROCESSING_TIMEOUT',
        'PDF_MAX_SIZE',
        'PDF_PROCESSING_FALLBACK_ENABLED',
        'PDF_PROCESSING_CLIENT_FALLBACK_ENABLED',
        'PDF_PROCESSING_CONFIDENCE_THRESHOLD'
      ],
      'Monitoring Configuration': [
        'PDF_PROCESSING_MONITORING_ENABLED',
        'PDF_PROCESSING_SUCCESS_RATE_THRESHOLD',
        'PDF_PROCESSING_ERROR_RATE_THRESHOLD',
        'PDF_PROCESSING_TIME_THRESHOLD'
      ]
    }

    Object.keys(categories).forEach(category => {
      lines.push(`# ${category}`)
      categories[category].forEach(key => {
        if (envVars[key]) {
          lines.push(`${key}=${envVars[key]}`)
        }
      })
      lines.push('')
    })

    // Add any remaining variables
    Object.keys(envVars).forEach(key => {
      const isInCategories = Object.values(categories).some(categoryVars => categoryVars.includes(key))
      if (!isInCategories) {
        lines.push(`${key}=${envVars[key]}`)
      }
    })

    return lines.join('\n')
  }

  async validateConfiguration() {
    console.log('\n' + '='.repeat(60))
    console.log('🔍 STEP 3: Validate Configuration')
    console.log('='.repeat(60))

    try {
      const validator = new GoogleCloudEnvValidator(this.environment)
      const results = await validator.validate()
      
      this.setupResults.validation = {
        status: results.errors.length === 0 ? 'success' : 'failed',
        passed: results.passed,
        failed: results.failed,
        warnings: results.warnings,
        errors: results.errors
      }

      if (results.errors.length > 0) {
        this.setupResults.errors.push(...results.errors)
      }
      if (results.warnings.length > 0) {
        this.setupResults.warnings.push(...results.warnings)
      }

    } catch (error) {
      const errorMsg = `Configuration validation failed: ${error.message}`
      console.error(`❌ ${errorMsg}`)
      this.setupResults.errors.push(errorMsg)
      this.setupResults.validation = { status: 'failed', error: error.message }
    }
  }

  async testConnectivity() {
    console.log('\n' + '='.repeat(60))
    console.log('🧪 STEP 4: Test Connectivity')
    console.log('='.repeat(60))

    try {
      const tester = new GoogleCloudEnvironmentTester(this.environment, { quick: true })
      const results = await tester.runTests()
      
      this.setupResults.testing = {
        status: results.failed === 0 ? 'success' : 'failed',
        total: results.total,
        passed: results.passed,
        failed: results.failed,
        duration: results.endTime - results.startTime
      }

      if (results.failed > 0) {
        const testErrors = results.tests
          .filter(test => test.status === 'failed')
          .map(test => `${test.name}: ${test.error}`)
        this.setupResults.errors.push(...testErrors)
      }

    } catch (error) {
      const errorMsg = `Connectivity testing failed: ${error.message}`
      console.error(`❌ ${errorMsg}`)
      this.setupResults.errors.push(errorMsg)
      this.setupResults.testing = { status: 'failed', error: error.message }
    }
  }

  async generateSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('📊 STEP 5: Setup Summary')
    console.log('='.repeat(60))

    const isSuccess = this.setupResults.errors.length === 0

    console.log(`\n${isSuccess ? '✅' : '❌'} Overall Status: ${isSuccess ? 'SUCCESS' : 'FAILED'}`)
    console.log('')

    // Step results
    console.log('📋 Step Results:')
    if (this.setupResults.credentials) {
      console.log(`  🔐 Credentials: ${this.getStatusIcon(this.setupResults.credentials.status)} ${this.setupResults.credentials.status}`)
    }
    if (this.setupResults.environment) {
      console.log(`  ⚙️  Environment: ${this.getStatusIcon(this.setupResults.environment.status)} ${this.setupResults.environment.status}`)
    }
    if (this.setupResults.validation) {
      console.log(`  🔍 Validation: ${this.getStatusIcon(this.setupResults.validation.status)} ${this.setupResults.validation.status}`)
    }
    if (this.setupResults.testing) {
      console.log(`  🧪 Testing: ${this.getStatusIcon(this.setupResults.testing.status)} ${this.setupResults.testing.status}`)
    }

    // Errors
    if (this.setupResults.errors.length > 0) {
      console.log('\n❌ Errors:')
      this.setupResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    }

    // Warnings
    if (this.setupResults.warnings.length > 0) {
      console.log('\n⚠️  Warnings:')
      this.setupResults.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`)
      })
    }

    // Next steps
    console.log('\n📝 Next Steps:')
    if (isSuccess) {
      console.log('  1. ✅ Your Google Cloud environment is ready!')
      console.log('  2. 🚀 Start your application: npm run dev')
      console.log('  3. 📄 Test PDF processing with real documents')
      console.log('  4. 📊 Monitor performance and adjust settings as needed')
    } else {
      console.log('  1. 🔧 Fix the errors listed above')
      console.log('  2. 🔄 Re-run this setup script')
      console.log('  3. 🧪 Run validation: node scripts/validate-google-cloud-env.js')
      console.log('  4. 📞 Contact support if issues persist')
    }

    // Configuration files
    console.log('\n📁 Configuration Files:')
    console.log(`  • Environment: ${this.config.file}`)
    console.log('  • Credentials: google-cloud-key.json')
    console.log('  • Backups: *.backup.*')

    // Useful commands
    console.log('\n💡 Useful Commands:')
    console.log(`  • Validate: node scripts/validate-google-cloud-env.js ${this.environment}`)
    console.log(`  • Test: node scripts/test-google-cloud-env.js ${this.environment}`)
    console.log('  • Reconfigure: node scripts/configure-google-cloud-credentials.js')
  }

  getStatusIcon(status) {
    switch (status) {
      case 'success': return '✅'
      case 'failed': return '❌'
      case 'skipped': return '⏭️'
      default: return '❓'
    }
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve)
    })
  }
}

// CLI argument parsing
function parseArguments() {
  const args = process.argv.slice(2)
  const environment = args.find(arg => !arg.startsWith('--')) || 'development'
  const options = {}

  args.forEach(arg => {
    switch (arg) {
      case '--skip-credentials':
        options.skipCredentials = true
        break
      case '--skip-validation':
        options.skipValidation = true
        break
      case '--skip-testing':
        options.skipTesting = true
        break
      case '--interactive':
        options.automated = false
        break
      case '--automated':
        options.automated = true
        break
      case '--help':
      case '-h':
        showHelp()
        process.exit(0)
        break
    }
  })

  return { environment, options }
}

function showHelp() {
  console.log(`
Complete Google Cloud Environment Setup

Usage: node scripts/setup-complete-google-cloud-env.js [environment] [options]

Options:
  --skip-credentials   Skip credential configuration
  --skip-validation    Skip environment validation
  --skip-testing       Skip connectivity testing
  --interactive        Run in interactive mode (default)
  --automated          Run in automated mode with minimal prompts
  --help, -h           Show this help message

Examples:
  node scripts/setup-complete-google-cloud-env.js development
  node scripts/setup-complete-google-cloud-env.js production --automated
  node scripts/setup-complete-google-cloud-env.js staging --skip-testing

Environments:
  development - Uses .env.local (default)
  staging     - Uses .env.staging
  production  - Uses .env.production

This script will:
1. Configure Google Cloud service account credentials
2. Setup all required environment variables
3. Validate the configuration
4. Test connectivity to Google Cloud services
5. Generate a comprehensive setup summary
`)
}

// Main execution
async function main() {
  const { environment, options } = parseArguments()
  
  if (!ENVIRONMENTS[environment]) {
    console.error(`❌ Invalid environment: ${environment}`)
    console.error(`Available environments: ${Object.keys(ENVIRONMENTS).join(', ')}`)
    process.exit(1)
  }
  
  const setup = new CompleteGoogleCloudSetup(environment, options)
  const results = await setup.setup()
  
  // Exit with error code if setup failed
  if (!results.success) {
    process.exit(1)
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Complete setup failed:', error)
    process.exit(1)
  })
}

module.exports = { CompleteGoogleCloudSetup }