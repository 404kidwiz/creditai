'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Brain, 
  Shield, 
  Target,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  progressBar, 
  staggerContainer, 
  staggerItem, 
  pulse, 
  shimmer,
  scaleAnimation 
} from '@/lib/animations/variants'

export interface ProcessingStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  estimatedTime?: number // in seconds
  actualTime?: number // in seconds
  errorMessage?: string
  subSteps?: ProcessingSubStep[]
}

export interface ProcessingSubStep {
  id: string
  title: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
}

export interface ProcessingProgressProps {
  steps: ProcessingStep[]
  currentStepId?: string
  overallProgress: number
  estimatedTotalTime?: number
  elapsedTime?: number
  onStepComplete?: (stepId: string) => void
  onAllComplete?: () => void
  className?: string
  showTimeEstimates?: boolean
  showSubSteps?: boolean
  compact?: boolean
}

// Time estimation algorithms for different operations
export const OPERATION_TIME_ESTIMATES = {
  'file-upload': { base: 5, perMB: 2 },
  'ocr-extraction': { base: 15, perPage: 8 },
  'ai-analysis': { base: 20, perAccount: 3 },
  'data-processing': { base: 10, perItem: 1 },
  'validation': { base: 5, perCheck: 2 },
  'report-generation': { base: 8, perSection: 2 }
} as const

export const calculateEstimatedTime = (
  operationType: keyof typeof OPERATION_TIME_ESTIMATES,
  complexity: number = 1
): number => {
  const estimate = OPERATION_TIME_ESTIMATES[operationType]
  return estimate.base + (estimate.perMB || estimate.perPage || estimate.perAccount || estimate.perItem || estimate.perCheck || estimate.perSection || 0) * complexity
}

// Default processing steps for credit report analysis
export const DEFAULT_CREDIT_PROCESSING_STEPS: ProcessingStep[] = [
  {
    id: 'upload',
    title: 'File Upload',
    description: 'Uploading your credit report securely',
    icon: FileText,
    status: 'pending',
    progress: 0,
    estimatedTime: 8,
    subSteps: [
      { id: 'validation', title: 'File validation', status: 'pending', progress: 0 },
      { id: 'encryption', title: 'Secure encryption', status: 'pending', progress: 0 },
      { id: 'storage', title: 'Cloud storage', status: 'pending', progress: 0 }
    ]
  },
  {
    id: 'ocr',
    title: 'Text Extraction',
    description: 'Extracting text and data from your document',
    icon: Sparkles,
    status: 'pending',
    progress: 0,
    estimatedTime: 25,
    subSteps: [
      { id: 'image-processing', title: 'Image processing', status: 'pending', progress: 0 },
      { id: 'text-recognition', title: 'Text recognition', status: 'pending', progress: 0 },
      { id: 'data-structuring', title: 'Data structuring', status: 'pending', progress: 0 }
    ]
  },
  {
    id: 'ai-analysis',
    title: 'AI Analysis',
    description: 'Analyzing your credit data with advanced AI',
    icon: Brain,
    status: 'pending',
    progress: 0,
    estimatedTime: 35,
    subSteps: [
      { id: 'account-parsing', title: 'Account parsing', status: 'pending', progress: 0 },
      { id: 'score-analysis', title: 'Score analysis', status: 'pending', progress: 0 },
      { id: 'negative-item-detection', title: 'Issue detection', status: 'pending', progress: 0 },
      { id: 'recommendation-generation', title: 'Recommendations', status: 'pending', progress: 0 }
    ]
  },
  {
    id: 'validation',
    title: 'Data Validation',
    description: 'Ensuring accuracy and completeness',
    icon: Shield,
    status: 'pending',
    progress: 0,
    estimatedTime: 12,
    subSteps: [
      { id: 'consistency-check', title: 'Consistency check', status: 'pending', progress: 0 },
      { id: 'accuracy-verification', title: 'Accuracy verification', status: 'pending', progress: 0 }
    ]
  },
  {
    id: 'insights',
    title: 'Generating Insights',
    description: 'Creating personalized recommendations',
    icon: Target,
    status: 'pending',
    progress: 0,
    estimatedTime: 15,
    subSteps: [
      { id: 'impact-analysis', title: 'Impact analysis', status: 'pending', progress: 0 },
      { id: 'strategy-creation', title: 'Strategy creation', status: 'pending', progress: 0 },
      { id: 'priority-ranking', title: 'Priority ranking', status: 'pending', progress: 0 }
    ]
  }
]

