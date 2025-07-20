import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { InquiryDetailsModal } from '../modals/InquiryDetailsModal'
import { CreditInquiry } from '@/types/credit-ui'

// Mock the UI components
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>
}))

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, className, variant, size }: any) => (
    <button onClick={onClick} className={className} data-variant={variant} data-size={size}>
      {children}
    </button>
  )
}))

// Mock the confidence indicator
jest.mock('../utils/ConfidenceIndicator', () => ({
  ConfidenceIndicator: ({ confidence }: any) => (
    <span data-testid="confidence-indicator">{confidence}%</span>
  )
}))

const mockHardInquiry: CreditInquiry = {
  id: 'inquiry-1',
  creditorName: 'Chase Bank',
  date: '2024-01-15',
  type: 'hard',
  purpose: 'Credit Card Application',
  bureau: 'experian',
  confidence: 95,
  impact: 'medium'
}

const mockSoftInquiry: CreditInquiry = {
  id: 'inquiry-2',
  creditorName: 'Capital One',
  date: '2023-12-10',
  type: 'soft',
  purpose: 'Pre-approved Offer',
  bureau: 'equifax',
  confidence: 88,
  impact: 'low'
}

describe('InquiryDetailsModal', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    render(
      <InquiryDetailsModal
        inquiry={mockHardInquiry}
        isOpen={false}
        onClose={mockOnClose}
      />
    )

    expect(screen.queryByText('Chase Bank')).not.toBeInTheDocument()
  })

  it('renders inquiry details when isOpen is true', () => {
    render(
      <InquiryDetailsModal
        inquiry={mockHardInquiry}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    expect(screen.getAllByText('Chase Bank')).toHaveLength(2) // Header and details section
    expect(screen.getByText('HARD INQUIRY')).toBeInTheDocument()
    expect(screen.getByText('MEDIUM IMPACT')).toBeInTheDocument()
    expect(screen.getByText('Credit Card Application')).toBeInTheDocument()
  })

  it('shows correct tabs for hard inquiry', () => {
    render(
      <InquiryDetailsModal
        inquiry={mockHardInquiry}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Inquiry Details')).toBeInTheDocument()
    expect(screen.getByText('Score Impact')).toBeInTheDocument()
    expect(screen.getByText('Dispute Options')).toBeInTheDocument()
  })

  it('displays inquiry information in details tab', () => {
    render(
      <InquiryDetailsModal
        inquiry={mockHardInquiry}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    expect(screen.getAllByText('Chase Bank')).toHaveLength(2) // Header and details section
    expect(screen.getByText('Credit Card Application')).toBeInTheDocument()
    expect(screen.getByText('Experian', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('1/14/2024')).toBeInTheDocument()
  })

  it('shows score impact information for hard inquiry', () => {
    render(
      <InquiryDetailsModal
        inquiry={mockHardInquiry}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Click on Score Impact tab
    fireEvent.click(screen.getByText('Score Impact'))

    expect(screen.getByText('Credit Score Impact')).toBeInTheDocument()
    expect(screen.getByText('2-5 points')).toBeInTheDocument()
    expect(screen.getByText('6-12 months')).toBeInTheDocument()
  })

  it('shows no impact for soft inquiry', () => {
    render(
      <InquiryDetailsModal
        inquiry={mockSoftInquiry}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Click on Score Impact tab
    fireEvent.click(screen.getByText('Score Impact'))

    expect(screen.getByText('0 points')).toBeInTheDocument()
    expect(screen.getByText('No impact')).toBeInTheDocument()
  })

  it('shows dispute options in dispute tab', () => {
    render(
      <InquiryDetailsModal
        inquiry={mockHardInquiry}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Click on Dispute Options tab
    fireEvent.click(screen.getByText('Dispute Options'))

    expect(screen.getByText('Dispute This Inquiry')).toBeInTheDocument()
    expect(screen.getByText('I did not authorize this inquiry')).toBeInTheDocument()
    expect(screen.getByText('Dispute Process')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <InquiryDetailsModal
        inquiry={mockHardInquiry}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('displays confidence indicator', () => {
    render(
      <InquiryDetailsModal
        inquiry={mockHardInquiry}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    const confidenceIndicators = screen.getAllByTestId('confidence-indicator')
    expect(confidenceIndicators.length).toBeGreaterThan(0)
    expect(confidenceIndicators[0]).toHaveTextContent('95%')
  })

  it('shows different impact levels correctly', () => {
    const highImpactInquiry = { ...mockHardInquiry, impact: 'high' as const }
    
    render(
      <InquiryDetailsModal
        inquiry={highImpactInquiry}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('HIGH IMPACT')).toBeInTheDocument()

    // Click on Score Impact tab to see impact details
    fireEvent.click(screen.getByText('Score Impact'))
    expect(screen.getByText('5-10 points')).toBeInTheDocument()
  })

  it('shows inquiry age calculation', () => {
    render(
      <InquiryDetailsModal
        inquiry={mockHardInquiry}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Should show some age calculation (exact text may vary based on current date)
    expect(screen.getByText(/ago/)).toBeInTheDocument()
    expect(screen.getByText(/Expires in/)).toBeInTheDocument()
  })

  it('shows dispute action buttons for hard inquiry', () => {
    render(
      <InquiryDetailsModal
        inquiry={mockHardInquiry}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Click on Dispute Options tab to see the dispute button
    fireEvent.click(screen.getByText('Dispute Options'))
    expect(screen.getByText('Start Dispute Process')).toBeInTheDocument()
    expect(screen.getByText('Get Dispute Letter Template')).toBeInTheDocument()
  })

  it('shows dispute action buttons for soft inquiry', () => {
    render(
      <InquiryDetailsModal
        inquiry={mockSoftInquiry}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Soft inquiries don't show the dispute letter template button
    expect(screen.queryByText('Get Dispute Letter Template')).not.toBeInTheDocument()
    
    // Click on Dispute Options tab to see the dispute button
    fireEvent.click(screen.getByText('Dispute Options'))
    expect(screen.getByText('Start Dispute Process')).toBeInTheDocument()
  })
})