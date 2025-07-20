import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { InquiriesSection } from '../InquiriesSection'
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

jest.mock('@/components/ui/Input', () => ({
  Input: ({ placeholder, value, onChange, className }: any) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
    />
  )
}))

// Mock the modal component
jest.mock('../modals/InquiryDetailsModal', () => ({
  InquiryDetailsModal: ({ inquiry, isOpen, onClose }: any) => (
    isOpen ? (
      <div data-testid="inquiry-details-modal">
        <h2>{inquiry.creditorName}</h2>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}))

// Mock the confidence indicator
jest.mock('../utils/ConfidenceIndicator', () => ({
  ConfidenceIndicator: ({ confidence }: any) => (
    <span data-testid="confidence-indicator">{confidence}%</span>
  )
}))

const mockInquiries: CreditInquiry[] = [
  {
    id: 'inquiry-1',
    creditorName: 'Chase Bank',
    date: '2024-01-15',
    type: 'hard',
    purpose: 'Credit Card Application',
    bureau: 'experian',
    confidence: 95,
    impact: 'medium'
  },
  {
    id: 'inquiry-2',
    creditorName: 'Capital One',
    date: '2023-12-10',
    type: 'soft',
    purpose: 'Pre-approved Offer',
    bureau: 'equifax',
    confidence: 88,
    impact: 'low'
  },
  {
    id: 'inquiry-3',
    creditorName: 'Wells Fargo',
    date: '2024-02-01',
    type: 'hard',
    purpose: 'Auto Loan',
    bureau: 'transunion',
    confidence: 92,
    impact: 'high'
  }
]

describe('InquiriesSection', () => {
  const mockOnInquirySelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders inquiry statistics correctly', () => {
    render(
      <InquiriesSection
        inquiries={mockInquiries}
        onInquirySelect={mockOnInquirySelect}
      />
    )

    // Check summary statistics
    expect(screen.getByText('3')).toBeInTheDocument() // Total inquiries
    expect(screen.getAllByText('2')).toHaveLength(2) // Hard inquiries and Recent Hard
    expect(screen.getByText('1')).toBeInTheDocument() // Soft inquiries
  })

  it('displays all inquiries in the list', () => {
    render(
      <InquiriesSection
        inquiries={mockInquiries}
        onInquirySelect={mockOnInquirySelect}
      />
    )

    expect(screen.getByText('Chase Bank')).toBeInTheDocument()
    expect(screen.getByText('Capital One')).toBeInTheDocument()
    expect(screen.getByText('Wells Fargo')).toBeInTheDocument()
  })

  it('shows inquiry types correctly', () => {
    render(
      <InquiriesSection
        inquiries={mockInquiries}
        onInquirySelect={mockOnInquirySelect}
      />
    )

    expect(screen.getAllByText('HARD')).toHaveLength(2)
    expect(screen.getByText('SOFT')).toBeInTheDocument()
  })

  it('filters inquiries by search term', () => {
    render(
      <InquiriesSection
        inquiries={mockInquiries}
        onInquirySelect={mockOnInquirySelect}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search inquiries...')
    fireEvent.change(searchInput, { target: { value: 'Chase' } })

    expect(screen.getByText('Chase Bank')).toBeInTheDocument()
    expect(screen.queryByText('Capital One')).not.toBeInTheDocument()
    expect(screen.queryByText('Wells Fargo')).not.toBeInTheDocument()
  })

  it('filters inquiries by type', () => {
    render(
      <InquiriesSection
        inquiries={mockInquiries}
        onInquirySelect={mockOnInquirySelect}
      />
    )

    const filterSelect = screen.getByDisplayValue('All Types')
    fireEvent.change(filterSelect, { target: { value: 'hard' } })

    expect(screen.getByText('Chase Bank')).toBeInTheDocument()
    expect(screen.getByText('Wells Fargo')).toBeInTheDocument()
    expect(screen.queryByText('Capital One')).not.toBeInTheDocument()
  })

  it('opens inquiry details modal when clicking on an inquiry', () => {
    render(
      <InquiriesSection
        inquiries={mockInquiries}
        onInquirySelect={mockOnInquirySelect}
      />
    )

    const inquiryCard = screen.getByText('Chase Bank').closest('div')
    fireEvent.click(inquiryCard!)

    expect(screen.getByTestId('inquiry-details-modal')).toBeInTheDocument()
    expect(mockOnInquirySelect).toHaveBeenCalledWith('inquiry-1')
  })

  it('shows educational information about inquiries', () => {
    render(
      <InquiriesSection
        inquiries={mockInquiries}
        onInquirySelect={mockOnInquirySelect}
      />
    )

    expect(screen.getByText('Understanding Credit Inquiries')).toBeInTheDocument()
    expect(screen.getByText(/Hard Inquiries:/)).toBeInTheDocument()
    expect(screen.getByText(/Soft Inquiries:/)).toBeInTheDocument()
  })

  it('shows warning for high number of recent hard inquiries', () => {
    const manyHardInquiries: CreditInquiry[] = Array.from({ length: 6 }, (_, i) => ({
      id: `inquiry-${i}`,
      creditorName: `Creditor ${i}`,
      date: '2024-01-01',
      type: 'hard',
      purpose: 'Credit Application',
      bureau: 'experian',
      confidence: 90
    }))

    render(
      <InquiriesSection
        inquiries={manyHardInquiries}
        onInquirySelect={mockOnInquirySelect}
      />
    )

    expect(screen.getByText('High Number of Recent Hard Inquiries')).toBeInTheDocument()
  })

  it('handles empty inquiries list', () => {
    render(
      <InquiriesSection
        inquiries={[]}
        onInquirySelect={mockOnInquirySelect}
      />
    )

    expect(screen.getByText('No Inquiries Found')).toBeInTheDocument()
    expect(screen.getByText('No credit inquiries were found in this report.')).toBeInTheDocument()
  })

  it('displays confidence indicators for each inquiry', () => {
    render(
      <InquiriesSection
        inquiries={mockInquiries}
        onInquirySelect={mockOnInquirySelect}
      />
    )

    const confidenceIndicators = screen.getAllByTestId('confidence-indicator')
    expect(confidenceIndicators).toHaveLength(3)
    // Check that all confidence values are present (order may vary due to sorting)
    const confidenceTexts = confidenceIndicators.map(el => el.textContent)
    expect(confidenceTexts).toContain('95%')
    expect(confidenceTexts).toContain('88%')
    expect(confidenceTexts).toContain('92%')
  })
})