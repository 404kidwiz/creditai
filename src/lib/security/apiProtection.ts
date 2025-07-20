/**
 * Comprehensive API Protection Middleware
 * Provides multiple layers of security for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createEnhancedRateLimiter, createRequestCleanupMiddleware } from './enhancedRateLimiter';
import { auditLogger, AuditEventType, RiskLevel } from './auditLogger';
import crypto from 'crypto';
import { z } from 'zod';

/**
 * API Security Configuration
 */
export interface APISecurityConfig {
  // Rate limiting
  enableRateLimiting: boolean;
  
  // Request validation
  maxRequestSize: number; // bytes
  allowedMethods: string[];
  requireHttps: boolean;
  
  // Authentication
  requireAuth: boolean;
  allowedRoles?: string[];
  
  // Input validation
  sanitizeInput: boolean;
  validateContentType: boolean;
  allowedContentTypes: string[];
  
  // DDoS protection
  enableDDoSProtection: boolean;
  suspiciousPatternDetection: boolean;
  
  // CORS settings
  corsEnabled: boolean;
  allowedOrigins?: string[];
  allowedHeaders?: string[];
  
  // Security headers
  securityHeaders: boolean;
  
  // File upload protection
  fileUploadProtection: boolean;
  maxFileSize: number; // bytes
  allowedFileTypes: string[];
  scanUploads: boolean;
}

/**
 * Default security configuration
 */
const DEFAULT_SECURITY_CONFIG: APISecurityConfig = {
  enableRateLimiting: true,
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  requireHttps: process.env.NODE_ENV === 'production',
  requireAuth: false,
  sanitizeInput: true,
  validateContentType: true,
  allowedContentTypes: [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain'
  ],
  enableDDoSProtection: true,
  suspiciousPatternDetection: true,
  corsEnabled: true,
  allowedOrigins: [
    'http://localhost:3000',
    'https://creditai.com',
    'https://*.creditai.com'
  ],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  securityHeaders: true,
  fileUploadProtection: true,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.txt'],
  scanUploads: true
};

/**
 * Malicious payload patterns
 */
