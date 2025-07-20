'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './Card'
import { 
  Skeleton as SkeletonComponent, 
  StatCardSkeleton, 
  AccountCardSkeleton,
  ChartSkeleton 
} from './SkeletonScreens'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-muted border-t-primary',
        sizeClasses[size],
        className
      )}
    />
  )
}

interface LoadingStateProps {
  title?: string
  description?: string
  className?: string
}

export function LoadingState({ 
  title = 'Loading...', 
  description = 'Please wait while we process your request.',
  className 
}: LoadingStateProps) {
  return (
    <div className={cn('flex min-h-[200px] items-center justify-center p-8', className)}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>
    </div>
  )
}

interface LoadingCardProps {
  title?: string
  description?: string
  timeout?: number
  onTimeout?: () => void
}

export function LoadingCard({ title, description, timeout, onTimeout }: LoadingCardProps) {
  React.useEffect(() => {
    if (timeout && onTimeout) {
      const timer = setTimeout(onTimeout, timeout)
      return () => clearTimeout(timer)
    }
  }, [timeout, onTimeout])

  return (
    <Card>
      <CardContent className="p-8">
        <LoadingState title={title} description={description} />
      </CardContent>
    </Card>
  )
}

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-muted rounded',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
            className
          )}
        />
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonComponent className="h-8 w-48" />
          <SkeletonComponent className="h-4 w-32" />
        </div>
        <div className="flex space-x-2">
          <SkeletonComponent className="h-10 w-20" variant="button" />
          <SkeletonComponent className="h-10 w-20" variant="button" />
        </div>
      </div>

      {/* Stats grid skeleton with staggered animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div 
            key={i} 
            className="animate-fade-in"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <StatCardSkeleton />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <Card className="p-6">
            <div className="space-y-4">
              <SkeletonComponent className="h-6 w-32" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div 
                  key={i} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${500 + (i * 100)}ms` }}
                >
                  <AccountCardSkeleton />
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-6 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <ChartSkeleton height="h-64" />
          <Card className="p-6">
            <SkeletonComponent className="h-6 w-24 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <SkeletonComponent className="h-2 w-2 rounded-full mt-2" />
                  <SkeletonComponent className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}