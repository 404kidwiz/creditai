/**
 * CDN Integration and Browser Caching Strategies
 * PERF-4.3: CDN optimization with intelligent cache control
 */

import { logger } from '@/lib/logging'
import { multiLayerCache } from '@/lib/cache/multiLayerCache'

export interface CDNConfig {
  provider: 'cloudflare' | 'aws' | 'fastly' | 'generic'
  endpoints: {
    api: string
    static: string
    images: string
    fonts: string
  }
  zones: {
    static: string
    api: string
  }
  purgeApiKey?: string
  cacheHeaders: Record<string, string>
  compressionEnabled: boolean
  brotliEnabled: boolean
  edgeCaching: boolean
}

export interface CachePolicy {
  path: string
  maxAge: number
  sMaxAge?: number
  staleWhileRevalidate?: number
  staleIfError?: number
  mustRevalidate?: boolean
  noCache?: boolean
  noStore?: boolean
  private?: boolean
  immutable?: boolean
  vary?: string[]
  etag?: boolean
}

export interface AssetOptimization {
  images: {
    formats: string[]
    quality: number
    progressive: boolean
    lazyLoading: boolean
    responsiveImages: boolean
  }
  fonts: {
    preload: string[]
    fontDisplay: 'auto' | 'block' | 'swap' | 'fallback' | 'optional'
    subsetting: boolean
  }
  scripts: {
    minification: boolean
    compression: boolean
    bundling: boolean
    modulePreload: boolean
  }
  styles: {
    critical: boolean
    inlining: boolean
    purging: boolean
    prefetching: boolean
  }
}

/**
 * CDN and Browser Cache Manager
 */
export class CDNManager {
  private static instance: CDNManager
  private config: CDNConfig
  private cachePolicies: CachePolicy[] = []
  private purgeQueue: Set<string> = new Set()
  private purgeTimeout?: NodeJS.Timeout

  private constructor(config: Partial<CDNConfig> = {}) {
    this.config = {
      provider: 'cloudflare',
      endpoints: {
        api: process.env.CDN_API_ENDPOINT || '',
        static: process.env.CDN_STATIC_ENDPOINT || '',
        images: process.env.CDN_IMAGES_ENDPOINT || '',
        fonts: process.env.CDN_FONTS_ENDPOINT || ''
      },
      zones: {
        static: process.env.CDN_STATIC_ZONE || '',
        api: process.env.CDN_API_ZONE || ''
      },
      purgeApiKey: process.env.CDN_PURGE_API_KEY,
      cacheHeaders: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept-Encoding',
        'X-Content-Type-Options': 'nosniff'
      },
      compressionEnabled: true,
      brotliEnabled: true,
      edgeCaching: true,
      ...config
    }

