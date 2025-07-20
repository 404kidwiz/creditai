#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 CreditAI Setup Check\n');

// Check environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

console.log('📋 Checking environment variables...');
let missingVars = [];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
  } else {
    console.log(`✅ ${envVar}: ${process.env[envVar].substring(0, 20)}...`);
  }
});

if (missingVars.length > 0) {
  console.error(`❌ Missing environment variables: ${missingVars.join(', ')}`);
  console.log('\n💡 To fix this:');
  console.log('1. Copy .env.local.template to .env.local');
  console.log('2. Add your Supabase credentials');
  console.log('3. Run: npm run setup-supabase');
  process.exit(1);
}

// Check if Docker is running
console.log('\n🔍 Checking Docker status...');
const { execSync } = require('child_process');
try {
  execSync('docker info', { stdio: 'ignore' });
  console.log('✅ Docker is running');
} catch (error) {
  console.error('❌ Docker is not running');
  console.log('💡 Please start Docker Desktop or run:');
  console.log('   - On macOS: open -a Docker');
  console.log('   - On Windows: Start Docker Desktop');
  console.log('   - On Linux: sudo systemctl start docker');
  process.exit(1);
}

// Check if Supabase is running
console.log('\n🔍 Checking Supabase status...');
try {
  const status = execSync('supabase status', { encoding: 'utf8' });
  console.log('✅ Supabase is running');
  
  // Extract URLs from status
  const lines = status.split('\n');
  const apiUrl = lines.find(line => line.includes('API URL'));
  const anonKey = lines.find(line => line.includes('anon key'));
  
  if (apiUrl) console.log(`   ${apiUrl.trim()}`);
  if (anonKey) console.log(`   ${anonKey.trim()}`);
  
} catch (error) {
  console.log('⚠️  Supabase is not running');
  console.log('💡 To start Supabase: npm run supabase:start');
}

// Check storage bucket
console.log('\n🔍 Checking storage bucket...');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStorage() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('❌ Error listing buckets:', error.message);
      return;
    }

    console.log('📦 Available buckets:', buckets.map(b => b.name));
    
    const creditReportsBucket = buckets.find(b => b.name === 'credit-reports');
    if (creditReportsBucket) {
      console.log('✅ credit-reports bucket exists');
      console.log('   Public:', creditReportsBucket.public);
      console.log('   File size limit:', creditReportsBucket.file_size_limit);
    } else {
      console.log('❌ credit-reports bucket not found');
      console.log('💡 Run: npm run setup-storage');
    }
  } catch (error) {
    console.error('❌ Storage check failed:', error.message);
  }
}

// Check database tables
async function checkDatabase() {
  console.log('\n🔍 Checking database tables...');
  try {
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.error('❌ Error checking tables:', error.message);
      return;
    }

    const tableNames = tables.map(t => t.table_name);
    console.log('📊 Available tables:', tableNames);

    const requiredTables = ['documents', 'users', 'disputes'];
    requiredTables.forEach(table => {
      if (tableNames.includes(table)) {
        console.log(`✅ ${table} table exists`);
      } else {
        console.log(`❌ ${table} table missing`);
      }
    });

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

// Check authentication
async function checkAuth() {
  console.log('\n🔍 Checking authentication...');
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('❌ Auth check failed:', error.message);
    } else {
      console.log(`✅ Auth service working - ${users.length} users found`);
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error.message);
  }
}

// Run all checks
async function runChecks() {
  await checkStorage();
  await checkDatabase();
  await checkAuth();
  
  console.log('\n🎯 Summary:');
  console.log('1. Make sure Docker is running');
  console.log('2. Start Supabase: npm run supabase:start');
  console.log('3. Set up storage: npm run setup-storage');
  console.log('4. Test upload at: http://localhost:3000/test-upload');
}

runChecks().catch(console.error);
