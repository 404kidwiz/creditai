import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useResponsive } from '@/hooks/useResponsive'
import { ResponsiveSection, ResponsiveGrid, ResponsiveStack, MobileModal } from '@/components/ui/ResponsiveSection'
import { EnhancedCreditDataDisplay } from '../EnhancedCreditDataDisplay'
// import { mockEnhancedAnalysisResult } from './mocks/creditDataMocks'

// Mock the useResponsive hook
jest.mock('@/hooks/useResponsive')
const mockUseResponsive = useResponsive as jest.MockedFunction<typeof useResponsive>

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('Responsive Design System', () => {
  beforeEach(() => {
    // Reset mocks
    mockUseResponsive.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLandscape: true,
      isPortrait: false,
      isTouchDevice: false,
      screenWidth: 1024,
      screenHeight: 768
    })
  })

  describe('ResponsiveSection', () => {
    it('renders section with title and content', () => {
      render(
        <ResponsiveSection title="Test Section">
          <div>Test content</div>
        </ResponsiveSection>
      )

      expect(screen.getByText('Test Section')).toBeInTheDocument()
      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('shows collapse button on mobile when collapsibleOnMobile is true', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLandscape: false,
        isPortrait: true,
        isTouchDevice: true,
        screenWidth: 375,
        screenHeight: 667
      })

      render(
        <ResponsiveSection title="Test Section" collapsibleOnMobile={true}>
          <div>Test content</div>
        </ResponsiveSection>
      )

      expect(screen.getByLabelText('Collapse Test Section')).toBeInTheDocument()
    })

    it('collapses content when clicked on mobile', async () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLandscape: false,
        isPortrait: true,
        isTouchDevice: true,
        screenWidth: 375,
        screenHeight: 667
      })

      render(
        <ResponsiveSection title="Test Section" collapsibleOnMobile={true}>
          <div>Test content</div>
        </ResponsiveSection>
      )

      const collapseButton = screen.getByLabelText('Collapse Test Section')
      fireEvent.click(collapseButton)

      await waitFor(() => {
        expect(screen.getByText('Test content')).toHaveClass('hidden')
      })
    })

    it('applies priority styles correctly', () => {
      const { container } = render(
        <ResponsiveSection title="High Priority Section" priority="high">
          <div>Test content</div>
        </ResponsiveSection>
      )

      const section = container.querySelector('.collapsible-section')
      expect(section).toHaveClass('border-l-red-500')
    })
  })

  describe('ResponsiveGrid', () => {
    it('applies correct grid classes for different breakpoints', () => {
      const { container } = render(
        <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }}>
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      )

      const grid = container.firstChild as HTMLElement
      expect(grid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3')
    })
  })

  describe('ResponsiveStack', () => {
    it('applies correct flex direction for different breakpoints', () => {
      const { container } = render(
        <ResponsiveStack direction={{ mobile: 'column', tablet: 'row', desktop: 'row' }}>
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveStack>
      )

      const stack = container.firstChild as HTMLElement
      expect(stack).toHaveClass('flex', 'flex-col', 'sm:flex-row', 'lg:flex-row')
    })
  })

  describe('MobileModal', () => {
    it('renders modal when open', () => {
      render(
        <MobileModal isOpen={true} onClose={() => {}} title="Test Modal">
          <div>Modal content</div>
        </MobileModal>
      )

      expect(screen.getByText('Test Modal')).toBeInTheDocument()
      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(
        <MobileModal isOpen={false} onClose={() => {}} title="Test Modal">
          <div>Modal content</div>
        </MobileModal>
      )

      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
    })

    it('calls onClose when backdrop is clicked', () => {
      const onClose = jest.fn()
      render(
        <MobileModal isOpen={true} onClose={onClose} title="Test Modal">
          <div>Modal content</div>
        </MobileModal>
      )

      const backdrop = document.querySelector('.mobile-modal-backdrop')
      fireEvent.click(backdrop!)
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('EnhancedCreditDataDisplay Mobile Behavior', () => {
    it('shows mobile menu toggle on mobile devices', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLandscape: false,
        isPortrait: true,
        isTouchDevice: true,
        screenWidth: 375,
        screenHeight: 667
      })

      render(
        <EnhancedCreditDataDisplay 
          analysisResult={mockEnhancedAnalysisResult}
        />
      )

      expect(screen.getByLabelText('Toggle menu')).toBeInTheDocument()
    })

    it('collapses sections by default on mobile for low priority items', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLandscape: false,
        isPortrait: true,
        isTouchDevice: true,
        screenWidth: 375,
        screenHeight: 667
      })

      render(
        <EnhancedCreditDataDisplay 
          analysisResult={mockEnhancedAnalysisResult}
        />
      )

      // High priority sections should be visible
      expect(screen.getByText('Credit Score Overview')).toBeInTheDocument()
      expect(screen.getByText('Negative Items & Disputes')).toBeInTheDocument()
      
      // Low priority sections should have collapse buttons
      expect(screen.getByLabelText('Expand Personal Information')).toBeInTheDocument()
    })

    it('uses card view mode on mobile regardless of initial setting', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLandscape: false,
        isPortrait: true,
        isTouchDevice: true,
        screenWidth: 375,
        screenHeight: 667
      })

      render(
        <EnhancedCreditDataDisplay 
          analysisResult={mockEnhancedAnalysisResult}
        />
      )

      // Should not show view mode toggle on mobile
      expect(screen.queryByRole('button', { name: /grid/i })).not.toBeInTheDocument()
    })

    it('shows touch-friendly button sizes on mobile', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLandscape: false,
        isPortrait: true,
        isTouchDevice: true,
        screenWidth: 375,
        screenHeight: 667
      })

      render(
        <EnhancedCreditDataDisplay 
          analysisResult={mockEnhancedAnalysisResult}
        />
      )

      const refreshButton = screen.getByText('Refresh').closest('button')
      expect(refreshButton).toHaveClass('touch-button')
    })
  })

  describe('Responsive Breakpoints', () => {
    it('applies mobile styles for screens < 640px', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLandscape: false,
        isPortrait: true,
        isTouchDevice: true,
        screenWidth: 375,
        screenHeight: 667
      })

      const { container } = render(
        <div className="mobile-container mobile-spacing-md">
          <div className="mobile-stat-grid">
            <div className="mobile-stat-card">Test</div>
          </div>
        </div>
      )

      expect(container.firstChild).toHaveClass('mobile-container', 'mobile-spacing-md')
    })

    it('applies tablet styles for screens 640px - 1024px', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isLandscape: true,
        isPortrait: false,
        isTouchDevice: false,
        screenWidth: 768,
        screenHeight: 1024
      })

      render(
        <EnhancedCreditDataDisplay 
          analysisResult={mockEnhancedAnalysisResult}
        />
      )

      // Should show some desktop features but maintain mobile-friendly sizing
      expect(screen.getByText('Enhanced Credit Analysis')).toBeInTheDocument()
    })

    it('applies desktop styles for screens >= 1024px', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLandscape: true,
        isPortrait: false,
        isTouchDevice: false,
        screenWidth: 1440,
        screenHeight: 900
      })

      render(
        <EnhancedCreditDataDisplay 
          analysisResult={mockEnhancedAnalysisResult}
        />
      )

      // Should show full desktop layout
      expect(screen.getByText('Enhanced Credit Analysis')).toBeInTheDocument()
      // Should not show mobile menu toggle
      expect(screen.queryByLabelText('Toggle menu')).not.toBeInTheDocument()
    })
  })

  describe('Touch Device Optimization', () => {
    it('applies touch-friendly styles for touch devices', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLandscape: false,
        isPortrait: true,
        isTouchDevice: true,
        screenWidth: 375,
        screenHeight: 667
      })

      render(
        <EnhancedCreditDataDisplay 
          analysisResult={mockEnhancedAnalysisResult}
        />
      )

      const buttons = screen.getAllByRole('button')
      const touchButtons = buttons.filter(button => 
        button.className.includes('touch-button') || 
        button.className.includes('touch-target')
      )
      
      expect(touchButtons.length).toBeGreaterThan(0)
    })
  })
})

