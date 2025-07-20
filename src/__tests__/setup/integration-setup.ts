/**
 * Integration test setup
 * Service integration and API testing setup
 */

import { config } from 'dotenv'
import { beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'

// Load test environment variables
config({ path: '.env.test' })
config({ path: '.env.local' })

// Mock external services for integration tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      }),
      insert: jest.fn().mockResolvedValue({
        data: [{ id: 'test_id', created_at: new Date().toISOString() }],
        error: null
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 'test_id', updated_at: new Date().toISOString() }],
          error: null
        })
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' }, session: { access_token: 'test-token' } },
        error: null
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' }, session: null },
        error: null
      }),
      signOut: jest.fn().mockResolvedValue({ error: null })
    }
  })
}))

// Mock Google Cloud services
jest.mock('@google-cloud/documentai', () => ({
  DocumentProcessorServiceClient: jest.fn().mockImplementation(() => ({
    processDocument: jest.fn().mockResolvedValue([{
      document: {
        text: 'Mock extracted text from Document AI',
        pages: [{
          pageNumber: 1,
          dimension: { width: 612, height: 792 },
          layout: {
            textAnchor: {
              textSegments: [{ startIndex: 0, endIndex: 33 }]
            }
          }
        }],
        entities: [
          {
            type: 'person_name',
            textAnchor: { textSegments: [{ startIndex: 0, endIndex: 8 }] },
            confidence: 0.95
          }
        ]
      }
    }])
  }))
}))

jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
    textDetection: jest.fn().mockResolvedValue([{
      fullTextAnnotation: {
        text: 'Mock extracted text from Vision API',
        pages: [{
          width: 612,
          height: 792,
          blocks: [{
            paragraphs: [{
              words: [{
                symbols: [{ text: 'M' }, { text: 'o' }, { text: 'c' }, { text: 'k' }]
              }]
            }]
          }]
        }]
      }
    }])
  }))
}))

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        save: jest.fn().mockResolvedValue(),
        download: jest.fn().mockResolvedValue([Buffer.from('mock file content')]),
        delete: jest.fn().mockResolvedValue(),
        exists: jest.fn().mockResolvedValue([true]),
        getSignedUrl: jest.fn().mockResolvedValue(['https://mock-signed-url.com'])
      })
    })
  }))
}))

// Mock Stripe for payment testing
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123'
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: 'cs_test_123',
          payment_status: 'paid',
          subscription: 'sub_test_123'
        })
      }
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_test_123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30
      }),
      update: jest.fn().mockResolvedValue({
        id: 'sub_test_123',
        status: 'active'
      })
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            subscription: 'sub_test_123'
          }
        }
      })
    }
  }))
})

// Mock fetch for API testing
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock Google AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            personalInfo: {
              name: 'John Doe',
              address: '123 Main St, Anytown, CA 12345',
              nameConfidence: 0.95,
              addressConfidence: 0.88
            },
            creditScores: {
              experian: { score: 720, date: '2024-01-15', bureau: 'experian', confidence: 0.92 },
              equifax: { score: 715, date: '2024-01-15', bureau: 'equifax', confidence: 0.90 },
              transunion: { score: 725, date: '2024-01-15', bureau: 'transunion', confidence: 0.93 }
            },
            accounts: [
              {
                id: 'acc_1',
                creditorName: 'Test Bank',
                accountNumber: '1234',
                accountType: 'credit_card',
                balance: 1000,
                creditLimit: 5000,
                status: 'open',
                paymentHistory: 'current',
                confidence: 0.89
              }
            ],
            negativeItems: [
              {
                id: 'neg_1',
                type: 'late_payment',
                creditorName: 'Test Bank',
                amount: 50,
                date: '2023-12-01',
                impactScore: 30,
                confidence: 0.91
              }
            ],
            inquiries: [],
            publicRecords: []
          })
        }
      })
    })
  }))
}))

// Integration test utilities
const integrationUtils = {
  mockApiCall: (endpoint: string, data: any, success: boolean = true) => {
    mockFetch.mockResolvedValueOnce({
      ok: success,
      status: success ? 200 : 400,
      json: jest.fn().mockResolvedValue({
        success,
        data: success ? data : undefined,
        error: success ? undefined : 'Mock API error'
      })
    })
  },
  
  mockFileUpload: (filename: string, content: string = 'mock content') => {
    return {
      name: filename,
      size: content.length,
      type: filename.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
      lastModified: Date.now(),
      content: Buffer.from(content)
    }
  },
  
  mockSupabaseResponse: (table: string, data: any[], error: any = null) => {
    const mockClient = require('@supabase/supabase-js').createClient()
    mockClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data, error })
      }),
      insert: jest.fn().mockResolvedValue({ data, error }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data, error })
      })
    })
    return mockClient
  },
  
  createTestCreditData: () => ({
    personalInfo: {
      name: 'John Doe',
      address: '123 Main St, Anytown, CA 12345',
      ssn: '123-45-6789',
      dateOfBirth: '1980-01-15'
    },
    creditScores: {
      experian: { score: 720, date: '2024-01-15', bureau: 'experian' }
    },
    accounts: [
      {
        id: 'acc_1',
        creditorName: 'Test Bank',
        accountNumber: '1234567890',
        accountType: 'credit_card',
        balance: 1000,
        creditLimit: 5000,
        status: 'open'
      }
    ],
    negativeItems: [
      {
        id: 'neg_1',
        type: 'late_payment',
        creditorName: 'Test Bank',
        amount: 50,
        date: '2023-12-01',
        impactScore: 30
      }
    ],
    inquiries: [],
    publicRecords: []
  })
}

// Make utilities globally available
;(global as any).integrationUtils = integrationUtils

// Setup and teardown for integration tests
beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockClear()
})

afterEach(() => {
  jest.restoreAllMocks()
})

beforeAll(() => {
  console.log('🔗 Integration test setup completed')
})

afterAll(() => {
  console.log('🔗 Integration test teardown completed')
})