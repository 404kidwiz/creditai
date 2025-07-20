#!/usr/bin/env node

/**
 * Test script for Google Cloud setup scripts
 * 
 * This script tests the functionality of the Google Cloud setup scripts
 * without actually creating resources.
 */

const fs = require('fs');
const path = require('path');

class SetupScriptTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * Run all tests
   */
  async runTests() {
    console.log('🧪 Testing Google Cloud Setup Scripts...\n');
    
    try {
      await this.testScriptExistence();
      await this.testScriptPermissions();
      await this.testScriptSyntax();
      await this.testConfigurationGeneration();
      
      this.generateTestReport();
      
      const passedTests = this.testResults.filter(t => t.passed).length;
      const totalTests = this.testResults.length;
      
      console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
      
      if (passedTests === totalTests) {
        console.log('✅ All tests passed! Setup scripts are ready to use.');
        return true;
      } else {
        console.log('❌ Some tests failed. Please review the issues above.');
        return false;
      }
      
    } catch (error) {
      console.error('Test execution failed:', error.message);
      return false;
    }
  }

  /**
   * Test that all required scripts exist
   */
  async testScriptExistence() {
    console.log('📁 Testing script existence...');
    
    const requiredScripts = [
      'scripts/setup-google-cloud-project.js',
      'scripts/validate-google-cloud-project.js',
      'scripts/setup-google-cloud-complete.js',
      'scripts/diagnose-google-cloud-setup.js'
    ];
    
    for (const script of requiredScripts) {
      const scriptPath = path.join(process.cwd(), script);
      const exists = fs.existsSync(scriptPath);
      
      this.testResults.push({
        test: `Script exists: ${script}`,
        passed: exists,
        message: exists ? 'Script found' : 'Script missing'
      });
      
      if (exists) {
        console.log(`✓ ${script}`);
      } else {
        console.log(`❌ ${script} - missing`);
      }
    }
  }

  /**
   * Test script permissions
   */
  async testScriptPermissions() {
    console.log('\n🔐 Testing script permissions...');
    
    const scripts = [
      'scripts/setup-google-cloud-project.js',
      'scripts/validate-google-cloud-project.js',
      'scripts/setup-google-cloud-complete.js',
      'scripts/diagnose-google-cloud-setup.js'
    ];
    
    for (const script of scripts) {
      const scriptPath = path.join(process.cwd(), script);
      
      if (fs.existsSync(scriptPath)) {
        try {
          const stats = fs.statSync(scriptPath);
          const isExecutable = !!(stats.mode & parseInt('111', 8));
          
          this.testResults.push({
            test: `Script executable: ${script}`,
            passed: isExecutable,
            message: isExecutable ? 'Executable permissions set' : 'Missing executable permissions'
          });
          
          if (isExecutable) {
            console.log(`✓ ${script} - executable`);
          } else {
            console.log(`⚠️  ${script} - not executable (run: chmod +x ${script})`);
          }
        } catch (error) {
          this.testResults.push({
            test: `Script permissions: ${script}`,
            passed: false,
            message: `Cannot check permissions: ${error.message}`
          });
        }
      }
    }
  }

  /**
   * Test script syntax
   */
  async testScriptSyntax() {
    console.log('\n🔍 Testing script syntax...');
    
    const scripts = [
      'scripts/setup-google-cloud-project.js',
      'scripts/validate-google-cloud-project.js',
      'scripts/setup-google-cloud-complete.js',
      'scripts/diagnose-google-cloud-setup.js'
    ];
    
    for (const script of scripts) {
      const scriptPath = path.join(process.cwd(), script);
      
      if (fs.existsSync(scriptPath)) {
        try {
          // Try to require the script to check syntax
          delete require.cache[require.resolve(path.resolve(scriptPath))];
          require(path.resolve(scriptPath));
          
          this.testResults.push({
            test: `Script syntax: ${script}`,
            passed: true,
            message: 'Valid JavaScript syntax'
          });
          
          console.log(`✓ ${script} - valid syntax`);
        } catch (error) {
          this.testResults.push({
            test: `Script syntax: ${script}`,
            passed: false,
            message: `Syntax error: ${error.message}`
          });
          
          console.log(`❌ ${script} - syntax error: ${error.message}`);
        }
      }
    }
  }

  /**
   * Test configuration file templates
   */
  async testConfigurationGeneration() {
    console.log('\n📄 Testing configuration templates...');
    
    // Test that the setup documentation exists
    const docFiles = [
      'GOOGLE_CLOUD_PROJECT_SETUP.md'
    ];
    
    for (const docFile of docFiles) {
      const docPath = path.join(process.cwd(), docFile);
      const exists = fs.existsSync(docPath);
      
      this.testResults.push({
        test: `Documentation exists: ${docFile}`,
        passed: exists,
        message: exists ? 'Documentation found' : 'Documentation missing'
      });
      
      if (exists) {
        console.log(`✓ ${docFile}`);
        
        // Check if documentation has required sections
        const content = fs.readFileSync(docPath, 'utf8');
        const requiredSections = [
          '## Prerequisites',
          '## Quick Start',
          '## Script Details',
          '## Common Issues'
        ];
        
        for (const section of requiredSections) {
          const hasSection = content.includes(section);
          this.testResults.push({
            test: `Documentation section: ${section}`,
            passed: hasSection,
            message: hasSection ? 'Section found' : 'Section missing'
          });
          
          if (hasSection) {
            console.log(`  ✓ ${section}`);
          } else {
            console.log(`  ❌ ${section} - missing`);
          }
        }
      } else {
        console.log(`❌ ${docFile} - missing`);
      }
    }
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    console.log('\n📊 Test Report');
    console.log('='.repeat(50));
    
    const failedTests = this.testResults.filter(t => !t.passed);
    
    if (failedTests.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failedTests.forEach((test, index) => {
        console.log(`${index + 1}. ${test.test}`);
        console.log(`   → ${test.message}\n`);
      });
    }
    
    // Save detailed test report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.testResults.length,
        passedTests: this.testResults.filter(t => t.passed).length,
        failedTests: this.testResults.filter(t => !t.passed).length
      },
      results: this.testResults
    };
    
    const reportPath = path.join(process.cwd(), 'setup-scripts-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`📄 Detailed test report saved to: ${reportPath}`);
  }
}

// CLI interface
if (require.main === module) {
  const tester = new SetupScriptTester();
  
  tester.runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Testing failed:', error);
    process.exit(1);
  });
}

module.exports = SetupScriptTester;