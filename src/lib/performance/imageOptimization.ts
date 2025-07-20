/**
 * Image optimization utilities for lazy loading and performance
 */

import React from 'react';

interface ImageLoaderOptions {
  src: string;
  width?: number;
  quality?: number;
  blur?: boolean;
}

interface LazyImageOptions {
  threshold?: number;
  rootMargin?: string;
  placeholder?: 'blur' | 'empty' | 'shimmer';
  priority?: boolean;
}

/**
 * Custom image loader for optimized images
 */
export function imageLoader({ src, width, quality = 75 }: ImageLoaderOptions): string {
  // If it's already a data URL or external URL, return as is
  if (src.startsWith('data:') || src.startsWith('http')) {
    return src;
  }

  // For local images, add optimization parameters
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  params.append('q', quality.toString());

  return `${src}${src.includes('?') ? '&' : '?'}${params.toString()}`;
}

/**
 * Generate a blur placeholder for images
 */
export function generateBlurPlaceholder(width: number, height: number): string {
  // Simple SVG blur placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <filter id="blur">
        <feGaussianBlur stdDeviation="20" />
      </filter>
      <rect width="100%" height="100%" fill="#e5e7eb" filter="url(#blur)" />
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Intersection Observer for lazy loading images
 */
export class ImageLazyLoader {
  private observer: IntersectionObserver | null = null;
  private loadedImages = new Set<string>();

  constructor(options: LazyImageOptions = {}) {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          threshold: options.threshold || 0.1,
          rootMargin: options.rootMargin || '50px',
        }
      );
    }
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        this.loadImage(img);
      }
    });
  }

  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (!src || this.loadedImages.has(src)) return;

    // Create a new image to preload
    const newImg = new Image();
    
    newImg.onload = () => {
      // Apply the loaded image
      if (src) img.src = src;
      if (srcset) img.srcset = srcset;
      
      // Add fade-in animation
      img.classList.add('lazy-loaded');
      
      // Remove placeholder classes
      img.classList.remove('lazy-loading');
      
      // Mark as loaded
      this.loadedImages.add(src);
      
      // Stop observing this image
      this.observer?.unobserve(img);
    };

    newImg.onerror = () => {
      img.classList.add('lazy-error');
      this.observer?.unobserve(img);
    };

    // Start loading
    newImg.src = src;
    if (srcset) newImg.srcset = srcset;
  }

  observe(element: HTMLImageElement): void {
    if (this.observer && element.dataset.src) {
      element.classList.add('lazy-loading');
      this.observer.observe(element);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadImage(element);
    }
  }

  unobserve(element: HTMLImageElement): void {
    this.observer?.unobserve(element);
  }

  disconnect(): void {
    this.observer?.disconnect();
  }

  preload(src: string): void {
    if (this.loadedImages.has(src)) return;

    const img = new Image();
    img.src = src;
    this.loadedImages.add(src);
  }

  isLoaded(src: string): boolean {
    return this.loadedImages.has(src);
  }
}

/**
 * React hook for lazy loading images
 */
export function useImageLazyLoader(options?: LazyImageOptions) {
  const [loader] = React.useState(() => new ImageLazyLoader(options));

  React.useEffect(() => {
    return () => {
      loader.disconnect();
    };
  }, [loader]);

  return {
    observe: (element: HTMLImageElement) => loader.observe(element),
    unobserve: (element: HTMLImageElement) => loader.unobserve(element),
    preload: (src: string) => loader.preload(src),
    isLoaded: (src: string) => loader.isLoaded(src),
  };
}

/**
 * Optimized image component with lazy loading
 */
interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: 'blur' | 'empty' | 'shimmer';
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  placeholder = 'blur',
  priority = false,
  onLoad,
  onError 
}) => {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const { observe } = useImageLazyLoader();

  React.useEffect(() => {
    const img = imgRef.current;
    if (img && !priority) {
      observe(img);
    }
  }, [observe, priority]);

  const placeholderSrc = placeholder === 'blur' && width && height
    ? generateBlurPlaceholder(width, height)
    : undefined;

  return React.createElement('img', {
    ref: imgRef,
    src: priority ? src : placeholderSrc,
    'data-src': !priority ? src : undefined,
    alt: alt,
    width: width,
    height: height,
    className: `${className || ''} ${!priority ? 'lazy-image' : ''}`.trim(),
    loading: priority ? 'eager' : 'lazy',
    onLoad: onLoad,
    onError: onError,
  });
};

/**
 * Preload critical images
 */
export function preloadCriticalImages(urls: string[]): void {
  if (typeof window === 'undefined') return;

  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Generate responsive image srcset
 */
export function generateSrcSet(
  src: string,
  sizes: number[] = [320, 640, 768, 1024, 1280, 1536]
): string {
  return sizes
    .map(size => `${imageLoader({ src, width: size })} ${size}w`)
    .join(', ');
}

/**
 * Get optimal image format based on browser support
 */
export function getOptimalImageFormat(): 'webp' | 'avif' | 'jpeg' {
  if (typeof window === 'undefined') return 'jpeg';

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  if (canvas.toDataURL('image/avif').startsWith('data:image/avif')) {
    return 'avif';
  }

  if (canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
    return 'webp';
  }

  return 'jpeg';
}