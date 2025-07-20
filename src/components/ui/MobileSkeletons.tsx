'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton, StatCardSkeleton, AccountCardSkeleton, StaggeredSkeleton } from './SkeletonScreens'

// Mobile-optimized skeleton components
interface MobileSkeletonProps {
  className?: string
}

// Mobile Credit Card Skeleton
export function MobileCreditCardSkeleton({ className }: MobileSkeletonProps) {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <Skeleton className="w-8 h-8" variant="circle" />
          <div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-12" />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  )
}

// Mobile Dashboard Stats
export function MobileDashboardStats({ className }: MobileSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      <StaggeredSkeleton items={4} delay={100}>
        {(index) => (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
            <Skeleton className="h-3 w-12 mb-2" />
            <Skeleton className="h-5 w-16 mb-1" />
            <div className="flex items-center space-x-1">
              <Skeleton className="h-2 w-2" variant="circle" />
              <Skeleton className="h-2 w-8" />
            </div>
          </div>
        )}
      </StaggeredSkeleton>
    </div>
  )
}

// Mobile List Item
export function MobileListItemSkeleton({ 
  className,
  showAction = true 
}: MobileSkeletonProps & { showAction?: boolean }) {
  return (
    <div className={cn(
      'flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg',
      className
    )}>
      <Skeleton className="w-8 h-8" variant="circle" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-3/4 mb-1" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      {showAction && (
        <Skeleton className="h-6 w-12" />
      )}
    </div>
  )
}

// Mobile Navigation Skeleton
export function MobileNavigationSkeleton({ className }: MobileSkeletonProps) {
  return (
    <div className={cn('flex justify-around items-center p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700', className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center space-y-1">
          <Skeleton className="w-6 h-6" />
          <Skeleton className="h-2 w-8" />
        </div>
      ))}
    </div>
  )
}

// Mobile Chart Skeleton
export function MobileChartSkeleton({ 
  className,
  height = 'h-48' 
}: MobileSkeletonProps & { height?: string }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-6" variant="circle" />
      </div>
      
      <div className={cn('relative', height)}>
        {/* Mobile-optimized chart bars */}
        <div className="flex items-end justify-between h-full space-x-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton
              key={i}
              className="w-full"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </div>
      
      <div className="flex justify-between mt-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-2 w-8" />
        ))}
      </div>
    </div>
  )
}

// Mobile Upload Skeleton
export function MobileUploadSkeleton({ className }: MobileSkeletonProps) {
  return (
    <div className={cn('p-4 space-y-6', className)}>
      {/* Header */}
      <div className="text-center">
        <Skeleton className="h-6 w-48 mx-auto mb-2" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>

      {/* Upload Area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <Skeleton className="w-12 h-12 mx-auto mb-4" variant="circle" />
          <Skeleton className="h-4 w-32 mx-auto mb-2" />
          <Skeleton className="h-3 w-40 mx-auto mb-4" />
          <Skeleton className="h-8 w-24 mx-auto" />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Skeleton className="w-3 h-3" />
            </div>
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-2 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Mobile Analysis Results Skeleton
export function MobileAnalysisResultsSkeleton({ className }: MobileSkeletonProps) {
  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="w-6 h-6" variant="circle" />
      </div>

      {/* Score Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
        <Skeleton className="w-16 h-16 mx-auto mb-3" variant="circle" />
        <Skeleton className="h-5 w-20 mx-auto mb-1" />
        <Skeleton className="h-3 w-16 mx-auto" />
      </div>

      {/* Quick Stats */}
      <MobileDashboardStats />

      {/* Tabs */}
      <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        <StaggeredSkeleton items={4} delay={100}>
          {(index) => <MobileCreditCardSkeleton />}
        </StaggeredSkeleton>
      </div>
    </div>
  )
}

// Adaptive Mobile Skeleton that changes based on screen size
export function AdaptiveMobileSkeleton({ 
  type = 'dashboard',
  className 
}: MobileSkeletonProps & { 
  type?: 'dashboard' | 'upload' | 'analysis' | 'list' 
}) {
  const skeletonComponents = {
    dashboard: <MobileAnalysisResultsSkeleton />,
    upload: <MobileUploadSkeleton />,
    analysis: <MobileAnalysisResultsSkeleton />,
    list: (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <MobileListItemSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      {skeletonComponents[type]}
    </div>
  )
}

// Touch-friendly skeleton components
export function TouchFriendlySkeleton({ className }: MobileSkeletonProps) {
  return (
    <div className={cn('p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm', className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-8" />
      </div>
      
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-3 -m-3 rounded-lg">
            <Skeleton className="w-10 h-10" variant="circle" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="flex flex-col items-end space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}