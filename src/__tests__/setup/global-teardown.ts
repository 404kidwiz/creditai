/**
 * Global teardown for integration and E2E tests
 * Cleans up test environment, databases, and services
 */

import fs from 'fs/promises'
import path from 'path'

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...')

  try {
    // Access global test state
    const testState = global.__TEST_STATE__
    
    if (testState) {
      // Cleanup test database data
      await cleanupTestDatabase(testState.supabaseClient, testState.testUserId)
      
      // Cleanup test files
      await cleanupTestFiles()
      
      // Clear global test state
      delete global.__TEST_STATE__
    }
    
    console.log('✅ Global test teardown completed successfully')
    
  } catch (error) {
    console.error('❌ Global test teardown failed:', error)
    // Don't throw - teardown failures shouldn't prevent test completion
  }
}

async function cleanupTestDatabase(supabaseClient: any, testUserId: string) {
  try {
    console.log('🗄️ Cleaning up test database...')
    
    if (!supabaseClient || !testUserId) {
      console.warn('⚠️ No test database state to cleanup')
      return
    }
    
    const tables = [
      'dispute_tracking',
      'disputes',
      'credit_reports',
      'pdf_processing_logs',
      'analytics_data'
    ]
    
    for (const table of tables) {
      try {
        const { error } = await supabaseClient
          .from(table)
          .delete()
          .like('user_id', 'test-user-%')
        
        if (error) {
          console.warn(`⚠️ Could not clean table '${table}':`, error)
        } else {
          console.log(`✓ Cleaned table '${table}'`)
        }
      } catch (error) {
        console.warn(`⚠️ Error cleaning table '${table}':`, error)
      }
    }
    
    console.log('✅ Test database cleanup completed')
    
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error)
  }
}

async function cleanupTestFiles() {
  try {
    console.log('📁 Cleaning up test files...')
    
    const testDataDir = path.join(process.cwd(), 'test-data')
    
    try {
      // Check if test data directory exists
      await fs.access(testDataDir)
      
      // Remove test data directory and all contents
      await fs.rm(testDataDir, { recursive: true, force: true })
      
      console.log('✓ Test data directory removed')
    } catch (error) {
      // Directory might not exist, which is fine
      console.log('✓ No test data directory to remove')
    }
    
    // Cleanup any temporary files in uploads
    const uploadsDir = path.join(process.cwd(), 'uploads')
    try {
      const files = await fs.readdir(uploadsDir)
      const testFiles = files.filter(file => file.includes('test-'))
      
      for (const file of testFiles) {
        await fs.unlink(path.join(uploadsDir, file))
        console.log(`✓ Removed test file: ${file}`)
      }
    } catch (error) {
      // Uploads directory might not exist
      console.log('✓ No uploads directory to clean')
    }
    
    console.log('✅ Test files cleanup completed')
    
  } catch (error) {
    console.error('❌ Test files cleanup failed:', error)
  }
}