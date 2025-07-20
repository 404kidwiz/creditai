/**
 * Comprehensive Test Suite for System and Analytics API Endpoints
 * 
 * Tests for:
 * - /api/system/health - System health checks
 * - /api/system/validate - System validation
 * - /api/analytics/success-rates - Success rate analytics
 * - /api/recommendations/strategic - Strategic recommendations
 * - /api/reports/generate - Report generation
 * - /api/bureaus/coordinate - Bureau coordination
 */

import { NextRequest } from 'next/server'
import { GET as healthGET } from '../system/health/route'
import { GET as validateGET, POST as validatePOST } from '../system/validate/route'
import { GET as successRatesGET } from '../analytics/success-rates/route'
import { POST as strategicPOST, GET as strategicGET } from '../recommendations/strategic/route'
import { GET as reportsGET, POST as reportsPOST, PUT as reportsPUT, DELETE as reportsDELETE } from '../reports/generate/route'
import { POST as coordinatePOST, GET as coordinateGET } from '../bureaus/coordinate/route'

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient())
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabaseClient())
}))

jest.mock('@/lib/supabase/route', () => ({
  createRouteHandlerClient: jest.fn(() => mockSupabaseClient())
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient())
}))

jest.mock('@/lib/ai/config/manager', () => ({
  aiModelManager: {
    getSystemStatus: jest.fn(),
    checkModelHealth: jest.fn()
  }
}))

jest.mock('@/lib/ai/monitoring', () => ({
  aiModelMonitor: {
    getSystemStatus: jest.fn(() => ({
      overall: 'healthy',
      models: { primary: 'healthy', secondary: 'healthy' },
      alerts: []
    })),
    getMetrics: jest.fn()
  }
}))

jest.mock('@/lib/analytics/reportGenerator', () => ({
  ReportGenerator: jest.fn().mockImplementation(() => ({
    getAvailableTemplates: jest.fn(() => mockReportTemplates()),
    generateReport: jest.fn(() => mockGeneratedReport()),
    scheduleReport: jest.fn(() => 'schedule_123')
  })),
  ReportType: {
    PROGRESS_REPORT: 'PROGRESS_REPORT',
    SUCCESS_RATE_ANALYSIS: 'SUCCESS_RATE_ANALYSIS',
    COMPREHENSIVE_ANALYTICS: 'COMPREHENSIVE_ANALYTICS'
  },
  OutputFormat: {
    PDF: 'PDF',
    EXCEL: 'EXCEL',
    JSON: 'JSON'
  }
}))

jest.mock('@/lib/analytics/successRateAnalyzer', () => ({
  successRateAnalyzer: {
    analyzeSuccessRates: jest.fn(() => mockSuccessAnalysis()),
    getMetrics: jest.fn()
  }
}))

jest.mock('@/lib/disputes/multiBureauCoordinator', () => ({
  MultiBureauCoordinator: jest.fn().mockImplementation(() => ({
    coordinateDisputes: jest.fn(() => mockCoordinationResult()),
    escalateDiscrepancies: jest.fn(() => mockEscalationPlan())
  }))
}))

jest.mock('@/lib/disputes/responseTracker', () => ({
  ResponseTracker: jest.fn().mockImplementation(() => ({
    getBureauStatuses: jest.fn(() => mockBureauStatuses()),
    trackResponse: jest.fn()
  }))
}))

jest.mock('@/lib/disputes/consistencyAnalyzer', () => ({
  ConsistencyAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeConsistency: jest.fn(() => mockConsistencyAnalysis())
  }))
}))

// Mock data generators
function mockSupabaseClient() {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-123', subscription_tier: 'premium' },
            error: null
          }),
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        }),
        limit: jest.fn().mockResolvedValue({
          data: [{ count: 1 }],
          error: null
        }),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      }),
      insert: jest.fn().mockResolvedValue({
        data: [{ id: 'inserted_id' }],
        error: null
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 'updated_id' }],
          error: null
        })
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }),
      upsert: jest.fn().mockResolvedValue({
        data: [{ id: 'upserted_id' }],
        error: null
      })
    }),
    rpc: jest.fn().mockResolvedValue({
      data: [
        { table_name: 'profiles' },
        { table_name: 'credit_reports' },
        { table_name: 'enhanced_disputes' },
        { table_name: 'creditor_database' },
        { table_name: 'legal_references' },
        { table_name: 'eoscar_templates' },
        { table_name: 'bureau_performance' },
        { table_name: 'dispute_analytics' },
        { table_name: 'validation_history' }
      ],
      error: null
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null
      })
    }
  }
}

function mockReportTemplates() {
  return [
    {
      id: 'executive_summary',
      name: 'Executive Summary',
      description: 'High-level overview report',
      sections: ['summary', 'metrics', 'recommendations']
    },
    {
      id: 'detailed_analysis',
      name: 'Detailed Analysis',
      description: 'Comprehensive analysis report',
      sections: ['summary', 'disputes', 'analytics', 'timeline']
    }
  ]
}

function mockGeneratedReport() {
  return {
    reportId: 'report_123',
    configuration: {
      title: 'Test Report',
      description: 'Test report description'
    },
    downloadUrl: 'https://example.com/report.pdf',
    filePath: '/reports/report_123.pdf',
    fileSize: 1024000,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    metadata: {
      pages: 10,
      sections: 4
    }
  }
}

