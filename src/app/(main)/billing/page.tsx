import React from 'react';
import { CreditCard, Crown, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <CreditCard className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Billing & Subscription
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your subscription and billing information
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Plan */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
              <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="w-6 h-6 text-yellow-500" />
                  <div>
                    <h3 className="font-semibold">Pro Plan</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      All features included
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">$29.99</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">per month</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Billing History</h2>
              <div className="space-y-3">
                {[
                  { date: 'Dec 1, 2024', amount: '$29.99', status: 'Paid' },
                  { date: 'Nov 1, 2024', amount: '$29.99', status: 'Paid' },
                  { date: 'Oct 1, 2024', amount: '$29.99', status: 'Paid' },
                ].map((invoice, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium">{invoice.date}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Pro Plan</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{invoice.amount}</div>
                      <div className="text-sm text-green-600">{invoice.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Plan Features */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Pro Plan Features</h3>
              <div className="space-y-3">
                {[
                  'Unlimited credit report uploads',
                  'AI-powered analysis',
                  'Automated dispute letters',
                  'Credit score monitoring',
                  'Priority support',
                  'Advanced analytics',
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Manage Subscription</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full">
                  Update Payment Method
                </Button>
                <Button variant="outline" className="w-full">
                  Change Plan
                </Button>
                <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                  Cancel Subscription
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}