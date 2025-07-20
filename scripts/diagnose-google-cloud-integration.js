#!/usr/bin/env node

/**
 * Google Cloud Document AI Integration Diagnostic Tool
 * Validates configuration and identifies improvement opportunities
 */

const fs = require('fs');
const path = require('path');

class GoogleCloudDiagnostics {
  constructor() {
    this.results = {
      configuration: {},
      services: {},
      recommendations: [],
      errors: []
    };
  }

  async runDiagnostics() {
    console.log('🔍 Running Google Cloud Document AI Integration Diagnostics...\n');
    
    await this.checkConfiguration();
    await this.validateEnvironmentVariables();
    await this.checkServiceAvailability();
    await this.analyzeProcessingPipeline();
    await this.generateRecommendations();
    
    this.printResults();
    return this.results;
  }

  async checkConfiguration() {
    console.log('📋 Checking Configuration...');
    
    const configPath = path.join(process.cwd(), 'src', 'lib', 'google-cloud', 'config.ts');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Extract required environment variables
    const envVars = configContent.match(/process\.env\.[A-Z_]+/g) || [];
    this.results.configuration.requiredEnvVars = [...new Set(envVars)];
    
    // Check current environment
    const currentEnv = {};
    envVars.forEach(envVar => {
      const varName = envVar.replace('process.env.', '');
      currentEnv[varName] = process.env[varName] || 'NOT_SET';
    });
    
    this.results.configuration.currentEnv = currentEnv;
    
    // Count missing variables
    const missing = Object.entries(currentEnv).filter(([_, value]) => value === 'NOT_SET');
    this.results.configuration.missingCount = missing.length;
    
    console.log(`   ✅ Found ${envVars.length} required environment variables`);
    console.log(`   ⚠️  ${missing.length} variables are missing`);
  }

  async validateEnvironmentVariables() {
    console.log('\n🔐 Validating Environment Variables...');
    
    const requiredVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_CLOUD_LOCATION',
      'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID',
      'GOOGLE_CLOUD_KEY_FILE',
      'GOOGLE_AI_API_KEY'
    ];
    
