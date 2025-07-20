#!/usr/bin/env node

/**
 * CreditAI Infrastructure Diagnostics Tool
 * 
 * This script provides comprehensive diagnostic capabilities for troubleshooting
 * common configuration and deployment issues in the CreditAI infrastructure.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: '.env.local' });

class InfrastructureDiagnostics {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      generateReport: options.generateReport !== false,
      runHealthChecks: options.runHealthChecks !== false,
      ...options
    };
    
    this.diagnosticResults = {
      system: {},
      environment: {},
      googleCloud: {},
      supabase: {},
      network: {},
      dependencies: {},
      common_issues: {},
      recommendations: []
    };
    
    this.diagnosticTests = [
      {
        category: 'system',
        name: 'System Information',
        test: this.diagnosSystemInfo.bind(this),
        critical: false
      },
      {
        category: 'environment',
        name: 'Environment Variables',
        test: this.diagnoseEnvironmentVars.bind(this),
        critical: true
      },
      {
        category: 'dependencies',
        name: 'Node.js Dependencies',
        test: this.diagnoseDependencies.bind(this),
        critical: true
      },
      {
        category: 'googleCloud',
        name: 'Google Cloud CLI',
        test: this.diagnoseGoogleCloudCLI.bind(this),
        critical: true
      },
      {
        category: 'googleCloud',
        name: 'Google Cloud Authentication',
        test: this.diagnoseGoogleCloudAuth.bind(this),
        critical: true
      },
      {
        category: 'googleCloud',
        name: 'Google Cloud Project Access',
        test: this.diagnoseGoogleCloudProject.bind(this),
        critical: true
      },
      {
        category: 'googleCloud',
        name: 'Google Cloud Services',
        test: this.diagnoseGoogleCloudServices.bind(this),
        critical: true
      },
      {
        category: 'supabase',
        name: 'Supabase CLI',
        test: this.diagnoseSupabaseCLI.bind(this),
        critical: false
      },
      {
        category: 'supabase',
        name: 'Supabase Connection',
        test: this.diagnoseSupabaseConnection.bind(this),
        critical: true
      },
      {
        category: 'network',
        name: 'Network Connectivity',
        test: this.diagnoseNetworkConnectivity.bind(this),
        critical: false
      },
      {
        category: 'common_issues',
        name: 'Common Configuration Issues',
        test: this.diagnoseCommonIssues.bind(this),
        critical: false
      }
    ];
  }

  /**
   * Run complete diagnostics
   */
  async diagnose() {
    try {
      console.log('🔍 CreditAI Infrastructure Diagnostics');
      console.log('='.repeat(50));
      console.log(`Platform: ${os.platform()} ${os.arch()}`);
      console.log(`Node.js: ${process.version}`);
      console.log(`Working Directory: ${process.cwd()}`);
      console.log('='.repeat(50));

      for (const test of this.diagnosticTests) {
        console.log(`\n🔬 Diagnosing: ${test.name}`);
        console.log('─'.repeat(40));
        
        try {
          const result = await test.test();
          this.diagnosticResults[test.category][test.name] = result;
          
          if (result.status === 'healthy') {
            console.log(`✅ ${test.name}: Healthy`);
          } else if (result.status === 'warning') {
            console.log(`⚠️ ${test.name}: Warning`);
            if (result.message) console.log(`   ${result.message}`);
          } else {
            console.log(`❌ ${test.name}: Issue Detected`);
            if (result.message) console.log(`   ${result.message}`);
          }
          
          if (result.recommendations) {
            result.recommendations.forEach(rec => {
              this.diagnosticResults.recommendations.push(rec);
            });
          }
          
        } catch (error) {
          console.error(`💥 ${test.name}: Error - ${error.message}`);
          this.diagnosticResults[test.category][test.name] = {
            status: 'error',
            error: error.message
          };
        }
      }

      // Generate summary and recommendations
      await this.generateDiagnosticSummary();
      
      if (this.options.generateReport) {
        await this.generateDiagnosticReport();
      }

      return this.diagnosticResults;

    } catch (error) {
      console.error('\n💥 Diagnostic failed:', error.message);
      return null;
    }
  }

  /**
   * Diagnose system information
   */
  async diagnosSystemInfo() {
    try {
      const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
        freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
        cpuCount: os.cpus().length,
        uptime: Math.round(os.uptime() / 3600) + ' hours'
      };
      
      console.log(`  Platform: ${systemInfo.platform} ${systemInfo.arch}`);
      console.log(`  Node.js: ${systemInfo.nodeVersion}`);
      console.log(`  Memory: ${systemInfo.freeMemory} free of ${systemInfo.totalMemory}`);
      console.log(`  CPUs: ${systemInfo.cpuCount}`);
      
      const warnings = [];
      if (parseInt(systemInfo.freeMemory) < 1) {
        warnings.push('Low available memory (< 1GB)');
      }
      
      return {
        status: warnings.length > 0 ? 'warning' : 'healthy',
        data: systemInfo,
        warnings
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Diagnose environment variables
   */
  async diagnoseEnvironmentVars() {
    try {
      const requiredVars = {
        'GOOGLE_CLOUD_PROJECT_ID': 'Google Cloud Project ID',
        'GOOGLE_AI_API_KEY': 'Google AI API Key',
        'NEXT_PUBLIC_SUPABASE_URL': 'Supabase URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Supabase Anonymous Key',
        'SUPABASE_SERVICE_ROLE_KEY': 'Supabase Service Role Key'
      };
      
      const optionalVars = {
        'GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID': 'Document AI Processor ID',
        'GOOGLE_APPLICATION_CREDENTIALS': 'Google Application Credentials Path',
        'GOOGLE_CLOUD_CREDENTIALS': 'Google Cloud Credentials JSON'
      };
      
      const missing = [];
      const present = [];
      const warnings = [];
      
      // Check required variables
      Object.entries(requiredVars).forEach(([key, description]) => {
        if (process.env[key]) {
          present.push({ key, description, type: 'required' });
          console.log(`  ✓ ${key}: Present`);
        } else {
          missing.push({ key, description, type: 'required' });
          console.log(`  ❌ ${key}: Missing`);
        }
      });
      
      // Check optional variables
      Object.entries(optionalVars).forEach(([key, description]) => {
        if (process.env[key]) {
          present.push({ key, description, type: 'optional' });
          console.log(`  ✓ ${key}: Present`);
        } else {
          warnings.push(`Optional variable ${key} is not set`);
          console.log(`  ⚠️ ${key}: Not set (optional)`);
        }
      });
      
      const recommendations = [];
      if (missing.length > 0) {
        recommendations.push('Set missing required environment variables in .env.local');
        missing.forEach(v => {
          recommendations.push(`- Set ${v.key}: ${v.description}`);
        });
      }
      
      return {
        status: missing.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'healthy'),
        data: { present, missing, warnings },
        recommendations
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Diagnose Node.js dependencies
   */
  async diagnoseDependencies() {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json not found');
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check if node_modules exists
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');
      const nodeModulesExists = fs.existsSync(nodeModulesPath);
      
      console.log(`  Package name: ${packageJson.name}`);
      console.log(`  Version: ${packageJson.version}`);
      console.log(`  Node modules: ${nodeModulesExists ? 'Present' : 'Missing'}`);
      
      const issues = [];
      const recommendations = [];
      
      if (!nodeModulesExists) {
        issues.push('node_modules directory not found');
        recommendations.push('Run: npm install');
      }
      
      // Check critical dependencies
      const criticalDeps = [
        '@google-cloud/documentai',
        '@google-cloud/vision',
        '@supabase/supabase-js',
        '@google/generative-ai'
      ];
      
      const missingDeps = [];
      criticalDeps.forEach(dep => {
        if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
          missingDeps.push(dep);
        } else {
          console.log(`  ✓ ${dep}: ${packageJson.dependencies[dep]}`);
        }
      });
      
      if (missingDeps.length > 0) {
        issues.push(`Missing critical dependencies: ${missingDeps.join(', ')}`);
        recommendations.push('Install missing dependencies');
      }
      
      return {
        status: issues.length > 0 ? 'error' : 'healthy',
        data: {
          packageName: packageJson.name,
          version: packageJson.version,
          nodeModulesExists,
          missingDeps
        },
        issues,
        recommendations
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        recommendations: ['Ensure you are in the correct project directory']
      };
    }
  }

  /**
   * Diagnose Google Cloud CLI
   */
  async diagnoseGoogleCloudCLI() {
    try {
      // Check if gcloud is installed
      const version = execSync('gcloud --version', { encoding: 'utf8' });
      const versionLines = version.split('\n');
      const gcloudVersion = versionLines[0];
      
      console.log(`  ${gcloudVersion}`);
      
      // Check gcloud components
      const components = execSync('gcloud components list --format="value(id,state)"', { encoding: 'utf8' });
      const installedComponents = components.split('\n')
        .filter(line => line.includes('Installed'))
        .map(line => line.split('\t')[0]);
      
      console.log(`  Installed components: ${installedComponents.length}`);
      
      const recommendations = [];
      const requiredComponents = ['alpha', 'beta'];
      const missingComponents = requiredComponents.filter(comp => !installedComponents.includes(comp));
      
      if (missingComponents.length > 0) {
        recommendations.push(`Install missing components: gcloud components install ${missingComponents.join(' ')}`);
      }
      
      return {
        status: 'healthy',
        data: {
          version: gcloudVersion,
          installedComponents,
          missingComponents
        },
        recommendations
      };
    } catch (error) {
      return {
        status: 'error',
        error: 'Google Cloud CLI not found or not working',
        recommendations: [
          'Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install',
          'Add gcloud to your PATH environment variable'
        ]
      };
    }
  }

  /**
   * Diagnose Google Cloud authentication
   */
  async diagnoseGoogleCloudAuth() {
    try {
      // Check current authentication
      const authList = execSync('gcloud auth list --format="value(account,status)"', { encoding: 'utf8' });
      const accounts = authList.trim().split('\n').filter(line => line);
      
      const activeAccounts = accounts.filter(account => account.includes('ACTIVE'));
      const inactiveAccounts = accounts.filter(account => !account.includes('ACTIVE'));
      
      console.log(`  Active accounts: ${activeAccounts.length}`);
      console.log(`  Inactive accounts: ${inactiveAccounts.length}`);
      
      if (activeAccounts.length > 0) {
        activeAccounts.forEach(account => {
          const email = account.split('\t')[0];
          console.log(`  ✓ Active: ${email}`);
        });
      }
      
      const issues = [];
      const recommendations = [];
      
      if (activeAccounts.length === 0) {
        issues.push('No active Google Cloud authentication found');
        recommendations.push('Run: gcloud auth login');
      }
      
      // Check application default credentials
      try {
        execSync('gcloud auth application-default print-access-token', { stdio: 'pipe' });
        console.log(`  ✓ Application default credentials: Available`);
      } catch (error) {
        issues.push('Application default credentials not set');
        recommendations.push('Run: gcloud auth application-default login');
      }
      
      return {
        status: issues.length > 0 ? 'error' : 'healthy',
        data: {
          activeAccounts: activeAccounts.length,
          inactiveAccounts: inactiveAccounts.length
        },
        issues,
        recommendations
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        recommendations: ['Ensure Google Cloud CLI is installed and accessible']
      };
    }
  }

  /**
   * Diagnose Google Cloud project access
   */
  async diagnoseGoogleCloudProject() {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 
        execSync('gcloud config get-value project', { encoding: 'utf8' }).trim();
      
      if (!projectId || projectId === '(unset)') {
        throw new Error('No project ID configured');
      }
      
      console.log(`  Project ID: ${projectId}`);
      
      // Check project access
      const projectInfo = execSync(`gcloud projects describe ${projectId} --format="json"`, { encoding: 'utf8' });
      const project = JSON.parse(projectInfo);
      
      console.log(`  Project name: ${project.name}`);
      console.log(`  Project state: ${project.lifecycleState}`);
      
      const issues = [];
      const recommendations = [];
      
      if (project.lifecycleState !== 'ACTIVE') {
        issues.push(`Project is not active (state: ${project.lifecycleState})`);
        recommendations.push('Ensure the project is active and you have access');
      }
      
      // Check billing
      try {
        const billingInfo = execSync(`gcloud billing projects describe ${projectId} --format="json"`, { encoding: 'utf8' });
        const billing = JSON.parse(billingInfo);
        
        if (billing.billingEnabled) {
          console.log(`  ✓ Billing: Enabled`);
        } else {
          issues.push('Billing is not enabled');
          recommendations.push('Enable billing for the project in Google Cloud Console');
        }
      } catch (error) {
        issues.push('Cannot check billing status');
      }
      
      return {
        status: issues.length > 0 ? 'error' : 'healthy',
        data: {
          projectId,
          projectName: project.name,
          lifecycleState: project.lifecycleState
        },
        issues,
        recommendations
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        recommendations: [
          'Set GOOGLE_CLOUD_PROJECT_ID in your environment',
          'Run: gcloud config set project YOUR_PROJECT_ID',
          'Ensure you have access to the project'
        ]
      };
    }
  }

  /**
   * Diagnose Google Cloud services
   */
  async diagnoseGoogleCloudServices() {
    try {
      const requiredServices = [
        'documentai.googleapis.com',
        'vision.googleapis.com',
        'storage.googleapis.com',
        'monitoring.googleapis.com'
      ];
      
      const enabledServices = execSync('gcloud services list --enabled --format="value(name)"', { 
        encoding: 'utf8' 
      }).trim().split('\n');
      
      const enabledRequired = [];
      const disabledRequired = [];
      
      requiredServices.forEach(service => {
        if (enabledServices.includes(service)) {
          enabledRequired.push(service);
          console.log(`  ✓ ${service}: Enabled`);
        } else {
          disabledRequired.push(service);
          console.log(`  ❌ ${service}: Disabled`);
        }
      });
      
      const recommendations = [];
      if (disabledRequired.length > 0) {
        recommendations.push('Enable required services:');
        disabledRequired.forEach(service => {
          recommendations.push(`  gcloud services enable ${service}`);
        });
      }
      
      return {
        status: disabledRequired.length > 0 ? 'error' : 'healthy',
        data: {
          requiredServices: requiredServices.length,
          enabledRequired: enabledRequired.length,
          disabledServices: disabledRequired
        },
        recommendations
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Diagnose Supabase CLI
   */
  async diagnoseSupabaseCLI() {
    try {
      const version = execSync('supabase --version', { encoding: 'utf8' });
      console.log(`  Version: ${version.trim()}`);
      
      return {
        status: 'healthy',
        data: { version: version.trim() }
      };
    } catch (error) {
      return {
        status: 'warning',
        message: 'Supabase CLI not found (optional for production)',
        recommendations: [
          'Install Supabase CLI for local development:',
          'npm install -g supabase'
        ]
      };
    }
  }

  /**
   * Diagnose Supabase connection
   */
  async diagnoseSupabaseConnection() {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');
      }
      
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
      }
      
      console.log(`  URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
      
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Test connection
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);
      
      if (error) {
        throw new Error(`Connection failed: ${error.message}`);
      }
      
      console.log(`  ✓ Connection: Successful`);
      
      return {
        status: 'healthy',
        data: { url: process.env.NEXT_PUBLIC_SUPABASE_URL }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        recommendations: [
          'Check Supabase credentials in .env.local',
          'Ensure Supabase project is active',
          'Verify network connectivity'
        ]
      };
    }
  }

  /**
   * Diagnose network connectivity
   */
  async diagnoseNetworkConnectivity() {
    try {
      const endpoints = [
        { name: 'Google APIs', url: 'https://googleapis.com' },
        { name: 'Google AI', url: 'https://generativelanguage.googleapis.com' },
        { name: 'Supabase', url: process.env.NEXT_PUBLIC_SUPABASE_URL }
      ];
      
      const results = [];
      
      for (const endpoint of endpoints) {
        if (!endpoint.url) {
          results.push({ name: endpoint.name, status: 'skipped', reason: 'URL not configured' });
          continue;
        }
        
        try {
          // Simple connectivity test using curl
          execSync(`curl -Is "${endpoint.url}" | head -1`, { stdio: 'pipe', timeout: 5000 });
          results.push({ name: endpoint.name, status: 'reachable' });
          console.log(`  ✓ ${endpoint.name}: Reachable`);
        } catch (error) {
          results.push({ name: endpoint.name, status: 'unreachable', error: error.message });
          console.log(`  ❌ ${endpoint.name}: Unreachable`);
        }
      }
      
      const unreachable = results.filter(r => r.status === 'unreachable');
      const recommendations = [];
      
      if (unreachable.length > 0) {
        recommendations.push('Check network connectivity and firewall settings');
        recommendations.push('Verify proxy settings if behind corporate firewall');
      }
      
      return {
        status: unreachable.length > 0 ? 'warning' : 'healthy',
        data: { results },
        recommendations
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Diagnose common configuration issues
   */
  async diagnoseCommonIssues() {
    try {
      const issues = [];
      const recommendations = [];
      
      // Check for common file permission issues
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
          const stats = fs.statSync(process.env.GOOGLE_APPLICATION_CREDENTIALS);
          const mode = stats.mode & parseInt('777', 8);
          if (mode > parseInt('644', 8)) {
            issues.push('Service account key file has overly permissive permissions');
            recommendations.push(`chmod 600 ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
          }
        } catch (error) {
          issues.push('Service account key file not accessible');
          recommendations.push('Check GOOGLE_APPLICATION_CREDENTIALS path');
        }
      }
      
      // Check for conflicting environment configurations
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_CLOUD_CREDENTIALS) {
        issues.push('Both GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_CREDENTIALS are set');
        recommendations.push('Use only one authentication method');
      }
      
      // Check Node.js version compatibility
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
      if (majorVersion < 18) {
        issues.push(`Node.js version ${nodeVersion} is below recommended minimum (18.x)`);
        recommendations.push('Upgrade to Node.js 18.x or higher');
      }
      
      // Check for common port conflicts
      const commonPorts = [3000, 5432, 54323]; // Next.js, PostgreSQL, Supabase
      for (const port of commonPorts) {
        try {
          execSync(`lsof -i :${port}`, { stdio: 'pipe' });
          console.log(`  ⚠️ Port ${port} is in use`);
        } catch (error) {
          // Port is free, which is good
        }
      }
      
      console.log(`  Found ${issues.length} common issues`);
      
      return {
        status: issues.length > 0 ? 'warning' : 'healthy',
        data: { issues },
        recommendations
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Generate diagnostic summary
   */
  async generateDiagnosticSummary() {
    console.log('\n📊 Diagnostic Summary');
    console.log('='.repeat(30));
    
    const categories = Object.keys(this.diagnosticResults);
    let healthyCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    
    categories.forEach(category => {
      if (category === 'recommendations') return;
      
      const categoryResults = this.diagnosticResults[category];
      const tests = Object.values(categoryResults);
      
      const categoryHealthy = tests.filter(t => t.status === 'healthy').length;
      const categoryWarning = tests.filter(t => t.status === 'warning').length;
      const categoryError = tests.filter(t => t.status === 'error').length;
      
      console.log(`${category}: ✅${categoryHealthy} ⚠️${categoryWarning} ❌${categoryError}`);
      
      healthyCount += categoryHealthy;
      warningCount += categoryWarning;
      errorCount += categoryError;
    });
    
    console.log('\nOverall:');
    console.log(`✅ Healthy: ${healthyCount}`);
    console.log(`⚠️ Warnings: ${warningCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (this.diagnosticResults.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.diagnosticResults.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
  }

  /**
   * Generate diagnostic report
   */
  async generateDiagnosticReport() {
    const report = {
      diagnosticId: `diagnostic-${Date.now()}`,
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      },
      results: this.diagnosticResults
    };
    
    const reportPath = path.join(process.cwd(), 'infrastructure-diagnostic-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Diagnostic report saved: ${reportPath}`);
    
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
      case '--no-report':
        options.generateReport = false;
        break;
      case '--no-health-checks':
        options.runHealthChecks = false;
        break;
      case '--help':
        console.log(`
CreditAI Infrastructure Diagnostics

Usage:
  node infrastructure-diagnostics.js [options]

Options:
  --verbose              Show detailed diagnostic output
  --no-report           Don't generate diagnostic report
  --no-health-checks    Skip health checks
  --help                Show this help message

Examples:
  node infrastructure-diagnostics.js
  node infrastructure-diagnostics.js --verbose
        `);
        process.exit(0);
    }
  }
  
  const diagnostics = new InfrastructureDiagnostics(options);
  
  diagnostics.diagnose().then(results => {
    if (results) {
      console.log('\n🎯 Diagnostics completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Diagnostics failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('Diagnostics failed:', error);
    process.exit(1);
  });
}

module.exports = InfrastructureDiagnostics;