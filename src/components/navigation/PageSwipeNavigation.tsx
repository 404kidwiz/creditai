'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { usePageSwipeNavigation } from '@/hooks/useSwipeGestures';
import { useResponsive } from '@/hooks/useResponsive';
import { QuickGestureHint } from './GestureIndicators';

interface PageSwipeNavigationProps {
  children: React.ReactNode;
  enableSwipeNavigation?: boolean;
  showHints?: boolean;
}

// Define the main navigation routes in order
const mainRoutes = [
  '/dashboard',
  '/upload',
  '/analysis',
  '/disputes',
  '/billing',
  '/settings',
];

export function PageSwipeNavigation({
  children,
  enableSwipeNavigation = true,
  showHints = false,
}: PageSwipeNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, isTouchDevice } = useResponsive();

  // Only enable on mobile touch devices
  const shouldEnableSwipe = enableSwipeNavigation && isMobile && isTouchDevice;

  const swipeRef = usePageSwipeNavigation({
    routes: mainRoutes,
    currentRoute: pathname,
    navigate: (route) => router.push(route),
    disabled: !shouldEnableSwipe,
  });

  // Get current page info
  const currentIndex = mainRoutes.indexOf(pathname);
  const hasNext = currentIndex >= 0 && currentIndex < mainRoutes.length - 1;
  const hasPrevious = currentIndex > 0;

  return (
    <div
      ref={swipeRef}
      className="min-h-screen w-full"
      style={{ 
        touchAction: shouldEnableSwipe ? 'pan-y' : 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {children}
      
      {/* Gesture hints */}
      {showHints && shouldEnableSwipe && (
        <>
          {hasPrevious && (
            <QuickGestureHint
              gesture="👉"
              description="Swipe right to go back"
              position="left"
              autoHide={true}
              duration={3000}
            />
          )}
          {hasNext && (
            <QuickGestureHint
              gesture="👈"
              description="Swipe left for next page"
              position="right"
              autoHide={true}
              duration={3000}
            />
          )}
        </>
      )}
    </div>
  );
}

// Hook to provide page navigation context
export function usePageNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  
  const currentIndex = mainRoutes.indexOf(pathname);
  
  const navigateNext = () => {
    if (currentIndex >= 0 && currentIndex < mainRoutes.length - 1) {
      router.push(mainRoutes[currentIndex + 1]);
    }
  };
  
  const navigatePrevious = () => {
    if (currentIndex > 0) {
      router.push(mainRoutes[currentIndex - 1]);
    }
  };
  
  const navigateToIndex = (index: number) => {
    if (index >= 0 && index < mainRoutes.length) {
      router.push(mainRoutes[index]);
    }
  };
  
  return {
    currentIndex,
    totalPages: mainRoutes.length,
    currentRoute: pathname,
    hasNext: currentIndex >= 0 && currentIndex < mainRoutes.length - 1,
    hasPrevious: currentIndex > 0,
    navigateNext,
    navigatePrevious,
    navigateToIndex,
    routes: mainRoutes,
  };
}

// Progress indicator component for page navigation
export function PageNavigationProgress() {
  const { currentIndex, totalPages, routes } = usePageNavigation();
  const { isMobile } = useResponsive();
  
  if (!isMobile || currentIndex === -1) {
    return null;
  }
  
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30">
      <div className="flex items-center space-x-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg">
        {routes.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentIndex
                ? 'bg-primary w-4'
                : index < currentIndex
                ? 'bg-primary/60'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}