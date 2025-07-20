'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, 
  Brain, 
  Shield, 
  Sparkles, 
  TrendingUp,
  FileText,
  CreditCard,
  Target,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  skeleton, 
  shimmer, 
  pulse, 
  fadeIn, 
  staggerContainer, 
  staggerItem,
  bounce
} from '@/lib/animations/variants'

export interface LoadingState {
  type: 'spinner' | 'skeleton' | 'shimmer' | 'progress' | 'dots' | 'pulse'
  message?: string
  submessage?: string
  progress?: number
  showIcon?: boolean
  icon?: React.ComponentType<{ className?: string }>
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  duration?: number
}

export interface EnhancedLoadingProps extends LoadingState {
  className?: string
  children?: React.ReactNode
  overlay?: boolean
  fullScreen?: boolean
  timeout?: number
  onTimeout?: () => void
}

// Loading messages for different contexts
export const LOADING_MESSAGES = {
  upload: [
    "Uploading your credit report securely...",
    "Encrypting sensitive data...",
    "Storing in secure cloud storage..."
  ],
  ocr: [
    "Extracting text from your document...",
    "Recognizing credit data patterns...",
    "Processing financial information..."
  ],
  analysis: [
    "Analyzing your credit profile...",
    "Identifying improvement opportunities...",
    "Calculating credit score impact...",
    "Generating personalized recommendations..."
  ],
  validation: [
    "Validating extracted data...",
    "Cross-checking information...",
    "Ensuring accuracy..."
  ],
  insights: [
    "Creating actionable insights...",
    "Prioritizing recommendations...",
    "Preparing your report..."
  ]
}

// Enhanced Loading Spinner with multiple variants
export function EnhancedSpinner({ 
  size = 'md', 
  color = 'blue',
  className 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red'
  className?: string 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const colorClasses = {
    blue: 'border-blue-500',
    purple: 'border-purple-500',
    green: 'border-green-500',
    orange: 'border-orange-500',
    red: 'border-red-500'
  }

  return (
    <motion.div
      className={cn(
        'animate-spin rounded-full border-2 border-muted border-t-current',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      variants={pulse}
      initial="initial"
      animate="animate"
    />
  )
}

// Enhanced Skeleton with shimmer effect
export function EnhancedSkeleton({ 
  className,
  lines = 1,
  variant = 'text',
  animated = true 
}: { 
  className?: string
  lines?: number
  variant?: 'text' | 'card' | 'circle' | 'button' | 'image'
  animated?: boolean
}) {
  const baseClasses = "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700"
  
  const variantClasses = {
    text: 'h-4 rounded',
    card: 'h-32 rounded-lg',
    circle: 'w-12 h-12 rounded-full',
    button: 'h-10 rounded-md',
    image: 'h-48 rounded-lg'
  }

  if (variant === 'text' && lines > 1) {
    return (
      <motion.div 
        className="space-y-2"
        variants={animated ? staggerContainer : undefined}
        initial={animated ? "hidden" : undefined}
        animate={animated ? "visible" : undefined}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              baseClasses,
              variantClasses[variant],
              i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
              className
            )}
            variants={animated ? skeleton : undefined}
            style={animated ? {
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite ease-in-out'
            } : undefined}
          />
        ))}
      </motion.div>
    )
  }

  return (
    <motion.div
      className={cn(baseClasses, variantClasses[variant], className)}
      variants={animated ? skeleton : undefined}
      initial={animated ? "initial" : undefined}
      animate={animated ? "animate" : undefined}
      style={animated ? {
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite ease-in-out'
      } : undefined}
    />
  )
}

// Animated Loading Dots
export function LoadingDots({ 
  color = 'blue', 
  size = 'md',
  className 
}: { 
  color?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string 
}) {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  }

  const colorClass = `bg-${color}-500`

  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn("rounded-full", sizeClasses[size], colorClass)}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}

// Contextual Loading with rotating messages
export function ContextualLoading({
  context,
  progress,
  className
}: {
  context: keyof typeof LOADING_MESSAGES
  progress?: number
  className?: string
}) {
  const [messageIndex, setMessageIndex] = useState(0)
  const messages = LOADING_MESSAGES[context]

  useEffect(() => {
    if (messages.length <= 1) return

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [messages.length])

  const getContextIcon = () => {
    switch (context) {
      case 'upload': return FileText
      case 'ocr': return Sparkles
      case 'analysis': return Brain
      case 'validation': return Shield
      case 'insights': return Target
      default: return Loader2
    }
  }

  const Icon = getContextIcon()

  return (
    <motion.div
      className={cn("space-y-4", className)}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Icon */}
      <motion.div 
        className="flex justify-center"
        variants={staggerItem}
      >
        <div className="relative">
          <Icon className="w-12 h-12 text-blue-500" />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-blue-500 opacity-25"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Message */}
      <motion.div variants={staggerItem} className="text-center space-y-2">
        <AnimatePresence mode="wait">
          <motion.h3
            key={messageIndex}
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {messages[messageIndex]}
          </motion.h3>
        </AnimatePresence>

        {/* Progress */}
        {progress !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// Credit Report Skeleton
export function CreditReportSkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("space-y-6", className)}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <EnhancedSkeleton variant="text" className="h-8 w-64" />
            <EnhancedSkeleton variant="text" className="h-4 w-48" />
          </div>
          <EnhancedSkeleton variant="circle" />
        </div>
      </motion.div>

      {/* Credit Scores */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              <EnhancedSkeleton variant="text" className="h-4 w-20" />
              <EnhancedSkeleton variant="text" className="h-8 w-16" />
              <EnhancedSkeleton variant="text" className="h-3 w-24" />
            </div>
          </div>
        ))}
      </motion.div>

      {/* Accounts Section */}
      <motion.div variants={staggerItem} className="space-y-4">
        <div className="flex items-center justify-between">
          <EnhancedSkeleton variant="text" className="h-6 w-32" />
          <EnhancedSkeleton variant="button" className="w-24" />
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <EnhancedSkeleton variant="circle" className="w-10 h-10" />
                <div className="flex-1 space-y-2">
                  <EnhancedSkeleton variant="text" className="h-4 w-48" />
                  <EnhancedSkeleton variant="text" className="h-3 w-32" />
                </div>
                <div className="space-y-2">
                  <EnhancedSkeleton variant="text" className="h-4 w-20" />
                  <EnhancedSkeleton variant="text" className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recommendations */}
      <motion.div variants={staggerItem} className="space-y-4">
        <EnhancedSkeleton variant="text" className="h-6 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <EnhancedSkeleton variant="circle" className="w-6 h-6" />
                  <EnhancedSkeleton variant="text" className="h-4 w-32" />
                </div>
                <EnhancedSkeleton lines={2} />
                <EnhancedSkeleton variant="button" className="w-full" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Dashboard Skeleton (enhanced version)
