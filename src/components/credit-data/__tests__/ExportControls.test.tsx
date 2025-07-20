import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportControls } from '../ExportControls';
import { EnhancedCreditData } from '@/types/enhanced-credit';

// Mock the export service
jest.mock('@/lib/export/exportService', () => ({
  CreditDataExportService: {
    getInstance: () => ({
      exportData: jest.fn().mockResolvedValue(undefined)
    })
  }
}));

const mockCreditData: EnhancedCreditData = {
  creditScores: [
    { bureau: 'Experian', score: 750, factors: [] },
    { bureau: 'Equifax', score: 740, factors: [] }
  ],
  accounts: [
    {
      id: '1',
      creditorName: 'Test Bank',
      accountType: 'Credit Card',
      balance: 1000,
      creditLimit: 5000,
      status: 'Open',
      paymentStatus: 'Current'
    }
  ],
  negativeItems: [],
  inquiries: [],
  personalInfo: {
    name: 'Test User',
    addresses: [],
    ssn: '***-**-1234'
  }
};

describe('ExportControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders export controls with default options', () => {
    render(<ExportControls data={mockCreditData} />);
    
    expect(screen.getByText('Export Credit Data')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('allows format selection', () => {
    render(<ExportControls data={mockCreditData} />);
    
    const csvButton = screen.getByText('CSV');
    fireEvent.click(csvButton);
    
    expect(csvButton).toHaveClass('bg-blue-600');
  });

  it('allows section selection', () => {
    render(<ExportControls data={mockCreditData} />);
    
    const scoresCheckbox = screen.getByLabelText('Credit Scores');
    expect(scoresCheckbox).toBeChecked();
    
    fireEvent.click(scoresCheckbox);
    expect(scoresCheckbox).not.toBeChecked();
  });

  it('handles PII inclusion toggle', () => {
    render(<ExportControls data={mockCreditData} />);
    
    const piiCheckbox = screen.getByLabelText(/Include Personal Information/);
    expect(piiCheckbox).not.toBeChecked();
    
    fireEvent.click(piiCheckbox);
    expect(piiCheckbox).toBeChecked();
  });

  it('disables export button when no sections selected', () => {
    render(<ExportControls data={mockCreditData} />);
    
    // Uncheck all sections
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.slice(0, 4).forEach(checkbox => {
      if (checkbox.getAttribute('checked') !== null) {
        fireEvent.click(checkbox);
      }
    });
    
    const exportButton = screen.getByRole('button', { name: /Export as/ });
    expect(exportButton).toBeDisabled();
  });

  it('calls export service when export button is clicked', async () => {
    const mockExportService = require('@/lib/export/exportService').CreditDataExportService.getInstance();
    
    render(<ExportControls data={mockCreditData} />);
    
    const exportButton = screen.getByRole('button', { name: /Export as PDF/ });
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockExportService.exportData).toHaveBeenCalledWith(
        mockCreditData,
        expect.objectContaining({
          format: 'pdf',
          includePII: false,
          sections: expect.arrayContaining(['scores', 'accounts', 'negativeItems', 'inquiries'])
        })
      );
    });
  });

  it('shows loading state during export', async () => {
    const mockExportService = require('@/lib/export/exportService').CreditDataExportService.getInstance();
    mockExportService.exportData.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<ExportControls data={mockCreditData} />);
    
    const exportButton = screen.getByRole('button', { name: /Export as PDF/ });
    fireEvent.click(exportButton);
    
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/Export as PDF/)).toBeInTheDocument();
    });
  });
});