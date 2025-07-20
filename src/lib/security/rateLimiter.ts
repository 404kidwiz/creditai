/**
 * Rate Limiter Middleware
 * Prevents API abuse with tiered rate limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditLogger, AuditEventType, RiskLevel } from './auditLogger';

/**
 * Rate limit configuration for different user tiers
 */
export interface RateLimitConfig {
  // Requests per minute
  requestsPerMinute: number;
  // Requests per hour
  requestsPerHour: number;
  // Burst limit (max requests in a short period)
  burstLimit: number;
  // Cooldown period in seconds after hitting burst limit
  burstCooldown: number;
}

/**
 * Default rate limit configurations by user tier
 */
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Anonymous users
  anonymous: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    burstLimit: 20,
    burstCooldown: 60,
  },
  // Free tier users
  free: {
    requestsPerMinute: 20,
    requestsPerHour: 200,
    burstLimit: 30,
    burstCooldown: 30,
  },
  // Premium tier users
  premium: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    burstLimit: 100,
    burstCooldown: 15,
  },
  // Admin users
  admin: {
    requestsPerMinute: 120,
    requestsPerHour: 5000,
    burstLimit: 200,
    burstCooldown: 5,
  },
};

/**
 * In-memory store for rate limiting
 * In production, this would be replaced with Redis or another distributed cache
 */
class RateLimitStore {
  private minuteCounters: Map<string, { count: number; resetAt: number }> = new Map();
  private hourCounters: Map<string, { count: number; resetAt: number }> = new Map();
  private burstCounters: Map<string, { count: number; resetAt: number }> = new Map();
  private cooldowns: Map<string, number> = new Map();

  /**
   * Increment request count for a key
   */
  incrementRequest(key: string): void {
    const now = Date.now();
    
    // Minute counter
    this.incrementCounter(this.minuteCounters, key, now, 60 * 1000);
    
    // Hour counter
    this.incrementCounter(this.hourCounters, key, now, 60 * 60 * 1000);
    
    // Burst counter (10 second window)
    this.incrementCounter(this.burstCounters, key, now, 10 * 1000);
  }

  /**
   * Check if a request should be rate limited
   */
  shouldRateLimit(key: string, config: RateLimitConfig): { limited: boolean; reason?: string } {
    const now = Date.now();
    
    // Check if in cooldown
    const cooldownUntil = this.cooldowns.get(key);
    if (cooldownUntil && cooldownUntil > now) {
      return { 
        limited: true, 
        reason: `Cooldown period: ${Math.ceil((cooldownUntil - now) / 1000)}s remaining` 
      };
    }
    
    // Check minute limit
    const minuteCounter = this.minuteCounters.get(key);
    if (minuteCounter && minuteCounter.count >= config.requestsPerMinute) {
      return { 
        limited: true, 
        reason: `Exceeded rate limit: ${config.requestsPerMinute} requests per minute` 
      };
    }
    
    // Check hour limit
    const hourCounter = this.hourCounters.get(key);
    if (hourCounter && hourCounter.count >= config.requestsPerHour) {
      return { 
        limited: true, 
        reason: `Exceeded rate limit: ${config.requestsPerHour} requests per hour` 
      };
    }
    
    // Check burst limit
    const burstCounter = this.burstCounters.get(key);
    if (burstCounter && burstCounter.count >= config.burstLimit) {
      // Set cooldown period
      this.cooldowns.set(key, now + config.burstCooldown * 1000);
      
      return { 
        limited: true, 
        reason: `Exceeded burst limit: ${config.burstLimit} requests in short period` 
      };
    }
    
    return { limited: false };
  }

  /**
   * Get current usage for a key
   */
  getUsage(key: string): {
    minuteCount: number;
    hourCount: number;
    burstCount: number;
    inCooldown: boolean;
    cooldownRemaining?: number;
  } {
    const now = Date.now();
    
    const minuteCounter = this.minuteCounters.get(key);
    const hourCounter = this.hourCounters.get(key);
    const burstCounter = this.burstCounters.get(key);
    const cooldownUntil = this.cooldowns.get(key);
    
    return {
      minuteCount: minuteCounter?.count || 0,
      hourCount: hourCounter?.count || 0,
      burstCount: burstCounter?.count || 0,
      inCooldown: Boolean(cooldownUntil && cooldownUntil > now),
      cooldownRemaining: cooldownUntil && cooldownUntil > now 
        ? Math.ceil((cooldownUntil - now) / 1000) 
        : undefined,
    };
  }

  /**
   * Increment a counter and handle expiration
   */
  private incrementCounter(
    counters: Map<string, { count: number; resetAt: number }>,
    key: string,
    now: number,
    windowMs: number
  ): void {
    const counter = counters.get(key);
    
    if (!counter || counter.resetAt <= now) {
      // Counter expired or doesn't exist, create new one
      counters.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
    } else {
      // Increment existing counter
      counter.count += 1;
    }
  }

