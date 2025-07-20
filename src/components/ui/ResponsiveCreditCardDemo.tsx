'use client'

import React, { useState } from 'react'
import { ResponsiveCreditCard, CreditCardData } from './ResponsiveCreditCard'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { cn } from '@/lib/utils'

// Sample credit card data for demonstration
const sampleCards: CreditCardData[] = [
  {
    id: '1',
    cardName: 'Chase Sapphire Preferred',
    cardNumber: '4532123456789012',
    expiryDate: '12/26',
    balance: 2850,
    creditLimit: 15000,
    availableCredit: 12150,
    interestRate: 18.99,
    minimumPayment: 85,
    lastPaymentDate: '2024-01-15',
    status: 'active',
    provider: 'Chase Bank',
    cardType: 'visa',
    isBusinessCard: false,
    rewards: {
      type: 'points',
      rate: 2,
      balance: 45620
    },
    paymentHistory: [
      { date: '2024-01-15', status: 'ontime', amount: 450 },
      { date: '2023-12-15', status: 'ontime', amount: 320 },
      { date: '2023-11-15', status: 'ontime', amount: 280 },
    ],
    confidence: 95
  },
  {
    id: '2',
    cardName: 'Capital One Venture X',
    cardNumber: '5555123456789013',
    expiryDate: '08/27',
    balance: 750,
    creditLimit: 25000,
    availableCredit: 24250,
    interestRate: 21.99,
    minimumPayment: 25,
    lastPaymentDate: '2024-01-20',
    status: 'active',
    provider: 'Capital One',
    cardType: 'mastercard',
    isBusinessCard: false,
    rewards: {
      type: 'miles',
      rate: 2,
      balance: 128500
    },
    confidence: 92
  },
  {
    id: '3',
    cardName: 'American Express Gold',
    cardNumber: '3782123456789014',
    expiryDate: '06/25',
    balance: 4200,
    creditLimit: 8000,
    availableCredit: 3800,
    interestRate: 23.99,
    minimumPayment: 125,
    lastPaymentDate: '2024-01-10',
    status: 'overlimit',
    provider: 'American Express',
    cardType: 'amex',
    isBusinessCard: false,
    rewards: {
      type: 'points',
      rate: 4,
      balance: 75300
    },
    confidence: 88
  },
  {
    id: '4',
    cardName: 'Business Platinum Card',
    cardNumber: '3782987654321015',
    expiryDate: '03/26',
    balance: 12500,
    creditLimit: 50000,
    availableCredit: 37500,
    interestRate: 19.99,
    minimumPayment: 375,
    lastPaymentDate: '2024-01-25',
    status: 'active',
    provider: 'American Express',
    cardType: 'amex',
    isBusinessCard: true,
    rewards: {
      type: 'points',
      rate: 1.5,
      balance: 156800
    },
    confidence: 97
  },
  {
    id: '5',
    cardName: 'Discover it Cash Back',
    cardNumber: '6011123456789016',
    expiryDate: '11/24',
    balance: 0,
    creditLimit: 5000,
    availableCredit: 5000,
    interestRate: 16.99,
    minimumPayment: 0,
    lastPaymentDate: '2024-01-05',
    status: 'closed',
    provider: 'Discover',
    cardType: 'discover',
    isBusinessCard: false,
    rewards: {
      type: 'cashback',
      rate: 5,
      balance: 127
    },
    confidence: 90
  }
]

export function ResponsiveCreditCardDemo() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [favoriteCards, setFavoriteCards] = useState<Set<string>>(new Set(['1', '2']))
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  const [currentVariant, setCurrentVariant] = useState<'default' | 'compact' | 'detailed'>('default')
  const [copiedCard, setCopiedCard] = useState<string | null>(null)

  const handleCardSelect = (cardId: string) => {
    setSelectedCard(selectedCard === cardId ? null : cardId)
  }

  const handleToggleFavorite = (cardId: string) => {
    const newFavorites = new Set(favoriteCards)
    if (newFavorites.has(cardId)) {
      newFavorites.delete(cardId)
    } else {
      newFavorites.add(cardId)
    }
    setFavoriteCards(newFavorites)
  }

  const handleViewDetails = (cardId: string) => {
    alert(`Viewing details for card: ${cardId}`)
  }

  const handleCopyNumber = (cardNumber: string) => {
    setCopiedCard(cardNumber)
    setTimeout(() => setCopiedCard(null), 2000)
    // In a real app, you might show a toast notification
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* Demo Controls */}
      <Card>
        <CardHeader>
          <CardTitle>ResponsiveCreditCard Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Variant:</label>
              <div className="flex gap-2">
                {(['default', 'compact', 'detailed'] as const).map((variant) => (
                  <Button
                    key={variant}
                    variant={currentVariant === variant ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentVariant(variant)}
                  >
                    {variant}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Privacy:</label>
              <Button
                variant={showSensitiveData ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowSensitiveData(!showSensitiveData)}
              >
                {showSensitiveData ? 'Hide' : 'Show'} Card Numbers
              </Button>
            </div>
          </div>

          {copiedCard && (
            <div className="p-3 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-lg text-sm">
              Card number copied to clipboard!
            </div>
          )}

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Mobile Features:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Touch-friendly 44px minimum touch targets</li>
              <li>Swipe gestures for quick actions (try swiping cards on mobile)</li>
              <li>Haptic feedback on supported devices</li>
              <li>Progressive disclosure of sensitive information</li>
              <li>Keyboard navigation support (Tab, Enter, Ctrl+C, Ctrl+V, Ctrl+F)</li>
              <li>Screen reader accessible with ARIA labels</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Card Grid */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Credit Cards</h2>
        
        <div className={cn(
          'grid gap-4',
          currentVariant === 'compact' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-1' 
            : 'grid-cols-1 lg:grid-cols-2'
        )}>
          {sampleCards.map((card) => (
            <ResponsiveCreditCard
              key={card.id}
              card={card}
              variant={currentVariant}
              showSensitiveData={showSensitiveData}
              isSelected={selectedCard === card.id}
              isFavorite={favoriteCards.has(card.id)}
              onSelect={handleCardSelect}
              onToggleFavorite={handleToggleFavorite}
              onViewDetails={handleViewDetails}
              onCopyNumber={handleCopyNumber}
              enableSwipeActions={true}
              enableHapticFeedback={true}
            />
          ))}
        </div>

        {/* Selected Card Info */}
        {selectedCard && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Selected Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Card ID: {selectedCard}</p>
              <p>Card Name: {sampleCards.find(c => c.id === selectedCard)?.cardName}</p>
              <p>
                This card is {favoriteCards.has(selectedCard) ? 'in' : 'not in'} your favorites.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Responsive Design Showcase */}
        <Card>
          <CardHeader>
            <CardTitle>Responsive Design Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Mobile First</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  Designed for mobile devices with progressive enhancement for larger screens.
                </p>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-100">Touch Optimized</h4>
                <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                  44px minimum touch targets, swipe gestures, and haptic feedback.
                </p>
              </div>
              
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-100">Accessible</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-2">
                  WCAG compliant with screen reader support and keyboard navigation.
                </p>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p><strong>Try these interactions:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Click/tap cards to select them</li>
                <li>Use the show/hide button to toggle card number visibility</li>
                <li>Click the star icon to add/remove from favorites</li>
                <li>On mobile: swipe cards left/right for quick actions</li>
                <li>Keyboard: Tab to navigate, Enter to select, Ctrl+C to copy, Ctrl+F to favorite</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ResponsiveCreditCardDemo