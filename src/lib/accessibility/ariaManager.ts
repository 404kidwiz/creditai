/**
 * ARIA Manager - Comprehensive ARIA compliance and screen reader support
 * Ensures WCAG 2.1 AA compliance for all interactive elements
 */

interface AriaLabelMap {
  [key: string]: string;
}

interface AriaDescriptionMap {
  [key: string]: string;
}

interface LiveRegionOptions {
  politeness: 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  busy?: boolean;
}

export class AriaManager {
  private static instance: AriaManager;
  private liveRegions: Map<string, HTMLElement> = new Map();
  private labelMap: AriaLabelMap = {};
  private descriptionMap: AriaDescriptionMap = {};
  private announceQueue: Array<{ message: string; options: LiveRegionOptions }> = [];
  private isProcessingQueue: boolean = false;

  static getInstance(): AriaManager {
    if (!this.instance) {
      this.instance = new AriaManager();
    }
    return this.instance;
  }

  constructor() {
    this.initializeDefaultLabels();
    this.createLiveRegions();
    this.initializeAriaEnhancements();
  }

  /**
   * Initialize default ARIA labels for common elements
   */
  private initializeDefaultLabels(): void {
    this.labelMap = {
      // Navigation
      'nav-toggle': 'Toggle navigation menu',
      'nav-close': 'Close navigation menu',
      'breadcrumb': 'Breadcrumb navigation',
      'pagination': 'Pagination navigation',
      
      // Forms
      'search-input': 'Search',
      'search-submit': 'Submit search',
      'form-submit': 'Submit form',
      'form-reset': 'Reset form',
      'form-cancel': 'Cancel',
      
      // Modals and dialogs
      'modal-close': 'Close dialog',
      'modal-confirm': 'Confirm action',
      'modal-cancel': 'Cancel action',
      
      // File upload
      'file-upload': 'Upload file',
      'file-remove': 'Remove file',
      'file-download': 'Download file',
      
      // Credit report specific
      'credit-score': 'Credit score',
      'credit-account': 'Credit account details',
      'dispute-action': 'Dispute this item',
      'analysis-toggle': 'Toggle analysis details',
      
      // Data visualization
      'chart': 'Data visualization chart',
      'chart-data': 'Chart data point',
      'progress': 'Progress indicator',
      
      // Interactive elements
      'expand': 'Expand section',
      'collapse': 'Collapse section',
      'sort': 'Sort column',
      'filter': 'Filter options',
      'refresh': 'Refresh content',
      'settings': 'Open settings',
      'help': 'Open help'
    };

    this.descriptionMap = {
      'credit-score': 'Your current credit score with detailed breakdown',
      'credit-account': 'Account information including balance, payment history, and status',
      'dispute-recommendation': 'AI-generated recommendation for disputing this credit item',
      'analysis-results': 'Detailed analysis results from AI processing of your credit report',
      'processing-status': 'Current status of document processing and analysis',
      'confidence-indicator': 'Confidence level of AI analysis accuracy'
    };
  }

  /**
   * Create live regions for announcements
   */
  private createLiveRegions(): void {
    // Polite announcements
    const politeRegion = document.createElement('div');
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.className = 'sr-only';
    politeRegion.id = 'aria-live-polite';
    document.body.appendChild(politeRegion);
    this.liveRegions.set('polite', politeRegion);

    // Assertive announcements
    const assertiveRegion = document.createElement('div');
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.className = 'sr-only';
    assertiveRegion.id = 'aria-live-assertive';
    document.body.appendChild(assertiveRegion);
    this.liveRegions.set('assertive', assertiveRegion);

    // Status announcements
    const statusRegion = document.createElement('div');
    statusRegion.setAttribute('role', 'status');
    statusRegion.setAttribute('aria-live', 'polite');
    statusRegion.className = 'sr-only';
    statusRegion.id = 'aria-status';
    document.body.appendChild(statusRegion);
    this.liveRegions.set('status', statusRegion);
  }

