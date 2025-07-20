#!/usr/bin/env node

/**
 * Credit Analysis Test Suite Runner
 * 
 * This script runs comprehensive tests on the credit report processing pipeline
 * to identify where analysis is failing and why inaccurate results are being returned.
 * 
 * Usage:
 *   node test-credit-analysis.js [options]
 *   
 * Options:
 *   --url <url>     Base URL of the application (default: http://localhost:3000)
 *   --verbose       Show detailed output
 *   --json          Output results as JSON
 *   --help          Show this help message
 */

const https = require('https');
const http = require('http');

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  baseUrl: 'http://localhost:3000',
  verbose: false,
  json: false,
  help: false
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--url':
      config.baseUrl = args[++i];
      break;
    case '--verbose':
      config.verbose = true;
      break;
    case '--json':
      config.json = true;
      break;
    case '--help':
      config.help = true;
      break;
  }
}

if (config.help) {
  console.log(`
Credit Analysis Test Suite Runner

This script runs comprehensive tests on the credit report processing pipeline
to identify where analysis is failing and why inaccurate results are being returned.

Usage:
  node test-credit-analysis.js [options]
  
Options:
  --url <url>     Base URL of the application (default: http://localhost:3000)
  --verbose       Show detailed output
  --json          Output results as JSON
  --help          Show this help message

Test Coverage:
  ✓ Environment configuration check
  ✓ Sample credit report generation
  ✓ Basic text processing validation
  ✓ Original CreditAnalyzer testing
  ✓ Multi-provider analyzer testing
  ✓ API endpoint validation
  ✓ OCR error simulation
  ✓ Edge case handling
  ✓ Performance benchmarking
  ✓ Detailed diagnostic reporting

Example:
  node test-credit-analysis.js --url http://localhost:3000 --verbose
  node test-credit-analysis.js --json > test-results.json
`);
  process.exit(0);
}

