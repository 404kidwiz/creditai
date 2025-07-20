import { useCallback, useRef, useEffect } from 'react';

export interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance for swipe
  velocityThreshold?: number; // Minimum velocity for swipe
  touchAngle?: number; // Maximum angle deviation for straight swipe
  preventDefaultTouchmove?: boolean;
  disabled?: boolean;
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  currentTime: number;
}

export function useSwipeGestures<T extends HTMLElement>(
  config: SwipeConfig = {}
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    velocityThreshold = 0.3,
    touchAngle = 30,
    preventDefaultTouchmove = false,
    disabled = false,
  } = config;

  const elementRef = useRef<T>(null);
  const touchData = useRef<TouchData | null>(null);

  const calculateDistance = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    return Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
  }, []);

  const calculateAngle = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    return Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
  }, []);

  const calculateVelocity = useCallback((distance: number, time: number) => {
    return time > 0 ? distance / time : 0;
  }, []);

  const isValidSwipe = useCallback((
    deltaX: number,
    deltaY: number,
    distance: number,
    velocity: number,
    angle: number
  ) => {
    // Check minimum distance and velocity
    if (distance < threshold || velocity < velocityThreshold) {
      return false;
    }

    const absAngle = Math.abs(angle);
    const isDominantlyHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    const isDominantlyVertical = Math.abs(deltaY) > Math.abs(deltaX);

    // Horizontal swipes (left/right)
    if (isDominantlyHorizontal) {
      return absAngle <= touchAngle || absAngle >= (180 - touchAngle);
    }

    // Vertical swipes (up/down)
    if (isDominantlyVertical) {
      return absAngle >= (90 - touchAngle) && absAngle <= (90 + touchAngle);
    }

    return false;
  }, [threshold, velocityThreshold, touchAngle]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (disabled || event.touches.length !== 1) return;

    const touch = event.touches[0];
    touchData.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      currentY: touch.clientY,
      currentTime: Date.now(),
    };
  }, [disabled]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (disabled || !touchData.current || event.touches.length !== 1) return;

    if (preventDefaultTouchmove) {
      event.preventDefault();
    }

    const touch = event.touches[0];
    touchData.current.currentX = touch.clientX;
    touchData.current.currentY = touch.clientY;
    touchData.current.currentTime = Date.now();
  }, [disabled, preventDefaultTouchmove]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (disabled || !touchData.current) return;

    const data = touchData.current;
    const deltaX = data.currentX - data.startX;
    const deltaY = data.currentY - data.startY;
    const deltaTime = data.currentTime - data.startTime;
    
    const distance = calculateDistance(data.startX, data.startY, data.currentX, data.currentY);
    const velocity = calculateVelocity(distance, deltaTime);
    const angle = calculateAngle(data.startX, data.startY, data.currentX, data.currentY);

    if (isValidSwipe(deltaX, deltaY, distance, velocity, angle)) {
      const isDominantlyHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (isDominantlyHorizontal) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        } else if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        }
      }
    }

    touchData.current = null;
  }, [disabled, calculateDistance, calculateVelocity, calculateAngle, isValidSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  const handleTouchCancel = useCallback(() => {
    touchData.current = null;
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || disabled) return;

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchmove });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, preventDefaultTouchmove]);

  return elementRef;
}

// Utility hook for navigation-specific swipes
export function useNavigationSwipes(config: {
  onBack?: () => void;
  onForward?: () => void;
  onShowMenu?: () => void;
  onHideMenu?: () => void;
  disabled?: boolean;
}) {
  const { onBack, onForward, onShowMenu, onHideMenu, disabled } = config;

  return useSwipeGestures({
    onSwipeRight: onBack,
    onSwipeLeft: onForward,
    onSwipeDown: onShowMenu,
    onSwipeUp: onHideMenu,
    threshold: 80,
    velocityThreshold: 0.5,
    touchAngle: 25,
    disabled,
  });
}

// Hook for gesture-based navigation between pages
export function usePageSwipeNavigation(config: {
  routes: string[];
  currentRoute: string;
  navigate: (route: string) => void;
  disabled?: boolean;
}) {
  const { routes, currentRoute, navigate, disabled } = config;

  const currentIndex = routes.indexOf(currentRoute);

  return useSwipeGestures({
    onSwipeLeft: () => {
      if (currentIndex < routes.length - 1) {
        navigate(routes[currentIndex + 1]);
      }
    },
    onSwipeRight: () => {
      if (currentIndex > 0) {
        navigate(routes[currentIndex - 1]);
      }
    },
    threshold: 100,
    velocityThreshold: 0.4,
    touchAngle: 20,
    disabled: disabled || currentIndex === -1,
  });
}