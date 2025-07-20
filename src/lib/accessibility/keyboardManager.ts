/**
 * Keyboard Manager - Comprehensive keyboard navigation and accessibility
 * Implements WCAG 2.1 AA keyboard navigation standards
 */

interface KeyboardShortcut {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  callback: (event: KeyboardEvent) => void;
  description: string;
  scope?: HTMLElement;
}

interface NavigationGroup {
  name: string;
  elements: HTMLElement[];
  currentIndex: number;
  wrap: boolean;
  orientation: 'horizontal' | 'vertical' | 'both';
}

export class KeyboardManager {
  private static instance: KeyboardManager;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private navigationGroups: Map<string, NavigationGroup> = new Map();
  private isTrappingFocus: boolean = false;
  private trapContainer: HTMLElement | null = null;
  private skipLinks: HTMLElement[] = [];

  static getInstance(): KeyboardManager {
    if (!this.instance) {
      this.instance = new KeyboardManager();
    }
    return this.instance;
  }

  constructor() {
    this.initializeGlobalKeyboardHandling();
    this.createSkipLinks();
    this.enhanceFormNavigation();
  }

  /**
   * Initialize global keyboard event handling
   */
  private initializeGlobalKeyboardHandling(): void {
    document.addEventListener('keydown', (event) => {
      this.handleGlobalKeyDown(event);
    });

    // Handle roving tabindex for complex widgets
    document.addEventListener('focusin', (event) => {
      this.handleFocusIn(event);
    });

    // Handle arrow key navigation
    document.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        this.handleArrowKeyNavigation(event);
      }
    });
  }

  /**
   * Register keyboard shortcuts
   */
  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.generateShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister keyboard shortcuts
   */
  unregisterShortcut(key: string, modifiers?: KeyboardShortcut['modifiers']): void {
    const shortcutKey = this.generateShortcutKey({ key, modifiers } as KeyboardShortcut);
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Create navigation group for related elements
   */
  createNavigationGroup(
    name: string,
    elements: HTMLElement[],
    options: {
      wrap?: boolean;
      orientation?: 'horizontal' | 'vertical' | 'both';
    } = {}
  ): void {
    const group: NavigationGroup = {
      name,
      elements: elements.filter(el => this.isInteractive(el)),
      currentIndex: 0,
      wrap: options.wrap ?? true,
      orientation: options.orientation ?? 'both'
    };

    this.navigationGroups.set(name, group);
    this.setupGroupNavigation(group);
  }

  /**
   * Setup roving tabindex for navigation group
   */
  private setupGroupNavigation(group: NavigationGroup): void {
    group.elements.forEach((element, index) => {
      // Set tabindex based on current focus
      element.tabIndex = index === group.currentIndex ? 0 : -1;
      
      // Add ARIA attributes
      element.setAttribute('role', element.getAttribute('role') || 'button');
      
      // Add keyboard event handlers
      element.addEventListener('keydown', (event) => {
        this.handleGroupNavigation(event, group, index);
      });

      element.addEventListener('focus', () => {
        this.updateGroupFocus(group, index);
      });
    });
  }

  /**
   * Handle navigation within a group
   */
  private handleGroupNavigation(event: KeyboardEvent, group: NavigationGroup, currentIndex: number): void {
    let nextIndex = currentIndex;
    const maxIndex = group.elements.length - 1;

    switch (event.key) {
      case 'ArrowRight':
        if (group.orientation === 'horizontal' || group.orientation === 'both') {
          nextIndex = currentIndex < maxIndex ? currentIndex + 1 : (group.wrap ? 0 : currentIndex);
          event.preventDefault();
        }
        break;
      
      case 'ArrowLeft':
        if (group.orientation === 'horizontal' || group.orientation === 'both') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : (group.wrap ? maxIndex : currentIndex);
          event.preventDefault();
        }
        break;
      
      case 'ArrowDown':
        if (group.orientation === 'vertical' || group.orientation === 'both') {
          nextIndex = currentIndex < maxIndex ? currentIndex + 1 : (group.wrap ? 0 : currentIndex);
          event.preventDefault();
        }
        break;
      
      case 'ArrowUp':
        if (group.orientation === 'vertical' || group.orientation === 'both') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : (group.wrap ? maxIndex : currentIndex);
          event.preventDefault();
        }
        break;
      
      case 'Home':
        nextIndex = 0;
        event.preventDefault();
        break;
      
      case 'End':
        nextIndex = maxIndex;
        event.preventDefault();
        break;

      case 'Enter':
      case ' ':
        // Activate current element
        const activeElement = group.elements[currentIndex];
        if (activeElement) {
          activeElement.click();
          event.preventDefault();
        }
        break;
    }

    if (nextIndex !== currentIndex) {
      this.updateGroupFocus(group, nextIndex);
      group.elements[nextIndex].focus();
    }
  }

  /**
   * Update focus within navigation group
   */
  private updateGroupFocus(group: NavigationGroup, newIndex: number): void {
    // Update tabindex for all elements
    group.elements.forEach((element, index) => {
      element.tabIndex = index === newIndex ? 0 : -1;
    });
    
    group.currentIndex = newIndex;
  }

  /**
   * Handle global keyboard shortcuts
   */
  private handleGlobalKeyDown(event: KeyboardEvent): void {
    const shortcutKey = this.generateShortcutKey({
      key: event.key,
      modifiers: {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey
      }
    } as KeyboardShortcut);

    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      // Check scope if specified
      if (shortcut.scope && !shortcut.scope.contains(event.target as Node)) {
        return;
      }
      
      event.preventDefault();
      shortcut.callback(event);
    }

    // Handle escape key globally
    if (event.key === 'Escape') {
      this.handleEscapeKey(event);
    }
  }

  /**
   * Handle arrow key navigation for complex widgets
   */
  private handleArrowKeyNavigation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const role = target.getAttribute('role');
    
    // Handle specific ARIA patterns
    if (role === 'tablist') {
      this.handleTablistNavigation(event, target);
    } else if (role === 'menubar' || role === 'menu') {
      this.handleMenuNavigation(event, target);
    } else if (role === 'grid' || role === 'treegrid') {
      this.handleGridNavigation(event, target);
    }
  }

  /**
   * Handle tab list navigation
   */
  private handleTablistNavigation(event: KeyboardEvent, tablist: HTMLElement): void {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]')) as HTMLElement[];
    const currentIndex = tabs.indexOf(event.target as HTMLElement);
    
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    tabs[nextIndex].focus();
    
    // Optionally activate the tab (remove if manual activation is preferred)
    tabs[nextIndex].click();
  }

  /**
   * Handle menu navigation
   */
  private handleMenuNavigation(event: KeyboardEvent, menu: HTMLElement): void {
    const items = Array.from(menu.querySelectorAll('[role="menuitem"]')) as HTMLElement[];
    const currentIndex = items.indexOf(event.target as HTMLElement);
    
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowUp':
        nextIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    items[nextIndex].focus();
  }

  /**
   * Handle grid navigation
   */
  private handleGridNavigation(event: KeyboardEvent, grid: HTMLElement): void {
    const rows = Array.from(grid.querySelectorAll('[role="row"]'));
    const currentCell = event.target as HTMLElement;
    
    // Find current position
    let currentRow = -1;
    let currentCol = -1;
    
    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('[role="gridcell"]'));
      const cellIndex = cells.indexOf(currentCell);
      if (cellIndex !== -1) {
        currentRow = rowIndex;
        currentCol = cellIndex;
      }
    });

    if (currentRow === -1 || currentCol === -1) return;

    let nextRow = currentRow;
    let nextCol = currentCol;

    switch (event.key) {
      case 'ArrowRight':
        const rowCells = Array.from(rows[currentRow].querySelectorAll('[role="gridcell"]'));
        nextCol = Math.min(currentCol + 1, rowCells.length - 1);
        break;
      case 'ArrowLeft':
        nextCol = Math.max(currentCol - 1, 0);
        break;
      case 'ArrowDown':
        nextRow = Math.min(currentRow + 1, rows.length - 1);
        break;
      case 'ArrowUp':
        nextRow = Math.max(currentRow - 1, 0);
        break;
      default:
        return;
    }

    const nextRowElement = rows[nextRow];
    const nextCells = Array.from(nextRowElement.querySelectorAll('[role="gridcell"]'));
    const nextCell = nextCells[Math.min(nextCol, nextCells.length - 1)] as HTMLElement;

    if (nextCell) {
      event.preventDefault();
      nextCell.focus();
    }
  }

  /**
   * Create skip links for improved navigation
   */
  private createSkipLinks(): void {
    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.className = 'skip-links sr-only focus:not-sr-only';
    skipLinksContainer.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
      <a href="#search" class="skip-link">Skip to search</a>
    `;

    document.body.insertBefore(skipLinksContainer, document.body.firstChild);
    
    this.skipLinks = Array.from(skipLinksContainer.querySelectorAll('.skip-link')) as HTMLElement[];
  }

  /**
   * Enhance form navigation
   */
  private enhanceFormNavigation(): void {
    document.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        this.handleFormKeyDown(event);
      }
    });
  }

  /**
   * Handle form-specific keyboard navigation
   */
  private handleFormKeyDown(event: KeyboardEvent): void {
    const form = (event.target as HTMLElement).closest('form');
    if (!form) return;

    // Handle Enter key in forms
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      const type = event.target.type;
      
      // Don't submit on Enter for certain input types
      if (['text', 'email', 'password', 'tel', 'url'].includes(type)) {
        const formElements = this.getFormElements(form);
        const currentIndex = formElements.indexOf(event.target);
        const nextElement = formElements[currentIndex + 1];
        
        if (nextElement) {
          event.preventDefault();
          nextElement.focus();
        }
      }
    }
  }

  /**
   * Get focusable form elements
   */
  private getFormElements(form: HTMLFormElement): HTMLElement[] {
    const selector = 'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])';
    return Array.from(form.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * Handle escape key globally
   */
  private handleEscapeKey(event: KeyboardEvent): void {
    // Close modals, dropdowns, etc.
    const openModal = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (openModal) {
      const closeButton = openModal.querySelector('[data-dismiss="modal"], .modal-close, [aria-label*="close" i]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
      return;
    }

    // Close dropdown menus
    const openDropdown = document.querySelector('[aria-expanded="true"]');
    if (openDropdown) {
      openDropdown.setAttribute('aria-expanded', 'false');
      (openDropdown as HTMLElement).focus();
    }
  }

  /**
   * Handle focus in events
   */
  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    
    // Update ARIA attributes for current focus
    this.updateFocusAria(target);
    
    // Handle roving tabindex updates
    this.updateRovingTabindex(target);
  }

  /**
   * Update ARIA attributes for focused element
   */
  private updateFocusAria(element: HTMLElement): void {
    // Update aria-current for navigation
    if (element.closest('[role="navigation"]')) {
      const navItems = element.closest('[role="navigation"]')?.querySelectorAll('a, button');
      navItems?.forEach(item => item.removeAttribute('aria-current'));
      element.setAttribute('aria-current', 'page');
    }
  }

  /**
   * Update roving tabindex
   */
  private updateRovingTabindex(element: HTMLElement): void {
    const group = element.closest('[role="tablist"], [role="menubar"], [role="toolbar"]');
    if (group) {
      const items = group.querySelectorAll('[role="tab"], [role="menuitem"], [role="button"]');
      items.forEach(item => {
        (item as HTMLElement).tabIndex = item === element ? 0 : -1;
      });
    }
  }

  /**
   * Check if element is interactive
   */
  private isInteractive(element: HTMLElement): boolean {
    const interactiveElements = ['button', 'input', 'select', 'textarea', 'a'];
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const tabindex = element.getAttribute('tabindex');
    
    return (
      interactiveElements.includes(tagName) ||
      ['button', 'link', 'menuitem', 'tab'].includes(role || '') ||
      tabindex === '0'
    );
  }

  /**
   * Generate unique key for shortcuts
   */
  private generateShortcutKey(shortcut: KeyboardShortcut): string {
    const modifiers = shortcut.modifiers || {};
    const parts = [];
    
    if (modifiers.ctrl) parts.push('ctrl');
    if (modifiers.alt) parts.push('alt');
    if (modifiers.shift) parts.push('shift');
    if (modifiers.meta) parts.push('meta');
    
    parts.push(shortcut.key.toLowerCase());
    
    return parts.join('+');
  }

  /**
   * Register common application shortcuts
   */
  registerCommonShortcuts(): void {
    // Navigation shortcuts
    this.registerShortcut({
      key: 'h',
      modifiers: { alt: true },
      callback: () => {
        const homeLink = document.querySelector('a[href="/"], a[href="/dashboard"]') as HTMLElement;
        homeLink?.click();
      },
      description: 'Go to home/dashboard'
    });

    this.registerShortcut({
      key: 'n',
      modifiers: { alt: true },
      callback: () => {
        const navToggle = document.querySelector('[aria-label*="menu" i], .nav-toggle') as HTMLElement;
        navToggle?.click();
      },
      description: 'Toggle navigation menu'
    });

    // Search shortcut
    this.registerShortcut({
      key: '/',
      callback: (event) => {
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLElement;
        if (searchInput) {
          event.preventDefault();
          searchInput.focus();
        }
      },
      description: 'Focus search field'
    });

    // Help shortcut
    this.registerShortcut({
      key: '?',
      modifiers: { shift: true },
      callback: () => {
        this.showKeyboardShortcuts();
      },
      description: 'Show keyboard shortcuts help'
    });
  }

  /**
   * Show keyboard shortcuts help modal
   */
  showKeyboardShortcuts(): void {
    const shortcuts = Array.from(this.shortcuts.values());
    const shortcutsHtml = shortcuts.map(shortcut => {
      const key = this.generateShortcutKey(shortcut);
      return `<div class="flex justify-between py-2">
        <span class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">${key}</span>
        <span>${shortcut.description}</span>
      </div>`;
    }).join('');

    // Create and show modal (implementation would depend on your modal system)
    console.log('Keyboard Shortcuts:', shortcuts);
  }
}

// Export singleton instance
export const keyboardManager = KeyboardManager.getInstance();