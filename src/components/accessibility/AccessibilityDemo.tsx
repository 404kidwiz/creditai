/**
 * Accessibility Demo Component - Demonstrates all accessibility features
 * Shows touch targets, keyboard navigation, ARIA compliance, and haptic feedback
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { 
  useAccessibility, 
  useModalAccessibility, 
  useFormAccessibility, 
  useTouchTargetValidation,
  useAccessibilityTesting 
} from '@/hooks/useAccessibility';

export function AccessibilityDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [showReport, setShowReport] = useState(false);
  
  const { 
    announce, 
    hapticFeedback, 
    status, 
    isInitialized 
  } = useAccessibility();
  
  const { modalRef } = useModalAccessibility(isModalOpen);
  const { formRef, announceFormSuccess, announceFormError } = useFormAccessibility();
  const { runAccessibilityTest, isRunning, report } = useAccessibilityTesting();
  
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const touchValidation = useTouchTargetValidation(buttonRef);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      announceFormError('Please fill in all required fields');
      return;
    }
    
    announceFormSuccess('Demo form submitted successfully');
    hapticFeedback('impact');
  };

  const handleModalOpen = () => {
    setIsModalOpen(true);
    hapticFeedback('medium');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    hapticFeedback('light');
  };

  const testHapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification') => {
    hapticFeedback(type);
    announce(`${type} haptic feedback triggered`, 'polite');
  };

  const runFullAccessibilityTest = async () => {
    await runAccessibilityTest();
    setShowReport(true);
    announce('Accessibility test completed', 'assertive');
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="loading mb-4" aria-hidden="true"></div>
          <p>Initializing accessibility features...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Accessibility Features Demo</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Experience comprehensive WCAG 2.1 AA accessibility features including touch targets, 
          keyboard navigation, haptic feedback, and screen reader support.
        </p>
      </div>

      {/* Accessibility Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Accessibility Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{status.touchTargetsValid.toFixed(0)}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Touch Targets Valid</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{status.keyboardNavigable.toFixed(0)}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Keyboard Accessible</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{status.ariaCompliant.toFixed(0)}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">ARIA Compliant</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{status.overallScore.toFixed(0)}/100</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Overall Score</div>
          </div>
        </div>
      </Card>

      {/* Touch Target Demo */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Touch Target Validation</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              ref={buttonRef}
              hapticFeedback="medium"
              announceClick="Touch target button activated"
              onClick={() => announce('Touch target test completed', 'polite')}
            >
              Test Touch Target
            </Button>
            <div className="text-sm">
              {touchValidation.isValid ? (
                <span className="text-green-600">✅ Valid touch target (44x44px+)</span>
              ) : (
                <span className="text-red-600">❌ Invalid touch target</span>
              )}
            </div>
          </div>
          {!touchValidation.isValid && touchValidation.suggestions.length > 0 && (
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Suggestions:</h4>
              <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                {touchValidation.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Haptic Feedback Demo */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Haptic Feedback Demo</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Test different haptic feedback patterns (mobile devices only):
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => testHapticFeedback('light')}
            hapticFeedback="light"
          >
            Light
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => testHapticFeedback('medium')}
            hapticFeedback="medium"
          >
            Medium
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => testHapticFeedback('heavy')}
            hapticFeedback="heavy"
          >
            Heavy
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => testHapticFeedback('selection')}
            hapticFeedback="selection"
          >
            Selection
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => testHapticFeedback('impact')}
            hapticFeedback="impact"
          >
            Impact
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => testHapticFeedback('notification')}
            hapticFeedback="notification"
          >
            Notification
          </Button>
        </div>
      </Card>

      {/* Form Accessibility Demo */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Form Accessibility</h2>
        <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <Label htmlFor="demo-name" className="required">Name</Label>
            <Input
              id="demo-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              aria-required="true"
              aria-describedby="name-help"
              className="touch-target"
            />
            <div id="name-help" className="form-help">
              Enter your full name for this accessibility demo
            </div>
          </div>
          <div>
            <Label htmlFor="demo-email" className="required">Email</Label>
            <Input
              id="demo-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              aria-required="true"
              aria-describedby="email-help"
              className="touch-target"
            />
            <div id="email-help" className="form-help">
              Enter a valid email address
            </div>
          </div>
          <Button 
            type="submit" 
            hapticFeedback="impact"
            announceClick="Form submission started"
            className="w-full sm:w-auto"
          >
            Submit Demo Form
          </Button>
        </form>
      </Card>

      {/* Modal Demo */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Modal Focus Management</h2>
        <Button 
          onClick={handleModalOpen}
          hapticFeedback="medium"
          announceClick="Opening accessibility demo modal"
        >
          Open Modal
        </Button>
      </Card>

      {/* Keyboard Navigation Demo */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Keyboard Navigation</h2>
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Try these keyboard shortcuts:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Tab</kbd>
              <span>Navigate between elements</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Shift + Tab</kbd>
              <span>Navigate backwards</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter/Space</kbd>
              <span>Activate buttons</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Escape</kbd>
              <span>Close modals/menus</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Alt + H</kbd>
              <span>Go to home/dashboard</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">/</kbd>
              <span>Focus search field</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Accessibility Testing */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Accessibility Testing</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={runFullAccessibilityTest}
              disabled={isRunning}
              hapticFeedback="medium"
              announceClick={isRunning ? "Test already running" : "Starting accessibility test"}
            >
              {isRunning ? 'Running Test...' : 'Run Accessibility Test'}
            </Button>
            {showReport && report && (
              <Button 
                variant="outline"
                onClick={() => setShowReport(false)}
                hapticFeedback="light"
              >
                Hide Report
              </Button>
            )}
          </div>
          
          {isRunning && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="loading" aria-hidden="true"></div>
              <span>Running comprehensive accessibility tests...</span>
            </div>
          )}
          
          {showReport && report && (
            <div className="mt-4">
              <details className="border rounded-lg">
                <summary className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  View Accessibility Report
                </summary>
                <div className="p-3 border-t max-h-96 overflow-y-auto">
                  <iframe
                    srcDoc={report}
                    className="w-full h-80 border-0"
                    title="Accessibility Test Report"
                  />
                </div>
              </details>
            </div>
          )}
        </div>
      </Card>

      {/* Screen Reader Demo */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Screen Reader Features</h2>
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Features for screen reader users:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Live region announcements for state changes</li>
            <li>Proper ARIA labels and descriptions</li>
            <li>Skip links for easy navigation</li>
            <li>Semantic HTML structure with headings</li>
            <li>Focus management for modals and complex widgets</li>
            <li>Form validation with accessible error messages</li>
          </ul>
          <Button 
            onClick={() => announce('This is a test announcement for screen readers', 'assertive')}
            hapticFeedback="selection"
            variant="outline"
          >
            Test Screen Reader Announcement
          </Button>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 id="modal-title" className="text-lg font-semibold">
                Accessibility Demo Modal
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleModalClose}
                aria-label="Close dialog"
                hapticFeedback="light"
              >
                <span aria-hidden="true">×</span>
              </Button>
            </div>
            <div className="p-6">
              <p className="mb-4">
                This modal demonstrates proper focus management and keyboard navigation. 
                Try using the Tab key to navigate and Escape to close.
              </p>
              <div className="flex gap-3">
                <Button 
                  onClick={handleModalClose}
                  hapticFeedback="medium"
                  announceClick="Modal confirmed and closed"
                >
                  Confirm
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleModalClose}
                  hapticFeedback="light"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" />
      <div aria-live="assertive" aria-atomic="true" className="sr-only" />
    </div>
  );
}