/**
 * Signup Component
 * Handles user registration
 */

import React, { useState } from 'react'
import { createLogger } from '@/lib/logging'

// Initialize logger
const logger = createLogger('auth:signup')

interface SignupProps {
  onSignup: (name: string, email: string, password: string) => Promise<void>
  onLoginClick: () => void
}

const Signup: React.FC<SignupProps> = ({ onSignup, onLoginClick }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!name) {
      setError('Name is required')
      return
    }
    
    if (!email) {
      setError('Email is required')
      return
    }
    
    if (!password) {
      setError('Password is required')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    
    // Password strength validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      await onSignup(name, email, password)
      
      logger.info('User signed up successfully', { email })
    } catch (error) {
      logger.error('Signup failed', error as Error)
      setError('Failed to create account. Email may already be in use.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Create Account</h2>
        
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              disabled={loading}
              autoComplete="name"
              data-testid="name-input"
            />
          </div>
          
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
              autoComplete="new-password"
              data-testid="password-input"
            />
            <small className="form-hint">
              Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="new-password"
              data-testid="confirm-password-input"
            />
          </div>
          
          <button
            type="submit"
            className="auth-button"
            disabled={loading}
            data-testid="signup-button"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-links">
          <button
            type="button"
            className="auth-link"
            onClick={onLoginClick}
            disabled={loading}
            data-testid="login-link"
          >
            Already have an account? Sign In
          </button>
        </div>
      </div>
    </div>
  )
}

export default Signup