'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import {
  Skeleton,
  CardSkeleton,
  StatCardSkeleton,
  ChartSkeleton,
  AccountCardSkeleton,
  CreditScoreSkeleton,
  ListItemSkeleton,
  TextSkeleton,
  TableRowSkeleton,
  StaggeredSkeleton
} from './SkeletonScreens'

// Dashboard Page Skeleton
export function DashboardPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800', className)}>
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Skeleton className="w-6 h-6 bg-white/20" shimmer={false} />
              </div>
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex space-x-3">
              <Skeleton className="h-10 w-20" variant="button" />
              <Skeleton className="h-10 w-24" variant="button" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Stats Grid with Staggered Animation */}
        <StaggeredSkeleton
          items={4}
          delay={100}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {(index) => <StatCardSkeleton />}
        </StaggeredSkeleton>

        {/* Quick Actions Section */}
        <div className="mb-8">
          <CardSkeleton 
            className="p-8" 
            headerHeight="h-8"
            contentLines={0}
            showFooter={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" variant="button" />
              ))}
            </div>
          </CardSkeleton>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <CardSkeleton 
              className="p-6"
              headerHeight="h-6"
              contentLines={0}
              showFooter={false}
            >
              <div className="space-y-4 mt-6">
                <StaggeredSkeleton items={3} delay={150}>
                  {(index) => <ListItemSkeleton />}
                </StaggeredSkeleton>
              </div>
            </CardSkeleton>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CardSkeleton 
              className="p-6"
              headerHeight="h-6"
              contentLines={3}
              showFooter={false}
            />
            <CardSkeleton 
              className="p-6"
              headerHeight="h-5"
              contentLines={2}
              showFooter={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Analysis Results Page Skeleton
export function AnalysisResultsPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800', className)}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="w-10 h-10" variant="circle" />
              <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex space-x-3">
              <Skeleton className="h-10 w-24" variant="button" />
              <Skeleton className="h-10 w-20" variant="button" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Credit Score Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <CardSkeleton className="p-8 text-center">
              <CreditScoreSkeleton />
            </CardSkeleton>
          </div>
          <div className="lg:col-span-2">
            <CardSkeleton 
              className="p-6"
              headerHeight="h-6"
              contentLines={4}
              showFooter={false}
            />
          </div>
        </div>

        {/* Tabbed Content Area */}
        <div className="mb-8">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex space-x-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-20 mb-4" />
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <StaggeredSkeleton items={3} delay={100}>
                {(index) => <AccountCardSkeleton />}
              </StaggeredSkeleton>
            </div>
            <div className="space-y-6">
              <ChartSkeleton height="h-80" />
              <CardSkeleton 
                className="p-6"
                headerHeight="h-5"
                contentLines={3}
                showFooter={true}
              />
            </div>
          </div>
        </div>

        {/* Recommendations Section */}
        <CardSkeleton 
          className="p-6"
          headerHeight="h-6"
          contentLines={0}
          showFooter={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <StaggeredSkeleton items={6} delay={75}>
              {(index) => (
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <Skeleton className="h-5 w-3/4 mb-3" />
                  <TextSkeleton lines={2} />
                  <div className="mt-4 flex justify-between items-center">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-20" variant="button" />
                  </div>
                </div>
              )}
            </StaggeredSkeleton>
          </div>
        </CardSkeleton>
      </div>
    </div>
  )
}

// Upload Page Skeleton
export function UploadPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800', className)}>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Skeleton className="h-10 w-80 mx-auto mb-4" />
          <Skeleton className="h-5 w-96 mx-auto" />
        </div>

        {/* Upload Area */}
        <CardSkeleton className="p-12 text-center mb-8">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12">
            <Skeleton className="w-16 h-16 mx-auto mb-4" variant="circle" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto mb-6" />
            <Skeleton className="h-12 w-40 mx-auto" variant="button" />
          </div>
        </CardSkeleton>

        {/* Processing Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Skeleton className="w-6 h-6" />
              </div>
              <Skeleton className="h-5 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-40 mx-auto" />
            </div>
          ))}
        </div>

        {/* Recent Uploads */}
        <CardSkeleton 
          className="p-6"
          headerHeight="h-6"
          contentLines={0}
          showFooter={false}
        >
          <div className="space-y-4 mt-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Skeleton className="w-10 h-10" variant="circle" />
                  <div>
                    <Skeleton className="h-4 w-48 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24" variant="button" />
              </div>
            ))}
          </div>
        </CardSkeleton>
      </div>
    </div>
  )
}

// Credit Reports Page Skeleton
export function CreditReportsPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header with Filters */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex space-x-3 mt-4 sm:mt-0">
              <Skeleton className="h-10 w-24" variant="button" />
              <Skeleton className="h-10 w-20" variant="button" />
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-10 w-32" variant="button" />
            <Skeleton className="h-10 w-28" variant="button" />
            <Skeleton className="h-10 w-36" variant="button" />
            <Skeleton className="h-10 w-24" variant="button" />
          </div>
        </div>

        {/* Reports Table */}
        <CardSkeleton className="p-0" headerHeight="h-0" contentLines={0} showFooter={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Report', 'Date', 'Bureau', 'Score', 'Status', 'Actions'].map((_, i) => (
                    <th key={i} className="px-6 py-3">
                      <Skeleton className="h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <StaggeredSkeleton items={8} delay={50}>
                  {(index) => <TableRowSkeleton columns={6} />}
                </StaggeredSkeleton>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <Skeleton className="h-4 w-32" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-8" variant="button" />
              <Skeleton className="h-8 w-8" variant="button" />
              <Skeleton className="h-8 w-8" variant="button" />
              <Skeleton className="h-8 w-8" variant="button" />
            </div>
          </div>
        </CardSkeleton>
      </div>
    </div>
  )
}

// Settings Page Skeleton
export function SettingsPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* Profile Section */}
          <CardSkeleton 
            className="p-6"
            headerHeight="h-6"
            contentLines={0}
            showFooter={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <Skeleton className="w-24 h-24 mx-auto mb-4" variant="circle" />
                  <Skeleton className="h-8 w-32 mx-auto" variant="button" />
                </div>
              </div>
            </div>
          </CardSkeleton>

          {/* Preferences Section */}
          <CardSkeleton 
            className="p-6"
            headerHeight="h-6"
            contentLines={0}
            showFooter={false}
          >
            <div className="space-y-6 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <div>
                    <Skeleton className="h-5 w-40 mb-1" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          </CardSkeleton>

          {/* Security Section */}
          <CardSkeleton 
            className="p-6"
            headerHeight="h-6"
            contentLines={0}
            showFooter={true}
          >
            <div className="space-y-4 mt-6">
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-36 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardSkeleton>
        </div>
      </div>
    </div>
  )
}

// Mobile-Optimized Skeleton Components
export function MobileDashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-6', className)}>
      {/* Mobile Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-6 w-32 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="w-8 h-8" variant="circle" />
      </div>

      {/* Mobile Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StaggeredSkeleton items={4} delay={100}>
          {(index) => (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-12" />
            </div>
          )}
        </StaggeredSkeleton>
      </div>

      {/* Mobile Content */}
      <div className="space-y-4">
        <CardSkeleton className="p-4" headerHeight="h-5" contentLines={2} />
        <CardSkeleton className="p-4" headerHeight="h-5" contentLines={3} />
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="space-y-3">
            <StaggeredSkeleton items={3} delay={100}>
              {(index) => (
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-8 h-8" variant="circle" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              )}
            </StaggeredSkeleton>
          </div>
        </div>
      </div>
    </div>
  )
}