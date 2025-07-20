'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Smartphone, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Brain,
  FileText,
  Shield,
  Sparkles,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProcessingStep } from './ProcessingProgress'

// Mobile-optimized processing progress
export interface MobileProcessingProgressProps {
  steps: ProcessingStep[]
  currentStepId?: string
  overallProgress: number
  estimatedTotalTime?: number
  elapsedTime?: number
  compact?: boolean
  collapsible?: boolean
  className?: string
}

export function MobileProcessingProgress({
  steps,
  currentStepId,
  overallProgress,
  estimatedTotalTime,
  elapsedTime,
  compact = false,
  collapsible = true,
  className
}: MobileProcessingProgressProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsible)
  const [currentStep, setCurrentStep] = useState<ProcessingStep | undefined>()

  useEffect(() => {
    const step = steps.find(s => s.id === currentStepId)
    setCurrentStep(step)
  }, [currentStepId, steps])

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  const remainingTime = estimatedTotalTime && elapsedTime 
    ? Math.max(0, estimatedTotalTime - elapsedTime)
    : null

  const completedSteps = steps.filter(s => s.status === 'completed').length

  if (compact) {
    return (
      <motion.div
        className={cn("bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700", className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Current Step */}
        {currentStep && (
          <div className="flex items-center space-x-3 mb-4">
            <div className="relative">
              <currentStep.icon className="w-6 h-6 text-blue-500" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-blue-500 opacity-25"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {currentStep.title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {currentStep.description}
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {Math.round(overallProgress)}% Complete
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {completedSteps}/{steps.length}
            </span>
          </div>
          
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          {remainingTime && (
            <div className="text-xs text-center text-gray-500 dark:text-gray-400">
              ~{formatTime(remainingTime)} remaining
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={cn("bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Processing Credit Report
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {completedSteps} of {steps.length} steps complete
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(overallProgress)}%
            </div>
            {remainingTime && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(remainingTime)} left
              </div>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-3">
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Collapsible Toggle */}
        {collapsible && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center w-full mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <span className="mr-1">
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Detailed Steps */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {steps.map((step, index) => (
                <MobileStepItem
                  key={step.id}
                  step={step}
                  index={index}
                  isActive={step.id === currentStepId}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Mobile-optimized step item
function MobileStepItem({
  step,
  index,
  isActive
}: {
  step: ProcessingStep
  index: number
  isActive: boolean
}) {
  const Icon = step.icon

  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600" />
    }
  }

  const getStatusBg = () => {
    switch (step.status) {
      case 'completed': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'processing': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'error': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      default: return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
    }
  }

  return (
    <motion.div
      className={cn(
        "flex items-start space-x-3 p-3 rounded-lg border transition-all duration-300",
        isActive && 'ring-1 ring-blue-500 ring-opacity-50',
        getStatusBg()
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      {/* Step Number & Status */}
      <div className="flex-shrink-0 flex items-center space-x-2">
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
          step.status === 'completed' ? 'bg-green-500 text-white' :
          step.status === 'processing' ? 'bg-blue-500 text-white' :
          step.status === 'error' ? 'bg-red-500 text-white' :
          'bg-gray-300 text-gray-600'
        )}>
          {index + 1}
        </div>
        {getStatusIcon()}
      </div>

      {/* Step Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <Icon className={cn(
            "w-4 h-4 flex-shrink-0",
            step.status === 'completed' ? 'text-green-600' :
            step.status === 'processing' ? 'text-blue-600' :
            step.status === 'error' ? 'text-red-600' :
            'text-gray-400'
          )} />
          
          <h5 className={cn(
            "text-sm font-medium truncate",
            step.status === 'completed' ? 'text-green-900 dark:text-green-100' :
            step.status === 'processing' ? 'text-blue-900 dark:text-blue-100' :
            step.status === 'error' ? 'text-red-900 dark:text-red-100' :
            'text-gray-700 dark:text-gray-300'
          )}>
            {step.title}
          </h5>
        </div>

        {/* Progress for active step */}
        {step.status === 'processing' && step.progress > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(step.progress)}%
              </span>
              {step.estimatedTime && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ~{Math.round(step.estimatedTime)}s
                </span>
              )}
            </div>
            
            <div className="relative h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${step.progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {step.status === 'error' && step.errorMessage && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {step.errorMessage}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// Mobile Pull-to-Refresh Component
export function MobilePullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  className
}: {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
  className?: string
}) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY > 0) return

    const currentY = e.touches[0].clientY
    const distance = Math.max(0, currentY - startY.current)
    
    if (distance > 10) {
      setIsPulling(true)
      setPullDistance(Math.min(distance, threshold * 1.5))
      e.preventDefault()
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    
    setIsPulling(false)
    setPullDistance(0)
  }

  const pullProgress = Math.min(pullDistance / threshold, 1)

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 bg-gray-50 dark:bg-gray-800"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            style={{ transform: `translateY(${pullDistance - threshold}px)` }}
          >
            {isRefreshing ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Refreshing...
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <motion.div
                  animate={{ rotate: pullProgress * 180 }}
                  className="text-blue-500"
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        style={{ 
          transform: isPulling ? `translateY(${pullDistance}px)` : 'translateY(0px)' 
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// Mobile Bottom Sheet for detailed progress
export function MobileProgressBottomSheet({
  isOpen,
  onClose,
  steps,
  currentStepId,
  overallProgress
}: {
  isOpen: boolean
  onClose: () => void
  steps: ProcessingStep[]
  currentStepId?: string
  overallProgress: number
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-xl shadow-xl z-50 max-h-[80vh] overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Content */}
            <div className="px-4 pb-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Processing Details
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <MobileProcessingProgress
                steps={steps}
                currentStepId={currentStepId}
                overallProgress={overallProgress}
                collapsible={false}
                className="border-0 shadow-none"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default {
  MobileProcessingProgress,
  MobilePullToRefresh,
  MobileProgressBottomSheet
}