function makeRequest(url, options = {}) {
  const client = url.startsWith('https:') ? https : http;
  
  return new Promise((resolve, reject) => {
    const req = client.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 60000 // 60 second timeout
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function getStatusIcon(status) {
  switch (status) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'running': return '🔄';
    case 'skipped': return '⏭️';
    default: return '❓';
  }
}

function getOverallStatusIcon(status) {
  switch (status) {
    case 'success': return '🎉';
    case 'partial': return '⚠️';
    case 'failed': return '💥';
    default: return '❓';
  }
}

async function runTests() {
  const testUrl = `${config.baseUrl}/api/test-credit-analysis`;
  
  if (!config.json) {
    console.log('🧪 Credit Analysis Test Suite');
    console.log('==============================');
    console.log(`📍 Testing endpoint: ${testUrl}`);
    console.log('🚀 Starting comprehensive analysis tests...\n');
  }
  
  try {
    const startTime = Date.now();
    const response = await makeRequest(testUrl);
    const totalDuration = Date.now() - startTime;
    
    if (response.parseError) {
      console.error('❌ Failed to parse response:', response.parseError);
      console.error('Raw response:', response.data);
      process.exit(1);
    }
    
    if (response.status !== 200) {
      console.error(`❌ Test endpoint returned ${response.status}`);
      if (config.verbose) {
        console.error('Response:', JSON.stringify(response.data, null, 2));
      }
      process.exit(1);
    }
    
    const report = response.data;
    
    if (config.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    
    // Display results
    console.log(`${getOverallStatusIcon(report.summary.overallStatus)} Test Results Summary`);
    console.log('======================');
    console.log(`📊 Status: ${report.summary.overallStatus.toUpperCase()}`);
    console.log(`✅ Successful: ${report.summary.successful}/${report.summary.totalSteps}`);
    console.log(`❌ Failed: ${report.summary.failed}/${report.summary.totalSteps}`);
    console.log(`⏭️ Skipped: ${report.summary.skipped}/${report.summary.totalSteps}`);
    console.log(`⏱️ Total Duration: ${formatDuration(totalDuration)}`);
    console.log(`🆔 Test ID: ${report.testId}\n`);
    
    console.log('🔧 Environment Status');
    console.log('====================');
    console.log(`🔑 Google AI API Key: ${report.environment.googleAiApiKey ? '✅ Configured' : '❌ Missing'}`);
    console.log(`🖥️ Server Environment: ${report.environment.server ? '✅ Server-side' : '❌ Client-side'}`);
    console.log(`🤖 Gemini Model: ${report.environment.geminiModel ? '✅ Initialized' : '❌ Failed'}\n`);
    
    console.log('📋 Test Steps');
    console.log('=============');
    
    for (const step of report.steps) {
      const icon = getStatusIcon(step.status);
      const duration = step.duration ? ` (${formatDuration(step.duration)})` : '';
      const confidence = step.confidence !== undefined ? ` [${step.confidence}% confidence]` : '';
      
      console.log(`${icon} ${step.step}: ${step.message}${duration}${confidence}`);
      
      if (config.verbose && step.errors && step.errors.length > 0) {
        step.errors.forEach(error => {
          console.log(`   ⚠️ Error: ${error}`);
        });
      }
      
      if (config.verbose && step.data && typeof step.data === 'object') {
        const dataStr = JSON.stringify(step.data, null, 2);
        if (dataStr.length < 500) {
          console.log(`   📊 Data: ${dataStr.replace(/\n/g, '\n   ')}`);
        }
      }
    }
    
    console.log('\n💡 Recommendations');
    console.log('==================');
    
    for (const recommendation of report.summary.recommendations) {
      console.log(`${recommendation}`);
    }
    
    if (config.verbose) {
      console.log('\n📄 Sample Credit Report');
      console.log('=======================');
      console.log(report.sampleCreditReport.substring(0, 500) + '...');
    }
    
    console.log('\n🎯 Next Steps');
    console.log('=============');
    
    if (report.summary.overallStatus === 'success') {
      console.log('🎉 All tests passed! Your credit analysis system is working correctly.');
      console.log('💡 Consider running performance optimizations if any steps took longer than expected.');
    } else if (report.summary.overallStatus === 'partial') {
      console.log('⚠️ Some tests failed. Review the failed steps and recommendations above.');
      console.log('🔧 Focus on the highest priority issues first (environment, API keys, core analyzers).');
    } else {
      console.log('💥 Major issues detected. Your system requires immediate attention.');
      console.log('🚨 Start by fixing environment configuration and API key issues.');
      console.log('📞 Consider contacting support if problems persist.');
    }
    
    console.log('\n📚 Documentation');
    console.log('=================');
    console.log('📖 For detailed troubleshooting, see the project documentation');
    console.log('🔍 Check logs for more detailed error information');
    console.log('🧪 Re-run tests after making changes to verify fixes');
    
    // Exit with appropriate code
    process.exit(report.summary.overallStatus === 'failed' ? 1 : 0);
    
  } catch (error) {
    if (!config.json) {
      console.error('💥 Test suite failed to run:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.error('🔌 Connection refused. Make sure your server is running on', config.baseUrl);
        console.error('💡 Try: npm run dev');
      } else if (error.message.includes('timeout')) {
        console.error('⏰ Request timed out. The server might be overloaded or unresponsive.');
        console.error('💡 Try increasing the timeout or checking server logs.');
      }
    } else {
      console.log(JSON.stringify({
        error: true,
        message: error.message,
        code: error.code
      }, null, 2));
    }
    
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  if (!config.json) {
    console.log('\n\n🛑 Test interrupted by user');
  }
  process.exit(130);
});

process.on('SIGTERM', () => {
  if (!config.json) {
    console.log('\n\n🛑 Test terminated');
  }
  process.exit(143);
});

// Run the tests
runTests().catch(error => {
  if (!config.json) {
    console.error('💥 Unexpected error:', error);
  }
  process.exit(1);
});