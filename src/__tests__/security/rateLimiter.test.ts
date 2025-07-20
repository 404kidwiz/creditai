import { createRateLimiter, getUserTierFromRequest } from '../../lib/security/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';

// Mock the auditLogger
jest.mock('../../lib/security/auditLogger', () => {
  return {
    auditLogger: {
      logEvent: jest.fn(),
    },
    AuditEventType: {
      RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    },
    RiskLevel: {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical',
    },
  };
});

describe('Rate Limiter', () => {
  // Helper to create a mock NextRequest
  function createMockRequest(
    path: string = '/api/test',
    method: string = 'GET',
    ip: string = '127.0.0.1',
    headers: Record<string, string> = {}
  ): NextRequest {
    const url = new URL(`https://example.com${path}`);
    
    return {
      nextUrl: url,
      url: url.toString(),
      method,
      ip,
      headers: {
        get: (name: string) => headers[name.toLowerCase()] || null,
      },
    } as unknown as NextRequest;
  }

  // Helper to create a mock handler
  function createMockHandler() {
    return jest.fn().mockResolvedValue(
      new NextResponse(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }

  describe('createRateLimiter', () => {
    it('should allow requests within rate limits', async () => {
      const rateLimiter = createRateLimiter({
        rateLimits: {
          anonymous: {
            requestsPerMinute: 5,
            requestsPerHour: 10,
            burstLimit: 3,
            burstCooldown: 5,
          },
        },
      });
      
      const req = createMockRequest();
      const handler = createMockHandler();
      
      // Make 3 requests (within burst limit)
      for (let i = 0; i < 3; i++) {
        const response = await rateLimiter(req, handler);
        expect(response.status).toBe(200);
        expect(handler).toHaveBeenCalledTimes(i + 1);
      }
    });

    it('should rate limit requests that exceed burst limit', async () => {
      const rateLimiter = createRateLimiter({
        rateLimits: {
          anonymous: {
            requestsPerMinute: 10,
            requestsPerHour: 20,
            burstLimit: 3, // Set a low burst limit for testing
            burstCooldown: 5,
          },
        },
      });
      
      const req = createMockRequest();
      const handler = createMockHandler();
      
      // Make 3 requests (within burst limit)
      for (let i = 0; i < 3; i++) {
        const response = await rateLimiter(req, handler);
        expect(response.status).toBe(200);
      }
      
      // Make another request (exceeds burst limit)
      const response = await rateLimiter(req, handler);
      expect(response.status).toBe(429);
      expect(handler).toHaveBeenCalledTimes(3); // Handler not called for rate limited request
      
      // Check response body
      const responseBody = JSON.parse(await response.text());
      expect(responseBody.error).toBe('Rate limit exceeded');
      expect(responseBody.message).toContain('Exceeded burst limit');
    });

    it('should apply different rate limits based on user tier', async () => {
      const rateLimiter = createRateLimiter({
        getUserTier: (req) => req.headers.get('x-user-tier') || 'anonymous',
        rateLimits: {
          anonymous: {
            requestsPerMinute: 2,
            requestsPerHour: 5,
            burstLimit: 2,
            burstCooldown: 5,
          },
          premium: {
            requestsPerMinute: 10,
            requestsPerHour: 20,
            burstLimit: 5,
            burstCooldown: 5,
          },
        },
      });
      
      // Anonymous user (low limits)
      const anonReq = createMockRequest('/api/test', 'GET', '127.0.0.1');
      const anonHandler = createMockHandler();
      
      // Make 2 requests (within anonymous burst limit)
      for (let i = 0; i < 2; i++) {
        const response = await rateLimiter(anonReq, anonHandler);
        expect(response.status).toBe(200);
      }
      
      // Make another request (exceeds anonymous burst limit)
      const anonResponse = await rateLimiter(anonReq, anonHandler);
      expect(anonResponse.status).toBe(429);
      
      // Premium user (higher limits)
      const premiumReq = createMockRequest('/api/test', 'GET', '127.0.0.2', {
        'x-user-tier': 'premium',
      });
      const premiumHandler = createMockHandler();
      
      // Make 5 requests (within premium burst limit)
      for (let i = 0; i < 5; i++) {
        const response = await rateLimiter(premiumReq, premiumHandler);
        expect(response.status).toBe(200);
      }
    });

    it('should exclude specified paths from rate limiting', async () => {
      const rateLimiter = createRateLimiter({
        rateLimits: {
          anonymous: {
            requestsPerMinute: 1, // Very low limit
            requestsPerHour: 2,
            burstLimit: 1,
            burstCooldown: 5,
          },
        },
        excludePaths: ['/api/health', '/api/public'],
      });
      
      const handler = createMockHandler();
      
      // Make a request to a rate-limited path
      const limitedReq = createMockRequest('/api/test');
      await rateLimiter(limitedReq, handler);
      
      // Second request to the same path should be rate limited
      const limitedResponse = await rateLimiter(limitedReq, handler);
      expect(limitedResponse.status).toBe(429);
      
      // Request to excluded path should not be rate limited
      const excludedReq = createMockRequest('/api/health');
      const excludedResponse = await rateLimiter(excludedReq, handler);
      expect(excludedResponse.status).toBe(200);
      
      // Another excluded path
      const publicReq = createMockRequest('/api/public/data');
      const publicResponse = await rateLimiter(publicReq, handler);
      expect(publicResponse.status).toBe(200);
    });

    it('should include rate limit headers when configured', async () => {
      const rateLimiter = createRateLimiter({
        includeHeaders: true,
        rateLimits: {
          anonymous: {
            requestsPerMinute: 5,
            requestsPerHour: 10,
            burstLimit: 3,
            burstCooldown: 5,
          },
        },
      });
      
      const req = createMockRequest();
      const handler = createMockHandler();
      
      const response = await rateLimiter(req, handler);
      
      expect(response.headers.has('X-RateLimit-Limit-Minute')).toBe(true);
      expect(response.headers.has('X-RateLimit-Remaining-Minute')).toBe(true);
      expect(response.headers.has('X-RateLimit-Limit-Hour')).toBe(true);
      expect(response.headers.has('X-RateLimit-Remaining-Hour')).toBe(true);
      
      expect(response.headers.get('X-RateLimit-Limit-Minute')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining-Minute')).toBe('4');
    });
  });

  describe('getUserTierFromRequest', () => {
    it('should return tier from x-user-tier header if present', async () => {
      const req = createMockRequest('/api/test', 'GET', '127.0.0.1', {
        'x-user-tier': 'premium',
      });
      
      const tier = await getUserTierFromRequest(req);
      expect(tier).toBe('premium');
    });

    it('should return free tier if authenticated but no tier header', async () => {
      const req = createMockRequest('/api/test', 'GET', '127.0.0.1', {
        'authorization': 'Bearer token123',
      });
      
      const tier = await getUserTierFromRequest(req);
      expect(tier).toBe('free');
    });

    it('should return anonymous tier if no authentication or tier header', async () => {
      const req = createMockRequest();
      
      const tier = await getUserTierFromRequest(req);
      expect(tier).toBe('anonymous');
    });
  });
});