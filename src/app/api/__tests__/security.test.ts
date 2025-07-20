/**
 * Security API Routes Test Suite
 * Tests for security audit and session management endpoints
 */

import { NextRequest } from 'next/server'
import { GET as auditGET, HEAD as auditHEAD } from '../security/audit/route'
import { GET as sessionsGET, DELETE as sessionsDELETE, POST as sessionsPOST } from '../security/sessions/route'
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase'

// Mock Supabase
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => createMockSupabaseClient())
}))

// Mock security audit logger
jest.mock('@/lib/security/auditLogger', () => ({
  securityAuditLogger: {
    getRecentEvents: jest.fn(() => []),
    getSecurityMetrics: jest.fn(() => ({
      totalEvents: 10,
      eventsBySeverity: { HIGH: 2, MEDIUM: 3, LOW: 5 },
      eventsByType: { LOGIN_SUCCESS: 5, API_ACCESS: 5 },
      recentCriticalEvents: 0
    })),
    logApiAccess: jest.fn(),
    log: jest.fn()
  },
  SecurityEventType: {
    API_ACCESS: 'API_ACCESS',
    LOGIN_SUCCESS: 'LOGIN_SUCCESS'
  },
  SecuritySeverity: {
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW'
  }
}))

// Mock session manager
jest.mock('@/lib/security/sessionManager', () => ({
  sessionManager: {
    getUserSessions: jest.fn(() => [
      {
        sessionId: 'test-session-123',
        createdAt: '2024-01-01T00:00:00Z',
        lastActivity: '2024-01-01T01:00:00Z',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        isActive: true
      }
    ]),
    terminateAllUserSessions: jest.fn(),
    terminateSession: jest.fn(),
    getSessionStats: jest.fn(() => ({
      totalActiveSessions: 5,
      totalUsers: 3,
      avgSessionsPerUser: 1.67,
      oldestSession: 'session-456'
    })),
    updateConfig: jest.fn()
  }
}))

