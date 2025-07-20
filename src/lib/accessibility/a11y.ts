// WCAG 2.1 AA Compliance Utilities

export const ARIA_LABELS = {
  navigation: {
    main: 'Main navigation',
    breadcrumb: 'Breadcrumb navigation',
    pagination: 'Pagination navigation',
  },
  buttons: {
    close: 'Close',
    menu: 'Open menu',
    submit: 'Submit form',
    cancel: 'Cancel',
    search: 'Search',
    filter: 'Filter results',
    sort: 'Sort results',
    refresh: 'Refresh data',
    download: 'Download',
    upload: 'Upload file',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save changes',
    settings: 'Open settings',
  },
  status: {
    loading: 'Loading',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
  },
  forms: {
    required: 'Required field',
    optional: 'Optional field',
    error: 'Error in field',
    helpText: 'Help text for',
  },
};

// Focus management utilities
export const focusManagement = {
  // Trap focus within a container
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  },

  // Focus first element in container
  focusFirst: (container: HTMLElement) => {
    const focusable = container.querySelector(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    focusable?.focus();
  },

  // Restore focus to previous element
  restoreFocus: (previousElement: HTMLElement | null) => {
    if (previousElement && document.body.contains(previousElement)) {
      previousElement.focus();
    }
  },
};

// Keyboard navigation utilities
export const keyboardNav = {
  // Handle arrow key navigation in lists
  handleListNavigation: (
    e: KeyboardEvent,
    currentIndex: number,
    totalItems: number,
    onNavigate: (index: number) => void
  ) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        onNavigate((currentIndex + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        onNavigate((currentIndex - 1 + totalItems) % totalItems);
        break;
      case 'Home':
        e.preventDefault();
        onNavigate(0);
        break;
      case 'End':
        e.preventDefault();
        onNavigate(totalItems - 1);
        break;
    }
  },

  // Handle escape key
  handleEscape: (callback: () => void) => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  },
};

// Color contrast utilities
export const colorContrast = {
  // Check if color contrast meets WCAG AA standards
  meetsWCAGAA: (foreground: string, background: string): boolean => {
    const getLuminance = (color: string): number => {
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0;
      
      const [r, g, b] = rgb.map(x => {
        const val = parseInt(x) / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    
    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    return contrast >= 4.5;
  },
};

// Screen reader utilities
export const screenReader = {
  // Announce message to screen readers
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  // Create screen reader only text
  srOnly: (text: string) => ({
    className: 'sr-only',
    children: text,
  }),
};

// Form accessibility utilities
export const formA11y = {
  // Generate unique IDs for form elements
  generateId: (prefix: string): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Create accessible error message
  errorMessage: (fieldName: string, error: string) => ({
    role: 'alert',
    'aria-live': 'polite',
    id: `${fieldName}-error`,
    children: error,
  }),

  // Create accessible field description
  fieldDescription: (fieldName: string, description: string) => ({
    id: `${fieldName}-description`,
    children: description,
  }),
};

// Skip links for keyboard navigation
export const skipLinks = {
  // Create skip link component props
  create: (target: string, text: string = 'Skip to main content') => ({
    href: `#${target}`,
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md',
    children: text,
  }),
};

// Reduced motion utilities
export const reducedMotion = {
  // Check if user prefers reduced motion
  prefersReduced: (): boolean => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Get appropriate animation duration
  getDuration: (defaultDuration: number): number => {
    return reducedMotion.prefersReduced() ? 0 : defaultDuration;
  },
};

// High contrast mode utilities
export const highContrast = {
  // Check if user prefers high contrast
  prefersHighContrast: (): boolean => {
    return window.matchMedia('(prefers-contrast: high)').matches;
  },

  // Get appropriate styles for high contrast mode
  getStyles: (normalStyles: any, highContrastStyles: any) => {
    return highContrast.prefersHighContrast() ? highContrastStyles : normalStyles;
  },
};

// Text sizing utilities for readability
export const textSizing = {
  // Ensure minimum text size for WCAG compliance
  ensureMinimumSize: (size: number): number => {
    return Math.max(size, 12); // Minimum 12px for body text
  },

  // Scale text based on user preferences
  scaleText: (baseSize: number): number => {
    const userScale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
    return baseSize * userScale;
  },
};

// Focus visible utilities
export const focusVisible = {
  // Apply focus visible styles
  styles: {
    outline: 'none',
    boxShadow: '0 0 0 2px var(--background), 0 0 0 4px var(--ring)',
    '&:focus-visible': {
      outline: 'none',
      boxShadow: '0 0 0 2px var(--background), 0 0 0 4px var(--ring)',
    },
  },
};

// Touch target sizing for WCAG compliance
export const touchTargets = {
  // Minimum touch target size (44x44px)
  minSize: 44,
  
  // Ensure element meets minimum touch target size
  ensureMinimumSize: (styles: any) => ({
    ...styles,
    minWidth: touchTargets.minSize,
    minHeight: touchTargets.minSize,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
};