export function ProcessingProgress({
  steps,
  currentStepId,
  overallProgress,
  estimatedTotalTime,
  elapsedTime,
  onStepComplete,
  onAllComplete,
  className,
  showTimeEstimates = true,
  showSubSteps = true,
  compact = false
}: ProcessingProgressProps) {
  const [animationKey, setAnimationKey] = useState(0)

  // Calculate remaining time
  const remainingTime = React.useMemo(() => {
    if (!estimatedTotalTime || !elapsedTime) return null
    const remaining = Math.max(0, estimatedTotalTime - elapsedTime)
    return remaining
  }, [estimatedTotalTime, elapsedTime])

  // Format time display
  const formatTime = useCallback((seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }, [])

  // Get status color
  const getStatusColor = useCallback((status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400'
      case 'processing': return 'text-blue-600 dark:text-blue-400'
      case 'error': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-400 dark:text-gray-500'
    }
  }, [])

  // Get status background
  const getStatusBg = useCallback((status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'processing': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'error': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      default: return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
    }
  }, [])

  // Update animation key when steps change
  useEffect(() => {
    setAnimationKey(prev => prev + 1)
  }, [currentStepId, steps])

  // Check if all steps are complete
  useEffect(() => {
    const allComplete = steps.every(step => step.status === 'completed')
    if (allComplete && onAllComplete) {
      onAllComplete()
    }
  }, [steps, onAllComplete])

  if (compact) {
    return (
      <motion.div
        key={animationKey}
        variants={fadeIn}
        initial="initial"
        animate="animate"
        className={cn("space-y-4", className)}
      >
        {/* Compact Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Processing Credit Report
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(overallProgress)}%
            </span>
          </div>
          
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
              variants={progressBar}
              initial="initial"
              animate="animate"
              custom={overallProgress}
            />
          </div>
          
          {showTimeEstimates && remainingTime && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              ~{formatTime(remainingTime)} remaining
            </div>
          )}
        </div>

        {/* Current Step Indicator */}
        {currentStepId && (
          <motion.div
            variants={scaleAnimation}
            initial="initial"
            animate="animate"
            className="flex items-center space-x-2 text-sm"
          >
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-gray-700 dark:text-gray-300">
              {steps.find(s => s.id === currentStepId)?.title || 'Processing...'}
            </span>
          </motion.div>
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      key={animationKey}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn("space-y-6", className)}
    >
      {/* Overall Progress Header */}
      <motion.div variants={staggerItem} className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Processing Your Credit Report
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Analyzing your credit data with advanced AI technology
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(overallProgress)}%
            </div>
            {showTimeEstimates && remainingTime && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {formatTime(remainingTime)} left
              </div>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 rounded-full"
            variants={progressBar}
            initial="initial"
            animate="animate"
            custom={overallProgress}
          />
          
          {/* Shimmer effect for active progress */}
          {overallProgress > 0 && overallProgress < 100 && (
            <motion.div
              className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
              variants={shimmer}
              initial="initial"
              animate="animate"
              style={{
                backgroundSize: '200% 100%'
              }}
            />
          )}
        </div>
      </motion.div>

      {/* Processing Steps */}
      <motion.div variants={staggerItem} className="space-y-4">
        {steps.map((step, index) => (
          <ProcessingStepItem
            key={step.id}
            step={step}
            index={index}
            isActive={step.id === currentStepId}
            showTimeEstimates={showTimeEstimates}
            showSubSteps={showSubSteps}
            onComplete={() => onStepComplete?.(step.id)}
          />
        ))}
      </motion.div>

      {/* Processing Statistics */}
      {showTimeEstimates && (
        <motion.div 
          variants={staggerItem}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {steps.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Steps Complete
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {steps.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Steps
            </div>
          </div>
          
          {elapsedTime && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Elapsed Time
              </div>
            </div>
          )}
          
          {estimatedTotalTime && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatTime(estimatedTotalTime)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Est. Total
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

interface ProcessingStepItemProps {
  step: ProcessingStep
  index: number
  isActive: boolean
  showTimeEstimates: boolean
  showSubSteps: boolean
  onComplete?: () => void
}

function ProcessingStepItem({
  step,
  index,
  isActive,
  showTimeEstimates,
  showSubSteps,
  onComplete
}: ProcessingStepItemProps) {
  const Icon = step.icon

  // Get step status icon
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  // Format time display
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <motion.div
      variants={staggerItem}
      className={cn(
        "relative p-4 rounded-lg border transition-all duration-300",
        isActive ? 'ring-2 ring-blue-500 ring-opacity-50' : '',
        step.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
        step.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
        step.status === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
        'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
      )}
    >
      {/* Step Header */}
      <div className="flex items-start space-x-4">
        {/* Step Number & Status */}
        <div className="flex-shrink-0 flex items-center space-x-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
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
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <Icon className={cn(
                "w-5 h-5",
                step.status === 'completed' ? 'text-green-600' :
                step.status === 'processing' ? 'text-blue-600' :
                step.status === 'error' ? 'text-red-600' :
                'text-gray-400'
              )} />
              
              <h4 className={cn(
                "text-sm font-medium",
                step.status === 'completed' ? 'text-green-900 dark:text-green-100' :
                step.status === 'processing' ? 'text-blue-900 dark:text-blue-100' :
                step.status === 'error' ? 'text-red-900 dark:text-red-100' :
                'text-gray-700 dark:text-gray-300'
              )}>
                {step.title}
              </h4>
            </div>

            {/* Time Estimates */}
            {showTimeEstimates && (
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                {step.status === 'processing' && step.estimatedTime && (
                  <span>~{formatTime(step.estimatedTime)}</span>
                )}
                {step.actualTime && (
                  <span className="text-green-600 dark:text-green-400">
                    {formatTime(step.actualTime)}
                  </span>
                )}
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {step.description}
          </p>

          {/* Step Progress Bar */}
          {step.status === 'processing' && step.progress > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Progress
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round(step.progress)}%
                </span>
              </div>
              
              <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                  variants={progressBar}
                  initial="initial"
                  animate="animate"
                  custom={step.progress}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {step.status === 'error' && step.errorMessage && (
            <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
              {step.errorMessage}
            </div>
          )}

          {/* Sub Steps */}
          {showSubSteps && step.subSteps && step.subSteps.length > 0 && (
            <div className="mt-3 space-y-2">
              {step.subSteps.map((subStep) => (
                <div key={subStep.id} className="flex items-center space-x-2 text-xs">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    subStep.status === 'completed' ? 'bg-green-500' :
                    subStep.status === 'processing' ? 'bg-blue-500' :
                    subStep.status === 'error' ? 'bg-red-500' :
                    'bg-gray-300'
                  )} />
                  
                  <span className={cn(
                    subStep.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                    subStep.status === 'processing' ? 'text-blue-600 dark:text-blue-400' :
                    subStep.status === 'error' ? 'text-red-600 dark:text-red-400' :
                    'text-gray-500 dark:text-gray-400'
                  )}>
                    {subStep.title}
                  </span>
                  
                  {subStep.status === 'processing' && subStep.progress > 0 && (
                    <span className="text-gray-400">
                      ({Math.round(subStep.progress)}%)
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Step Pulse Animation */}
      {isActive && step.status === 'processing' && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-blue-500 opacity-25"
          variants={pulse}
          initial="initial"
          animate="animate"
        />
      )}
    </motion.div>
  )
}

// Import fadeIn variant
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
}

export default ProcessingProgress