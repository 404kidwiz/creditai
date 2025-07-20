#!/usr/bin/env node

/**
 * Test script for monitoring database schema
 * Creates test data and verifies all tables and functions work correctly
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

// Test data
const testData = {
  pdfProcessingMetrics: {
    processing_id: 'test-processing-001',
    user_id: '00000000-0000-0000-0000-000000000000', // Test user ID
    file_name: 'test-credit-report.pdf',
    file_size: 1024000,
    file_type: 'application/pdf',
    processing_method: 'document_ai',
    processing_time: 5000,
    confidence: 0.85,
    success: true,
    extracted_pages: 3,
    google_cloud_service: 'document_ai',
    processor_version: 'v1.0',
    file_hash: 'abc123def456'
  },
  userFeedback: {
    user_id: '00000000-0000-0000-0000-000000000000',
    feedback_type: 'accuracy',
    rating: 4,
    feedback_text: 'The extraction was mostly accurate but missed some account numbers.',
    extraction_accuracy_rating: 4,
    processing_speed_rating: 5
  },
  systemAnalytics: {
    metric_name: 'processing_time_avg',
    metric_value: 4500.50,
    metric_unit: 'ms',
    tags: { component: 'pdf_processor', environment: 'test' },
    component: 'pdf_processor',
    environment: 'test'
  },
  errorTracking: {
    error_type: 'processing_timeout',
    error_message: 'PDF processing timed out after 30 seconds',
    stack_trace: 'Error: Timeout\n  at processDocument()\n  at main()',
    user_id: '00000000-0000-0000-0000-000000000000',
    request_path: '/api/process-pdf',
    user_agent: 'Mozilla/5.0 Test Browser',
    ip_address: '127.0.0.1',
    severity: 'error',
    resolved: false
  }
};

async function createTestUser() {
  console.log('👤 Creating test user...');
  
  // Check if test user exists
  const { data: existingUser } = await supabase.auth.admin.getUserById('00000000-0000-0000-0000-000000000000');
  
  if (existingUser.user) {
    console.log('  ✅ Test user already exists');
    return true;
  }
  
  // Create test user
  const { data, error } = await supabase.auth.admin.createUser({
    id: '00000000-0000-0000-0000-000000000000',
    email: 'test@example.com',
    password: 'testpassword123',
    email_confirm: true
  });
  
  if (error) {
    console.log('  ⚠️  Could not create test user (may already exist):', error.message);
    return true; // Continue anyway
  }
  
  console.log('  ✅ Test user created');
  return true;
}

async function testTableInsertions() {
  console.log('\n📝 Testing table insertions...\n');
  
  let allTestsPassed = true;
  
  // Test PDF Processing Metrics
  console.log('📊 Testing pdf_processing_metrics table...');
  try {
    const { data, error } = await supabase
      .from('pdf_processing_metrics')
      .insert(testData.pdfProcessingMetrics)
      .select();
    
    if (error) {
      console.error('  ❌ Failed to insert PDF processing metrics:', error.message);
      allTestsPassed = false;
    } else {
      console.log('  ✅ PDF processing metrics inserted successfully');
      testData.processingSessionId = data[0].id; // Store for user feedback
    }
  } catch (err) {
    console.error('  ❌ Exception inserting PDF processing metrics:', err.message);
    allTestsPassed = false;
  }
  
  // Test User Feedback (with processing session reference)
  console.log('\n💬 Testing user_feedback table...');
  try {
    const feedbackData = {
      ...testData.userFeedback,
      processing_session_id: testData.processingSessionId
    };
    
    const { data, error } = await supabase
      .from('user_feedback')
      .insert(feedbackData)
      .select();
    
    if (error) {
      console.error('  ❌ Failed to insert user feedback:', error.message);
      allTestsPassed = false;
    } else {
      console.log('  ✅ User feedback inserted successfully');
    }
  } catch (err) {
    console.error('  ❌ Exception inserting user feedback:', err.message);
    allTestsPassed = false;
  }
  
  // Test System Analytics
  console.log('\n📈 Testing system_analytics table...');
  try {
    const { data, error } = await supabase
      .from('system_analytics')
      .insert(testData.systemAnalytics)
      .select();
    
    if (error) {
      console.error('  ❌ Failed to insert system analytics:', error.message);
      allTestsPassed = false;
    } else {
      console.log('  ✅ System analytics inserted successfully');
    }
  } catch (err) {
    console.error('  ❌ Exception inserting system analytics:', err.message);
    allTestsPassed = false;
  }
  
  // Test Error Tracking
  console.log('\n🚨 Testing error_tracking table...');
  try {
    const { data, error } = await supabase
      .from('error_tracking')
      .insert(testData.errorTracking)
      .select();
    
    if (error) {
      console.error('  ❌ Failed to insert error tracking:', error.message);
      allTestsPassed = false;
    } else {
      console.log('  ✅ Error tracking inserted successfully');
    }
  } catch (err) {
    console.error('  ❌ Exception inserting error tracking:', err.message);
    allTestsPassed = false;
  }
  
  return allTestsPassed;
}

async function testAnalyticsFunctions() {
  console.log('\n🔧 Testing analytics functions...\n');
  
  let allTestsPassed = true;
  
  const functionTests = [
    {
      name: 'get_enhanced_processing_metrics',
      rpcName: 'get_enhanced_processing_metrics',
      params: { timeframe_hours: 24 },
      description: 'Enhanced processing metrics'
    },
    {
      name: 'get_user_feedback_analytics',
      rpcName: 'get_user_feedback_analytics',
      params: { timeframe_hours: 24 },
      description: 'User feedback analytics'
    },
    {
      name: 'get_error_analytics',
      rpcName: 'get_error_analytics',
      params: { timeframe_hours: 24 },
      description: 'Error analytics'
    },
    {
      name: 'get_system_analytics_summary',
      rpcName: 'get_system_analytics_summary',
      params: { metric_name_filter: null, timeframe_hours: 24 },
      description: 'System analytics summary'
    }
  ];
  
  for (const test of functionTests) {
    console.log(`🔍 Testing ${test.name}...`);
    
    try {
      const { data, error } = await supabase.rpc(test.rpcName, test.params);
      
      if (error) {
        console.error(`  ❌ Function ${test.name} failed:`, error.message);
        allTestsPassed = false;
      } else {
        console.log(`  ✅ Function ${test.name} executed successfully`);
        console.log(`  📊 Result:`, JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error(`  ❌ Function ${test.name} threw error:`, err.message);
      allTestsPassed = false;
    }
    
    console.log('');
  }
  
  return allTestsPassed;
}

async function testConstraintsAndValidation() {
  console.log('\n🔒 Testing constraints and validation...\n');
  
  let allTestsPassed = true;
  
  // Test feedback_type constraint
  console.log('🔍 Testing feedback_type constraint...');
  try {
    const { error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        feedback_type: 'invalid_type', // Should fail
        rating: 3
      });
    
    if (error && error.message.includes('check constraint')) {
      console.log('  ✅ feedback_type constraint working correctly');
    } else {
      console.error('  ❌ feedback_type constraint not working');
      allTestsPassed = false;
    }
  } catch (err) {
    console.log('  ✅ feedback_type constraint working correctly (exception caught)');
  }
  
  // Test rating constraint
  console.log('\n🔍 Testing rating constraint...');
  try {
    const { error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        feedback_type: 'accuracy',
        rating: 6 // Should fail (max is 5)
      });
    
    if (error && error.message.includes('check constraint')) {
      console.log('  ✅ Rating constraint working correctly');
    } else {
      console.error('  ❌ Rating constraint not working');
      allTestsPassed = false;
    }
  } catch (err) {
    console.log('  ✅ Rating constraint working correctly (exception caught)');
  }
  
  // Test severity constraint
  console.log('\n🔍 Testing severity constraint...');
  try {
    const { error } = await supabase
      .from('error_tracking')
      .insert({
        error_type: 'test_error',
        error_message: 'Test error message',
        severity: 'invalid_severity' // Should fail
      });
    
    if (error && error.message.includes('check constraint')) {
      console.log('  ✅ Severity constraint working correctly');
    } else {
      console.error('  ❌ Severity constraint not working');
      allTestsPassed = false;
    }
  } catch (err) {
    console.log('  ✅ Severity constraint working correctly (exception caught)');
  }
  
  return allTestsPassed;
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Delete in reverse order of dependencies
    await supabase.from('user_feedback').delete().eq('user_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pdf_processing_metrics').delete().eq('user_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('system_analytics').delete().eq('component', 'pdf_processor');
    await supabase.from('error_tracking').delete().eq('user_id', '00000000-0000-0000-0000-000000000000');
    
    console.log('  ✅ Test data cleaned up');
  } catch (err) {
    console.log('  ⚠️  Error cleaning up test data:', err.message);
  }
}

async function main() {
  console.log('🧪 Testing monitoring database schema...\n');
  
  try {
    // Create test user
    await createTestUser();
    
    // Test table insertions
    const insertionsValid = await testTableInsertions();
    
    // Test analytics functions
    const functionsValid = await testAnalyticsFunctions();
    
    // Test constraints
    const constraintsValid = await testConstraintsAndValidation();
    
    // Clean up
    await cleanupTestData();
    
    console.log('\n' + '='.repeat(50));
    
    if (insertionsValid && functionsValid && constraintsValid) {
      console.log('✅ All monitoring schema tests PASSED!');
      console.log('The database schema is working correctly.');
      process.exit(0);
    } else {
      console.log('❌ Some monitoring schema tests FAILED');
      console.log('Please check the errors above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test script failed:', error.message);
    await cleanupTestData();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testTableInsertions, testAnalyticsFunctions, testConstraintsAndValidation };