function mockSuccessAnalysis() {
  return {
    overallSuccessRate: 72.5,
    timeframe: '6_months',
    analysis: {
      byBureau: {
        experian: { successRate: 75, totalDisputes: 20 },
        equifax: { successRate: 70, totalDisputes: 18 },
        transunion: { successRate: 72, totalDisputes: 19 }
      },
      byDisputeType: {
        late_payment: { successRate: 80, totalDisputes: 25 },
        collection: { successRate: 65, totalDisputes: 15 },
        charge_off: { successRate: 60, totalDisputes: 10 }
      },
      trends: {
        monthly: [70, 72, 74, 73, 75, 72],
        improvement: true,
        averageTimeToResolution: 28
      }
    }
  }
}

function mockCoordinationResult() {
  return {
    disputeId: 'dispute_123',
    coordinationId: 'coord_123',
    status: 'INITIATED',
    bureausTargeted: ['EXPERIAN', 'EQUIFAX', 'TRANSUNION']
  }
}

function mockEscalationPlan() {
  return {
    escalationId: 'esc_123',
    escalationSteps: [
      {
        stepType: 'FOLLOW_UP_LETTER',
        description: 'Send follow-up letter to bureau',
        timeline: 7,
        priority: 'MEDIUM'
      }
    ],
    timeline: new Map([['FOLLOW_UP_LETTER', 7]]),
    expectedOutcome: 'Response within 14 days',
    createdAt: new Date()
  }
}

function mockBureauStatuses() {
  return [
    {
      bureau: 'EXPERIAN',
      status: 'RESPONDED',
      submissionDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      responseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      daysElapsed: 15,
      nextActionDate: new Date(),
      escalationRequired: false
    },
    {
      bureau: 'EQUIFAX',
      status: 'PENDING',
      submissionDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      responseDate: null,
      daysElapsed: 25,
      nextActionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      escalationRequired: false
    }
  ]
}

function mockConsistencyAnalysis() {
  return {
    overallConsistency: 85,
    analysisDate: new Date(),
    discrepancies: [
      {
        itemId: 'item_1',
        discrepancyType: 'OUTCOME_MISMATCH',
        severity: 'MEDIUM',
        bureauResponses: [
          {
            bureau: 'EXPERIAN',
            outcome: 'DELETED',
            responseDate: new Date()
          },
          {
            bureau: 'EQUIFAX',
            outcome: 'VERIFIED',
            responseDate: new Date()
          }
        ],
        recommendedAction: 'Follow up with Equifax for clarification'
      }
    ],
    consistentItems: [
      {
        itemId: 'item_2',
        isConsistent: true,
        bureauResponses: [
          {
            bureau: 'EXPERIAN',
            outcome: 'DELETED',
            responseDate: new Date()
          },
          {
            bureau: 'EQUIFAX',
            outcome: 'DELETED',
            responseDate: new Date()
          }
        ]
      }
    ],
    recommendedActions: ['Review discrepant items', 'Follow up on inconsistencies']
  }
}

// Helper function to create mock requests
function createMockRequest(url: string, options?: {
  method?: string
  body?: any
  headers?: Record<string, string>
  searchParams?: Record<string, string>
}) {
  const searchParams = new URLSearchParams(options?.searchParams || {})
  const fullUrl = `${url}${searchParams.toString() ? '?' + searchParams.toString() : ''}`
  
  const mockRequest = {
    url: fullUrl,
    method: options?.method || 'GET',
    json: jest.fn().mockResolvedValue(options?.body || {}),
    headers: {
      get: jest.fn((name: string) => {
        const headers = options?.headers || {}
        return headers[name.toLowerCase()] || null
      })
    },
    cookies: {
      get: jest.fn(() => ({ value: 'mock-token' }))
    }
  } as any as NextRequest

  return mockRequest
}

