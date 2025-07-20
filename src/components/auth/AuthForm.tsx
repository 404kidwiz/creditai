'use client'

import React, { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, Phone, Apple, Chrome, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Alert } from '@/components/ui/Alert'
import { AuthFormProps, OAuthProvider } from '@/types/auth'

interface SocialLoginButtonProps {
  provider: OAuthProvider
  onClick: () => void
  isLoading?: boolean
  disabled?: boolean
}

function SocialLoginButton({ provider, onClick, isLoading, disabled }: SocialLoginButtonProps) {
  const icons = {
    google: Chrome,
    apple: Apple,
    github: Chrome,
    facebook: Chrome,
    twitter: Chrome,
  }

  const labels = {
    google: 'Continue with Google',
    apple: 'Continue with Apple',
    github: 'Continue with GitHub', 
    facebook: 'Continue with Facebook',
    twitter: 'Continue with Twitter',
  }

  const Icon = icons[provider]

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full flex items-center justify-center gap-2 h-11"
      onClick={onClick}
      disabled={isLoading || disabled}
    >
      <Icon className="w-5 h-5" />
      {labels[provider]}
    </Button>
  )
}

export function AuthForm({
  type,
  onSubmit,
  isLoading = false,
  error,
  showSocialLogin = true,
  showRememberMe = true,
  className,
}: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [socialLoading, setSocialLoading] = useState<OAuthProvider | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    remember: true,
    agreeToTerms: false,
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSocialLogin = async (provider: OAuthProvider) => {
    setSocialLoading(provider)
    try {
      await onSubmit({ provider })
    } catch (error) {
      console.error(`${provider} login error:`, error)
    } finally {
      setSocialLoading(null)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const getTitle = () => {
    switch (type) {
      case 'signin':
        return 'Welcome back'
      case 'signup':
        return 'Create your account'
      case 'reset-password':
        return 'Reset your password'
      case 'update-password':
        return 'Update your password'
      default:
        return 'Authentication'
    }
  }

  const getSubtitle = () => {
    switch (type) {
      case 'signin':
        return 'Sign in to your account to continue'
      case 'signup':
        return 'Get started with your free account'
      case 'reset-password':
        return 'Enter your email to receive a reset link'
      case 'update-password':
        return 'Enter your new password'
      default:
        return ''
    }
  }

  const getSubmitText = () => {
    switch (type) {
      case 'signin':
        return 'Sign In'
      case 'signup':
        return 'Create Account'
      case 'reset-password':
        return 'Send Reset Link'
      case 'update-password':
        return 'Update Password'
      default:
        return 'Submit'
    }
  }

  return (
    <div className={cn('w-full max-w-md space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {getTitle()}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {getSubtitle()}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </Alert>
      )}

      {/* Social Login */}
      {showSocialLogin && (type === 'signin' || type === 'signup') && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <SocialLoginButton
              provider="google"
              onClick={() => handleSocialLogin('google')}
              isLoading={socialLoading === 'google'}
              disabled={isLoading || !!socialLoading}
            />
            <SocialLoginButton
              provider="apple"
              onClick={() => handleSocialLogin('apple')}
              isLoading={socialLoading === 'apple'}
              disabled={isLoading || !!socialLoading}
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-950 text-gray-500">
                Or continue with email
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-10"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </div>

        {/* Full Name (signup only) */}
        {type === 'signup' && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                className="pl-10"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          </div>
        )}

        {/* Phone (signup only) */}
        {type === 'signup' && (
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                className="pl-10"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                autoComplete="tel"
              />
            </div>
          </div>
        )}

        {/* Password */}
        {(type === 'signin' || type === 'signup' || type === 'update-password') && (
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className="pl-10 pr-10"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                autoComplete={type === 'signin' ? 'current-password' : 'new-password'}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Confirm Password */}
        {(type === 'signup' || type === 'update-password') && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                className="pl-10 pr-10"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                autoComplete="new-password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Remember Me */}
        {showRememberMe && type === 'signin' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={formData.remember}
                onChange={(e) => handleChange('remember', e.target.checked)}
              />
              <Label htmlFor="remember" className="text-sm">
                Remember me
              </Label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-sm text-blue-600 hover:text-blue-700"
              onClick={() => {
                window.location.href = '/reset-password'
              }}
            >
              Forgot password?
            </Button>
          </div>
        )}

        {/* Terms and Conditions */}
        {type === 'signup' && (
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <input
                id="agreeToTerms"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                checked={formData.agreeToTerms}
                onChange={(e) => handleChange('agreeToTerms', e.target.checked)}
                required
              />
              <Label htmlFor="agreeToTerms" className="text-sm leading-5">
                I agree to the{' '}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto text-blue-600 hover:text-blue-700 underline"
                >
                  Terms and Conditions
                </Button>{' '}
                and{' '}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto text-blue-600 hover:text-blue-700 underline"
                >
                  Privacy Policy
                </Button>
              </Label>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Please wait...</span>
            </div>
          ) : (
            getSubmitText()
          )}
        </Button>
      </form>

      {/* Footer Links */}
      <div className="text-center text-sm">
        {type === 'signin' && (
          <p className="text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-blue-600 hover:text-blue-700 underline"
              onClick={() => (window.location.href = '/signup')}
            >
              Sign up
            </Button>
          </p>
        )}
        {type === 'signup' && (
          <p className="text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-blue-600 hover:text-blue-700 underline"
              onClick={() => (window.location.href = '/login')}
            >
              Sign in
            </Button>
          </p>
        )}
      </div>
    </div>
  )
} 