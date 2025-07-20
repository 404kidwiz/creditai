'use client'

import React from 'react'
import { cn } from '@/lib/utils'

// Base Skeleton Component with Shimmer Effect
interface SkeletonProps {
  className?: string
  shimmer?: boolean
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  variant?: 'default' | 'circle' | 'text' | 'button' | 'card'
}

export function Skeleton({ 
  className, 
  shimmer = true, 
  rounded = 'md',
  variant = 'default' 
}: SkeletonProps) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  }

  const variantClasses = {
    default: 'h-4 bg-gray-200 dark:bg-gray-700',
    circle: 'rounded-full bg-gray-200 dark:bg-gray-700',
    text: 'h-4 bg-gray-200 dark:bg-gray-700',
    button: 'h-10 bg-gray-200 dark:bg-gray-700',
    card: 'h-32 bg-gray-200 dark:bg-gray-700'
  }

  return (
    <div
      className={cn(
        'animate-pulse',
        variantClasses[variant],
        roundedClasses[rounded],
        shimmer && 'relative overflow-hidden',
        className
      )}
    >
      {shimmer && (
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-gray-600/20" />
      )}
    </div>
  )
}

// Text Skeleton with Multiple Lines
interface TextSkeletonProps {
  lines?: number
  className?: string
  lastLineWidth?: 'full' | '3/4' | '1/2' | '1/3'
}

export function TextSkeleton({ 
  lines = 3, 
  className,
  lastLineWidth = '3/4' 
}: TextSkeletonProps) {
  const widthClasses = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3'
  }

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? widthClasses[lastLineWidth] : 'w-full'
          )}
        />
      ))}
    </div>
  )
}

// Card Skeleton Component
interface CardSkeletonProps {
  className?: string
  headerHeight?: string
  contentLines?: number
  showFooter?: boolean
  animate?: boolean
}

export function CardSkeleton({ 
  className,
  headerHeight = 'h-6',
  contentLines = 3,
  showFooter = false,
  animate = true
}: CardSkeletonProps) {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6',
      animate && 'animate-pulse',
      className
    )}>
      {/* Header */}
      <Skeleton className={cn('w-1/3 mb-4', headerHeight)} />
      
      {/* Content */}
      <div className="space-y-3">
        <TextSkeleton lines={contentLines} />
      </div>
      
      {/* Footer */}
      {showFooter && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24" variant="button" />
          </div>
        </div>
      )}
    </div>
  )
}

// Credit Score Skeleton
export function CreditScoreSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('text-center', className)}>
      <div className="relative mx-auto w-32 h-32 mb-4">
        <Skeleton className="w-full h-full" variant="circle" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <Skeleton className="h-6 w-24 mx-auto mb-2" />
      <Skeleton className="h-4 w-32 mx-auto" />
    </div>
  )
}

// Account Card Skeleton
export function AccountCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4',
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <Skeleton className="w-10 h-10" variant="circle" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div>
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  )
}

// Stat Card Skeleton
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6',
      className
    )}>
      <div className="flex items-center space-x-4">
        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
          <Skeleton className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  )
}

// Chart Skeleton
export function ChartSkeleton({ 
  className,
  height = 'h-64' 
}: { 
  className?: string
  height?: string 
}) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-20" variant="button" />
      </div>
      
      <div className={cn('relative', height)}>
        {/* Chart bars */}
        <div className="flex items-end justify-between h-full space-x-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                'w-full',
                `h-${Math.floor(Math.random() * 16) + 8}`
              )}
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
        
        {/* Chart labels */}
        <div className="flex justify-between mt-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>
    </div>
  )
}

// Table Row Skeleton
export function TableRowSkeleton({ 
  columns = 4, 
  className 
}: { 
  columns?: number
  className?: string 
}) {
  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

// List Item Skeleton
export function ListItemSkeleton({ 
  showIcon = true,
  showAction = true,
  className 
}: { 
  showIcon?: boolean
  showAction?: boolean
  className?: string 
}) {
  return (
    <div className={cn('flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg', className)}>
      {showIcon && (
        <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-600">
          <Skeleton className="w-5 h-5" />
        </div>
      )}
      
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      
      {showAction && (
        <Skeleton className="h-8 w-20" variant="button" />
      )}
    </div>
  )
}

// Navigation Skeleton
export function NavigationSkeleton({ className }: { className?: string }) {
  return (
    <nav className={cn('space-y-2', className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </nav>
  )
}

// Progressive Loading Skeleton
interface ProgressiveSkeletonProps {
  stage: 'initial' | 'partial' | 'complete'
  className?: string
}

export function ProgressiveSkeleton({ stage, className }: ProgressiveSkeletonProps) {
  const showPartial = stage !== 'initial'
  const showComplete = stage === 'complete'

  return (
    <div className={cn('space-y-6', className)}>
      {/* Always show basic structure */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-24" variant="button" />
      </div>

      {/* Show partial content after initial load */}
      {showPartial && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      )}

      {/* Show complete content */}
      {showComplete && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <div className="space-y-4">
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
          </div>
        </div>
      )}
    </div>
  )
}

// Staggered Animation Skeleton
interface StaggeredSkeletonProps {
  items: number
  delay?: number
  className?: string
  children: (index: number) => React.ReactNode
}

export function StaggeredSkeleton({ 
  items, 
  delay = 100, 
  className,
  children 
}: StaggeredSkeletonProps) {
  return (
    <div className={className}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse"
          style={{
            animationDelay: `${index * delay}ms`,
            animationDuration: '1.5s'
          }}
        >
          {children(index)}
        </div>
      ))}
    </div>
  )
}