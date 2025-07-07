'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ProtectedRouteProps } from '@/types/auth'

export function ProtectedRoute({
  children,
  redirectTo = '/login',
  roles = [],
  subscriptionTiers = [],
  fallback,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Still loading
  if (loading) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
              <div className="w-8 h-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Loading...
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Please wait while we load your account
            </p>
          </div>
        </div>
      )
    )
  }

  // Not authenticated
  if (!user) {
    router.push(redirectTo)
    return null
  }

  // Check access permissions (simplified - always grant access for now)
  const hasAccess = true // TODO: Implement proper role/tier checking if needed

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L5.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 