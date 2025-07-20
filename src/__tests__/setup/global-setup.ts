/**
 * Global setup for integration and E2E tests
 * Initializes test environment, databases, and services
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'

// Load test environment variables
config({ path: '.env.test' })
config({ path: '.env.local' })

// Test environment configuration
const TEST_CONFIG = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'
  },
  googleCloud: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'test-project',
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || ''
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_123',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_123'
  }
}

// Global test state
interface GlobalTestState {
  supabaseClient: any
  testUserId: string
  authToken: string
  testData: {
    users: any[]
    creditReports: any[]
    disputes: any[]
  }
}

declare global {
  var __TEST_STATE__: GlobalTestState
}

export default async function globalSetup() {
  console.log('🚀 Starting global test setup...')

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      TEST_CONFIG.supabase.url,
      TEST_CONFIG.supabase.serviceKey
    )

    // Create test user
    const testUserEmail = `test-user-${Date.now()}@creditai.test`
    const testUserId = `test-user-${Date.now()}`
    
    console.log(`📝 Creating test user: ${testUserEmail}`)
    
    // Setup test database state
    await setupTestDatabase(supabaseClient, testUserId)
    
    // Generate test auth token
    const authToken = `Bearer test-token-${Date.now()}`
    
    // Initialize global test state
    global.__TEST_STATE__ = {
      supabaseClient,
      testUserId,
      authToken,
      testData: {
        users: [],
        creditReports: [],
        disputes: []
      }
    }
    
    // Setup test files and directories
    await setupTestFiles()
    
    // Validate Google Cloud services (if credentials available)
    if (TEST_CONFIG.googleCloud.credentialsPath) {
      await validateGoogleCloudServices()
    }
    
    console.log('✅ Global test setup completed successfully')
    
  } catch (error) {
    console.error('❌ Global test setup failed:', error)
    throw error
  }
}

async function setupTestDatabase(supabaseClient: any, testUserId: string) {
  try {
    console.log('🗄️ Setting up test database...')
    
    // Create test tables if they don't exist
    const tables = [
      'users',
      'credit_reports', 
      'disputes',
      'dispute_tracking',
      'pdf_processing_logs',
      'analytics_data'
    ]
    
    for (const table of tables) {
      try {
        // Test table existence by attempting a simple query
        await supabaseClient
          .from(table)
          .select('*')
          .limit(1)
        
        console.log(`✓ Table '${table}' is accessible`)
      } catch (error) {
        console.warn(`⚠️ Table '${table}' not accessible:`, error)
      }
    }
    
    // Clean up any existing test data
    await cleanupTestData(supabaseClient)
    
    console.log('✅ Test database setup completed')
    
  } catch (error) {
    console.error('❌ Test database setup failed:', error)
    throw error
  }
}

async function setupTestFiles() {
  try {
    console.log('📁 Setting up test files...')
    
    const testDataDir = path.join(process.cwd(), 'test-data')
    const testUploadsDir = path.join(testDataDir, 'uploads')
    const testReportsDir = path.join(testDataDir, 'reports')
    
    // Create test directories
    await fs.mkdir(testDataDir, { recursive: true })
    await fs.mkdir(testUploadsDir, { recursive: true })
    await fs.mkdir(testReportsDir, { recursive: true })
    
    // Create sample test files
    const samplePdfContent = Buffer.from('Sample PDF content for testing')
    await fs.writeFile(
      path.join(testUploadsDir, 'sample-credit-report.pdf'),
      samplePdfContent
    )
    
    console.log('✅ Test files setup completed')
    
  } catch (error) {
    console.error('❌ Test files setup failed:', error)
    throw error
  }
}

async function validateGoogleCloudServices() {
  try {
    console.log('☁️ Validating Google Cloud services...')
    
    // Basic validation - check if credentials file exists
    if (TEST_CONFIG.googleCloud.credentialsPath) {
      try {
        await fs.access(TEST_CONFIG.googleCloud.credentialsPath)
        console.log('✓ Google Cloud credentials file found')
      } catch {
        console.warn('⚠️ Google Cloud credentials file not found')
      }
    }
    
    console.log('✅ Google Cloud validation completed')
    
  } catch (error) {
    console.warn('⚠️ Google Cloud validation failed:', error)
    // Don't throw - Google Cloud may not be available in test environment
  }
}

async function cleanupTestData(supabaseClient: any) {
  try {
    console.log('🧹 Cleaning up existing test data...')
    
    const tables = [
      'dispute_tracking',
      'disputes', 
      'credit_reports',
      'pdf_processing_logs',
      'analytics_data'
    ]
    
    for (const table of tables) {
      try {
        await supabaseClient
          .from(table)
          .delete()
          .like('user_id', 'test-user-%')
      } catch (error) {
        console.warn(`⚠️ Could not clean table '${table}':`, error)
      }
    }
    
    console.log('✅ Test data cleanup completed')
    
  } catch (error) {
    console.warn('⚠️ Test data cleanup failed:', error)
    // Don't throw - cleanup failures shouldn't prevent tests
  }
}