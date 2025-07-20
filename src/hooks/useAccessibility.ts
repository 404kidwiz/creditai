/**
 * useAccessibility Hook - React integration for accessibility features
 * Provides easy access to accessibility features in React components
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { accessibilityManager } from '@/lib/accessibility/accessibilityManager';
import { touchManager } from '@/lib/accessibility/touchManager';
import { ariaManager } from '@/lib/accessibility/ariaManager';

interface UseAccessibilityOptions {
  enableAutoEnhancement?: boolean;
  enableTouchTargetValidation?: boolean;
  enableAriaValidation?: boolean;
  announceStateChanges?: boolean;
}

interface AccessibilityHookReturn {
  // Functions
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  hapticFeedback: (type?: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification') => void;
  enhanceElement: (element: HTMLElement) => void;
  createModalFocusTrap: (modal: HTMLElement) => () => void;
  focusElement: (element: HTMLElement) => void;
  validateTouchTarget: (element: HTMLElement) => { isValid: boolean; suggestions: string[] };
  
  // State
  isInitialized: boolean;
  status: {
    touchTargetsValid: number;
    keyboardNavigable: number;
    ariaCompliant: number;
    overallScore: number;
  };
  
  // Refs for common patterns
  modalRef: React.RefObject<HTMLDivElement>;
  skipLinkRef: React.RefObject<HTMLAnchorElement>;
  announcementRef: React.RefObject<HTMLDivElement>;
}

export function useAccessibility(options: UseAccessibilityOptions = {}): AccessibilityHookReturn {
  const {
    enableAutoEnhancement = true,
    enableTouchTargetValidation = true,
    enableAriaValidation = true,
    announceStateChanges = true
  } = options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState({
    touchTargetsValid: 0,
    keyboardNavigable: 0,
    ariaCompliant: 0,
    overallScore: 0
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);

  // Initialize accessibility manager
  useEffect(() => {
    const initializeAccessibility = async () => {
      try {
        if (!accessibilityManager.isInitialized()) {
          await accessibilityManager.initialize({
            announceStateChanges,
            enableTouchEnhancements: enableTouchTargetValidation,
            enableAriaEnhancements: enableAriaValidation,
            autoFixTouchTargets: enableAutoEnhancement
          });
        }
        
        setIsInitialized(true);
        setStatus(accessibilityManager.getStatus());
      } catch (error) {
        console.error('Failed to initialize accessibility features:', error);
      }
    };

    initializeAccessibility();
  }, [enableAutoEnhancement, enableTouchTargetValidation, enableAriaValidation, announceStateChanges]);

  // Auto-enhance elements when component mounts or updates
  useEffect(() => {
    if (!isInitialized || !enableAutoEnhancement) return;

    const enhanceContainer = () => {
      if (containerRef.current) {
        const interactiveElements = containerRef.current.querySelectorAll(
          'button, input, select, textarea, a[href], [role="button"], [tabindex="0"]'
        );
        
        interactiveElements.forEach(element => {
          accessibilityManager.enhanceElement(element as HTMLElement);
        });
      }
    };

    // Enhance on mount
    enhanceContainer();

    // Set up mutation observer for dynamic content
    const observer = new MutationObserver(() => {
      enhanceContainer();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true
      });
    }

    return () => {
      observer.disconnect();
    };
  }, [isInitialized, enableAutoEnhancement]);

  // Announce function
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (isInitialized) {
      accessibilityManager.announce(message, priority);
    }
  }, [isInitialized]);

  // Haptic feedback function
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification' = 'light') => {
    if (isInitialized) {
      accessibilityManager.hapticFeedback(type);
    }
  }, [isInitialized]);

  // Enhance element function
  const enhanceElement = useCallback((element: HTMLElement) => {
    if (isInitialized) {
      accessibilityManager.enhanceElement(element);
    }
  }, [isInitialized]);

  // Create modal focus trap
  const createModalFocusTrap = useCallback((modal: HTMLElement) => {
    if (isInitialized) {
      return accessibilityManager.createModalFocusTrap(modal);
    }
    return () => {}; // No-op cleanup function
  }, [isInitialized]);

  // Focus element function
  const focusElement = useCallback((element: HTMLElement) => {
    if (isInitialized) {
      accessibilityManager.focusElement(element);
    }
  }, [isInitialized]);

  // Validate touch target function
  const validateTouchTarget = useCallback((element: HTMLElement) => {
    if (isInitialized) {
      const validation = touchManager.validateTouchTarget(element);
      return {
        isValid: validation.isValid,
        suggestions: validation.suggestions
      };
    }
    return { isValid: true, suggestions: [] };
  }, [isInitialized]);

  return {
    // Functions
    announce,
    hapticFeedback,
    enhanceElement,
    createModalFocusTrap,
    focusElement,
    validateTouchTarget,
    
    // State
    isInitialized,
    status,
    
    // Refs
    modalRef,
    skipLinkRef,
    announcementRef
  };
}

/**
 * Hook for modal accessibility
 */
