'use client';

import React, { useState, useEffect } from 'react';
import { DashboardWidget } from '@/types/analytics';
import { businessIntelligenceEngine } from '@/lib/analytics/businessIntelligence';

interface TableWidgetProps {
  widget: DashboardWidget;
  isEditable?: boolean;
  onUpdate?: (widgetId: string, updates: Partial<DashboardWidget>) => void;
}

interface TableData {
  columns: { key: string; label: string; type: 'text' | 'number' | 'date' | 'currency' }[];
  rows: Record<string, any>[];
  total: number;
}

export function TableWidget({ widget, isEditable, onUpdate }: TableWidgetProps) {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const pageSize = 10;

  useEffect(() => {
    loadTableData();
  }, [widget.config, currentPage]);

  const loadTableData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await businessIntelligenceEngine.getWidgetData(widget);
      const processedData = processTableData(data.data, data.total);
      setTableData(processedData);
    } catch (err) {
      setError('Failed to load table data');
      console.error('Error loading table data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processTableData = (rawData: any[], total: number): TableData => {
    if (!rawData || rawData.length === 0) {
      return { columns: [], rows: [], total: 0 };
    }

    const columns = inferColumns(rawData[0]);
    const rows = rawData.map(item => processRow(item, columns));

    return { columns, rows, total };
  };

  const inferColumns = (sampleRow: any): TableData['columns'] => {
    const columns: TableData['columns'] = [];

    // Define column mappings for different data sources
    if (widget.config.dataSource === 'user_behavior_events') {
      return [
        { key: 'event_type', label: 'Event Type', type: 'text' },
        { key: 'timestamp', label: 'Timestamp', type: 'date' },
        { key: 'user_id', label: 'User ID', type: 'text' },
        { key: 'page', label: 'Page', type: 'text' },
        { key: 'event_data', label: 'Data', type: 'text' }
      ];
    }

    if (widget.config.dataSource === 'business_metrics') {
      return [
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'active_users', label: 'Active Users', type: 'number' },
        { key: 'new_signups', label: 'New Signups', type: 'number' },
        { key: 'revenue', label: 'Revenue', type: 'currency' },
        { key: 'conversion_rate', label: 'Conversion Rate', type: 'number' }
      ];
    }

    // Auto-infer columns from sample data
    Object.keys(sampleRow).forEach(key => {
      const value = sampleRow[key];
      let type: 'text' | 'number' | 'date' | 'currency' = 'text';

      if (typeof value === 'number') {
        type = key.toLowerCase().includes('revenue') || key.toLowerCase().includes('price') ? 'currency' : 'number';
      } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
        type = 'date';
      }

      columns.push({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type
      });
    });

    return columns;
  };

  const processRow = (rawRow: any, columns: TableData['columns']): Record<string, any> => {
    const row: Record<string, any> = {};

    columns.forEach(column => {
      let value = rawRow[column.key];

      switch (column.type) {
        case 'date':
          if (value) {
            row[column.key] = new Date(value).toLocaleString();
          } else {
            row[column.key] = '-';
          }
          break;
        case 'currency':
          if (typeof value === 'number') {
            row[column.key] = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(value);
          } else {
            row[column.key] = '$0';
          }
          break;
        case 'number':
          if (typeof value === 'number') {
            row[column.key] = value.toLocaleString();
          } else {
            row[column.key] = '0';
          }
          break;
        case 'text':
        default:
          if (typeof value === 'object' && value !== null) {
            row[column.key] = JSON.stringify(value);
          } else {
            row[column.key] = value?.toString() || '-';
          }
          break;
      }
    });

    return row;
  };

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedRows = React.useMemo(() => {
    if (!tableData || !sortColumn) return tableData?.rows || [];

    return [...tableData.rows].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [tableData?.rows, sortColumn, sortDirection]);

  const paginatedRows = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, currentPage]);

  const totalPages = Math.ceil((tableData?.total || 0) / pageSize);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="text-red-600">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!tableData || tableData.rows.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-4">{widget.title}</h3>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">{widget.title}</h3>
        {isEditable && (
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {tableData.columns.map(column => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {sortColumn === column.key && (
                      <svg
                        className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {tableData.columns.map(column => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center">
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
              {' '}to{' '}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, tableData.total)}
              </span>
              {' '}of{' '}
              <span className="font-medium">{tableData.total}</span>
              {' '}results
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(1, currentPage - 2) + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}