'use client'

import { useState, useEffect, useCallback } from 'react'

export type LoadingStage = 'idle' | 'initial' | 'partial' | 'complete' | 'error'

interface ProgressiveLoadingOptions {
  stages?: LoadingStage[]
  stageDelay?: number
  autoProgress?: boolean
  onStageChange?: (stage: LoadingStage) => void
}

interface ProgressiveLoadingState {
  stage: LoadingStage
  progress: number
  isLoading: boolean
  error: string | null
}

export function useProgressiveLoading({
  stages = ['initial', 'partial', 'complete'],
  stageDelay = 800,
  autoProgress = false,
  onStageChange
}: ProgressiveLoadingOptions = {}) {
  const [state, setState] = useState<ProgressiveLoadingState>({
    stage: 'idle',
    progress: 0,
    isLoading: false,
    error: null
  })

  const [currentStageIndex, setCurrentStageIndex] = useState(0)

  // Calculate progress based on current stage
  const calculateProgress = useCallback((stageIndex: number) => {
    return Math.round((stageIndex / (stages.length - 1)) * 100)
  }, [stages])

  // Start loading process
  const startLoading = useCallback(() => {
    setState(prev => ({
      ...prev,
      stage: 'initial',
      progress: 0,
      isLoading: true,
      error: null
    }))
    setCurrentStageIndex(0)
    onStageChange?.('initial')
  }, [onStageChange])

  // Advance to next stage
  const nextStage = useCallback(() => {
    if (currentStageIndex < stages.length - 1) {
      const nextIndex = currentStageIndex + 1
      const nextStage = stages[nextIndex]
      const progress = calculateProgress(nextIndex)

      setState(prev => ({
        ...prev,
        stage: nextStage,
        progress,
        isLoading: nextStage !== 'complete'
      }))
      setCurrentStageIndex(nextIndex)
      onStageChange?.(nextStage)
    }
  }, [currentStageIndex, stages, calculateProgress, onStageChange])

  // Complete loading
  const completeLoading = useCallback(() => {
    setState(prev => ({
      ...prev,
      stage: 'complete',
      progress: 100,
      isLoading: false,
      error: null
    }))
    setCurrentStageIndex(stages.length - 1)
    onStageChange?.('complete')
  }, [stages, onStageChange])

  // Set error state
  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      stage: 'error',
      isLoading: false,
      error
    }))
    onStageChange?.('error')
  }, [onStageChange])

  // Reset to idle
  const reset = useCallback(() => {
    setState({
      stage: 'idle',
      progress: 0,
      isLoading: false,
      error: null
    })
    setCurrentStageIndex(0)
    onStageChange?.('idle')
  }, [onStageChange])

  // Auto progress through stages
  useEffect(() => {
    if (!autoProgress || !state.isLoading || state.stage === 'complete' || state.stage === 'error') {
      return
    }

    const timer = setTimeout(() => {
      nextStage()
    }, stageDelay)

    return () => clearTimeout(timer)
  }, [autoProgress, state.isLoading, state.stage, stageDelay, nextStage])

  return {
    ...state,
    startLoading,
    nextStage,
    completeLoading,
    setError,
    reset,
    currentStageIndex,
    totalStages: stages.length,
    isStage: (stage: LoadingStage) => state.stage === stage,
    isAtLeastStage: (stage: LoadingStage) => {
      const targetIndex = stages.indexOf(stage)
      return currentStageIndex >= targetIndex
    }
  }
}

// Hook for staggered animations
interface StaggeredAnimationOptions {
  count: number
  delay: number
  startDelay?: number
}

export function useStaggeredAnimation({
  count,
  delay,
  startDelay = 0
}: StaggeredAnimationOptions) {
  const [visibleItems, setVisibleItems] = useState<boolean[]>(
    new Array(count).fill(false)
  )

  const startAnimation = useCallback(() => {
    setVisibleItems(new Array(count).fill(false))
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        setVisibleItems(prev => {
          const newState = [...prev]
          newState[i] = true
          return newState
        })
      }, startDelay + (i * delay))
    }
  }, [count, delay, startDelay])

  const resetAnimation = useCallback(() => {
    setVisibleItems(new Array(count).fill(false))
  }, [count])

  return {
    visibleItems,
    startAnimation,
    resetAnimation,
    isVisible: (index: number) => visibleItems[index] || false
  }
}

// Hook for content loading simulation
interface ContentLoadingOptions {
  sections: string[]
  sectionDelay?: number
  onSectionLoad?: (section: string, index: number) => void
}

export function useContentLoading({
  sections,
  sectionDelay = 500,
  onSectionLoad
}: ContentLoadingOptions) {
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set())
  const [currentlyLoading, setCurrentlyLoading] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)

  const startLoading = useCallback(() => {
    setLoadedSections(new Set())
    setCurrentlyLoading(null)
    setIsComplete(false)

    sections.forEach((section, index) => {
      setTimeout(() => {
        setCurrentlyLoading(section)
        onSectionLoad?.(section, index)
        
        setTimeout(() => {
          setLoadedSections(prev => new Set([...prev, section]))
          setCurrentlyLoading(null)
          
          if (index === sections.length - 1) {
            setIsComplete(true)
          }
        }, sectionDelay * 0.3) // Show loading state briefly
      }, index * sectionDelay)
    })
  }, [sections, sectionDelay, onSectionLoad])

  const isSectionLoaded = useCallback((section: string) => {
    return loadedSections.has(section)
  }, [loadedSections])

  const isSectionLoading = useCallback((section: string) => {
    return currentlyLoading === section
  }, [currentlyLoading])

  return {
    loadedSections: Array.from(loadedSections),
    currentlyLoading,
    isComplete,
    startLoading,
    isSectionLoaded,
    isSectionLoading,
    progress: Math.round((loadedSections.size / sections.length) * 100)
  }
}