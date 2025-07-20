#!/usr/bin/env node

/**
 * Document AI Processor Testing and Validation Script
 * Tests configured processors with sample documents and validates functionality
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PROCESSOR_CONFIG_FILE = path.join(__dirname, '../src/lib/google-cloud/processor-config.json');
const TEST_DATA_DIR = path.join(__dirname, '../test-data/sample-reports');
const TEST_RESULTS_FILE = path.join(__dirname, '../processor-test-results.json');

// Test file configurations
const TEST_FILES = {
  'structured-form': {
    path: 'sample-structured-credit-report.pdf',
    expectedProcessorType: 'FORM_PARSER_PROCESSOR',
    description: 'Structured credit report with clear form fields'
  },
  'scanned-document': {
    path: 'sample-scanned-credit-report.pdf',
    expectedProcessorType: 'OCR_PROCESSOR',
    description: 'Scanned credit report document'
  },
  'complex-layout': {
    path: 'sample-complex-credit-report.pdf',
    expectedProcessorType: 'LAYOUT_PARSER_PROCESSOR',
    description: 'Complex multi-column credit report'
  },
  'mobile-photo': {
    path: 'sample-mobile-photo.jpg',
    expectedProcessorType: 'OCR_PROCESSOR',
    description: 'Mobile phone photo of credit report'
  }
};

// Utility functions
function logStep(message) {
  console.log(`\n🔧 ${message}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message) {
  console.error(`❌ ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
}

function execCommand(command, silent = false) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return result;
  } catch (error) {
    if (!silent) {
      console.error(`Command failed: ${command}`);
      console.error(error.stderr || error.message);
    }
    return null;
  }
}

// Load processor configuration
function loadProcessorConfig() {
  try {
    if (!fs.existsSync(PROCESSOR_CONFIG_FILE)) {
      logError(`Processor configuration file not found: ${PROCESSOR_CONFIG_FILE}`);
      logInfo('Please run: node scripts/setup-document-ai-processors.js');
      return null;
    }

    const configData = fs.readFileSync(PROCESSOR_CONFIG_FILE, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    logError(`Error loading processor configuration: ${error.message}`);
    return null;
  }
}

// Create test files if they don't exist
function createTestFiles() {
  logStep('Checking test files...');
  
  // Ensure test data directory exists
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    logInfo(`Created test data directory: ${TEST_DATA_DIR}`);
  }

  const missingFiles = [];
  
  for (const [testType, config] of Object.entries(TEST_FILES)) {
    const filePath = path.join(TEST_DATA_DIR, config.path);
    if (!fs.existsSync(filePath)) {
      missingFiles.push({ testType, config, filePath });
    }
  }

  if (missingFiles.length > 0) {
    logWarning('Some test files are missing:');
    missingFiles.forEach(({ testType, config, filePath }) => {
      console.log(`  - ${testType}: ${filePath}`);
      console.log(`    Description: ${config.description}`);
    });
    
    logInfo('You can add your own test files to the test-data/sample-reports directory');
    logInfo('Or the script will skip tests for missing files');
  } else {
    logSuccess('All test files are available');
  }

  return missingFiles.length === 0;
}

// Test a single processor with a document
async function testProcessor(config, processor, testFilePath, testType) {
  logStep(`Testing ${processor.displayName} with ${testType}...`);
  
  if (!fs.existsSync(testFilePath)) {
    return {
      success: false,
      reason: 'Test file not found',
      skipped: true
    };
  }

  try {
    const startTime = Date.now();
    
    const result = execCommand(
      `gcloud documentai processors process --project=${config.projectId} --location=${config.location} --processor=${processor.id} --input-file-path="${testFilePath}" --format="json"`,
      true
    );
    
    const processingTime = Date.now() - startTime;
    
    if (!result) {
      return {
        success: false,
        reason: 'Processing command failed',
        processingTime
      };
    }

    const response = JSON.parse(result);
    const document = response.document;
    
    if (!document) {
      return {
        success: false,
        reason: 'No document in response',
        processingTime
      };
    }

    const extractedText = document.text || '';
    const pages = document.pages || [];
    const entities = document.entities || [];
    
    // Calculate confidence scores
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    pages.forEach(page => {
      if (page.blocks) {
        page.blocks.forEach(block => {
          if (block.layout && block.layout.confidence) {
            totalConfidence += block.layout.confidence;
            confidenceCount++;
          }
        });
      }
    });
    
    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
    
    // Analyze extraction quality
    const quality = analyzeExtractionQuality(extractedText, entities, pages);
    
    logSuccess(`Processing completed in ${processingTime}ms`);
    logInfo(`  - Extracted text: ${extractedText.length} characters`);
    logInfo(`  - Pages processed: ${pages.length}`);
    logInfo(`  - Entities found: ${entities.length}`);
    logInfo(`  - Average confidence: ${averageConfidence.toFixed(3)}`);
    logInfo(`  - Quality score: ${quality.score.toFixed(2)}/10`);
    
    return {
      success: true,
      processingTime,
      textLength: extractedText.length,
      pageCount: pages.length,
      entityCount: entities.length,
      averageConfidence,
      qualityScore: quality.score,
      qualityMetrics: quality.metrics,
      extractedText: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logError(`Processing failed: ${error.message}`);
    return {
      success: false,
      reason: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Analyze extraction quality
function analyzeExtractionQuality(text, entities, pages) {
  const metrics = {
    textDensity: 0,
    structureDetection: 0,
    entityRecognition: 0,
    readability: 0
  };
  
  // Text density (characters per page)
  if (pages.length > 0) {
    metrics.textDensity = Math.min(text.length / pages.length / 1000, 1); // Normalize to 0-1
  }
  
  // Structure detection (presence of common credit report terms)
  const creditTerms = [
    'credit', 'score', 'account', 'payment', 'balance', 'limit',
    'equifax', 'experian', 'transunion', 'fico', 'vantage',
    'inquiry', 'collection', 'delinquent', 'current', 'closed'
  ];
  
  const foundTerms = creditTerms.filter(term => 
    text.toLowerCase().includes(term)
  ).length;
  
  metrics.structureDetection = foundTerms / creditTerms.length;
  
  // Entity recognition
  metrics.entityRecognition = Math.min(entities.length / 10, 1); // Normalize to 0-1
  
  // Readability (ratio of alphanumeric characters)
  const alphanumeric = text.replace(/[^a-zA-Z0-9]/g, '').length;
  metrics.readability = text.length > 0 ? alphanumeric / text.length : 0;
  
  // Calculate overall score (weighted average)
  const weights = {
    textDensity: 0.3,
    structureDetection: 0.4,
    entityRecognition: 0.2,
    readability: 0.1
  };
  
  const score = Object.entries(metrics).reduce((sum, [key, value]) => {
    return sum + (value * weights[key] * 10);
  }, 0);
  
  return { score, metrics };
}

// Run comprehensive processor tests
async function runProcessorTests(config) {
  logStep('Running comprehensive processor tests...');
  
  const testResults = {
    timestamp: new Date().toISOString(),
    projectId: config.projectId,
    location: config.location,
    processors: [],
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0
    }
  };
  
  for (const processor of config.processors) {
    if (processor.state !== 'ENABLED') {
      logWarning(`Skipping disabled processor: ${processor.displayName}`);
      continue;
    }
    
    const processorResults = {
      processor: {
        id: processor.id,
        displayName: processor.displayName,
        type: processor.type
      },
      tests: []
    };
    
    // Test with each available test file
    for (const [testType, testConfig] of Object.entries(TEST_FILES)) {
      const testFilePath = path.join(TEST_DATA_DIR, testConfig.path);
      
      const testResult = await testProcessor(config, processor, testFilePath, testType);
      
      processorResults.tests.push({
        testType,
        testFile: testConfig.path,
        description: testConfig.description,
        expectedProcessorType: testConfig.expectedProcessorType,
        isOptimalProcessor: processor.type === testConfig.expectedProcessorType,
        result: testResult
      });
      
      // Update summary
      testResults.summary.totalTests++;
      if (testResult.skipped) {
        testResults.summary.skippedTests++;
      } else if (testResult.success) {
        testResults.summary.passedTests++;
      } else {
        testResults.summary.failedTests++;
      }
    }
    
    testResults.processors.push(processorResults);
  }
  
  return testResults;
}

// Validate processor performance
function validateProcessorPerformance(testResults) {
  logStep('Validating processor performance...');
  
  const validation = {
    valid: true,
    issues: [],
    recommendations: []
  };
  
  for (const processorResult of testResults.processors) {
    const processor = processorResult.processor;
    const tests = processorResult.tests;
    
    // Check if processor has any successful tests
    const successfulTests = tests.filter(t => t.result.success);
    if (successfulTests.length === 0) {
      validation.valid = false;
      validation.issues.push(`Processor ${processor.displayName} failed all tests`);
    }
    
    // Check processing times
    const processingTimes = successfulTests
      .map(t => t.result.processingTime)
      .filter(t => t !== undefined);
    
    if (processingTimes.length > 0) {
      const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      
      if (avgProcessingTime > 30000) { // 30 seconds
        validation.issues.push(`Processor ${processor.displayName} has slow processing times (avg: ${avgProcessingTime}ms)`);
      }
    }
    
    // Check confidence scores
    const confidenceScores = successfulTests
      .map(t => t.result.averageConfidence)
      .filter(c => c !== undefined);
    
    if (confidenceScores.length > 0) {
      const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
      
      if (avgConfidence < 0.7) {
        validation.issues.push(`Processor ${processor.displayName} has low confidence scores (avg: ${avgConfidence.toFixed(3)})`);
      }
    }
    
    // Check quality scores
    const qualityScores = successfulTests
      .map(t => t.result.qualityScore)
      .filter(q => q !== undefined);
    
    if (qualityScores.length > 0) {
      const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
      
      if (avgQuality < 6.0) {
        validation.issues.push(`Processor ${processor.displayName} has low quality scores (avg: ${avgQuality.toFixed(2)}/10)`);
      }
    }
    
    // Check if processor is being used optimally
    const optimalTests = tests.filter(t => t.isOptimalProcessor && t.result.success);
    const suboptimalTests = tests.filter(t => !t.isOptimalProcessor && t.result.success);
    
    if (optimalTests.length > 0 && suboptimalTests.length > 0) {
      // Compare performance between optimal and suboptimal usage
      const optimalAvgQuality = optimalTests.reduce((sum, t) => sum + (t.result.qualityScore || 0), 0) / optimalTests.length;
      const suboptimalAvgQuality = suboptimalTests.reduce((sum, t) => sum + (t.result.qualityScore || 0), 0) / suboptimalTests.length;
      
      if (optimalAvgQuality > suboptimalAvgQuality + 1.0) {
        validation.recommendations.push(`Processor ${processor.displayName} performs better on its intended document types`);
      }
    }
  }
  
  return validation;
}

// Generate test report
function generateTestReport(testResults, validation) {
  logStep('Generating test report...');
  
  console.log('\n📊 Test Results Summary:');
  console.log(`  - Total tests: ${testResults.summary.totalTests}`);
  console.log(`  - Passed: ${testResults.summary.passedTests}`);
  console.log(`  - Failed: ${testResults.summary.failedTests}`);
  console.log(`  - Skipped: ${testResults.summary.skippedTests}`);
  
  const successRate = testResults.summary.totalTests > 0 
    ? (testResults.summary.passedTests / testResults.summary.totalTests * 100).toFixed(1)
    : '0';
  
  console.log(`  - Success rate: ${successRate}%`);
  
  // Processor-specific results
  console.log('\n📋 Processor Performance:');
  for (const processorResult of testResults.processors) {
    const processor = processorResult.processor;
    const tests = processorResult.tests;
    const successfulTests = tests.filter(t => t.result.success);
    
    console.log(`\n  ${processor.displayName} (${processor.id}):`);
    console.log(`    - Tests passed: ${successfulTests.length}/${tests.length}`);
    
    if (successfulTests.length > 0) {
      const avgProcessingTime = successfulTests
        .map(t => t.result.processingTime)
        .filter(t => t !== undefined)
        .reduce((a, b, _, arr) => a + b / arr.length, 0);
      
      const avgConfidence = successfulTests
        .map(t => t.result.averageConfidence)
        .filter(c => c !== undefined)
        .reduce((a, b, _, arr) => a + b / arr.length, 0);
      
      const avgQuality = successfulTests
        .map(t => t.result.qualityScore)
        .filter(q => q !== undefined)
        .reduce((a, b, _, arr) => a + b / arr.length, 0);
      
      console.log(`    - Avg processing time: ${avgProcessingTime.toFixed(0)}ms`);
      console.log(`    - Avg confidence: ${avgConfidence.toFixed(3)}`);
      console.log(`    - Avg quality score: ${avgQuality.toFixed(2)}/10`);
    }
  }
  
  // Validation results
  if (validation.issues.length > 0) {
    console.log('\n⚠️  Issues Found:');
    validation.issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  if (validation.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    validation.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
  
  if (validation.valid) {
    logSuccess('All processors are performing within acceptable parameters');
  } else {
    logWarning('Some processors have performance issues that should be addressed');
  }
}

// Save test results
function saveTestResults(testResults, validation) {
  try {
    const report = {
      ...testResults,
      validation
    };
    
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(report, null, 2));
    logSuccess(`Test results saved to ${TEST_RESULTS_FILE}`);
  } catch (error) {
    logError(`Failed to save test results: ${error.message}`);
  }
}

// Main function
async function main() {
  console.log('🧪 Document AI Processor Testing');
  console.log('=================================');
  
  // Load processor configuration
  const config = loadProcessorConfig();
  if (!config) {
    process.exit(1);
  }
  
  logInfo(`Loaded configuration for ${config.processors.length} processors`);
  
  // Check test files
  createTestFiles();
  
  // Run tests
  const testResults = await runProcessorTests(config);
  
  // Validate performance
  const validation = validateProcessorPerformance(testResults);
  
  // Generate report
  generateTestReport(testResults, validation);
  
  // Save results
  saveTestResults(testResults, validation);
  
  console.log('\n🎉 Processor testing completed!');
  
  if (!validation.valid) {
    console.log('\n⚠️  Some issues were found. Please review the results and consider:');
    console.log('1. Checking processor configuration');
    console.log('2. Testing with different document types');
    console.log('3. Adjusting processor selection logic');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = {
  loadProcessorConfig,
  testProcessor,
  runProcessorTests,
  validateProcessorPerformance
};