  /**
   * Initialize ARIA enhancements for existing elements
   */
  private initializeAriaEnhancements(): void {
    // Enhance forms
    this.enhanceForms();
    
    // Enhance navigation
    this.enhanceNavigation();
    
    // Enhance interactive elements
    this.enhanceInteractiveElements();
    
    // Set up mutation observer for dynamic content
    this.setupDynamicEnhancement();
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, options: LiveRegionOptions = { politeness: 'polite' }): void {
    this.announceQueue.push({ message, options });
    
    if (!this.isProcessingQueue) {
      this.processAnnounceQueue();
    }
  }

  /**
   * Process announcement queue to prevent conflicts
   */
  private async processAnnounceQueue(): Promise<void> {
    this.isProcessingQueue = true;
    
    while (this.announceQueue.length > 0) {
      const { message, options } = this.announceQueue.shift()!;
      await this.makeAnnouncement(message, options);
      
      // Wait between announcements to ensure they're heard
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Make individual announcement
   */
  private async makeAnnouncement(message: string, options: LiveRegionOptions): Promise<void> {
    const regionKey = options.politeness === 'assertive' ? 'assertive' : 'polite';
    const region = this.liveRegions.get(regionKey);
    
    if (region) {
      // Update ARIA attributes if specified
      if (options.atomic !== undefined) {
        region.setAttribute('aria-atomic', String(options.atomic));
      }
      if (options.relevant) {
        region.setAttribute('aria-relevant', options.relevant);
      }
      if (options.busy !== undefined) {
        region.setAttribute('aria-busy', String(options.busy));
      }
      
      // Clear previous content and set new message
      region.textContent = '';
      
      // Use setTimeout to ensure screen readers detect the change
      setTimeout(() => {
        region.textContent = message;
      }, 10);
      
      // Clear after announcement to avoid repetition
      setTimeout(() => {
        if (region.textContent === message) {
          region.textContent = '';
        }
      }, 1000);
    }
  }

  /**
   * Add ARIA label to element
   */
  addLabel(element: HTMLElement, labelKey: string, customLabel?: string): void {
    const label = customLabel || this.labelMap[labelKey] || labelKey;
    element.setAttribute('aria-label', label);
  }

  /**
   * Add ARIA description to element
   */
  addDescription(element: HTMLElement, descriptionKey: string, customDescription?: string): void {
    const description = customDescription || this.descriptionMap[descriptionKey] || descriptionKey;
    
    // Create description element if it doesn't exist
    let descriptionId = element.getAttribute('aria-describedby');
    let descriptionElement: HTMLElement;
    
    if (descriptionId) {
      descriptionElement = document.getElementById(descriptionId)!;
    } else {
      descriptionId = `desc-${Math.random().toString(36).substr(2, 9)}`;
      descriptionElement = document.createElement('div');
      descriptionElement.id = descriptionId;
      descriptionElement.className = 'sr-only';
      document.body.appendChild(descriptionElement);
      element.setAttribute('aria-describedby', descriptionId);
    }
    
    descriptionElement.textContent = description;
  }

  /**
   * Enhance forms with ARIA attributes
   */
  private enhanceForms(): void {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      // Add form role if not present
      if (!form.getAttribute('role')) {
        form.setAttribute('role', 'form');
      }
      
      // Enhance form controls
      this.enhanceFormControls(form);
      
      // Add fieldset enhancements
      this.enhanceFieldsets(form);
      
      // Add error handling
      this.enhanceFormErrors(form);
    });
  }

  /**
   * Enhance form controls
   */
  private enhanceFormControls(form: HTMLFormElement): void {
    const controls = form.querySelectorAll('input, textarea, select');
    
    controls.forEach(control => {
      const htmlControl = control as HTMLElement;
      const label = form.querySelector(`label[for="${control.id}"]`) || 
                   control.closest('.form-group, .field')?.querySelector('label');
      
      // Ensure proper labeling
      if (label && !control.getAttribute('aria-labelledby') && !control.getAttribute('aria-label')) {
        if (!label.id) {
          label.id = `label-${Math.random().toString(36).substr(2, 9)}`;
        }
        control.setAttribute('aria-labelledby', label.id);
      }
      
      // Add required indicator
      if (control.hasAttribute('required')) {
        control.setAttribute('aria-required', 'true');
        
        // Add visual indicator if not present
        if (label && !label.querySelector('.required-indicator')) {
          const indicator = document.createElement('span');
          indicator.className = 'required-indicator';
          indicator.setAttribute('aria-hidden', 'true');
          indicator.textContent = ' *';
          label.appendChild(indicator);
        }
      }
      
      // Handle invalid states
      if (control.matches(':invalid')) {
        control.setAttribute('aria-invalid', 'true');
      }
      
      // Add input type specific enhancements
      this.enhanceInputType(htmlControl);
    });
  }

