'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './Card'
import { Button } from './Button'
import { 
  CreditCard, 
  Eye, 
  EyeOff, 
  MoreVertical, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Star,
  StarOff
} from 'lucide-react'

// Types for the credit card component
export interface CreditCardData {
  id: string
  cardName: string
  cardNumber: string
  expiryDate?: string
  balance: number
  creditLimit: number
  availableCredit: number
  interestRate?: number
  minimumPayment?: number
  lastPaymentDate?: string
  status: 'active' | 'closed' | 'frozen' | 'overlimit'
  provider: string
  cardType: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other'
  isBusinessCard?: boolean
  rewards?: {
    type: 'cashback' | 'points' | 'miles'
    rate: number
    balance: number
  }
  paymentHistory?: Array<{
    date: string
    status: 'ontime' | 'late' | 'missed'
    amount: number
  }>
  confidence?: number
}

export interface ResponsiveCreditCardProps {
  card: CreditCardData
  variant?: 'default' | 'compact' | 'detailed'
  showSensitiveData?: boolean
  isSelected?: boolean
  isFavorite?: boolean
  className?: string
  onSelect?: (cardId: string) => void
  onToggleFavorite?: (cardId: string) => void
  onViewDetails?: (cardId: string) => void
  onCopyNumber?: (cardNumber: string) => void
  enableSwipeActions?: boolean
  enableHapticFeedback?: boolean
}

/**
 * ResponsiveCreditCard - A mobile-first, touch-optimized credit card component
 * 
 * Features:
 * - Mobile-first responsive design with progressive enhancement
 * - Touch-friendly interactions with proper touch targets (44px minimum)
 * - Accessible keyboard navigation and screen reader support
 * - Swipe gestures for mobile actions
 * - Haptic feedback on supported devices
 * - Multiple variants for different use cases
 * - Progressive disclosure of sensitive information
 * - Modern visual design with smooth animations
 */
