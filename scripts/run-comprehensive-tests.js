#!/usr/bin/env node

/**
 * Comprehensive Test Runner for PDF Analysis System
 * Runs all test suites with proper reporting and validation
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// ANSI color codes for console output
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

// Test suite configurations
const testSuites = [
  {
    name: 'Unit Tests - PDF Text Extraction',
    command: 'npm run test -- --testPathPattern="src/lib/google-cloud/__tests__/pdfProcessor.test.ts" --verbose',
    description: 'Tests PDF text extraction accuracy and processing methods',
    timeout: 30000
  },
  {
    name: 'Unit Tests - Credit Data Validation',
    command: 'npm run test -- --testPathPattern="src/lib/ai/__tests__/creditDataValidation.test.ts" --verbose',
    description: 'Tests credit data parsing accuracy and validation',
    timeout: 30000
  },
  {
    name: 'Integration Tests - End-to-End Pipeline',
    command: 'npm run test -- --testPathPattern="src/__tests__/integration/pdf-processing-pipeline.test.ts" --verbose',
    description: 'Tests complete PDF processing pipeline from upload to analysis',
    timeout: 60000
  },
  {
    name: 'Integration Tests - Service Failure Handling',
    command: 'npm run test -- --testPathPattern="src/__tests__/integration/service-failure-handling.test.ts" --verbose',
    description: 'Tests system resilience and error handling',
    timeout: 60000
  },
  {
    name: 'Performance Tests - Large PDF Processing',
    command: 'npm run test -- --testPathPattern="src/__tests__/performance/pdf-processing-performance.test.ts" --verbose',
    description: 'Tests performance with various PDF sizes and concurrent processing',
    timeout: 120000
  },
  {
    name: 'Security Tests - PII Protection',
    command: 'npm run test -- --testPathPattern="src/__tests__/security/pii-protection.test.ts" --verbose',
    description: 'Tests PII detection, masking, and data protection',
    timeout: 30000
  }
]

// Test execution results
const results = {
  passed: [],
  failed: [],
  skipped: [],
  totalTime: 0
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logHeader(message) {
  const border = '='.repeat(message.length + 4)
  log(border, 'cyan')
  log(`  ${message}  `, 'cyan')
  log(border, 'cyan')
}

function logSubHeader(message) {
  log(`\n${'-'.repeat(50)}`, 'blue')
  log(message, 'blue')
  log('-'.repeat(50), 'blue')
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 60000).toFixed(2)}m`
}

async function runTestSuite(suite) {
  logSubHeader(`Running: ${suite.name}`)
  log(`Description: ${suite.description}`, 'yellow')
  log(`Command: ${suite.command}`, 'magenta')
  
  const startTime = Date.now()
  
  try {
    // Set environment variables for testing
    process.env.NODE_ENV = 'test'
    process.env.JEST_TIMEOUT = suite.timeout.toString()
    
    const output = execSync(suite.command, {
      encoding: 'utf8',
      timeout: suite.timeout,
      stdio: 'pipe'
    })
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    log(`✅ PASSED in ${formatTime(duration)}`, 'green')
    
    results.passed.push({
      name: suite.name,
      duration,
      output: output.substring(0, 500) // Truncate long output
    })
    
    return true
    
  } catch (error) {
    const endTime = Date.now()
    const duration = endTime - startTime
    
    log(`❌ FAILED in ${formatTime(duration)}`, 'red')
    
    if (error.code === 'TIMEOUT') {
      log(`Test suite timed out after ${formatTime(suite.timeout)}`, 'red')
    } else {
      log(`Exit code: ${error.status}`, 'red')
      if (error.stdout) {
        log('STDOUT:', 'yellow')
        log(error.stdout.substring(0, 1000), 'reset') // Show first 1000 chars
      }
      if (error.stderr) {
        log('STDERR:', 'red')
        log(error.stderr.substring(0, 1000), 'reset') // Show first 1000 chars
      }
    }
    
    results.failed.push({
      name: suite.name,
      duration,
      error: error.message,
      exitCode: error.status
    })
    
    return false
  }
}

async function checkPrerequisites() {
  logSubHeader('Checking Prerequisites')
  
  const checks = [
    {
      name: 'Node.js version',
      check: () => {
        const version = process.version
        const major = parseInt(version.substring(1).split('.')[0])
        return major >= 18
      },
      message: 'Node.js 18+ required'
    },
    {
      name: 'Package.json exists',
      check: () => fs.existsSync('package.json'),
      message: 'package.json not found'
    },
    {
      name: 'Node modules installed',
      check: () => fs.existsSync('node_modules'),
      message: 'Run npm install first'
    },
    {
      name: 'Jest configuration',
      check: () => fs.existsSync('jest.config.js'),
      message: 'Jest configuration not found'
    },
    {
      name: 'Test files exist',
      check: () => {
        const testFiles = [
          'src/lib/google-cloud/__tests__/pdfProcessor.test.ts',
          'src/lib/ai/__tests__/creditDataValidation.test.ts',
          'src/__tests__/integration/pdf-processing-pipeline.test.ts',
          'src/__tests__/integration/service-failure-handling.test.ts',
          'src/__tests__/performance/pdf-processing-performance.test.ts',
          'src/__tests__/security/pii-protection.test.ts'
        ]
        return testFiles.every(file => fs.existsSync(file))
      },
      message: 'Some test files are missing'
    }
  ]
  
  let allPassed = true
  
  for (const check of checks) {
    try {
      if (check.check()) {
        log(`✅ ${check.name}`, 'green')
      } else {
        log(`❌ ${check.name}: ${check.message}`, 'red')
        allPassed = false
      }
    } catch (error) {
      log(`❌ ${check.name}: ${error.message}`, 'red')
      allPassed = false
    }
  }
  
  return allPassed
}

function generateReport() {
  logSubHeader('Test Execution Summary')
  
  const totalTests = results.passed.length + results.failed.length + results.skipped.length
  const passRate = totalTests > 0 ? (results.passed.length / totalTests * 100).toFixed(1) : 0
  
  log(`Total Test Suites: ${totalTests}`)
  log(`Passed: ${results.passed.length}`, 'green')
  log(`Failed: ${results.failed.length}`, results.failed.length > 0 ? 'red' : 'reset')
  log(`Skipped: ${results.skipped.length}`, results.skipped.length > 0 ? 'yellow' : 'reset')
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'red')
  log(`Total Time: ${formatTime(results.totalTime)}`)
  
  if (results.failed.length > 0) {
    logSubHeader('Failed Test Suites')
    results.failed.forEach(failure => {
      log(`❌ ${failure.name}`, 'red')
      log(`   Duration: ${formatTime(failure.duration)}`)
      log(`   Exit Code: ${failure.exitCode}`)
      if (failure.error) {
        log(`   Error: ${failure.error.substring(0, 200)}...`)
      }
    })
  }
  
  if (results.passed.length > 0) {
    logSubHeader('Passed Test Suites')
    results.passed.forEach(success => {
      log(`✅ ${success.name} (${formatTime(success.duration)})`, 'green')
    })
  }
  
  // Generate detailed report file
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: results.passed.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      passRate: parseFloat(passRate),
      totalTime: results.totalTime
    },
    results: {
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped
    }
  }
  
  const reportPath = path.join(process.cwd(), 'test-results.json')
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
  log(`\nDetailed report saved to: ${reportPath}`, 'cyan')
  
  return passRate >= 80
}

async function main() {
  const startTime = Date.now()
  
  logHeader('PDF Analysis System - Comprehensive Test Suite')
  
  // Check prerequisites
  if (!(await checkPrerequisites())) {
    log('\n❌ Prerequisites check failed. Please fix the issues above.', 'red')
    process.exit(1)
  }
  
  log('\n🚀 Starting comprehensive test execution...', 'cyan')
  
  // Run each test suite
  for (const suite of testSuites) {
    await runTestSuite(suite)
    log('') // Add spacing between test suites
  }
  
  const endTime = Date.now()
  results.totalTime = endTime - startTime
  
  // Generate and display report
  const success = generateReport()
  
  if (success) {
    log('\n🎉 All test suites completed successfully!', 'green')
    process.exit(0)
  } else {
    log('\n💥 Some test suites failed. Check the report above.', 'red')
    process.exit(1)
  }
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n\n⚠️  Test execution interrupted by user', 'yellow')
  process.exit(130)
})

process.on('SIGTERM', () => {
  log('\n\n⚠️  Test execution terminated', 'yellow')
  process.exit(143)
})

// Run the main function
if (require.main === module) {
  main().catch(error => {
    log(`\n💥 Unexpected error: ${error.message}`, 'red')
    console.error(error.stack)
    process.exit(1)
  })
}

module.exports = { runTestSuite, checkPrerequisites, generateReport }