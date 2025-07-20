/**
 * Enhanced Rate Limiter with Advanced API Protection
 * Provides comprehensive rate limiting, DDoS protection, and API security
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditLogger, AuditEventType, RiskLevel } from './auditLogger';
import crypto from 'crypto';

/**
 * Enhanced rate limit configuration
 */
export interface EnhancedRateLimitConfig {
  // Basic rate limits
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  
  // Burst protection
  burstLimit: number;
  burstWindowMs: number;
  burstCooldownMs: number;
  
  // Advanced protection
  concurrentRequestLimit: number;
  slowRequestThresholdMs: number;
  maxSlowRequests: number;
  
  // API-specific limits
  uploadLimitMB: number;
  maxFileUploads: number;
  
  // Geographic restrictions
  allowedCountries?: string[];
  blockedCountries?: string[];
}

/**
 * Request fingerprinting for advanced threat detection
 */
interface RequestFingerprint {
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  fingerprint: string;
}

/**
 * Threat detection patterns
 */
interface ThreatPattern {
  type: 'bot' | 'scraper' | 'ddos' | 'bruteforce' | 'suspicious';
  confidence: number;
  indicators: string[];
}

/**
 * Enhanced rate limit configurations by tier
 */
const ENHANCED_RATE_LIMITS: Record<string, EnhancedRateLimitConfig> = {
  anonymous: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 500,
    burstLimit: 15,
    burstWindowMs: 10000,
    burstCooldownMs: 60000,
    concurrentRequestLimit: 3,
    slowRequestThresholdMs: 5000,
    maxSlowRequests: 5,
    uploadLimitMB: 10,
    maxFileUploads: 3,
    blockedCountries: ['CN', 'RU', 'KP'] // High-risk countries
  },
  
  free: {
    requestsPerMinute: 30,
    requestsPerHour: 300,
    requestsPerDay: 1500,
    burstLimit: 40,
    burstWindowMs: 10000,
    burstCooldownMs: 30000,
    concurrentRequestLimit: 5,
    slowRequestThresholdMs: 10000,
    maxSlowRequests: 10,
    uploadLimitMB: 25,
    maxFileUploads: 10
  },
  
  premium: {
    requestsPerMinute: 100,
    requestsPerHour: 2000,
    requestsPerDay: 10000,
    burstLimit: 150,
    burstWindowMs: 10000,
    burstCooldownMs: 15000,
    concurrentRequestLimit: 10,
    slowRequestThresholdMs: 15000,
    maxSlowRequests: 20,
    uploadLimitMB: 100,
    maxFileUploads: 50
  },
  
  admin: {
    requestsPerMinute: 500,
    requestsPerHour: 10000,
    requestsPerDay: 100000,
    burstLimit: 1000,
    burstWindowMs: 10000,
    burstCooldownMs: 5000,
    concurrentRequestLimit: 25,
    slowRequestThresholdMs: 30000,
    maxSlowRequests: 100,
    uploadLimitMB: 500,
    maxFileUploads: 1000
  }
};

/**
 * Bot detection patterns
 */
const BOT_PATTERNS = {
  userAgents: [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python-requests/i,
    /postman/i, /insomnia/i, /httpie/i
  ],
  suspiciousHeaders: [
    'x-forwarded-for',
    'x-real-ip',
    'x-cluster-client-ip'
  ]
};

/**
 * Enhanced rate limit store with threat detection
 */
class EnhancedRateLimitStore {
  private counters = new Map<string, any>();
  private fingerprints = new Map<string, RequestFingerprint>();
  private threatScores = new Map<string, number>();
  private blockedIPs = new Set<string>();
  private concurrentRequests = new Map<string, number>();
  private requestTimes = new Map<string, number[]>();
  
  /**
   * Check if request should be blocked
   */
  shouldBlock(req: NextRequest, config: EnhancedRateLimitConfig): {
    blocked: boolean;
    reason?: string;
    threatLevel?: number;
  } {
    const ip = this.getClientIP(req);
    const fingerprint = this.generateFingerprint(req);
    
    // Check if IP is already blocked
    if (this.blockedIPs.has(ip)) {
      return { blocked: true, reason: 'IP blocked due to previous violations' };
    }
    
    // Check geographic restrictions
    const geoCheck = this.checkGeographicRestrictions(req, config);
    if (geoCheck.blocked) {
      return geoCheck;
    }
    
    // Check threat patterns
    const threatPattern = this.detectThreatPattern(req, fingerprint);
    if (threatPattern && threatPattern.confidence > 0.8) {
      this.incrementThreatScore(ip, threatPattern.confidence);
      if (this.getThreatScore(ip) > 0.9) {
        this.blockIP(ip, 3600000); // Block for 1 hour
        return { 
          blocked: true, 
          reason: `Threat detected: ${threatPattern.type}`,
          threatLevel: threatPattern.confidence
        };
      }
    }
    
    // Check rate limits
    return this.checkRateLimits(ip, config);
  }
  
