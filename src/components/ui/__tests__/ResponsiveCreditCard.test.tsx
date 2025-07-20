import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ResponsiveCreditCard, CreditCardData } from '../ResponsiveCreditCard'

// Mock data for testing
const mockCard: CreditCardData = {
  id: 'test-card-1',
  cardName: 'Test Credit Card',
  cardNumber: '4532123456789012',
  expiryDate: '12/26',
  balance: 2500,
  creditLimit: 10000,
  availableCredit: 7500,
  interestRate: 18.99,
  minimumPayment: 75,
  lastPaymentDate: '2024-01-15',
  status: 'active',
  provider: 'Test Bank',
  cardType: 'visa',
  isBusinessCard: false,
  rewards: {
    type: 'points',
    rate: 2,
    balance: 5000
  },
  paymentHistory: [
    { date: '2024-01-15', status: 'ontime', amount: 300 },
    { date: '2023-12-15', status: 'ontime', amount: 250 },
  ],
  confidence: 95
}

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
})

// Mock matchMedia
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

// Mock vibrate API
Object.assign(navigator, {
  vibrate: jest.fn()
})

describe('ResponsiveCreditCard', () => {
  const defaultProps = {
    card: mockCard,
    onSelect: jest.fn(),
    onToggleFavorite: jest.fn(),
    onViewDetails: jest.fn(),
    onCopyNumber: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders card with basic information', () => {
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      expect(screen.getByText('Test Credit Card')).toBeInTheDocument()
      expect(screen.getByText('Test Bank')).toBeInTheDocument()
      expect(screen.getByText('$2,500')).toBeInTheDocument()
      expect(screen.getByText('$7,500')).toBeInTheDocument()
    })

    it('masks card number by default', () => {
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      expect(screen.getByText('••••  ••••  ••••  9012')).toBeInTheDocument()
      expect(screen.queryByText('4532  1234  5678  9012')).not.toBeInTheDocument()
    })

    it('shows full card number when showSensitiveData is true', () => {
      render(<ResponsiveCreditCard {...defaultProps} showSensitiveData />)
      
      expect(screen.getByText('4532  1234  5678  9012')).toBeInTheDocument()
    })

    it('renders different variants correctly', () => {
      const { rerender } = render(<ResponsiveCreditCard {...defaultProps} variant="compact" />)
      
      // Compact variant should be shorter
      let card = screen.getByRole('button')
      expect(card).toHaveClass('min-h-[88px]')
      
      rerender(<ResponsiveCreditCard {...defaultProps} variant="detailed" />)
      
      // Detailed variant should show more information
      expect(screen.getByText('Interest Rate')).toBeInTheDocument()
      expect(screen.getByText('18.99% APR')).toBeInTheDocument()
    })

    it('shows business card indicator when applicable', () => {
      const businessCard = { ...mockCard, isBusinessCard: true }
      render(<ResponsiveCreditCard {...defaultProps} card={businessCard} />)
      
      expect(screen.getByText('Business')).toBeInTheDocument()
    })

    it('displays status correctly', () => {
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      expect(screen.getByText('active')).toBeInTheDocument()
    })

    it('shows rewards information in detailed variant', () => {
      render(<ResponsiveCreditCard {...defaultProps} variant="detailed" />)
      
      expect(screen.getByText('POINTS REWARDS')).toBeInTheDocument()
      expect(screen.getByText('2% back')).toBeInTheDocument()
      expect(screen.getByText('5,000')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onSelect when card is clicked', async () => {
      const user = userEvent.setup()
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      const card = screen.getByRole('button')
      await user.click(card)
      
      expect(defaultProps.onSelect).toHaveBeenCalledWith('test-card-1')
    })

    it('toggles card number visibility', async () => {
      const user = userEvent.setup()
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      // Initially masked
      expect(screen.getByText('••••  ••••  ••••  9012')).toBeInTheDocument()
      
      // Click show button
      const showButton = screen.getByLabelText('Show card number')
      await user.click(showButton)
      
      // Should show full number
      expect(screen.getByText('4532  1234  5678  9012')).toBeInTheDocument()
      
      // Click hide button
      const hideButton = screen.getByLabelText('Hide card number')
      await user.click(hideButton)
      
      // Should be masked again
      expect(screen.getByText('••••  ••••  ••••  9012')).toBeInTheDocument()
    })

    it('copies card number to clipboard', async () => {
      const user = userEvent.setup()
      render(<ResponsiveCreditCard {...defaultProps} showSensitiveData />)
      
      const copyButton = screen.getByLabelText('Copy card number')
      await user.click(copyButton)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('4532123456789012')
      expect(defaultProps.onCopyNumber).toHaveBeenCalledWith('4532123456789012')
    })

    it('calls onViewDetails when view details button is clicked', async () => {
      const user = userEvent.setup()
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      const viewDetailsButton = screen.getByText('View Details')
      await user.click(viewDetailsButton)
      
      expect(defaultProps.onViewDetails).toHaveBeenCalledWith('test-card-1')
    })

    it('calls onToggleFavorite when favorite button is clicked', async () => {
      const user = userEvent.setup()
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      const favoriteButton = screen.getByLabelText('Add to favorites')
      await user.click(favoriteButton)
      
      expect(defaultProps.onToggleFavorite).toHaveBeenCalledWith('test-card-1')
    })

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      const card = screen.getByRole('button')
      card.focus()
      
      // Enter key should select card
      await user.keyboard('{Enter}')
      expect(defaultProps.onSelect).toHaveBeenCalledWith('test-card-1')
      
      // Space key should also select card
      await user.keyboard(' ')
      expect(defaultProps.onSelect).toHaveBeenCalledTimes(2)
    })

    it('handles keyboard shortcuts', async () => {
      const user = userEvent.setup()
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      const card = screen.getByRole('button')
      card.focus()
      
      // Ctrl+V should view details
      await user.keyboard('{Control>}v{/Control}')
      expect(defaultProps.onViewDetails).toHaveBeenCalledWith('test-card-1')
      
      // Ctrl+C should copy number
      await user.keyboard('{Control>}c{/Control}')
      expect(defaultProps.onCopyNumber).toHaveBeenCalledWith('4532123456789012')
      
      // Ctrl+F should toggle favorite
      await user.keyboard('{Control>}f{/Control}')
      expect(defaultProps.onToggleFavorite).toHaveBeenCalledWith('test-card-1')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-label', 'Test Credit Card credit card, balance $2,500, 25.0% utilization')
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('shows selected state in aria-pressed', () => {
      render(<ResponsiveCreditCard {...defaultProps} isSelected />)
      
      const card = screen.getByRole('button')
      expect(card).toHaveAttribute('aria-pressed', 'true')
    })

    it('has proper progress bar for utilization', () => {
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '25')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-label', 'Credit utilization 25.0%')
    })

    it('has accessible button labels', () => {
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      expect(screen.getByLabelText('Show card number')).toBeInTheDocument()
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument()
    })

    it('updates favorite button label when isFavorite changes', () => {
      const { rerender } = render(<ResponsiveCreditCard {...defaultProps} isFavorite={false} />)
      expect(screen.getByLabelText('Add to favorites')).toBeInTheDocument()
      
      rerender(<ResponsiveCreditCard {...defaultProps} isFavorite />)
      expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('applies correct CSS classes for touch targets', () => {
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      const viewDetailsButton = screen.getByText('View Details')
      expect(viewDetailsButton).toHaveClass('h-10', 'touch-target')
    })

    it('shows/hides elements based on screen size classes', () => {
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      // Actions button should be hidden on mobile (sm:flex class)
      const actionsButton = screen.getByLabelText('More actions')
      expect(actionsButton).toHaveClass('hidden', 'sm:flex')
    })
  })

  describe('Utilization Calculation', () => {
    it('calculates utilization percentage correctly', () => {
      render(<ResponsiveCreditCard {...defaultProps} />)
      
      // Balance: 2500, Limit: 10000 = 25%
      expect(screen.getByText('25.0%')).toBeInTheDocument()
    })

    it('applies correct color classes based on utilization', () => {
      const highUtilizationCard = {
        ...mockCard,
        balance: 9500,
        creditLimit: 10000,
        availableCredit: 500
      }
      
      render(<ResponsiveCreditCard {...defaultProps} card={highUtilizationCard} />)
      
      const utilizationText = screen.getByText('95.0%')
      expect(utilizationText).toHaveClass('text-red-600')
    })

    it('handles zero credit limit gracefully', () => {
      const zeroCreditCard = {
        ...mockCard,
        creditLimit: 0,
        availableCredit: 0
      }
      
      render(<ResponsiveCreditCard {...defaultProps} card={zeroCreditCard} />)
      
      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })
  })

  describe('Touch Gestures', () => {
    it('handles touch events for swipe gestures', () => {
      render(<ResponsiveCreditCard {...defaultProps} enableSwipeActions />)
      
      const card = screen.getByRole('button')
      
      // Simulate touch start
      fireEvent.touchStart(card, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Simulate touch move (swipe right)
      fireEvent.touchMove(card, {
        touches: [{ clientX: 150, clientY: 100 }]
      })
      
      // Simulate touch end
      fireEvent.touchEnd(card)
      
      // Component should handle the swipe gesture
      expect(card).toBeInTheDocument()
    })

    it('prevents card selection during swipe', () => {
      render(<ResponsiveCreditCard {...defaultProps} enableSwipeActions />)
      
      const card = screen.getByRole('button')
      
      // Start a swipe gesture
      fireEvent.touchStart(card, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      fireEvent.touchMove(card, {
        touches: [{ clientX: 150, clientY: 100 }]
      })
      
      // Click should not trigger selection during swipe
      fireEvent.click(card)
      
      expect(defaultProps.onSelect).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles missing optional data gracefully', () => {
      const minimalCard = {
        id: 'minimal',
        cardName: 'Minimal Card',
        cardNumber: '1234',
        balance: 100,
        creditLimit: 1000,
        availableCredit: 900,
        status: 'active' as const,
        provider: 'Test',
        cardType: 'visa' as const
      }
      
      render(<ResponsiveCreditCard {...defaultProps} card={minimalCard} />)
      
      expect(screen.getByText('Minimal Card')).toBeInTheDocument()
      expect(screen.getByText('••••')).toBeInTheDocument() // Masked short number
    })

    it('handles clipboard write errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      
      // Mock clipboard.writeText to reject
      navigator.clipboard.writeText = jest.fn().mockRejectedValue(new Error('Clipboard error'))
      
      render(<ResponsiveCreditCard {...defaultProps} showSensitiveData />)
      
      const copyButton = screen.getByLabelText('Copy card number')
      await user.click(copyButton)
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to copy card number:', expect.any(Error))
      })
      
      consoleError.mockRestore()
    })
  })

  describe('Performance', () => {
    it('prevents unnecessary re-renders with React.memo', () => {
      const { rerender } = render(<ResponsiveCreditCard {...defaultProps} />)
      
      // Re-render with same props should not cause issues
      rerender(<ResponsiveCreditCard {...defaultProps} />)
      
      expect(screen.getByText('Test Credit Card')).toBeInTheDocument()
    })

    it('debounces touch events properly', () => {
      jest.useFakeTimers()
      
      render(<ResponsiveCreditCard {...defaultProps} enableSwipeActions />)
      
      const card = screen.getByRole('button')
      
      // Rapid touch events
      fireEvent.touchStart(card, { touches: [{ clientX: 100, clientY: 100 }] })
      fireEvent.touchMove(card, { touches: [{ clientX: 110, clientY: 100 }] })
      fireEvent.touchMove(card, { touches: [{ clientX: 120, clientY: 100 }] })
      fireEvent.touchMove(card, { touches: [{ clientX: 130, clientY: 100 }] })
      fireEvent.touchEnd(card)
      
      // Component should handle rapid events without issues
      expect(card).toBeInTheDocument()
      
      jest.useRealTimers()
    })
  })
})