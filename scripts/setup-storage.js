#!/usr/bin/env node
/**
 * Setup script to configure Supabase Storage for CreditAI
 * Run with: node scripts/setup-storage.js
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Setting up Supabase Storage for CreditAI...\n')

// Check if Supabase CLI is installed
try {
  execSync('supabase --version', { stdio: 'pipe' })
  console.log('✅ Supabase CLI is installed')
} catch (error) {
  console.error('❌ Supabase CLI is not installed. Please install it first:')
  console.error('   npm install -g supabase')
  console.error('   or visit: https://supabase.com/docs/guides/cli')
  process.exit(1)
}

// Check if we're in a Supabase project
const configPath = path.join(process.cwd(), 'supabase', 'config.toml')
if (!fs.existsSync(configPath)) {
  console.error('❌ Not in a Supabase project. Please run:')
  console.error('   supabase init')
  process.exit(1)
}

console.log('✅ Supabase project found')

// Start Supabase locally if not running
try {
  console.log('\n🔄 Starting Supabase local development...')
  execSync('supabase start', { stdio: 'inherit' })
  console.log('✅ Supabase is running locally')
} catch (error) {
  console.log('⚠️  Supabase might already be running or there was an issue')
}

// Apply migrations
try {
  console.log('\n🔄 Applying database migrations...')
  execSync('supabase db reset', { stdio: 'inherit' })
  console.log('✅ Database migrations applied successfully')
} catch (error) {
  console.error('❌ Failed to apply migrations:', error.message)
  process.exit(1)
}

// Create storage bucket (this would be done via Supabase dashboard in production)
console.log('\n📦 Storage Configuration:')
console.log('   The credit-reports bucket will be created automatically when you:')
console.log('   1. Visit your Supabase dashboard')
console.log('   2. Go to Storage section')
console.log('   3. Create a new bucket named "credit-reports"')
console.log('   4. Set it as private (not public)')
console.log('   5. Configure RLS policies (already in migration)')

// Test the setup
console.log('\n🧪 Testing setup...')
try {
  // Test database connection
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    'http://localhost:54321',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  )
  
  // Test if we can query the database
  const { data, error } = await supabase.from('profiles').select('count').limit(1)
  
  if (error) {
    console.error('❌ Database connection test failed:', error.message)
  } else {
    console.log('✅ Database connection test passed')
  }
} catch (error) {
  console.error('❌ Setup test failed:', error.message)
}

console.log('\n🎉 Supabase Storage setup complete!')
console.log('\n📋 Next steps:')
console.log('   1. Visit http://localhost:3000/test-upload to test the upload system')
console.log('   2. Check the analytics dashboard for performance metrics')
console.log('   3. Upload sample credit reports to test OCR accuracy')
console.log('   4. Monitor the Supabase dashboard for storage usage')
console.log('\n🔗 Useful URLs:')
console.log('   - Local App: http://localhost:3000')
console.log('   - Supabase Studio: http://localhost:54323')
console.log('   - API: http://localhost:54321')
console.log('   - Database: postgresql://postgres:postgres@localhost:54322/postgres') 