  /**
   * Clean up expired counters (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    
    this.cleanupMap(this.minuteCounters, now);
    this.cleanupMap(this.hourCounters, now);
    this.cleanupMap(this.burstCounters, now);
    
    // Clean up cooldowns
    for (const [key, expiry] of this.cooldowns.entries()) {
      if (expiry <= now) {
        this.cooldowns.delete(key);
      }
    }
  }

  /**
   * Clean up expired entries in a map
   */
  private cleanupMap(map: Map<string, { resetAt: number }>, now: number): void {
    for (const [key, value] of map.entries()) {
      if (value.resetAt <= now) {
        map.delete(key);
      }
    }
  }
}

// Create singleton store
const rateLimitStore = new RateLimitStore();

// Start periodic cleanup
setInterval(() => {
  rateLimitStore.cleanup();
}, 60 * 1000); // Clean up every minute

/**
 * Rate limiter middleware options
 */
export interface RateLimiterOptions {
  // Function to determine user tier
  getUserTier?: (req: NextRequest) => Promise<string> | string;
  // Custom rate limit configurations
  rateLimits?: Record<string, RateLimitConfig>;
  // Function to get rate limit key (defaults to IP address)
  getKey?: (req: NextRequest) => Promise<string> | string;
  // Whether to include headers with rate limit info
  includeHeaders?: boolean;
  // Paths to exclude from rate limiting
  excludePaths?: string[];
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  const {
    getUserTier = () => 'anonymous',
    rateLimits = DEFAULT_RATE_LIMITS,
    getKey = (req) => req.ip || 'unknown',
    includeHeaders = true,
    excludePaths = ['/api/health', '/api/system/status'],
  } = options;

  return async function rateLimiterMiddleware(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Skip excluded paths
    const path = req.nextUrl.pathname;
    if (excludePaths.some(excludePath => path.startsWith(excludePath))) {
      return handler(req);
    }

    // Get rate limit key
    const key = await getKey(req);
    
    // Get user tier
    const tier = await getUserTier(req);
    
    // Get rate limit config for tier
    const config = rateLimits[tier] || DEFAULT_RATE_LIMITS.anonymous;
    
    // Check if request should be rate limited
    const { limited, reason } = rateLimitStore.shouldRateLimit(key, config);
    
    if (limited) {
      // Log rate limit exceeded
      auditLogger.logEvent(
        AuditEventType.RATE_LIMIT_EXCEEDED,
        {
          ipAddress: req.ip,
          userAgent: req.headers.get('user-agent') || undefined,
        },
        {
          path,
          method: req.method,
          tier,
          reason,
          key,
        },
        RiskLevel.MEDIUM
      );
      
      // Return rate limit response
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: reason || 'Too many requests',
          retryAfter: rateLimitStore.getUsage(key).cooldownRemaining || 60,
        },
        {
          status: 429,
          statusText: 'Too Many Requests',
        }
      );
      
      // Add rate limit headers
      if (includeHeaders) {
        const usage = rateLimitStore.getUsage(key);
        
        response.headers.set('X-RateLimit-Limit-Minute', config.requestsPerMinute.toString());
        response.headers.set('X-RateLimit-Remaining-Minute', Math.max(0, config.requestsPerMinute - usage.minuteCount).toString());
        response.headers.set('X-RateLimit-Limit-Hour', config.requestsPerHour.toString());
        response.headers.set('X-RateLimit-Remaining-Hour', Math.max(0, config.requestsPerHour - usage.hourCount).toString());
        
        if (usage.inCooldown && usage.cooldownRemaining) {
          response.headers.set('Retry-After', usage.cooldownRemaining.toString());
        }
      }
      
      return response;
    }
    
    // Increment request count
    rateLimitStore.incrementRequest(key);
    
    // Process the request
    const response = await handler(req);
    
    // Add rate limit headers to response
    if (includeHeaders) {
      const usage = rateLimitStore.getUsage(key);
      
      response.headers.set('X-RateLimit-Limit-Minute', config.requestsPerMinute.toString());
      response.headers.set('X-RateLimit-Remaining-Minute', Math.max(0, config.requestsPerMinute - usage.minuteCount).toString());
      response.headers.set('X-RateLimit-Limit-Hour', config.requestsPerHour.toString());
      response.headers.set('X-RateLimit-Remaining-Hour', Math.max(0, config.requestsPerHour - usage.hourCount).toString());
    }
    
    return response;
  };
}

/**
 * Helper to get user tier from request
 */
export async function getUserTierFromRequest(req: NextRequest): Promise<string> {
  // In a real implementation, this would check the user's authentication and subscription status
  // For now, we'll use a simple header-based approach for testing
  
  const tierHeader = req.headers.get('x-user-tier');
  if (tierHeader && ['free', 'premium', 'admin'].includes(tierHeader)) {
    return tierHeader;
  }
  
  // Check for authentication
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    // In a real implementation, we would validate the token and get the user's tier
    // For now, we'll assume authenticated users are at least 'free' tier
    return 'free';
  }
  
  return 'anonymous';
}