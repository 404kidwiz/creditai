import { User, Session, AuthError } from '@supabase/supabase-js'
import { Profile } from './database'

// =============================================
// Auth Types
// =============================================

export interface AuthUser extends User {
  user_metadata: {
    full_name?: string
    phone?: string
    avatar_url?: string
    provider?: string
    mfa_enabled?: boolean
  }
  app_metadata: {
    provider?: string
    providers?: string[]
  }
}

export interface AuthSession extends Session {
  user: AuthUser
}

export interface AuthProfile extends Profile {
  user: AuthUser
}

// =============================================
// Auth State Types
// =============================================

export interface AuthState {
  user: AuthUser | null
  profile: Profile | null
  session: AuthSession | null
  loading: boolean
  initialized: boolean
  error: AuthError | null
}

export interface AuthActions {
  signIn: (email: string, password: string, options?: SignInOptions) => Promise<AuthResult>
  signUp: (email: string, password: string, metadata?: UserMetadata) => Promise<AuthResult>
  signOut: () => Promise<void>
  signInWithOAuth: (provider: OAuthProvider, options?: OAuthOptions) => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
  updatePassword: (password: string) => Promise<AuthResult>
  updateProfile: (updates: Partial<Profile>) => Promise<AuthResult>
  refreshSession: () => Promise<AuthSession | null>
  enableMFA: () => Promise<MFAResult>
  disableMFA: () => Promise<AuthResult>
  verifyMFA: (code: string) => Promise<AuthResult>
  resendVerification: (email: string) => Promise<AuthResult>
}

export interface AuthContextValue extends AuthState, AuthActions {}

// =============================================
// Form Types
// =============================================

export interface SignInFormData {
  email: string
  password: string
  remember?: boolean
}

export interface SignUpFormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  phone?: string
  agreeToTerms: boolean
}

export interface ResetPasswordFormData {
  email: string
}

export interface UpdatePasswordFormData {
  password: string
  confirmPassword: string
}

export interface ProfileFormData {
  fullName: string
  phone?: string
  subscriptionTier: 'free' | 'basic' | 'premium'
}

export interface MFASetupFormData {
  code: string
}

// =============================================
// Auth Options
// =============================================

export interface SignInOptions {
  remember?: boolean
  redirectTo?: string
  captchaToken?: string
}

export interface OAuthOptions {
  redirectTo?: string
  scopes?: string
  queryParams?: Record<string, string>
}

export interface UserMetadata {
  full_name?: string
  phone?: string | undefined
  avatar_url?: string
}

// =============================================
// Result Types
// =============================================

export interface AuthResult {
  user?: AuthUser | null
  session?: AuthSession | null
  error?: AuthError | null
  success: boolean
  message?: string
}

export interface MFAResult {
  qr_code?: string
  secret?: string
  backup_codes?: string[]
  error?: AuthError | null
  success: boolean
  message?: string
}

// =============================================
// Provider Types
// =============================================

export type OAuthProvider = 'google' | 'apple' | 'github' | 'facebook' | 'twitter'

export interface OAuthConfig {
  provider: OAuthProvider
  clientId: string
  clientSecret: string
  redirectUrl: string
  scopes?: string[]
}

// =============================================
// Auth Event Types
// =============================================

export type AuthEventType = 
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'MFA_CHALLENGE_VERIFIED'

export interface AuthEvent {
  type: AuthEventType
  session: AuthSession | null
  user: AuthUser | null
  timestamp: Date
}

// =============================================
// Route Protection Types
// =============================================

export interface RouteConfig {
  path: string
  protected: boolean
  redirectTo?: string
  roles?: string[]
  subscriptionTiers?: ('free' | 'basic' | 'premium')[]
}

export interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  roles?: string[]
  subscriptionTiers?: ('free' | 'basic' | 'premium')[]
  fallback?: React.ReactNode
}

// =============================================
// Session Types
// =============================================

export interface SessionConfig {
  maxAge: number // in seconds
  autoRefresh: boolean
  refreshThreshold: number // in seconds
  persistSession: boolean
  storage: 'localStorage' | 'sessionStorage' | 'cookie'
}

export interface SessionStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

// =============================================
// Auth Error Types
// =============================================

export interface AuthErrorDetails {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: Date
}

export type AuthErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_NOT_CONFIRMED'
  | 'TOO_MANY_REQUESTS'
  | 'INVALID_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'WEAK_PASSWORD'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'SIGNUP_DISABLED'
  | 'INVALID_EMAIL'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

// =============================================
// Auth Hook Types
// =============================================

export interface UseAuthReturn extends AuthState, AuthActions {
  isAuthenticated: boolean
  isLoading: boolean
  isError: boolean
  canAccess: (requiredRole?: string, requiredTier?: string) => boolean
}

// =============================================
// Auth Form Validation Types
// =============================================

export interface AuthFormErrors {
  email?: string[]
  password?: string[]
  confirmPassword?: string[]
  fullName?: string[]
  phone?: string[]
  code?: string[]
  general?: string[]
}

export interface AuthFormState {
  isSubmitting: boolean
  errors: AuthFormErrors
  touched: Record<string, boolean>
  isDirty: boolean
  isValid: boolean
}

// =============================================
// Auth Component Props
// =============================================

export interface AuthFormProps {
  type: 'signin' | 'signup' | 'reset-password' | 'update-password'
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
  error?: string | undefined
  redirectTo?: string
  showSocialLogin?: boolean
  showRememberMe?: boolean
  className?: string
}

export interface SocialLoginProps {
  providers: OAuthProvider[]
  onProviderClick: (provider: OAuthProvider) => Promise<void>
  isLoading?: boolean
  className?: string
}

// =============================================
// Auth Constants
// =============================================

export const AUTH_ROUTES = {
  SIGN_IN: '/login',
  SIGN_UP: '/signup',
  RESET_PASSWORD: '/reset-password',
  UPDATE_PASSWORD: '/update-password',
  PROFILE: '/profile',
  MFA_SETUP: '/mfa-setup',
  VERIFY_EMAIL: '/verify-email',
  DASHBOARD: '/dashboard',
  HOME: '/',
} as const

export const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/settings',
  '/disputes',
  '/reports',
  '/documents',
] as const

export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/verify-email',
  '/privacy',
  '/terms',
  '/about',
  '/contact',
] as const

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic', 
  PREMIUM: 'premium',
} as const

export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  APPLE: 'apple',
  GITHUB: 'github',
  FACEBOOK: 'facebook',
  TWITTER: 'twitter',
} as const 