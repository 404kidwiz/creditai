import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/context/AuthContext'
import { AuthState, AuthContextValue } from '@/types/auth'

// Extended render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialAuthState?: Partial<AuthState>
  authMethods?: Partial<Pick<AuthContextValue, 'signIn' | 'signUp' | 'signOut' | 'resetPassword' | 'updatePassword'>>
}

// Mock auth context provider for testing
export const MockAuthProvider: React.FC<{
  children: React.ReactNode
  value?: Partial<AuthContextValue>
}> = ({ children, value = {} }) => {
  const defaultValue: AuthContextValue = {
    // Default state
    user: null,
    profile: null,
    session: null,
    loading: false,
    initialized: true,
    error: null,
    
    // Default methods (mocked)
    signIn: jest.fn().mockResolvedValue({ success: true }),
    signUp: jest.fn().mockResolvedValue({ success: true }),
    signOut: jest.fn().mockResolvedValue(undefined),
    signInWithOAuth: jest.fn().mockResolvedValue({ success: true }),
    resetPassword: jest.fn().mockResolvedValue({ success: true }),
    updatePassword: jest.fn().mockResolvedValue({ success: true }),
    updateProfile: jest.fn().mockResolvedValue({ success: true }),
    refreshProfile: jest.fn().mockResolvedValue(undefined),
    refreshSession: jest.fn().mockResolvedValue(null),
    enableMFA: jest.fn().mockResolvedValue({ success: true }),
    disableMFA: jest.fn().mockResolvedValue({ success: true }),
    verifyMFA: jest.fn().mockResolvedValue({ success: true }),
    resendVerification: jest.fn().mockResolvedValue({ success: true }),
    
    // Override with provided values
    ...value,
  }

  // Mock the context
  const AuthContext = React.createContext<AuthContextValue>(defaultValue)
  
  return (
    <AuthContext.Provider value={defaultValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom render function with auth provider
export const renderWithAuth = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialAuthState, authMethods, ...renderOptions } = options

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <MockAuthProvider value={{ ...initialAuthState, ...authMethods }}>
      {children}
    </MockAuthProvider>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Helper to create mock user data
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    phone: '+1234567890',
  },
  app_metadata: {
    provider: 'email',
  },
  aud: 'authenticated',
  confirmation_sent_at: '2023-01-01T00:00:00Z',
  confirmed_at: '2023-01-01T00:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
  email_confirmed_at: '2023-01-01T00:00:00Z',
  last_sign_in_at: '2023-01-01T00:00:00Z',
  phone: '',
  role: 'authenticated',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
})

// Helper to create mock session data
export const createMockSession = (userOverrides = {}) => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: createMockUser(userOverrides),
})

// Helper to create mock profile data
export const createMockProfile = (overrides = {}) => ({
  id: 'test-user-id',
  full_name: 'Test User',
  phone: '+1234567890',
  subscription_tier: 'free' as const,
  subscription_status: 'active' as const,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
})

// Mock Supabase auth methods
export const createMockSupabaseAuth = () => ({
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  signInWithOAuth: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
  getSession: jest.fn(),
  getUser: jest.fn(),
  onAuthStateChange: jest.fn(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  })),
  refreshSession: jest.fn(),
  mfa: {
    enroll: jest.fn(),
    unenroll: jest.fn(),
    verify: jest.fn(),
    challenge: jest.fn(),
    challengeAndVerify: jest.fn(),
    getAuthenticatorAssuranceLevel: jest.fn(),
    listFactors: jest.fn(),
  },
  resend: jest.fn(),
  setSession: jest.fn(),
  admin: {
    deleteUser: jest.fn(),
    createUser: jest.fn(),
    updateUserById: jest.fn(),
    listUsers: jest.fn(),
  },
})

