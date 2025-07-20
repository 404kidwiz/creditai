import React from 'react';
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react';

export default function AnalysisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Credit Analysis
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Detailed insights into your credit profile and improvement recommendations
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Credit Score Analysis</h3>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-500 mb-2">Good</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your credit score shows positive trends with room for improvement
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Account Health</h3>
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-yellow-500 mb-2">85%</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Most accounts are in good standing with minor issues to address
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Improvement Potential</h3>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-500 mb-2">+45</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Estimated score improvement with our recommendations
            </p>
          </div>
        </div>

        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Analysis Dashboard Coming Soon
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Upload a credit report to see detailed analysis and personalized recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}