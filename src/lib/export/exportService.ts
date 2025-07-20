import { EnhancedCreditData } from '@/types/enhanced-credit';
import { maskPII } from '@/lib/security/piiMasker';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'json';
  includePII: boolean;
  sections: string[];
  filename?: string;
}

export class CreditDataExportService {
  private static instance: CreditDataExportService;

  static getInstance(): CreditDataExportService {
    if (!this.instance) {
      this.instance = new CreditDataExportService();
    }
    return this.instance;
  }

  async exportData(data: EnhancedCreditData, options: ExportOptions): Promise<void> {
    const processedData = options.includePII ? data : this.maskSensitiveData(data);
    
    switch (options.format) {
      case 'pdf':
        return this.exportToPDF(processedData, options);
      case 'csv':
        return this.exportToCSV(processedData, options);
      case 'json':
        return this.exportToJSON(processedData, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private maskSensitiveData(data: EnhancedCreditData): EnhancedCreditData {
    return {
      ...data,
      personalInfo: maskPII(data.personalInfo),
      accounts: data.accounts.map(account => ({
        ...account,
        accountNumber: maskPII(account.accountNumber)
      }))
    };
  }

  private async exportToPDF(data: EnhancedCreditData, options: ExportOptions): Promise<void> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Credit Report Analysis', 20, 20);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);

    let yPosition = 50;

    // Credit Scores
    if (options.sections.includes('scores')) {
      doc.setFontSize(16);
      doc.text('Credit Scores', 20, yPosition);
      yPosition += 10;
      
      data.creditScores.forEach(score => {
        doc.setFontSize(12);
        doc.text(`${score.bureau}: ${score.score}`, 30, yPosition);
        yPosition += 8;
      });
      yPosition += 10;
    }

    // Accounts
    if (options.sections.includes('accounts')) {
      doc.setFontSize(16);
      doc.text('Accounts', 20, yPosition);
      yPosition += 10;

      const accountData = data.accounts.map(account => [
        account.creditorName,
        account.accountType,
        `$${account.balance}`,
        `$${account.creditLimit}`,
        account.status
      ]);

      (doc as any).autoTable({
        head: [['Creditor', 'Type', 'Balance', 'Limit', 'Status']],
        body: accountData,
        startY: yPosition,
      });
    }

    const filename = options.filename || `credit-report-${Date.now()}.pdf`;
    doc.save(filename);
  }

  private async exportToCSV(data: EnhancedCreditData, options: ExportOptions): Promise<void> {
    let csvContent = '';

    if (options.sections.includes('accounts')) {
      csvContent += 'Creditor,Type,Balance,Credit Limit,Status,Payment Status\n';
      data.accounts.forEach(account => {
        csvContent += `"${account.creditorName}","${account.accountType}",${account.balance},${account.creditLimit},"${account.status}","${account.paymentStatus}"\n`;
      });
    }

    if (options.sections.includes('negativeItems')) {
      csvContent += '\nNegative Items\n';
      csvContent += 'Type,Creditor,Amount,Date,Status\n';
      data.negativeItems.forEach(item => {
        csvContent += `"${item.type}","${item.creditor}",${item.amount},"${item.date}","${item.status}"\n`;
      });
    }

    const filename = options.filename || `credit-data-${Date.now()}.csv`;
    this.downloadFile(csvContent, filename, 'text/csv');
  }

  private async exportToJSON(data: EnhancedCreditData, options: ExportOptions): Promise<void> {
    const filteredData: any = {};

    options.sections.forEach(section => {
      switch (section) {
        case 'scores':
          filteredData.creditScores = data.creditScores;
          break;
        case 'accounts':
          filteredData.accounts = data.accounts;
          break;
        case 'negativeItems':
          filteredData.negativeItems = data.negativeItems;
          break;
        case 'inquiries':
          filteredData.inquiries = data.inquiries;
          break;
      }
    });

    const jsonContent = JSON.stringify(filteredData, null, 2);
    const filename = options.filename || `credit-data-${Date.now()}.json`;
    this.downloadFile(jsonContent, filename, 'application/json');
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}