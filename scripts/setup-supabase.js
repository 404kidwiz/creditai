#!/usr/bin/env node

/**
 * Supabase Database Setup Script
 * 
 * This script helps set up the Supabase database with all required tables,
 * functions, and policies for the CreditAI application.
 */

const fs = require('fs')
const path = require('path')

console.log('🚀 CreditAI Supabase Database Setup')
console.log('=====================================\n')

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!')
  console.log('Please create a .env.local file with your Supabase credentials:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key')
  process.exit(1)
}

// Read environment variables
const envContent = fs.readFileSync(envPath, 'utf8')
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]
const supabaseKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables not found in .env.local!')
  console.log('Please ensure you have:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key')
  process.exit(1)
}

console.log('✅ Environment variables found')
console.log(`📡 Supabase URL: ${supabaseUrl}`)
console.log(`🔑 Anon Key: ${supabaseKey.substring(0, 20)}...`)

console.log('\n📋 Setup Instructions:')
console.log('=====================')
console.log('')
console.log('1. Install Supabase CLI:')
console.log('   npm install -g supabase')
console.log('')
console.log('2. Login to Supabase:')
console.log('   supabase login')
console.log('')
console.log('3. Link your project:')
console.log('   supabase link --project-ref ' + supabaseUrl.split('/').pop())
console.log('')
console.log('4. Apply migrations:')
console.log('   supabase db push')
console.log('')
console.log('5. Set up storage bucket:')
console.log('   supabase storage create credit-reports')
console.log('')
console.log('6. Configure storage policies:')
console.log('   supabase storage policy create credit-reports "Users can upload own files" --policy "INSERT" --definition "(bucket_id = \'credit-reports\') AND (auth.uid()::text = (storage.foldername(name))[1])"')
console.log('   supabase storage policy create credit-reports "Users can view own files" --policy "SELECT" --definition "(bucket_id = \'credit-reports\') AND (auth.uid()::text = (storage.foldername(name))[1])"')
console.log('   supabase storage policy create credit-reports "Users can update own files" --policy "UPDATE" --definition "(bucket_id = \'credit-reports\') AND (auth.uid()::text = (storage.foldername(name))[1])"')
console.log('   supabase storage policy create credit-reports "Users can delete own files" --policy "DELETE" --definition "(bucket_id = \'credit-reports\') AND (auth.uid()::text = (storage.foldername(name))[1])"')
console.log('')
console.log('7. Enable Row Level Security:')
console.log('   supabase db reset --linked')
console.log('')
console.log('📁 Migration files available:')
console.log('   - supabase/migrations/20240101000000_initial_schema.sql')
console.log('   - supabase/migrations/20240101000001_credit_repair_schema.sql')
console.log('   - supabase/migrations/20240101000002_storage_schema.sql')
console.log('')
console.log('🔧 Manual Setup (if CLI doesn\'t work):')
console.log('1. Go to your Supabase dashboard')
console.log('2. Navigate to SQL Editor')
console.log('3. Run each migration file in order')
console.log('4. Create storage bucket manually')
console.log('5. Set up storage policies')
console.log('')
console.log('✅ After setup, the 404 errors should be resolved!')
console.log('')
console.log('📞 Need help? Check the Supabase documentation:')
console.log('   https://supabase.com/docs/guides/database') 