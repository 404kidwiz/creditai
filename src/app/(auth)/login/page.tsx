'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { AuthForm } from '@/components/auth/AuthForm'
import { useAuthContext } from '@/context/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signInWithOAuth } = useAuthContext()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const handleSubmit = async (data: any) => {
    try {
      setIsLoading(true)
      setError(null)

      // Handle OAuth login
      if (data.provider) {
        const result = await signInWithOAuth(data.provider)
        if (result.success) {
          toast.success('Redirecting to provider...')
        } else {
          throw new Error(result.message)
        }
        return
      }

      // Handle email/password login
      const result = await signIn(data.email, data.password)
      if (result.success) {
        toast.success('Welcome back!')
        // AuthContext will handle redirect automatically
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

  return (
    <AuthForm
      type="signin"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      error={error || undefined}
      showSocialLogin={true}
      showRememberMe={true}
    />
  )
} 