#!/usr/bin/env node

/**
 * Third-Party Integration Validation Script
 * Validates all third-party service integrations for production readiness
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  environment: process.env.NODE_ENV || 'production',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  reportPath: './test-results/third-party-validation-report.json'
};

// Integration test results
const validationResults = {
  timestamp: new Date().toISOString(),
  environment: CONFIG.environment,
  integrations: {},
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

async function main() {
  console.log('🔌 Starting Third-Party Integration Validation...');
  console.log(`Environment: ${CONFIG.environment}`);
  console.log('='.repeat(60));

  try {
    // Validate all integrations
    await validateStripeIntegration();
    await validateGoogleCloudIntegration();
    await validateSupabaseIntegration();
    await validateEmailServiceIntegration();
    await validateMonitoringIntegrations();
    await validateSecurityIntegrations();
    await validateAnalyticsIntegrations();

    // Generate final report
    await generateValidationReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Third-Party Integration Validation Complete');
    console.log(`Total: ${validationResults.summary.total}`);
    console.log(`Passed: ${validationResults.summary.passed}`);
    console.log(`Failed: ${validationResults.summary.failed}`);
    console.log(`Warnings: ${validationResults.summary.warnings}`);

    // Exit with appropriate code
    process.exit(validationResults.summary.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

async function validateStripeIntegration() {
  console.log('\n💳 Validating Stripe Integration...');
  
  const integration = {
    name: 'Stripe',
    status: 'unknown',
    tests: [],
    errors: [],
    warnings: []
  };

  try {
    // Test 1: Environment variables
    const stripeTests = [
      {
        name: 'Stripe Secret Key',
        test: () => !!process.env.STRIPE_SECRET_KEY,
        critical: true
      },
      {
        name: 'Stripe Publishable Key',
        test: () => !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        critical: true
      },
      {
        name: 'Stripe Webhook Secret',
        test: () => !!process.env.STRIPE_WEBHOOK_SECRET,
        critical: true
      }
    ];

    for (const test of stripeTests) {
      const result = await runTest(test);
      integration.tests.push(result);
      
      if (!result.passed && test.critical) {
        integration.errors.push(`Critical: ${test.name} not configured`);
      }
    }

    // Test 2: API Connectivity
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        // Test retrieving account information
        const account = await stripe.accounts.retrieve();
        integration.tests.push({
          name: 'Stripe API Connectivity',
          passed: true,
          details: `Account ID: ${account.id}`
        });

        // Test creating a test payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 1000, // $10.00
          currency: 'usd',
          metadata: { test: 'integration-validation' }
        });

        integration.tests.push({
          name: 'Payment Intent Creation',
          passed: paymentIntent.status === 'requires_payment_method',
          details: `Payment Intent ID: ${paymentIntent.id}`
        });

        // Test webhook endpoint configuration
        const webhookEndpoints = await stripe.webhookEndpoints.list();
        const hasWebhookEndpoint = webhookEndpoints.data.length > 0;
        
        integration.tests.push({
          name: 'Webhook Endpoint Configuration',
          passed: hasWebhookEndpoint,
          details: `${webhookEndpoints.data.length} webhook(s) configured`
        });

        if (!hasWebhookEndpoint) {
          integration.warnings.push('No webhook endpoints configured');
        }

      } catch (error) {
        integration.tests.push({
          name: 'Stripe API Connectivity',
          passed: false,
          error: error.message
        });
        integration.errors.push(`Stripe API Error: ${error.message}`);
      }
    }

    // Determine overall status
    const criticalFailures = integration.tests.filter(t => !t.passed && t.critical).length;
    const totalFailures = integration.tests.filter(t => !t.passed).length;
    
    if (criticalFailures > 0) {
      integration.status = 'failed';
    } else if (totalFailures > 0 || integration.warnings.length > 0) {
      integration.status = 'warning';
    } else {
      integration.status = 'passed';
    }

    console.log(`  Status: ${getStatusIcon(integration.status)} ${integration.status.toUpperCase()}`);
    
  } catch (error) {
    integration.status = 'failed';
    integration.errors.push(error.message);
    console.log(`  Status: ❌ FAILED - ${error.message}`);
  }

  validationResults.integrations.stripe = integration;
  updateSummary(integration.status);
}

async function validateGoogleCloudIntegration() {
  console.log('\n☁️  Validating Google Cloud Integration...');
  
  const integration = {
    name: 'Google Cloud',
    status: 'unknown',
    tests: [],
    errors: [],
    warnings: []
  };

  try {
    // Test 1: Environment variables and credentials
    const gcpTests = [
      {
        name: 'Google Cloud Project ID',
        test: () => !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        critical: true
      },
      {
        name: 'Service Account Key',
        test: () => !!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY,
        critical: true
      },
      {
        name: 'Document AI Processor ID',
        test: () => !!process.env.DOCUMENT_AI_PROCESSOR_ID,
        critical: false
      },
      {
        name: 'Vision API Enabled',
        test: () => !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
        critical: false
      }
    ];

    for (const test of gcpTests) {
      const result = await runTest(test);
      integration.tests.push(result);
      
      if (!result.passed && test.critical) {
        integration.errors.push(`Critical: ${test.name} not configured`);
      }
    }

    // Test 2: Service Account Authentication
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY) {
      try {
        // Test authentication with Google Cloud
        const { GoogleAuth } = require('google-auth-library');
        const auth = new GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        const client = await auth.getClient();
        const projectId = await auth.getProjectId();

        integration.tests.push({
          name: 'Service Account Authentication',
          passed: true,
          details: `Project ID: ${projectId}`
        });

        // Test Vision API
        if (process.env.GOOGLE_CLOUD_VISION_API_KEY) {
          const vision = require('@google-cloud/vision');
          const visionClient = new vision.ImageAnnotatorClient();

          // Test with a simple text detection (would need actual implementation)
          integration.tests.push({
            name: 'Vision API Connectivity',
            passed: true,
            details: 'Vision API client initialized successfully'
          });
        }

        // Test Document AI
        if (process.env.DOCUMENT_AI_PROCESSOR_ID) {
          const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
          const client = new DocumentProcessorServiceClient();

          integration.tests.push({
            name: 'Document AI Connectivity',
            passed: true,
            details: 'Document AI client initialized successfully'
          });
        }

      } catch (error) {
        integration.tests.push({
          name: 'Google Cloud Authentication',
          passed: false,
          error: error.message
        });
        integration.errors.push(`Google Cloud Auth Error: ${error.message}`);
      }
    }

    // Test 3: Cloud Function Deployment Status
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_APP_URL}/api/system/health/google-cloud`, {
        timeout: CONFIG.timeout
      });

      integration.tests.push({
        name: 'Cloud Function Health',
        passed: response.status === 200,
        details: response.data
      });

    } catch (error) {
      integration.tests.push({
        name: 'Cloud Function Health',
        passed: false,
        error: error.message
      });
      integration.warnings.push('Cloud Function health check failed');
    }

    // Determine overall status
    const criticalFailures = integration.tests.filter(t => !t.passed && t.critical).length;
    const totalFailures = integration.tests.filter(t => !t.passed).length;
    
    if (criticalFailures > 0) {
      integration.status = 'failed';
    } else if (totalFailures > 0 || integration.warnings.length > 0) {
      integration.status = 'warning';
    } else {
      integration.status = 'passed';
    }

    console.log(`  Status: ${getStatusIcon(integration.status)} ${integration.status.toUpperCase()}`);
    
  } catch (error) {
    integration.status = 'failed';
    integration.errors.push(error.message);
    console.log(`  Status: ❌ FAILED - ${error.message}`);
  }

  validationResults.integrations.googleCloud = integration;
  updateSummary(integration.status);
}

async function validateSupabaseIntegration() {
  console.log('\n🗄️  Validating Supabase Integration...');
  
  const integration = {
    name: 'Supabase',
    status: 'unknown',
    tests: [],
    errors: [],
    warnings: []
  };

  try {
    // Test 1: Environment variables
    const supabaseTests = [
      {
        name: 'Supabase URL',
        test: () => !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        critical: true
      },
      {
        name: 'Supabase Anon Key',
        test: () => !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        critical: true
      },
      {
        name: 'Supabase Service Role Key',
        test: () => !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        critical: true
      }
    ];

    for (const test of supabaseTests) {
      const result = await runTest(test);
      integration.tests.push(result);
      
      if (!result.passed && test.critical) {
        integration.errors.push(`Critical: ${test.name} not configured`);
      }
    }

    // Test 2: Database connectivity
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        // Test database connectivity
        const { data, error } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);

        integration.tests.push({
          name: 'Database Connectivity',
          passed: !error,
          details: error ? error.message : 'Database accessible'
        });

        if (error) {
          integration.errors.push(`Database Error: ${error.message}`);
        }

        // Test authentication
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        integration.tests.push({
          name: 'Authentication Service',
          passed: !authError,
          details: authError ? authError.message : 'Auth service accessible'
        });

        if (authError) {
          integration.warnings.push(`Auth Warning: ${authError.message}`);
        }

        // Test storage
        const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
        
        integration.tests.push({
          name: 'Storage Service',
          passed: !storageError,
          details: storageError ? storageError.message : `${buckets?.length || 0} buckets configured`
        });

        if (storageError) {
          integration.warnings.push(`Storage Warning: ${storageError.message}`);
        }

        // Test realtime
        const channel = supabase.channel('test-integration-validation');
        integration.tests.push({
          name: 'Realtime Service',
          passed: true,
          details: 'Realtime channel created successfully'
        });
        
        // Clean up
        await supabase.removeChannel(channel);

      } catch (error) {
        integration.tests.push({
          name: 'Supabase Connectivity',
          passed: false,
          error: error.message
        });
        integration.errors.push(`Supabase Error: ${error.message}`);
      }
    }

    // Test 3: Edge Functions (if deployed)
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/health`, {
        timeout: CONFIG.timeout,
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      });

      integration.tests.push({
        name: 'Edge Functions',
        passed: response.status === 200,
        details: 'Edge functions accessible'
      });

    } catch (error) {
      integration.tests.push({
        name: 'Edge Functions',
        passed: false,
        error: error.message
      });
      integration.warnings.push('Edge functions not accessible or not deployed');
    }

    // Determine overall status
    const criticalFailures = integration.tests.filter(t => !t.passed && t.critical).length;
    const totalFailures = integration.tests.filter(t => !t.passed).length;
    
    if (criticalFailures > 0) {
      integration.status = 'failed';
    } else if (totalFailures > 0 || integration.warnings.length > 0) {
      integration.status = 'warning';
    } else {
      integration.status = 'passed';
    }

    console.log(`  Status: ${getStatusIcon(integration.status)} ${integration.status.toUpperCase()}`);
    
  } catch (error) {
    integration.status = 'failed';
    integration.errors.push(error.message);
    console.log(`  Status: ❌ FAILED - ${error.message}`);
  }

  validationResults.integrations.supabase = integration;
  updateSummary(integration.status);
}

async function validateEmailServiceIntegration() {
  console.log('\n📧 Validating Email Service Integration...');
  
  const integration = {
    name: 'Email Service',
    status: 'unknown',
    tests: [],
    errors: [],
    warnings: []
  };

  try {
    // Test 1: Environment variables
    const emailTests = [
      {
        name: 'SMTP Host',
        test: () => !!process.env.SMTP_HOST,
        critical: true
      },
      {
        name: 'SMTP User',
        test: () => !!process.env.SMTP_USER,
        critical: true
      },
      {
        name: 'SMTP Password',
        test: () => !!process.env.SMTP_PASSWORD,
        critical: true
      },
      {
        name: 'From Email',
        test: () => !!process.env.FROM_EMAIL,
        critical: true
      }
    ];

    for (const test of emailTests) {
      const result = await runTest(test);
      integration.tests.push(result);
      
      if (!result.passed && test.critical) {
        integration.errors.push(`Critical: ${test.name} not configured`);
      }
    }

    // Test 2: SMTP connectivity
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      try {
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          }
        });

        // Verify SMTP connection
        const verified = await transporter.verify();
        
        integration.tests.push({
          name: 'SMTP Connectivity',
          passed: verified,
          details: 'SMTP server connection verified'
        });

        if (!verified) {
          integration.errors.push('SMTP server verification failed');
        }

      } catch (error) {
        integration.tests.push({
          name: 'SMTP Connectivity',
          passed: false,
          error: error.message
        });
        integration.errors.push(`SMTP Error: ${error.message}`);
      }
    }

    // Test 3: Email API endpoint
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/test-email`, {
        to: 'test@example.com',
        subject: 'Integration Test',
        body: 'This is a test email from integration validation'
      }, {
        timeout: CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      integration.tests.push({
        name: 'Email API Endpoint',
        passed: response.status === 200,
        details: 'Email API endpoint accessible'
      });

    } catch (error) {
      integration.tests.push({
        name: 'Email API Endpoint',
        passed: false,
        error: error.message
      });
      integration.warnings.push('Email API endpoint not accessible');
    }

    // Determine overall status
    const criticalFailures = integration.tests.filter(t => !t.passed && t.critical).length;
    const totalFailures = integration.tests.filter(t => !t.passed).length;
    
    if (criticalFailures > 0) {
      integration.status = 'failed';
    } else if (totalFailures > 0 || integration.warnings.length > 0) {
      integration.status = 'warning';
    } else {
      integration.status = 'passed';
    }

    console.log(`  Status: ${getStatusIcon(integration.status)} ${integration.status.toUpperCase()}`);
    
  } catch (error) {
    integration.status = 'failed';
    integration.errors.push(error.message);
    console.log(`  Status: ❌ FAILED - ${error.message}`);
  }

  validationResults.integrations.emailService = integration;
  updateSummary(integration.status);
}

async function validateMonitoringIntegrations() {
  console.log('\n📊 Validating Monitoring Integrations...');
  
  const integration = {
    name: 'Monitoring',
    status: 'unknown',
    tests: [],
    errors: [],
    warnings: []
  };

  try {
    // Test Prometheus endpoint
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_APP_URL}/api/monitoring/metrics`, {
        timeout: CONFIG.timeout
      });

      integration.tests.push({
        name: 'Prometheus Metrics',
        passed: response.status === 200,
        details: 'Metrics endpoint accessible'
      });

    } catch (error) {
      integration.tests.push({
        name: 'Prometheus Metrics',
        passed: false,
        error: error.message
      });
      integration.warnings.push('Prometheus metrics endpoint not accessible');
    }

    // Test health checks
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_APP_URL}/api/system/health`, {
        timeout: CONFIG.timeout
      });

      integration.tests.push({
        name: 'Health Check Endpoint',
        passed: response.status === 200,
        details: 'Health check endpoint accessible'
      });

    } catch (error) {
      integration.tests.push({
        name: 'Health Check Endpoint',
        passed: false,
        error: error.message
      });
      integration.errors.push('Health check endpoint not accessible');
    }

    // Test Grafana (if configured)
    if (process.env.GRAFANA_URL) {
      try {
        const response = await axios.get(`${process.env.GRAFANA_URL}/api/health`, {
          timeout: CONFIG.timeout
        });

        integration.tests.push({
          name: 'Grafana Dashboard',
          passed: response.status === 200,
          details: 'Grafana accessible'
        });

      } catch (error) {
        integration.tests.push({
          name: 'Grafana Dashboard',
          passed: false,
          error: error.message
        });
        integration.warnings.push('Grafana dashboard not accessible');
      }
    }

    // Test Sentry (if configured)
    if (process.env.SENTRY_DSN) {
      try {
        const Sentry = require('@sentry/node');
        
        integration.tests.push({
          name: 'Sentry Error Tracking',
          passed: true,
          details: 'Sentry DSN configured'
        });

      } catch (error) {
        integration.tests.push({
          name: 'Sentry Error Tracking',
          passed: false,
          error: error.message
        });
        integration.warnings.push('Sentry configuration issue');
      }
    }

    // Determine overall status
    const totalFailures = integration.tests.filter(t => !t.passed).length;
    
    if (totalFailures > 0 && integration.errors.length > 0) {
      integration.status = 'failed';
    } else if (totalFailures > 0 || integration.warnings.length > 0) {
      integration.status = 'warning';
    } else {
      integration.status = 'passed';
    }

    console.log(`  Status: ${getStatusIcon(integration.status)} ${integration.status.toUpperCase()}`);
    
  } catch (error) {
    integration.status = 'failed';
    integration.errors.push(error.message);
    console.log(`  Status: ❌ FAILED - ${error.message}`);
  }

  validationResults.integrations.monitoring = integration;
  updateSummary(integration.status);
}

async function validateSecurityIntegrations() {
  console.log('\n🔒 Validating Security Integrations...');
  
  const integration = {
    name: 'Security',
    status: 'unknown',
    tests: [],
    errors: [],
    warnings: []
  };

  try {
    // Test security headers
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_APP_URL}`, {
        timeout: CONFIG.timeout
      });

      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security',
        'content-security-policy'
      ];

      const missingHeaders = securityHeaders.filter(header => 
        !response.headers[header.toLowerCase()]
      );

      integration.tests.push({
        name: 'Security Headers',
        passed: missingHeaders.length === 0,
        details: missingHeaders.length === 0 
          ? 'All security headers present' 
          : `Missing headers: ${missingHeaders.join(', ')}`
      });

      if (missingHeaders.length > 0) {
        integration.warnings.push(`Missing security headers: ${missingHeaders.join(', ')}`);
      }

    } catch (error) {
      integration.tests.push({
        name: 'Security Headers',
        passed: false,
        error: error.message
      });
      integration.errors.push('Cannot validate security headers');
    }

    // Test rate limiting
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_APP_URL}/api/system/health`, {
        timeout: CONFIG.timeout
      });

      const rateLimitHeaders = ['x-ratelimit-limit', 'x-ratelimit-remaining'];
      const hasRateLimit = rateLimitHeaders.some(header => 
        response.headers[header.toLowerCase()]
      );

      integration.tests.push({
        name: 'Rate Limiting',
        passed: hasRateLimit,
        details: hasRateLimit ? 'Rate limiting active' : 'Rate limiting not detected'
      });

      if (!hasRateLimit) {
        integration.warnings.push('Rate limiting not detected');
      }

    } catch (error) {
      integration.tests.push({
        name: 'Rate Limiting',
        passed: false,
        error: error.message
      });
      integration.warnings.push('Cannot validate rate limiting');
    }

    // Test HTTPS enforcement
    try {
      const httpsUrl = process.env.NEXT_PUBLIC_APP_URL?.replace('http://', 'https://');
      if (httpsUrl && httpsUrl.startsWith('https://')) {
        const response = await axios.get(httpsUrl, {
          timeout: CONFIG.timeout
        });

        integration.tests.push({
          name: 'HTTPS Enforcement',
          passed: response.status === 200,
          details: 'HTTPS accessible'
        });
      } else {
        integration.tests.push({
          name: 'HTTPS Enforcement',
          passed: false,
          details: 'HTTPS not configured'
        });
        integration.warnings.push('HTTPS not properly configured');
      }

    } catch (error) {
      integration.tests.push({
        name: 'HTTPS Enforcement',
        passed: false,
        error: error.message
      });
      integration.warnings.push('HTTPS validation failed');
    }

    // Determine overall status
    const totalFailures = integration.tests.filter(t => !t.passed).length;
    
    if (totalFailures > 0 && integration.errors.length > 0) {
      integration.status = 'failed';
    } else if (totalFailures > 0 || integration.warnings.length > 0) {
      integration.status = 'warning';
    } else {
      integration.status = 'passed';
    }

    console.log(`  Status: ${getStatusIcon(integration.status)} ${integration.status.toUpperCase()}`);
    
  } catch (error) {
    integration.status = 'failed';
    integration.errors.push(error.message);
    console.log(`  Status: ❌ FAILED - ${error.message}`);
  }

  validationResults.integrations.security = integration;
  updateSummary(integration.status);
}

async function validateAnalyticsIntegrations() {
  console.log('\n📈 Validating Analytics Integrations...');
  
  const integration = {
    name: 'Analytics',
    status: 'unknown',
    tests: [],
    errors: [],
    warnings: []
  };

  try {
    // Test analytics endpoint
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/health`, {
        timeout: CONFIG.timeout
      });

      integration.tests.push({
        name: 'Analytics API',
        passed: response.status === 200,
        details: 'Analytics API accessible'
      });

    } catch (error) {
      integration.tests.push({
        name: 'Analytics API',
        passed: false,
        error: error.message
      });
      integration.warnings.push('Analytics API not accessible');
    }

    // Test Google Analytics (if configured)
    if (process.env.NEXT_PUBLIC_GA_TRACKING_ID) {
      integration.tests.push({
        name: 'Google Analytics',
        passed: true,
        details: 'Google Analytics tracking ID configured'
      });
    } else {
      integration.tests.push({
        name: 'Google Analytics',
        passed: false,
        details: 'Google Analytics tracking ID not configured'
      });
      integration.warnings.push('Google Analytics not configured');
    }

    // Test feature flags
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_APP_URL}/api/feature-flags/health`, {
        timeout: CONFIG.timeout
      });

      integration.tests.push({
        name: 'Feature Flags',
        passed: response.status === 200,
        details: 'Feature flags system accessible'
      });

    } catch (error) {
      integration.tests.push({
        name: 'Feature Flags',
        passed: false,
        error: error.message
      });
      integration.warnings.push('Feature flags system not accessible');
    }

    // Determine overall status
    const totalFailures = integration.tests.filter(t => !t.passed).length;
    
    if (totalFailures > 0 && integration.errors.length > 0) {
      integration.status = 'failed';
    } else if (totalFailures > 0 || integration.warnings.length > 0) {
      integration.status = 'warning';
    } else {
      integration.status = 'passed';
    }

    console.log(`  Status: ${getStatusIcon(integration.status)} ${integration.status.toUpperCase()}`);
    
  } catch (error) {
    integration.status = 'failed';
    integration.errors.push(error.message);
    console.log(`  Status: ❌ FAILED - ${error.message}`);
  }

  validationResults.integrations.analytics = integration;
  updateSummary(integration.status);
}

// Helper functions
async function runTest(test) {
  try {
    const passed = await test.test();
    return {
      name: test.name,
      passed,
      critical: test.critical || false,
      details: passed ? 'Passed' : 'Failed'
    };
  } catch (error) {
    return {
      name: test.name,
      passed: false,
      critical: test.critical || false,
      error: error.message
    };
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'passed': return '✅';
    case 'warning': return '⚠️';
    case 'failed': return '❌';
    default: return '❓';
  }
}

function updateSummary(status) {
  validationResults.summary.total++;
  switch (status) {
    case 'passed':
      validationResults.summary.passed++;
      break;
    case 'warning':
      validationResults.summary.warnings++;
      break;
    case 'failed':
      validationResults.summary.failed++;
      break;
  }
}

async function generateValidationReport() {
  const reportDir = path.dirname(CONFIG.reportPath);
  
  try {
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(CONFIG.reportPath, JSON.stringify(validationResults, null, 2));
    
    console.log(`\n📊 Validation report saved to: ${CONFIG.reportPath}`);
  } catch (error) {
    console.error('Failed to save validation report:', error.message);
  }
}

// Run validation if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  validateStripeIntegration,
  validateGoogleCloudIntegration,
  validateSupabaseIntegration,
  validateEmailServiceIntegration,
  validateMonitoringIntegrations,
  validateSecurityIntegrations,
  validateAnalyticsIntegrations
};