  /**
   * Enhance specific input types
   */
  private enhanceInputType(input: HTMLElement): void {
    const inputElement = input as HTMLInputElement;
    
    switch (inputElement.type) {
      case 'password':
        this.addDescription(input, 'password-requirements', 
          'Password must be at least 8 characters long');
        break;
        
      case 'email':
        this.addDescription(input, 'email-format', 
          'Enter a valid email address');
        break;
        
      case 'tel':
        this.addDescription(input, 'phone-format', 
          'Enter phone number with area code');
        break;
        
      case 'file':
        this.addLabel(input, 'file-upload');
        this.addDescription(input, 'file-types', 
          'Accepted file types: PDF, JPG, PNG');
        break;
        
      case 'range':
        input.setAttribute('aria-valuemin', inputElement.min || '0');
        input.setAttribute('aria-valuemax', inputElement.max || '100');
        input.setAttribute('aria-valuenow', inputElement.value);
        
        inputElement.addEventListener('input', () => {
          input.setAttribute('aria-valuenow', inputElement.value);
        });
        break;
    }
  }

  /**
   * Enhance fieldsets and form groups
   */
  private enhanceFieldsets(form: HTMLFormElement): void {
    const fieldsets = form.querySelectorAll('fieldset');
    
    fieldsets.forEach(fieldset => {
      const legend = fieldset.querySelector('legend');
      
      if (legend && !fieldset.getAttribute('aria-labelledby')) {
        if (!legend.id) {
          legend.id = `legend-${Math.random().toString(36).substr(2, 9)}`;
        }
        fieldset.setAttribute('aria-labelledby', legend.id);
      }
    });
  }

  /**
   * Enhance form error handling
   */
  private enhanceFormErrors(form: HTMLFormElement): void {
    const errorContainer = form.querySelector('.form-errors, .error-summary');
    
    if (errorContainer) {
      errorContainer.setAttribute('role', 'alert');
      errorContainer.setAttribute('aria-live', 'assertive');
      
      // Link errors to form controls
      const errorMessages = errorContainer.querySelectorAll('.error-message');
      errorMessages.forEach(error => {
        const fieldName = error.getAttribute('data-field');
        if (fieldName) {
          const field = form.querySelector(`[name="${fieldName}"]`);
          if (field) {
            if (!error.id) {
              error.id = `error-${Math.random().toString(36).substr(2, 9)}`;
            }
            
            const existingDescribedBy = field.getAttribute('aria-describedby');
            const newDescribedBy = existingDescribedBy ? 
              `${existingDescribedBy} ${error.id}` : error.id;
            
            field.setAttribute('aria-describedby', newDescribedBy);
            field.setAttribute('aria-invalid', 'true');
          }
        }
      });
    }
  }

  /**
   * Enhance navigation elements
   */
  private enhanceNavigation(): void {
    // Main navigation
    const navElements = document.querySelectorAll('nav, [role="navigation"]');
    navElements.forEach(nav => {
      if (!nav.getAttribute('aria-label') && !nav.getAttribute('aria-labelledby')) {
        this.addLabel(nav as HTMLElement, 'nav-main', 'Main navigation');
      }
    });

    // Breadcrumbs
    const breadcrumbs = document.querySelectorAll('.breadcrumb, [aria-label*="breadcrumb" i]');
    breadcrumbs.forEach(breadcrumb => {
      breadcrumb.setAttribute('role', 'navigation');
      this.addLabel(breadcrumb as HTMLElement, 'breadcrumb');
    });

    // Pagination
    const pagination = document.querySelectorAll('.pagination, [aria-label*="pagination" i]');
    pagination.forEach(page => {
      page.setAttribute('role', 'navigation');
      this.addLabel(page as HTMLElement, 'pagination');
    });

    // Skip links
    this.enhanceSkipLinks();
  }

