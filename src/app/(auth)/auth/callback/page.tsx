'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle OAuth callback
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          toast.error('Authentication failed')
          router.push('/login')
          return
        }

        if (data.session) {
          // Check if user has a profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single()

          // Create profile if it doesn't exist
          if (profileError && profileError.code === 'PGRST116') {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: data.session.user.id,
                full_name: data.session.user.user_metadata?.full_name || 
                          data.session.user.email?.split('@')[0] || 
                          'User',
                phone: data.session.user.user_metadata?.phone || null,
                subscription_tier: 'free',
                subscription_status: 'active',
              })

            if (insertError) {
              console.error('Error creating profile:', insertError)
            }
          }

          // Success - redirect to dashboard or upload for new users
          const redirectTo = searchParams.get('redirectTo') || '/dashboard'
          const isNewUser = !profile || profile.created_at === profile.updated_at
          
          if (isNewUser) {
            toast.success('Welcome to CreditAI! Let\'s get started by uploading your first credit report.')
            router.push('/upload')
          } else {
            toast.success('Welcome back to CreditAI!')
            router.push(redirectTo)
          }
        } else {
          // No session - redirect to login
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        toast.error('Authentication failed')
        router.push('/login')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
            <div className="w-8 h-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Signing you in
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Please wait while we complete your authentication...
          </p>
        </div>
      </div>
    </div>
  )
} 