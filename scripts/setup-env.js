#!/usr/bin/env node
/**
 * Setup script to configure environment variables for CreditAI
 * Run with: node scripts/setup-env.js
 */

const fs = require('fs')
const path = require('path')

const envContent = `# =============================================
# Supabase Configuration
# =============================================
NEXT_PUBLIC_SUPABASE_URL=https://uzugywvurvizopbkotgm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6dWd5d3Z1cnZpem9wYmtvdGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjEwNjQsImV4cCI6MjA2NzQzNzA2NH0.EzFJyjfH69JuBi9t8K8UXPvBHYM1AO6gsaSIh3kHwoI

# =============================================
# Application Configuration
# =============================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=CreditAI
NEXT_PUBLIC_APP_DESCRIPTION=AI-powered credit repair and monitoring platform

# =============================================
# OAuth Configuration (Optional)
# =============================================
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
# APPLE_CLIENT_ID=your_apple_client_id
# APPLE_CLIENT_SECRET=your_apple_client_secret

# =============================================
# Email Configuration (Optional)
# =============================================
# SENDGRID_API_KEY=your_sendgrid_api_key
# RESEND_API_KEY=your_resend_api_key
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASSWORD=your_app_password

# =============================================
# AI Configuration (Optional)
# =============================================
# OPENAI_API_KEY=your_openai_api_key
# GOOGLE_AI_API_KEY=your_google_ai_api_key
# ANTHROPIC_API_KEY=your_anthropic_api_key

# =============================================
# Payment Configuration (Optional)
# =============================================
# STRIPE_PUBLIC_KEY=your_stripe_public_key
# STRIPE_SECRET_KEY=your_stripe_secret_key
# STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# =============================================
# Analytics Configuration (Optional)
# =============================================
# GOOGLE_ANALYTICS_ID=your_google_analytics_id
# POSTHOG_API_KEY=your_posthog_api_key
# SENTRY_DSN=your_sentry_dsn
`

const envPath = path.join(process.cwd(), '.env.local')

try {
  // Check if .env.local already exists
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env.local already exists. Creating backup...')
    fs.copyFileSync(envPath, `${envPath}.backup`)
    console.log('✅ Backup created at .env.local.backup')
  }

  // Write the environment variables
  fs.writeFileSync(envPath, envContent)
  console.log('✅ Environment variables configured in .env.local')
  console.log('🚀 Your Supabase credentials have been set up!')
  console.log('')
  console.log('Next steps:')
  console.log('1. Run "npm run dev" to start the development server')
  console.log('2. Visit http://localhost:3000 to see your app')
  console.log('3. Visit http://localhost:3000/login to test authentication')
  console.log('')
  console.log('🔐 Supabase Configuration:')
  console.log('- URL: https://uzugywvurvizopbkotgm.supabase.co')
  console.log('- Project configured with authentication system')
  console.log('')
  console.log('📋 Optional: Configure additional services by editing .env.local:')
  console.log('- OAuth providers (Google, Apple)')
  console.log('- Email services (SendGrid, Resend)')
  console.log('- AI services (OpenAI, Google AI, Anthropic)')
  console.log('- Payment processing (Stripe)')
  console.log('- Analytics (Google Analytics, PostHog, Sentry)')
  
} catch (error) {
  console.error('❌ Error creating .env.local:', error.message)
  process.exit(1)
} 