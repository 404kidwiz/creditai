'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { AuthForm } from '@/components/auth/AuthForm'
import { useAuthContext } from '@/context/AuthContext'

export default function SignupPage() {
  const router = useRouter()
  const { signUp, signInWithOAuth } = useAuthContext()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailVerification, setShowEmailVerification] = useState(false)

  const handleSubmit = async (data: any) => {
    try {
      setIsLoading(true)
      setError(null)

      // Handle OAuth signup
      if (data.provider) {
        const result = await signInWithOAuth(data.provider)
        if (result.success) {
          toast.success('Redirecting to provider...')
        } else {
          throw new Error(result.message)
        }
        return
      }

      // Handle email/password signup
      const result = await signUp(data.email, data.password, {
        full_name: data.fullName,
        phone: data.phone || undefined,
      })

      if (result.success) {
        setShowEmailVerification(true)
        toast.success('Account created! Check your email for verification.')
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (showEmailVerification) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Check your email
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We've sent a verification link to your email address. Please click the link to verify your account.
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => {
              setShowEmailVerification(false)
              setError(null)
            }}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Sign Up
          </button>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={() => toast.success('Verification email resent!')}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              resend the email
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <AuthForm
      type="signup"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      error={error || undefined}
      showSocialLogin={true}
      showRememberMe={false}
    />
  )
} 