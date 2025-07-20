'use client'

import React from 'react'
import { ResponsiveSection, ResponsiveGrid, ResponsiveStack, MobileModal } from '@/components/ui/ResponsiveSection'
import { useResponsive } from '@/hooks/useResponsive'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CreditCard, BarChart3, User, AlertTriangle, Search } from 'lucide-react'

export function ResponsiveDesignDemo() {
  const { isMobile, isTablet, isDesktop, screenWidth } = useResponsive()
  const [showModal, setShowModal] = React.useState(false)

  return (
    <div className="mobile-container mobile-section py-8">
      {/* Device Info */}
      <div className="mobile-card mb-6">
        <div className="mobile-card-header">
          <h2 className="mobile-title">Responsive Design System Demo</h2>
        </div>
        <div className="mobile-card-content">
          <div className="mobile-stat-grid">
            <div className="mobile-stat-card">
              <div className="mobile-stat-label">Device Type</div>
              <div className="mobile-stat-value">
                {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
              </div>
            </div>
            <div className="mobile-stat-card">
              <div className="mobile-stat-label">Screen Width</div>
              <div className="mobile-stat-value">{screenWidth}px</div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Sections */}
      <ResponsiveSection
        title="High Priority Section"
        icon={<AlertTriangle className="w-5 h-5" />}
        priority="high"
        collapsibleOnMobile={false}
      >
        <p className="mobile-body">
          This section is always visible and marked as high priority with a red border.
        </p>
      </ResponsiveSection>

      <ResponsiveSection
        title="Medium Priority Section"
        icon={<BarChart3 className="w-5 h-5" />}
        priority="medium"
        collapsibleOnMobile={true}
        defaultCollapsed={false}
      >
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
          <div className="mobile-card-compact bg-blue-50 dark:bg-blue-900/20">
            <h4 className="mobile-body font-semibold">Card 1</h4>
            <p className="mobile-caption">Responsive grid item</p>
          </div>
          <div className="mobile-card-compact bg-green-50 dark:bg-green-900/20">
            <h4 className="mobile-body font-semibold">Card 2</h4>
            <p className="mobile-caption">Responsive grid item</p>
          </div>
          <div className="mobile-card-compact bg-purple-50 dark:bg-purple-900/20">
            <h4 className="mobile-body font-semibold">Card 3</h4>
            <p className="mobile-caption">Responsive grid item</p>
          </div>
        </ResponsiveGrid>
      </ResponsiveSection>

      <ResponsiveSection
        title="Low Priority Section"
        icon={<User className="w-5 h-5" />}
        priority="low"
        collapsibleOnMobile={true}
        defaultCollapsed={isMobile}
      >
        <ResponsiveStack
          direction={{ mobile: 'column', tablet: 'row', desktop: 'row' }}
          spacing="gap-4"
          justify="between"
        >
          <div className="flex-1">
            <h4 className="mobile-body font-semibold mb-2">Stack Item 1</h4>
            <p className="mobile-caption">
              This content is in a responsive stack that changes direction based on screen size.
            </p>
          </div>
          <div className="flex-1">
            <h4 className="mobile-body font-semibold mb-2">Stack Item 2</h4>
            <p className="mobile-caption">
              On mobile, items stack vertically. On tablet and desktop, they align horizontally.
            </p>
          </div>
        </ResponsiveStack>
      </ResponsiveSection>

      {/* Touch-Friendly Controls */}
      <ResponsiveSection
        title="Touch-Friendly Controls"
        icon={<CreditCard className="w-5 h-5" />}
        priority="medium"
        collapsibleOnMobile={true}
      >
        <ResponsiveStack
          direction={{ mobile: 'column', tablet: 'row', desktop: 'row' }}
          spacing="gap-3"
        >
          <Button
            className="touch-button"
            onClick={() => setShowModal(true)}
          >
            Open Mobile Modal
          </Button>
          <Button
            variant="outline"
            className="touch-button"
          >
            Touch-Friendly Button
          </Button>
          <Button
            variant="secondary"
            className="touch-button"
          >
            Another Button
          </Button>
        </ResponsiveStack>
      </ResponsiveSection>

      {/* Mobile Statistics Grid */}
      <ResponsiveSection
        title="Statistics Grid"
        icon={<BarChart3 className="w-5 h-5" />}
        priority="medium"
        collapsibleOnMobile={true}
      >
        <div className="mobile-stat-grid">
          <div className="mobile-stat-card">
            <ResponsiveStack
              direction={{ mobile: 'row', tablet: 'row', desktop: 'row' }}
              justify="between"
              align="center"
            >
              <div>
                <div className="mobile-stat-label">Total Items</div>
                <div className="mobile-stat-value text-blue-600">42</div>
              </div>
              <CreditCard className="w-6 h-6 text-blue-500" />
            </ResponsiveStack>
          </div>
          <div className="mobile-stat-card">
            <ResponsiveStack
              direction={{ mobile: 'row', tablet: 'row', desktop: 'row' }}
              justify="between"
              align="center"
            >
              <div>
                <div className="mobile-stat-label">Success Rate</div>
                <div className="mobile-stat-value text-green-600">87%</div>
              </div>
              <BarChart3 className="w-6 h-6 text-green-500" />
            </ResponsiveStack>
          </div>
          <div className="mobile-stat-card">
            <ResponsiveStack
              direction={{ mobile: 'row', tablet: 'row', desktop: 'row' }}
              justify="between"
              align="center"
            >
              <div>
                <div className="mobile-stat-label">Pending</div>
                <div className="mobile-stat-value text-yellow-600">5</div>
              </div>
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            </ResponsiveStack>
          </div>
          <div className="mobile-stat-card">
            <ResponsiveStack
              direction={{ mobile: 'row', tablet: 'row', desktop: 'row' }}
              justify="between"
              align="center"
            >
              <div>
                <div className="mobile-stat-label">Completed</div>
                <div className="mobile-stat-value text-purple-600">37</div>
              </div>
              <Search className="w-6 h-6 text-purple-500" />
            </ResponsiveStack>
          </div>
        </div>
      </ResponsiveSection>

      {/* Mobile Modal Demo */}
      <MobileModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Mobile-Optimized Modal"
        size="md"
      >
        <div className="mobile-spacing-md">
          <p className="mobile-body mb-4">
            This modal is optimized for mobile devices. On mobile, it takes the full screen height
            and slides up from the bottom. On desktop, it appears as a centered modal.
          </p>
          
          <div className="mobile-alert mobile-alert-info mb-4">
            <h4 className="mobile-body font-semibold">Device Information</h4>
            <p className="mobile-caption mt-1">
              Current device: {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'} 
              ({screenWidth}px wide)
            </p>
          </div>

          <ResponsiveStack
            direction={{ mobile: 'column', tablet: 'row', desktop: 'row' }}
            spacing="gap-3"
          >
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              className="touch-button flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowModal(false)}
              className="touch-button flex-1"
            >
              Confirm
            </Button>
          </ResponsiveStack>
        </div>
      </MobileModal>

      {/* CSS Classes Demo */}
      <ResponsiveSection
        title="CSS Classes Demo"
        icon={<BarChart3 className="w-5 h-5" />}
        priority="low"
        collapsibleOnMobile={true}
        defaultCollapsed={isMobile}
      >
        <div className="space-y-4">
          <div className="mobile-alert mobile-alert-success">
            <strong>Success Alert:</strong> This uses mobile-alert-success classes
          </div>
          <div className="mobile-alert mobile-alert-warning">
            <strong>Warning Alert:</strong> This uses mobile-alert-warning classes
          </div>
          <div className="mobile-alert mobile-alert-error">
            <strong>Error Alert:</strong> This uses mobile-alert-error classes
          </div>
          <div className="mobile-alert mobile-alert-info">
            <strong>Info Alert:</strong> This uses mobile-alert-info classes
          </div>
        </div>
      </ResponsiveSection>
    </div>
  )
}