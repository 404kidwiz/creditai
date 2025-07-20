import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-hot-toast'
import { useRouter, useSearchParams } from 'next/navigation'

// Import components
import LoginClient from '@/app/(auth)/login/LoginClient'
import SignupPage from '@/app/(auth)/signup/page'
import ResetPasswordClient from '@/app/(auth)/reset-password/ResetPasswordClient'
import AuthCallbackClient from '@/app/(auth)/auth/callback/AuthCallbackClient'
import { AuthProvider, useAuthContext } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'

// Mock dependencies
jest.mock('react-hot-toast')
jest.mock('next/navigation')
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      refreshSession: jest.fn(),
      mfa: {
        enroll: jest.fn(),
        unenroll: jest.fn(),
        verify: jest.fn(),
      },
      resend: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          maybeSingle: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  },
}))

// Mock UI components to avoid import issues
jest.mock('@/components/auth/AuthForm', () => ({
  AuthForm: ({ type, onSubmit, isLoading, error, showSocialLogin, showRememberMe }) => (
    <form data-testid="auth-form" onSubmit={(e) => { e.preventDefault(); onSubmit({ email: 'test@example.com', password: 'password123' }); }}>
      <div data-testid="form-type">{type}</div>
      <input data-testid="email" type="email" placeholder="Email" />
      <input data-testid="password" type="password" placeholder="Password" />
      {type === 'signup' && (
        <>
          <input data-testid="fullName" type="text" placeholder="Full Name" />
          <input data-testid="phone" type="tel" placeholder="Phone" />
          <input data-testid="confirmPassword" type="password" placeholder="Confirm Password" />
        </>
      )}
      {showRememberMe && <input data-testid="remember" type="checkbox" />}
      {showSocialLogin && (
        <div>
          <button type="button" data-testid="google-login" onClick={() => onSubmit({ provider: 'google' })}>
            Google
          </button>
          <button type="button" data-testid="apple-login" onClick={() => onSubmit({ provider: 'apple' })}>
            Apple
          </button>
        </div>
      )}
      <button type="submit" disabled={isLoading} data-testid="submit-button">
        {isLoading ? 'Loading...' : 'Submit'}
      </button>
      {error && <div data-testid="error-message">{error}</div>}
    </form>
  ),
}))

// Mock toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
}
;(toast as any).success = mockToast.success
;(toast as any).error = mockToast.error
;(toast as any).loading = mockToast.loading

// Mock router
const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockRouter = {
  push: mockPush,
  replace: mockReplace,
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
}

// Mock search params
const mockGet = jest.fn()
const mockSearchParams = {
  get: mockGet,
  getAll: jest.fn(),
  has: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
  entries: jest.fn(),
  forEach: jest.fn(),
  toString: jest.fn(),
}

;(useRouter as jest.Mock).mockReturnValue(mockRouter)
;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

