import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualizedAccountList } from '../VirtualizedAccountList';
import { Account } from '@/types/enhanced-credit';

// Mock the performance hook
jest.mock('@/lib/performance/lazyLoader', () => ({
  usePerformanceMonitor: jest.fn(),
  useVirtualScroll: jest.fn(() => ({
    visibleItems: [],
    totalHeight: 0,
    offsetY: 0,
    startIndex: 0,
    setScrollTop: jest.fn()
  }))
}));

const mockAccounts: Account[] = Array.from({ length: 50 }, (_, i) => ({
  id: `account-${i}`,
  creditorName: `Creditor ${i}`,
  accountType: 'Credit Card',
  balance: 1000 + i * 100,
  creditLimit: 5000 + i * 500,
  status: 'Open',
  paymentStatus: 'Current',
  dateOpened: '2020-01-01'
}));

describe('VirtualizedAccountList', () => {
  beforeEach(() => {
    const mockUseVirtualScroll = require('@/lib/performance/lazyLoader').useVirtualScroll;
    mockUseVirtualScroll.mockReturnValue({
      visibleItems: mockAccounts.slice(0, 5), // Show first 5 items
      totalHeight: mockAccounts.length * 120,
      offsetY: 0,
      startIndex: 0,
      setScrollTop: jest.fn()
    });
  });

  it('renders empty state when no accounts provided', () => {
    render(<VirtualizedAccountList accounts={[]} />);
    expect(screen.getByText('No accounts found')).toBeInTheDocument();
  });

  it('renders virtualized account list', () => {
    render(<VirtualizedAccountList accounts={mockAccounts} />);
    
    // Should show performance indicator
    expect(screen.getByText('Showing 5 of 50 accounts')).toBeInTheDocument();
    
    // Should render visible account cards
    expect(screen.getByText('Creditor 0')).toBeInTheDocument();
    expect(screen.getByText('Creditor 4')).toBeInTheDocument();
    
    // Should not render non-visible accounts
    expect(screen.queryByText('Creditor 10')).not.toBeInTheDocument();
  });

  it('calls onAccountSelect when account is clicked', () => {
    const mockOnSelect = jest.fn();
    render(<VirtualizedAccountList accounts={mockAccounts} onAccountSelect={mockOnSelect} />);
    
    // Find and click the first account card
    const firstAccount = screen.getByText('Creditor 0').closest('div');
    if (firstAccount) {
      fireEvent.click(firstAccount);
      expect(mockOnSelect).toHaveBeenCalledWith(mockAccounts[0]);
    }
  });

  it('handles scroll events', () => {
    const mockSetScrollTop = jest.fn();
    const mockUseVirtualScroll = require('@/lib/performance/lazyLoader').useVirtualScroll;
    mockUseVirtualScroll.mockReturnValue({
      visibleItems: mockAccounts.slice(0, 5),
      totalHeight: mockAccounts.length * 120,
      offsetY: 0,
      startIndex: 0,
      setScrollTop: mockSetScrollTop
    });

    render(<VirtualizedAccountList accounts={mockAccounts} />);
    
    const scrollContainer = screen.getByRole('generic', { hidden: true });
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 240 } });
    
    expect(mockSetScrollTop).toHaveBeenCalledWith(240);
  });

  it('applies custom className', () => {
    const { container } = render(
      <VirtualizedAccountList accounts={mockAccounts} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('updates visible items when scroll position changes', () => {
    const mockUseVirtualScroll = require('@/lib/performance/lazyLoader').useVirtualScroll;
    
    // Initial render
    const { rerender } = render(<VirtualizedAccountList accounts={mockAccounts} />);
    expect(screen.getByText('Creditor 0')).toBeInTheDocument();
    
    // Simulate scroll - show different items
    mockUseVirtualScroll.mockReturnValue({
      visibleItems: mockAccounts.slice(10, 15),
      totalHeight: mockAccounts.length * 120,
      offsetY: 1200,
      startIndex: 10,
      setScrollTop: jest.fn()
    });
    
    rerender(<VirtualizedAccountList accounts={mockAccounts} />);
    
    expect(screen.getByText('Creditor 10')).toBeInTheDocument();
    expect(screen.queryByText('Creditor 0')).not.toBeInTheDocument();
  });
});