const MALICIOUS_PATTERNS = [
  // SQL Injection
  /('|(\-\-)|(;)|(\||\|)|(\*|\*))|(union|select|insert|delete|update|drop|create|alter)/i,
  
  // XSS
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  
  // Command Injection
  /(;|\||&|`|\$\(|\${)/,
  
  // Path Traversal
  /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/gi,
  
  // XXE
  /<!ENTITY/gi,
  
  // LDAP Injection
  /[()&|!=<>~*]/
];

/**
 * Suspicious request patterns
 */
const SUSPICIOUS_PATTERNS = {
  // Common attack tools
  userAgents: [
    /sqlmap/i,
    /nmap/i,
    /nikto/i,
    /burp/i,
    /metasploit/i,
    /havij/i,
    /acunetix/i
  ],
  
  // Suspicious parameters
  parameters: [
    'cmd',
    'exec',
    'system',
    'shell',
    'passthru',
    'eval',
    'assert',
    'include',
    'require'
  ],
  
  // Suspicious file extensions in requests
  fileExtensions: [
    '.php',
    '.asp',
    '.aspx',
    '.jsp',
    '.exe',
    '.bat',
    '.cmd',
    '.sh'
  ]
};

/**
 * Input sanitization utilities
 */
class InputSanitizer {
  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>"']/g, '') // Remove HTML-like characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
  
  /**
   * Validate and sanitize JSON input
   */
  static sanitizeJSON(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeJSON(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeJSON(value);
      }
      return sanitized;
    }
    
    return input;
  }
  
  /**
   * Check for malicious patterns in input
   */
  static containsMaliciousContent(input: string): boolean {
    return MALICIOUS_PATTERNS.some(pattern => pattern.test(input));
  }
  
  /**
   * Check for suspicious patterns in request
   */
  static containsSuspiciousPatterns(req: NextRequest): {
    suspicious: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    
    // Check user agent
    const userAgent = req.headers.get('user-agent') || '';
    for (const pattern of SUSPICIOUS_PATTERNS.userAgents) {
      if (pattern.test(userAgent)) {
        reasons.push(`Suspicious user agent: ${userAgent}`);
        break;
      }
    }
    
    // Check URL parameters
    const url = req.nextUrl;
    for (const [key, value] of url.searchParams.entries()) {
      if (SUSPICIOUS_PATTERNS.parameters.includes(key.toLowerCase())) {
        reasons.push(`Suspicious parameter: ${key}`);
      }
      
      if (this.containsMaliciousContent(value)) {
        reasons.push(`Malicious content in parameter: ${key}`);
      }
    }
    
    // Check path
    const path = url.pathname;
    for (const ext of SUSPICIOUS_PATTERNS.fileExtensions) {
      if (path.endsWith(ext)) {
        reasons.push(`Suspicious file extension in path: ${ext}`);
      }
    }
    
    return {
      suspicious: reasons.length > 0,
      reasons
    };
  }
}

/**
 * Request validator
 */
class RequestValidator {
  /**
   * Validate request method
   */
  static validateMethod(req: NextRequest, allowedMethods: string[]): boolean {
    return allowedMethods.includes(req.method);
  }
  
  /**
   * Validate content type
   */
  static validateContentType(req: NextRequest, allowedTypes: string[]): boolean {
    const contentType = req.headers.get('content-type');
    if (!contentType) return true; // Allow requests without content-type
    
    return allowedTypes.some(type => contentType.startsWith(type));
  }
  
  /**
   * Validate request size
   */
  static validateRequestSize(req: NextRequest, maxSize: number): boolean {
    const contentLength = req.headers.get('content-length');
    if (!contentLength) return true; // Allow requests without content-length
    
    return parseInt(contentLength) <= maxSize;
  }
  
  /**
   * Validate HTTPS requirement
   */
  static validateHTTPS(req: NextRequest): boolean {
    const protocol = req.nextUrl.protocol;
    const isLocalhost = req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
    
    return protocol === 'https:' || isLocalhost;
  }
  
  /**
   * Validate file upload
   */
  static async validateFileUpload(
    req: NextRequest,
    maxSize: number,
    allowedTypes: string[]
  ): Promise<{ valid: boolean; reason?: string }> {
    const contentType = req.headers.get('content-type');
    
    if (!contentType?.startsWith('multipart/form-data')) {
      return { valid: true }; // Not a file upload
    }
    
    try {
      const formData = await req.formData();
      
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // Check file size
          if (value.size > maxSize) {
            return {
              valid: false,
              reason: `File size exceeds limit: ${value.size} > ${maxSize}`
            };
          }
          
          // Check file type
          const fileExtension = '.' + (value.name.split('.').pop()?.toLowerCase() || '');
          if (!allowedTypes.includes(fileExtension)) {
            return {
              valid: false,
              reason: `File type not allowed: ${fileExtension}`
            };
          }
          
          // Check for malicious file content (basic check)
          if (await this.containsMaliciousFileContent(value)) {
            return {
              valid: false,
              reason: 'File contains potentially malicious content'
            };
          }
        }
      }
    } catch (error) {
      return {
        valid: false,
        reason: 'Invalid form data'
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Basic malicious file content detection
   */
  private static async containsMaliciousFileContent(file: File): Promise<boolean> {
    // Read first 1KB for analysis
    const buffer = await file.slice(0, 1024).arrayBuffer();
    const content = new TextDecoder().decode(buffer);
    
    // Check for common malicious patterns
    const maliciousPatterns = [
      /<\?php/i,
      /<%.*%>/i,
      /javascript:/i,
      /<script/i,
      /eval\(/i,
      /system\(/i,
      /exec\(/i
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(content));
  }
}

/**
 * CORS handler
 */
class CORSHandler {
  static handleCORS(
    req: NextRequest,
    config: APISecurityConfig
  ): NextResponse | null {
    if (!config.corsEnabled) return null;
    
    const origin = req.headers.get('origin');
    const method = req.method;
    
    // Handle preflight requests
    if (method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      
      // Set CORS headers
      if (origin && this.isAllowedOrigin(origin, config.allowedOrigins || [])) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }
      
      response.headers.set(
        'Access-Control-Allow-Methods',
        config.allowedMethods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS'
      );
      
      response.headers.set(
        'Access-Control-Allow-Headers',
        config.allowedHeaders?.join(', ') || 'Content-Type, Authorization'
      );
      
      response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
      
      return response;
    }
    
    return null;
  }
  
  static addCORSHeaders(
    response: NextResponse,
    req: NextRequest,
    config: APISecurityConfig
  ): void {
    if (!config.corsEnabled) return;
    
    const origin = req.headers.get('origin');
    
    if (origin && this.isAllowedOrigin(origin, config.allowedOrigins || [])) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  private static isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
    return allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowed === origin;
    });
  }
}

/**
 * Main API Protection Middleware
 */
export class APIProtectionMiddleware {
  private rateLimiter: ReturnType<typeof createEnhancedRateLimiter>;
  private requestCleanup: ReturnType<typeof createRequestCleanupMiddleware>;
  private config: APISecurityConfig;
  
  constructor(config: Partial<APISecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
    this.rateLimiter = createEnhancedRateLimiter();
    this.requestCleanup = createRequestCleanupMiddleware();
  }
  
  /**
   * Main middleware function
   */
  async protect(req: NextRequest): Promise<NextResponse | null> {
    const startTime = Date.now();
    
    try {
      // Handle CORS preflight
      const corsResponse = CORSHandler.handleCORS(req, this.config);
      if (corsResponse) return corsResponse;
      
      // Validate HTTPS requirement
      if (this.config.requireHttps && !RequestValidator.validateHTTPS(req)) {
        return this.createErrorResponse(
          'HTTPS required',
          'This endpoint requires a secure connection',
          400,
          req
        );
      }
      
      // Validate HTTP method
      if (!RequestValidator.validateMethod(req, this.config.allowedMethods)) {
        return this.createErrorResponse(
          'Method not allowed',
          `Method ${req.method} is not allowed`,
          405,
          req
        );
      }
      
      // Validate content type
      if (this.config.validateContentType && 
          !RequestValidator.validateContentType(req, this.config.allowedContentTypes)) {
        return this.createErrorResponse(
          'Invalid content type',
          'Content type is not supported',
          415,
          req
        );
      }
      
      // Validate request size
      if (!RequestValidator.validateRequestSize(req, this.config.maxRequestSize)) {
        return this.createErrorResponse(
          'Request too large',
          `Request size exceeds limit of ${this.config.maxRequestSize} bytes`,
          413,
          req
        );
      }
      
      // Check for suspicious patterns
      if (this.config.suspiciousPatternDetection) {
        const suspiciousCheck = InputSanitizer.containsSuspiciousPatterns(req);
        if (suspiciousCheck.suspicious) {
          auditLogger.logEvent(
            AuditEventType.SECURITY_THREAT_DETECTED,
            {
              ipAddress: this.getClientIP(req),
              userAgent: req.headers.get('user-agent') || undefined
            },
            {
              path: req.nextUrl.pathname,
              method: req.method,
              reasons: suspiciousCheck.reasons,
              type: 'suspicious_patterns'
            },
            RiskLevel.HIGH
          );
          
          return this.createErrorResponse(
            'Suspicious request detected',
            'Request contains suspicious patterns',
            403,
            req
          );
        }
      }
      
      // Validate file uploads
      if (this.config.fileUploadProtection) {
        const fileValidation = await RequestValidator.validateFileUpload(
          req,
          this.config.maxFileSize,
          this.config.allowedFileTypes
        );
        
        if (!fileValidation.valid) {
          return this.createErrorResponse(
            'File upload validation failed',
            fileValidation.reason || 'Invalid file upload',
            400,
            req
          );
        }
      }
      
      // Apply rate limiting
      if (this.config.enableRateLimiting) {
        const rateLimitResponse = await this.rateLimiter(req);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }
      
      // Log successful request
      auditLogger.logEvent(
        AuditEventType.API_ACCESS,
        {
          ipAddress: this.getClientIP(req),
          userAgent: req.headers.get('user-agent') || undefined
        },
        {
          path: req.nextUrl.pathname,
          method: req.method,
          processingTime: Date.now() - startTime
        },
        RiskLevel.LOW
      );
      
      return null; // Continue to next middleware
      
    } catch (error) {
      auditLogger.logEvent(
        AuditEventType.SYSTEM_ERROR,
        {
          ipAddress: this.getClientIP(req),
          userAgent: req.headers.get('user-agent') || undefined
        },
        {
          path: req.nextUrl.pathname,
          method: req.method,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime: Date.now() - startTime
        },
        RiskLevel.HIGH
      );
      
      return this.createErrorResponse(
        'Internal security error',
        'An error occurred while processing the request',
        500,
        req
      );
    }
  }
  
  /**
   * Process response (add security headers, etc.)
   */
  processResponse(req: NextRequest, response: NextResponse): NextResponse {
    // Add security headers
    if (this.config.securityHeaders) {
      this.addSecurityHeaders(response);
    }
    
    // Add CORS headers
    CORSHandler.addCORSHeaders(response, req, this.config);
    
    // Clean up request state
    return this.requestCleanup(req, response);
  }
  
  /**
   * Create standardized error response
   */
  private createErrorResponse(
    error: string,
    message: string,
    status: number,
    req: NextRequest
  ): NextResponse {
    const response = NextResponse.json(
      {
        error,
        message,
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      },
      { status }
    );
    
    // Add security headers to error responses too
    if (this.config.securityHeaders) {
      this.addSecurityHeaders(response);
    }
    
    return response;
  }
  
  /**
   * Add comprehensive security headers
   */
  private addSecurityHeaders(response: NextResponse): void {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set('Content-Security-Policy', 
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set('X-Powered-By', ''); // Remove server fingerprinting
  }
  
  /**
   * Get client IP address
   */
  private getClientIP(req: NextRequest): string {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    
    return req.ip || 'unknown';
  }
}

/**
 * Create API protection middleware with custom configuration
 */
export function createAPIProtection(config?: Partial<APISecurityConfig>) {
  return new APIProtectionMiddleware(config);
}

export { DEFAULT_SECURITY_CONFIG, InputSanitizer, RequestValidator };
