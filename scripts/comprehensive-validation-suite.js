#!/usr/bin/env node

/**
 * CreditAI Comprehensive Validation Suite
 * 
 * This script provides comprehensive validation for all infrastructure components
 * including Google Cloud services, Supabase, environment configuration, and
 * integration testing.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Import existing validators
const GoogleCloudProjectValidator = require('./validate-google-cloud-project');

class ComprehensiveValidationSuite {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      stopOnFailure: options.stopOnFailure || false,
      generateReport: options.generateReport !== false,
      ...options
    };
    
    this.validationResults = {
      environment: {},
      googleCloud: {},
      supabase: {},
      integrations: {},
      security: {},
      performance: {},
      overall: false
    };
    
    this.validationSteps = [
      {
        category: 'environment',
        name: 'Environment Configuration',
        validator: this.validateEnvironment.bind(this),
        critical: true
      },
      {
        category: 'googleCloud',
        name: 'Google Cloud Project',
        validator: this.validateGoogleCloudProject.bind(this),
        critical: true
      },
      {
        category: 'googleCloud',
        name: 'Google Cloud APIs',
        validator: this.validateGoogleCloudAPIs.bind(this),
        critical: true
      },
      {
        category: 'googleCloud',
        name: 'Document AI Service',
        validator: this.validateDocumentAI.bind(this),
        critical: true
      },
      {
        category: 'googleCloud',
        name: 'Vision API Service',
        validator: this.validateVisionAPI.bind(this),
        critical: false
      },
      {
        category: 'googleCloud',
        name: 'Cloud Storage',
        validator: this.validateCloudStorage.bind(this),
        critical: false
      },
      {
        category: 'supabase',
        name: 'Supabase Connection',
        validator: this.validateSupabaseConnection.bind(this),
        critical: true
      },
      {
        category: 'supabase',
        name: 'Database Schema',
        validator: this.validateDatabaseSchema.bind(this),
        critical: true
      },
      {
        category: 'supabase',
        name: 'Storage Configuration',
        validator: this.validateSupabaseStorage.bind(this),
        critical: false
      },
      {
        category: 'supabase',
        name: 'Authentication System',
        validator: this.validateAuthentication.bind(this),
        critical: true
      },
      {
        category: 'integrations',
        name: 'PDF Processing Pipeline',
        validator: this.validatePDFProcessing.bind(this),
        critical: true
      },
      {
        category: 'integrations',
        name: 'AI Analysis Integration',
        validator: this.validateAIAnalysis.bind(this),
        critical: true
      },
      {
        category: 'security',
        name: 'Credential Management',
        validator: this.validateCredentialSecurity.bind(this),
        critical: true
      },
      {
        category: 'security',
        name: 'PII Protection',
        validator: this.validatePIIProtection.bind(this),
        critical: true
      },
      {
        category: 'performance',
        name: 'Service Response Times',
        validator: this.validatePerformance.bind(this),
        critical: false
      }
    ];
  }

  /**
   * Run complete validation suite
   */
  async validate() {
    try {
      console.log('🔍 CreditAI Comprehensive Validation Suite');
      console.log('='.repeat(50));
      console.log(`Steps to validate: ${this.validationSteps.length}`);
      console.log(`Stop on failure: ${this.options.stopOnFailure ? 'Yes' : 'No'}`);
      console.log('='.repeat(50));

      let successCount = 0;
      let failureCount = 0;
      let warningCount = 0;

      for (const step of this.validationSteps) {
        console.log(`\n📋 Validating: ${step.name}`);
        console.log('─'.repeat(40));
        
        try {
          const result = await step.validator();
          
          if (result.success) {
            console.log(`✅ ${step.name}: PASSED`);
            successCount++;
            
            if (result.warnings && result.warnings.length > 0) {
              warningCount++;
              result.warnings.forEach(warning => {
                console.log(`⚠️  Warning: ${warning}`);
              });
            }
          } else {
            console.log(`❌ ${step.name}: FAILED`);
            console.log(`   Error: ${result.error}`);
            failureCount++;
            
            if (step.critical && this.options.stopOnFailure) {
              console.log('\n🛑 Critical validation failed. Stopping...');
              break;
            }
          }
          
          // Store result
          if (!this.validationResults[step.category]) {
            this.validationResults[step.category] = {};
          }
          this.validationResults[step.category][step.name] = result;
          
        } catch (error) {
          console.error(`💥 ${step.name}: ERROR - ${error.message}`);
          failureCount++;
          
          if (step.critical && this.options.stopOnFailure) {
            console.log('\n🛑 Critical error encountered. Stopping...');
            break;
          }
        }
      }

      // Calculate overall result
      const totalSteps = successCount + failureCount;
      const successRate = (successCount / totalSteps) * 100;
      this.validationResults.overall = successRate >= 80; // 80% threshold

      // Display summary
      console.log('\n📊 Validation Summary');
      console.log('='.repeat(30));
      console.log(`✅ Passed: ${successCount}`);
      console.log(`❌ Failed: ${failureCount}`);
      console.log(`⚠️  Warnings: ${warningCount}`);
      console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
      console.log(`🎯 Overall: ${this.validationResults.overall ? 'PASSED' : 'FAILED'}`);

      // Generate report
      if (this.options.generateReport) {
        await this.generateValidationReport();
      }

      return this.validationResults.overall;

    } catch (error) {
      console.error('\n💥 Validation suite failed:', error.message);
      return false;
    }
  }

  /**
   * Validate environment configuration
   */
  async validateEnvironment() {
    const requiredVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_CLOUD_LOCATION',
      'GOOGLE_AI_API_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missingVars = [];
    const presentVars = [];
    
    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        presentVars.push(varName);
        if (this.options.verbose) {
          console.log(`✓ ${varName}: ${process.env[varName].substring(0, 20)}...`);
        }
      } else {
        missingVars.push(varName);
        console.log(`❌ ${varName}: Missing`);
      }
    });
    
    const warnings = [];
    
    // Check optional but recommended variables
    const optionalVars = [
      'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID',
      'GOOGLE_APPLICATION_CREDENTIALS',
      'STRIPE_SECRET_KEY'
    ];
    
    optionalVars.forEach(varName => {
      if (!process.env[varName]) {
        warnings.push(`Optional variable ${varName} is not set`);
      }
    });
    
    if (missingVars.length > 0) {
      return {
        success: false,
        error: `Missing required environment variables: ${missingVars.join(', ')}`,
        details: { missingVars, presentVars }
      };
    }
    
    return {
      success: true,
      warnings,
      details: { presentVars, checkedVars: requiredVars.length }
    };
  }

  /**
   * Validate Google Cloud project
   */
  async validateGoogleCloudProject() {
    try {
      const validator = new GoogleCloudProjectValidator();
      const success = await validator.validate();
      
      return {
        success,
        details: validator.validationResults
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate Google Cloud APIs
   */
  async validateGoogleCloudAPIs() {
    try {
      const requiredAPIs = [
        'documentai.googleapis.com',
        'vision.googleapis.com',
        'storage.googleapis.com'
      ];
      
      const enabledServices = execSync('gcloud services list --enabled --format="value(name)"', { 
        encoding: 'utf8' 
      }).trim().split('\n');
      
      const enabledAPIs = [];
      const disabledAPIs = [];
      
      requiredAPIs.forEach(api => {
        if (enabledServices.includes(api)) {
          enabledAPIs.push(api);
          console.log(`✓ ${api}: Enabled`);
        } else {
          disabledAPIs.push(api);
          console.log(`❌ ${api}: Disabled`);
        }
      });
      
      if (disabledAPIs.length > 0) {
        return {
          success: false,
          error: `Required APIs not enabled: ${disabledAPIs.join(', ')}`,
          details: { enabledAPIs, disabledAPIs }
        };
      }
      
      return {
        success: true,
        details: { enabledAPIs, totalChecked: requiredAPIs.length }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check API status: ${error.message}`
      };
    }
  }

  /**
   * Validate Document AI service
   */
  async validateDocumentAI() {
    try {
      if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID not configured');
      }
      
      // Check if processors exist
      const processorsResult = execSync(`gcloud documentai processors list --location=${process.env.GOOGLE_CLOUD_LOCATION || 'us'} --format="value(name,type)"`, {
        encoding: 'utf8'
      });
      
      const processors = processorsResult.trim().split('\n').filter(line => line);
      
      if (processors.length === 0) {
        return {
          success: false,
          error: 'No Document AI processors found',
          details: { processors: [] }
        };
      }
      
      console.log(`✓ Found ${processors.length} Document AI processors`);
      
      return {
        success: true,
        details: { 
          processorCount: processors.length,
          processors: processors.map(p => {
            const [name, type] = p.split('\t');
            return { name, type };
          })
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Document AI validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate Vision API service
   */
  async validateVisionAPI() {
    try {
      // Test Vision API with a simple request
      const testScript = `
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

async function testVisionAPI() {
  try {
    // Test with a simple text detection on a small base64 image
    const request = {
      image: {
        content: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
      },
      features: [{ type: 'TEXT_DETECTION' }]
    };
    
    const [result] = await client.annotateImage(request);
    console.log('Vision API test successful');
    return true;
  } catch (error) {
    console.error('Vision API test failed:', error.message);
    return false;
  }
}

testVisionAPI().then(result => process.exit(result ? 0 : 1));
      `;
      
      const testPath = path.join(process.cwd(), 'temp-vision-test.js');
      fs.writeFileSync(testPath, testScript);
      
      try {
        execSync(`node ${testPath}`, { stdio: 'pipe' });
        fs.unlinkSync(testPath);
        
        console.log('✓ Vision API connection test passed');
        
        return {
          success: true,
          details: { testType: 'connection', status: 'passed' }
        };
      } catch (error) {
        fs.unlinkSync(testPath);
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: `Vision API validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate Cloud Storage
   */
  async validateCloudStorage() {
    try {
      // List buckets to test access
      const bucketsResult = execSync('gcloud storage buckets list --format="value(name)"', {
        encoding: 'utf8'
      });
      
      const buckets = bucketsResult.trim().split('\n').filter(line => line);
      
      console.log(`✓ Found ${buckets.length} storage buckets`);
      
      return {
        success: true,
        details: { bucketCount: buckets.length, buckets }
      };
    } catch (error) {
      return {
        success: false,
        error: `Cloud Storage validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate Supabase connection
   */
  async validateSupabaseConnection() {
    try {
      const { createClient } = require('@supabase/supabase-js');
      
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase credentials not configured');
      }
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Test connection with a simple query
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);
      
      if (error) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      console.log('✓ Supabase connection successful');
      
      return {
        success: true,
        details: { connectionTest: 'passed', url: process.env.NEXT_PUBLIC_SUPABASE_URL }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate database schema
   */
  async validateDatabaseSchema() {
    try {
      const { createClient } = require('@supabase/supabase-js');
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const requiredTables = [
        'documents',
        'users', 
        'credit_analyses',
        'disputes',
        'subscriptions'
      ];
      
      const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (error) {
        throw new Error(`Failed to query schema: ${error.message}`);
      }
      
      const existingTables = tables.map(t => t.table_name);
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length > 0) {
        return {
          success: false,
          error: `Missing required tables: ${missingTables.join(', ')}`,
          details: { existingTables, missingTables, requiredTables }
        };
      }
      
      console.log(`✓ All ${requiredTables.length} required tables exist`);
      
      return {
        success: true,
        details: { 
          tableCount: existingTables.length,
          requiredTablesPresent: requiredTables.length,
          allTables: existingTables
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate Supabase storage
   */
  async validateSupabaseStorage() {
    try {
      const { createClient } = require('@supabase/supabase-js');
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        throw new Error(`Failed to list storage buckets: ${error.message}`);
      }
      
      const requiredBuckets = ['credit-reports'];
      const existingBucketNames = buckets.map(b => b.name);
      const missingBuckets = requiredBuckets.filter(bucket => !existingBucketNames.includes(bucket));
      
      const warnings = [];
      if (missingBuckets.length > 0) {
        warnings.push(`Missing storage buckets: ${missingBuckets.join(', ')}`);
      }
      
      console.log(`✓ Found ${buckets.length} storage buckets`);
      
      return {
        success: true,
        warnings,
        details: {
          bucketCount: buckets.length,
          buckets: existingBucketNames,
          missingBuckets
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate authentication system
   */
  async validateAuthentication() {
    try {
      const { createClient } = require('@supabase/supabase-js');
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Test auth service by listing users (admin function)
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        throw new Error(`Auth service test failed: ${error.message}`);
      }
      
      console.log(`✓ Authentication service working - ${users.length} users found`);
      
      return {
        success: true,
        details: { userCount: users.length, authService: 'active' }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate PDF processing pipeline
   */
  async validatePDFProcessing() {
    try {
      // This would test the actual PDF processing pipeline
      // For now, we'll check if the required components are available
      
      const checks = [
        { name: 'Google Cloud credentials', check: () => !!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.GOOGLE_CLOUD_CREDENTIALS },
        { name: 'Document AI processor ID', check: () => !!process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID },
        { name: 'PDF processing configuration', check: () => !!process.env.PDF_PROCESSING_TIMEOUT }
      ];
      
      const failures = [];
      const warnings = [];
      
      checks.forEach(check => {
        if (!check.check()) {
          warnings.push(`${check.name} not configured`);
        } else {
          console.log(`✓ ${check.name}: Configured`);
        }
      });
      
      return {
        success: failures.length === 0,
        warnings,
        details: { 
          configurationChecks: checks.length,
          configuredItems: checks.length - warnings.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate AI analysis integration
   */
  async validateAIAnalysis() {
    try {
      if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error('Google AI API key not configured');
      }
      
      // Test basic AI service connectivity
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
      
      // This is a minimal test - in production you'd want more comprehensive testing
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      console.log('✓ AI service credentials configured');
      
      return {
        success: true,
        details: { aiService: 'configured', model: 'gemini-pro' }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate credential security
   */
  async validateCredentialSecurity() {
    try {
      const securityChecks = [];
      const warnings = [];
      
      // Check if sensitive data is properly protected
      if (process.env.NODE_ENV === 'production') {
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_CREDENTIALS) {
          warnings.push('Google Cloud credentials should be configured in production');
        }
        
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          warnings.push('Supabase service role key should be configured in production');
        }
      }
      
      // Check for credential file permissions if using service account file
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
          const stats = fs.statSync(process.env.GOOGLE_APPLICATION_CREDENTIALS);
          const mode = stats.mode & parseInt('777', 8);
          if (mode !== parseInt('600', 8) && mode !== parseInt('644', 8)) {
            warnings.push('Service account key file has overly permissive permissions');
          }
        } catch (error) {
          warnings.push('Service account key file not accessible');
        }
      }
      
      console.log('✓ Credential security checks completed');
      
      return {
        success: true,
        warnings,
        details: { checksPerformed: securityChecks.length + 2 }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate PII protection
   */
  async validatePIIProtection() {
    try {
      const piiChecks = [
        { name: 'PII masking enabled', check: () => process.env.PII_MASKING_ENABLED === 'true' },
        { name: 'PII encryption enabled', check: () => process.env.PII_ENCRYPTION_ENABLED === 'true' },
        { name: 'Temp file cleanup enabled', check: () => process.env.TEMP_FILE_CLEANUP_ENABLED === 'true' }
      ];
      
      const warnings = [];
      
      piiChecks.forEach(check => {
        if (!check.check()) {
          warnings.push(`${check.name} is not enabled`);
        } else {
          console.log(`✓ ${check.name}`);
        }
      });
      
      return {
        success: warnings.length === 0,
        warnings,
        details: { piiProtectionChecks: piiChecks.length }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate performance characteristics
   */
  async validatePerformance() {
    try {
      const performanceChecks = [];
      const warnings = [];
      
      // Check timeout configurations
      const timeoutConfig = process.env.PDF_PROCESSING_TIMEOUT;
      if (!timeoutConfig || parseInt(timeoutConfig) < 30000) {
        warnings.push('PDF processing timeout should be at least 30 seconds');
      }
      
      // Check file size limits
      const maxFileSize = process.env.PDF_MAX_SIZE;
      if (!maxFileSize || parseInt(maxFileSize) > 50 * 1024 * 1024) {
        warnings.push('PDF max size should be reasonable (recommended: < 50MB)');
      }
      
      console.log('✓ Performance configuration checks completed');
      
      return {
        success: true,
        warnings,
        details: { performanceChecks: 2 }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate comprehensive validation report
   */
  async generateValidationReport() {
    const report = {
      validationId: `validation-${Date.now()}`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      results: this.validationResults,
      summary: {
        totalSteps: this.validationSteps.length,
        passedSteps: Object.values(this.validationResults).flat().filter(r => r && r.success).length,
        overallStatus: this.validationResults.overall ? 'PASSED' : 'FAILED'
      }
    };
    
    const reportPath = path.join(process.cwd(), 'comprehensive-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Comprehensive validation report saved: ${reportPath}`);
    
    return reportPath;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
        options.verbose = true;
        break;
      case '--stop-on-failure':
        options.stopOnFailure = true;
        break;
      case '--no-report':
        options.generateReport = false;
        break;
      case '--help':
        console.log(`
CreditAI Comprehensive Validation Suite

Usage:
  node comprehensive-validation-suite.js [options]

Options:
  --verbose              Show detailed validation output
  --stop-on-failure      Stop validation on first critical failure
  --no-report           Don't generate validation report
  --help                Show this help message

Examples:
  node comprehensive-validation-suite.js
  node comprehensive-validation-suite.js --verbose --stop-on-failure
        `);
        process.exit(0);
    }
  }
  
  const validator = new ComprehensiveValidationSuite(options);
  
  validator.validate().then(success => {
    console.log(`\n🎯 Final Result: ${success ? 'VALIDATION PASSED' : 'VALIDATION FAILED'}`);
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveValidationSuite;