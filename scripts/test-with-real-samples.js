#!/usr/bin/env node

/**
 * Real Credit Report Sample Testing Script
 * Tests the PDF processing system with real credit report samples
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const fetch = require('node-fetch');
const FormData = require('form-data');
const readline = require('readline');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const SAMPLE_REPORTS_DIR = path.join(__dirname, '../test-data/sample-reports');
const RESULTS_DIR = path.join(__dirname, '../test-results/real-samples');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Ensure directories exist
function ensureDirectoriesExist() {
  if (!fs.existsSync(SAMPLE_REPORTS_DIR)) {
    fs.mkdirSync(SAMPLE_REPORTS_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  // Create subdirectories for different report types
  const reportTypes = ['experian', 'equifax', 'transunion', 'credit-karma', 'annual-credit-report'];
  
  for (const type of reportTypes) {
    const typeDir = path.join(SAMPLE_REPORTS_DIR, type);
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
  }
}

// Get all PDF files in the sample reports directory
function getSampleReports() {
  ensureDirectoriesExist();
  
  const allReports = [];
  
  // Get reports from main directory
  const mainDirReports = fs.readdirSync(SAMPLE_REPORTS_DIR)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => ({
      path: path.join(SAMPLE_REPORTS_DIR, file),
      name: file,
      type: 'unknown'
    }));
  
  allReports.push(...mainDirReports);
  
  // Get reports from type-specific directories
  const reportTypes = ['experian', 'equifax', 'transunion', 'credit-karma', 'annual-credit-report'];
  
  for (const type of reportTypes) {
    const typeDir = path.join(SAMPLE_REPORTS_DIR, type);
    
    if (fs.existsSync(typeDir)) {
      const typeReports = fs.readdirSync(typeDir)
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .map(file => ({
          path: path.join(typeDir, file),
          name: file,
          type
        }));
      
      allReports.push(...typeReports);
    }
  }
  
  return allReports;
}

// Process a single credit report
async function processCreditReport(report) {
  console.log(`\nProcessing report: ${report.name} (${report.type})`);
  
  try {
    // Create form data with file
    const formData = new FormData();
    formData.append('file', fs.createReadStream(report.path));
    
    // Process start time
    const startTime = Date.now();
    
    // Send request to API
    const response = await fetch(`${API_BASE_URL}/api/process-pdf`, {
      method: 'POST',
      body: formData
    });
    
    // Process end time
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Check response
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse response
    const result = await response.json();
    
    // Save result for analysis
    const resultPath = path.join(RESULTS_DIR, `${path.basename(report.path, '.pdf')}-result.json`);
    fs.writeFileSync(resultPath, JSON.stringify({
      reportName: report.name,
      reportType: report.type,
      processingTime,
      result
    }, null, 2));
    
    // Display summary
    console.log(`✅ Processing completed in ${processingTime}ms`);
    console.log(`  - Confidence: ${result.confidence ? result.confidence.toFixed(1) + '%' : 'N/A'}`);
    console.log(`  - Processing method: ${result.extractionMetadata?.processingMethod || 'N/A'}`);
    
    // Display extracted data summary
    console.log('  - Extracted data:');
    console.log(`    • Personal info: ${result.personalInfo ? 'Present' : 'Missing'}`);
    console.log(`    • Credit scores: ${result.creditScores ? Object.keys(result.creditScores).length : 0} bureau(s)`);
    console.log(`    • Accounts: ${Array.isArray(result.accounts) ? result.accounts.length : 0}`);
    console.log(`    • Negative items: ${Array.isArray(result.negativeItems) ? result.negativeItems.length : 0}`);
    console.log(`    • Inquiries: ${Array.isArray(result.inquiries) ? result.inquiries.length : 0}`);
    
    return {
      name: report.name,
      type: report.type,
      processingTime,
      confidence: result.confidence,
      success: true
    };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    
    return {
      name: report.name,
      type: report.type,
      error: error.message,
      success: false
    };
  }
}

// Generate summary report
function generateSummaryReport(results) {
  const summary = {
    timestamp: new Date().toISOString(),
    totalReports: results.length,
    successfulReports: results.filter(r => r.success).length,
    failedReports: results.filter(r => !r.success).length,
    averageProcessingTime: 0,
    averageConfidence: 0,
    byReportType: {}
  };
  
  // Calculate averages
  const successfulResults = results.filter(r => r.success);
  
  if (successfulResults.length > 0) {
    summary.averageProcessingTime = successfulResults.reduce((sum, r) => sum + r.processingTime, 0) / successfulResults.length;
    
    const resultsWithConfidence = successfulResults.filter(r => r.confidence !== undefined);
    if (resultsWithConfidence.length > 0) {
      summary.averageConfidence = resultsWithConfidence.reduce((sum, r) => sum + r.confidence, 0) / resultsWithConfidence.length;
    }
  }
  
  // Group by report type
  const reportTypes = [...new Set(results.map(r => r.type))];
  
  for (const type of reportTypes) {
    const typeResults = results.filter(r => r.type === type);
    const successfulTypeResults = typeResults.filter(r => r.success);
    
    summary.byReportType[type] = {
      total: typeResults.length,
      successful: successfulTypeResults.length,
      successRate: (successfulTypeResults.length / typeResults.length) * 100,
      averageProcessingTime: 0,
      averageConfidence: 0
    };
    
    if (successfulTypeResults.length > 0) {
      summary.byReportType[type].averageProcessingTime = successfulTypeResults.reduce((sum, r) => sum + r.processingTime, 0) / successfulTypeResults.length;
      
      const typeResultsWithConfidence = successfulTypeResults.filter(r => r.confidence !== undefined);
      if (typeResultsWithConfidence.length > 0) {
        summary.byReportType[type].averageConfidence = typeResultsWithConfidence.reduce((sum, r) => sum + r.confidence, 0) / typeResultsWithConfidence.length;
      }
    }
  }
  
  // Save summary report
  const summaryPath = path.join(RESULTS_DIR, `summary-${new Date().toISOString().replace(/:/g, '-')}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  return summary;
}

// Display summary report
function displaySummaryReport(summary) {
  console.log('\n📊 Test Summary');
  console.log('=============');
  console.log(`Total reports: ${summary.totalReports}`);
  console.log(`Successful: ${summary.successfulReports} (${((summary.successfulReports / summary.totalReports) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${summary.failedReports}`);
  console.log(`Average processing time: ${summary.averageProcessingTime.toFixed(0)}ms`);
  console.log(`Average confidence: ${summary.averageConfidence.toFixed(1)}%`);
  
  console.log('\nResults by Report Type:');
  for (const [type, data] of Object.entries(summary.byReportType)) {
    console.log(`  - ${type}: ${data.successful}/${data.total} (${data.successRate.toFixed(1)}%)`);
  }
  
  console.log(`\nDetailed results saved to: ${RESULTS_DIR}`);
}

// Main function
async function main() {
  console.log('🚀 Real Credit Report Sample Testing');
  console.log('===================================');
  console.log(`API URL: ${API_BASE_URL}`);
  
  // Ensure directories exist
  ensureDirectoriesExist();
  
  // Get sample reports
  const reports = getSampleReports();
  
  if (reports.length === 0) {
    console.log('\n❌ No sample reports found');
    console.log(`Please add PDF files to ${SAMPLE_REPORTS_DIR}`);
    rl.close();
    return;
  }
  
  console.log(`\nFound ${reports.length} sample reports:`);
  
  // Group by type
  const reportsByType = {};
  for (const report of reports) {
    if (!reportsByType[report.type]) {
      reportsByType[report.type] = [];
    }
    reportsByType[report.type].push(report);
  }
  
  for (const [type, typeReports] of Object.entries(reportsByType)) {
    console.log(`  - ${type}: ${typeReports.length} report(s)`);
  }
  
  // Ask for confirmation
  const proceed = await prompt('\nProceed with testing? (y/n): ');
  
  if (proceed.toLowerCase() !== 'y') {
    console.log('Testing cancelled');
    rl.close();
    return;
  }
  
  // Process each report
  const results = [];
  
  for (let i = 0; i < reports.length; i++) {
    console.log(`\nProcessing report ${i + 1}/${reports.length}`);
    const result = await processCreditReport(reports[i]);
    results.push(result);
  }
  
  // Generate and display summary report
  const summary = generateSummaryReport(results);
  displaySummaryReport(summary);
  
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});