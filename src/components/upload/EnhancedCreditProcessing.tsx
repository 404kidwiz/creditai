'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Brain, 
  Shield, 
  Sparkles, 
  Target,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap
} from 'lucide-react'
import { ProcessingProgress, DEFAULT_CREDIT_PROCESSING_STEPS, calculateEstimatedTime } from '../ui/ProcessingProgress'
import { ContextualLoading, LOADING_MESSAGES } from '../ui/EnhancedLoading'
import { MobileProcessingProgress } from '../ui/MobileLoading'
import { useResponsive } from '@/hooks/useResponsive'
import { cn } from '@/lib/utils'

export interface CreditProcessingState {
  phase: 'upload' | 'ocr' | 'analysis' | 'validation' | 'insights' | 'complete'
  progress: number
  currentStep?: string
  estimatedTime?: number
  elapsedTime?: number
  fileSize?: number
  complexity?: number
  error?: string
  metadata?: {
    fileName?: string
    fileType?: string
    pageCount?: number
    accountCount?: number
    issueCount?: number
  }
}

export interface EnhancedCreditProcessingProps {
  state: CreditProcessingState
  onComplete?: (result: any) => void
  onError?: (error: string) => void
  compact?: boolean
  showTimeEstimates?: boolean
  showSubSteps?: boolean
  className?: string
}

