/**
 * Performance initialization and optimization
 */

import { addResourceHints, setupPrefetchObserver, reportWebVitals } from './config';
import { lazyLoader } from './lazyLoader';

// Initialize performance optimizations
export function initializePerformance(): void {
  if (typeof window === 'undefined') return;

  // Add resource hints
  addResourceHints();

  // Setup prefetch observer for navigation
  setupPrefetchObserver();

  // Preload critical components based on current route
  const currentPath = window.location.pathname;
  preloadRouteComponents(currentPath);

  // Setup Web Vitals reporting
  if ('web-vital' in window) {
    (window as any).addEventListener('web-vital', (event: CustomEvent) => {
      reportWebVitals(event.detail);
    });
  }

  // Setup navigation prefetching
  setupNavigationPrefetching();

  // Initialize service worker for offline support
  initializeServiceWorker();
}

// Preload components based on route
function preloadRouteComponents(path: string): void {
  // Use requestIdleCallback for non-blocking preloading
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      performRoutePreloading(path);
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      performRoutePreloading(path);
    }, 100);
  }
}

function performRoutePreloading(path: string): void {
  switch (path) {
    case '/':
    case '/dashboard':
      // Preload dashboard components
      lazyLoader.preloadComponent(
        () => import('@/components/dashboard/DashboardContent'),
        'dashboard-content'
      );
      lazyLoader.preloadComponent(
        () => import('@/components/dashboard/StatCards'),
        'stat-cards'
      );
      break;

    case '/upload':
      // Preload upload components
      lazyLoader.preloadComponent(
        () => import('@/components/upload/CreditReportUpload'),
        'credit-upload'
      );
      lazyLoader.preloadComponent(
        () => import('@/components/upload/FileDropzone'),
        'file-dropzone'
      );
      break;

    case '/analysis-results':
      // Preload analysis components
      lazyLoader.preloadComponent(
        () => import('@/components/analysis/SimpleAnalysisResults'),
        'analysis-results'
      );
      lazyLoader.preloadComponent(
        () => import('@/components/credit-data/EnhancedCreditDataDisplay'),
        'credit-data-display'
      );
      break;
  }
}

// Setup navigation prefetching
function setupNavigationPrefetching(): void {
  // Prefetch on link hover
  document.addEventListener('mouseover', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');
    
    if (link && link.href && link.href.startsWith(window.location.origin)) {
      const path = new URL(link.href).pathname;
      
      // Debounce prefetching
      clearTimeout((window as any).prefetchTimeout);
      (window as any).prefetchTimeout = setTimeout(() => {
        preloadRouteComponents(path);
      }, 150);
    }
  });

  // Cancel prefetch on mouseout
  document.addEventListener('mouseout', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');
    
    if (link) {
      clearTimeout((window as any).prefetchTimeout);
    }
  });
}

// Initialize service worker
function initializeServiceWorker(): void {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registration successful');
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour
        },
        (err) => {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    });
  }
}

// Performance optimization for images
export function optimizeImages(): void {
  if (typeof window === 'undefined') return;

  // Convert img tags to use lazy loading
  const images = document.querySelectorAll('img:not([loading])');
  images.forEach((img) => {
    img.setAttribute('loading', 'lazy');
  });

  // Add decoding async for better performance
  const largeImages = document.querySelectorAll('img[width][height]');
  largeImages.forEach((img) => {
    const width = parseInt(img.getAttribute('width') || '0');
    const height = parseInt(img.getAttribute('height') || '0');
    
    if (width * height > 100000) { // Large images
      img.setAttribute('decoding', 'async');
    }
  });
}

// Optimize third-party scripts
export function optimizeThirdPartyScripts(): void {
  if (typeof window === 'undefined') return;

  // Delay non-critical third-party scripts
  const thirdPartyScripts = [
    { src: 'https://www.googletagmanager.com/gtag/js', delay: 3000 },
    { src: 'https://widget.intercom.io', delay: 5000 },
  ];

  thirdPartyScripts.forEach(({ src, delay }) => {
    const scripts = document.querySelectorAll(`script[src*="${src}"]`);
    scripts.forEach((script) => {
      const originalSrc = script.getAttribute('src');
      script.removeAttribute('src');
      
      setTimeout(() => {
        script.setAttribute('src', originalSrc!);
      }, delay);
    });
  });
}

// Font optimization
export function optimizeFonts(): void {
  if (typeof window === 'undefined') return;

  // Use font-display: swap for better performance
  const fontLinks = document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
  fontLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && !href.includes('display=swap')) {
      link.setAttribute('href', href + '&display=swap');
    }
  });
}

// Memory cleanup utilities
export function setupMemoryCleanup(): void {
  if (typeof window === 'undefined') return;

  // Clean up on page hide
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Clear unnecessary caches
      lazyLoader.clearCache();
      
      // Run garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }
    }
  });

  // Clean up on navigation
  window.addEventListener('beforeunload', () => {
    // Cancel any pending operations
    clearTimeout((window as any).prefetchTimeout);
    
    // Clear temporary data
    sessionStorage.removeItem('temp_data');
  });
}

// Export main initialization function
export function initPerformanceOptimizations(): void {
  // Initialize all performance optimizations
  initializePerformance();
  optimizeImages();
  optimizeThirdPartyScripts();
  optimizeFonts();
  setupMemoryCleanup();
  
  // Log performance status
  console.log('Performance optimizations initialized');
}