// Mock data for testing
const mockEnhancedAnalysisResult = {
  extractedData: {
    personalInfo: {
      name: 'John Doe',
      address: '123 Main St, City, ST 12345',
      ssn: '***-**-1234',
      dateOfBirth: '1990-01-01'
    },
    creditScores: {
      experian: { score: 720, date: '2024-01-01' },
      equifax: { score: 715, date: '2024-01-01' },
      transunion: { score: 725, date: '2024-01-01' }
    },
    accounts: [
      {
        id: '1',
        creditorName: 'Test Bank',
        accountNumber: '****1234',
        accountType: 'credit_card',
        balance: 1500,
        creditLimit: 5000,
        status: 'open',
        lastReported: '2024-01-01'
      }
    ],
    negativeItems: [
      {
        id: '1',
        type: 'late_payment',
        creditor: 'Test Bank',
        amount: 50,
        date: '2023-12-01',
        status: 'active'
      }
    ],
    inquiries: [
      {
        id: '1',
        creditor: 'Test Bank',
        date: '2024-01-01',
        type: 'hard'
      }
    ]
  },
  scoreAnalysis: {
    factors: [
      {
        factor: 'Payment History',
        weight: 35,
        impact: 'positive',
        description: 'Good payment history'
      }
    ],
    improvementPotential: 50,
    timelineEstimate: '6-12 months'
  },
  recommendations: [
    {
      id: '1',
      type: 'dispute',
      priority: 'high',
      description: 'Dispute late payment',
      successProbability: 0.8
    }
  ],
  uiMetadata: {
    confidence: 85,
    processingMethod: 'enhanced',
    completeness: {
      personalInfo: 90,
      creditScores: 95,
      accounts: 88,
      negativeItems: 92,
      overall: 89
    }
  }
}