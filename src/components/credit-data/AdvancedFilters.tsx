'use client';

import React, { useState, useMemo } from 'react';
import { useCreditDataStore } from '@/lib/store/creditDataStore';
import { Button } from '@/components/ui/Button';

interface FilterPreset {
  id: string;
  name: string;
  filters: {
    accountType: string[];
    status: string[];
    dateRange: { start: Date | null; end: Date | null };
    searchTerm: string;
  };
}

const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: 'open-accounts',
    name: 'Open Accounts',
    filters: {
      accountType: [],
      status: ['Open'],
      dateRange: { start: null, end: null },
      searchTerm: ''
    }
  },
  {
    id: 'credit-cards',
    name: 'Credit Cards',
    filters: {
      accountType: ['Credit Card'],
      status: [],
      dateRange: { start: null, end: null },
      searchTerm: ''
    }
  },
  {
    id: 'recent-accounts',
    name: 'Recent Accounts',
    filters: {
      accountType: [],
      status: [],
      dateRange: { 
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
        end: null 
      },
      searchTerm: ''
    }
  }
];

export const AdvancedFilters: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { filters, setFilters, creditData } = useCreditDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('creditFilterPresets');
      return saved ? JSON.parse(saved) : DEFAULT_PRESETS;
    }
    return DEFAULT_PRESETS;
  });

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    if (!creditData?.accounts) return { accountTypes: [], statuses: [] };

    const accountTypes = [...new Set(creditData.accounts.map(acc => acc.accountType))];
    const statuses = [...new Set(creditData.accounts.map(acc => acc.status))];

    return { accountTypes, statuses };
  }, [creditData]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Debounced search implementation would go here
    setTimeout(() => {
      setFilters({ searchTerm: value });
    }, 300);
  };

  const handleAccountTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked
      ? [...filters.accountType, type]
      : filters.accountType.filter(t => t !== type);
    
    setFilters({ accountType: newTypes });
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...filters.status, status]
      : filters.status.filter(s => s !== status);
    
    setFilters({ status: newStatuses });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const date = value ? new Date(value) : null;
    setFilters({
      dateRange: {
        ...filters.dateRange,
        [field]: date
      }
    });
  };

  const applyPreset = (preset: FilterPreset) => {
    setFilters(preset.filters);
    setSearchTerm(preset.filters.searchTerm);
  };

  const saveCurrentAsPreset = () => {
    const name = prompt('Enter preset name:');
    if (!name) return;

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name,
      filters: {
        ...filters,
        searchTerm
      }
    };

    const updatedPresets = [...savedPresets, newPreset];
    setSavedPresets(updatedPresets);
    localStorage.setItem('creditFilterPresets', JSON.stringify(updatedPresets));
  };

  const clearAllFilters = () => {
    setFilters({
      accountType: [],
      status: [],
      dateRange: { start: null, end: null }
    });
    setSearchTerm('');
  };

  const activeFilterCount = filters.accountType.length + filters.status.length + 
    (filters.dateRange.start ? 1 : 0) + (filters.dateRange.end ? 1 : 0) + 
    (searchTerm ? 1 : 0);

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        <div className="flex items-center space-x-2">
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {activeFilterCount} active
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Search</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search accounts, creditors..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter Presets */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Quick Filters</label>
        <div className="flex flex-wrap gap-2">
          {savedPresets.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {showAdvanced && (
        <>
          {/* Account Type Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Account Type</label>
            <div className="space-y-2">
              {filterOptions.accountTypes.map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.accountType.includes(type)}
                    onChange={(e) => handleAccountTypeChange(type, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Status</label>
            <div className="space-y-2">
              {filterOptions.statuses.map(status => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(status)}
                    onChange={(e) => handleStatusChange(status, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="secondary"
          size="sm"
          onClick={clearAllFilters}
          disabled={activeFilterCount === 0}
        >
          Clear All
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={saveCurrentAsPreset}
          disabled={activeFilterCount === 0}
        >
          Save Preset
        </Button>
      </div>
    </div>
  );
};