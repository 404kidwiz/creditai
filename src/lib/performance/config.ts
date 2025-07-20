/**
 * Performance configuration and utilities
 */

// Performance budgets
export const PERFORMANCE_BUDGETS = {
  // Bundle size budgets (in KB)
  bundles: {
    main: 250,
    vendor: 300,
    framework: 150,
    ui: 100,
    utils: 50,
  },
  
  // Loading time budgets (in ms)
  timing: {
    firstContentfulPaint: 1500,
    timeToInteractive: 3500,
    totalBlockingTime: 300,
    largestContentfulPaint: 2500,
  },
  
  // Resource counts
  resources: {
    scripts: 10,
    styles: 5,
    images: 20,
    fonts: 3,
  }
};

// Lazy loading configuration
export const LAZY_LOADING_CONFIG = {
  // Routes that should be eagerly loaded
  eagerRoutes: [
    '/',
    '/login',
    '/dashboard',
  ],
  
  // Routes that should be prefetched on hover
  prefetchOnHover: [
    '/upload',
    '/analysis-results',
    '/settings',
  ],
  
  // Routes that should be loaded on demand
  lazyRoutes: [
    '/profile',
    '/reports',
    '/pricing',
    '/about',
    '/admin/*',
  ],
  
  // Component loading priorities
  componentPriorities: {
    high: ['DashboardContent', 'CreditReportUpload', 'AuthForm'],
    medium: ['AnalysisResults', 'CreditScoreOverview', 'AccountsSection'],
    low: ['PricingPlans', 'AboutContent', 'AdminDashboard'],
  }
};

// Image optimization settings
export const IMAGE_OPTIMIZATION_CONFIG = {
  // Supported formats in order of preference
  formats: ['avif', 'webp', 'jpeg'],
  
  // Quality settings
  quality: {
    thumbnail: 60,
    standard: 75,
    high: 85,
  },
  
  // Responsive image sizes
  sizes: {
    thumbnail: [100, 200],
    small: [320, 640],
    medium: [768, 1024],
    large: [1280, 1536],
    xlarge: [1920, 2560],
  },
  
  // Lazy loading settings
  lazyLoading: {
    rootMargin: '50px',
    threshold: 0.1,
  }
};

// Caching strategies
export const CACHE_CONFIG = {
  // API response caching
  api: {
    'dashboard-data': { ttl: 60 * 5 }, // 5 minutes
    'credit-analysis': { ttl: 60 * 60 }, // 1 hour
    'user-profile': { ttl: 60 * 10 }, // 10 minutes
    'static-content': { ttl: 60 * 60 * 24 }, // 24 hours
  },
  
  // Asset caching
  assets: {
    images: { ttl: 60 * 60 * 24 * 30 }, // 30 days
    scripts: { ttl: 60 * 60 * 24 * 7 }, // 7 days
    styles: { ttl: 60 * 60 * 24 * 7 }, // 7 days
    fonts: { ttl: 60 * 60 * 24 * 365 }, // 1 year
  }
};

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  
  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }
  
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // Keep only last 100 measurements
    const values = this.metrics.get(name)!;
    if (values.length > 100) {
      values.shift();
    }
  }
  
  getMetrics(name: string): {
    avg: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    
    return {
      avg,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[p95Index],
    };
  }
  
  checkBudgets(): { violations: string[]; warnings: string[] } {
    const violations: string[] = [];
    const warnings: string[] = [];
    
    // Check timing budgets
    Object.entries(PERFORMANCE_BUDGETS.timing).forEach(([metric, budget]) => {
      const stats = this.getMetrics(metric);
      if (stats) {
        if (stats.p95 > budget) {
          violations.push(`${metric}: ${stats.p95}ms (budget: ${budget}ms)`);
        } else if (stats.avg > budget * 0.8) {
          warnings.push(`${metric}: ${stats.avg}ms average (budget: ${budget}ms)`);
        }
      }
    });
    
    return { violations, warnings };
  }
  
  reportToAnalytics(): void {
    if (typeof window === 'undefined') return;
    
    const allMetrics: Record<string, any> = {};
    this.metrics.forEach((values, name) => {
      allMetrics[name] = this.getMetrics(name);
    });
    
    // Send to analytics
    if ((window as any).gtag) {
      (window as any).gtag('event', 'performance_metrics', {
        event_category: 'Performance',
        event_label: 'Metrics Report',
        custom_data: allMetrics,
      });
    }
  }
}

// Resource hints utilities
export function addResourceHints(): void {
  if (typeof window === 'undefined') return;
  
  const head = document.head;
  
  // Preconnect to external domains
  const preconnectDomains = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ].filter(Boolean);
  
  preconnectDomains.forEach(domain => {
    if (!domain) return;
    
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    head.appendChild(link);
  });
  
  // DNS prefetch for other domains
  const dnsPrefetchDomains = [
    'https://www.google-analytics.com',
    'https://vitals.vercel-insights.com',
  ];
  
  dnsPrefetchDomains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    head.appendChild(link);
  });
}

// Intersection Observer for prefetching
export function setupPrefetchObserver(): void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
  
  const prefetchLinks = new Set<string>();
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const link = entry.target as HTMLAnchorElement;
        const href = link.href;
        
        if (href && !prefetchLinks.has(href) && LAZY_LOADING_CONFIG.prefetchOnHover.some(route => href.includes(route))) {
          prefetchLinks.add(href);
          
          // Prefetch the route
          const linkElement = document.createElement('link');
          linkElement.rel = 'prefetch';
          linkElement.href = href;
          document.head.appendChild(linkElement);
        }
      }
    });
  }, {
    rootMargin: '100px',
  });
  
  // Observe all links
  document.querySelectorAll('a[href^="/"]').forEach(link => {
    observer.observe(link);
  });
}

// Performance measurement utilities
export function measureComponentRender(componentName: string): () => void {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    PerformanceMonitor.getInstance().recordMetric(`component_render_${componentName}`, renderTime);
    
    if (renderTime > 100) {
      console.warn(`Slow component render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  };
}

// Web Vitals monitoring
export function reportWebVitals(metric: any): void {
  const monitor = PerformanceMonitor.getInstance();
  
  switch (metric.name) {
    case 'FCP':
      monitor.recordMetric('firstContentfulPaint', metric.value);
      break;
    case 'LCP':
      monitor.recordMetric('largestContentfulPaint', metric.value);
      break;
    case 'CLS':
      monitor.recordMetric('cumulativeLayoutShift', metric.value);
      break;
    case 'FID':
      monitor.recordMetric('firstInputDelay', metric.value);
      break;
    case 'TTFB':
      monitor.recordMetric('timeToFirstByte', metric.value);
      break;
  }
  
  // Check performance budgets
  const { violations, warnings } = monitor.checkBudgets();
  
  if (violations.length > 0) {
    console.error('Performance budget violations:', violations);
  }
  
  if (warnings.length > 0) {
    console.warn('Performance budget warnings:', warnings);
  }
}