export function useModalAccessibility(isOpen: boolean) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [focusTrapCleanup, setFocusTrapCleanup] = useState<(() => void) | null>(null);
  const { createModalFocusTrap, announce } = useAccessibility();

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Create focus trap
      const cleanup = createModalFocusTrap(modalRef.current);
      setFocusTrapCleanup(() => cleanup);
      
      // Announce modal opening
      const title = modalRef.current.querySelector('h1, h2, h3, .modal-title')?.textContent || 'Dialog';
      announce(`${title} opened`, 'assertive');
      
      return () => {
        cleanup();
        announce(`${title} closed`, 'assertive');
      };
    } else if (focusTrapCleanup) {
      focusTrapCleanup();
      setFocusTrapCleanup(null);
    }
  }, [isOpen, createModalFocusTrap, announce, focusTrapCleanup]);

  return { modalRef };
}

/**
 * Hook for form accessibility
 */
export function useFormAccessibility() {
  const formRef = useRef<HTMLFormElement>(null);
  const { announce, enhanceElement } = useAccessibility();

  const announceFormError = useCallback((message: string) => {
    announce(`Form error: ${message}`, 'assertive');
  }, [announce]);

  const announceFormSuccess = useCallback((message: string) => {
    announce(`Form submitted successfully: ${message}`, 'assertive');
  }, [announce]);

  const enhanceFormElements = useCallback(() => {
    if (formRef.current) {
      const formElements = formRef.current.querySelectorAll('input, textarea, select, button');
      formElements.forEach(element => {
        enhanceElement(element as HTMLElement);
      });
    }
  }, [enhanceElement]);

  useEffect(() => {
    enhanceFormElements();
  }, [enhanceFormElements]);

  return {
    formRef,
    announceFormError,
    announceFormSuccess,
    enhanceFormElements
  };
}

/**
 * Hook for navigation accessibility
 */
export function useNavigationAccessibility() {
  const navRef = useRef<HTMLElement>(null);
  const { announce, enhanceElement } = useAccessibility();

  const announceNavigation = useCallback((destination: string) => {
    announce(`Navigating to ${destination}`, 'assertive');
  }, [announce]);

  const enhanceNavElements = useCallback(() => {
    if (navRef.current) {
      const navElements = navRef.current.querySelectorAll('a, button, [role="menuitem"]');
      navElements.forEach(element => {
        enhanceElement(element as HTMLElement);
      });
    }
  }, [enhanceElement]);

  useEffect(() => {
    enhanceNavElements();
  }, [enhanceNavElements]);

  return {
    navRef,
    announceNavigation,
    enhanceNavElements
  };
}

/**
 * Hook for touch target validation
 */
export function useTouchTargetValidation(elementRef: React.RefObject<HTMLElement>) {
  const [validation, setValidation] = useState<{ isValid: boolean; suggestions: string[] }>({
    isValid: true,
    suggestions: []
  });
  const { validateTouchTarget, isInitialized } = useAccessibility();

  useEffect(() => {
    if (isInitialized && elementRef.current) {
      const result = validateTouchTarget(elementRef.current);
      setValidation(result);
    }
  }, [isInitialized, validateTouchTarget, elementRef]);

  return validation;
}

/**
 * Hook for accessibility testing
 */
export function useAccessibilityTesting() {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const runAccessibilityTest = useCallback(async () => {
    setIsRunning(true);
    try {
      const htmlReport = await accessibilityManager.generateReport();
      setReport(htmlReport);
    } catch (error) {
      console.error('Accessibility test failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, []);

  return {
    runAccessibilityTest,
    isRunning,
    report
  };
}