'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';

interface GestureIndicatorsProps {
  onDismiss?: () => void;
  autoShow?: boolean;
  showOnce?: boolean;
}

interface GestureHint {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gesture: string;
  position: 'left' | 'right' | 'top' | 'bottom' | 'center';
}

const gestureHints: GestureHint[] = [
  {
    id: 'swipe-right-back',
    title: 'Swipe to Go Back',
    description: 'Swipe right anywhere to go back to the previous page',
    icon: ArrowRight,
    gesture: '👉',
    position: 'right',
  },
  {
    id: 'swipe-left-forward',
    title: 'Swipe Forward',
    description: 'Swipe left to navigate between sections',
    icon: ArrowLeft,
    gesture: '👈',
    position: 'left',
  },
  {
    id: 'swipe-down-menu',
    title: 'Pull Down for Menu',
    description: 'Swipe down to open the navigation menu',
    icon: ArrowDown,
    gesture: '👇',
    position: 'top',
  },
  {
    id: 'swipe-up-hide',
    title: 'Swipe Up to Hide',
    description: 'Swipe up to hide the navigation menu',
    icon: ArrowUp,
    gesture: '👆',
    position: 'bottom',
  },
];

export function GestureIndicators({
  onDismiss,
  autoShow = true,
  showOnce = true,
}: GestureIndicatorsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  const [hasBeenShown, setHasBeenShown] = useState(false);
  const { isMobile, isTouchDevice } = useResponsive();

  useEffect(() => {
    if (!isMobile || !isTouchDevice) return;

    // Check if hints have been shown before
    const hintsShown = localStorage.getItem('gesture-hints-shown');
    if (showOnce && hintsShown) {
      setHasBeenShown(true);
      return;
    }

    if (autoShow) {
      // Show hints after a delay to let the user settle in
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isMobile, isTouchDevice, autoShow, showOnce]);

  useEffect(() => {
    if (!isVisible) return;

    // Auto-advance through hints
    const timer = setTimeout(() => {
      if (currentHint < gestureHints.length - 1) {
        setCurrentHint(currentHint + 1);
      } else {
        handleDismiss();
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [isVisible, currentHint]);

  const handleDismiss = () => {
    setIsVisible(false);
    setHasBeenShown(true);
    
    if (showOnce) {
      localStorage.setItem('gesture-hints-shown', 'true');
    }
    
    onDismiss?.();
  };

  const handleSkip = () => {
    handleDismiss();
  };

  const handleNext = () => {
    if (currentHint < gestureHints.length - 1) {
      setCurrentHint(currentHint + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrevious = () => {
    if (currentHint > 0) {
      setCurrentHint(currentHint - 1);
    }
  };

  // Don't render on non-touch devices
  if (!isMobile || !isTouchDevice || hasBeenShown) {
    return null;
  }

  const hint = gestureHints[currentHint];

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          />

          {/* Gesture Indicator */}
          <motion.div
            className={cn(
              'fixed z-50 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700',
              'max-w-sm mx-4',
              hint.position === 'center' && 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
              hint.position === 'top' && 'top-20 left-1/2 transform -translate-x-1/2',
              hint.position === 'bottom' && 'bottom-32 left-1/2 transform -translate-x-1/2',
              hint.position === 'left' && 'left-4 top-1/2 transform -translate-y-1/2',
              hint.position === 'right' && 'right-4 top-1/2 transform -translate-y-1/2'
            )}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="absolute top-2 right-2 w-8 h-8"
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Hint content */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">{hint.gesture}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{hint.title}</h3>
                  <p className="text-sm text-muted-foreground">{hint.description}</p>
                </div>
              </div>

              {/* Visual gesture demonstration */}
              <div className="flex justify-center py-4">
                <motion.div
                  className="flex items-center gap-2 text-primary"
                  initial={{ x: 0 }}
                  animate={{ 
                    x: hint.position === 'right' ? [0, 20, 0] : 
                       hint.position === 'left' ? [0, -20, 0] : 0,
                    y: hint.position === 'bottom' ? [0, 20, 0] : 
                       hint.position === 'top' ? [0, -20, 0] : 0
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    repeatType: 'loop',
                    ease: 'easeInOut' 
                  }}
                >
                  <hint.icon className="w-6 h-6" />
                  <span className="text-sm font-medium">
                    {hint.position === 'right' ? 'Swipe →' :
                     hint.position === 'left' ? '← Swipe' :
                     hint.position === 'bottom' ? 'Swipe ↓' :
                     hint.position === 'top' ? '↑ Swipe' : 'Tap'}
                  </span>
                </motion.div>
              </div>

              {/* Progress and navigation */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  {gestureHints.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        'w-2 h-2 rounded-full transition-colors',
                        index === currentHint 
                          ? 'bg-primary' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      )}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {currentHint > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                    >
                      Previous
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                  >
                    Skip
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNext}
                  >
                    {currentHint === gestureHints.length - 1 ? 'Got it!' : 'Next'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Quick gesture hint for specific actions
export function QuickGestureHint({
  gesture,
  description,
  position = 'bottom',
  autoHide = true,
  duration = 2000,
}: {
  gesture: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  autoHide?: boolean;
  duration?: number;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!autoHide) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [autoHide, duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            'fixed z-40 px-3 py-2 bg-black/80 text-white text-sm rounded-lg',
            'pointer-events-none select-none',
            position === 'top' && 'top-4 left-1/2 transform -translate-x-1/2',
            position === 'bottom' && 'bottom-24 left-1/2 transform -translate-x-1/2',
            position === 'left' && 'left-4 top-1/2 transform -translate-y-1/2',
            position === 'right' && 'right-4 top-1/2 transform -translate-y-1/2'
          )}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{gesture}</span>
            <span>{description}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}