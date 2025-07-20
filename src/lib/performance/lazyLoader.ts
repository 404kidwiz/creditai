// Performance-Optimized Lazy Loading System
// Provides intelligent component and resource loading with advanced caching

export interface LoadingState {
  isLoading: boolean
  error?: Error
  loadTime?: number
  retryCount: number
}

export interface LazyLoadConfig {
  threshold?: number
  rootMargin?: string
  retryAttempts?: number
  retryDelay?: number
  preloadStrategy?: 'viewport' | 'intent' | 'idle'
  priority?: 'high' | 'medium' | 'low'
  chunkName?: string
  prefetchDelay?: number
  fallback?: any
  enableMetrics?: boolean
}

export interface LoadMetrics {
  componentName: string
  loadTime: number
  success: boolean
  cacheHit: boolean
  retryCount: number
  timestamp: number
}

/**
 * Advanced Lazy Loader with intelligent preloading, caching, and performance monitoring
 */
export class AdvancedLazyLoader {
  private static instance: AdvancedLazyLoader
  private static loadedComponents = new Map<string, any>()
  private static loadingPromises = new Map<string, Promise<any>>()
  private static loadingStates = new Map<string, LoadingState>()
  private static preloadQueue: Array<{ key: string; importFn: () => Promise<any>; priority: string }> = []
  private static isProcessingQueue = false
  private static metrics: LoadMetrics[] = []
  private static observers = new Map<string, IntersectionObserver>()
  private static performanceMarks = new Map<string, number>()

  static createLazyComponent<T>(
    importFn: () => Promise<{ default: T }>,
    config: LazyLoadConfig = {}
  ): any {
    const {
      retryAttempts = 3,
      retryDelay = 1000,
      preloadStrategy = 'viewport',
      priority = 'medium',
      chunkName = 'lazy-component',
      prefetchDelay = 100,
      enableMetrics = true
    } = config

    const componentKey = chunkName + '-' + Date.now()

    // Return cached component if available
    if (this.loadedComponents.has(componentKey)) {
      return this.loadedComponents.get(componentKey)
    }

    // Create loading state
    this.loadingStates.set(componentKey, {
      isLoading: false,
      retryCount: 0
    })

    // Load component with retry logic
    const loadComponent = async () => {
      if (this.loadedComponents.has(componentKey)) {
        return this.loadedComponents.get(componentKey)
      }

      const component = await this.loadWithRetry(importFn, retryAttempts, retryDelay, componentKey)
      this.loadedComponents.set(componentKey, component)
      return component
    }

    return loadComponent
  }