  /**
   * Generate request fingerprint
   */
  private generateFingerprint(req: NextRequest): RequestFingerprint {
    const ip = this.getClientIP(req);
    const userAgent = req.headers.get('user-agent') || '';
    const acceptLanguage = req.headers.get('accept-language') || '';
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    
    const fingerprintData = `${ip}:${userAgent}:${acceptLanguage}:${acceptEncoding}`;
    const fingerprint = crypto.createHash('sha256').update(fingerprintData).digest('hex');
    
    const result: RequestFingerprint = {
      ip,
      userAgent,
      acceptLanguage,
      acceptEncoding,
      fingerprint
    };
    
    this.fingerprints.set(fingerprint, result);
    return result;
  }
  
  /**
   * Detect threat patterns
   */
  private detectThreatPattern(req: NextRequest, fingerprint: RequestFingerprint): ThreatPattern | null {
    const indicators: string[] = [];
    let confidence = 0;
    let type: ThreatPattern['type'] = 'suspicious';
    
    // Check for bot patterns
    const userAgent = fingerprint.userAgent.toLowerCase();
    for (const pattern of BOT_PATTERNS.userAgents) {
      if (pattern.test(userAgent)) {
        indicators.push('Bot user agent detected');
        confidence += 0.4;
        type = 'bot';
        break;
      }
    }
    
    // Check for missing common headers
    if (!req.headers.get('accept')) {
      indicators.push('Missing Accept header');
      confidence += 0.2;
    }
    
    if (!req.headers.get('accept-language')) {
      indicators.push('Missing Accept-Language header');
      confidence += 0.2;
    }
    
    // Check for suspicious proxy headers
    for (const header of BOT_PATTERNS.suspiciousHeaders) {
      if (req.headers.get(header)) {
        indicators.push(`Proxy header detected: ${header}`);
        confidence += 0.1;
      }
    }
    
    // Check request patterns for DDoS
    const recentRequests = this.getRecentRequestTimes(fingerprint.ip);
    if (recentRequests.length > 50) {
      indicators.push('Excessive request frequency');
      confidence += 0.5;
      type = 'ddos';
    }
    
    // Check for brute force patterns on auth endpoints
    if (req.nextUrl.pathname.includes('/auth/') && recentRequests.length > 10) {
      indicators.push('Potential brute force on auth endpoint');
      confidence += 0.6;
      type = 'bruteforce';
    }
    
    return confidence > 0.3 ? { type, confidence, indicators } : null;
  }
  
  /**
   * Check geographic restrictions
   */
  private checkGeographicRestrictions(req: NextRequest, config: EnhancedRateLimitConfig): {
    blocked: boolean;
    reason?: string;
  } {
    // In a production environment, you would use a GeoIP service
    // For now, we'll use a simple header-based approach
    const countryCode = req.headers.get('cf-ipcountry') || req.headers.get('x-country-code');
    
    if (countryCode) {
      if (config.blockedCountries?.includes(countryCode)) {
        return { 
          blocked: true, 
          reason: `Requests from ${countryCode} are not allowed` 
        };
      }
      
      if (config.allowedCountries && !config.allowedCountries.includes(countryCode)) {
        return { 
          blocked: true, 
          reason: `Requests only allowed from specified countries` 
        };
      }
    }
    
    return { blocked: false };
  }
  
  /**
   * Check rate limits
   */
  private checkRateLimits(ip: string, config: EnhancedRateLimitConfig): {
    blocked: boolean;
    reason?: string;
  } {
    const now = Date.now();
    const key = ip;
    
    // Initialize counters if they don't exist
    if (!this.counters.has(key)) {
      this.counters.set(key, {
        minute: { count: 0, resetAt: now + 60000 },
        hour: { count: 0, resetAt: now + 3600000 },
        day: { count: 0, resetAt: now + 86400000 },
        burst: { count: 0, resetAt: now + config.burstWindowMs }
      });
    }
    
    const counters = this.counters.get(key);
    
    // Reset expired counters
    if (counters.minute.resetAt <= now) {
      counters.minute = { count: 0, resetAt: now + 60000 };
    }
    if (counters.hour.resetAt <= now) {
      counters.hour = { count: 0, resetAt: now + 3600000 };
    }
    if (counters.day.resetAt <= now) {
      counters.day = { count: 0, resetAt: now + 86400000 };
    }
    if (counters.burst.resetAt <= now) {
      counters.burst = { count: 0, resetAt: now + config.burstWindowMs };
    }
    
    // Check limits
    if (counters.minute.count >= config.requestsPerMinute) {
      return { blocked: true, reason: 'Minute rate limit exceeded' };
    }
    if (counters.hour.count >= config.requestsPerHour) {
      return { blocked: true, reason: 'Hour rate limit exceeded' };
    }
    if (counters.day.count >= config.requestsPerDay) {
      return { blocked: true, reason: 'Daily rate limit exceeded' };
    }
    if (counters.burst.count >= config.burstLimit) {
      return { blocked: true, reason: 'Burst rate limit exceeded' };
    }
    
    return { blocked: false };
  }
  
