'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
// import { createClient } from '@/lib/supabase/server'
import { 
  AuthContextValue, 
  AuthState, 
  AuthResult, 
  AuthUser, 
  AuthSession, 
  MFAResult,
  OAuthProvider,
  SignInOptions,
  OAuthOptions,
  UserMetadata,
  AUTH_ROUTES
} from '@/types/auth'
import { Profile } from '@/types/database'
import { toast } from 'react-hot-toast'

// Create the context
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Session configuration
const SESSION_CONFIG = {
  maxAge: 60 * 60 * 24 * 7, // 7 days
  autoRefresh: true,
  refreshThreshold: 60 * 10, // 10 minutes
  persistSession: true,
  storage: 'localStorage' as const,
}

interface AuthProviderProps {
  children: React.ReactNode
  initialSession?: AuthSession | null
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const router = useRouter()
  
  // Auth state
  const [authState, setAuthState] = useState<AuthState>({
    user: initialSession?.user || null,
    profile: null,
    session: initialSession || null,
    loading: !initialSession,
    initialized: !!initialSession,
    error: null,
  })

  // Load user profile
  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error loading profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error loading profile:', error)
      return null
    }
  }, [])

  // Update auth state
  const updateAuthState = useCallback(async (session: AuthSession | null) => {
    if (session?.user) {
      const profile = await loadProfile(session.user.id)
      setAuthState({
        user: session.user as AuthUser,
        profile,
        session,
        loading: false,
        initialized: true,
        error: null,
      })
    } else {
      setAuthState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        initialized: true,
        error: null,
      })
    }
  }, [loadProfile])

  // Sign in with email/password
  const signIn = useCallback(async (
    email: string, 
    password: string, 
    options?: SignInOptions
  ): Promise<AuthResult> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error as any }))
        return {
          success: false,
          error: error as any,
          message: error.message,
        }
      }

      // Handle remember me
      if (options?.remember) {
        localStorage.setItem('supabase_remember_me', 'true')
      } else {
        localStorage.removeItem('supabase_remember_me')
      }

      await updateAuthState(data.session as AuthSession)

      // Redirect if specified
      if (options?.redirectTo) {
        router.push(options.redirectTo)
      } else {
        router.push(AUTH_ROUTES.DASHBOARD)
      }

      return {
        success: true,
        user: data.user as AuthUser,
        session: data.session as AuthSession,
        message: 'Signed in successfully',
      }
    } catch (error) {
      const authError = error as any
      setAuthState(prev => ({ ...prev, loading: false, error: authError }))
      return {
        success: false,
        error: authError,
        message: authError.message || 'An error occurred during sign in',
      }
    }
  }, [updateAuthState, router])

  // Sign up with email/password
  const signUp = useCallback(async (
    email: string, 
    password: string, 
    metadata?: UserMetadata
  ): Promise<AuthResult> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error as any }))
        return {
          success: false,
          error: error as any,
          message: error.message,
        }
      }

      // Profile will be created automatically by database trigger

      setAuthState(prev => ({ ...prev, loading: false }))

      return {
        success: true,
        user: data.user as AuthUser,
        session: data.session as AuthSession,
        message: 'Check your email for a verification link',
      }
    } catch (error) {
      const authError = error as any
      setAuthState(prev => ({ ...prev, loading: false, error: authError }))
      return {
        success: false,
        error: authError,
        message: authError.message || 'An error occurred during sign up',
      }
    }
  }, [])

  // Sign out
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Error signing out:', error)
        toast.error('Error signing out')
      }

      // Clear remember me
      localStorage.removeItem('supabase_remember_me')

      // Update state
      setAuthState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        initialized: true,
        error: null,
      })

      // Redirect to login
      router.push(AUTH_ROUTES.SIGN_IN)
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('An error occurred while signing out')
    }
  }, [router])

  // Sign in with OAuth
  const signInWithOAuth = useCallback(async (
    provider: OAuthProvider, 
    options?: OAuthOptions
  ): Promise<AuthResult> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: options?.redirectTo || `${window.location.origin}/auth/callback`,
          scopes: options?.scopes,
          queryParams: options?.queryParams,
        },
      })

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error as any }))
        return {
          success: false,
          error: error as any,
          message: error.message,
        }
      }

      return {
        success: true,
        message: 'Redirecting to provider...',
      }
    } catch (error) {
      const authError = error as any
      setAuthState(prev => ({ ...prev, loading: false, error: authError }))
      return {
        success: false,
        error: authError,
        message: authError.message || 'An error occurred during OAuth sign in',
      }
    }
  }, [])

  // Reset password
  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password?type=recovery`,
      })

      setAuthState(prev => ({ ...prev, loading: false }))

      if (error) {
        return {
          success: false,
          error: error as any,
          message: error.message,
        }
      }

      return {
        success: true,
        message: 'Check your email for a password reset link',
      }
    } catch (error) {
      const authError = error as any
      setAuthState(prev => ({ ...prev, loading: false, error: authError }))
      return {
        success: false,
        error: authError,
        message: authError.message || 'An error occurred during password reset',
      }
    }
  }, [])

  // Update password
  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const { error } = await supabase.auth.updateUser({
        password,
      })

      setAuthState(prev => ({ ...prev, loading: false }))

      if (error) {
        return {
          success: false,
          error: error as any,
          message: error.message,
        }
      }

      return {
        success: true,
        message: 'Password updated successfully',
      }
    } catch (error) {
      const authError = error as any
      setAuthState(prev => ({ ...prev, loading: false, error: authError }))
      return {
        success: false,
        error: authError,
        message: authError.message || 'An error occurred during password update',
      }
    }
  }, [])

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<AuthResult> => {
    try {
      if (!authState.user) {
        return {
          success: false,
          message: 'No user logged in',
        }
      }

      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authState.user.id)

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error as any }))
        return {
          success: false,
          error: error as any,
          message: error.message,
        }
      }

      // Reload profile
      const profile = await loadProfile(authState.user.id)
      setAuthState(prev => ({ ...prev, profile, loading: false }))

      return {
        success: true,
        message: 'Profile updated successfully',
      }
    } catch (error) {
      const authError = error as any
      setAuthState(prev => ({ ...prev, loading: false, error: authError }))
      return {
        success: false,
        error: authError,
        message: authError.message || 'An error occurred during profile update',
      }
    }
  }, [authState.user, loadProfile])

  // Refresh session
  const refreshSession = useCallback(async (): Promise<AuthSession | null> => {
    try {
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error('Error refreshing session:', error)
        return null
      }

      if (data.session) {
        await updateAuthState(data.session as AuthSession)
        return data.session as AuthSession
      }

      return null
    } catch (error) {
      console.error('Error refreshing session:', error)
      return null
    }
  }, [updateAuthState])

  // Enable MFA
  const enableMFA = useCallback(async (): Promise<MFAResult> => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      })

      if (error) {
        return {
          success: false,
          error: error as any,
          message: error.message,
        }
      }

      return {
        success: true,
        qr_code: data.totp.qr_code,
        secret: data.totp.secret,
        message: 'MFA setup initiated',
      }
    } catch (error) {
      const authError = error as any
      return {
        success: false,
        error: authError,
        message: authError.message || 'An error occurred during MFA setup',
      }
    }
  }, [])

  // Disable MFA
  const disableMFA = useCallback(async (): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: 'totp',
      })

      if (error) {
        return {
          success: false,
          error: error as any,
          message: error.message,
        }
      }

      return {
        success: true,
        message: 'MFA disabled successfully',
      }
    } catch (error) {
      const authError = error as any
      return {
        success: false,
        error: authError,
        message: authError.message || 'An error occurred during MFA disable',
      }
    }
  }, [])

  // Verify MFA
  const verifyMFA = useCallback(async (code: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: 'totp',
        challengeId: 'challenge_id', // This should come from the challenge
        code,
      })

      if (error) {
        return {
          success: false,
          error: error as any,
          message: error.message,
        }
      }

      return {
        success: true,
        message: 'MFA verified successfully',
      }
    } catch (error) {
      const authError = error as any
      return {
        success: false,
        error: authError,
        message: authError.message || 'An error occurred during MFA verification',
      }
    }
  }, [])

  // Resend verification
  const resendVerification = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) {
        return {
          success: false,
          error: error as any,
          message: error.message,
        }
      }

      return {
        success: true,
        message: 'Verification email sent',
      }
    } catch (error) {
      const authError = error as any
      return {
        success: false,
        error: authError,
        message: authError.message || 'An error occurred during verification resend',
      }
    }
  }, [])

  // Set up auth state listener
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await updateAuthState(session as AuthSession)
      } else if (event === 'SIGNED_OUT') {
        setAuthState({
          user: null,
          profile: null,
          session: null,
          loading: false,
          initialized: true,
          error: null,
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [updateAuthState])

  // Auto-refresh session
  useEffect(() => {
    if (!SESSION_CONFIG.autoRefresh || !authState.session) return

    const refreshInterval = setInterval(async () => {
      const session = authState.session
      if (!session) return

      const expiresAt = session.expires_at
      const now = Date.now() / 1000
      const timeUntilExpiry = expiresAt - now

      if (timeUntilExpiry < SESSION_CONFIG.refreshThreshold) {
        await refreshSession()
      }
    }, 60000) // Check every minute

    return () => clearInterval(refreshInterval)
  }, [authState.session, refreshSession])

  // Initialize auth state
  useEffect(() => {
    if (!initialSession) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        updateAuthState(session as AuthSession)
      })
    }
  }, [initialSession, updateAuthState])

  const contextValue: AuthContextValue = {
    ...authState,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshSession,
    enableMFA,
    disableMFA,
    verifyMFA,
    resendVerification,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    redirectTo?: string
    roles?: string[]
    subscriptionTiers?: ('free' | 'basic' | 'premium')[]
  }
) {
  return function ProtectedComponent(props: P) {
    const { user, loading, initialized } = useAuthContext()
    const router = useRouter()

    useEffect(() => {
      if (!loading && initialized && !user) {
        router.push(options?.redirectTo || AUTH_ROUTES.SIGN_IN)
      }
    }, [user, loading, initialized, router])

    if (loading || !initialized) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )
    }

    if (!user) {
      return null
    }

    return <Component {...props} />
  }
} 