describe('Security API Routes', () => {
  let mockRequest: Partial<NextRequest>
  let mockSupabase: any

  beforeEach(() => {
    mockRequest = {
      url: 'https://test.com/api/security/audit',
      cookies: {
        get: jest.fn(() => ({ value: 'mock-token' }))
      } as any,
      headers: {
        get: jest.fn((name: string) => {
          if (name === 'x-forwarded-for') return '192.168.1.1'
          if (name === 'user-agent') return 'Mozilla/5.0 Test Browser'
          return null
        })
      } as any,
      ip: '192.168.1.1'
    }

    mockSupabase = createMockSupabaseClient()
    
    // Reset mocks
    jest.clearAllMocks()
  })

  describe('Audit Endpoint', () => {
    describe('GET /api/security/audit', () => {
      it('should return audit events for authenticated premium user', async () => {
        // Setup authenticated premium user
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })
        
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { subscription_tier: 'premium' }
              })
            })
          })
        })

        const response = await auditGET(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.data).toHaveProperty('events')
        expect(responseData.data).toHaveProperty('metrics')
      })

      it('should deny access to non-premium users', async () => {
        // Setup authenticated basic user
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })
        
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { subscription_tier: 'basic' }
              })
            })
          })
        })

        const response = await auditGET(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(403)
        expect(responseData.error).toBe('Insufficient privileges')
      })

      it('should handle authentication errors', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Invalid token')
        })

        const response = await auditGET(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(401)
        expect(responseData.error).toBe('Unauthorized')
      })

      it('should respect query parameters', async () => {
        mockRequest.url = 'https://test.com/api/security/audit?limit=50&severity=HIGH&includeMetrics=true'
        
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })
        
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { subscription_tier: 'premium' }
              })
            })
          })
        })

        const response = await auditGET(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.data.filters.limit).toBe(50)
        expect(responseData.data.filters.severity).toBe('HIGH')
        expect(responseData.data.metrics).toBeDefined()
      })
    })

    describe('HEAD /api/security/audit', () => {
      it('should return healthy status when no critical events', async () => {
        const response = await auditHEAD(mockRequest as NextRequest)

        expect(response.status).toBe(200)
        expect(response.headers.get('X-Security-Status')).toBe('healthy')
        expect(response.headers.get('X-Total-Events')).toBe('10')
      })

      it('should return critical status when recent critical events exist', async () => {
        const { securityAuditLogger } = require('@/lib/security/auditLogger')
        securityAuditLogger.getSecurityMetrics.mockReturnValue({
          totalEvents: 15,
          eventsBySeverity: { HIGH: 5, MEDIUM: 5, LOW: 5 },
          eventsByType: { LOGIN_FAILURE: 10, API_ACCESS: 5 },
          recentCriticalEvents: 3
        })

        const response = await auditHEAD(mockRequest as NextRequest)

        expect(response.status).toBe(503)
        expect(response.headers.get('X-Security-Status')).toBe('critical')
        expect(response.headers.get('X-Critical-Events')).toBe('3')
      })
    })
  })

  describe('Sessions Endpoint', () => {
    describe('GET /api/security/sessions', () => {
      it('should return user sessions for authenticated user', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })

        const response = await sessionsGET(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.data.sessions).toHaveLength(1)
        expect(responseData.data.sessions[0]).toHaveProperty('sessionId')
        expect(responseData.data.sessions[0].sessionId).toMatch(/^test-session/)
        expect(responseData.data.sessions[0].ipAddress).toBe('192.168.1.***')
      })

      it('should handle unauthenticated requests', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('No user')
        })

        const response = await sessionsGET(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(401)
        expect(responseData.error).toBe('Unauthorized')
      })
    })

    describe('DELETE /api/security/sessions', () => {
      it('should terminate all user sessions except current', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })
        
        mockSupabase.auth.getSession.mockResolvedValue({
          data: { session: { access_token: 'current-session-token' } }
        })

        const mockBody = { action: 'terminate_all' }
        mockRequest.json = jest.fn().mockResolvedValue(mockBody)

        const response = await sessionsDELETE(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.message).toBe('All other sessions terminated')
      })

      it('should terminate specific session', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })

        const mockBody = { action: 'terminate_session', sessionId: 'session-to-terminate' }
        mockRequest.json = jest.fn().mockResolvedValue(mockBody)

        const response = await sessionsDELETE(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.message).toBe('Session terminated')
      })

      it('should handle invalid actions', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })

        const mockBody = { action: 'invalid_action' }
        mockRequest.json = jest.fn().mockResolvedValue(mockBody)

        const response = await sessionsDELETE(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.error).toBe('Invalid action or missing sessionId')
      })
    })

    describe('POST /api/security/sessions (Admin)', () => {
      it('should return session stats for admin user', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'admin-123' } },
          error: null
        })
        
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'admin' }
              })
            })
          })
        })

        const mockBody = { action: 'get_stats' }
        mockRequest.json = jest.fn().mockResolvedValue(mockBody)

        const response = await sessionsPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.data).toHaveProperty('totalActiveSessions')
        expect(responseData.data).toHaveProperty('totalUsers')
      })

      it('should update session config for admin', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'admin-123' } },
          error: null
        })
        
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'admin' }
              })
            })
          })
        })

        const mockBody = { 
          action: 'update_config',
          config: { maxIdleTime: 3600000 }
        }
        mockRequest.json = jest.fn().mockResolvedValue(mockBody)

        const response = await sessionsPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.message).toBe('Configuration updated')
      })

      it('should deny access to non-admin users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })
        
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'user' }
              })
            })
          })
        })

        const mockBody = { action: 'get_stats' }
        mockRequest.json = jest.fn().mockResolvedValue(mockBody)

        const response = await sessionsPOST(mockRequest as NextRequest)
        const responseData = await response.json()

        expect(response.status).toBe(403)
        expect(responseData.error).toBe('Forbidden')
      })
    })
  })

  describe('Rate Limiting', () => {
    it('should handle rate limiting in audit endpoint', async () => {
      // Simulate rate limit exceeded
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.name = 'RateLimitError'
      
      mockSupabase.auth.getUser.mockRejectedValue(rateLimitError)

      const response = await auditGET(mockRequest as NextRequest)
      expect(response.status).toBe(500)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      })

      const response = await auditGET(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })

    it('should handle malformed JSON in sessions DELETE', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      mockRequest.json = jest.fn().mockRejectedValue(new Error('Malformed JSON'))

      const response = await sessionsDELETE(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })
  })

  describe('Logging Verification', () => {
    it('should log all API accesses to audit endpoint', async () => {
      const { securityAuditLogger } = require('@/lib/security/auditLogger')
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { subscription_tier: 'premium' }
            })
          })
        })
      })

      await auditGET(mockRequest as NextRequest)

      expect(securityAuditLogger.logApiAccess).toHaveBeenCalledWith(
        '/api/security/audit',
        'GET',
        'SUCCESS',
        expect.objectContaining({
          userId: 'user-123',
          ip: '192.168.1.1',
          statusCode: 200
        })
      )
    })
  })
})