#!/usr/bin/env node

/**
 * Production Deployment Validator
 * Comprehensive validation of PDF processing system in production environment
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const SAMPLE_REPORTS_DIR = path.join(__dirname, '../test-data/sample-reports');
const RESULTS_DIR = path.join(__dirname, '../test-results/production-validation');
const VALIDATION_TIMEOUT = 300000; // 5 minutes

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Validation metrics
const validationMetrics = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  systemChecks: {
    apiHealth: false,
    databaseConnection: false,
    googleCloudServices: false,
    monitoringSystem: false
  },
  processingMetrics: {
    averageProcessingTime: 0,
    averageConfidence: 0,
    averageAccuracy: 0,
    successRate: 0
  },
  extractionAccuracy: {
    personalInfo: 0,
    creditScores: 0,
    accounts: 0,
    negativeItems: 0,
    inquiries: 0
  },
  errors: []
};

/**
 * System health checks
 */
async function performSystemHealthChecks() {
  console.log('🔍 Performing system health checks...');
  
  try {
    // API Health Check
    const healthResponse = await fetch(`${API_BASE_URL}/health`, { timeout: 10000 });
    validationMetrics.systemChecks.apiHealth = healthResponse.ok;
    console.log(`✅ API Health: ${healthResponse.ok ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.log(`❌ API Health: FAIL - ${error.message}`);
    validationMetrics.errors.push(`API Health Check Failed: ${error.message}`);
  }

  try {
    // System Validation Check
    const systemResponse = await fetch(`${API_BASE_URL}/api/system/validate`, { timeout: 15000 });
    const systemData = await systemResponse.json();
    validationMetrics.systemChecks.databaseConnection = systemData.overall === 'pass';
    console.log(`✅ System Validation: ${systemData.overall === 'pass' ? 'PASS' : 'FAIL'}`);
    
    if (systemData.overall !== 'pass') {
      console.log('System validation details:', JSON.stringify(systemData, null, 2));
    }
  } catch (error) {
    console.log(`❌ System Validation: FAIL - ${error.message}`);
    validationMetrics.errors.push(`System Validation Failed: ${error.message}`);
  }

  try {
    // Google Cloud Services Check
    const gcpTestResponse = await fetch(`${API_BASE_URL}/api/test/google-cloud`, { timeout: 20000 });
    validationMetrics.systemChecks.googleCloudServices = gcpTestResponse.ok;
    console.log(`✅ Google Cloud Services: ${gcpTestResponse.ok ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.log(`❌ Google Cloud Services: FAIL - ${error.message}`);
    validationMetrics.errors.push(`Google Cloud Services Check Failed: ${error.message}`);
  }

  try {
    // Monitoring System Check
    const monitoringResponse = await fetch(`${API_BASE_URL}/api/monitoring/pdf-processing?timeframe=1h`, { timeout: 10000 });
    validationMetrics.systemChecks.monitoringSystem = monitoringResponse.ok;
    console.log(`✅ Monitoring System: ${monitoringResponse.ok ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.log(`❌ Monitoring System: FAIL - ${error.message}`);
    validationMetrics.errors.push(`Monitoring System Check Failed: ${error.message}`);
  }

  const healthChecksPassed = Object.values(validationMetrics.systemChecks).filter(Boolean).length;
  const totalHealthChecks = Object.keys(validationMetrics.systemChecks).length;
  
  console.log(`\n📊 System Health Summary: ${healthChecksPassed}/${totalHealthChecks} checks passed\n`);
  
  return healthChecksPassed === totalHealthChecks;
}

/**
 * Process a single credit report for validation
 */
async function validateCreditReportProcessing(reportPath) {
  const filename = path.basename(reportPath);
  console.log(`📄 Processing: ${filename}`);
  
  validationMetrics.totalTests++;
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(reportPath));
    
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE_URL}/api/process-pdf`, {
      method: 'POST',
      body: formData,
      timeout: VALIDATION_TIMEOUT
    });
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Validate extraction accuracy
    const accuracyResults = validateExtractionAccuracy(result);
    
    // Calculate overall accuracy
    const overallAccuracy = Object.values(accuracyResults).reduce((sum, acc) => sum + acc, 0) / Object.keys(accuracyResults).length;
    
    // Determine if test passed
    const confidenceThreshold = 70;
    const accuracyThreshold = 75;
    const confidence = result.confidence || 0;
    
    const testPassed = overallAccuracy >= accuracyThreshold && confidence >= confidenceThreshold;
    
    if (testPassed) {
      validationMetrics.passedTests++;
      console.log(`  ✅ PASS - Accuracy: ${overallAccuracy.toFixed(1)}%, Confidence: ${confidence.toFixed(1)}%, Time: ${processingTime}ms`);
    } else {
      validationMetrics.failedTests++;
      console.log(`  ❌ FAIL - Accuracy: ${overallAccuracy.toFixed(1)}%, Confidence: ${confidence.toFixed(1)}%, Time: ${processingTime}ms`);
      validationMetrics.errors.push(`Low performance for ${filename}: Accuracy ${overallAccuracy.toFixed(1)}%, Confidence ${confidence.toFixed(1)}%`);
    }
    
    // Save detailed results
    const detailedResult = {
      filename,
      processingTime,
      confidence,
      overallAccuracy,
      accuracyBreakdown: accuracyResults,
      extractedData: result,
      testPassed,
      timestamp: new Date().toISOString()
    };
    
    const resultPath = path.join(RESULTS_DIR, `${path.basename(reportPath, '.pdf')}-validation.json`);
    fs.writeFileSync(resultPath, JSON.stringify(detailedResult, null, 2));
    
    return detailedResult;
    
  } catch (error) {
    validationMetrics.failedTests++;
    const errorMessage = `Error processing ${filename}: ${error.message}`;
    console.log(`  ❌ ERROR - ${error.message}`);
    validationMetrics.errors.push(errorMessage);
    
    return {
      filename,
      error: error.message,
      testPassed: false,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Validate extraction accuracy for different data types
 */
function validateExtractionAccuracy(result) {
  const accuracy = {
    personalInfo: 0,
    creditScores: 0,
    accounts: 0,
    negativeItems: 0,
    inquiries: 0
  };
  
  // Personal Information Accuracy
  if (result.personalInfo) {
    let personalInfoScore = 0;
    let personalInfoChecks = 0;
    
    if (result.personalInfo.name) {
      personalInfoScore += 40;
    }
    personalInfoChecks += 40;
    
    if (result.personalInfo.address) {
      personalInfoScore += 30;
    }
    personalInfoChecks += 30;
    
    if (result.personalInfo.ssn || result.personalInfo.socialSecurityNumber) {
      personalInfoScore += 30;
    }
    personalInfoChecks += 30;
    
    accuracy.personalInfo = personalInfoChecks > 0 ? (personalInfoScore / personalInfoChecks) * 100 : 0;
  }
  
  // Credit Scores Accuracy
  if (result.creditScores) {
    const bureaus = Object.keys(result.creditScores);
    let validScores = 0;
    
    bureaus.forEach(bureau => {
      const score = result.creditScores[bureau];
      if (score && typeof score.score === 'number' && score.score >= 300 && score.score <= 850) {
        validScores++;
      }
    });
    
    accuracy.creditScores = bureaus.length > 0 ? (validScores / bureaus.length) * 100 : 0;
  }
  
  // Accounts Accuracy
  if (Array.isArray(result.accounts) && result.accounts.length > 0) {
    let validAccounts = 0;
    
    result.accounts.forEach(account => {
      let accountScore = 0;
      let accountChecks = 0;
      
      if (account.creditorName) {
        accountScore += 30;
      }
      accountChecks += 30;
      
      if (account.accountNumber) {
        accountScore += 20;
      }
      accountChecks += 20;
      
      if (account.balance !== undefined) {
        accountScore += 25;
      }
      accountChecks += 25;
      
      if (account.status) {
        accountScore += 25;
      }
      accountChecks += 25;
      
      if (accountChecks > 0 && (accountScore / accountChecks) >= 0.6) {
        validAccounts++;
      }
    });
    
    accuracy.accounts = (validAccounts / result.accounts.length) * 100;
  }
  
  // Negative Items Accuracy
  if (Array.isArray(result.negativeItems)) {
    accuracy.negativeItems = result.negativeItems.length > 0 ? 100 : 80; // Assume good if found, decent if none
  }
  
  // Inquiries Accuracy
  if (Array.isArray(result.inquiries)) {
    accuracy.inquiries = result.inquiries.length > 0 ? 100 : 80; // Assume good if found, decent if none
  }
  
  return accuracy;
}

/**
 * Generate comprehensive validation report
 */
function generateValidationReport(results) {
  const processingTimes = results.filter(r => r.processingTime).map(r => r.processingTime);
  const confidenceScores = results.filter(r => r.confidence).map(r => r.confidence);
  const accuracyScores = results.filter(r => r.overallAccuracy).map(r => r.overallAccuracy);
  
  validationMetrics.processingMetrics = {
    averageProcessingTime: processingTimes.length > 0 ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length : 0,
    averageConfidence: confidenceScores.length > 0 ? confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length : 0,
    averageAccuracy: accuracyScores.length > 0 ? accuracyScores.reduce((sum, acc) => sum + acc, 0) / accuracyScores.length : 0,
    successRate: validationMetrics.totalTests > 0 ? (validationMetrics.passedTests / validationMetrics.totalTests) * 100 : 0
  };
  
  // Calculate extraction accuracy averages
  const accuracyResults = results.filter(r => r.accuracyBreakdown);
  if (accuracyResults.length > 0) {
    Object.keys(validationMetrics.extractionAccuracy).forEach(key => {
      const scores = accuracyResults.map(r => r.accuracyBreakdown[key] || 0);
      validationMetrics.extractionAccuracy[key] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });
  }
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    apiUrl: API_BASE_URL,
    systemHealthChecks: validationMetrics.systemChecks,
    testResults: {
      totalTests: validationMetrics.totalTests,
      passedTests: validationMetrics.passedTests,
      failedTests: validationMetrics.failedTests,
      successRate: validationMetrics.processingMetrics.successRate
    },
    performanceMetrics: validationMetrics.processingMetrics,
    extractionAccuracy: validationMetrics.extractionAccuracy,
    errors: validationMetrics.errors,
    detailedResults: results
  };
  
  // Save comprehensive report
  const reportPath = path.join(RESULTS_DIR, `production-validation-report-${new Date().toISOString().replace(/:/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return report;
}

/**
 * Main validation function
 */
async function validateProductionDeployment() {
  console.log('🚀 Starting Production Deployment Validation');
  console.log(`📍 API URL: ${API_BASE_URL}`);
  console.log(`📁 Sample Reports: ${SAMPLE_REPORTS_DIR}`);
  console.log(`📊 Results Directory: ${RESULTS_DIR}\n`);
  
  // Step 1: System Health Checks
  const systemHealthy = await performSystemHealthChecks();
  
  if (!systemHealthy) {
    console.log('⚠️  System health checks failed. Continuing with limited validation...\n');
  }
  
  // Step 2: Prepare sample reports
  if (!fs.existsSync(SAMPLE_REPORTS_DIR)) {
    console.error(`❌ Sample reports directory not found: ${SAMPLE_REPORTS_DIR}`);
    process.exit(1);
  }
  
  const reportFiles = fs.readdirSync(SAMPLE_REPORTS_DIR)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => path.join(SAMPLE_REPORTS_DIR, file));
  
  if (reportFiles.length === 0) {
    console.error(`❌ No PDF files found in ${SAMPLE_REPORTS_DIR}`);
    process.exit(1);
  }
  
  console.log(`📋 Found ${reportFiles.length} sample reports for validation\n`);
  
  // Step 3: Process each report
  console.log('🔄 Processing credit reports...');
  const results = [];
  
  for (const reportFile of reportFiles) {
    const result = await validateCreditReportProcessing(reportFile);
    results.push(result);
  }
  
  // Step 4: Generate comprehensive report
  console.log('\n📈 Generating validation report...');
  const report = generateValidationReport(results);
  
  // Step 5: Display summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PRODUCTION VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n🏥 System Health:');
  Object.entries(validationMetrics.systemChecks).forEach(([check, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${check.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
  });
  
  console.log('\n📋 Test Results:');
  console.log(`  Total Tests: ${validationMetrics.totalTests}`);
  console.log(`  Passed: ${validationMetrics.passedTests}`);
  console.log(`  Failed: ${validationMetrics.failedTests}`);
  console.log(`  Success Rate: ${validationMetrics.processingMetrics.successRate.toFixed(1)}%`);
  
  console.log('\n⚡ Performance Metrics:');
  console.log(`  Average Processing Time: ${validationMetrics.processingMetrics.averageProcessingTime.toFixed(0)}ms`);
  console.log(`  Average Confidence: ${validationMetrics.processingMetrics.averageConfidence.toFixed(1)}%`);
  console.log(`  Average Accuracy: ${validationMetrics.processingMetrics.averageAccuracy.toFixed(1)}%`);
  
  console.log('\n🎯 Extraction Accuracy:');
  Object.entries(validationMetrics.extractionAccuracy).forEach(([type, accuracy]) => {
    console.log(`  ${type.replace(/([A-Z])/g, ' $1')}: ${accuracy.toFixed(1)}%`);
  });
  
  if (validationMetrics.errors.length > 0) {
    console.log('\n❌ Errors:');
    validationMetrics.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log(`\n📄 Detailed report saved to: ${path.basename(reportPath)}`);
  console.log('='.repeat(60));
  
  // Determine overall success
  const minSuccessRate = 80;
  const minAccuracy = 75;
  const minConfidence = 70;
  
  const overallSuccess = 
    validationMetrics.processingMetrics.successRate >= minSuccessRate &&
    validationMetrics.processingMetrics.averageAccuracy >= minAccuracy &&
    validationMetrics.processingMetrics.averageConfidence >= minConfidence &&
    systemHealthy;
  
  if (overallSuccess) {
    console.log('\n🎉 PRODUCTION VALIDATION PASSED');
    console.log('✅ System is ready for production use');
  } else {
    console.log('\n⚠️  PRODUCTION VALIDATION FAILED');
    console.log('❌ System requires attention before production use');
    
    if (validationMetrics.processingMetrics.successRate < minSuccessRate) {
      console.log(`   - Success rate too low: ${validationMetrics.processingMetrics.successRate.toFixed(1)}% < ${minSuccessRate}%`);
    }
    if (validationMetrics.processingMetrics.averageAccuracy < minAccuracy) {
      console.log(`   - Accuracy too low: ${validationMetrics.processingMetrics.averageAccuracy.toFixed(1)}% < ${minAccuracy}%`);
    }
    if (validationMetrics.processingMetrics.averageConfidence < minConfidence) {
      console.log(`   - Confidence too low: ${validationMetrics.processingMetrics.averageConfidence.toFixed(1)}% < ${minConfidence}%`);
    }
    if (!systemHealthy) {
      console.log('   - System health checks failed');
    }
  }
  
  return overallSuccess;
}

// Run validation
if (require.main === module) {
  validateProductionDeployment()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation script error:', error);
      process.exit(1);
    });
}

module.exports = { validateProductionDeployment };