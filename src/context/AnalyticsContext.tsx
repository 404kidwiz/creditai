'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { userBehaviorAnalytics } from '@/lib/analytics/userBehaviorAnalytics';
import { EventType } from '@/types/analytics';
import { useAuth } from '@/hooks/useAuth';

interface AnalyticsContextType {
  trackEvent: (eventType: EventType, data?: Record<string, any>) => Promise<void>;
  trackPageView: (page?: string) => Promise<void>;
  trackClick: (element: string, data?: Record<string, any>) => Promise<void>;
  trackFormSubmit: (formName: string, data?: Record<string, any>) => Promise<void>;
  trackFileUpload: (fileName: string, fileSize: number, fileType: string) => Promise<void>;
  trackError: (error: Error, context?: Record<string, any>) => Promise<void>;
  trackCustomEvent: (eventName: string, data: Record<string, any>) => Promise<void>;
  isTracking: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (user && !isTracking) {
      initializeTracking();
    } else if (!user && isTracking) {
      stopTracking();
    }

    return () => {
      if (isTracking) {
        stopTracking();
      }
    };
  }, [user, isTracking]);

  const initializeTracking = async () => {
    if (!user) return;
    
    try {
      await userBehaviorAnalytics.initializeTracking(user.id);
      setIsTracking(true);
    } catch (error) {
      console.error('Failed to initialize analytics tracking:', error);
    }
  };

  const stopTracking = async () => {
    try {
      await userBehaviorAnalytics.stopTracking();
      setIsTracking(false);
    } catch (error) {
      console.error('Failed to stop analytics tracking:', error);
    }
  };

  const trackEvent = async (eventType: EventType, data?: Record<string, any>) => {
    if (!isTracking) return;
    await userBehaviorAnalytics.trackEvent(eventType, data);
  };

  const trackPageView = async (page?: string) => {
    if (!isTracking) return;
    await userBehaviorAnalytics.trackPageView(page);
  };

  const trackClick = async (element: string, data?: Record<string, any>) => {
    if (!isTracking) return;
    await userBehaviorAnalytics.trackClick(element, data);
  };

  const trackFormSubmit = async (formName: string, data?: Record<string, any>) => {
    if (!isTracking) return;
    await userBehaviorAnalytics.trackFormSubmit(formName, data);
  };

  const trackFileUpload = async (fileName: string, fileSize: number, fileType: string) => {
    if (!isTracking) return;
    await userBehaviorAnalytics.trackFileUpload(fileName, fileSize, fileType);
  };

  const trackError = async (error: Error, context?: Record<string, any>) => {
    if (!isTracking) return;
    await userBehaviorAnalytics.trackError(error, context);
  };

  const trackCustomEvent = async (eventName: string, data: Record<string, any>) => {
    if (!isTracking) return;
    await userBehaviorAnalytics.trackCustomEvent(eventName, data);
  };

  const value = {
    trackEvent,
    trackPageView,
    trackClick,
    trackFormSubmit,
    trackFileUpload,
    trackError,
    trackCustomEvent,
    isTracking
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

// HOC for automatic page view tracking
export function withPageTracking<T extends Record<string, any>>(
  Component: React.ComponentType<T>
): React.ComponentType<T> {
  return function TrackedComponent(props: T) {
    const { trackPageView } = useAnalytics();

    useEffect(() => {
      trackPageView();
    }, [trackPageView]);

    return <Component {...props} />;
  };
}