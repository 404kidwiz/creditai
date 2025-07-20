#!/usr/bin/env node

/**
 * Simple SQL syntax validation for migration files
 * Checks for common syntax errors and validates structure
 */

const fs = require('fs');
const path = require('path');

function validateSQLSyntax(filePath) {
  console.log(`🔍 Validating SQL syntax for: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let isValid = true;
  let inFunction = false;
  let functionDepth = 0;
  
  // Basic syntax checks
  const checks = [
    {
      name: 'Balanced parentheses',
      test: (content) => {
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;
        return openParens === closeParens;
      }
    },
    {
      name: 'Balanced single quotes',
      test: (content) => {
        // Remove escaped quotes and count remaining
        const cleaned = content.replace(/\\'/g, '');
        const quotes = (cleaned.match(/'/g) || []).length;
        return quotes % 2 === 0;
      }
    },
    {
      name: 'No unterminated comments',
      test: (content) => {
        const blockCommentStarts = (content.match(/\/\*/g) || []).length;
        const blockCommentEnds = (content.match(/\*\//g) || []).length;
        return blockCommentStarts === blockCommentEnds;
      }
    },
    {
      name: 'CREATE TABLE statements',
      test: (content) => {
        const createTables = content.match(/CREATE TABLE[^;]+;/gis);
        return createTables && createTables.length > 0;
      }
    },
    {
      name: 'CREATE INDEX statements',
      test: (content) => {
        const createIndexes = content.match(/CREATE INDEX[^;]+;/gis);
        return createIndexes && createIndexes.length > 0;
      }
    },
    {
      name: 'CREATE FUNCTION statements',
      test: (content) => {
        const createFunctions = content.match(/CREATE OR REPLACE FUNCTION[^;]+\$\$/gis);
        return createFunctions && createFunctions.length > 0;
      }
    }
  ];
  
  console.log('\n📋 Running syntax checks...');
  
  for (const check of checks) {
    try {
      const result = check.test(content);
      if (result) {
        console.log(`  ✅ ${check.name}`);
      } else {
        console.log(`  ❌ ${check.name}`);
        isValid = false;
      }
    } catch (error) {
      console.log(`  ⚠️  ${check.name} - Error: ${error.message}`);
    }
  }
  
  // Check for common SQL keywords and patterns
  console.log('\n🔍 Checking SQL structure...');
  
  const requiredPatterns = [
    { pattern: /CREATE TABLE.*user_feedback/is, name: 'user_feedback table creation' },
    { pattern: /CREATE TABLE.*error_tracking/is, name: 'error_tracking table creation' },
    { pattern: /CREATE TABLE.*system_analytics/is, name: 'system_analytics table creation' },
    { pattern: /ALTER TABLE.*pdf_processing_metrics/is, name: 'pdf_processing_metrics alterations' },
    { pattern: /CREATE INDEX.*user_feedback/is, name: 'user_feedback indexes' },
    { pattern: /CREATE INDEX.*error_tracking/is, name: 'error_tracking indexes' },
    { pattern: /CREATE INDEX.*system_analytics/is, name: 'system_analytics indexes' },
    { pattern: /ENABLE ROW LEVEL SECURITY/is, name: 'RLS policies' },
    { pattern: /CREATE POLICY/is, name: 'Security policies' },
    { pattern: /get_user_feedback_analytics/is, name: 'User feedback analytics function' },
    { pattern: /get_error_analytics/is, name: 'Error analytics function' },
    { pattern: /get_system_analytics_summary/is, name: 'System analytics function' },
    { pattern: /cleanup_monitoring_data/is, name: 'Cleanup function' }
  ];
  
  for (const { pattern, name } of requiredPatterns) {
    if (pattern.test(content)) {
      console.log(`  ✅ ${name}`);
    } else {
      console.log(`  ❌ Missing: ${name}`);
      isValid = false;
    }
  }
  
  // Line-by-line validation for common issues
  console.log('\n🔍 Checking for common issues...');
  
  let hasIssues = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;
    
    // Skip empty lines and comments
    if (!line || line.startsWith('--')) continue;
    
    // Check for common issues
    if (line.includes('REFERENCES') && !line.includes('ON DELETE')) {
      console.log(`  ⚠️  Line ${lineNum}: Foreign key without ON DELETE clause`);
    }
    
    if (line.includes('CREATE TABLE') && !line.includes('IF NOT EXISTS')) {
      console.log(`  ⚠️  Line ${lineNum}: CREATE TABLE without IF NOT EXISTS`);
    }
    
    if (line.includes('CREATE INDEX') && !line.includes('IF NOT EXISTS')) {
      console.log(`  ⚠️  Line ${lineNum}: CREATE INDEX without IF NOT EXISTS`);
    }
    
    // Check for potential SQL injection vulnerabilities in functions
    if (line.includes('EXECUTE') && line.includes('||')) {
      console.log(`  ⚠️  Line ${lineNum}: Potential SQL injection risk with dynamic EXECUTE`);
      hasIssues = true;
    }
  }
  
  if (!hasIssues) {
    console.log('  ✅ No common issues found');
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (isValid) {
    console.log('✅ SQL syntax validation PASSED');
    console.log('The migration file appears to be syntactically correct.');
  } else {
    console.log('❌ SQL syntax validation FAILED');
    console.log('Please fix the issues above before running the migration.');
  }
  
  return isValid;
}

function main() {
  const migrationFile = 'supabase/migrations/20240123000000_monitoring_database_schema.sql';
  
  if (process.argv.length > 2) {
    const customFile = process.argv[2];
    return validateSQLSyntax(customFile) ? 0 : 1;
  }
  
  const isValid = validateSQLSyntax(migrationFile);
  process.exit(isValid ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { validateSQLSyntax };