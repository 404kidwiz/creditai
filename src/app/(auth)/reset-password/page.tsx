'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { AuthForm } from '@/components/auth/AuthForm'
import { useAuth } from '@/hooks/useAuth'
import { ResetPasswordFormData, UpdatePasswordFormData } from '@/types/auth'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resetPassword, updatePassword } = useAuth()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailSent, setShowEmailSent] = useState(false)
  const [email, setEmail] = useState('')
  
  // Check if this is a password recovery callback
  const type = searchParams.get('type')
  const isRecovery = type === 'recovery'

  const handleResetRequest = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await resetPassword(data.email)

      if (!result.success) {
        setError(result.message || 'Failed to send reset email')
        toast.error(result.message || 'Failed to send reset email')
      } else {
        setEmail(data.email)
        setShowEmailSent(true)
        toast.success('Reset email sent!')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordUpdate = async (data: UpdatePasswordFormData) => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await updatePassword(data.password)

      if (!result.success) {
        setError(result.message || 'Failed to update password')
        toast.error(result.message || 'Failed to update password')
      } else {
        toast.success('Password updated successfully!')
        router.push('/dashboard')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Show email sent confirmation for reset requests
  if (showEmailSent && !isRecovery) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Check your email
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We've sent a password reset link to <strong>{email}</strong>. 
            Please click the link to reset your password.
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => {
              setShowEmailSent(false)
              setError(null)
              setEmail('')
            }}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Reset Password
          </button>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={() => {
                setShowEmailSent(false)
                setError(null)
              }}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              try again
            </button>
          </p>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Remember your password?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Sign in instead
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <AuthForm
      type={isRecovery ? 'update-password' : 'reset-password'}
      onSubmit={isRecovery ? handlePasswordUpdate : handleResetRequest}
      isLoading={isLoading}
      error={error || undefined}
      showSocialLogin={false}
      showRememberMe={false}
    />
  )
} 