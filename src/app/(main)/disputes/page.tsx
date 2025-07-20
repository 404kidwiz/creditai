import React from 'react';
import { FileText, Plus, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DisputesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <FileText className="w-8 h-8 text-purple-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Dispute Letters
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Generate and manage your credit dispute letters
                </p>
              </div>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Dispute
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Active Disputes</h3>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-500 mb-2">3</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Currently in progress with credit bureaus
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Resolved</h3>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-500 mb-2">7</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Successfully resolved disputes
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Success Rate</h3>
              <FileText className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-purple-500 mb-2">70%</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Average dispute success rate
            </p>
          </div>
        </div>

        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Dispute Management Coming Soon
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              AI-powered dispute letter generation and tracking system will be available soon.
            </p>
            <Button variant="outline" className="flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              Create Your First Dispute
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}