// Mock Supabase database methods
export const createMockSupabaseDb = () => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        maybeSingle: jest.fn(),
      })),
      neq: jest.fn(() => ({
        single: jest.fn(),
      })),
      gt: jest.fn(() => ({
        single: jest.fn(),
      })),
      lt: jest.fn(() => ({
        single: jest.fn(),
      })),
      gte: jest.fn(() => ({
        single: jest.fn(),
      })),
      lte: jest.fn(() => ({
        single: jest.fn(),
      })),
      like: jest.fn(() => ({
        single: jest.fn(),
      })),
      ilike: jest.fn(() => ({
        single: jest.fn(),
      })),
      is: jest.fn(() => ({
        single: jest.fn(),
      })),
      in: jest.fn(() => ({
        single: jest.fn(),
      })),
      contains: jest.fn(() => ({
        single: jest.fn(),
      })),
      containedBy: jest.fn(() => ({
        single: jest.fn(),
      })),
      rangeGt: jest.fn(() => ({
        single: jest.fn(),
      })),
      rangeGte: jest.fn(() => ({
        single: jest.fn(),
      })),
      rangeLt: jest.fn(() => ({
        single: jest.fn(),
      })),
      rangeLte: jest.fn(() => ({
        single: jest.fn(),
      })),
      rangeAdjacent: jest.fn(() => ({
        single: jest.fn(),
      })),
      overlaps: jest.fn(() => ({
        single: jest.fn(),
      })),
      textSearch: jest.fn(() => ({
        single: jest.fn(),
      })),
      match: jest.fn(() => ({
        single: jest.fn(),
      })),
      not: jest.fn(() => ({
        single: jest.fn(),
      })),
      or: jest.fn(() => ({
        single: jest.fn(),
      })),
      filter: jest.fn(() => ({
        single: jest.fn(),
      })),
      order: jest.fn(() => ({
        single: jest.fn(),
      })),
      limit: jest.fn(() => ({
        single: jest.fn(),
      })),
      range: jest.fn(() => ({
        single: jest.fn(),
      })),
      abortSignal: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(),
      match: jest.fn(),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
      match: jest.fn(),
    })),
    upsert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
})

// Auth form test data
export const validLoginData = {
  email: 'test@example.com',
  password: 'password123',
  remember: true,
}

export const validSignupData = {
  email: 'test@example.com',
  password: 'password123',
  confirmPassword: 'password123',
  fullName: 'Test User',
  phone: '+1234567890',
  agreeToTerms: true,
}

export const validResetPasswordData = {
  email: 'test@example.com',
}

export const validUpdatePasswordData = {
  password: 'newpassword123',
  confirmPassword: 'newpassword123',
}

// Error scenarios
export const authErrors = {
  invalidCredentials: {
    message: 'Invalid login credentials',
    status: 400,
  },
  emailNotConfirmed: {
    message: 'Email not confirmed',
    status: 400,
  },
  weakPassword: {
    message: 'Password should be at least 6 characters',
    status: 422,
  },
  emailAlreadyExists: {
    message: 'User already registered',
    status: 422,
  },
  networkError: {
    message: 'Network request failed',
    status: 0,
  },
  tooManyRequests: {
    message: 'Too many requests',
    status: 429,
  },
}

// Utility to wait for async operations
export const waitForAuthOperation = async (operation: () => Promise<any>, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Auth operation timed out'))
    }, timeout)

    operation()
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

// Helper to simulate form submissions
export const simulateFormSubmission = async (form: HTMLFormElement, data: Record<string, any>) => {
  // Fill form fields
  Object.entries(data).forEach(([key, value]) => {
    const field = form.querySelector(`[name="${key}"]`) as HTMLInputElement
    if (field) {
      if (field.type === 'checkbox') {
        field.checked = Boolean(value)
      } else {
        field.value = String(value)
      }
    }
  })

  // Trigger form submission
  const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
  form.dispatchEvent(submitEvent)
}

// Accessibility test helpers
export const checkAccessibility = (element: HTMLElement) => {
  // Check for proper ARIA attributes
  const hasAriaLabel = element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby')
  const hasRole = element.hasAttribute('role')
  
  return {
    hasAriaLabel,
    hasRole,
    isAccessible: hasAriaLabel || hasRole,
  }
}

// Security test helpers
export const validatePasswordStrength = (password: string) => {
  const minLength = password.length >= 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  return {
    minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSymbols,
    score: [minLength, hasUpperCase, hasLowerCase, hasNumbers, hasSymbols].filter(Boolean).length,
    isStrong: minLength && hasUpperCase && hasLowerCase && hasNumbers,
  }
}

// Performance test helpers
export const measureAuthPerformance = async (operation: () => Promise<any>) => {
  const startTime = performance.now()
  
  try {
    const result = await operation()
    const endTime = performance.now()
    
    return {
      result,
      duration: endTime - startTime,
      success: true,
    }
  } catch (error) {
    const endTime = performance.now()
    
    return {
      error,
      duration: endTime - startTime,
      success: false,
    }
  }
}

const authTestUtils = {
  renderWithAuth,
  MockAuthProvider,
  createMockUser,
  createMockSession,
  createMockProfile,
  createMockSupabaseAuth,
  createMockSupabaseDb,
  validLoginData,
  validSignupData,
  validResetPasswordData,
  validUpdatePasswordData,
  authErrors,
  waitForAuthOperation,
  simulateFormSubmission,
  checkAccessibility,
  validatePasswordStrength,
  measureAuthPerformance,
}

export default authTestUtils