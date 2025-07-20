'use client';

import React, { useState } from 'react';
import { useCreditDataStore } from '@/lib/store/creditDataStore';
import { Button } from '@/components/ui/Button';
import { AccessibleModal } from '@/components/ui/AccessibleModal';

interface UserPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserPreferences: React.FC<UserPreferencesProps> = ({ isOpen, onClose }) => {
  const { preferences, updatePreferences } = useCreditDataStore();
  const [localPreferences, setLocalPreferences] = useState(preferences);

  const handleSave = () => {
    updatePreferences(localPreferences);
    onClose();
  };

  const handleReset = () => {
    const defaultPreferences = {
      showPII: false,
      theme: 'light' as const,
      defaultView: 'overview' as const,
      exportFormat: 'pdf' as const
    };
    setLocalPreferences(defaultPreferences);
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="User Preferences"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Privacy Settings */}
        <div>
          <h3 className="text-lg font-medium mb-3">Privacy Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium">Show Personal Information</span>
                <p className="text-sm text-gray-500">
                  Display unmasked personal information by default
                </p>
              </div>
              <input
                type="checkbox"
                checked={localPreferences.showPII}
                onChange={(e) => setLocalPreferences(prev => ({
                  ...prev,
                  showPII: e.target.checked
                }))}
                className="ml-4"
              />
            </label>
          </div>
        </div>

        {/* Appearance Settings */}
        <div>
          <h3 className="text-lg font-medium mb-3">Appearance</h3>
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Theme</label>
              <div className="flex space-x-4">
                {(['light', 'dark'] as const).map(theme => (
                  <label key={theme} className="flex items-center">
                    <input
                      type="radio"
                      name="theme"
                      value={theme}
                      checked={localPreferences.theme === theme}
                      onChange={(e) => setLocalPreferences(prev => ({
                        ...prev,
                        theme: e.target.value as 'light' | 'dark'
                      }))}
                      className="mr-2"
                    />
                    <span className="capitalize">{theme}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium mb-2">Default View</label>
              <div className="flex space-x-4">
                {(['overview', 'detailed'] as const).map(view => (
                  <label key={view} className="flex items-center">
                    <input
                      type="radio"
                      name="defaultView"
                      value={view}
                      checked={localPreferences.defaultView === view}
                      onChange={(e) => setLocalPreferences(prev => ({
                        ...prev,
                        defaultView: e.target.value as 'overview' | 'detailed'
                      }))}
                      className="mr-2"
                    />
                    <span className="capitalize">{view}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Export Settings */}
        <div>
          <h3 className="text-lg font-medium mb-3">Export Settings</h3>
          <div>
            <label className="block font-medium mb-2">Default Export Format</label>
            <select
              value={localPreferences.exportFormat}
              onChange={(e) => setLocalPreferences(prev => ({
                ...prev,
                exportFormat: e.target.value as 'pdf' | 'csv' | 'json'
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h3 className="text-lg font-medium mb-3">Data Management</h3>
          <div className="space-y-3">
            <Button
              variant="secondary"
              onClick={() => {
                localStorage.removeItem('creditFilterPresets');
                alert('Filter presets cleared');
              }}
              className="w-full"
            >
              Clear Saved Filter Presets
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => {
                localStorage.removeItem('credit-data-store');
                alert('All local data cleared');
              }}
              className="w-full"
            >
              Clear All Local Data
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button variant="secondary" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Preferences
            </Button>
          </div>
        </div>
      </div>
    </AccessibleModal>
  );
};

// Settings button component
export const SettingsButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [showPreferences, setShowPreferences] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setShowPreferences(true)}
        className={className}
        aria-label="Open user preferences"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </Button>
      
      <UserPreferences
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
    </>
  );
};