  /**
   * Load component/resource with retry mechanism
   */
  static async loadWithRetry(
    importFn: () => Promise<any>,
    maxRetries: number,
    retryDelay: number,
    key: string
  ): Promise<any> {
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)
    }

    const loadingPromise = this.performLoadWithRetry(importFn, maxRetries, retryDelay, key)
    this.loadingPromises.set(key, loadingPromise)

    try {
      const result = await loadingPromise
      this.loadingPromises.delete(key)
      return result
    } catch (error) {
      this.loadingPromises.delete(key)
      throw error
    }
  }

  private static async performLoadWithRetry(
    importFn: () => Promise<any>,
    maxRetries: number,
    retryDelay: number,
    key: string
  ): Promise<any> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = performance.now()
        this.performanceMarks.set(key, startTime)

        const state = this.loadingStates.get(key)
        if (state) {
          state.isLoading = true
          state.retryCount = attempt
        }

        const result = await importFn()
        const loadTime = performance.now() - startTime

        // Update state
        if (state) {
          state.isLoading = false
          state.loadTime = loadTime
        }

        // Record metrics
        this.recordMetric({
          componentName: key,
          loadTime,
          success: true,
          cacheHit: false,
          retryCount: attempt,
          timestamp: Date.now()
        })

        return result.default || result
      } catch (error) {
        const state = this.loadingStates.get(key)
        if (state) {
          state.error = error as Error
        }

        if (attempt === maxRetries) {
          // Record failed metric
          this.recordMetric({
            componentName: key,
            loadTime: 0,
            success: false,
            cacheHit: false,
            retryCount: attempt,
            timestamp: Date.now()
          })
          throw error
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
      }
    }
  }

  /**
   * Intelligent preloading based on user behavior and viewport
   */
  static async intelligentPreload(
    importFn: () => Promise<any>,
    key: string,
    strategy: 'viewport' | 'intent' | 'idle' | 'immediate' = 'viewport'
  ): Promise<void> {
    // Add to preload queue with priority
    this.preloadQueue.push({
      key,
      importFn,
      priority: strategy === 'immediate' ? 'high' : strategy === 'intent' ? 'medium' : 'low'
    })

    // Sort queue by priority
    this.preloadQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
             (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
    })

    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      this.processPreloadQueue()
    }
  }

  private static async processPreloadQueue(): Promise<void> {
    this.isProcessingQueue = true
    const concurrencyLimit = 3

    while (this.preloadQueue.length > 0) {
      const batch = this.preloadQueue.splice(0, concurrencyLimit)
      const processing: Promise<void>[] = []

      batch.forEach(({ key, importFn }) => {
        const promise = this.loadWithRetry(importFn, 2, 500, key)
          .then(() => {
            console.log(`Preloaded component: ${key}`)
          })
          .catch(error => {
            console.warn(`Failed to preload component ${key}:`, error)
          })
        
        processing.push(promise)
      })

      await Promise.allSettled(processing)

      // Add small delay between batches to avoid blocking main thread
      if (this.preloadQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    this.isProcessingQueue = false
  }

  /**
   * Preload component for better UX
   */
  static async preloadComponent(importFn: () => Promise<any>, key: string): Promise<void> {
    try {
      if (!this.loadedComponents.has(key) && !this.loadingPromises.has(key)) {
        await this.loadWithRetry(importFn, 2, 500, key)
      }
    } catch (error) {
      console.warn(`Failed to preload component ${key}:`, error)
    }
  }

  /**
   * Get component loading state
   */
  static getLoadingState(key: string): LoadingState | undefined {
    return this.loadingStates.get(key)
  }

  /**
   * Check if component is loaded
   */
  static isComponentLoaded(key: string): boolean {
    return this.loadedComponents.has(key)
  }

  /**
   * Get active loading promise
   */
  static getLoadingPromise(key: string): Promise<any> | undefined {
    return this.loadingPromises.get(key)
  }

  /**
   * Record performance metric
   */
  private static recordMetric(metric: LoadMetrics): void {
    this.metrics.push(metric)

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }
  }

  /**
   * Get performance metrics
   */
  static getMetrics(): LoadMetrics[] {
    return [...this.metrics]
  }

  /**
   * Get component performance stats
   */
  static getComponentStats(componentName: string) {
    const componentMetrics = this.metrics.filter(m => m.componentName === componentName)
    
    if (componentMetrics.length === 0) {
      return null
    }

    const successfulLoads = componentMetrics.filter(m => m.success)
    const avgLoadTime = successfulLoads.reduce((sum, m) => sum + m.loadTime, 0) / successfulLoads.length
    const successRate = (successfulLoads.length / componentMetrics.length) * 100

    return {
      componentName,
      totalLoads: componentMetrics.length,
      successfulLoads: successfulLoads.length,
      averageLoadTime: avgLoadTime,
      successRate,
      fastestLoad: Math.min(...successfulLoads.map(m => m.loadTime)),
      slowestLoad: Math.max(...successfulLoads.map(m => m.loadTime))
    }
  }

  /**
   * Get average load times for all components
   */
  static getAverageLoadTimes(): Record<string, number> {
    const componentTimes: Record<string, number[]> = {}

    this.metrics.forEach(metric => {
      if (metric.success) {
        if (!componentTimes[metric.componentName]) {
          componentTimes[metric.componentName] = []
        }
        componentTimes[metric.componentName].push(metric.loadTime)
      }
    })

    const averages: Record<string, number> = {}
    Object.entries(componentTimes).forEach(([name, times]) => {
      averages[name] = times.reduce((sum, time) => sum + time, 0) / times.length
    })

    return averages
  }

  /**
   * Get performance summary
   */
  static getPerformanceSummary() {
    const totalLoads = this.metrics.length
    const successfulLoads = this.metrics.filter(m => m.success).length
    const failedLoads = totalLoads - successfulLoads
    const avgLoadTime = this.metrics
      .filter(m => m.success)
      .reduce((sum, m) => sum + m.loadTime, 0) / (successfulLoads || 1)

    const slowestComponents: Array<{ name: string; loadTime: number }> = []
    const componentTimes = this.getAverageLoadTimes()
    
    Object.entries(componentTimes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([name, time]) => {
        slowestComponents.push({ name, loadTime: time })
      })

    return {
      totalLoads,
      successfulLoads,
      failedLoads,
      successRate: (successfulLoads / (totalLoads || 1)) * 100,
      averageLoadTime: avgLoadTime,
      slowestComponents
    }
  }

  /**
   * Clear cache and reset state
   */
  static clearCache(): void {
    this.loadedComponents.clear()
    this.loadingPromises.clear()
    this.loadingStates.clear()
    this.metrics.length = 0
    this.preloadQueue.length = 0
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AdvancedLazyLoader {
    if (!this.instance) {
      this.instance = new AdvancedLazyLoader()
    }
    return this.instance
  }
}

/**
 * Configuration for virtual scrolling
 */
export interface VirtualScrollConfig {
  itemHeight: number
  containerHeight: number
  overscan?: number
  items: any[]
}

/**
 * Virtual scroll calculations
 */
export function calculateVirtualScrollParams(config: VirtualScrollConfig, scrollTop: number) {
  const { itemHeight, containerHeight, overscan = 5, items } = config
  
  const itemsVisible = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(items.length - 1, startIndex + itemsVisible + overscan * 2)
  
  return {
    startIndex,
    endIndex,
    visibleItems: items.slice(startIndex, endIndex + 1),
    offsetY: startIndex * itemHeight,
    totalHeight: items.length * itemHeight
  }
}

/**
 * Intersection Observer utility for lazy loading
 */
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions = {
    threshold: 0.1,
    rootMargin: '50px',
    ...options
  }

  return new IntersectionObserver(callback, defaultOptions)
}

/**
 * Preload critical components for faster initial load
 */
export async function preloadCriticalComponents(): Promise<void> {
  const loader = AdvancedLazyLoader.getInstance()
  
  // Define critical components that should be preloaded
  const criticalComponents = [
    // Add your critical component import functions here
  ]

  const preloadPromises = criticalComponents.map((importFn, index) => 
    AdvancedLazyLoader.preloadComponent(importFn, `critical-${index}`)
  )

  await Promise.allSettled(preloadPromises)
}

/**
 * Create lazy image loading functionality
 */
export function createLazyImageLoader(src: string, onLoad?: () => void, onError?: () => void) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      onLoad?.()
      resolve(src)
    }
    
    img.onerror = () => {
      onError?.()
      reject(new Error(`Failed to load image: ${src}`))
    }
    
    img.src = src
  })
}

// Export singleton instance
export const lazyLoader = AdvancedLazyLoader.getInstance()