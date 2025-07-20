#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

console.log('🔧 CreditAI Upload Fix Script\n');

const { execSync } = require('child_process');

// Check if Docker is running
console.log('🔍 Checking Docker...');
try {
  execSync('docker info', { stdio: 'ignore' });
  console.log('✅ Docker is running');
} catch (error) {
  console.error('❌ Docker is not running');
  console.log('💡 Please start Docker Desktop first');
  console.log('   - On macOS: open -a Docker');
  console.log('   - On Windows: Start Docker Desktop');
  console.log('   - On Linux: sudo systemctl start docker');
  process.exit(1);
}

// Start Supabase
console.log('\n🔄 Starting Supabase...');
try {
  execSync('supabase start', { stdio: 'inherit' });
  console.log('✅ Supabase started successfully');
} catch (error) {
  console.log('⚠️  Supabase might already be running or there was an issue');
}

// Set up storage
console.log('\n📦 Setting up storage...');
try {
  execSync('npm run setup-storage', { stdio: 'inherit' });
  console.log('✅ Storage setup completed');
} catch (error) {
  console.error('❌ Storage setup failed:', error.message);
}

// Run diagnostics
console.log('\n🔍 Running diagnostics...');
try {
  execSync('npm run diagnose-upload', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Diagnostics failed:', error.message);
}

console.log('\n🎉 Upload fix completed!');
console.log('\nNext steps:');
console.log('1. Check the diagnostics output above');
console.log('2. Visit http://localhost:3000/test-upload to test');
console.log('3. If issues persist, run: npm run check-setup');