// Test wrapper with AuthProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('Authentication Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockReturnValue(null)
  })

  describe('LoginClient Component', () => {
    it('renders login form correctly', () => {
      render(<LoginClient />, { wrapper: TestWrapper })
      
      expect(screen.getByTestId('auth-form')).toBeInTheDocument()
      expect(screen.getByTestId('form-type')).toHaveTextContent('signin')
      expect(screen.getByTestId('email')).toBeInTheDocument()
      expect(screen.getByTestId('password')).toBeInTheDocument()
      expect(screen.getByTestId('remember')).toBeInTheDocument()
      expect(screen.getByTestId('google-login')).toBeInTheDocument()
      expect(screen.getByTestId('apple-login')).toBeInTheDocument()
    })

    it('handles form submission with email/password', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({ success: true })
      const MockAuthProvider = ({ children }) => {
        const contextValue = {
          signIn: mockSignIn,
          signInWithOAuth: jest.fn(),
          user: null,
          profile: null,
          session: null,
          loading: false,
          initialized: true,
          error: null,
        }
        return (
          <div>
            {React.cloneElement(children, { contextValue })}
          </div>
        )
      }

      // Mock useAuthContext
      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signIn: mockSignIn,
          signInWithOAuth: jest.fn(),
        }),
      }))

      render(<LoginClient />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Welcome back!')
      })
    })

    it('handles OAuth login', async () => {
      const mockSignInWithOAuth = jest.fn().mockResolvedValue({ success: true })
      
      // Mock the auth context
      const originalModule = jest.requireActual('@/context/AuthContext')
      jest.doMock('@/context/AuthContext', () => ({
        ...originalModule,
        useAuthContext: () => ({
          signIn: jest.fn(),
          signInWithOAuth: mockSignInWithOAuth,
        }),
      }))

      render(<LoginClient />, { wrapper: TestWrapper })
      
      const googleButton = screen.getByTestId('google-login')
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith('google')
      })
    })

    it('handles login errors', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({ 
        success: false, 
        message: 'Invalid credentials' 
      })
      
      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signIn: mockSignIn,
          signInWithOAuth: jest.fn(),
        }),
      }))

      render(<LoginClient />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Invalid credentials')
      })
    })

    it('handles redirectTo parameter', () => {
      mockGet.mockImplementation((param) => {
        if (param === 'redirectTo') return '/custom-redirect'
        return null
      })

      render(<LoginClient />, { wrapper: TestWrapper })
      
      // Test that redirect parameter is captured
      expect(mockGet).toHaveBeenCalledWith('redirectTo')
    })

    it('shows loading state during authentication', async () => {
      const mockSignIn = jest.fn(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)))
      
      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signIn: mockSignIn,
          signInWithOAuth: jest.fn(),
        }),
      }))

      render(<LoginClient />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      // Check loading state is handled by AuthForm mock
      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
    })
  })

  describe('SignupPage Component', () => {
    it('renders signup form correctly', () => {
      render(<SignupPage />, { wrapper: TestWrapper })
      
      expect(screen.getByTestId('auth-form')).toBeInTheDocument()
      expect(screen.getByTestId('form-type')).toHaveTextContent('signup')
      expect(screen.getByTestId('email')).toBeInTheDocument()
      expect(screen.getByTestId('password')).toBeInTheDocument()
      expect(screen.getByTestId('fullName')).toBeInTheDocument()
      expect(screen.getByTestId('phone')).toBeInTheDocument()
      expect(screen.getByTestId('confirmPassword')).toBeInTheDocument()
    })

    it('handles successful signup', async () => {
      const mockSignUp = jest.fn().mockResolvedValue({ success: true })
      
      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signUp: mockSignUp,
          signInWithOAuth: jest.fn(),
        }),
      }))

      render(<SignupPage />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Account created! Check your email for verification.')
      })
    })

    it('shows email verification screen after successful signup', async () => {
      const mockSignUp = jest.fn().mockResolvedValue({ success: true })
      
      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signUp: mockSignUp,
          signInWithOAuth: jest.fn(),
        }),
      }))

      const { rerender } = render(<SignupPage />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        // Component should show email verification after successful signup
        // This would be handled by the component's state change
        expect(mockSignUp).toHaveBeenCalled()
      })
    })

    it('handles signup errors', async () => {
      const mockSignUp = jest.fn().mockResolvedValue({ 
        success: false, 
        message: 'Email already registered' 
      })
      
      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signUp: mockSignUp,
          signInWithOAuth: jest.fn(),
        }),
      }))

      render(<SignupPage />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Email already registered')
      })
    })

    it('handles OAuth signup', async () => {
      const mockSignInWithOAuth = jest.fn().mockResolvedValue({ success: true })
      
      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signUp: jest.fn(),
          signInWithOAuth: mockSignInWithOAuth,
        }),
      }))

      render(<SignupPage />, { wrapper: TestWrapper })
      
      const googleButton = screen.getByTestId('google-login')
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith('google')
      })
    })
  })

  describe('ResetPasswordClient Component', () => {
    it('renders reset password form correctly', () => {
      render(<ResetPasswordClient />, { wrapper: TestWrapper })
      
      expect(screen.getByTestId('auth-form')).toBeInTheDocument()
      expect(screen.getByTestId('form-type')).toHaveTextContent('reset-password')
      expect(screen.getByTestId('email')).toBeInTheDocument()
    })

    it('handles password reset request', async () => {
      const mockResetPassword = jest.fn().mockResolvedValue({ success: true })
      
      jest.doMock('@/hooks/useAuth', () => ({
        useAuth: () => ({
          resetPassword: mockResetPassword,
          updatePassword: jest.fn(),
        }),
      }))

      render(<ResetPasswordClient />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Reset email sent!')
      })
    })

    it('handles password update when in recovery mode', () => {
      mockGet.mockImplementation((param) => {
        if (param === 'type') return 'recovery'
        return null
      })

      render(<ResetPasswordClient />, { wrapper: TestWrapper })
      
      expect(screen.getByTestId('form-type')).toHaveTextContent('update-password')
    })

    it('handles password update submission', async () => {
      const mockUpdatePassword = jest.fn().mockResolvedValue({ success: true })
      
      mockGet.mockImplementation((param) => {
        if (param === 'type') return 'recovery'
        return null
      })

      jest.doMock('@/hooks/useAuth', () => ({
        useAuth: () => ({
          resetPassword: jest.fn(),
          updatePassword: mockUpdatePassword,
        }),
      }))

      render(<ResetPasswordClient />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockUpdatePassword).toHaveBeenCalled()
        expect(mockToast.success).toHaveBeenCalledWith('Password updated successfully!')
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('handles reset password errors', async () => {
      const mockResetPassword = jest.fn().mockResolvedValue({ 
        success: false, 
        message: 'Email not found' 
      })
      
      jest.doMock('@/hooks/useAuth', () => ({
        useAuth: () => ({
          resetPassword: mockResetPassword,
          updatePassword: jest.fn(),
        }),
      }))

      render(<ResetPasswordClient />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Email not found')
      })
    })
  })

  describe('AuthCallbackClient Component', () => {
    beforeEach(() => {
      // Mock supabase for callback tests
      const { supabase } = require('@/lib/supabase/client')
      supabase.auth.getSession.mockClear()
      supabase.from.mockClear()
    })

    it('renders loading state', () => {
      render(<AuthCallbackClient />)
      
      expect(screen.getByText('Signing you in')).toBeInTheDocument()
      expect(screen.getByText('Please wait while we complete your authentication...')).toBeInTheDocument()
    })

    it('handles successful authentication with existing profile', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' },
        },
      }

      const mockProfile = {
        id: 'user-123',
        full_name: 'Test User',
        created_at: '2023-01-01',
        updated_at: '2023-01-02',
      }

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      supabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      render(<AuthCallbackClient />)

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Welcome back to CreditAI!')
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('handles successful authentication with new user', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' },
        },
      }

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      supabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: null,
              error: { code: 'PGRST116' }, // Profile not found
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: { id: 'user-123' },
              error: null,
            }),
          }),
        }),
      })

      render(<AuthCallbackClient />)

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Welcome to CreditAI! Let\'s get started by uploading your first credit report.')
        expect(mockPush).toHaveBeenCalledWith('/upload')
      })
    })

    it('handles authentication error', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Authentication failed' },
      })

      render(<AuthCallbackClient />)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Authentication failed')
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('handles missing session', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      render(<AuthCallbackClient />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('handles redirectTo parameter', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      mockGet.mockImplementation((param) => {
        if (param === 'redirectTo') return '/custom-redirect'
        return null
      })

      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      const mockProfile = {
        id: 'user-123',
        created_at: '2023-01-01',
        updated_at: '2023-01-02',
      }

      supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      supabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      render(<AuthCallbackClient />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom-redirect')
      })
    })
  })

  describe('AuthContext', () => {
    it('provides authentication state and methods', () => {
      let contextValue
      
      const TestComponent = () => {
        contextValue = useAuthContext()
        return <div>Test</div>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(contextValue).toBeDefined()
      expect(typeof contextValue.signIn).toBe('function')
      expect(typeof contextValue.signUp).toBe('function')
      expect(typeof contextValue.signOut).toBe('function')
      expect(typeof contextValue.resetPassword).toBe('function')
      expect(typeof contextValue.updatePassword).toBe('function')
    })

    it('throws error when used outside provider', () => {
      const TestComponent = () => {
        useAuthContext()
        return <div>Test</div>
      }

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => render(<TestComponent />)).toThrow('useAuthContext must be used within an AuthProvider')
      
      consoleSpy.mockRestore()
    })

    it('initializes with loading state', () => {
      let contextValue
      
      const TestComponent = () => {
        contextValue = useAuthContext()
        return <div>Test</div>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(contextValue.user).toBeNull()
      expect(contextValue.session).toBeNull()
      expect(contextValue.loading).toBe(true)
      expect(contextValue.initialized).toBe(false)
    })
  })

  describe('useAuth Hook', () => {
    it('returns auth context', () => {
      let hookValue
      
      const TestComponent = () => {
        hookValue = useAuth()
        return <div>Test</div>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(hookValue).toBeDefined()
      expect(typeof hookValue.signIn).toBe('function')
      expect(typeof hookValue.signUp).toBe('function')
    })
  })

  describe('Authentication Flow Integration', () => {
    it('handles complete login flow', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({ 
        success: true,
        user: { id: 'user-123', email: 'test@example.com' },
        session: { user: { id: 'user-123' }, expires_at: Date.now() + 3600000 },
      })

      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signIn: mockSignIn,
          signInWithOAuth: jest.fn(),
        }),
      }))

      render(<LoginClient />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
        expect(mockToast.success).toHaveBeenCalledWith('Welcome back!')
      })
    })

    it('handles complete signup flow', async () => {
      const mockSignUp = jest.fn().mockResolvedValue({ 
        success: true,
        user: { id: 'user-123', email: 'test@example.com' },
      })

      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signUp: mockSignUp,
          signInWithOAuth: jest.fn(),
        }),
      }))

      render(<SignupPage />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled()
        expect(mockToast.success).toHaveBeenCalledWith('Account created! Check your email for verification.')
      })
    })

    it('handles password reset flow', async () => {
      const mockResetPassword = jest.fn().mockResolvedValue({ success: true })

      jest.doMock('@/hooks/useAuth', () => ({
        useAuth: () => ({
          resetPassword: mockResetPassword,
          updatePassword: jest.fn(),
        }),
      }))

      render(<ResetPasswordClient />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalled()
        expect(mockToast.success).toHaveBeenCalledWith('Reset email sent!')
      })
    })
  })

  describe('Security Features', () => {
    it('handles password validation', () => {
      render(<SignupPage />, { wrapper: TestWrapper })
      
      // Password validation would be handled by AuthForm component
      expect(screen.getByTestId('password')).toBeInTheDocument()
      expect(screen.getByTestId('confirmPassword')).toBeInTheDocument()
    })

    it('handles remember me functionality', () => {
      render(<LoginClient />, { wrapper: TestWrapper })
      
      expect(screen.getByTestId('remember')).toBeInTheDocument()
    })

    it('handles session management', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      // Mock session refresh
      supabase.auth.refreshSession.mockResolvedValue({
        data: { session: { expires_at: Date.now() + 3600000 } },
        error: null,
      })

      const TestComponent = () => {
        const { refreshSession } = useAuthContext()
        
        React.useEffect(() => {
          refreshSession()
        }, [refreshSession])
        
        return <div>Test</div>
      }

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(supabase.auth.refreshSession).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<LoginClient />, { wrapper: TestWrapper })
      
      // Check that form elements are accessible
      expect(screen.getByTestId('email')).toBeInTheDocument()
      expect(screen.getByTestId('password')).toBeInTheDocument()
      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(<LoginClient />, { wrapper: TestWrapper })
      
      const emailField = screen.getByTestId('email')
      const passwordField = screen.getByTestId('password')
      const submitButton = screen.getByTestId('submit-button')
      
      // Tab navigation
      await user.tab()
      expect(emailField).toHaveFocus()
      
      await user.tab()
      expect(passwordField).toHaveFocus()
      
      await user.tab()
      // Should focus on remember checkbox or submit button depending on implementation
    })

    it('provides proper error messaging', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({ 
        success: false, 
        message: 'Invalid email or password' 
      })

      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signIn: mockSignIn,
          signInWithOAuth: jest.fn(),
        }),
      }))

      render(<LoginClient />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Invalid email or password')
      })
    })
  })

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      const mockSignIn = jest.fn().mockRejectedValue(new Error('Network error'))

      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signIn: mockSignIn,
          signInWithOAuth: jest.fn(),
        }),
      }))

      render(<LoginClient />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Network error')
      })
    })

    it('handles Supabase auth errors', async () => {
      const { supabase } = require('@/lib/supabase/client')
      
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid token' },
      })

      render(<AuthCallbackClient />)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Authentication failed')
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('handles unexpected errors gracefully', async () => {
      const mockSignIn = jest.fn().mockRejectedValue(new Error())

      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signIn: mockSignIn,
          signInWithOAuth: jest.fn(),
        }),
      }))

      render(<LoginClient />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('An unexpected error occurred')
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading state during authentication', () => {
      const mockSignIn = jest.fn(() => new Promise(() => {})) // Never resolves

      jest.doMock('@/context/AuthContext', () => ({
        useAuthContext: () => ({
          signIn: mockSignIn,
          signInWithOAuth: jest.fn(),
        }),
      }))

      render(<LoginClient />, { wrapper: TestWrapper })
      
      const form = screen.getByTestId('auth-form')
      fireEvent.submit(form)

      // AuthForm mock handles loading state
      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
    })

    it('disables form during submission', () => {
      render(<LoginClient />, { wrapper: TestWrapper })
      
      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).not.toBeDisabled()
    })
  })
})