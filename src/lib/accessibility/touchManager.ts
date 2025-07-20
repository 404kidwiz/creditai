/**
 * Touch Manager - Handles touch interactions, haptic feedback, and accessibility
 * Ensures WCAG 2.1 AA compliance for touch targets and mobile interactions
 */

interface TouchTargetValidation {
  element: HTMLElement;
  isValid: boolean;
  currentSize: { width: number; height: number };
  suggestions: string[];
}

interface HapticFeedbackOptions {
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification';
  intensity?: number;
}

export class TouchManager {
  private static instance: TouchManager;
  private hapticSupported: boolean = false;
  private touchTargets: Map<HTMLElement, TouchTargetValidation> = new Map();
  private readonly MIN_TOUCH_SIZE = 44; // WCAG AA requirement
  private readonly IDEAL_TOUCH_SIZE = 48; // Better UX

  static getInstance(): TouchManager {
    if (!this.instance) {
      this.instance = new TouchManager();
    }
    return this.instance;
  }

  constructor() {
    this.detectHapticSupport();
    this.initializeAccessibilityObserver();
  }

  /**
   * Detect if haptic feedback is supported
   */
  private detectHapticSupport(): void {
    // Check for Navigator vibration API
    this.hapticSupported = 'vibrate' in navigator;
    
    // Enhanced detection for modern devices
    if ('userAgentData' in navigator) {
      const ua = (navigator as any).userAgentData;
      this.hapticSupported = ua?.mobile || this.hapticSupported;
    }
  }

