#!/usr/bin/env node

/**
 * Supabase Authentication Configuration Script
 * 
 * This script helps configure authentication settings for the CreditAI app.
 */

const fs = require('fs')
const path = require('path')

console.log('🔐 CreditAI Authentication Configuration')
console.log('========================================\n')

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!')
  process.exit(1)
}

// Read environment variables
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
const appUrl = envVars.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

console.log('📋 Current Configuration:')
console.log(`   Supabase URL: ${supabaseUrl}`)
console.log(`   App URL: ${appUrl}`)
console.log(`   Anon Key: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}\n`)

console.log('🔧 Manual Configuration Required:')
console.log('==================================\n')

console.log('1. 📧 Email Authentication Settings:')
console.log('   Go to: https://supabase.com/dashboard/project/uzugywvurvizopbkotgm/auth/providers')
console.log('   • Enable "Email" provider')
console.log('   • Set "Confirm email" to OFF (for development)')
console.log('   • Set "Secure email change" to OFF (for development)')
console.log('   • Set "Double confirm changes" to OFF (for development)\n')

console.log('2. 🔗 Redirect URLs:')
console.log('   Go to: https://supabase.com/dashboard/project/uzugywvurvizopbkotgm/auth/url-configuration')
console.log('   Add these URLs to "Redirect URLs":')
console.log(`   • ${appUrl}/auth/callback`)
console.log(`   • ${appUrl}/dashboard`)
console.log(`   • ${appUrl}/login`)
console.log(`   • ${appUrl}/signup\n`)

console.log('3. 📧 Email Templates (Optional):')
console.log('   Go to: https://supabase.com/dashboard/project/uzugywvurvizopbkotgm/auth/templates')
console.log('   • Customize "Confirm signup" template')
console.log('   • Customize "Reset password" template\n')

console.log('4. 🛡️ Security Settings:')
console.log('   Go to: https://supabase.com/dashboard/project/uzugywvurvizopbkotgm/auth/policies')
console.log('   • Verify RLS policies are applied')
console.log('   • Check that auth.users can access their own data\n')

console.log('5. 🧪 Test Authentication:')
console.log('   After configuration, test with:')
console.log('   • Sign up with a new email')
console.log('   • Sign in with existing credentials')
console.log('   • Test password reset\n')

console.log('🚀 Quick Fix for Development:')
console.log('=============================\n')

console.log('If you want to quickly test without email confirmation:')
console.log('1. Go to Supabase Dashboard > Authentication > Providers')
console.log('2. Click on "Email" provider')
console.log('3. Turn OFF "Confirm email"')
console.log('4. Save changes')
console.log('5. Try signing up again\n')

console.log('📞 Need Help?')
console.log('=============')
console.log('• Supabase Docs: https://supabase.com/docs/guides/auth')
console.log('• Discord Community: https://discord.supabase.com')
console.log('• GitHub Issues: https://github.com/supabase/supabase/issues\n')

console.log('✅ Configuration complete! Try signing up again after making these changes.') 