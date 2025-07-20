#!/usr/bin/env node
/**
 * Comprehensive Google Cloud Environment Variable Configuration System
 * 
 * This script sets up all required environment variables for Google Cloud services
 * with support for multiple environments (development, staging, production)
 * 
 * Usage:
 *   node scripts/setup-google-cloud-env.js [environment]
 *   
 * Examples:
 *   node scripts/setup-google-cloud-env.js development
 *   node scripts/setup-google-cloud-env.js staging
 *   node scripts/setup-google-cloud-env.js production
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

// Environment configurations
const ENVIRONMENTS = {
  development: {
    file: '.env.local',
    description: 'Development environment (local)',
    defaults: {
      NODE_ENV: 'development',
      NEXT_PUBLIC_ENV: 'development',
      GOOGLE_CLOUD_LOCATION: 'us-central1',
      PDF_PROCESSING_TIMEOUT: '300000',
      PDF_MAX_SIZE: '20971520',
      PDF_PROCESSING_CONFIDENCE_THRESHOLD: '70',
      PDF_PROCESSING_SUCCESS_RATE_THRESHOLD: '85',
      PDF_PROCESSING_ERROR_RATE_THRESHOLD: '15',
      PDF_PROCESSING_TIME_THRESHOLD: '10000'
    }
  },
  staging: {
    file: '.env.staging',
    description: 'Staging environment',
    defaults: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_ENV: 'staging',
      GOOGLE_CLOUD_LOCATION: 'us-central1',
      PDF_PROCESSING_TIMEOUT: '300000',
      PDF_MAX_SIZE: '20971520',
      PDF_PROCESSING_CONFIDENCE_THRESHOLD: '75',
      PDF_PROCESSING_SUCCESS_RATE_THRESHOLD: '90',
      PDF_PROCESSING_ERROR_RATE_THRESHOLD: '10',
      PDF_PROCESSING_TIME_THRESHOLD: '8000'
    }
  },
  production: {
    file: '.env.production',
    description: 'Production environment',
    defaults: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_ENV: 'production',
      GOOGLE_CLOUD_LOCATION: 'us-central1',
      PDF_PROCESSING_TIMEOUT: '300000',
      PDF_MAX_SIZE: '20971520',
      PDF_PROCESSING_CONFIDENCE_THRESHOLD: '80',
      PDF_PROCESSING_SUCCESS_RATE_THRESHOLD: '95',
      PDF_PROCESSING_ERROR_RATE_THRESHOLD: '5',
      PDF_PROCESSING_TIME_THRESHOLD: '6000'
    }
  }
}

// Required Google Cloud environment variables
const GOOGLE_CLOUD_VARIABLES = [
  {
    key: 'GOOGLE_CLOUD_PROJECT_ID',
    description: 'Google Cloud Project ID',
    required: true,
    validation: (value) => /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value)
  },
  {
    key: 'GOOGLE_CLOUD_LOCATION',
    description: 'Google Cloud Location/Region',
    required: true,
    validation: (value) => /^[a-z0-9-]+$/.test(value)
  },
  {
    key: 'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID',
    description: 'Document AI Processor ID',
    required: true,
    validation: (value) => value.length > 0
  },
  {
    key: 'GOOGLE_CLOUD_DOCUMENT_AI_LOCATION',
    description: 'Document AI Location (us or eu)',
    required: false,
    default: 'us',
    validation: (value) => ['us', 'eu'].includes(value)
  },
  {
    key: 'GOOGLE_AI_API_KEY',
    description: 'Google AI (Gemini) API Key',
    required: true,
    validation: (value) => value.startsWith('AIza') && value.length > 30
  },
  {
    key: 'GOOGLE_CLOUD_STORAGE_BUCKET',
    description: 'Google Cloud Storage Bucket Name',
    required: false,
    validation: (value) => /^[a-z0-9][a-z0-9-_.]{1,61}[a-z0-9]$/.test(value)
  },
  {
    key: 'GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL',
    description: 'Service Account Email',
    required: true,
    validation: (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.iam\.gserviceaccount\.com$/.test(value)
  }
]

// Additional configuration variables
const ADDITIONAL_VARIABLES = [
  {
    key: 'GOOGLE_APPLICATION_CREDENTIALS',
    description: 'Path to service account JSON file',
    required: true,
    default: './google-cloud-key.json'
  },
  {
    key: 'GOOGLE_CLOUD_VISION_API_ENABLED',
    description: 'Enable Vision API fallback',
    required: false,
    default: 'true',
    validation: (value) => ['true', 'false'].includes(value)
  },
  {
    key: 'GOOGLE_CLOUD_MONITORING_ENABLED',
    description: 'Enable Google Cloud Monitoring',
    required: false,
    default: 'true',
    validation: (value) => ['true', 'false'].includes(value)
  },
  {
    key: 'GOOGLE_CLOUD_LOGGING_ENABLED',
    description: 'Enable Google Cloud Logging',
    required: false,
    default: 'true',
    validation: (value) => ['true', 'false'].includes(value)
  }
]

// Security and processing configuration
const SECURITY_VARIABLES = [
  {
    key: 'PII_MASKING_ENABLED',
    description: 'Enable PII masking',
    required: false,
    default: 'true',
    validation: (value) => ['true', 'false'].includes(value)
  },
  {
    key: 'PII_ENCRYPTION_ENABLED',
    description: 'Enable PII encryption',
    required: false,
    default: 'true',
    validation: (value) => ['true', 'false'].includes(value)
  },
  {
    key: 'TEMP_FILE_CLEANUP_ENABLED',
    description: 'Enable temporary file cleanup',
    required: false,
    default: 'true',
    validation: (value) => ['true', 'false'].includes(value)
  },
  {
    key: 'SECURITY_AUDIT_LOGGING_ENABLED',
    description: 'Enable security audit logging',
    required: false,
    default: 'true',
    validation: (value) => ['true', 'false'].includes(value)
  }
]

// PDF Processing configuration
const PDF_PROCESSING_VARIABLES = [
  {
    key: 'PDF_PROCESSING_TIMEOUT',
    description: 'PDF processing timeout (ms)',
    required: false,
    validation: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0
  },
  {
    key: 'PDF_MAX_SIZE',
    description: 'Maximum PDF file size (bytes)',
    required: false,
    validation: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0
  },
  {
    key: 'PDF_PROCESSING_FALLBACK_ENABLED',
    description: 'Enable PDF processing fallback',
    required: false,
    default: 'true',
    validation: (value) => ['true', 'false'].includes(value)
  },
  {
    key: 'PDF_PROCESSING_CLIENT_FALLBACK_ENABLED',
    description: 'Enable client-side PDF processing fallback',
    required: false,
    default: 'true',
    validation: (value) => ['true', 'false'].includes(value)
  },
  {
    key: 'PDF_PROCESSING_CONFIDENCE_THRESHOLD',
    description: 'Minimum confidence threshold for PDF processing',
    required: false,
    validation: (value) => !isNaN(parseInt(value)) && parseInt(value) >= 0 && parseInt(value) <= 100
  }
]

// Monitoring configuration
const MONITORING_VARIABLES = [
  {
    key: 'PDF_PROCESSING_MONITORING_ENABLED',
    description: 'Enable PDF processing monitoring',
    required: false,
    default: 'true',
    validation: (value) => ['true', 'false'].includes(value)
  },
  {
    key: 'PDF_PROCESSING_SUCCESS_RATE_THRESHOLD',
    description: 'Success rate threshold for monitoring alerts',
    required: false,
    validation: (value) => !isNaN(parseInt(value)) && parseInt(value) >= 0 && parseInt(value) <= 100
  },
  {
    key: 'PDF_PROCESSING_ERROR_RATE_THRESHOLD',
    description: 'Error rate threshold for monitoring alerts',
    required: false,
    validation: (value) => !isNaN(parseInt(value)) && parseInt(value) >= 0 && parseInt(value) <= 100
  },
  {
    key: 'PDF_PROCESSING_TIME_THRESHOLD',
    description: 'Processing time threshold for monitoring alerts (ms)',
    required: false,
    validation: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0
  }
]

class GoogleCloudEnvSetup {
  constructor(environment = 'development') {
    this.environment = environment
    this.config = ENVIRONMENTS[environment]
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    this.envVars = {}
  }

  async setup() {
    try {
      console.log(`\n🚀 Google Cloud Environment Setup - ${this.config.description}`)
      console.log('=' .repeat(60))

      // Load existing environment variables if file exists
      await this.loadExistingEnv()

      // Setup Google Cloud variables
      console.log('\n📋 Google Cloud Configuration')
      console.log('-'.repeat(40))
      await this.setupVariableGroup(GOOGLE_CLOUD_VARIABLES)

      // Setup additional variables
      console.log('\n⚙️  Additional Configuration')
      console.log('-'.repeat(40))
      await this.setupVariableGroup(ADDITIONAL_VARIABLES)

      // Setup security variables
      console.log('\n🔒 Security Configuration')
      console.log('-'.repeat(40))
      await this.setupVariableGroup(SECURITY_VARIABLES)

      // Setup PDF processing variables
      console.log('\n📄 PDF Processing Configuration')
      console.log('-'.repeat(40))
      await this.setupVariableGroup(PDF_PROCESSING_VARIABLES)

      // Setup monitoring variables
      console.log('\n📊 Monitoring Configuration')
      console.log('-'.repeat(40))
      await this.setupVariableGroup(MONITORING_VARIABLES)

      // Add environment defaults
      Object.assign(this.envVars, this.config.defaults)

      // Write environment file
      await this.writeEnvFile()

      // Validate configuration
      await this.validateConfiguration()

      console.log('\n✅ Environment setup completed successfully!')
      console.log(`📁 Configuration saved to: ${this.config.file}`)
      
      this.rl.close()
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message)
      this.rl.close()
      process.exit(1)
    }
  }

  async loadExistingEnv() {
    const envPath = path.join(process.cwd(), this.config.file)
    if (fs.existsSync(envPath)) {
      console.log(`\n📂 Loading existing configuration from ${this.config.file}`)
      const content = fs.readFileSync(envPath, 'utf8')
      
      // Parse existing environment variables
      content.split('\n').forEach(line => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=')
          const value = valueParts.join('=')
          this.envVars[key] = value
        }
      })
      
      console.log(`✅ Loaded ${Object.keys(this.envVars).length} existing variables`)
    }
  }

  async setupVariableGroup(variables) {
    for (const variable of variables) {
      await this.setupVariable(variable)
    }
  }

  async setupVariable(variable) {
    const { key, description, required, default: defaultValue, validation } = variable
    const existingValue = this.envVars[key]
    
    let prompt = `${description} (${key})`
    if (existingValue) {
      prompt += ` [current: ${this.maskSensitiveValue(key, existingValue)}]`
    } else if (defaultValue) {
      prompt += ` [default: ${defaultValue}]`
    }
    if (required) {
      prompt += ' *required*'
    }
    prompt += ': '

    const value = await this.askQuestion(prompt)
    
    if (value.trim()) {
      // User provided a value
      if (validation && !validation(value.trim())) {
        console.log(`❌ Invalid value for ${key}. Please try again.`)
        return this.setupVariable(variable)
      }
      this.envVars[key] = value.trim()
    } else if (existingValue) {
      // Keep existing value
      this.envVars[key] = existingValue
    } else if (defaultValue) {
      // Use default value
      this.envVars[key] = defaultValue
    } else if (required) {
      console.log(`❌ ${key} is required. Please provide a value.`)
      return this.setupVariable(variable)
    }
  }

  maskSensitiveValue(key, value) {
    const sensitiveKeys = ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'CREDENTIALS']
    const isSensitive = sensitiveKeys.some(sensitive => key.includes(sensitive))
    
    if (isSensitive && value.length > 8) {
      return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4)
    }
    return value
  }

  async askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve)
    })
  }

  async writeEnvFile() {
    const envPath = path.join(process.cwd(), this.config.file)
    
    // Create backup if file exists
    if (fs.existsSync(envPath)) {
      const timestamp = Date.now()
      const backupPath = `${envPath}.backup.${timestamp}`
      fs.copyFileSync(envPath, backupPath)
      console.log(`\n💾 Backup created: ${path.basename(backupPath)}`)
    }

    // Generate environment file content
    const content = this.generateEnvContent()
    
    // Write the file
    fs.writeFileSync(envPath, content)
    console.log(`\n📝 Environment file written: ${this.config.file}`)
  }

  generateEnvContent() {
    const lines = []
    
    // Header
    lines.push('# =============================================')
    lines.push(`# Google Cloud Environment Configuration`)
    lines.push(`# Environment: ${this.environment}`)
    lines.push(`# Generated: ${new Date().toISOString()}`)
    lines.push('# =============================================')
    lines.push('')

    // Environment info
    lines.push('# Environment Configuration')
    lines.push(`NODE_ENV=${this.envVars.NODE_ENV || 'development'}`)
    lines.push(`NEXT_PUBLIC_ENV=${this.envVars.NEXT_PUBLIC_ENV || 'development'}`)
    lines.push('')

    // Google Cloud Configuration
    lines.push('# Google Cloud Configuration')
    GOOGLE_CLOUD_VARIABLES.forEach(variable => {
      if (this.envVars[variable.key]) {
        lines.push(`${variable.key}=${this.envVars[variable.key]}`)
      }
    })
    lines.push('')

    // Additional Configuration
    lines.push('# Additional Google Cloud Configuration')
    ADDITIONAL_VARIABLES.forEach(variable => {
      if (this.envVars[variable.key]) {
        lines.push(`${variable.key}=${this.envVars[variable.key]}`)
      }
    })
    lines.push('')

    // Security Configuration
    lines.push('# Security Configuration')
    SECURITY_VARIABLES.forEach(variable => {
      if (this.envVars[variable.key]) {
        lines.push(`${variable.key}=${this.envVars[variable.key]}`)
      }
    })
    lines.push('')

    // PDF Processing Configuration
    lines.push('# PDF Processing Configuration')
    PDF_PROCESSING_VARIABLES.forEach(variable => {
      if (this.envVars[variable.key]) {
        lines.push(`${variable.key}=${this.envVars[variable.key]}`)
      }
    })
    lines.push('')

    // Monitoring Configuration
    lines.push('# Monitoring Configuration')
    MONITORING_VARIABLES.forEach(variable => {
      if (this.envVars[variable.key]) {
        lines.push(`${variable.key}=${this.envVars[variable.key]}`)
      }
    })
    lines.push('')

    // Service Account Credentials (if not using file path)
    if (this.envVars.GOOGLE_CLOUD_CREDENTIALS) {
      lines.push('# Service Account Credentials (JSON)')
      lines.push(`GOOGLE_CLOUD_CREDENTIALS=${this.envVars.GOOGLE_CLOUD_CREDENTIALS}`)
      lines.push('')
    }

    return lines.join('\n')
  }

  async validateConfiguration() {
    console.log('\n🔍 Validating configuration...')
    
    const errors = []
    const warnings = []

    // Validate required variables
    const allVariables = [
      ...GOOGLE_CLOUD_VARIABLES,
      ...ADDITIONAL_VARIABLES,
      ...SECURITY_VARIABLES,
      ...PDF_PROCESSING_VARIABLES,
      ...MONITORING_VARIABLES
    ]

    allVariables.forEach(variable => {
      const value = this.envVars[variable.key]
      
      if (variable.required && !value) {
        errors.push(`Missing required variable: ${variable.key}`)
      }
      
      if (value && variable.validation && !variable.validation(value)) {
        errors.push(`Invalid value for ${variable.key}: ${value}`)
      }
    })

    // Check for service account credentials
    const credentialsPath = this.envVars.GOOGLE_APPLICATION_CREDENTIALS
    const credentialsJson = this.envVars.GOOGLE_CLOUD_CREDENTIALS
    
    if (!credentialsPath && !credentialsJson) {
      errors.push('Either GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_CREDENTIALS must be set')
    }
    
    if (credentialsPath && !fs.existsSync(path.resolve(credentialsPath))) {
      warnings.push(`Service account file not found: ${credentialsPath}`)
    }

    // Display results
    if (errors.length > 0) {
      console.log('\n❌ Configuration Errors:')
      errors.forEach(error => console.log(`  • ${error}`))
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Configuration Warnings:')
      warnings.forEach(warning => console.log(`  • ${warning}`))
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ Configuration validation passed!')
    }
    
    return { errors, warnings }
  }
}

// Main execution
async function main() {
  const environment = process.argv[2] || 'development'
  
  if (!ENVIRONMENTS[environment]) {
    console.error(`❌ Invalid environment: ${environment}`)
    console.error(`Available environments: ${Object.keys(ENVIRONMENTS).join(', ')}`)
    process.exit(1)
  }
  
  const setup = new GoogleCloudEnvSetup(environment)
  await setup.setup()
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  })
}

module.exports = { GoogleCloudEnvSetup, ENVIRONMENTS }