  /**
   * Enhance skip links
   */
  private enhanceSkipLinks(): void {
    const skipLinks = document.querySelectorAll('.skip-link, [href^="#"]:first-child');
    
    skipLinks.forEach(link => {
      const href = link.getAttribute('href');
      const target = href ? document.querySelector(href) : null;
      
      if (target) {
        // Ensure target is focusable
        if (!target.getAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
        }
        
        // Handle skip link activation
        link.addEventListener('click', (e) => {
          e.preventDefault();
          (target as HTMLElement).focus();
          this.announce(`Skipped to ${target.getAttribute('aria-label') || target.textContent || 'section'}`);
        });
      }
    });
  }

  /**
   * Enhance interactive elements
   */
  private enhanceInteractiveElements(): void {
    // Buttons without explicit labels
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttons.forEach(button => {
      const text = button.textContent?.trim();
      if (!text || text.length < 2) {
        // Button needs a label
        const icon = button.querySelector('svg, .icon, i[class*="icon"]');
        if (icon) {
          this.addLabel(button as HTMLElement, 'icon-button', 'Action button');
        }
      }
    });

    // Links without descriptive text
    const links = document.querySelectorAll('a:not([aria-label]):not([aria-labelledby])');
    links.forEach(link => {
      const text = link.textContent?.trim();
      if (!text || ['click here', 'read more', 'link'].includes(text.toLowerCase())) {
        // Link needs better description
        const context = link.closest('article, section, .card')?.querySelector('h1, h2, h3, .title');
        if (context) {
          this.addLabel(link as HTMLElement, 'contextual-link', 
            `Read more about ${context.textContent?.trim()}`);
        }
      }
    });

    // Interactive widgets
    this.enhanceWidgets();
  }

