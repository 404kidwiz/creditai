'use client'

import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { PricingPlans } from '@/components/billing/PricingPlans'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PricingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          {user && (
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="mb-8 inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          )}
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Credit Repair Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Start your journey to better credit with AI-powered analysis, professional dispute letters, 
            and comprehensive tracking tools. All plans include a 7-day free trial.
          </p>
        </div>

        {/* Pricing Plans */}
        <PricingPlans />

        {/* Trust Indicators */}
        <div className="mt-24 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">
            Trusted by Credit Repair Professionals
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-center max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">10,000+</div>
              <div className="text-sm text-gray-600">Users Helped</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">98%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">150+</div>
              <div className="text-sm text-gray-600">Points Average Increase</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600">24/7</div>
              <div className="text-sm text-gray-600">Support</div>
            </div>
          </div>
        </div>

        {/* Security & Compliance */}
        <div className="mt-16 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
            🔒 Your Data is Safe & Secure
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Bank-Level Encryption</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All data is encrypted using 256-bit SSL encryption
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">FCRA Compliant</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All dispute letters follow Fair Credit Reporting Act guidelines
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Privacy Focused</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We never share your personal information with third parties
              </p>
            </div>
          </div>
        </div>

        {/* Money Back Guarantee */}
        <div className="mt-12 text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
            💰 30-Day Money Back Guarantee
          </h3>
          <p className="text-green-700 dark:text-green-300">
            Not satisfied? Get a full refund within 30 days, no questions asked.
          </p>
        </div>
      </div>
    </div>
  )
}