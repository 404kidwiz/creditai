/**
 * Test setup for API routes
 * Node.js environment specific setup
 */

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project'
process.env.GOOGLE_CLOUD_LOCATION = 'us-central1'

// Mock crypto if not available
if (typeof global.crypto === 'undefined') {
  const crypto = require('crypto')
  global.crypto = {
    randomUUID: () => crypto.randomUUID(),
    getRandomValues: (arr: any) => crypto.getRandomValues(arr)
  }
}

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.log = jest.fn()
  console.error = jest.fn()
  console.warn = jest.fn()
})

afterAll(() => {
  console.log = originalConsoleLog
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Mock setTimeout and clearTimeout for async operations
global.setTimeout = jest.fn((fn) => {
  if (typeof fn === 'function') {
    fn()
  }
  return 123 as any
})

global.clearTimeout = jest.fn()