  /**
   * Enhance custom widgets
   */
  private enhanceWidgets(): void {
    // Tabs
    const tabLists = document.querySelectorAll('[role="tablist"], .tabs');
    tabLists.forEach(tabList => {
      if (!tabList.getAttribute('role')) {
        tabList.setAttribute('role', 'tablist');
      }
      
      const tabs = tabList.querySelectorAll('[role="tab"], .tab');
      const panels = document.querySelectorAll('[role="tabpanel"], .tab-panel');
      
      tabs.forEach((tab, index) => {
        const tabElement = tab as HTMLElement;
        const panel = panels[index] as HTMLElement;
        
        if (!tab.getAttribute('role')) {
          tab.setAttribute('role', 'tab');
        }
        
        if (!tab.id) {
          tab.id = `tab-${index}`;
        }
        
        if (panel) {
          if (!panel.getAttribute('role')) {
            panel.setAttribute('role', 'tabpanel');
          }
          
          if (!panel.id) {
            panel.id = `panel-${index}`;
          }
          
          tab.setAttribute('aria-controls', panel.id);
          panel.setAttribute('aria-labelledby', tab.id);
        }
        
        // Set initial states
        const isSelected = tab.classList.contains('active') || 
                          tab.getAttribute('aria-selected') === 'true';
        
        tab.setAttribute('aria-selected', String(isSelected));
        tab.setAttribute('tabindex', isSelected ? '0' : '-1');
        
        if (panel) {
          panel.style.display = isSelected ? 'block' : 'none';
        }
      });
    });

    // Accordions
    const accordions = document.querySelectorAll('.accordion, [data-accordion]');
    accordions.forEach(accordion => {
      const headers = accordion.querySelectorAll('.accordion-header, .accordion-toggle');
      const panels = accordion.querySelectorAll('.accordion-content, .accordion-panel');
      
      headers.forEach((header, index) => {
        const panel = panels[index] as HTMLElement;
        
        if (!header.id) {
          header.id = `accordion-header-${index}`;
        }
        
        if (panel && !panel.id) {
          panel.id = `accordion-panel-${index}`;
        }
        
        header.setAttribute('aria-expanded', 'false');
        header.setAttribute('aria-controls', panel?.id || '');
        
        if (panel) {
          panel.setAttribute('aria-labelledby', header.id);
          panel.setAttribute('role', 'region');
        }
      });
    });

    // Dropdown menus
    const dropdowns = document.querySelectorAll('[data-dropdown], .dropdown');
    dropdowns.forEach(dropdown => {
      const trigger = dropdown.querySelector('button, .dropdown-trigger');
      const menu = dropdown.querySelector('.dropdown-menu, [role="menu"]');
      
      if (trigger && menu) {
        if (!trigger.id) {
          trigger.id = `dropdown-trigger-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        if (!menu.id) {
          menu.id = `dropdown-menu-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-controls', menu.id);
        
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-labelledby', trigger.id);
        
        // Enhance menu items
        const menuItems = menu.querySelectorAll('a, button, [role="menuitem"]');
        menuItems.forEach(item => {
          if (!item.getAttribute('role')) {
            item.setAttribute('role', 'menuitem');
          }
        });
      }
    });
  }

  /**
   * Setup dynamic content enhancement
   */
  private setupDynamicEnhancement(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            this.enhanceNewElement(element);
          }
        });
        
        // Handle attribute changes for ARIA states
        if (mutation.type === 'attributes' && mutation.attributeName?.startsWith('aria-')) {
          this.handleAriaAttributeChange(mutation);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-expanded', 'aria-selected', 'aria-checked']
    });
  }

  /**
   * Enhance newly added elements
   */
  private enhanceNewElement(element: HTMLElement): void {
    // Check if element needs ARIA enhancements
    if (element.matches('form')) {
      this.enhanceFormControls(element as HTMLFormElement);
    }
    
    if (element.matches('nav, [role="navigation"]')) {
      this.enhanceNavigation();
    }
    
    if (element.matches('button, a, [role="button"]')) {
      this.enhanceInteractiveElements();
    }
    
    // Scan for widgets within the new element
    if (element.querySelector('[role="tablist"], .tabs, .accordion, [data-dropdown]')) {
      this.enhanceWidgets();
    }
  }

  /**
   * Handle ARIA attribute changes
   */
  private handleAriaAttributeChange(mutation: MutationRecord): void {
    const element = mutation.target as HTMLElement;
    const attributeName = mutation.attributeName!;
    const newValue = element.getAttribute(attributeName);
    
    // Announce state changes
    switch (attributeName) {
      case 'aria-expanded':
        if (newValue === 'true') {
          this.announce(`${element.textContent?.trim() || 'Section'} expanded`);
        } else if (newValue === 'false') {
          this.announce(`${element.textContent?.trim() || 'Section'} collapsed`);
        }
        break;
        
      case 'aria-selected':
        if (newValue === 'true') {
          this.announce(`${element.textContent?.trim() || 'Item'} selected`);
        }
        break;
        
      case 'aria-checked':
        if (newValue === 'true') {
          this.announce(`${element.textContent?.trim() || 'Option'} checked`);
        } else if (newValue === 'false') {
          this.announce(`${element.textContent?.trim() || 'Option'} unchecked`);
        }
        break;
    }
  }

  /**
   * Add custom ARIA label
   */
  setCustomLabel(element: HTMLElement, label: string): void {
    element.setAttribute('aria-label', label);
  }

  /**
   * Add custom ARIA description
   */
  setCustomDescription(element: HTMLElement, description: string): void {
    this.addDescription(element, 'custom', description);
  }

  /**
   * Update live region content
   */
  updateStatus(message: string): void {
    const statusRegion = this.liveRegions.get('status');
    if (statusRegion) {
      statusRegion.textContent = message;
    }
  }

  /**
   * Clear all live regions
   */
  clearAnnouncements(): void {
    this.liveRegions.forEach(region => {
      region.textContent = '';
    });
    this.announceQueue = [];
  }
}

// Export singleton instance
export const ariaManager = AriaManager.getInstance();