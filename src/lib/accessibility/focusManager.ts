export class FocusManager {
  private static instance: FocusManager;
  private focusStack: HTMLElement[] = [];
  private trapStack: HTMLElement[] = [];
  private skipLinksContainer: HTMLElement | null = null;
  private focusIndicator: HTMLElement | null = null;
  private lastFocusedElement: HTMLElement | null = null;

  static getInstance(): FocusManager {
    if (!this.instance) {
      this.instance = new FocusManager();
    }
    return this.instance;
  }

  constructor() {
    this.initializeFocusIndicator();
    this.setupGlobalFocusHandling();
    this.createSkipLinks();
  }

  // Save current focus and set new focus
  saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
    }
  }

  // Restore previously saved focus
  restoreFocus(): void {
    const lastFocused = this.focusStack.pop();
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
    }
  }

  // Trap focus within a container
  trapFocus(container: HTMLElement): void {
    this.trapStack.push(container);
    this.addFocusTrap(container);
  }

  // Remove focus trap
  removeFocusTrap(): void {
    const container = this.trapStack.pop();
    if (container) {
      this.removeFocusTrapListeners(container);
    }
  }

  private addFocusTrap(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    (container as any)._focusTrapHandler = handleKeyDown;

    // Focus first element
    firstElement.focus();
  }

  private removeFocusTrapListeners(container: HTMLElement): void {
    const handler = (container as any)._focusTrapHandler;
    if (handler) {
      container.removeEventListener('keydown', handler);
      delete (container as any)._focusTrapHandler;
    }
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(el => this.isVisible(el as HTMLElement)) as HTMLElement[];
  }

  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  // Announce to screen readers
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;

    document.body.appendChild(announcer);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }

  // Check if element is focusable
  isFocusable(element: HTMLElement): boolean {
    const focusableElements = this.getFocusableElements(document.body);
    return focusableElements.includes(element);
  }

  // Move focus to next/previous focusable element
  moveFocus(direction: 'next' | 'previous'): void {
    const focusableElements = this.getFocusableElements(document.body);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % focusableElements.length;
    } else {
      nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    }

    focusableElements[nextIndex].focus();
  }

  /**
   * Initialize custom focus indicator for enhanced visibility
   */
  private initializeFocusIndicator(): void {
    this.focusIndicator = document.createElement('div');
    this.focusIndicator.className = 'focus-indicator';
    this.focusIndicator.setAttribute('aria-hidden', 'true');
    this.focusIndicator.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      border: 2px solid #0066cc;
      border-radius: 4px;
      background: rgba(0, 102, 204, 0.1);
      transition: all 0.15s ease;
      opacity: 0;
      z-index: 9999;
    `;
    document.body.appendChild(this.focusIndicator);
  }

  /**
   * Setup global focus handling
   */
  private setupGlobalFocusHandling(): void {
    document.addEventListener('focusin', (e) => {
      const target = e.target as HTMLElement;
      this.lastFocusedElement = target;
      this.updateFocusIndicator(target);
    });

    document.addEventListener('focusout', () => {
      if (this.focusIndicator) {
        this.focusIndicator.style.opacity = '0';
      }
    });

    // Handle keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.handleTabNavigation(e);
      }
    });
  }

  /**
   * Update visual focus indicator
   */
  private updateFocusIndicator(element: HTMLElement): void {
    if (!this.focusIndicator) return;

    const rect = element.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    this.focusIndicator.style.cssText += `
      top: ${rect.top + scrollY - 2}px;
      left: ${rect.left + scrollX - 2}px;
      width: ${rect.width + 4}px;
      height: ${rect.height + 4}px;
      opacity: 1;
    `;
  }

  /**
   * Handle tab navigation with enhanced behavior
   */
  private handleTabNavigation(e: KeyboardEvent): void {
    const focusableElements = this.getFocusableElements(document.body);
    const currentElement = document.activeElement as HTMLElement;
    const currentIndex = focusableElements.indexOf(currentElement);

    // Handle reverse tabbing
    if (e.shiftKey && currentIndex === 0) {
      // Focus last element
      e.preventDefault();
      focusableElements[focusableElements.length - 1].focus();
    } else if (!e.shiftKey && currentIndex === focusableElements.length - 1) {
      // Focus first element
      e.preventDefault();
      focusableElements[0].focus();
    }
  }

  /**
   * Create skip links for improved accessibility
   */
  private createSkipLinks(): void {
    this.skipLinksContainer = document.createElement('div');
    this.skipLinksContainer.className = 'skip-links';
    this.skipLinksContainer.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
      <a href="#search" class="skip-link">Skip to search</a>
    `;

    // Style skip links
    const style = document.createElement('style');
    style.textContent = `
      .skip-links {
        position: absolute;
        top: -40px;
        left: 6px;
        z-index: 10000;
      }
      
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10001;
        transition: top 0.3s;
      }
      
      .skip-link:focus {
        top: 6px;
      }
    `;
    
    document.head.appendChild(style);
    document.body.insertBefore(this.skipLinksContainer, document.body.firstChild);

    // Add click handlers for skip links
    this.skipLinksContainer.querySelectorAll('.skip-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        const target = href ? document.querySelector(href) : null;
        
        if (target) {
          this.focusElement(target as HTMLElement);
          this.announce(`Skipped to ${target.getAttribute('aria-label') || href.slice(1)}`);
        }
      });
    });
  }

  /**
   * Focus element with enhanced behavior
   */
  focusElement(element: HTMLElement): void {
    // Make element focusable if not already
    if (!this.isFocusable(element)) {
      element.tabIndex = -1;
    }

    element.focus();
    
    // Scroll element into view if needed
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  }

  /**
   * Set focus to first focusable element in container
   */
  focusFirstElement(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  /**
   * Set focus to last focusable element in container
   */
  focusLastElement(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }

  /**
   * Return focus to previous element
   */
  returnFocus(): void {
    if (this.lastFocusedElement && document.contains(this.lastFocusedElement)) {
      this.lastFocusedElement.focus();
    }
  }

  /**
   * Check if element is currently visible and focusable
   */
  isElementFocusable(element: HTMLElement): boolean {
    return this.isVisible(element) && this.isFocusable(element);
  }

  /**
   * Get all focusable elements in order
   */
  getAllFocusableElements(): HTMLElement[] {
    return this.getFocusableElements(document.body);
  }

  /**
   * Create focus trap with enhanced features
   */
  createFocusTrap(container: HTMLElement, options: {
    initialFocus?: HTMLElement;
    returnFocus?: HTMLElement;
    allowOutsideClick?: boolean;
  } = {}): () => void {
    this.saveFocus();
    this.trapFocus(container);

    // Set initial focus
    if (options.initialFocus) {
      options.initialFocus.focus();
    } else {
      this.focusFirstElement(container);
    }

    // Return cleanup function
    return () => {
      this.removeFocusTrap();
      if (options.returnFocus) {
        options.returnFocus.focus();
      } else {
        this.restoreFocus();
      }
    };
  }

  /**
   * Manage focus for modal dialogs
   */
  manageModalFocus(modal: HTMLElement): () => void {
    const previousActiveElement = document.activeElement as HTMLElement;
    
    // Find the title or first heading for initial focus
    const title = modal.querySelector('h1, h2, .modal-title, [role="heading"]') as HTMLElement;
    const firstFocusable = this.getFocusableElements(modal)[0];
    
    return this.createFocusTrap(modal, {
      initialFocus: title || firstFocusable,
      returnFocus: previousActiveElement,
      allowOutsideClick: false
    });
  }

  /**
   * Enhanced announcement with focus context
   */
  announceWithFocus(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.announce(message, priority);
    
    // Also provide context about current focus
    const currentElement = document.activeElement as HTMLElement;
    if (currentElement && currentElement !== document.body) {
      const label = currentElement.getAttribute('aria-label') || 
                   currentElement.textContent?.trim() || 
                   currentElement.tagName.toLowerCase();
      
      setTimeout(() => {
        this.announce(`Currently focused on ${label}`, 'polite');
      }, 500);
    }
  }
}