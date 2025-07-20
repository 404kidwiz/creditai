#!/usr/bin/env node

/**
 * Security Deployment Validation Script
 * Validates all security configurations for CreditAI
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execSync } = require('child_process')

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

class SecurityValidator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..')
    this.envFile = path.join(this.projectRoot, '.env.local')
    this.issues = []
    this.warnings = []
    this.passed = []
  }

  log(message, color = 'green') {
    console.log(`${colors[color]}✓ ${message}${colors.reset}`)
  }

  warn(message) {
    console.log(`${colors.yellow}⚠ ${message}${colors.reset}`)
    this.warnings.push(message)
  }

  error(message) {
    console.log(`${colors.red}✗ ${message}${colors.reset}`)
    this.issues.push(message)
  }

  info(message) {
    console.log(`${colors.blue}ℹ ${message}${colors.reset}`)
  }

  // Check if environment file exists and has proper configuration
  validateEnvironmentFile() {
    this.info('Validating environment configuration...')
    
    if (!fs.existsSync(this.envFile)) {
      this.error('.env.local file not found')
      return false
    }

    const envContent = fs.readFileSync(this.envFile, 'utf8')
    const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'))
    const envVars = {}
    
    envLines.forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim()
      }
    })

    // Required security variables
    const requiredSecurityVars = [
      'ENCRYPTION_KEY',
      'JWT_SECRET',
      'NEXTAUTH_SECRET',
      'HASH_SALT'
    ]

    let allPresent = true
    requiredSecurityVars.forEach(varName => {
      if (!envVars[varName]) {
        this.error(`Missing required environment variable: ${varName}`)
        allPresent = false
      } else if (envVars[varName].length < 32) {
        this.error(`Environment variable ${varName} is too short (should be at least 32 characters)`)
        allPresent = false
      } else {
        this.passed.push(`Environment variable ${varName} is properly configured`)
      }
    })

    // Check file permissions
    try {
      const stats = fs.statSync(this.envFile)
      const permissions = (stats.mode & parseInt('777', 8)).toString(8)
      if (permissions !== '600') {
        this.warn(`Environment file permissions should be 600, currently ${permissions}`)
      } else {
        this.passed.push('Environment file has secure permissions (600)')
      }
    } catch (error) {
      this.error(`Could not check environment file permissions: ${error.message}`)
    }

    // Check for encryption key strength
    if (envVars.ENCRYPTION_KEY) {
      try {
        const keyBuffer = Buffer.from(envVars.ENCRYPTION_KEY, 'base64')
        if (keyBuffer.length === 32) {
          this.passed.push('Encryption key has proper length (256-bit)')
        } else {
          this.error(`Encryption key has incorrect length: ${keyBuffer.length * 8} bits (should be 256 bits)`)
        }
      } catch (error) {
        this.error('Encryption key is not valid base64')
      }
    }

    return allPresent
  }

  // Validate database security configuration
  validateDatabaseSecurity() {
    this.info('Validating database security configuration...')
    
    const migrationFile = path.join(this.projectRoot, 'supabase', 'migrations', '20240124000000_enhanced_security_rbac.sql')
    
    if (!fs.existsSync(migrationFile)) {
      this.error('Enhanced security migration file not found')
      return false
    }

    const migrationContent = fs.readFileSync(migrationFile, 'utf8')
    
    // Check for key security features
    const securityFeatures = [
      { pattern: /CREATE ROLE creditai_admin/, name: 'Admin role creation' },
      { pattern: /CREATE ROLE creditai_api/, name: 'API role creation' },
      { pattern: /CREATE ROLE creditai_user/, name: 'User role creation' },
      { pattern: /CREATE ROLE creditai_readonly/, name: 'Read-only role creation' },
      { pattern: /security\.encrypt_data/, name: 'Data encryption function' },
      { pattern: /security\.decrypt_data/, name: 'Data decryption function' },
      { pattern: /security\.enhanced_audit_log/, name: 'Enhanced audit logging table' },
      { pattern: /security\.log_operation/, name: 'Audit logging function' },
      { pattern: /ALTER TABLE.*ENABLE ROW LEVEL SECURITY/, name: 'Row Level Security policies' }
    ]

    securityFeatures.forEach(feature => {
      if (feature.pattern.test(migrationContent)) {
        this.passed.push(`Database security feature present: ${feature.name}`)
      } else {
        this.error(`Database security feature missing: ${feature.name}`)
      }
    })

    return true
  }

  // Validate encryption implementation
  validateEncryption() {
    this.info('Validating encryption implementation...')
    
    const encryptionFile = path.join(this.projectRoot, 'src', 'lib', 'security', 'encryption.ts')
    
    if (!fs.existsSync(encryptionFile)) {
      this.error('Encryption module not found')
      return false
    }

    const encryptionContent = fs.readFileSync(encryptionFile, 'utf8')
    
    // Check for encryption features
    const encryptionFeatures = [
      { pattern: /aes-256-gcm/, name: 'AES-256-GCM encryption algorithm' },
      { pattern: /class DataEncryption/, name: 'DataEncryption class' },
      { pattern: /encrypt.*function/, name: 'Encryption function' },
      { pattern: /decrypt.*function/, name: 'Decryption function' },
      { pattern: /generateKey/, name: 'Key generation function' },
      { pattern: /sanitizeForStorage/, name: 'Data sanitization function' },
      { pattern: /hashIdentifier/, name: 'Identifier hashing function' }
    ]

    encryptionFeatures.forEach(feature => {
      if (feature.pattern.test(encryptionContent)) {
        this.passed.push(`Encryption feature present: ${feature.name}`)
      } else {
        this.error(`Encryption feature missing: ${feature.name}`)
      }
    })

    return true
  }

  // Validate audit logging
  validateAuditLogging() {
    this.info('Validating audit logging implementation...')
    
    const auditFile = path.join(this.projectRoot, 'src', 'lib', 'security', 'auditLogger.ts')
    
    if (!fs.existsSync(auditFile)) {
      this.error('Audit logging module not found')
      return false
    }

    const auditContent = fs.readFileSync(auditFile, 'utf8')
    
    // Check for audit logging features
    const auditFeatures = [
      { pattern: /class AuditLogger/, name: 'AuditLogger class' },
      { pattern: /enum AuditEventType/, name: 'Audit event types' },
      { pattern: /enum RiskLevel/, name: 'Risk level enumeration' },
      { pattern: /logAuthEvent/, name: 'Authentication event logging' },
      { pattern: /logDocumentEvent/, name: 'Document event logging' },
      { pattern: /logSecurityEvent/, name: 'Security event logging' },
      { pattern: /sanitizeDetails/, name: 'PII sanitization in logs' },
      { pattern: /flushAuditQueue/, name: 'Batch audit log processing' }
    ]

    auditFeatures.forEach(feature => {
      if (feature.pattern.test(auditContent)) {
        this.passed.push(`Audit logging feature present: ${feature.name}`)
      } else {
        this.error(`Audit logging feature missing: ${feature.name}`)
      }
    })

    return true
  }

  // Validate secure client configuration
  validateSecureClient() {
    this.info('Validating secure database client...')
    
    const secureClientFile = path.join(this.projectRoot, 'src', 'lib', 'supabase', 'secure-client.ts')
    
    if (!fs.existsSync(secureClientFile)) {
      this.error('Secure client module not found')
      return false
    }

    const clientContent = fs.readFileSync(secureClientFile, 'utf8')
    
    // Check for secure client features
    const clientFeatures = [
      { pattern: /createSecureBrowserClient/, name: 'Secure browser client' },
      { pattern: /createSecureServerClient/, name: 'Secure server client' },
      { pattern: /createSecureServiceClient/, name: 'Secure service client' },
      { pattern: /class SecureQueryBuilder/, name: 'Secure query builder' },
      { pattern: /validateEnvironment/, name: 'Environment validation' },
      { pattern: /checkRateLimit/, name: 'Rate limiting' },
      { pattern: /logDatabaseOperation/, name: 'Database operation logging' }
    ]

    clientFeatures.forEach(feature => {
      if (feature.pattern.test(clientContent)) {
        this.passed.push(`Secure client feature present: ${feature.name}`)
      } else {
        this.error(`Secure client feature missing: ${feature.name}`)
      }
    })

    return true
  }

  // Validate security headers
  validateSecurityHeaders() {
    this.info('Validating security headers configuration...')
    
    const headersFile = path.join(this.projectRoot, 'security-headers.js')
    
    if (!fs.existsSync(headersFile)) {
      this.warn('Security headers file not found (may be configured elsewhere)')
      return true
    }

    const headersContent = fs.readFileSync(headersFile, 'utf8')
    
    // Check for security headers
    const securityHeaders = [
      { pattern: /Strict-Transport-Security/, name: 'HSTS header' },
      { pattern: /X-Content-Type-Options/, name: 'Content type options header' },
      { pattern: /X-Frame-Options/, name: 'Frame options header' },
      { pattern: /X-XSS-Protection/, name: 'XSS protection header' },
      { pattern: /Content-Security-Policy/, name: 'Content Security Policy' },
      { pattern: /Referrer-Policy/, name: 'Referrer policy header' },
      { pattern: /Permissions-Policy/, name: 'Permissions policy header' }
    ]

    securityHeaders.forEach(header => {
      if (header.pattern.test(headersContent)) {
        this.passed.push(`Security header configured: ${header.name}`)
      } else {
        this.error(`Security header missing: ${header.name}`)
      }
    })

    return true
  }

  // Check Next.js configuration for security
  validateNextConfig() {
    this.info('Validating Next.js security configuration...')
    
    const nextConfigFile = path.join(this.projectRoot, 'next.config.js')
    
    if (!fs.existsSync(nextConfigFile)) {
      this.error('Next.js config file not found')
      return false
    }

    const configContent = fs.readFileSync(nextConfigFile, 'utf8')
    
    // Check for security configurations
    if (configContent.includes('securityHeaders') || configContent.includes('headers')) {
      this.passed.push('Security headers configured in Next.js')
    } else {
      this.warn('Security headers not found in Next.js configuration')
    }

    if (configContent.includes('experimental') && configContent.includes('outputFileTracingRoot')) {
      this.passed.push('Output file tracing configured for security')
    }

    return true
  }

  // Validate TypeScript types for security
  validateTypes() {
    this.info('Validating security type definitions...')
    
    const typesDir = path.join(this.projectRoot, 'src', 'types')
    
    if (!fs.existsSync(typesDir)) {
      this.error('Types directory not found')
      return false
    }

    const databaseTypesFile = path.join(typesDir, 'database.ts')
    
    if (fs.existsSync(databaseTypesFile)) {
      const typesContent = fs.readFileSync(databaseTypesFile, 'utf8')
      
      if (typesContent.includes('security_audit_log') || typesContent.includes('enhanced_audit_log')) {
        this.passed.push('Security audit types present in database types')
      } else {
        this.warn('Security audit types not found in database types')
      }
    }

    return true
  }

  // Check for sensitive files in git
  validateGitSecurity() {
    this.info('Validating git security...')
    
    try {
      const gitIgnoreFile = path.join(this.projectRoot, '.gitignore')
      
      if (!fs.existsSync(gitIgnoreFile)) {
        this.error('.gitignore file not found')
        return false
      }

      const gitIgnoreContent = fs.readFileSync(gitIgnoreFile, 'utf8')
      
      const sensitivePatterns = [
        { pattern: /\.env\.local/, name: '.env.local files' },
        { pattern: /\.env$/, name: '.env files' },
        { pattern: /\.pem$/, name: 'PEM files' },
        { pattern: /\.key$/, name: 'Key files' },
        { pattern: /node_modules/, name: 'node_modules directory' }
      ]

      sensitivePatterns.forEach(item => {
        if (item.pattern.test(gitIgnoreContent)) {
          this.passed.push(`Git ignores ${item.name}`)
        } else {
          this.error(`Git does not ignore ${item.name}`)
        }
      })

      // Check if .env.local is tracked
      try {
        const trackedFiles = execSync('git ls-files', { cwd: this.projectRoot, encoding: 'utf8' })
        if (trackedFiles.includes('.env.local')) {
          this.error('.env.local file is tracked in git (security risk)')
        } else {
          this.passed.push('.env.local is not tracked in git')
        }
      } catch (error) {
        this.warn('Could not check git tracked files (not in a git repository?)')
      }

    } catch (error) {
      this.warn(`Git security check failed: ${error.message}`)
    }

    return true
  }

  // Run all validation checks
  async runValidation() {
    console.log(`${colors.bright}${colors.cyan}CreditAI Security Deployment Validation${colors.reset}`)
    console.log('========================================\n')

    const checks = [
      { name: 'Environment Configuration', fn: () => this.validateEnvironmentFile() },
      { name: 'Database Security', fn: () => this.validateDatabaseSecurity() },
      { name: 'Encryption Implementation', fn: () => this.validateEncryption() },
      { name: 'Audit Logging', fn: () => this.validateAuditLogging() },
      { name: 'Secure Database Client', fn: () => this.validateSecureClient() },
      { name: 'Security Headers', fn: () => this.validateSecurityHeaders() },
      { name: 'Next.js Configuration', fn: () => this.validateNextConfig() },
      { name: 'Type Definitions', fn: () => this.validateTypes() },
      { name: 'Git Security', fn: () => this.validateGitSecurity() }
    ]

    for (const check of checks) {
      console.log(`\n${colors.bright}${check.name}:${colors.reset}`)
      try {
        check.fn()
      } catch (error) {
        this.error(`Check failed: ${error.message}`)
      }
    }

    // Print summary
    this.printSummary()
  }

  // Print validation summary
  printSummary() {
    console.log(`\n${colors.bright}${colors.cyan}Validation Summary${colors.reset}`)
    console.log('==================\n')

    console.log(`${colors.green}✓ Passed: ${this.passed.length} checks${colors.reset}`)
    console.log(`${colors.yellow}⚠ Warnings: ${this.warnings.length}${colors.reset}`)
    console.log(`${colors.red}✗ Issues: ${this.issues.length}${colors.reset}\n`)

    if (this.warnings.length > 0) {
      console.log(`${colors.yellow}Warnings:${colors.reset}`)
      this.warnings.forEach(warning => {
        console.log(`  - ${warning}`)
      })
      console.log('')
    }

    if (this.issues.length > 0) {
      console.log(`${colors.red}Issues that need attention:${colors.reset}`)
      this.issues.forEach(issue => {
        console.log(`  - ${issue}`)
      })
      console.log('')
    }

    // Overall result
    if (this.issues.length === 0) {
      console.log(`${colors.green}${colors.bright}🎉 Security validation passed!${colors.reset}`)
      console.log('Your CreditAI deployment meets security requirements.')
      
      if (this.warnings.length > 0) {
        console.log('\nConsider addressing the warnings for enhanced security.')
      }
    } else {
      console.log(`${colors.red}${colors.bright}❌ Security validation failed!${colors.reset}`)
      console.log('Please address the issues before deploying to production.')
      process.exit(1)
    }
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new SecurityValidator()
  validator.runValidation()
}

module.exports = SecurityValidator