    this.initializeCachePolicies()
  }

  static getInstance(config?: Partial<CDNConfig>): CDNManager {
    if (!CDNManager.instance) {
      CDNManager.instance = new CDNManager(config)
    }
    return CDNManager.instance
  }

  /**
   * Initialize cache policies for different content types
   */
  private initializeCachePolicies(): void {
    this.cachePolicies = [
      // Static assets - long cache with immutable
      {
        path: '/_next/static/**',
        maxAge: 31536000, // 1 year
        sMaxAge: 31536000,
        immutable: true,
        vary: ['Accept-Encoding']
      },
      
      // Images - long cache with conditional validation
      {
        path: '/images/**',
        maxAge: 2592000, // 30 days
        sMaxAge: 2592000,
        staleWhileRevalidate: 86400, // 1 day
        vary: ['Accept', 'Accept-Encoding']
      },
      
      // Fonts - very long cache
      {
        path: '/fonts/**',
        maxAge: 31536000, // 1 year
        sMaxAge: 31536000,
        immutable: true,
        vary: ['Accept-Encoding']
      },
      
      // API responses - short cache with revalidation
      {
        path: '/api/**',
        maxAge: 300, // 5 minutes
        sMaxAge: 300,
        staleWhileRevalidate: 600, // 10 minutes
        mustRevalidate: true,
        vary: ['Authorization', 'Accept-Encoding']
      },
      
      // HTML pages - medium cache with revalidation
      {
        path: '/**/*.html',
        maxAge: 3600, // 1 hour
        sMaxAge: 3600,
        staleWhileRevalidate: 86400, // 1 day
        vary: ['Accept-Encoding', 'Cookie']
      },
      
      // Service worker - no cache
      {
        path: '/sw.js',
        maxAge: 0,
        noCache: true,
        mustRevalidate: true
      }
    ]
  }

  /**
   * Get appropriate cache headers for a given path
   */
  getCacheHeaders(path: string): Record<string, string> {
    const policy = this.getCachePolicy(path)
    const headers: Record<string, string> = {}

    if (policy.noStore) {
      headers['Cache-Control'] = 'no-store'
      return headers
    }

    if (policy.noCache) {
      headers['Cache-Control'] = 'no-cache, must-revalidate'
      return headers
    }

    const cacheControlParts: string[] = []

    // Visibility
    if (policy.private) {
      cacheControlParts.push('private')
    } else {
      cacheControlParts.push('public')
    }

    // Max age
    if (policy.maxAge !== undefined) {
      cacheControlParts.push(`max-age=${policy.maxAge}`)
    }

    // Shared cache max age
    if (policy.sMaxAge !== undefined) {
      cacheControlParts.push(`s-maxage=${policy.sMaxAge}`)
    }

    // Stale while revalidate
    if (policy.staleWhileRevalidate) {
      cacheControlParts.push(`stale-while-revalidate=${policy.staleWhileRevalidate}`)
    }

    // Stale if error
    if (policy.staleIfError) {
      cacheControlParts.push(`stale-if-error=${policy.staleIfError}`)
    }

    // Must revalidate
    if (policy.mustRevalidate) {
      cacheControlParts.push('must-revalidate')
    }

    // Immutable
    if (policy.immutable) {
      cacheControlParts.push('immutable')
    }

    headers['Cache-Control'] = cacheControlParts.join(', ')

    // Vary header
    if (policy.vary && policy.vary.length > 0) {
      headers['Vary'] = policy.vary.join(', ')
    }

    // ETag support
    if (policy.etag) {
      // ETag would be generated based on content
      headers['ETag'] = `"${this.generateETag(path)}"`
    }

    return headers
  }

  /**
   * Get cache policy for a specific path
   */
  private getCachePolicy(path: string): CachePolicy {
    const matchingPolicy = this.cachePolicies.find(policy => 
      this.matchesPathPattern(path, policy.path)
    )

    return matchingPolicy || {
      path: '/**',
      maxAge: 3600,
      sMaxAge: 3600,
      vary: ['Accept-Encoding']
    }
  }

  /**
   * Check if path matches pattern (supports wildcards)
   */
  private matchesPathPattern(path: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*') // ** matches any path
      .replace(/\*/g, '[^/]*') // * matches any filename
      .replace(/\?/g, '.') // ? matches any character

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(path)
  }

  /**
   * Generate ETag for content
   */
  private generateETag(content: string): string {
    const crypto = require('crypto')
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 16)
  }

  /**
   * Purge CDN cache for specific URLs
   */
  async purgeCache(urls: string[]): Promise<boolean> {
    if (!this.config.purgeApiKey) {
      logger.warn('CDN purge API key not configured')
      return false
    }

    try {
      const response = await this.performCDNPurge(urls)
      
      if (response.success) {
        logger.info('CDN cache purged successfully', { urls: urls.length })
        return true
      } else {
        logger.error('CDN cache purge failed', { error: response.error })
        return false
      }
    } catch (error) {
      logger.error('CDN purge request failed', error)
      return false
    }
  }

  /**
   * Queue URLs for batch purging
   */
  queueForPurge(url: string): void {
    this.purgeQueue.add(url)

    // Clear existing timeout
    if (this.purgeTimeout) {
      clearTimeout(this.purgeTimeout)
    }

    // Batch purge after 5 seconds
    this.purgeTimeout = setTimeout(() => {
      this.processPurgeQueue()
    }, 5000)
  }

  /**
   * Process queued purge requests
   */
  private async processPurgeQueue(): Promise<void> {
    if (this.purgeQueue.size === 0) return

    const urls = Array.from(this.purgeQueue)
    this.purgeQueue.clear()

    await this.purgeCache(urls)
  }

  /**
   * Perform CDN purge based on provider
   */
  private async performCDNPurge(urls: string[]): Promise<{ success: boolean; error?: string }> {
    switch (this.config.provider) {
      case 'cloudflare':
        return this.cloudflareV4Purge(urls)
      case 'aws':
        return this.awsCloudFrontPurge(urls)
      case 'fastly':
        return this.fastlyPurge(urls)
      default:
        return { success: false, error: 'Unsupported CDN provider' }
    }
  }

  /**
   * Cloudflare V4 API purge
   */
  private async cloudflareV4Purge(urls: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.config.zones.static}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.purgeApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: urls })
        }
      )

      const result = await response.json()
      return { success: result.success }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * AWS CloudFront invalidation
   */
  private async awsCloudFrontPurge(urls: string[]): Promise<{ success: boolean; error?: string }> {
    // This would require AWS SDK integration
    logger.warn('AWS CloudFront purge not implemented')
    return { success: false, error: 'AWS CloudFront purge not implemented' }
  }

  /**
   * Fastly cache purge
   */
  private async fastlyPurge(urls: string[]): Promise<{ success: boolean; error?: string }> {
    // This would require Fastly API integration
    logger.warn('Fastly purge not implemented')
    return { success: false, error: 'Fastly purge not implemented' }
  }

  /**
   * Optimize asset delivery
   */
  getOptimizedAssetUrl(
    originalUrl: string,
    optimizations: {
      format?: 'webp' | 'avif' | 'auto'
      quality?: number
      width?: number
      height?: number
      progressive?: boolean
    } = {}
  ): string {
    const { format, quality, width, height, progressive } = optimizations

    // If it's already an optimized URL, return as-is
    if (originalUrl.includes('cdn.') || originalUrl.includes('_next/image')) {
      return originalUrl
    }

    // Build optimization parameters
    const params = new URLSearchParams()
    
    if (format) params.set('f', format)
    if (quality) params.set('q', quality.toString())
    if (width) params.set('w', width.toString())
    if (height) params.set('h', height.toString())
    if (progressive) params.set('p', 'true')

    const baseUrl = this.config.endpoints.images || this.config.endpoints.static
    const separator = originalUrl.includes('?') ? '&' : '?'
    
    return `${baseUrl}${originalUrl}${separator}${params.toString()}`
  }

  /**
   * Generate preload links for critical resources
   */
  generatePreloadLinks(resources: Array<{
    href: string
    as: 'script' | 'style' | 'font' | 'image'
    type?: string
    crossorigin?: boolean
  }>): string[] {
    return resources.map(resource => {
      const attrs = [
        'rel="preload"',
        `href="${resource.href}"`,
        `as="${resource.as}"`
      ]

      if (resource.type) {
        attrs.push(`type="${resource.type}"`)
      }

      if (resource.crossorigin) {
        attrs.push('crossorigin')
      }

      return `<link ${attrs.join(' ')}>`
    })
  }

  /**
   * Generate resource hints for better performance
   */
  generateResourceHints(): string[] {
    const hints: string[] = []

    // DNS prefetch for external domains
    const externalDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'www.google-analytics.com'
    ]

    externalDomains.forEach(domain => {
      hints.push(`<link rel="dns-prefetch" href="//${domain}">`)
    })

    // Preconnect to CDN
    if (this.config.endpoints.static) {
      hints.push(`<link rel="preconnect" href="${this.config.endpoints.static}">`)
    }

    return hints
  }

  /**
   * Set up service worker for advanced caching
   */
  generateServiceWorkerConfig(): {
    staticAssets: string[]
    dynamicCaching: Array<{
      urlPattern: string
      strategy: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate'
      cacheName: string
      maxEntries?: number
      maxAgeSeconds?: number
    }>
  } {
    return {
      staticAssets: [
        '/_next/static/css/',
        '/_next/static/js/',
        '/fonts/',
        '/images/icons/'
      ],
      dynamicCaching: [
        {
          urlPattern: '/_next/static/',
          strategy: 'cacheFirst',
          cacheName: 'static-assets',
          maxEntries: 200,
          maxAgeSeconds: 31536000 // 1 year
        },
        {
          urlPattern: '/api/',
          strategy: 'networkFirst',
          cacheName: 'api-cache',
          maxEntries: 50,
          maxAgeSeconds: 300 // 5 minutes
        },
        {
          urlPattern: '/images/',
          strategy: 'staleWhileRevalidate',
          cacheName: 'images-cache',
          maxEntries: 100,
          maxAgeSeconds: 2592000 // 30 days
        }
      ]
    }
  }

  /**
   * Browser cache warming strategy
   */
  async warmBrowserCache(criticalResources: string[]): Promise<void> {
    if (typeof window === 'undefined') return

    const promises = criticalResources.map(async (url) => {
      try {
        // Use fetch to warm the cache
        const response = await fetch(url, {
          mode: 'no-cors',
          cache: 'force-cache'
        })

        logger.debug('Resource preloaded', { url })
        return response
      } catch (error) {
        logger.warn('Failed to preload resource', { url, error })
      }
    })

    await Promise.allSettled(promises)
    logger.info('Browser cache warming completed', { 
      resources: criticalResources.length 
    })
  }

  /**
   * Check if browser supports modern features
   */
  getBrowserCapabilities(): {
    webp: boolean
    avif: boolean
    brotli: boolean
    serviceWorker: boolean
    intersectionObserver: boolean
    prefetch: boolean
  } {
    if (typeof window === 'undefined') {
      return {
        webp: false,
        avif: false,
        brotli: false,
        serviceWorker: false,
        intersectionObserver: false,
        prefetch: false
      }
    }

    return {
      webp: this.supportsWebP(),
      avif: this.supportsAVIF(),
      brotli: this.supportsBrotli(),
      serviceWorker: 'serviceWorker' in navigator,
      intersectionObserver: 'IntersectionObserver' in window,
      prefetch: this.supportsPrefetch()
    }
  }

  /**
   * Check WebP support
   */
  private supportsWebP(): boolean {
    if (typeof window === 'undefined') return false
    
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5
  }

  /**
   * Check AVIF support
   */
  private supportsAVIF(): boolean {
    if (typeof window === 'undefined') return false
    
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/avif').indexOf('image/avif') === 5
  }

  /**
   * Check Brotli support
   */
  private supportsBrotli(): boolean {
    if (typeof window === 'undefined') return false
    
    const userAgent = navigator.userAgent
    return /Chrome|Firefox|Safari|Edge/.test(userAgent)
  }

  /**
   * Check prefetch support
   */
  private supportsPrefetch(): boolean {
    if (typeof window === 'undefined') return false
    
    const link = document.createElement('link')
    return link.relList && link.relList.supports && link.relList.supports('prefetch')
  }

  /**
   * Get performance metrics for CDN
   */
  async getPerformanceMetrics(): Promise<{
    cacheHitRate: number
    averageResponseTime: number
    bandwidthSaved: number
    totalRequests: number
  }> {
    // This would typically integrate with CDN provider APIs
    // For now, return mock data
    return {
      cacheHitRate: 85.5,
      averageResponseTime: 120,
      bandwidthSaved: 1024 * 1024 * 150, // 150MB
      totalRequests: 10000
    }
  }
}

