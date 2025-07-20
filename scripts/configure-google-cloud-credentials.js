#!/usr/bin/env node
/**
 * Google Cloud Secure Credential Configuration Script
 * 
 * This script handles secure configuration of Google Cloud service account credentials
 * with support for multiple storage methods and security best practices.
 * 
 * Usage:
 *   node scripts/configure-google-cloud-credentials.js [options]
 *   
 * Options:
 *   --method <file|env|both>  Credential storage method (default: file)
 *   --environment <env>       Target environment (default: development)
 *   --validate               Validate credentials after configuration
 *   --rotate                 Rotate existing credentials
 *   
 * Examples:
 *   node scripts/configure-google-cloud-credentials.js --method file
 *   node scripts/configure-google-cloud-credentials.js --method env --environment production
 *   node scripts/configure-google-cloud-credentials.js --validate
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')
const crypto = require('crypto')

// Environment file mappings
const ENV_FILES = {
  development: '.env.local',
  staging: '.env.staging',
  production: '.env.production'
}

// Credential storage methods
const STORAGE_METHODS = {
  file: 'Store credentials in JSON file',
  env: 'Store credentials in environment variable',
  both: 'Store credentials in both file and environment variable'
}

class GoogleCloudCredentialManager {
  constructor(options = {}) {
    this.method = options.method || 'file'
    this.environment = options.environment || 'development'
    this.validate = options.validate || false
    this.rotate = options.rotate || false
    this.envFile = ENV_FILES[this.environment]
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
  }

  async configure() {
    try {
      console.log('\n🔐 Google Cloud Credential Configuration')
      console.log('=' .repeat(50))
      console.log(`Environment: ${this.environment}`)
      console.log(`Method: ${STORAGE_METHODS[this.method]}`)
      console.log('')

      // Check for existing credentials
      const existingCredentials = await this.checkExistingCredentials()
      
      if (existingCredentials && !this.rotate) {
        const overwrite = await this.askQuestion('Existing credentials found. Overwrite? (y/N): ')
        if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
          console.log('Operation cancelled.')
          this.rl.close()
          return
        }
      }

      // Get service account credentials
      const credentials = await this.getServiceAccountCredentials()

      // Validate credentials format
      await this.validateCredentialsFormat(credentials)

      // Store credentials based on method
      await this.storeCredentials(credentials)

      // Validate functionality if requested
      if (this.validate) {
        await this.validateCredentialsFunctionality()
      }

      console.log('\n✅ Credential configuration completed successfully!')
      this.rl.close()

    } catch (error) {
      console.error('\n❌ Configuration failed:', error.message)
      this.rl.close()
      process.exit(1)
    }
  }

  async checkExistingCredentials() {
    const checks = []

    // Check for JSON file
    const jsonPath = path.join(process.cwd(), 'google-cloud-key.json')
    if (fs.existsSync(jsonPath)) {
      checks.push('JSON file')
    }

    // Check for environment variable
    if (this.envFile && fs.existsSync(this.envFile)) {
      const content = fs.readFileSync(this.envFile, 'utf8')
      if (content.includes('GOOGLE_CLOUD_CREDENTIALS=') || content.includes('GOOGLE_APPLICATION_CREDENTIALS=')) {
        checks.push('Environment variable')
      }
    }

    if (checks.length > 0) {
      console.log(`\n📋 Existing credentials found: ${checks.join(', ')}`)
      return true
    }

    return false
  }

  async getServiceAccountCredentials() {
    console.log('\n📝 Service Account Credential Input')
    console.log('Choose your input method:')
    console.log('1. Paste JSON content directly')
    console.log('2. Provide path to JSON file')
    console.log('3. Download from Google Cloud Console')

    const choice = await this.askQuestion('Select option (1-3): ')

    switch (choice) {
      case '1':
        return await this.getCredentialsFromInput()
      case '2':
        return await this.getCredentialsFromFile()
      case '3':
        return await this.getCredentialsFromConsole()
      default:
        throw new Error('Invalid choice. Please select 1, 2, or 3.')
    }
  }

  async getCredentialsFromInput() {
    console.log('\n📋 Paste your service account JSON content below:')
    console.log('(Press Enter twice when finished)')
    
    let jsonContent = ''
    let emptyLines = 0
    
    return new Promise((resolve, reject) => {
      const inputReader = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })

      inputReader.on('line', (line) => {
        if (line.trim() === '') {
          emptyLines++
          if (emptyLines >= 2) {
            inputReader.close()
            try {
              const credentials = JSON.parse(jsonContent)
              resolve(credentials)
            } catch (error) {
              reject(new Error('Invalid JSON format'))
            }
          }
        } else {
          emptyLines = 0
          jsonContent += line + '\n'
        }
      })
    })
  }

  async getCredentialsFromFile() {
    const filePath = await this.askQuestion('Enter path to service account JSON file: ')
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      throw new Error(`Failed to read or parse JSON file: ${error.message}`)
    }
  }

  async getCredentialsFromConsole() {
    console.log('\n📖 To download service account credentials from Google Cloud Console:')
    console.log('1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts')
    console.log('2. Select your project')
    console.log('3. Find your service account and click on it')
    console.log('4. Go to the "Keys" tab')
    console.log('5. Click "Add Key" > "Create new key"')
    console.log('6. Select "JSON" format and click "Create"')
    console.log('7. Save the downloaded file and provide its path')
    console.log('')

    const filePath = await this.askQuestion('Enter path to downloaded JSON file: ')
    return await this.getCredentialsFromFile(filePath)
  }

  async validateCredentialsFormat(credentials) {
    console.log('\n🔍 Validating credential format...')

    const requiredFields = [
      'type',
      'project_id',
      'private_key_id',
      'private_key',
      'client_email',
      'client_id',
      'auth_uri',
      'token_uri'
    ]

    const missingFields = requiredFields.filter(field => !credentials[field])

    if (missingFields.length > 0) {
      throw new Error(`Invalid service account format. Missing fields: ${missingFields.join(', ')}`)
    }

    if (credentials.type !== 'service_account') {
      throw new Error('Invalid credential type. Expected "service_account"')
    }

    if (!credentials.client_email.endsWith('.iam.gserviceaccount.com')) {
      throw new Error('Invalid service account email format')
    }

    console.log('✅ Credential format validation passed')
    console.log(`   Project ID: ${credentials.project_id}`)
    console.log(`   Service Account: ${credentials.client_email}`)
  }

  async storeCredentials(credentials) {
    console.log('\n💾 Storing credentials...')

    if (this.method === 'file' || this.method === 'both') {
      await this.storeCredentialsAsFile(credentials)
    }

    if (this.method === 'env' || this.method === 'both') {
      await this.storeCredentialsAsEnvironmentVariable(credentials)
    }
  }

  async storeCredentialsAsFile(credentials) {
    const filePath = path.join(process.cwd(), 'google-cloud-key.json')
    
    // Create backup if file exists
    if (fs.existsSync(filePath)) {
      const timestamp = Date.now()
      const backupPath = `${filePath}.backup.${timestamp}`
      fs.copyFileSync(filePath, backupPath)
      console.log(`   📋 Backup created: ${path.basename(backupPath)}`)
    }

    // Write credentials file
    fs.writeFileSync(filePath, JSON.stringify(credentials, null, 2))
    
    // Set restrictive permissions (Unix-like systems)
    try {
      fs.chmodSync(filePath, 0o600) // Read/write for owner only
      console.log('✅ Credentials stored in google-cloud-key.json (secure permissions set)')
    } catch (error) {
      console.log('✅ Credentials stored in google-cloud-key.json')
      console.log('⚠️  Could not set secure permissions. Please restrict file access manually.')
    }

    // Update .gitignore
    await this.updateGitignore()
  }

  async storeCredentialsAsEnvironmentVariable(credentials) {
    const envPath = path.join(process.cwd(), this.envFile)
    let envContent = ''

    // Load existing environment file
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')
      
      // Create backup
      const timestamp = Date.now()
      const backupPath = `${envPath}.backup.${timestamp}`
      fs.copyFileSync(envPath, backupPath)
      console.log(`   📋 Backup created: ${path.basename(backupPath)}`)
    }

    // Remove existing credential entries
    const lines = envContent.split('\n').filter(line => 
      !line.startsWith('GOOGLE_CLOUD_CREDENTIALS=') &&
      !line.startsWith('GOOGLE_APPLICATION_CREDENTIALS=')
    )

    // Add new credential entries
    lines.push('')
    lines.push('# Google Cloud Service Account Credentials')
    lines.push(`GOOGLE_CLOUD_CREDENTIALS=${JSON.stringify(credentials)}`)
    lines.push('GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json')
    lines.push('')

    // Write updated environment file
    fs.writeFileSync(envPath, lines.join('\n'))
    console.log(`✅ Credentials stored in ${this.envFile}`)
  }

  async updateGitignore() {
    const gitignorePath = path.join(process.cwd(), '.gitignore')
    const credentialFiles = [
      'google-cloud-key.json',
      'google-cloud-key.json.backup.*',
      '.env.local',
      '.env.staging',
      '.env.production'
    ]

    let gitignoreContent = ''
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
    }

    let updated = false
    credentialFiles.forEach(file => {
      if (!gitignoreContent.includes(file)) {
        gitignoreContent += `\n${file}`
        updated = true
      }
    })

    if (updated) {
      fs.writeFileSync(gitignorePath, gitignoreContent)
      console.log('✅ Updated .gitignore to exclude credential files')
    }
  }

  async validateCredentialsFunctionality() {
    console.log('\n🧪 Testing credential functionality...')

    try {
      // Set environment variables for testing
      process.env.GOOGLE_APPLICATION_CREDENTIALS = './google-cloud-key.json'
      
      const { GoogleAuth } = require('google-auth-library')
      
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      })

      const client = await auth.getClient()
      const projectId = await auth.getProjectId()

      console.log('✅ Credential authentication successful')
      console.log(`   Authenticated project: ${projectId}`)

    } catch (error) {
      console.log(`⚠️  Credential functionality test failed: ${error.message}`)
      console.log('   This may be due to missing dependencies or network issues.')
    }
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve)
    })
  }

  // Security utilities
  generateSecureHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
  }

  maskSensitiveData(credentials) {
    const masked = { ...credentials }
    if (masked.private_key) {
      masked.private_key = '***MASKED***'
    }
    return masked
  }
}

// CLI argument parsing
function parseArguments() {
  const args = process.argv.slice(2)
  const options = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg === '--method' && i + 1 < args.length) {
      options.method = args[i + 1]
      i++
    } else if (arg === '--environment' && i + 1 < args.length) {
      options.environment = args[i + 1]
      i++
    } else if (arg === '--validate') {
      options.validate = true
    } else if (arg === '--rotate') {
      options.rotate = true
    } else if (arg === '--help' || arg === '-h') {
      showHelp()
      process.exit(0)
    }
  }

  return options
}

function showHelp() {
  console.log(`
Google Cloud Secure Credential Configuration

Usage: node scripts/configure-google-cloud-credentials.js [options]

Options:
  --method <file|env|both>  Credential storage method (default: file)
  --environment <env>       Target environment (default: development)
  --validate               Validate credentials after configuration
  --rotate                 Rotate existing credentials
  --help, -h               Show this help message

Examples:
  node scripts/configure-google-cloud-credentials.js --method file
  node scripts/configure-google-cloud-credentials.js --method env --environment production
  node scripts/configure-google-cloud-credentials.js --validate --rotate

Storage Methods:
  file  - Store credentials in google-cloud-key.json file
  env   - Store credentials in environment variable
  both  - Store credentials in both file and environment variable

Environments:
  development - Uses .env.local
  staging     - Uses .env.staging  
  production  - Uses .env.production
`)
}

// Main execution
async function main() {
  const options = parseArguments()

  // Validate options
  if (options.method && !STORAGE_METHODS[options.method]) {
    console.error(`❌ Invalid method: ${options.method}`)
    console.error(`Available methods: ${Object.keys(STORAGE_METHODS).join(', ')}`)
    process.exit(1)
  }

  if (options.environment && !ENV_FILES[options.environment]) {
    console.error(`❌ Invalid environment: ${options.environment}`)
    console.error(`Available environments: ${Object.keys(ENV_FILES).join(', ')}`)
    process.exit(1)
  }

  const manager = new GoogleCloudCredentialManager(options)
  await manager.configure()
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Configuration failed:', error)
    process.exit(1)
  })
}

module.exports = { GoogleCloudCredentialManager }