  /**
   * Increment request counters
   */
  incrementCounters(ip: string, config: EnhancedRateLimitConfig): void {
    const now = Date.now();
    const key = ip;
    
    if (!this.counters.has(key)) {
      this.counters.set(key, {
        minute: { count: 0, resetAt: now + 60000 },
        hour: { count: 0, resetAt: now + 3600000 },
        day: { count: 0, resetAt: now + 86400000 },
        burst: { count: 0, resetAt: now + config.burstWindowMs }
      });
    }
    
    const counters = this.counters.get(key);
    counters.minute.count++;
    counters.hour.count++;
    counters.day.count++;
    counters.burst.count++;
    
    // Track request timing
    this.trackRequestTime(ip, now);
  }
  
  /**
   * Track concurrent requests
   */
  incrementConcurrentRequests(ip: string): number {
    const current = this.concurrentRequests.get(ip) || 0;
    const newCount = current + 1;
    this.concurrentRequests.set(ip, newCount);
    return newCount;
  }
  
  decrementConcurrentRequests(ip: string): void {
    const current = this.concurrentRequests.get(ip) || 0;
    if (current > 0) {
      this.concurrentRequests.set(ip, current - 1);
    }
  }
  
  /**
   * Track request timing for pattern analysis
   */
  private trackRequestTime(ip: string, timestamp: number): void {
    if (!this.requestTimes.has(ip)) {
      this.requestTimes.set(ip, []);
    }
    
    const times = this.requestTimes.get(ip)!;
    times.push(timestamp);
    
    // Keep only last 100 requests
    if (times.length > 100) {
      times.splice(0, times.length - 100);
    }
  }
  
  /**
   * Get recent request times for analysis
   */
  private getRecentRequestTimes(ip: string): number[] {
    const times = this.requestTimes.get(ip) || [];
    const cutoff = Date.now() - 300000; // Last 5 minutes
    return times.filter(time => time > cutoff);
  }
  
  /**
   * Get client IP address
   */
  private getClientIP(req: NextRequest): string {
    // Check various headers for real IP
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    
    const realIP = req.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }
    
    const clusterIP = req.headers.get('x-cluster-client-ip');
    if (clusterIP) {
      return clusterIP;
    }
    
    return req.ip || 'unknown';
  }
  
  /**
   * Increment threat score for IP
   */
  private incrementThreatScore(ip: string, amount: number): void {
    const current = this.threatScores.get(ip) || 0;
    this.threatScores.set(ip, Math.min(1, current + amount));
  }
  
  /**
   * Get threat score for IP
   */
  private getThreatScore(ip: string): number {
    return this.threatScores.get(ip) || 0;
  }
  
  /**
   * Block IP address
   */
  private blockIP(ip: string, durationMs: number): void {
    this.blockedIPs.add(ip);
    
    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      this.threatScores.delete(ip);
    }, durationMs);
  }
  
  /**
   * Get usage statistics
   */
  getUsageStats(ip: string): any {
    const counters = this.counters.get(ip);
    const concurrent = this.concurrentRequests.get(ip) || 0;
    const threatScore = this.getThreatScore(ip);
    
    return {
      counters: counters || null,
      concurrentRequests: concurrent,
      threatScore,
      isBlocked: this.blockedIPs.has(ip)
    };
  }
  
  /**
   * Cleanup expired data
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean up expired counters
    for (const [key, counters] of this.counters.entries()) {
      const allExpired = 
        counters.minute.resetAt <= now &&
        counters.hour.resetAt <= now &&
        counters.day.resetAt <= now &&
        counters.burst.resetAt <= now;
      
      if (allExpired) {
        this.counters.delete(key);
      }
    }
    
    // Clean up old request times
    const cutoff = now - 3600000; // 1 hour ago
    for (const [ip, times] of this.requestTimes.entries()) {
      const recentTimes = times.filter(time => time > cutoff);
      if (recentTimes.length === 0) {
        this.requestTimes.delete(ip);
      } else {
        this.requestTimes.set(ip, recentTimes);
      }
    }
    
    // Clean up zero concurrent requests
    for (const [ip, count] of this.concurrentRequests.entries()) {
      if (count === 0) {
        this.concurrentRequests.delete(ip);
      }
    }
  }
}

// Create singleton store
const enhancedRateLimitStore = new EnhancedRateLimitStore();

// Start periodic cleanup
setInterval(() => {
  enhancedRateLimitStore.cleanup();
}, 300000); // Clean up every 5 minutes

/**
 * Enhanced rate limiter options
 */
