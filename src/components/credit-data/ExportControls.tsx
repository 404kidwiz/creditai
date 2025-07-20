'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EnhancedCreditData } from '@/types/enhanced-credit';
import { CreditDataExportService, ExportOptions } from '@/lib/export/exportService';

interface ExportControlsProps {
  data: EnhancedCreditData;
  className?: string;
}

export const ExportControls: React.FC<ExportControlsProps> = ({ data, className = '' }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includePII: false,
    sections: ['scores', 'accounts', 'negativeItems', 'inquiries']
  });

  const exportService = CreditDataExportService.getInstance();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportService.exportData(data, exportOptions);
    } catch (error) {
      console.error('Export failed:', error);
      // Handle error - could show toast notification
    } finally {
      setIsExporting(false);
    }
  };

  const handleSectionToggle = (section: string) => {
    setExportOptions(prev => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section]
    }));
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Export Credit Data</h3>
      
      {/* Format Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Export Format</label>
        <div className="flex gap-2">
          {(['pdf', 'csv', 'json'] as const).map(format => (
            <button
              key={format}
              onClick={() => setExportOptions(prev => ({ ...prev, format }))}
              className={`px-3 py-2 rounded text-sm font-medium ${
                exportOptions.format === format
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Section Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Include Sections</label>
        <div className="space-y-2">
          {[
            { key: 'scores', label: 'Credit Scores' },
            { key: 'accounts', label: 'Accounts' },
            { key: 'negativeItems', label: 'Negative Items' },
            { key: 'inquiries', label: 'Inquiries' }
          ].map(section => (
            <label key={section.key} className="flex items-center">
              <input
                type="checkbox"
                checked={exportOptions.sections.includes(section.key)}
                onChange={() => handleSectionToggle(section.key)}
                className="mr-2"
              />
              <span className="text-sm">{section.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* PII Options */}
      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={exportOptions.includePII}
            onChange={(e) => setExportOptions(prev => ({ ...prev, includePII: e.target.checked }))}
            className="mr-2"
          />
          <span className="text-sm">Include Personal Information (PII)</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          When unchecked, sensitive information will be masked for privacy
        </p>
      </div>

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={isExporting || exportOptions.sections.length === 0}
        className="w-full"
      >
        {isExporting ? 'Exporting...' : `Export as ${exportOptions.format.toUpperCase()}`}
      </Button>
    </div>
  );
};