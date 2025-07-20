// Accessibility Audit Utilities for WCAG 2.1 AA Compliance

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  rule: string;
  element?: HTMLElement;
  message: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagLevel: 'A' | 'AA' | 'AAA';
  wcagGuideline: string;
}

export interface AccessibilityAuditResult {
  passed: boolean;
  score: number;
  issues: AccessibilityIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export class AccessibilityAuditor {
  private issues: AccessibilityIssue[] = [];

  // Main audit function
  audit(container: HTMLElement = document.body): AccessibilityAuditResult {
    this.issues = [];

    // Run all audit checks
    this.checkHeadingStructure(container);
    this.checkImageAltText(container);
    this.checkFormLabels(container);
    this.checkColorContrast(container);
    this.checkFocusableElements(container);
    this.checkLandmarks(container);
    this.checkListStructure(container);
    this.checkTableHeaders(container);
    this.checkAriaLabels(container);
    this.checkSkipLinks();

    const summary = this.getSummary();
    const score = this.calculateScore();

    return {
      passed: this.issues.filter(issue => issue.type === 'error').length === 0,
      score,
      issues: this.issues,
      summary,
    };
  }

  // Check heading structure (WCAG 2.4.6)
  private checkHeadingStructure(container: HTMLElement): void {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;

    // Check for h1 presence
    const h1Count = container.querySelectorAll('h1').length;
    if (h1Count === 0) {
      this.addIssue({
        type: 'error',
        rule: 'heading-structure',
        message: 'Page should have exactly one h1 element',
        impact: 'serious',
        wcagLevel: 'AA',
        wcagGuideline: '2.4.6 Headings and Labels',
      });
    } else if (h1Count > 1) {
      this.addIssue({
        type: 'warning',
        rule: 'heading-structure',
        message: 'Page should have only one h1 element',
        impact: 'moderate',
        wcagLevel: 'AA',
        wcagGuideline: '2.4.6 Headings and Labels',
      });
    }

    // Check heading hierarchy
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level > previousLevel + 1 && previousLevel !== 0) {
        this.addIssue({
          type: 'warning',
          rule: 'heading-hierarchy',
          element: heading as HTMLElement,
          message: `Heading level ${level} skips from level ${previousLevel}`,
          impact: 'moderate',
          wcagLevel: 'AA',
          wcagGuideline: '2.4.6 Headings and Labels',
        });
      }

      // Check if heading is empty
      if (!heading.textContent?.trim()) {
        this.addIssue({
          type: 'error',
          rule: 'empty-heading',
          element: heading as HTMLElement,
          message: 'Heading element is empty',
          impact: 'serious',
          wcagLevel: 'A',
          wcagGuideline: '2.4.6 Headings and Labels',
        });
      }

      previousLevel = level;
    });
  }

  // Check image alt text (WCAG 1.1.1)
  private checkImageAltText(container: HTMLElement): void {
    const images = container.querySelectorAll('img');
    
    images.forEach((img) => {
      const alt = img.getAttribute('alt');
      const role = img.getAttribute('role');
      
      if (role === 'presentation' || role === 'none') {
        if (alt && alt.trim() !== '') {
          this.addIssue({
            type: 'warning',
            rule: 'decorative-image-alt',
            element: img,
            message: 'Decorative images should have empty alt text',
            impact: 'minor',
            wcagLevel: 'A',
            wcagGuideline: '1.1.1 Non-text Content',
          });
        }
      } else if (alt === null) {
        this.addIssue({
          type: 'error',
          rule: 'missing-alt',
          element: img,
          message: 'Image missing alt attribute',
          impact: 'critical',
          wcagLevel: 'A',
          wcagGuideline: '1.1.1 Non-text Content',
        });
      } else if (alt.trim() === '' && role !== 'presentation') {
        this.addIssue({
          type: 'warning',
          rule: 'empty-alt',
          element: img,
          message: 'Image has empty alt text but may not be decorative',
          impact: 'moderate',
          wcagLevel: 'A',
          wcagGuideline: '1.1.1 Non-text Content',
        });
      }
    });
  }

  // Check form labels (WCAG 3.3.2)
  private checkFormLabels(container: HTMLElement): void {
    const formControls = container.querySelectorAll('input, select, textarea');
    
    formControls.forEach((control) => {
      const type = control.getAttribute('type');
      
      // Skip hidden inputs and buttons
      if (type === 'hidden' || type === 'submit' || type === 'button') {
        return;
      }

      const id = control.id;
      const ariaLabel = control.getAttribute('aria-label');
      const ariaLabelledby = control.getAttribute('aria-labelledby');
      const label = id ? container.querySelector(`label[for="${id}"]`) : null;

      if (!label && !ariaLabel && !ariaLabelledby) {
        this.addIssue({
          type: 'error',
          rule: 'missing-label',
          element: control as HTMLElement,
          message: 'Form control missing accessible label',
          impact: 'critical',
          wcagLevel: 'A',
          wcagGuideline: '3.3.2 Labels or Instructions',
        });
      }
    });
  }

  // Check color contrast (WCAG 1.4.3)
  private checkColorContrast(container: HTMLElement): void {
    const textElements = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label');
    
    textElements.forEach((element) => {
      if (!element.textContent?.trim()) return;

      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Skip if background is transparent (would need to check parent)
      if (backgroundColor === 'rgba(0, 0, 0, 0)') return;

      const contrast = this.calculateContrast(color, backgroundColor);
      const fontSize = parseFloat(styles.fontSize);
      const fontWeight = styles.fontWeight;
      
      const isLarge = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
      const requiredRatio = isLarge ? 3 : 4.5;

      if (contrast < requiredRatio) {
        this.addIssue({
          type: 'error',
          rule: 'color-contrast',
          element: element as HTMLElement,
          message: `Color contrast ratio ${contrast.toFixed(2)}:1 is below required ${requiredRatio}:1`,
          impact: 'serious',
          wcagLevel: 'AA',
          wcagGuideline: '1.4.3 Contrast (Minimum)',
        });
      }
    });
  }

  // Check focusable elements (WCAG 2.4.7)
  private checkFocusableElements(container: HTMLElement): void {
    const focusableElements = container.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach((element) => {
      const tabIndex = element.getAttribute('tabindex');
      
      // Check for positive tabindex (anti-pattern)
      if (tabIndex && parseInt(tabIndex) > 0) {
        this.addIssue({
          type: 'warning',
          rule: 'positive-tabindex',
          element: element as HTMLElement,
          message: 'Avoid positive tabindex values',
          impact: 'moderate',
          wcagLevel: 'A',
          wcagGuideline: '2.4.3 Focus Order',
        });
      }

      // Check if element has focus indicator
      const styles = window.getComputedStyle(element, ':focus');
      if (styles.outline === 'none' && !styles.boxShadow) {
        this.addIssue({
          type: 'warning',
          rule: 'focus-indicator',
          element: element as HTMLElement,
          message: 'Focusable element should have visible focus indicator',
          impact: 'moderate',
          wcagLevel: 'AA',
          wcagGuideline: '2.4.7 Focus Visible',
        });
      }
    });
  }

  // Check landmarks (WCAG 2.4.1)
  private checkLandmarks(container: HTMLElement): void {
    const landmarks = container.querySelectorAll('main, nav, header, footer, aside, section[aria-label], section[aria-labelledby]');
    
    const mainElements = container.querySelectorAll('main');
    if (mainElements.length === 0) {
      this.addIssue({
        type: 'warning',
        rule: 'missing-main',
        message: 'Page should have a main landmark',
        impact: 'moderate',
        wcagLevel: 'A',
        wcagGuideline: '2.4.1 Bypass Blocks',
      });
    } else if (mainElements.length > 1) {
      this.addIssue({
        type: 'warning',
        rule: 'multiple-main',
        message: 'Page should have only one main landmark',
        impact: 'moderate',
        wcagLevel: 'A',
        wcagGuideline: '2.4.1 Bypass Blocks',
      });
    }
  }

  // Check skip links (WCAG 2.4.1)
  private checkSkipLinks(): void {
    const skipLinks = document.querySelectorAll('a[href^="#"]');
    let hasMainSkipLink = false;

    skipLinks.forEach((link) => {
      const href = link.getAttribute('href');
      const text = link.textContent?.toLowerCase();
      
      if (href === '#main' || href === '#main-content' || 
          text?.includes('skip to main') || text?.includes('skip to content')) {
        hasMainSkipLink = true;
      }
    });

    if (!hasMainSkipLink) {
      this.addIssue({
        type: 'warning',
        rule: 'missing-skip-link',
        message: 'Page should have a skip link to main content',
        impact: 'moderate',
        wcagLevel: 'A',
        wcagGuideline: '2.4.1 Bypass Blocks',
      });
    }
  }

  // Check list structure (WCAG 1.3.1)
  private checkListStructure(container: HTMLElement): void {
    const lists = container.querySelectorAll('ul, ol');
    
    lists.forEach((list) => {
      const children = Array.from(list.children);
      const hasNonListItems = children.some(child => child.tagName !== 'LI');
      
      if (hasNonListItems) {
        this.addIssue({
          type: 'error',
          rule: 'list-structure',
          element: list as HTMLElement,
          message: 'List contains non-list-item children',
          impact: 'moderate',
          wcagLevel: 'A',
          wcagGuideline: '1.3.1 Info and Relationships',
        });
      }
    });
  }

  // Check table headers (WCAG 1.3.1)
  private checkTableHeaders(container: HTMLElement): void {
    const tables = container.querySelectorAll('table');
    
    tables.forEach((table) => {
      const headers = table.querySelectorAll('th');
      const cells = table.querySelectorAll('td');
      
      if (cells.length > 0 && headers.length === 0) {
        this.addIssue({
          type: 'error',
          rule: 'table-headers',
          element: table,
          message: 'Data table missing header cells',
          impact: 'serious',
          wcagLevel: 'A',
          wcagGuideline: '1.3.1 Info and Relationships',
        });
      }
    });
  }

  // Check ARIA labels (WCAG 4.1.2)
  private checkAriaLabels(container: HTMLElement): void {
    const elementsWithAria = container.querySelectorAll('[aria-labelledby], [aria-describedby]');
    
    elementsWithAria.forEach((element) => {
      const labelledby = element.getAttribute('aria-labelledby');
      const describedby = element.getAttribute('aria-describedby');
      
      if (labelledby) {
        const ids = labelledby.split(' ');
        ids.forEach(id => {
          if (!container.querySelector(`#${id}`)) {
            this.addIssue({
              type: 'error',
              rule: 'aria-reference',
              element: element as HTMLElement,
              message: `aria-labelledby references non-existent element: ${id}`,
              impact: 'serious',
              wcagLevel: 'A',
              wcagGuideline: '4.1.2 Name, Role, Value',
            });
          }
        });
      }

      if (describedby) {
        const ids = describedby.split(' ');
        ids.forEach(id => {
          if (!container.querySelector(`#${id}`)) {
            this.addIssue({
              type: 'error',
              rule: 'aria-reference',
              element: element as HTMLElement,
              message: `aria-describedby references non-existent element: ${id}`,
              impact: 'serious',
              wcagLevel: 'A',
              wcagGuideline: '4.1.2 Name, Role, Value',
            });
          }
        });
      }
    });
  }

  // Helper methods
  private addIssue(issue: Omit<AccessibilityIssue, 'element'> & { element?: HTMLElement }): void {
    this.issues.push(issue as AccessibilityIssue);
  }

  private getSummary() {
    return {
      errors: this.issues.filter(issue => issue.type === 'error').length,
      warnings: this.issues.filter(issue => issue.type === 'warning').length,
      info: this.issues.filter(issue => issue.type === 'info').length,
    };
  }

  private calculateScore(): number {
    const { errors, warnings } = this.getSummary();
    const totalChecks = this.issues.length || 1;
    const errorWeight = 10;
    const warningWeight = 3;
    
    const penalty = (errors * errorWeight + warnings * warningWeight);
    const maxPossiblePenalty = totalChecks * errorWeight;
    
    return Math.max(0, Math.round(((maxPossiblePenalty - penalty) / maxPossiblePenalty) * 100));
  }

  private calculateContrast(color1: string, color2: string): number {
    const getLuminance = (color: string): number => {
      // Convert color to RGB values
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0;
      
      const [r, g, b] = rgb.map(x => {
        const val = parseInt(x) / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
}

// Export singleton instance
export const accessibilityAuditor = new AccessibilityAuditor();