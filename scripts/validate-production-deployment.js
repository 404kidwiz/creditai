#!/usr/bin/env node

/**
 * Production Deployment Validation Script
 * Validates the production deployment with real credit report samples
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.creditai.com';
const API_KEY = process.env.API_KEY || 'test-api-key';
const SAMPLE_REPORTS_DIR = path.join(__dirname, '../test-data/sample-reports');
const RESULTS_DIR = path.join(__dirname, '../test-results');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Test report types
const REPORT_TYPES = [
  'experian',
  'equifax',
  'transunion',
  'credit-karma',
  'annual-credit-report'
];

// Validation metrics
const metrics = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  processingTimes: [],
  confidenceScores: [],
  extractionAccuracy: [],
  errors: []
};

/**
 * Process a single credit report
 */
async function processCreditReport(reportPath) {
  console.log(`Processing report: ${path.basename(reportPath)}`);
  metrics.totalTests++;
  
  try {
    // Create form data with file
    const formData = new FormData();
    formData.append('file', fs.createReadStream(reportPath));
    
    // Process start time
    const startTime = Date.now();
    
    // Send request to API
    const response = await fetch(`${API_BASE_URL}/api/process-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      body: formData
    });
    
    // Process end time
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    metrics.processingTimes.push(processingTime);
    
    // Check response
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse response
    const result = await response.json();
    
    // Record metrics
    metrics.confidenceScores.push(result.confidence || 0);
    
    // Validate extraction
    const validationResult = validateExtraction(result, path.basename(reportPath));
    metrics.extractionAccuracy.push(validationResult.accuracy);
    
    // Check if test passed
    if (validationResult.accuracy >= 80 && result.confidence >= 70) {
      metrics.passedTests++;
      console.log(`✅ Passed: ${path.basename(reportPath)} (Accuracy: ${validationResult.accuracy.toFixed(2)}%, Confidence: ${result.confidence.toFixed(2)})`);
    } else {
      metrics.failedTests++;
      console.log(`❌ Failed: ${path.basename(reportPath)} (Accuracy: ${validationResult.accuracy.toFixed(2)}%, Confidence: ${result.confidence.toFixed(2)})`);
      metrics.errors.push(`Low accuracy/confidence for ${path.basename(reportPath)}`);
    }
    
    // Save result for analysis
    const resultPath = path.join(RESULTS_DIR, `${path.basename(reportPath, path.extname(reportPath))}.json`);
    fs.writeFileSync(resultPath, JSON.stringify({
      filename: path.basename(reportPath),
      processingTime,
      confidence: result.confidence,
      accuracy: validationResult.accuracy,
      extractedData: result.analysis,
      validationDetails: validationResult.details
    }, null, 2));
    
    return {
      filename: path.basename(reportPath),
      passed: validationResult.accuracy >= 80 && result.confidence >= 70,
      accuracy: validationResult.accuracy,
      confidence: result.confidence,
      processingTime
    };
  } catch (error) {
    metrics.failedTests++;
    metrics.errors.push(`Error processing ${path.basename(reportPath)}: ${error.message}`);
    console.error(`❌ Error processing ${path.basename(reportPath)}:`, error.message);
    
    return {
      filename: path.basename(reportPath),
      passed: false,
      error: error.message
    };
  }
}

/**
 * Validate extraction accuracy
 * This is a simplified validation that would be more comprehensive in a real implementation
 */
function validateExtraction(result, filename) {
  // In a real implementation, this would compare against known ground truth data
  // For this example, we'll use some heuristics
  
  const analysis = result.analysis || {};
  const details = {};
  let totalChecks = 0;
  let passedChecks = 0;
  
  // Check for personal info
  if (analysis.personalInfo) {
    totalChecks++;
    if (analysis.personalInfo.name) {
      passedChecks++;
      details.personalInfo = 'Present';
    } else {
      details.personalInfo = 'Missing name';
    }
  } else {
    totalChecks++;
    details.personalInfo = 'Missing';
  }
  
  // Check for credit scores
  if (analysis.creditScores) {
    totalChecks++;
    const hasScores = Object.values(analysis.creditScores).some(bureau => 
      bureau && typeof bureau.score === 'number' && bureau.score > 300 && bureau.score < 850
    );
    
    if (hasScores) {
      passedChecks++;
      details.creditScores = 'Present';
    } else {
      details.creditScores = 'Invalid scores';
    }
  } else {
    totalChecks++;
    details.creditScores = 'Missing';
  }
  
  // Check for accounts
  if (Array.isArray(analysis.accounts) && analysis.accounts.length > 0) {
    totalChecks++;
    const hasValidAccounts = analysis.accounts.some(account => 
      account && account.creditorName && account.accountNumber
    );
    
    if (hasValidAccounts) {
      passedChecks++;
      details.accounts = `Present (${analysis.accounts.length})`;
    } else {
      details.accounts = 'Invalid accounts';
    }
  } else {
    totalChecks++;
    details.accounts = 'Missing';
  }
  
  // Check for negative items
  if (Array.isArray(analysis.negativeItems)) {
    totalChecks++;
    details.negativeItems = `Present (${analysis.negativeItems.length})`;
    passedChecks++;
  } else {
    totalChecks++;
    details.negativeItems = 'Missing';
  }
  
  // Check for inquiries
  if (Array.isArray(analysis.inquiries)) {
    totalChecks++;
    details.inquiries = `Present (${analysis.inquiries.length})`;
    passedChecks++;
  } else {
    totalChecks++;
    details.inquiries = 'Missing';
  }
  
  // Calculate accuracy percentage
  const accuracy = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;
  
  return {
    accuracy,
    details
  };
}

/**
 * Generate summary report
 */
function generateSummaryReport(results) {
  const averageAccuracy = metrics.extractionAccuracy.length > 0
    ? metrics.extractionAccuracy.reduce((sum, acc) => sum + acc, 0) / metrics.extractionAccuracy.length
    : 0;
  
  const averageConfidence = metrics.confidenceScores.length > 0
    ? metrics.confidenceScores.reduce((sum, conf) => sum + conf, 0) / metrics.confidenceScores.length
    : 0;
  
  const averageProcessingTime = metrics.processingTimes.length > 0
    ? metrics.processingTimes.reduce((sum, time) => sum + time, 0) / metrics.processingTimes.length
    : 0;
  
  const summary = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    apiUrl: API_BASE_URL,
    totalTests: metrics.totalTests,
    passedTests: metrics.passedTests,
    failedTests: metrics.failedTests,
    passRate: metrics.totalTests > 0 ? (metrics.passedTests / metrics.totalTests) * 100 : 0,
    averageAccuracy,
    averageConfidence,
    averageProcessingTime,
    errors: metrics.errors,
    results
  };
  
  // Save summary report
  const summaryPath = path.join(RESULTS_DIR, `validation-summary-${new Date().toISOString().replace(/:/g, '-')}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  return summary;
}

/**
 * Main validation function
 */
async function validateProduction() {
  console.log('Starting production validation with real credit report samples...');
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Sample reports directory: ${SAMPLE_REPORTS_DIR}`);
  
  // Check if sample reports directory exists
  if (!fs.existsSync(SAMPLE_REPORTS_DIR)) {
    console.error(`Error: Sample reports directory not found: ${SAMPLE_REPORTS_DIR}`);
    process.exit(1);
  }
  
  // Get all PDF files in the sample reports directory
  const reportFiles = fs.readdirSync(SAMPLE_REPORTS_DIR)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => path.join(SAMPLE_REPORTS_DIR, file));
  
  if (reportFiles.length === 0) {
    console.error(`Error: No PDF files found in ${SAMPLE_REPORTS_DIR}`);
    process.exit(1);
  }
  
  console.log(`Found ${reportFiles.length} sample reports`);
  
  // Process each report
  const results = [];
  for (const reportFile of reportFiles) {
    const result = await processCreditReport(reportFile);
    results.push(result);
  }
  
  // Generate summary report
  const summary = generateSummaryReport(results);
  
  // Print summary
  console.log('\n=== Validation Summary ===');
  console.log(`Total tests: ${summary.totalTests}`);
  console.log(`Passed tests: ${summary.passedTests}`);
  console.log(`Failed tests: ${summary.failedTests}`);
  console.log(`Pass rate: ${summary.passRate.toFixed(2)}%`);
  console.log(`Average accuracy: ${summary.averageAccuracy.toFixed(2)}%`);
  console.log(`Average confidence: ${summary.averageConfidence.toFixed(2)}`);
  console.log(`Average processing time: ${summary.averageProcessingTime.toFixed(2)}ms`);
  
  if (summary.errors.length > 0) {
    console.log('\n=== Errors ===');
    summary.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  console.log(`\nDetailed results saved to: ${RESULTS_DIR}`);
  
  // Return success or failure
  return summary.passRate >= 80;
}

// Run validation
validateProduction()
  .then(success => {
    if (success) {
      console.log('\n✅ Production validation PASSED');
      process.exit(0);
    } else {
      console.log('\n❌ Production validation FAILED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Validation script error:', error);
    process.exit(1);
  });