export function EnhancedDashboardSkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("space-y-6", className)}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="space-y-2">
          <EnhancedSkeleton variant="text" className="h-8 w-48" />
          <EnhancedSkeleton variant="text" className="h-4 w-32" />
        </div>
        <div className="flex space-x-2">
          <EnhancedSkeleton variant="button" className="w-20" />
          <EnhancedSkeleton variant="button" className="w-20" />
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            variants={staggerItem}
          >
            <div className="flex items-center space-x-4">
              <EnhancedSkeleton variant="circle" className="w-12 h-12" />
              <div className="space-y-2">
                <EnhancedSkeleton variant="text" className="h-4 w-24" />
                <EnhancedSkeleton variant="text" className="h-6 w-16" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              <EnhancedSkeleton variant="text" className="h-6 w-32" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                  <EnhancedSkeleton variant="circle" className="w-10 h-10" />
                  <div className="flex-1 space-y-2">
                    <EnhancedSkeleton variant="text" className="h-4 w-48" />
                    <EnhancedSkeleton variant="text" className="h-3 w-32" />
                  </div>
                  <EnhancedSkeleton variant="text" className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <EnhancedSkeleton variant="text" className="h-6 w-24 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <EnhancedSkeleton variant="circle" className="w-2 h-2 mt-2" />
                  <EnhancedSkeleton variant="text" className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Main Enhanced Loading Component
export function EnhancedLoading({
  type = 'spinner',
  message,
  submessage,
  progress,
  showIcon = true,
  icon: CustomIcon,
  color = 'blue',
  size = 'md',
  className,
  children,
  overlay = false,
  fullScreen = false,
  timeout,
  onTimeout
}: EnhancedLoadingProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false)

  useEffect(() => {
    if (timeout && onTimeout) {
      const timer = setTimeout(() => {
        setHasTimedOut(true)
        onTimeout()
      }, timeout)
      return () => clearTimeout(timer)
    }
  }, [timeout, onTimeout])

  const Icon = CustomIcon || Loader2

  const renderLoadingContent = () => {
    switch (type) {
      case 'skeleton':
        return <EnhancedSkeleton className={className} />
      
      case 'shimmer':
        return (
          <motion.div
            className={cn("h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded", className)}
            variants={shimmer}
            initial="initial"
            animate="animate"
          />
        )
      
      case 'progress':
        return (
          <div className="w-full space-y-2">
            {message && (
              <div className="flex items-center justify-between text-sm">
                <span>{message}</span>
                {progress !== undefined && <span>{Math.round(progress)}%</span>}
              </div>
            )}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-${color}-500 rounded-full`}
                initial={{ width: '0%' }}
                animate={{ width: `${progress || 0}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )
      
      case 'dots':
        return (
          <div className="flex flex-col items-center space-y-4">
            <LoadingDots color={color} size={size} />
            {message && <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>}
          </div>
        )
      
      case 'pulse':
        return (
          <motion.div
            className={cn("flex items-center space-x-3", className)}
            variants={pulse}
            initial="initial"
            animate="animate"
          >
            {showIcon && <Icon className={`w-6 h-6 text-${color}-500`} />}
            {message && <span className="text-gray-700 dark:text-gray-300">{message}</span>}
          </motion.div>
        )
      
      default: // spinner
        return (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              {showIcon && <Icon className={`w-8 h-8 text-${color}-500`} />}
              <EnhancedSpinner size={size} color={color} />
            </div>
            {message && (
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{message}</p>
                {submessage && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{submessage}</p>
                )}
              </div>
            )}
          </div>
        )
    }
  }

  const loadingContent = (
    <motion.div
      className={cn(
        "flex items-center justify-center",
        fullScreen && "min-h-screen",
        !fullScreen && "min-h-[200px]",
        className
      )}
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      <div className="text-center space-y-4">
        {renderLoadingContent()}
        {children}
      </div>
    </motion.div>
  )

  if (overlay) {
    return (
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
        variants={fadeIn}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          {loadingContent}
        </div>
      </motion.div>
    )
  }

  return loadingContent
}

export default EnhancedLoading