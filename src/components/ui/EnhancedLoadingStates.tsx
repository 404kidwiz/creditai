'use client'

import React, { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { 
  useProgressiveLoading, 
  useStaggeredAnimation,
  useContentLoading,
  LoadingStage 
} from '@/hooks/useProgressiveLoading'
import {
  Skeleton,
  StatCardSkeleton,
  AccountCardSkeleton,
  ChartSkeleton,
  ListItemSkeleton
} from './SkeletonScreens'

// Enhanced Loading Wrapper Component
interface EnhancedLoadingProps {
  isLoading: boolean
  stage?: LoadingStage
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
  showProgress?: boolean
  staggerDelay?: number
}

export function EnhancedLoading({
  isLoading,
  stage = 'initial',
  children,
  fallback,
  className,
  showProgress = false,
  staggerDelay = 100
}: EnhancedLoadingProps) {
  if (!isLoading) {
    return <div className={cn('animate-fade-in', className)}>{children}</div>
  }

  return (
    <div className={cn('animate-pulse', className)}>
      {fallback || <Skeleton className="h-32 w-full" />}
      {showProgress && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Loading...</span>
            <span>{stage}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: stage === 'initial' ? '30%' : 
                       stage === 'partial' ? '70%' : 
                       stage === 'complete' ? '100%' : '0%' 
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Progressive Dashboard Loading
interface ProgressiveDashboardLoadingProps {
  onLoadingComplete?: () => void
  className?: string
}

export function ProgressiveDashboardLoading({
  onLoadingComplete,
  className
}: ProgressiveDashboardLoadingProps) {
  const { stage, startLoading, isAtLeastStage } = useProgressiveLoading({
    stages: ['initial', 'partial', 'complete'],
    stageDelay: 800,
    autoProgress: true,
    onStageChange: (newStage) => {
      if (newStage === 'complete') {
        onLoadingComplete?.()
      }
    }
  })

  const { visibleItems, startAnimation } = useStaggeredAnimation({
    count: 4,
    delay: 150,
    startDelay: 300
  })

  useEffect(() => {
    startLoading()
    startAnimation()
  }, [startLoading, startAnimation])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header - Always visible */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex space-x-3">
          <Skeleton className="h-10 w-24" variant="button" />
          <Skeleton className="h-10 w-20" variant="button" />
        </div>
      </div>

      {/* Stats Grid - Staggered appearance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'transition-all duration-500',
              visibleItems[i] ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            )}
          >
            <StatCardSkeleton />
          </div>
        ))}
      </div>

      {/* Partial Content - Appears after initial stage */}
      {isAtLeastStage('partial') && (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <AccountCardSkeleton />
            <AccountCardSkeleton />
          </div>
          <ChartSkeleton />
        </div>
      )}

      {/* Complete Content - Appears last */}
      {isAtLeastStage('complete') && (
        <div className="animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Content Section Loading
interface ContentSectionLoadingProps {
  sections: Array<{
    id: string
    name: string
    component: React.ReactNode
    skeleton: React.ReactNode
  }>
  onComplete?: () => void
  className?: string
}

export function ContentSectionLoading({
  sections,
  onComplete,
  className
}: ContentSectionLoadingProps) {
  const {
    startLoading,
    isSectionLoaded,
    isSectionLoading,
    isComplete,
    progress
  } = useContentLoading({
    sections: sections.map(s => s.id),
    sectionDelay: 600,
    onSectionLoad: (sectionId) => {
      console.log(`Loading section: ${sectionId}`)
    }
  })

  useEffect(() => {
    startLoading()
  }, [startLoading])

  useEffect(() => {
    if (isComplete) {
      onComplete?.()
    }
  }, [isComplete, onComplete])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
        <div 
          className="bg-blue-600 h-1 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.id} className="relative">
          {isSectionLoaded(section.id) ? (
            <div className="animate-fade-in">
              {section.component}
            </div>
          ) : (
            <div className={cn(
              'transition-all duration-300',
              isSectionLoading(section.id) && 'animate-pulse'
            )}>
              {section.skeleton}
              {isSectionLoading(section.id) && (
                <div className="absolute top-2 right-2">
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    <span>Loading {section.name}...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Analysis Loading with Stages
interface AnalysisLoadingProps {
  analysisSteps?: Array<{
    id: string
    name: string
    description: string
    duration: number
  }>
  onStepComplete?: (stepId: string) => void
  onComplete?: () => void
  className?: string
}

export function AnalysisLoading({
  analysisSteps = [
    { id: 'extract', name: 'Extracting Data', description: 'Reading credit report content...', duration: 2000 },
    { id: 'analyze', name: 'Analyzing Credit', description: 'Processing credit information...', duration: 3000 },
    { id: 'recommend', name: 'Generating Recommendations', description: 'Creating personalized recommendations...', duration: 2500 },
    { id: 'complete', name: 'Finalizing', description: 'Preparing your results...', duration: 1000 }
  ],
  onStepComplete,
  onComplete,
  className
}: AnalysisLoadingProps) {
  const [currentStep, setCurrentStep] = React.useState(0)
  const [completedSteps, setCompletedSteps] = React.useState<Set<string>>(new Set())

  useEffect(() => {
    if (currentStep >= analysisSteps.length) {
      onComplete?.()
      return
    }

    const step = analysisSteps[currentStep]
    const timer = setTimeout(() => {
      setCompletedSteps(prev => new Set([...prev, step.id]))
      onStepComplete?.(step.id)
      setCurrentStep(prev => prev + 1)
    }, step.duration)

    return () => clearTimeout(timer)
  }, [currentStep, analysisSteps, onStepComplete, onComplete])

  const progress = ((currentStep) / analysisSteps.length) * 100

  return (
    <div className={cn('max-w-2xl mx-auto p-8', className)}>
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 animate-spin">
            <div className="w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Analyzing Your Credit Report
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we process your information...
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-8">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {analysisSteps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center space-x-4 p-4 rounded-lg transition-all duration-500',
              index === currentStep ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600' :
              completedSteps.has(step.id) ? 'bg-green-50 dark:bg-green-900/20' :
              'bg-gray-50 dark:bg-gray-800'
            )}
          >
            <div className="flex-shrink-0">
              {completedSteps.has(step.id) ? (
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : index === currentStep ? (
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={cn(
                'font-semibold',
                index === currentStep ? 'text-blue-900 dark:text-blue-100' :
                completedSteps.has(step.id) ? 'text-green-900 dark:text-green-100' :
                'text-gray-500 dark:text-gray-400'
              )}>
                {step.name}
              </h3>
              <p className={cn(
                'text-sm',
                index === currentStep ? 'text-blue-700 dark:text-blue-300' :
                completedSteps.has(step.id) ? 'text-green-700 dark:text-green-300' :
                'text-gray-400 dark:text-gray-500'
              )}>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Smart Loading Component that adapts to content
interface SmartLoadingProps {
  type: 'dashboard' | 'analysis' | 'upload' | 'reports'
  isLoading: boolean
  children: React.ReactNode
  className?: string
  onLoadingComplete?: () => void
}

export function SmartLoading({
  type,
  isLoading,
  children,
  className,
  onLoadingComplete
}: SmartLoadingProps) {
  if (!isLoading) {
    return <div className={cn('animate-fade-in', className)}>{children}</div>
  }

  const loadingComponents = {
    dashboard: <ProgressiveDashboardLoading onLoadingComplete={onLoadingComplete} />,
    analysis: <AnalysisLoading onComplete={onLoadingComplete} />,
    upload: (
      <div className="max-w-2xl mx-auto p-8">
        <div className="text-center">
          <Skeleton className="w-16 h-16 mx-auto mb-4" variant="circle" />
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    ),
    reports: (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" variant="button" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      {loadingComponents[type]}
    </div>
  )
}