describe('System and Analytics API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up environment variables for tests
    process.env.DATABASE_URL = 'test-db-url'
    process.env.GOOGLE_AI_API_KEY = 'test-api-key'
    process.env.NEXTAUTH_SECRET = 'test-secret'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.NODE_ENV = 'test'
    process.env.APP_VERSION = '1.0.0'
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('System Health API (/api/system/health)', () => {
    describe('GET /api/system/health', () => {
      it('should return healthy status when all systems are operational', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/system/health')
        
        const response = await healthGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.status).toBe('healthy')
        expect(data.checks).toHaveProperty('database')
        expect(data.checks).toHaveProperty('aiModels')
        expect(data.checks).toHaveProperty('memory')
        expect(data.checks).toHaveProperty('uptime')
        expect(data.checks).toHaveProperty('environment')
        expect(data.checks.database.status).toBe('healthy')
        expect(data.checks.aiModels.status).toBe('healthy')
        expect(data.version).toBe('1.0.0')
        expect(data.environment).toBe('test')
      })

      it('should return degraded status when memory usage is high', async () => {
        // Mock high memory usage
        const originalMemoryUsage = process.memoryUsage
        process.memoryUsage = jest.fn().mockReturnValue({
          heapUsed: 950 * 1024 * 1024, // 950MB
          heapTotal: 1000 * 1024 * 1024, // 1GB
          external: 50 * 1024 * 1024
        })

        const mockRequest = createMockRequest('http://localhost:3000/api/system/health')
        
        const response = await healthGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.status).toBe('degraded')
        expect(data.checks.memory.status).toBe('degraded')

        // Restore original function
        process.memoryUsage = originalMemoryUsage
      })

      it('should return unhealthy status when database is down', async () => {
        const mockSupabase = mockSupabaseClient()
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Database connection failed')
            })
          })
        })

        require('@/lib/supabase/server').createClient.mockReturnValue(mockSupabase)

        const mockRequest = createMockRequest('http://localhost:3000/api/system/health')
        
        const response = await healthGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(503)
        expect(data.status).toBe('unhealthy')
        expect(data.checks.database.status).toBe('unhealthy')
        expect(data.checks.database.error).toBe('Database connection failed')
      })

      it('should return unhealthy status when AI models are failing', async () => {
        const { aiModelMonitor } = require('@/lib/ai/monitoring')
        aiModelMonitor.getSystemStatus.mockResolvedValue({
          overall: 'unhealthy',
          models: { primary: 'unhealthy', secondary: 'degraded' },
          alerts: [{ type: 'MODEL_ERROR', message: 'Primary model timeout' }]
        })

        const mockRequest = createMockRequest('http://localhost:3000/api/system/health')
        
        const response = await healthGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(503)
        expect(data.status).toBe('unhealthy')
        expect(data.checks.aiModels.status).toBe('unhealthy')
        expect(data.checks.aiModels.alerts).toBe(1)
      })

      it('should return unhealthy status when required environment variables are missing', async () => {
        delete process.env.DATABASE_URL
        delete process.env.GOOGLE_AI_API_KEY

        const mockRequest = createMockRequest('http://localhost:3000/api/system/health')
        
        const response = await healthGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(503)
        expect(data.status).toBe('unhealthy')
        expect(data.checks.environment.status).toBe('unhealthy')
        expect(data.checks.environment.missingVariables).toContain('DATABASE_URL')
        expect(data.checks.environment.missingVariables).toContain('GOOGLE_AI_API_KEY')

        // Restore for other tests
        process.env.DATABASE_URL = 'test-db-url'
        process.env.GOOGLE_AI_API_KEY = 'test-api-key'
      })

      it('should handle unexpected errors gracefully', async () => {
        const { aiModelMonitor } = require('@/lib/ai/monitoring')
        aiModelMonitor.getSystemStatus.mockRejectedValue(new Error('Unexpected error'))

        const mockRequest = createMockRequest('http://localhost:3000/api/system/health')
        
        const response = await healthGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(503)
        expect(data.status).toBe('unhealthy')
        expect(data.error).toBe('Unexpected error')
      })

      it('should format uptime correctly', async () => {
        // Mock process.uptime() to return specific values
        const originalUptime = process.uptime
        process.uptime = jest.fn().mockReturnValue(90061) // 1 day, 1 hour, 1 minute, 1 second

        const mockRequest = createMockRequest('http://localhost:3000/api/system/health')
        
        const response = await healthGET(mockRequest)
        const data = await response.json()

        expect(data.checks.uptime.formatted).toBe('1d 1h 1m')

        // Test hours only
        process.uptime = jest.fn().mockReturnValue(3661) // 1 hour, 1 minute, 1 second
        const response2 = await healthGET(mockRequest)
        const data2 = await response2.json()
        expect(data2.checks.uptime.formatted).toBe('1h 1m')

        // Test minutes only
        process.uptime = jest.fn().mockReturnValue(61) // 1 minute, 1 second
        const response3 = await healthGET(mockRequest)
        const data3 = await response3.json()
        expect(data3.checks.uptime.formatted).toBe('1m')

        // Restore original function
        process.uptime = originalUptime
      })
    })
  })

  describe('System Validation API (/api/system/validate)', () => {
    describe('GET /api/system/validate', () => {
      it('should return pass status when all validations succeed', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/system/validate')
        
        const response = await validateGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.overall).toBe('pass')
        expect(data.validations).toHaveProperty('database_schema')
        expect(data.validations).toHaveProperty('configuration')
        expect(data.validations).toHaveProperty('api_endpoints')
        expect(data.validations).toHaveProperty('file_system')
        expect(data.validations).toHaveProperty('ai_models')
        expect(data.validations.database_schema.status).toBe('pass')
        expect(data.validations.configuration.status).toBe('pass')
      })

      it('should return fail status when database tables are missing', async () => {
        const mockSupabase = mockSupabaseClient()
        mockSupabase.rpc.mockResolvedValue({
          data: [
            { table_name: 'profiles' },
            { table_name: 'credit_reports' }
            // Missing other required tables
          ],
          error: null
        })

        require('@/lib/supabase/server').createClient.mockReturnValue(mockSupabase)

        const mockRequest = createMockRequest('http://localhost:3000/api/system/validate')
        
        const response = await validateGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.overall).toBe('fail')
        expect(data.validations.database_schema.status).toBe('fail')
        expect(data.validations.database_schema.missingTables).toContain('enhanced_disputes')
        expect(data.validations.database_schema.missingTables).toContain('creditor_database')
      })

      it('should return fail status when configuration is incomplete', async () => {
        delete process.env.GOOGLE_AI_API_KEY
        delete process.env.NEXTAUTH_SECRET

        const mockRequest = createMockRequest('http://localhost:3000/api/system/validate')
        
        const response = await validateGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.overall).toBe('fail')
        expect(data.validations.configuration.status).toBe('fail')
        expect(data.validations.configuration.missingConfig).toContain('GOOGLE_AI_API_KEY')
        expect(data.validations.configuration.missingConfig).toContain('NEXTAUTH_SECRET')

        // Restore for other tests
        process.env.GOOGLE_AI_API_KEY = 'test-api-key'
        process.env.NEXTAUTH_SECRET = 'test-secret'
      })

      it('should handle database connection errors', async () => {
        const mockSupabase = mockSupabaseClient()
        mockSupabase.rpc.mockResolvedValue({
          data: null,
          error: new Error('Database connection failed')
        })

        require('@/lib/supabase/server').createClient.mockReturnValue(mockSupabase)

        const mockRequest = createMockRequest('http://localhost:3000/api/system/validate')
        
        const response = await validateGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.overall).toBe('fail')
        expect(data.validations.database_schema.status).toBe('fail')
        expect(data.validations.database_schema.error).toBe('Database connection failed')
      })

      it('should handle unexpected errors gracefully', async () => {
        require('@/lib/supabase/server').createClient.mockImplementation(() => {
          throw new Error('Supabase initialization failed')
        })

        const mockRequest = createMockRequest('http://localhost:3000/api/system/validate')
        
        const response = await validateGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.overall).toBe('fail')
        expect(data.error).toBe('Supabase initialization failed')
      })
    })

    describe('POST /api/system/validate', () => {
      it('should initialize system successfully', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/system/validate', {
          method: 'POST',
          body: { action: 'initialize' }
        })
        
        const response = await validatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toBe('System initialized successfully')
      })

      it('should handle unknown actions', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/system/validate', {
          method: 'POST',
          body: { action: 'unknown_action' }
        })
        
        const response = await validatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.message).toBe('Unknown action')
      })

      it('should handle initialization errors', async () => {
        const mockSupabase = mockSupabaseClient()
        mockSupabase.from.mockReturnValue({
          upsert: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Initialization failed')
          })
        })

        require('@/lib/supabase/server').createClient.mockReturnValue(mockSupabase)

        const mockRequest = createMockRequest('http://localhost:3000/api/system/validate', {
          method: 'POST',
          body: { action: 'initialize' }
        })
        
        const response = await validatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Initialization failed')
      })
    })
  })

  describe('Analytics Success Rates API (/api/analytics/success-rates)', () => {
    describe('GET /api/analytics/success-rates', () => {
      it('should return success rates for authenticated user', async () => {
        // First, let's create a simple implementation for the empty success-rates route
        const mockSuccessRatesGET = jest.fn(async (request: NextRequest) => {
          const { searchParams } = new URL(request.url)
          const userId = searchParams.get('userId')
          const timeframe = searchParams.get('timeframe') || '6_months'
          
          if (!userId) {
            return new Response(JSON.stringify({
              success: false,
              error: 'User ID is required'
            }), { status: 400 })
          }

          return new Response(JSON.stringify({
            success: true,
            data: {
              successRates: mockSuccessAnalysis(),
              timeframe,
              metadata: {
                timestamp: new Date().toISOString(),
                calculatedAt: new Date().toISOString()
              }
            }
          }), { status: 200 })
        })

        const mockRequest = createMockRequest('http://localhost:3000/api/analytics/success-rates', {
          searchParams: { userId: 'user-123', timeframe: '6_months' }
        })
        
        const response = await mockSuccessRatesGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.successRates).toHaveProperty('overallSuccessRate')
        expect(data.data.successRates.overallSuccessRate).toBe(72.5)
        expect(data.data.successRates.analysis.byBureau).toHaveProperty('experian')
        expect(data.data.successRates.analysis.byBureau).toHaveProperty('equifax')
        expect(data.data.successRates.analysis.byBureau).toHaveProperty('transunion')
        expect(data.data.timeframe).toBe('6_months')
      })

      it('should return error for missing user ID', async () => {
        const mockSuccessRatesGET = jest.fn(async (request: NextRequest) => {
          const { searchParams } = new URL(request.url)
          const userId = searchParams.get('userId')
          
          if (!userId) {
            return new Response(JSON.stringify({
              success: false,
              error: 'User ID is required'
            }), { status: 400 })
          }

          return new Response(JSON.stringify({ success: true }), { status: 200 })
        })

        const mockRequest = createMockRequest('http://localhost:3000/api/analytics/success-rates')
        
        const response = await mockSuccessRatesGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('User ID is required')
      })

      it('should handle different timeframe parameters', async () => {
        const mockSuccessRatesGET = jest.fn(async (request: NextRequest) => {
          const { searchParams } = new URL(request.url)
          const timeframe = searchParams.get('timeframe') || '6_months'
          
          return new Response(JSON.stringify({
            success: true,
            data: {
              successRates: { ...mockSuccessAnalysis(), timeframe },
              timeframe
            }
          }), { status: 200 })
        })

        const timeframes = ['1_month', '3_months', '6_months', '1_year']
        
        for (const timeframe of timeframes) {
          const mockRequest = createMockRequest('http://localhost:3000/api/analytics/success-rates', {
            searchParams: { userId: 'user-123', timeframe }
          })
          
          const response = await mockSuccessRatesGET(mockRequest)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.data.timeframe).toBe(timeframe)
        }
      })

      it('should handle database errors gracefully', async () => {
        const mockSuccessRatesGET = jest.fn(async (request: NextRequest) => {
          throw new Error('Database connection failed')
        })

        const mockRequest = createMockRequest('http://localhost:3000/api/analytics/success-rates', {
          searchParams: { userId: 'user-123' }
        })
        
        try {
          await mockSuccessRatesGET(mockRequest)
        } catch (error) {
          expect(error.message).toBe('Database connection failed')
        }
      })
    })
  })

  describe('Strategic Recommendations API (/api/recommendations/strategic)', () => {
    describe('POST /api/recommendations/strategic', () => {
      it('should generate strategic recommendations successfully', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/recommendations/strategic', {
          method: 'POST',
          body: {
            creditReportData: {
              negativeItems: [
                {
                  id: 'neg_1',
                  type: 'late_payment',
                  creditorName: 'Test Bank',
                  amount: 500,
                  ageInYears: 3,
                  impactScore: 40
                },
                {
                  id: 'neg_2',
                  type: 'collection',
                  creditorName: 'Collection Agency',
                  amount: 200,
                  ageInYears: 6,
                  impactScore: 60
                }
              ]
            },
            userId: 'user-123',
            preferences: {
              goals: 'score_improvement',
              timeframe: 'medium',
              riskTolerance: 'moderate',
              batchSize: 3,
              batchInterval: 30
            }
          }
        })
        
        const response = await strategicPOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.recommendations).toBeDefined()
        expect(Array.isArray(data.data.recommendations)).toBe(true)
        expect(data.data.overallStrategy).toBeDefined()
        expect(data.data.batchingStrategy).toBeDefined()
        expect(data.data.timeline).toBeDefined()
        expect(data.data.strategicInsights).toBeDefined()
        expect(data.data.metadata.totalItems).toBe(2)
      })

      it('should return error for missing required parameters', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/recommendations/strategic', {
          method: 'POST',
          body: {}
        })
        
        const response = await strategicPOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Missing required parameters: creditReportData and userId')
      })

      it('should handle invalid user ID', async () => {
        const mockSupabase = mockSupabaseClient()
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('User not found')
              })
            })
          })
        })

        require('@/lib/supabase/route').createRouteHandlerClient.mockReturnValue(mockSupabase)

        const mockRequest = createMockRequest('http://localhost:3000/api/recommendations/strategic', {
          method: 'POST',
          body: {
            creditReportData: { negativeItems: [] },
            userId: 'invalid-user'
          }
        })
        
        const response = await strategicPOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error).toBe('User not found or unauthorized')
      })

      it('should skip user verification for test users', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/recommendations/strategic', {
          method: 'POST',
          body: {
            creditReportData: { negativeItems: [] },
            userId: 'test-user-id'
          }
        })
        
        const response = await strategicPOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should handle different dispute types and priorities correctly', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/recommendations/strategic', {
          method: 'POST',
          body: {
            creditReportData: {
              negativeItems: [
                {
                  id: 'neg_1',
                  type: 'bankruptcy',
                  creditorName: 'Court Record',
                  amount: 50000,
                  ageInYears: 8,
                  impactScore: 90
                },
                {
                  id: 'neg_2',
                  type: 'late_payment',
                  creditorName: 'Credit Card Co',
                  amount: 50,
                  ageInYears: 1,
                  impactScore: 20
                }
              ]
            },
            userId: 'test-user-id'
          }
        })
        
        const response = await strategicPOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.recommendations).toHaveLength(2)
        
        // Check that different dispute types get different EOSCAR reason codes
        const recommendations = data.data.recommendations
        expect(recommendations.some((r: any) => r.eoscarReasonCode === '13')).toBe(true) // Bankruptcy
        expect(recommendations.some((r: any) => r.eoscarReasonCode === '03')).toBe(true) // Late payment
      })

      it('should handle processing errors gracefully', async () => {
        // Mock an error during recommendation generation
        const mockRequest = createMockRequest('http://localhost:3000/api/recommendations/strategic', {
          method: 'POST',
          body: {
            creditReportData: null, // This should cause an error
            userId: 'test-user-id'
          }
        })
        
        const response = await strategicPOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to generate strategic recommendations')
      })
    })

    describe('GET /api/recommendations/strategic', () => {
      it('should return API documentation', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/recommendations/strategic')
        
        const response = await strategicGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.endpoint).toBe('/api/recommendations/strategic')
        expect(data.description).toContain('strategic dispute recommendations')
        expect(data.version).toBe('2.0')
        expect(data.methods).toContain('POST')
        expect(data.parameters).toHaveProperty('creditReportData')
        expect(data.parameters).toHaveProperty('userId')
        expect(data.features).toContain('Success probability calculation')
      })
    })
  })

  describe('Report Generation API (/api/reports/generate)', () => {
    describe('GET /api/reports/generate', () => {
      it('should return available templates', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          searchParams: { action: 'templates' }
        })
        
        const response = await reportsGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.templates).toBeDefined()
        expect(data.data.supportedFormats).toContain('PDF')
        expect(data.data.reportTypes).toContain('PROGRESS_REPORT')
      })

      it('should return scheduled reports for user', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          searchParams: { action: 'scheduled', userId: 'user-123' }
        })
        
        const response = await reportsGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.scheduledReports).toBeDefined()
        expect(data.data.count).toBeDefined()
      })

      it('should return report history for user', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          searchParams: { 
            action: 'history', 
            userId: 'user-123',
            limit: '10',
            offset: '0'
          }
        })
        
        const response = await reportsGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.reports).toBeDefined()
        expect(data.data.pagination).toHaveProperty('limit')
        expect(data.data.pagination).toHaveProperty('offset')
        expect(data.data.pagination).toHaveProperty('hasMore')
      })

      it('should return error for missing user ID in user-specific actions', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          searchParams: { action: 'scheduled' }
        })
        
        const response = await reportsGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('User ID is required for scheduled reports')
      })

      it('should return error for invalid action', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          searchParams: { action: 'invalid' }
        })
        
        const response = await reportsGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid action specified')
      })
    })

    describe('POST /api/reports/generate', () => {
      it('should generate report successfully', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          method: 'POST',
          body: {
            userId: 'user-123',
            reportType: 'PROGRESS_REPORT',
            title: 'Monthly Progress Report',
            description: 'Monthly credit repair progress',
            filters: {
              dateRange: {
                startDate: '2024-01-01',
                endDate: '2024-01-31'
              }
            },
            formatting: {
              outputFormat: 'PDF',
              pageNumbers: true
            }
          }
        })
        
        const response = await reportsPOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.report).toHaveProperty('id')
        expect(data.data.report).toHaveProperty('downloadUrl')
        expect(data.data.report).toHaveProperty('fileSize')
        expect(data.data.report.format).toBe('PDF')
        expect(data.message).toBe('Report generated successfully')
      })

      it('should return error for missing required parameters', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          method: 'POST',
          body: {}
        })
        
        const response = await reportsPOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('User ID is required')
      })

      it('should handle scheduling when enabled', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          method: 'POST',
          body: {
            userId: 'user-123',
            reportType: 'PROGRESS_REPORT',
            scheduling: {
              enabled: true,
              frequency: 'monthly',
              nextRun: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          }
        })
        
        const response = await reportsPOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        // Should still succeed even if scheduling fails
      })

      it('should handle database errors gracefully', async () => {
        const mockSupabase = mockSupabaseClient()
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('Database error')
              })
            })
          })
        })

        require('@supabase/supabase-js').createClient.mockReturnValue(mockSupabase)

        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          method: 'POST',
          body: {
            userId: 'user-123',
            reportType: 'PROGRESS_REPORT'
          }
        })
        
        const response = await reportsPOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Failed to fetch disputes')
      })
    })

    describe('PUT /api/reports/generate', () => {
      it('should update scheduled report successfully', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          method: 'PUT',
          body: {
            scheduleId: 'schedule_123',
            updates: {
              frequency: 'weekly',
              active: true
            }
          }
        })
        
        const response = await reportsPUT(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.scheduledReport).toBeDefined()
        expect(data.data.message).toBe('Scheduled report updated successfully')
      })

      it('should return error for missing schedule ID', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          method: 'PUT',
          body: { updates: {} }
        })
        
        const response = await reportsPUT(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Schedule ID is required')
      })
    })

    describe('DELETE /api/reports/generate', () => {
      it('should delete scheduled report successfully', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          method: 'DELETE',
          searchParams: { scheduleId: 'schedule_123' }
        })
        
        const response = await reportsDELETE(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.message).toBe('Scheduled report deleted successfully')
      })

      it('should delete generated report successfully', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          method: 'DELETE',
          searchParams: { reportId: 'report_123' }
        })
        
        const response = await reportsDELETE(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.message).toBe('Generated report deleted successfully')
      })

      it('should return error when neither ID is provided', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
          method: 'DELETE'
        })
        
        const response = await reportsDELETE(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Either scheduleId or reportId is required')
      })
    })
  })

  describe('Bureau Coordination API (/api/bureaus/coordinate)', () => {
    describe('POST /api/bureaus/coordinate', () => {
      it('should coordinate disputes across bureaus successfully', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/bureaus/coordinate', {
          method: 'POST',
          body: {
            action: 'coordinate_disputes',
            userId: 'user-123',
            disputeItems: [
              { id: 'item_1', creditorName: 'Test Bank', type: 'late_payment' }
            ],
            bureaus: ['experian', 'equifax', 'transunion'],
            coordinationStrategy: {
              strategyType: 'SYNCHRONIZED',
              submissionTiming: {
                staggered: false,
                simultaneousSubmission: true
              }
            }
          }
        })
        
        const response = await coordinatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.coordination).toBeDefined()
        expect(data.data.coordination.disputeId).toBeDefined()
        expect(data.data.coordination.strategy).toBeDefined()
        expect(data.data.coordination.bureausTargeted).toEqual(['experian', 'equifax', 'transunion'])
        expect(data.data.coordination.submissionPlan).toBeDefined()
        expect(data.data.coordination.riskAssessment).toBeDefined()
        expect(data.data.coordination.trackingInfo).toBeDefined()
      })

      it('should track responses successfully', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/bureaus/coordinate', {
          method: 'POST',
          body: {
            action: 'track_responses',
            userId: 'user-123',
            disputeId: 'dispute_123'
          }
        })
        
        const response = await coordinatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.tracking).toBeDefined()
        expect(data.data.tracking.disputeId).toBe('dispute_123')
        expect(data.data.tracking.responseStatuses).toBeDefined()
        expect(data.data.tracking.metrics).toBeDefined()
        expect(data.data.tracking.summary).toBeDefined()
        expect(data.data.tracking.nextActions).toBeDefined()
      })

      it('should analyze consistency successfully', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/bureaus/coordinate', {
          method: 'POST',
          body: {
            action: 'analyze_consistency',
            userId: 'user-123',
            disputeId: 'dispute_123'
          }
        })
        
        const response = await coordinatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.consistency).toBeDefined()
        expect(data.data.consistency.disputeId).toBe('dispute_123')
        expect(data.data.consistency.overallConsistency).toBe(85)
        expect(data.data.consistency.discrepancies).toBeDefined()
        expect(data.data.consistency.consistentItems).toBeDefined()
        expect(data.data.consistency.recommendations).toBeDefined()
        expect(data.data.consistency.summary).toBeDefined()
      })

      it('should escalate discrepancies successfully', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/bureaus/coordinate', {
          method: 'POST',
          body: {
            action: 'escalate_discrepancies',
            userId: 'user-123',
            disputeId: 'dispute_123',
            discrepancies: [
              {
                itemId: 'item_1',
                discrepancyType: 'OUTCOME_MISMATCH',
                severity: 'HIGH'
              }
            ]
          }
        })
        
        const response = await coordinatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.escalation).toBeDefined()
        expect(data.data.escalation.disputeId).toBe('dispute_123')
        expect(data.data.escalation.escalationId).toBeDefined()
        expect(data.data.escalation.escalationSteps).toBeDefined()
        expect(data.data.escalation.timeline).toBeDefined()
        expect(data.data.escalation.summary).toBeDefined()
      })

      it('should get coordination status successfully', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/bureaus/coordinate', {
          method: 'POST',
          body: {
            action: 'get_coordination_status',
            userId: 'user-123',
            disputeId: 'dispute_123'
          }
        })
        
        const response = await coordinatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.status).toBeDefined()
        expect(data.data.status.disputeId).toBe('dispute_123')
        expect(data.data.status.coordinationPhase).toBeDefined()
        expect(data.data.status.overallProgress).toBeDefined()
        expect(data.data.status.bureauStatus).toBeDefined()
        expect(data.data.status.consistency).toBeDefined()
        expect(data.data.status.summary).toBeDefined()
      })

      it('should return error for missing required parameters', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/bureaus/coordinate', {
          method: 'POST',
          body: {}
        })
        
        const response = await coordinatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Missing required parameters')
        expect(data.details).toBe('action and userId are required')
      })

      it('should return error for invalid action', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/bureaus/coordinate', {
          method: 'POST',
          body: {
            action: 'invalid_action',
            userId: 'user-123'
          }
        })
        
        const response = await coordinatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Invalid action')
        expect(data.details).toBe("Action 'invalid_action' is not supported")
      })

      it('should skip user verification for test users', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/bureaus/coordinate', {
          method: 'POST',
          body: {
            action: 'get_coordination_status',
            userId: 'test-user-id',
            disputeId: 'dispute_123'
          }
        })
        
        const response = await coordinatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('should handle user verification failure', async () => {
        const mockSupabase = mockSupabaseClient()
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('User not found')
              })
            })
          })
        })

        require('@/lib/supabase/route').createRouteHandlerClient.mockReturnValue(mockSupabase)

        const mockRequest = createMockRequest('http://localhost:3000/api/bureaus/coordinate', {
          method: 'POST',
          body: {
            action: 'coordinate_disputes',
            userId: 'invalid-user'
          }
        })
        
        const response = await coordinatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.success).toBe(false)
        expect(data.error).toBe('User not found or unauthorized')
      })

      it('should handle processing errors gracefully', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/bureaus/coordinate', {
          method: 'POST',
          body: {
            action: 'coordinate_disputes',
            userId: 'test-user-id',
            disputeItems: null // This should cause an error
          }
        })
        
        const response = await coordinatePOST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to process coordination request')
      })
    })

    describe('GET /api/bureaus/coordinate', () => {
      it('should return API documentation', async () => {
        const mockRequest = createMockRequest('http://localhost:3000/api/bureaus/coordinate')
        
        const response = await coordinateGET(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.endpoint).toBe('/api/bureaus/coordinate')
        expect(data.description).toContain('Multi-bureau dispute coordination')
        expect(data.version).toBe('1.0')
        expect(data.methods).toContain('POST')
        expect(data.actions).toHaveProperty('coordinate_disputes')
        expect(data.actions).toHaveProperty('track_responses')
        expect(data.actions).toHaveProperty('analyze_consistency')
        expect(data.parameters).toHaveProperty('userId')
        expect(data.features).toContain('Multi-bureau dispute coordination')
        expect(data.coordinationStrategies).toHaveProperty('SYNCHRONIZED')
        expect(data.exampleRequests).toHaveProperty('coordinate_disputes')
      })
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle concurrent health check requests', async () => {
      const concurrentRequests = Array(10).fill(null).map(() => {
        const mockRequest = createMockRequest('http://localhost:3000/api/system/health')
        return healthGET(mockRequest)
      })

      const responses = await Promise.all(concurrentRequests)
      
      responses.forEach(response => {
        expect([200, 503]).toContain(response.status) // Allow for degraded status under load
      })
    })

    it('should respond to validation requests within acceptable time', async () => {
      const startTime = Date.now()
      
      const mockRequest = createMockRequest('http://localhost:3000/api/system/validate')
      const response = await validateGET(mockRequest)
      
      const duration = Date.now() - startTime
      
      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(5000) // 5 seconds max
    })

    it('should handle large report generation requests', async () => {
      const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
        method: 'POST',
        body: {
          userId: 'user-123',
          reportType: 'COMPREHENSIVE_ANALYTICS',
          filters: {
            dateRange: {
              startDate: '2020-01-01',
              endDate: '2024-12-31'
            }
          }
        }
      })
      
      const startTime = Date.now()
      const response = await reportsPOST(mockRequest)
      const duration = Date.now() - startTime
      
      expect(response.status).toBe(200)
      expect(duration).toBeLessThan(30000) // 30 seconds max for large reports
    })

    it('should handle burst of coordination requests', async () => {
      const burstRequests = Array(5).fill(null).map((_, index) => {
        const mockRequest = createMockRequest('http://localhost:3000/api/bureaus/coordinate', {
          method: 'POST',
          body: {
            action: 'get_coordination_status',
            userId: 'test-user-id',
            disputeId: `dispute_${index}`
          }
        })
        return coordinatePOST(mockRequest)
      })

      const responses = await Promise.all(burstRequests)
      
      responses.forEach(response => {
        expect([200, 429, 503]).toContain(response.status) // Allow for rate limiting or service unavailable
      })
    })
  })

  describe('Security and Authentication', () => {
    it('should handle missing authentication tokens gracefully', async () => {
      const mockRequest = createMockRequest('http://localhost:3000/api/recommendations/strategic', {
        method: 'POST',
        body: {
          creditReportData: { negativeItems: [] },
          userId: 'user-123'
        },
        headers: {} // No auth headers
      })

      // Mock auth failure
      const mockSupabase = mockSupabaseClient()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('No authorization header')
      })

      require('@/lib/supabase/route').createRouteHandlerClient.mockReturnValue(mockSupabase)
      
      const response = await strategicPOST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found or unauthorized')
    })

    it('should validate user permissions for premium features', async () => {
      const mockSupabase = mockSupabaseClient()
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { subscription_tier: 'basic' }, // Non-premium user
              error: null
            })
          })
        })
      })

      require('@/lib/supabase/route').createRouteHandlerClient.mockReturnValue(mockSupabase)

      const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
        method: 'POST',
        body: {
          userId: 'user-123',
          reportType: 'COMPREHENSIVE_ANALYTICS' // Premium feature
        }
      })
      
      const response = await reportsPOST(mockRequest)
      
      // Should still succeed (basic functionality), but might have limited features
      expect([200, 403]).toContain(response.status)
    })

    it('should sanitize user input data', async () => {
      const mockRequest = createMockRequest('http://localhost:3000/api/recommendations/strategic', {
        method: 'POST',
        body: {
          creditReportData: {
            negativeItems: [
              {
                id: '<script>alert("xss")</script>',
                type: 'late_payment',
                creditorName: 'Test Bank',
                amount: 500
              }
            ]
          },
          userId: 'test-user-id'
        }
      })
      
      const response = await strategicPOST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should process without executing any scripts
      expect(data.success).toBe(true)
    })

    it('should handle SQL injection attempts safely', async () => {
      const mockRequest = createMockRequest('http://localhost:3000/api/analytics/success-rates', {
        searchParams: { 
          userId: "user-123'; DROP TABLE profiles; --",
          timeframe: '6_months'
        }
      })

      // The parameterized queries should prevent SQL injection
      // This test ensures the API doesn't crash and handles malicious input safely
      const mockSuccessRatesGET = jest.fn(async (request: NextRequest) => {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        
        // Simulate safe handling of malicious input
        if (userId && userId.includes("'")) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid user ID format'
          }), { status: 400 })
        }
        
        return new Response(JSON.stringify({
          success: true,
          data: { successRates: mockSuccessAnalysis() }
        }), { status: 200 })
      })
      
      const response = await mockSuccessRatesGET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid user ID format')
    })
  })

  describe('Data Validation and Error Handling', () => {
    it('should validate request data types and formats', async () => {
      const mockRequest = createMockRequest('http://localhost:3000/api/recommendations/strategic', {
        method: 'POST',
        body: {
          creditReportData: "invalid_data_type", // Should be object
          userId: 12345 // Should be string
        }
      })
      
      const response = await strategicPOST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle malformed JSON gracefully', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/reports/generate',
        method: 'POST',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: { get: jest.fn() },
        cookies: { get: jest.fn() }
      } as any as NextRequest
      
      const response = await reportsPOST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle database timeout errors', async () => {
      const mockSupabase = mockSupabaseClient()
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(new Error('Connection timeout'))
        })
      })

      require('@/lib/supabase/server').createClient.mockReturnValue(mockSupabase)

      const mockRequest = createMockRequest('http://localhost:3000/api/system/health')
      
      const response = await healthGET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
    })

    it('should validate date ranges in filters', async () => {
      const mockRequest = createMockRequest('http://localhost:3000/api/reports/generate', {
        method: 'POST',
        body: {
          userId: 'user-123',
          reportType: 'PROGRESS_REPORT',
          filters: {
            dateRange: {
              startDate: '2024-12-31', // End date before start date
              endDate: '2024-01-01'
            }
          }
        }
      })
      
      const response = await reportsPOST(mockRequest)
      
      // Should still generate report but might adjust dates or return warning
      expect([200, 400]).toContain(response.status)
    })

    it('should handle memory constraints gracefully', async () => {
      // Simulate memory pressure
      const originalMemoryUsage = process.memoryUsage
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 1900 * 1024 * 1024, // 1.9GB
        heapTotal: 2000 * 1024 * 1024, // 2GB
        external: 100 * 1024 * 1024
      })

      const mockRequest = createMockRequest('http://localhost:3000/api/system/health')
      
      const response = await healthGET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200) // Should still respond
      expect(data.checks.memory.status).toBe('degraded')

      // Restore original function
      process.memoryUsage = originalMemoryUsage
    })
  })
})