export function EnhancedCreditProcessing({
  state,
  onComplete,
  onError,
  compact = false,
  showTimeEstimates = true,
  showSubSteps = true,
  className
}: EnhancedCreditProcessingProps) {
  const [steps, setSteps] = useState(DEFAULT_CREDIT_PROCESSING_STEPS)
  const [processingStats, setProcessingStats] = useState({
    startTime: Date.now(),
    estimatedTotal: 0,
    complexity: 1
  })
  const { isMobile } = useResponsive()

  // Update steps based on current state
  useEffect(() => {
    const updatedSteps = steps.map(step => {
      const isCurrentPhase = step.id === state.phase
      const hasPassedPhase = getPhaseOrder(step.id) < getPhaseOrder(state.phase)
      
      return {
        ...step,
        status: hasPassedPhase ? 'completed' as const :
                isCurrentPhase ? 'processing' as const :
                step.status === 'error' ? 'error' as const :
                'pending' as const,
        progress: isCurrentPhase ? state.progress : hasPassedPhase ? 100 : 0,
        actualTime: hasPassedPhase ? calculateStepTime(step.id) : undefined,
        errorMessage: step.id === state.phase ? state.error : undefined
      }
    })

    setSteps(updatedSteps)
  }, [state, steps])

  // Calculate estimated times based on file complexity
  useEffect(() => {
    if (state.fileSize && state.metadata) {
      const complexity = calculateComplexity(state.fileSize, state.metadata)
      const estimatedTotal = calculateTotalEstimatedTime(complexity)
      
      setProcessingStats(prev => ({
        ...prev,
        complexity,
        estimatedTotal
      }))

      // Update step estimates
      const updatedSteps = steps.map(step => ({
        ...step,
        estimatedTime: calculateEstimatedTime(
          step.id as keyof typeof import('../ui/ProcessingProgress').OPERATION_TIME_ESTIMATES,
          complexity
        )
      }))
      
      setSteps(updatedSteps)
    }
  }, [state.fileSize, state.metadata])

  // Handle completion
  useEffect(() => {
    if (state.phase === 'complete' && onComplete) {
      onComplete({
        totalTime: Date.now() - processingStats.startTime,
        complexity: processingStats.complexity,
        steps: steps
      })
    }
  }, [state.phase, onComplete, processingStats, steps])

  // Handle errors
  useEffect(() => {
    if (state.error && onError) {
      onError(state.error)
    }
  }, [state.error, onError])

  const getPhaseOrder = (phase: string): number => {
    const phaseOrder = { upload: 0, ocr: 1, analysis: 2, validation: 3, insights: 4, complete: 5 }
    return phaseOrder[phase as keyof typeof phaseOrder] ?? 0
  }

  const calculateStepTime = (stepId: string): number => {
    // Simplified calculation - in real app, track actual times
    return Math.random() * 10 + 5
  }

  const calculateComplexity = (fileSize: number, metadata: any): number => {
    let complexity = 1
    
    // File size factor (MB)
    const fileSizeMB = fileSize / (1024 * 1024)
    complexity += Math.min(fileSizeMB / 5, 2)
    
    // Page count factor
    if (metadata.pageCount) {
      complexity += Math.min(metadata.pageCount / 3, 1.5)
    }
    
    // Account count factor
    if (metadata.accountCount) {
      complexity += Math.min(metadata.accountCount / 10, 1)
    }
    
    return Math.round(complexity * 10) / 10
  }

  const calculateTotalEstimatedTime = (complexity: number): number => {
    const baseTime = 65 // Base processing time in seconds
    return Math.round(baseTime * complexity)
  }

  const elapsedTime = (Date.now() - processingStats.startTime) / 1000

  if (isMobile && !compact) {
    return (
      <MobileProcessingProgress
        steps={steps}
        currentStepId={state.phase}
        overallProgress={state.progress}
        estimatedTotalTime={processingStats.estimatedTotal}
        elapsedTime={elapsedTime}
        className={className}
      />
    )
  }

  if (compact) {
    return (
      <motion.div
        className={cn("space-y-4", className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ContextualLoading
          context={state.phase as keyof typeof LOADING_MESSAGES}
          progress={state.progress}
        />
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {steps.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Completed
            </div>
          </div>
          
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {Math.round(state.progress)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Progress
            </div>
          </div>
          
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {processingStats.estimatedTotal ? 
                `${Math.max(0, Math.round(processingStats.estimatedTotal - elapsedTime))}s` : 
                '--'
              }
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Remaining
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* File Information */}
      {state.metadata && (
        <motion.div
          className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center space-x-3 mb-3">
            <FileText className="w-5 h-5 text-blue-500" />
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              Processing: {state.metadata.fileName || 'Credit Report'}
            </h4>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {state.metadata.fileType && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                  {state.metadata.fileType.toUpperCase()}
                </span>
              </div>
            )}
            
            {state.fileSize && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Size:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                  {(state.fileSize / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
            )}
            
            {state.metadata.pageCount && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Pages:</span>
                <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                  {state.metadata.pageCount}
                </span>
              </div>
            )}
            
            <div>
              <span className="text-gray-500 dark:text-gray-400">Complexity:</span>
              <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                {getComplexityLabel(processingStats.complexity)}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Processing Progress */}
      <ProcessingProgress
        steps={steps}
        currentStepId={state.phase}
        overallProgress={state.progress}
        estimatedTotalTime={processingStats.estimatedTotal}
        elapsedTime={elapsedTime}
        showTimeEstimates={showTimeEstimates}
        showSubSteps={showSubSteps}
        onStepComplete={(stepId) => {
          console.log(`Step completed: ${stepId}`)
        }}
        onAllComplete={() => {
          console.log('All steps completed')
        }}
      />

      {/* AI Insights Preview */}
      <AnimatePresence>
        {state.phase === 'analysis' && (
          <AIInsightsPreview progress={state.progress} />
        )}
        
        {state.phase === 'complete' && (
          <ProcessingComplete
            totalTime={elapsedTime}
            complexity={processingStats.complexity}
            accountCount={state.metadata?.accountCount}
            issueCount={state.metadata?.issueCount}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function AIInsightsPreview({ progress }: { progress: number }) {
  const insights = [
    { icon: TrendingUp, label: 'Credit Score Impact', progress: Math.min(progress * 1.2, 100) },
    { icon: Target, label: 'Improvement Opportunities', progress: Math.min(progress * 0.8, 100) },
    { icon: Shield, label: 'Risk Assessment', progress: Math.min(progress * 1.1, 100) },
    { icon: Zap, label: 'Quick Wins', progress: Math.min(progress * 0.9, 100) }
  ]

  return (
    <motion.div
      className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="flex items-center space-x-2 mb-4">
        <Brain className="w-5 h-5 text-blue-600" />
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          AI Analysis in Progress
        </h4>
      </div>
      
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.label}
            className="flex items-center space-x-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <insight.icon className="w-4 h-4 text-blue-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {insight.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round(insight.progress)}%
                </span>
              </div>
              <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${insight.progress}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function ProcessingComplete({
  totalTime,
  complexity,
  accountCount,
  issueCount
}: {
  totalTime: number
  complexity: number
  accountCount?: number
  issueCount?: number
}) {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <motion.div
      className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center space-x-3 mb-4">
        <CheckCircle2 className="w-6 h-6 text-green-600" />
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
          Processing Complete!
        </h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className="text-lg font-semibold text-green-900 dark:text-green-100">
            {formatTime(totalTime)}
          </div>
          <div className="text-green-600 dark:text-green-400">
            Total Time
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-green-900 dark:text-green-100">
            {getComplexityLabel(complexity)}
          </div>
          <div className="text-green-600 dark:text-green-400">
            Complexity
          </div>
        </div>
        
        {accountCount && (
          <div className="text-center">
            <div className="text-lg font-semibold text-green-900 dark:text-green-100">
              {accountCount}
            </div>
            <div className="text-green-600 dark:text-green-400">
              Accounts Found
            </div>
          </div>
        )}
        
        {issueCount && (
          <div className="text-center">
            <div className="text-lg font-semibold text-green-900 dark:text-green-100">
              {issueCount}
            </div>
            <div className="text-green-600 dark:text-green-400">
              Issues Identified
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function getComplexityLabel(complexity: number): string {
  if (complexity <= 1.5) return 'Simple'
  if (complexity <= 2.5) return 'Moderate'
  if (complexity <= 3.5) return 'Complex'
  return 'Very Complex'
}

export default EnhancedCreditProcessing