/**
 * Browser Cache API wrapper
 */
export class BrowserCacheAPI {
  private cacheName = 'creditai-v1'

  /**
   * Check if Cache API is supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'caches' in window
  }

  /**
   * Store response in cache
   */
  async put(request: string | Request, response: Response): Promise<void> {
    if (!this.isSupported()) return

    try {
      const cache = await caches.open(this.cacheName)
      await cache.put(request, response.clone())
    } catch (error) {
      logger.warn('Failed to cache response', error)
    }
  }

  /**
   * Get response from cache
   */
  async match(request: string | Request): Promise<Response | undefined> {
    if (!this.isSupported()) return undefined

    try {
      const cache = await caches.open(this.cacheName)
      return await cache.match(request)
    } catch (error) {
      logger.warn('Failed to get cached response', error)
      return undefined
    }
  }

  /**
   * Delete from cache
   */
  async delete(request: string | Request): Promise<boolean> {
    if (!this.isSupported()) return false

    try {
      const cache = await caches.open(this.cacheName)
      return await cache.delete(request)
    } catch (error) {
      logger.warn('Failed to delete cached response', error)
      return false
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    if (!this.isSupported()) return

    try {
      await caches.delete(this.cacheName)
    } catch (error) {
      logger.warn('Failed to clear cache', error)
    }
  }
}

// Global instances
export const cdnManager = CDNManager.getInstance()
export const browserCache = new BrowserCacheAPI()

// Utility functions
export function addCacheHeaders(response: Response, path: string): Response {
  const headers = cdnManager.getCacheHeaders(path)
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}

export function optimizeImageUrl(url: string, options: {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'auto'
} = {}): string {
  return cdnManager.getOptimizedAssetUrl(url, options)
}