export interface EnhancedRateLimiterOptions {
  getUserTier?: (req: NextRequest) => Promise<string> | string;
  rateLimits?: Record<string, EnhancedRateLimitConfig>;
  includeHeaders?: boolean;
  excludePaths?: string[];
  enableThreatDetection?: boolean;
  enableGeographicFiltering?: boolean;
}

/**
 * Create enhanced rate limiter middleware
 */
export function createEnhancedRateLimiter(options: EnhancedRateLimiterOptions = {}) {
  const {
    getUserTier = () => 'anonymous',
    rateLimits = ENHANCED_RATE_LIMITS,
    includeHeaders = true,
    excludePaths = ['/api/health', '/api/system/status'],
    enableThreatDetection = true,
    enableGeographicFiltering = true
  } = options;

  return async function enhancedRateLimiterMiddleware(
    req: NextRequest
  ): Promise<NextResponse | null> {
    // Skip excluded paths
    const path = req.nextUrl.pathname;
    if (excludePaths.some(excludePath => path.startsWith(excludePath))) {
      return null; // Continue to next middleware
    }

    // Get user tier and configuration
    const tier = await getUserTier(req);
    const config = rateLimits[tier] || ENHANCED_RATE_LIMITS.anonymous;
    const ip = enhancedRateLimitStore['getClientIP'](req);
    
    // Check concurrent request limit
    const concurrentCount = enhancedRateLimitStore.incrementConcurrentRequests(ip);
    if (concurrentCount > config.concurrentRequestLimit) {
      enhancedRateLimitStore.decrementConcurrentRequests(ip);
      
      auditLogger.logEvent(
        AuditEventType.RATE_LIMIT_EXCEEDED,
        { ipAddress: ip, userAgent: req.headers.get('user-agent') || undefined },
        { 
          path, 
          method: req.method, 
          tier, 
          reason: `Concurrent request limit exceeded: ${concurrentCount}/${config.concurrentRequestLimit}`,
          type: 'concurrent_limit'
        },
        RiskLevel.HIGH
      );
      
      return NextResponse.json(
        {
          error: 'Too many concurrent requests',
          message: `Maximum ${config.concurrentRequestLimit} concurrent requests allowed`,
          retryAfter: 60
        },
        { status: 429 }
      );
    }
    
    // Check if request should be blocked
    const blockCheck = enhancedRateLimitStore.shouldBlock(req, config);
    if (blockCheck.blocked) {
      enhancedRateLimitStore.decrementConcurrentRequests(ip);
      
      auditLogger.logEvent(
        AuditEventType.SECURITY_THREAT_DETECTED,
        { ipAddress: ip, userAgent: req.headers.get('user-agent') || undefined },
        { 
          path, 
          method: req.method, 
          tier, 
          reason: blockCheck.reason,
          threatLevel: blockCheck.threatLevel,
          type: 'request_blocked'
        },
        blockCheck.threatLevel && blockCheck.threatLevel > 0.8 ? RiskLevel.CRITICAL : RiskLevel.HIGH
      );
      
      return NextResponse.json(
        {
          error: 'Request blocked',
          message: blockCheck.reason || 'Security policy violation',
          retryAfter: 3600 // 1 hour
        },
        { status: 403 }
      );
    }
    
    // Increment counters
    enhancedRateLimitStore.incrementCounters(ip, config);
    
    return null; // Continue to next middleware
  };
}

/**
 * Middleware to decrement concurrent requests after response
 */
export function createRequestCleanupMiddleware() {
  return function requestCleanupMiddleware(
    req: NextRequest,
    response: NextResponse
  ): NextResponse {
    const ip = enhancedRateLimitStore['getClientIP'](req);
    enhancedRateLimitStore.decrementConcurrentRequests(ip);
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    return response;
  };
}

export { enhancedRateLimitStore, ENHANCED_RATE_LIMITS };