    const validation = {};
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      validation[varName] = {
        set: !!value,
        value: value ? '***' : 'NOT_SET',
        valid: this.isValidEnvVar(varName, value)
      };
    });
    
    this.results.services.environment = validation;
    
    // Check for common issues
    if (process.env.GOOGLE_CLOUD_KEY_FILE && !fs.existsSync(process.env.GOOGLE_CLOUD_KEY_FILE)) {
      this.results.errors.push(`Service account key file not found: ${process.env.GOOGLE_CLOUD_KEY_FILE}`);
    }
  }

  isValidEnvVar(name, value) {
    if (!value) return false;
    
    switch (name) {
      case 'GOOGLE_CLOUD_PROJECT_ID':
        return /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value);
      case 'GOOGLE_CLOUD_LOCATION':
        return ['us', 'eu', 'asia'].includes(value) || /^[a-z]+-[a-z0-9]+$/.test(value);
      case 'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID':
        return /^[a-f0-9]{32}$/.test(value);
      case 'GOOGLE_CLOUD_KEY_FILE':
        return fs.existsSync(value);
      default:
        return true;
    }
  }

  async checkServiceAvailability() {
    console.log('\n☁️  Checking Google Cloud Services...');
    
    try {
      // Check if we can import the required libraries
      const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
      const { ImageAnnotatorClient } = require('@google-cloud/vision');
      
      this.results.services.libraries = {
        documentai: true,
        vision: true
      };
      
      // Test configuration
      const configPath = path.join(process.cwd(), 'src', 'lib', 'google-cloud', 'config.ts');
      const config = require(configPath);
      
      this.results.services.configured = config.isGoogleCloudConfigured();
      
    } catch (error) {
      this.results.services.libraries = {
        documentai: false,
        vision: false,
        error: error.message
      };
      this.results.errors.push(`Library import failed: ${error.message}`);
    }
  }

  async analyzeProcessingPipeline() {
    console.log('\n⚙️  Analyzing Processing Pipeline...');
    
    // Check processing methods
    const processorPath = path.join(process.cwd(), 'src', 'lib', 'google-cloud', 'pdfProcessor.ts');
    const enhancedProcessorPath = path.join(process.cwd(), 'src', 'lib', 'google-cloud', 'enhancedPdfProcessor.ts');
    
    if (fs.existsSync(processorPath)) {
      const content = fs.readFileSync(processorPath, 'utf8');
      
      // Count processing methods
      const methods = content.match(/processingMethod:\s*'([^']+)'/g) || [];
      this.results.processingPipeline = {
        methods: [...new Set(methods.map(m => m.replace(/processingMethod:\s*'([^']+)'/, '$1')))],
        hasDocumentAI: content.includes('DocumentProcessorServiceClient'),
        hasVisionAPI: content.includes('ImageAnnotatorClient'),
        hasFallback: content.includes('fallback')
      };
    }
    
    if (fs.existsSync(enhancedProcessorPath)) {
      this.results.processingPipeline.hasEnhanced = true;
    }
  }

  async generateRecommendations() {
    console.log('\n💡 Generating Recommendations...');
    
    // Configuration recommendations
    if (this.results.configuration.missingCount > 0) {
      this.results.recommendations.push({
        type: 'configuration',
        priority: 'HIGH',
        title: 'Complete Environment Configuration',
        description: `Missing ${this.results.configuration.missingCount} required environment variables`,
        action: 'Set missing environment variables in .env.local'
      });
    }
    
    // Service recommendations
    if (!this.results.services.configured) {
      this.results.recommendations.push({
        type: 'setup',
        priority: 'HIGH',
        title: 'Enable Google Cloud Services',
        description: 'Google Cloud services are not properly configured',
        action: 'Run: npm run setup-google-cloud'
      });
    }
    
    // Feature recommendations
    this.results.recommendations.push({
      type: 'enhancement',
      priority: 'MEDIUM',
      title: 'Implement Specialized Credit Report Processor',
      description: 'Current implementation uses generic OCR instead of credit-specific processors',
      action: 'Create custom Document AI processor for credit reports'
    });
    
    this.results.recommendations.push({
      type: 'enhancement',
      priority: 'MEDIUM',
      title: 'Add Processing Caching',
      description: 'No caching mechanism for processed documents',
      action: 'Implement Redis-based caching for processed results'
    });
    
    this.results.recommendations.push({
      type: 'enhancement',
      priority: 'LOW',
      title: 'Add Batch Processing',
      description: 'Current system processes one document at a time',
      action: 'Implement batch processing for multiple documents'
    });
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC RESULTS');
    console.log('='.repeat(60));
    
    console.log('\n🔧 Configuration Status:');
    Object.entries(this.results.configuration.currentEnv || {}).forEach(([key, value]) => {
      const status = value === 'NOT_SET' ? '❌' : '✅';
      console.log(`   ${status} ${key}: ${value}`);
    });
    
    console.log('\n☁️  Service Status:');
    console.log(`   Document AI: ${this.results.services.libraries?.documentai ? '✅ Available' : '❌ Not Available'}`);
    console.log(`   Vision API: ${this.results.services.libraries?.vision ? '✅ Available' : '❌ Not Available'}`);
    console.log(`   Fully Configured: ${this.results.services.configured ? '✅ Yes' : '❌ No'}`);
    
    console.log('\n🎯 Priority Recommendations:');
    this.results.recommendations
      .filter(r => r.priority === 'HIGH')
      .forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec.title}`);
        console.log(`      ${rec.description}`);
        console.log(`      Action: ${rec.action}`);
      });
    
    console.log('\n📈 Full Report:');
    console.log(JSON.stringify(this.results, null, 2));
  }
}

// Run diagnostics if called directly
if (require.main === module) {
  const diagnostics = new GoogleCloudDiagnostics();
  diagnostics.runDiagnostics().catch(console.error);
}

module.exports = GoogleCloudDiagnostics;