  /**
   * Provide haptic feedback for touch interactions
   */
  hapticFeedback(options: HapticFeedbackOptions): void {
    if (!this.hapticSupported) return;

    const patterns: Record<string, number[]> = {
      light: [10],
      medium: [20],
      heavy: [30],
      selection: [5],
      impact: [15, 10, 15],
      notification: [100, 50, 100]
    };

    const pattern = patterns[options.type] || patterns.light;
    
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  /**
   * Validate touch target size according to WCAG guidelines
   */
  validateTouchTarget(element: HTMLElement): TouchTargetValidation {
    const rect = element.getBoundingClientRect();
    const { width, height } = rect;
    
    const isValid = width >= this.MIN_TOUCH_SIZE && height >= this.MIN_TOUCH_SIZE;
    const suggestions: string[] = [];

    if (width < this.MIN_TOUCH_SIZE) {
      suggestions.push(`Increase width to at least ${this.MIN_TOUCH_SIZE}px (current: ${Math.round(width)}px)`);
    }
    
    if (height < this.MIN_TOUCH_SIZE) {
      suggestions.push(`Increase height to at least ${this.MIN_TOUCH_SIZE}px (current: ${Math.round(height)}px)`);
    }

    if (width < this.IDEAL_TOUCH_SIZE || height < this.IDEAL_TOUCH_SIZE) {
      suggestions.push(`Consider using ${this.IDEAL_TOUCH_SIZE}px for better user experience`);
    }

    const validation: TouchTargetValidation = {
      element,
      isValid,
      currentSize: { width: Math.round(width), height: Math.round(height) },
      suggestions
    };

    this.touchTargets.set(element, validation);
    return validation;
  }

  /**
   * Auto-fix touch target sizes
   */
  autoFixTouchTarget(element: HTMLElement): void {
    const validation = this.validateTouchTarget(element);
    
    if (!validation.isValid) {
      const computedStyle = window.getComputedStyle(element);
      const currentPadding = {
        top: parseInt(computedStyle.paddingTop) || 0,
        right: parseInt(computedStyle.paddingRight) || 0,
        bottom: parseInt(computedStyle.paddingBottom) || 0,
        left: parseInt(computedStyle.paddingLeft) || 0
      };

      // Calculate needed padding to reach minimum size
      const neededWidth = Math.max(0, this.MIN_TOUCH_SIZE - validation.currentSize.width);
      const neededHeight = Math.max(0, this.MIN_TOUCH_SIZE - validation.currentSize.height);

      const additionalPaddingX = Math.ceil(neededWidth / 2);
      const additionalPaddingY = Math.ceil(neededHeight / 2);

      // Apply CSS classes or direct styles
      element.style.paddingLeft = `${currentPadding.left + additionalPaddingX}px`;
      element.style.paddingRight = `${currentPadding.right + additionalPaddingX}px`;
      element.style.paddingTop = `${currentPadding.top + additionalPaddingY}px`;
      element.style.paddingBottom = `${currentPadding.bottom + additionalPaddingY}px`;

      // Ensure minimum dimensions
      element.style.minWidth = `${this.MIN_TOUCH_SIZE}px`;
      element.style.minHeight = `${this.MIN_TOUCH_SIZE}px`;

      // Add accessibility class
      element.classList.add('touch-target-enhanced');
    }
  }

  /**
   * Add touch interaction enhancements
   */
  enhanceTouchInteraction(element: HTMLElement): void {
    // Add touch target validation
    this.validateTouchTarget(element);

    // Add touch event handlers with haptic feedback
    element.addEventListener('touchstart', () => {
      this.hapticFeedback({ type: 'light' });
      element.classList.add('touch-active');
    });

    element.addEventListener('touchend', () => {
      element.classList.remove('touch-active');
    });

    element.addEventListener('touchcancel', () => {
      element.classList.remove('touch-active');
    });

    // Add click handler with enhanced feedback
    element.addEventListener('click', (event) => {
      // Provide appropriate haptic feedback based on element type
      const elementType = element.tagName.toLowerCase();
      const role = element.getAttribute('role');
      
      if (elementType === 'button' || role === 'button') {
        this.hapticFeedback({ type: 'medium' });
      } else if (element.type === 'submit') {
        this.hapticFeedback({ type: 'impact' });
      } else {
        this.hapticFeedback({ type: 'selection' });
      }
    });

    // Ensure proper touch-action CSS
    const touchAction = window.getComputedStyle(element).touchAction;
    if (!touchAction || touchAction === 'auto') {
      element.style.touchAction = 'manipulation';
    }
  }

  /**
   * Add swipe gesture support
   */
  addSwipeGesture(element: HTMLElement, callbacks: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
  }): void {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    const threshold = 50; // Minimum distance for swipe
    const maxTime = 300; // Maximum time for swipe

    element.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    });

    element.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;

      if (deltaTime > maxTime) return;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (Math.max(absX, absY) < threshold) return;

      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0 && callbacks.onSwipeRight) {
          this.hapticFeedback({ type: 'selection' });
          callbacks.onSwipeRight();
        } else if (deltaX < 0 && callbacks.onSwipeLeft) {
          this.hapticFeedback({ type: 'selection' });
          callbacks.onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && callbacks.onSwipeDown) {
          this.hapticFeedback({ type: 'selection' });
          callbacks.onSwipeDown();
        } else if (deltaY < 0 && callbacks.onSwipeUp) {
          this.hapticFeedback({ type: 'selection' });
          callbacks.onSwipeUp();
        }
      }
    });
  }

  /**
   * Initialize accessibility observer to auto-enhance interactive elements
   */
  private initializeAccessibilityObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            this.scanAndEnhanceInteractiveElements(element);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial scan
    this.scanAndEnhanceInteractiveElements(document.body);
  }

  /**
   * Scan and enhance interactive elements for touch accessibility
   */
  private scanAndEnhanceInteractiveElements(container: HTMLElement): void {
    const selectors = [
      'button',
      'input[type="button"]',
      'input[type="submit"]',
      'input[type="reset"]',
      'input[type="checkbox"]',
      'input[type="radio"]',
      'a[href]',
      '[role="button"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[tabindex="0"]',
      '[onclick]'
    ];

    const elements = container.querySelectorAll(selectors.join(', '));
    
    elements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      
      // Skip if already enhanced
      if (htmlElement.classList.contains('touch-enhanced')) return;
      
      this.enhanceTouchInteraction(htmlElement);
      htmlElement.classList.add('touch-enhanced');
    });
  }

  /**
   * Generate accessibility report for touch targets
   */
  generateTouchTargetReport(): {
    total: number;
    valid: number;
    invalid: number;
    validations: TouchTargetValidation[];
  } {
    const validations = Array.from(this.touchTargets.values());
    const valid = validations.filter(v => v.isValid).length;
    const invalid = validations.length - valid;

    return {
      total: validations.length,
      valid,
      invalid,
      validations
    };
  }

  /**
   * Fix all invalid touch targets
   */
  autoFixAllTouchTargets(): void {
    this.touchTargets.forEach((validation, element) => {
      if (!validation.isValid) {
        this.autoFixTouchTarget(element);
      }
    });
  }

  /**
   * Add press and hold gesture
   */
  addPressAndHold(element: HTMLElement, callback: () => void, duration: number = 500): void {
    let pressTimer: NodeJS.Timeout;
    let isPressed = false;

    const startPress = () => {
      isPressed = true;
      this.hapticFeedback({ type: 'light' });
      pressTimer = setTimeout(() => {
        if (isPressed) {
          this.hapticFeedback({ type: 'heavy' });
          callback();
        }
      }, duration);
    };

    const endPress = () => {
      isPressed = false;
      clearTimeout(pressTimer);
    };

    element.addEventListener('touchstart', startPress);
    element.addEventListener('mousedown', startPress);
    element.addEventListener('touchend', endPress);
    element.addEventListener('touchcancel', endPress);
    element.addEventListener('mouseup', endPress);
    element.addEventListener('mouseleave', endPress);
  }
}

// Export singleton instance
export const touchManager = TouchManager.getInstance();