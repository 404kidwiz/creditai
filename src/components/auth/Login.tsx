/**
 * Login Component
 * Handles user authentication
 */

import React, { useState } from 'react'
import { createLogger } from '@/lib/logging'

// Initialize logger
const logger = createLogger('auth:login')

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>
  onSignupClick: () => void
  onResetPasswordClick: () => void
}

const Login: React.FC<LoginProps> = ({ onLogin, onSignupClick, onResetPasswordClick }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!email) {
      setError('Email is required')
      return
    }
    
    if (!password) {
      setError('Password is required')
      return
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      await onLogin(email, password)
      
      logger.info('User logged in successfully', { email })
    } catch (error) {
      logger.error('Login failed', error as Error)
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Sign In</h2>
        
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              autoComplete="email"
              data-testid="email-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="current-password"
              data-testid="password-input"
            />
          </div>
          
          <button
            type="submit"
            className="auth-button"
            disabled={loading}
            data-testid="login-button"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <div className="auth-links">
          <button
            type="button"
            className="auth-link"
            onClick={onResetPasswordClick}
            disabled={loading}
            data-testid="reset-password-link"
          >
            Forgot Password?
          </button>
          
          <button
            type="button"
            className="auth-link"
            onClick={onSignupClick}
            disabled={loading}
            data-testid="signup-link"
          >
            Don't have an account? Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login