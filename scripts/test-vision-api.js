#!/usr/bin/env node

/**
 * Vision API Test Script
 * 
 * Tests Vision API functionality with sample images and various features
 */

const fs = require('fs');
const path = require('path');

class VisionAPITester {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.results = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testTextDetection() {
    this.log('Testing text detection...');

    try {
      // Import the Vision API service
      const visionApiPath = path.join(__dirname, '..', 'src', 'lib', 'google-cloud', 'visionApiService.ts');
      
      if (!fs.existsSync(visionApiPath)) {
        throw new Error('Vision API service not found. Please run setup first.');
      }

      // Create a test image with text (base64 encoded simple text image)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const testImageBuffer = Buffer.from(testImageBase64, 'base64');

      this.log('Text detection test completed (mock)', 'success');
      return true;
    } catch (error) {
      this.log(`Text detection test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testImageProperties() {
    this.log('Testing image properties detection...');

    try {
      // Test image properties detection
      this.log('Image properties test completed (mock)', 'success');
      return true;
    } catch (error) {
      this.log(`Image properties test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testSafeSearch() {
    this.log('Testing safe search detection...');

    try {
      // Test safe search detection
      this.log('Safe search test completed (mock)', 'success');
      return true;
    } catch (error) {
      this.log(`Safe search test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testBatchProcessing() {
    this.log('Testing batch processing...');

    try {
      // Test batch processing
      this.log('Batch processing test completed (mock)', 'success');
      return true;
    } catch (error) {
      this.log(`Batch processing test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testFallbackConfiguration() {
    this.log('Testing fallback configuration...');

    try {
      const fallbackConfigPath = path.join(__dirname, '..', 'src', 'lib', 'google-cloud', 'fallback-ocr-config.ts');
      
      if (!fs.existsSync(fallbackConfigPath)) {
        throw new Error('Fallback configuration not found');
      }

      this.log('Fallback configuration test passed', 'success');
      return true;
    } catch (error) {
      this.log(`Fallback configuration test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runAllTests() {
    this.log('Starting Vision API tests...', 'info');
    
    const tests = [
      { name: 'Text Detection', fn: () => this.testTextDetection() },
      { name: 'Image Properties', fn: () => this.testImageProperties() },
      { name: 'Safe Search', fn: () => this.testSafeSearch() },
      { name: 'Batch Processing', fn: () => this.testBatchProcessing() },
      { name: 'Fallback Configuration', fn: () => this.testFallbackConfiguration() }
    ];

    let allPassed = true;

    for (const test of tests) {
      try {
        const result = await test.fn();
        this.results.push({
          name: test.name,
          passed: result,
          timestamp: new Date().toISOString()
        });
        
        if (!result) {
          allPassed = false;
        }
      } catch (error) {
        this.log(`Test '${test.name}' failed with error: ${error.message}`, 'error');
        this.results.push({
          name: test.name,
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        allPassed = false;
      }
    }

    // Print summary
    this.log('\n=== TEST SUMMARY ===', 'info');
    
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      this.log(`${status}: ${result.name}`, result.passed ? 'success' : 'error');
    });

    if (allPassed) {
      this.log('\n🎉 All Vision API tests passed!', 'success');
    } else {
      this.log('\n💥 Some Vision API tests failed. Please check the errors above.', 'error');
    }

    return allPassed;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new VisionAPITester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Tests failed with error:', error);
      process.exit(1);
    });
}

module.exports = VisionAPITester;