export function ResponsiveCreditCard({
  card,
  variant = 'default',
  showSensitiveData = false,
  isSelected = false,
  isFavorite = false,
  className,
  onSelect,
  onToggleFavorite,
  onViewDetails,
  onCopyNumber,
  enableSwipeActions = true,
  enableHapticFeedback = true,
  ...props
}: ResponsiveCreditCardProps) {
  const [isRevealed, setIsRevealed] = useState(showSensitiveData)
  const [isPressed, setIsPressed] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [showActions, setShowActions] = useState(false)
  
  const cardRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const isSwiping = useRef(false)

  // Utility functions
  const maskCardNumber = (number: string): string => {
    if (!number) return '••••'
    const cleaned = number.replace(/\D/g, '')
    if (cleaned.length < 4) return '••••'
    return `••••  ••••  ••••  ${cleaned.slice(-4)}`
  }

  const formatCardNumber = (number: string): string => {
    const cleaned = number.replace(/\D/g, '')
    return cleaned.replace(/(.{4})/g, '$1  ').trim()
  }

  const getCardTypeIcon = (type: string) => {
    // For this demo, using a generic credit card icon
    // In a real app, you'd have specific brand icons
    return <CreditCard className="w-6 h-6 sm:w-8 sm:h-8" />
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'frozen':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'overlimit':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />
      case 'frozen':
        return <Clock className="w-4 h-4" />
      case 'overlimit':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return null
    }
  }

  const calculateUtilization = (): number => {
    return card.creditLimit > 0 ? (card.balance / card.creditLimit) * 100 : 0
  }

  const getUtilizationColor = (utilization: number): string => {
    if (utilization > 90) return 'text-red-600 dark:text-red-400'
    if (utilization > 70) return 'text-yellow-600 dark:text-yellow-400'
    if (utilization > 30) return 'text-orange-600 dark:text-orange-400'
    return 'text-green-600 dark:text-green-400'
  }

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback || typeof window === 'undefined') return
    
    // Check if haptic feedback is available
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [enableHapticFeedback])

  // Touch event handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeActions) return
    
    const touch = e.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    isSwiping.current = false
    setIsPressed(true)
  }, [enableSwipeActions])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeActions) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - touchStartY.current
    
    // Detect horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping.current = true
      const offset = Math.max(-100, Math.min(100, deltaX * 0.5))
      setSwipeOffset(offset)
    }
  }, [enableSwipeActions])

  const handleTouchEnd = useCallback(() => {
    if (!enableSwipeActions) return
    
    setIsPressed(false)
    
    if (isSwiping.current) {
      if (Math.abs(swipeOffset) > 50) {
        triggerHapticFeedback('medium')
        setShowActions(true)
        setSwipeOffset(0)
      } else {
        setSwipeOffset(0)
      }
    }
    
    isSwiping.current = false
  }, [enableSwipeActions, swipeOffset, triggerHapticFeedback])

  // Handle card selection
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (isSwiping.current) return
    
    e.preventDefault()
    e.stopPropagation()
    
    triggerHapticFeedback('light')
    onSelect?.(card.id)
  }, [card.id, onSelect, triggerHapticFeedback])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        triggerHapticFeedback('light')
        onSelect?.(card.id)
        break
      case 'v':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          onViewDetails?.(card.id)
        }
        break
      case 'c':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          onCopyNumber?.(card.cardNumber)
        }
        break
      case 'f':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          onToggleFavorite?.(card.id)
        }
        break
    }
  }, [card.id, card.cardNumber, onSelect, onViewDetails, onCopyNumber, onToggleFavorite, triggerHapticFeedback])

  // Toggle sensitive data visibility
  const toggleReveal = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    triggerHapticFeedback('light')
    setIsRevealed(!isRevealed)
  }, [isRevealed, triggerHapticFeedback])

  // Copy card number to clipboard
  const handleCopyNumber = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      await navigator.clipboard.writeText(card.cardNumber)
      triggerHapticFeedback('medium')
      onCopyNumber?.(card.cardNumber)
    } catch (error) {
      console.error('Failed to copy card number:', error)
    }
  }, [card.cardNumber, onCopyNumber, triggerHapticFeedback])

  const utilization = calculateUtilization()

  // Render different variants
  if (variant === 'compact') {
    return (
      <Card
        ref={cardRef}
        className={cn(
          'cursor-pointer transition-all duration-200 touch-manipulation',
          'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'min-h-[88px] sm:min-h-[72px]', // Touch-friendly height
          isSelected && 'ring-2 ring-primary shadow-lg',
          isPressed && 'scale-[0.98]',
          className
        )}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${card.cardName} credit card, balance $${card.balance.toLocaleString()}`}
        aria-pressed={isSelected}
        {...props}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                {getCardTypeIcon(card.cardType)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                    {card.cardName}
                  </h4>
                  {isFavorite && (
                    <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                  {isRevealed ? formatCardNumber(card.cardNumber) : maskCardNumber(card.cardNumber)}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                ${card.balance.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                of ${card.creditLimit.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default and detailed variants
  return (
    <Card
      ref={cardRef}
      className={cn(
        'cursor-pointer transition-all duration-200 touch-manipulation',
        'hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'min-h-[160px] sm:min-h-[140px]', // Touch-friendly height
        isSelected && 'ring-2 ring-primary shadow-lg',
        isPressed && 'scale-[0.99]',
        className
      )}
      style={{ transform: `translateX(${swipeOffset}px)` }}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${card.cardName} credit card, balance $${card.balance.toLocaleString()}, ${utilization.toFixed(1)}% utilization`}
      aria-pressed={isSelected}
      {...props}
    >
      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0 p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              {getCardTypeIcon(card.cardType)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg sm:text-xl text-gray-900 dark:text-white truncate">
                  {card.cardName}
                </h3>
                {isFavorite && (
                  <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {card.provider}
              </p>
              {card.isBusinessCard && (
                <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full">
                  Business
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status indicator */}
            <div className="flex items-center gap-1">
              {getStatusIcon(card.status)}
              <span className={cn(
                'px-2 py-1 rounded-full text-xs font-medium',
                getStatusColor(card.status)
              )}>
                {card.status}
              </span>
            </div>
            
            {/* Actions button for desktop */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                setShowActions(!showActions)
              }}
              aria-label="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Card Number */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Card Number</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={toggleReveal}
                aria-label={isRevealed ? "Hide card number" : "Show card number"}
              >
                {isRevealed ? (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Show
                  </>
                )}
              </Button>
              {isRevealed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={handleCopyNumber}
                  aria-label="Copy card number"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              )}
            </div>
          </div>
          <div className="font-mono text-lg sm:text-xl text-gray-900 dark:text-white">
            {isRevealed ? formatCardNumber(card.cardNumber) : maskCardNumber(card.cardNumber)}
          </div>
        </div>

        {/* Balance and Credit Limit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Balance</span>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              ${card.balance.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Available Credit</span>
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
              ${card.availableCredit.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Credit Utilization</span>
            <span className={cn(
              'text-sm font-semibold',
              getUtilizationColor(utilization)
            )}>
              {utilization.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className={cn(
                'h-3 rounded-full transition-all duration-500',
                utilization > 90 ? 'bg-red-500' :
                utilization > 70 ? 'bg-yellow-500' :
                utilization > 30 ? 'bg-orange-500' : 'bg-green-500'
              )}
              style={{ width: `${Math.min(utilization, 100)}%` }}
              role="progressbar"
              aria-valuenow={utilization}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Credit utilization ${utilization.toFixed(1)}%`}
            />
          </div>
        </div>

        {/* Additional Information for Detailed Variant */}
        {variant === 'detailed' && (
          <>
            {/* Minimum Payment and Interest Rate */}
            {(card.minimumPayment || card.interestRate) && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                {card.minimumPayment && (
                  <div>
                    <span className="text-xs text-gray-500">Minimum Payment</span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${card.minimumPayment.toLocaleString()}
                    </p>
                  </div>
                )}
                {card.interestRate && (
                  <div>
                    <span className="text-xs text-gray-500">Interest Rate</span>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {card.interestRate}% APR
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Rewards Information */}
            {card.rewards && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-purple-600 dark:text-purple-300 font-medium">
                      {card.rewards.type.toUpperCase()} REWARDS
                    </span>
                    <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                      {card.rewards.rate}% back
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-purple-600 dark:text-purple-300">Balance</span>
                    <p className="text-sm font-bold text-purple-900 dark:text-purple-100">
                      {card.rewards.balance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Last Payment */}
            {card.lastPaymentDate && (
              <div className="text-xs text-gray-500">
                Last payment: {new Date(card.lastPaymentDate).toLocaleDateString()}
              </div>
            )}
          </>
        )}

        {/* Mobile Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-10 touch-target"
            onClick={(e) => {
              e.stopPropagation()
              onViewDetails?.(card.id)
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Details
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-10 touch-target"
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite?.(card.id)
            }}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? (
              <Star className="w-4 h-4 text-yellow-500" />
            ) : (
              <StarOff className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Confidence Indicator */}
        {card.confidence !== undefined && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500">Data Confidence:</span>
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${card.confidence}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{card.confidence}%</span>
          </div>
        )}
      </CardContent>

      {/* Swipe Actions Overlay for Mobile */}
      {showActions && enableSwipeActions && (
        <div className="absolute inset-0 bg-black/5 backdrop-blur-sm rounded-lg flex items-center justify-center sm:hidden">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite?.(card.id)
                setShowActions(false)
              }}
            >
              {isFavorite ? <StarOff /> : <Star />}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails?.(card.id)
                setShowActions(false)
              }}
            >
              <ExternalLink />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowActions(false)}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

// Export default for convenience
export default ResponsiveCreditCard