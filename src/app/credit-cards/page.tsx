'use client'

import React from 'react'
import { ResponsiveCreditCardDemo } from '@/components/ui/ResponsiveCreditCardDemo'

export default function CreditCardsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mobile-container mobile-section">
        <div className="mobile-spacing-lg">
          <header className="text-center space-y-4 pb-8">
            <h1 className="mobile-title text-gray-900 dark:text-white">
              Credit Cards
            </h1>
            <p className="mobile-body text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Mobile-first responsive credit card components with touch optimization, 
              progressive enhancement, and comprehensive accessibility features.
            </p>
          </header>
          
          <ResponsiveCreditCardDemo />
        </div>
      </div>
    </div>
  )
}