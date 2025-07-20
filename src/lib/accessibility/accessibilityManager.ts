/**
 * Accessibility Manager - Central hub for all accessibility features
 * Coordinates touch, keyboard, ARIA, and focus management
 */

import { touchManager } from './touchManager';
import { keyboardManager } from './keyboardManager';
import { ariaManager } from './ariaManager';
import { FocusManager } from './focusManager';
import { accessibilityTester } from './accessibilityTester';

interface AccessibilityConfig {
  enableTouchEnhancements: boolean;
  enableKeyboardShortcuts: boolean;
  enableAriaEnhancements: boolean;
  enableFocusManagement: boolean;
  enableHapticFeedback: boolean;
  enableAccessibilityTesting: boolean;
  autoFixTouchTargets: boolean;
  announceStateChanges: boolean;
}

interface AccessibilityStatus {
  touchTargetsValid: number;
  keyboardNavigable: number;
  ariaCompliant: number;
  overallScore: number;
  lastTestRun?: Date;
}

export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private focusManager: FocusManager;
  private config: AccessibilityConfig;
  private status: AccessibilityStatus;
  private initialized: boolean = false;

  static getInstance(): AccessibilityManager {
    if (!this.instance) {
      this.instance = new AccessibilityManager();
    }
    return this.instance;
  }

  constructor() {
    this.focusManager = FocusManager.getInstance();
    this.config = {
      enableTouchEnhancements: true,
      enableKeyboardShortcuts: true,
      enableAriaEnhancements: true,
      enableFocusManagement: true,
      enableHapticFeedback: true,
      enableAccessibilityTesting: false,
      autoFixTouchTargets: true,
      announceStateChanges: true
    };
    
    this.status = {
      touchTargetsValid: 0,
      keyboardNavigable: 0,
      ariaCompliant: 0,
      overallScore: 0
    };
  }

  /**
   * Initialize all accessibility features
   */
  async initialize(config?: Partial<AccessibilityConfig>): Promise<void> {
    if (this.initialized) return;

    // Merge configuration
    this.config = { ...this.config, ...config };

    try {
      // Initialize core accessibility features
      await this.initializeCoreFeatures();

      // Set up event listeners
      this.setupEventListeners();

      // Register keyboard shortcuts
      if (this.config.enableKeyboardShortcuts) {
        this.registerKeyboardShortcuts();
      }

      // Auto-enhance existing elements
      this.enhanceExistingElements();

      // Run initial accessibility assessment
      if (this.config.enableAccessibilityTesting) {
        await this.runAccessibilityAssessment();
      }

      this.initialized = true;
      
      // Announce initialization
      if (this.config.announceStateChanges) {
        ariaManager.announce('Accessibility features initialized', { politeness: 'polite' });
      }

      console.log('AccessibilityManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AccessibilityManager:', error);
      throw error;
    }
  }

  /**
   * Initialize core accessibility features
   */
  private async initializeCoreFeatures(): Promise<void> {
    // Initialize ARIA manager
    if (this.config.enableAriaEnhancements) {
      // ARIA manager initializes automatically
      console.log('ARIA enhancements enabled');
    }

    // Initialize touch manager
    if (this.config.enableTouchEnhancements) {
      // Touch manager initializes automatically
      console.log('Touch enhancements enabled');
    }

    // Initialize keyboard manager
    if (this.config.enableKeyboardShortcuts) {
      // Keyboard manager initializes automatically
      console.log('Keyboard navigation enabled');
    }

    // Initialize focus management
    if (this.config.enableFocusManagement) {
      // Focus manager initializes automatically
      console.log('Focus management enabled');
    }
  }

  /**
   * Setup global event listeners for accessibility
   */
  private setupEventListeners(): void {
    // Handle route changes for screen reader announcements
    if (typeof window !== 'undefined') {
      // Listen for navigation changes (for SPAs)
      window.addEventListener('popstate', () => {
        this.announcePageChange();
      });

      // Listen for page load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.announcePageLoad();
        });
      } else {
        this.announcePageLoad();
      }
    }
  }

  /**
   * Register common keyboard shortcuts
   */
  private registerKeyboardShortcuts(): void {
    keyboardManager.registerCommonShortcuts();

    // Application-specific shortcuts
    keyboardManager.registerShortcut({
      key: 'u',
      modifiers: { alt: true },
      callback: () => {
        const uploadButton = document.querySelector('[aria-label*="upload" i], input[type="file"]') as HTMLElement;
        if (uploadButton) {
          uploadButton.click();
          ariaManager.announce('Upload dialog opened');
        }
      },
      description: 'Open file upload'
    });

    keyboardManager.registerShortcut({
      key: 'd',
      modifiers: { alt: true },
      callback: () => {
        const dashboardLink = document.querySelector('a[href*="dashboard" i]') as HTMLElement;
        if (dashboardLink) {
          dashboardLink.click();
          ariaManager.announce('Navigating to dashboard');
        }
      },
      description: 'Go to dashboard'
    });

    keyboardManager.registerShortcut({
      key: 'a',
      modifiers: { alt: true },
      callback: () => {
        const analysisSection = document.querySelector('#analysis, [aria-label*="analysis" i]') as HTMLElement;
        if (analysisSection) {
          this.focusManager.focusElement(analysisSection);
          ariaManager.announce('Analysis section focused');
        }
      },
      description: 'Focus analysis section'
    });
  }

  /**
   * Enhance existing elements on the page
   */
  private enhanceExistingElements(): void {
    if (this.config.autoFixTouchTargets) {
      // Auto-fix touch targets
      setTimeout(() => {
        const report = touchManager.generateTouchTargetReport();
        console.log(`Touch target assessment: ${report.valid}/${report.total} valid`);
        
        if (report.invalid > 0) {
          touchManager.autoFixAllTouchTargets();
          ariaManager.announce(`Fixed ${report.invalid} touch targets for better accessibility`);
        }
      }, 1000);
    }

    // Enhance forms
    this.enhanceForms();

    // Enhance navigation
    this.enhanceNavigation();

    // Add missing ARIA labels
    this.addMissingAriaLabels();
  }

  /**
   * Enhance form accessibility
   */
  private enhanceForms(): void {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      // Add form role if missing
      if (!form.getAttribute('role')) {
        form.setAttribute('role', 'form');
      }

      // Enhance form submission
      form.addEventListener('submit', (e) => {
        const formName = form.getAttribute('aria-label') || 
                        form.querySelector('h1, h2, h3')?.textContent || 
                        'Form';
        ariaManager.announce(`${formName} submitted`, { politeness: 'assertive' });
      });

      // Enhance error handling
      const errorContainer = form.querySelector('.form-errors, .error-summary');
      if (errorContainer) {
        errorContainer.setAttribute('role', 'alert');
        errorContainer.setAttribute('aria-live', 'assertive');
      }
    });
  }

  /**
   * Enhance navigation accessibility
   */
  private enhanceNavigation(): void {
    // Enhance main navigation
    const navElements = document.querySelectorAll('nav, [role="navigation"]');
    navElements.forEach(nav => {
      if (!nav.getAttribute('aria-label')) {
        const isMain = nav.matches('.main-nav, .primary-nav, header nav');
        ariaManager.addLabel(nav as HTMLElement, 'navigation', 
          isMain ? 'Main navigation' : 'Navigation');
      }
    });

    // Enhance breadcrumbs
    const breadcrumbs = document.querySelectorAll('.breadcrumb, [aria-label*="breadcrumb" i]');
    breadcrumbs.forEach(breadcrumb => {
      if (!breadcrumb.getAttribute('role')) {
        breadcrumb.setAttribute('role', 'navigation');
      }
      if (!breadcrumb.getAttribute('aria-label')) {
        ariaManager.addLabel(breadcrumb as HTMLElement, 'breadcrumb');
      }
    });
  }

  /**
   * Add missing ARIA labels to common elements
   */
  private addMissingAriaLabels(): void {
    // Search inputs
    const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search" i]');
    searchInputs.forEach(input => {
      if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
        ariaManager.addLabel(input as HTMLElement, 'search-input');
      }
    });

    // Close buttons
    const closeButtons = document.querySelectorAll('button[aria-label*="close" i], .close, .modal-close');
    closeButtons.forEach(button => {
      if (!button.getAttribute('aria-label')) {
        ariaManager.addLabel(button as HTMLElement, 'modal-close');
      }
    });

    // Icon buttons
    const iconButtons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    iconButtons.forEach(button => {
      const hasText = button.textContent?.trim();
      const hasIcon = button.querySelector('svg, .icon, i[class*="icon"]');
      
      if (!hasText && hasIcon) {
        const context = button.closest('.card, .section')?.querySelector('h1, h2, h3, .title')?.textContent;
        const label = context ? `Action for ${context}` : 'Action button';
        ariaManager.addLabel(button as HTMLElement, 'icon-button', label);
      }
    });
  }

  /**
   * Announce page changes for screen readers
   */
  private announcePageChange(): void {
    const pageTitle = document.title;
    const mainHeading = document.querySelector('h1')?.textContent;
    const announcement = mainHeading || pageTitle || 'Page changed';
    
    setTimeout(() => {
      ariaManager.announce(`Page changed: ${announcement}`, { politeness: 'assertive' });
    }, 100);
  }

  /**
   * Announce page load
   */
  private announcePageLoad(): void {
    const pageTitle = document.title;
    const mainContent = document.querySelector('main, [role="main"]');
    
    if (mainContent && !mainContent.id) {
      mainContent.id = 'main-content';
    }
    
    setTimeout(() => {
      ariaManager.announce(`${pageTitle} page loaded`, { politeness: 'polite' });
    }, 500);
  }

  /**
   * Run comprehensive accessibility assessment
   */
  async runAccessibilityAssessment(): Promise<void> {
    try {
      const report = await accessibilityTester.runAllTests();
      
      this.status = {
        touchTargetsValid: this.calculateTouchTargetScore(),
        keyboardNavigable: this.calculateKeyboardScore(),
        ariaCompliant: this.calculateAriaScore(),
        overallScore: report.overallScore,
        lastTestRun: new Date()
      };

      console.log('Accessibility Assessment Results:', {
        overallScore: report.overallScore,
        compliance: report.compliance,
        summary: report.summary
      });

      // Log issues if any
      if (report.summary.errors > 0 || report.summary.warnings > 0) {
        console.warn(`Accessibility issues found: ${report.summary.errors} errors, ${report.summary.warnings} warnings`);
      }

    } catch (error) {
      console.error('Accessibility assessment failed:', error);
    }
  }

  /**
   * Calculate touch target score
   */
  private calculateTouchTargetScore(): number {
    const report = touchManager.generateTouchTargetReport();
    return report.total > 0 ? (report.valid / report.total) * 100 : 100;
  }

  /**
   * Calculate keyboard accessibility score
   */
  private calculateKeyboardScore(): number {
    const interactiveElements = document.querySelectorAll('button, input, select, textarea, a[href], [role="button"]');
    let keyboardAccessible = 0;

    interactiveElements.forEach(element => {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex !== '-1') {
        keyboardAccessible++;
      }
    });

    return interactiveElements.length > 0 ? (keyboardAccessible / interactiveElements.length) * 100 : 100;
  }

  /**
   * Calculate ARIA compliance score
   */
  private calculateAriaScore(): number {
    const interactiveElements = document.querySelectorAll('button, input, select, textarea, a[href], [role="button"]');
    let ariaCompliant = 0;

    interactiveElements.forEach(element => {
      const hasLabel = element.getAttribute('aria-label') || 
                     element.getAttribute('aria-labelledby') ||
                     element.textContent?.trim();
      if (hasLabel) {
        ariaCompliant++;
      }
    });

    return interactiveElements.length > 0 ? (ariaCompliant / interactiveElements.length) * 100 : 100;
  }

  /**
   * Provide haptic feedback
   */
  hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification' = 'light'): void {
    if (this.config.enableHapticFeedback) {
      touchManager.hapticFeedback({ type });
    }
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (this.config.announceStateChanges) {
      ariaManager.announce(message, { politeness: priority });
    }
  }

  /**
   * Focus element with enhanced behavior
   */
  focusElement(element: HTMLElement): void {
    this.focusManager.focusElement(element);
  }

  /**
   * Create modal focus trap
   */
  createModalFocusTrap(modal: HTMLElement): () => void {
    return this.focusManager.manageModalFocus(modal);
  }

  /**
   * Add touch enhancements to element
   */
  enhanceElement(element: HTMLElement): void {
    if (this.config.enableTouchEnhancements) {
      touchManager.enhanceTouchInteraction(element);
    }
  }

  /**
   * Get current accessibility status
   */
  getStatus(): AccessibilityStatus {
    return { ...this.status };
  }

  /**
   * Get accessibility configuration
   */
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  /**
   * Update accessibility configuration
   */
  updateConfig(config: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate accessibility report
   */
  async generateReport(): Promise<string> {
    if (this.config.enableAccessibilityTesting) {
      await this.runAccessibilityAssessment();
      return accessibilityTester.generateHTMLReport();
    } else {
      throw new Error('Accessibility testing is disabled');
    }
  }

  /**
   * Check if manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Cleanup accessibility features
   */
  cleanup(): void {
    // Clear any timers or event listeners
    this.initialized = false;
    console.log('AccessibilityManager cleaned up');
  }
}

// Export singleton instance
export const accessibilityManager = AccessibilityManager.getInstance();