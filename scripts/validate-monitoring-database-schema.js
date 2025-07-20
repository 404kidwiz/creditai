#!/usr/bin/env node

/**
 * Validation script for monitoring database schema
 * Verifies that all required tables, columns, indexes, and functions exist
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Expected schema structure based on requirements
const expectedTables = {
  pdf_processing_metrics: {
    columns: [
      'id', 'processing_id', 'user_id', 'file_name', 'file_size', 'file_type',
      'processing_method', 'processing_time', 'confidence', 'success',
      'error_type', 'error_message', 'extracted_pages', 'google_cloud_service',
      'processor_version', 'file_hash', 'created_at', 'updated_at'
    ],
    indexes: [
      'idx_pdf_processing_metrics_user_id',
      'idx_pdf_processing_metrics_created_at',
      'idx_pdf_processing_metrics_processing_method',
      'idx_pdf_processing_metrics_success',
      'idx_pdf_processing_metrics_confidence',
      'idx_pdf_processing_metrics_google_cloud_service',
      'idx_pdf_processing_metrics_file_hash'
    ]
  },
  user_feedback: {
    columns: [
      'id', 'user_id', 'processing_session_id', 'feedback_type', 'rating',
      'feedback_text', 'extraction_accuracy_rating', 'processing_speed_rating',
      'created_at', 'updated_at'
    ],
    indexes: [
      'idx_user_feedback_user_id',
      'idx_user_feedback_processing_session_id',
      'idx_user_feedback_type',
      'idx_user_feedback_created_at',
      'idx_user_feedback_rating'
    ]
  },
  system_analytics: {
    columns: [
      'id', 'metric_name', 'metric_value', 'metric_unit', 'tags',
      'component', 'environment', 'recorded_at', 'created_at'
    ],
    indexes: [
      'idx_system_analytics_metric_name',
      'idx_system_analytics_recorded_at',
      'idx_system_analytics_component',
      'idx_system_analytics_environment',
      'idx_system_analytics_tags'
    ]
  },
  error_tracking: {
    columns: [
      'id', 'error_type', 'error_message', 'stack_trace', 'user_id',
      'request_path', 'user_agent', 'ip_address', 'severity', 'resolved',
      'resolved_by', 'resolved_at', 'resolution_notes', 'created_at', 'updated_at'
    ],
    indexes: [
      'idx_error_tracking_type',
      'idx_error_tracking_severity',
      'idx_error_tracking_created_at',
      'idx_error_tracking_resolved',
      'idx_error_tracking_user_id',
      'idx_error_tracking_request_path'
    ]
  }
};

const expectedFunctions = [
  'get_user_feedback_analytics',
  'get_error_analytics',
  'get_system_analytics_summary',
  'get_enhanced_processing_metrics',
  'cleanup_monitoring_data'
];

async function validateSchema() {
  console.log('🔍 Validating monitoring database schema...\n');
  
  let allValid = true;
  
  // Check tables and columns
  for (const [tableName, tableSpec] of Object.entries(expectedTables)) {
    console.log(`📋 Checking table: ${tableName}`);
    
    // Check if table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName);
    
    if (tableError || !tableExists || tableExists.length === 0) {
      console.error(`  ❌ Table ${tableName} does not exist`);
      allValid = false;
      continue;
    }
    
    console.log(`  ✅ Table ${tableName} exists`);
    
    // Check columns
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName);
    
    if (columnsError) {
      console.error(`  ❌ Error checking columns for ${tableName}:`, columnsError.message);
      allValid = false;
      continue;
    }
    
    const existingColumns = columns.map(col => col.column_name);
    const missingColumns = tableSpec.columns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.error(`  ❌ Missing columns in ${tableName}:`, missingColumns.join(', '));
      allValid = false;
    } else {
      console.log(`  ✅ All required columns exist (${tableSpec.columns.length} columns)`);
    }
    
    // Check indexes
    const { data: indexes, error: indexError } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .eq('schemaname', 'public')
      .eq('tablename', tableName);
    
    if (indexError) {
      console.error(`  ❌ Error checking indexes for ${tableName}:`, indexError.message);
      allValid = false;
      continue;
    }
    
    const existingIndexes = indexes.map(idx => idx.indexname);
    const missingIndexes = tableSpec.indexes.filter(idx => !existingIndexes.includes(idx));
    
    if (missingIndexes.length > 0) {
      console.error(`  ❌ Missing indexes in ${tableName}:`, missingIndexes.join(', '));
      allValid = false;
    } else {
      console.log(`  ✅ All required indexes exist (${tableSpec.indexes.length} indexes)`);
    }
    
    console.log('');
  }
  
  // Check functions
  console.log('🔧 Checking database functions...');
  
  const { data: functions, error: functionsError } = await supabase
    .from('information_schema.routines')
    .select('routine_name')
    .eq('routine_schema', 'public')
    .eq('routine_type', 'FUNCTION');
  
  if (functionsError) {
    console.error('❌ Error checking functions:', functionsError.message);
    allValid = false;
  } else {
    const existingFunctions = functions.map(func => func.routine_name);
    const missingFunctions = expectedFunctions.filter(func => !existingFunctions.includes(func));
    
    if (missingFunctions.length > 0) {
      console.error('❌ Missing functions:', missingFunctions.join(', '));
      allValid = false;
    } else {
      console.log(`✅ All required functions exist (${expectedFunctions.length} functions)`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allValid) {
    console.log('✅ Monitoring database schema validation PASSED');
    console.log('All required tables, columns, indexes, and functions are present.');
  } else {
    console.log('❌ Monitoring database schema validation FAILED');
    console.log('Some required components are missing. Please run the migration.');
  }
  
  return allValid;
}

async function testFunctions() {
  console.log('\n🧪 Testing database functions...\n');
  
  const tests = [
    {
      name: 'get_enhanced_processing_metrics',
      query: 'SELECT * FROM get_enhanced_processing_metrics(24)',
      description: 'Enhanced processing metrics for last 24 hours'
    },
    {
      name: 'get_user_feedback_analytics',
      query: 'SELECT * FROM get_user_feedback_analytics(24)',
      description: 'User feedback analytics for last 24 hours'
    },
    {
      name: 'get_error_analytics',
      query: 'SELECT * FROM get_error_analytics(24)',
      description: 'Error analytics for last 24 hours'
    },
    {
      name: 'get_system_analytics_summary',
      query: 'SELECT * FROM get_system_analytics_summary(NULL, 24)',
      description: 'System analytics summary for last 24 hours'
    }
  ];
  
  let allTestsPassed = true;
  
  for (const test of tests) {
    console.log(`🔍 Testing ${test.name}...`);
    
    try {
      const { data, error } = await supabase.rpc(test.name.replace('get_', ''), 
        test.name === 'get_system_analytics_summary' 
          ? { metric_name_filter: null, timeframe_hours: 24 }
          : { timeframe_hours: 24 }
      );
      
      if (error) {
        console.error(`  ❌ Function ${test.name} failed:`, error.message);
        allTestsPassed = false;
      } else {
        console.log(`  ✅ Function ${test.name} executed successfully`);
        console.log(`  📊 Returned ${Array.isArray(data) ? data.length : 1} row(s)`);
      }
    } catch (err) {
      console.error(`  ❌ Function ${test.name} threw error:`, err.message);
      allTestsPassed = false;
    }
    
    console.log('');
  }
  
  return allTestsPassed;
}

async function main() {
  try {
    const schemaValid = await validateSchema();
    
    if (schemaValid) {
      const functionsValid = await testFunctions();
      
      if (functionsValid) {
        console.log('🎉 All validation tests passed!');
        process.exit(0);
      } else {
        console.log('⚠️  Schema is valid but some functions failed');
        process.exit(1);
      }
    } else {
      console.log('❌ Schema validation failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Validation script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateSchema, testFunctions };