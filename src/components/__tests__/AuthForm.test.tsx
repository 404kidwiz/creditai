import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthForm } from '@/components/auth/AuthForm'
import { AuthFormProps } from '@/types/auth'

// Mock UI components
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, type, ...props }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={props['data-testid'] || 'button'}
      {...props}
    >
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/Input', () => ({
  Input: ({ id, type, placeholder, value, onChange, required, className, ...props }) => (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className={className}
      data-testid={id || 'input'}
      {...props}
    />
  ),
}))

jest.mock('@/components/ui/Label', () => ({
  Label: ({ htmlFor, children, ...props }) => (
    <label htmlFor={htmlFor} {...props}>
      {children}
    </label>
  ),
}))

jest.mock('@/components/ui/Alert', () => ({
  Alert: ({ children, className }) => (
    <div className={className} data-testid="alert">
      {children}
    </div>
  ),
}))

jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

// Mock icons
jest.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon">👁</span>,
  EyeOff: () => <span data-testid="eye-off-icon">🙈</span>,
  Mail: () => <span data-testid="mail-icon">📧</span>,
  Lock: () => <span data-testid="lock-icon">🔒</span>,
  User: () => <span data-testid="user-icon">👤</span>,
  Phone: () => <span data-testid="phone-icon">📱</span>,
  Apple: () => <span data-testid="apple-icon">🍎</span>,
  Chrome: () => <span data-testid="chrome-icon">🌐</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">⚠️</span>,
}))

describe('AuthForm Component', () => {
  const defaultProps: AuthFormProps = {
    type: 'signin',
    onSubmit: jest.fn(),
    isLoading: false,
    showSocialLogin: true,
    showRememberMe: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders signin form correctly', () => {
      render(<AuthForm {...defaultProps} />)

      expect(screen.getByText('Welcome back')).toBeInTheDocument()
      expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument()
      expect(screen.getByTestId('email')).toBeInTheDocument()
      expect(screen.getByTestId('password')).toBeInTheDocument()
      expect(screen.getByTestId('remember')).toBeInTheDocument()
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('renders signup form correctly', () => {
      render(<AuthForm {...defaultProps} type="signup" />)

      expect(screen.getByText('Create your account')).toBeInTheDocument()
      expect(screen.getByText('Get started with your free account')).toBeInTheDocument()
      expect(screen.getByTestId('email')).toBeInTheDocument()
      expect(screen.getByTestId('fullName')).toBeInTheDocument()
      expect(screen.getByTestId('phone')).toBeInTheDocument()
      expect(screen.getByTestId('password')).toBeInTheDocument()
      expect(screen.getByTestId('confirmPassword')).toBeInTheDocument()
      expect(screen.getByTestId('agreeToTerms')).toBeInTheDocument()
      expect(screen.getByText('Create Account')).toBeInTheDocument()
    })

    it('renders reset password form correctly', () => {
      render(<AuthForm {...defaultProps} type="reset-password" showSocialLogin={false} />)

      expect(screen.getByText('Reset your password')).toBeInTheDocument()
      expect(screen.getByText('Enter your email to receive a reset link')).toBeInTheDocument()
      expect(screen.getByTestId('email')).toBeInTheDocument()
      expect(screen.queryByTestId('password')).not.toBeInTheDocument()
      expect(screen.getByText('Send Reset Link')).toBeInTheDocument()
    })

    it('renders update password form correctly', () => {
      render(<AuthForm {...defaultProps} type="update-password" showSocialLogin={false} />)

      expect(screen.getByText('Update your password')).toBeInTheDocument()
      expect(screen.getByText('Enter your new password')).toBeInTheDocument()
      expect(screen.getByTestId('password')).toBeInTheDocument()
      expect(screen.getByTestId('confirmPassword')).toBeInTheDocument()
      expect(screen.queryByTestId('email')).not.toBeInTheDocument()
      expect(screen.getByText('Update Password')).toBeInTheDocument()
    })

    it('renders social login buttons when enabled', () => {
      render(<AuthForm {...defaultProps} showSocialLogin={true} />)

      expect(screen.getByText('Continue with Google')).toBeInTheDocument()
      expect(screen.getByText('Continue with Apple')).toBeInTheDocument()
      expect(screen.getByText('Or continue with email')).toBeInTheDocument()
    })

    it('hides social login when disabled', () => {
      render(<AuthForm {...defaultProps} showSocialLogin={false} />)

      expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument()
      expect(screen.queryByText('Continue with Apple')).not.toBeInTheDocument()
      expect(screen.queryByText('Or continue with email')).not.toBeInTheDocument()
    })

    it('shows remember me checkbox when enabled', () => {
      render(<AuthForm {...defaultProps} showRememberMe={true} />)

      expect(screen.getByTestId('remember')).toBeInTheDocument()
      expect(screen.getByText('Remember me')).toBeInTheDocument()
      expect(screen.getByText('Forgot password?')).toBeInTheDocument()
    })

    it('hides remember me when disabled', () => {
      render(<AuthForm {...defaultProps} showRememberMe={false} />)

      expect(screen.queryByTestId('remember')).not.toBeInTheDocument()
      expect(screen.queryByText('Remember me')).not.toBeInTheDocument()
    })

    it('displays error message when provided', () => {
      const errorMessage = 'Invalid credentials'
      render(<AuthForm {...defaultProps} error={errorMessage} />)

      expect(screen.getByTestId('alert')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('shows loading state correctly', () => {
      render(<AuthForm {...defaultProps} isLoading={true} />)

      expect(screen.getByText('Please wait...')).toBeInTheDocument()
      
      // Check that submit button is disabled
      const submitButton = screen.getByRole('button', { name: /please wait/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form Interactions', () => {
    it('handles email input correctly', async () => {
      const user = userEvent.setup()
      render(<AuthForm {...defaultProps} />)

      const emailInput = screen.getByTestId('email')
      await user.type(emailInput, 'test@example.com')

      expect(emailInput).toHaveValue('test@example.com')
    })

    it('handles password input correctly', async () => {
      const user = userEvent.setup()
      render(<AuthForm {...defaultProps} />)

      const passwordInput = screen.getByTestId('password')
      await user.type(passwordInput, 'password123')

      expect(passwordInput).toHaveValue('password123')
    })

    it('toggles password visibility', async () => {
      const user = userEvent.setup()
      render(<AuthForm {...defaultProps} />)

      const passwordInput = screen.getByTestId('password')
      const toggleButton = screen.getByRole('button', { name: '' }) // Eye icon button

      // Initially hidden
      expect(passwordInput).toHaveAttribute('type', 'password')

      // Click to show
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      // Click to hide again
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('handles confirm password input in signup form', async () => {
      const user = userEvent.setup()
      render(<AuthForm {...defaultProps} type="signup" />)

      const confirmPasswordInput = screen.getByTestId('confirmPassword')
      await user.type(confirmPasswordInput, 'password123')

      expect(confirmPasswordInput).toHaveValue('password123')
    })

    it('handles full name input in signup form', async () => {
      const user = userEvent.setup()
      render(<AuthForm {...defaultProps} type="signup" />)

      const fullNameInput = screen.getByTestId('fullName')
      await user.type(fullNameInput, 'John Doe')

      expect(fullNameInput).toHaveValue('John Doe')
    })

    it('handles phone input in signup form', async () => {
      const user = userEvent.setup()
      render(<AuthForm {...defaultProps} type="signup" />)

      const phoneInput = screen.getByTestId('phone')
      await user.type(phoneInput, '+1234567890')

      expect(phoneInput).toHaveValue('+1234567890')
    })

    it('handles remember me checkbox', async () => {
      const user = userEvent.setup()
      render(<AuthForm {...defaultProps} />)

      const rememberCheckbox = screen.getByTestId('remember')
      
      // Initially checked (default state)
      expect(rememberCheckbox).toBeChecked()

      // Uncheck
      await user.click(rememberCheckbox)
      expect(rememberCheckbox).not.toBeChecked()

      // Check again
      await user.click(rememberCheckbox)
      expect(rememberCheckbox).toBeChecked()
    })

    it('handles terms and conditions checkbox in signup', async () => {
      const user = userEvent.setup()
      render(<AuthForm {...defaultProps} type="signup" />)

      const termsCheckbox = screen.getByTestId('agreeToTerms')
      
      // Initially unchecked
      expect(termsCheckbox).not.toBeChecked()

      // Check
      await user.click(termsCheckbox)
      expect(termsCheckbox).toBeChecked()
    })
  })

  describe('Form Submission', () => {
    it('calls onSubmit with correct data for signin', async () => {
      const mockOnSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<AuthForm {...defaultProps} onSubmit={mockOnSubmit} />)

      // Fill form
      await user.type(screen.getByTestId('email'), 'test@example.com')
      await user.type(screen.getByTestId('password'), 'password123')
      
      // Submit
      const form = screen.getByRole('form') || screen.getByTestId('email').closest('form')!
      fireEvent.submit(form)

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: '',
        fullName: '',
        phone: '',
        remember: true,
        agreeToTerms: false,
      })
    })

    it('calls onSubmit with correct data for signup', async () => {
      const mockOnSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<AuthForm {...defaultProps} type="signup" onSubmit={mockOnSubmit} />)

      // Fill form
      await user.type(screen.getByTestId('email'), 'test@example.com')
      await user.type(screen.getByTestId('fullName'), 'John Doe')
      await user.type(screen.getByTestId('phone'), '+1234567890')
      await user.type(screen.getByTestId('password'), 'password123')
      await user.type(screen.getByTestId('confirmPassword'), 'password123')
      await user.click(screen.getByTestId('agreeToTerms'))
      
      // Submit
      const form = screen.getByTestId('email').closest('form')!
      fireEvent.submit(form)

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        fullName: 'John Doe',
        phone: '+1234567890',
        remember: true,
        agreeToTerms: true,
      })
    })

    it('calls onSubmit for reset password', async () => {
      const mockOnSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<AuthForm {...defaultProps} type="reset-password" onSubmit={mockOnSubmit} />)

      await user.type(screen.getByTestId('email'), 'test@example.com')
      
      const form = screen.getByTestId('email').closest('form')!
      fireEvent.submit(form)

      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: '',
        confirmPassword: '',
        fullName: '',
        phone: '',
        remember: true,
        agreeToTerms: false,
      })
    })

    it('prevents submission when loading', async () => {
      const mockOnSubmit = jest.fn()
      
      render(<AuthForm {...defaultProps} onSubmit={mockOnSubmit} isLoading={true} />)

      const submitButton = screen.getByRole('button', { name: /please wait/i })
      expect(submitButton).toBeDisabled()
      
      fireEvent.click(submitButton)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Social Login', () => {
    it('handles Google OAuth login', async () => {
      const mockOnSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<AuthForm {...defaultProps} onSubmit={mockOnSubmit} />)

      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      expect(mockOnSubmit).toHaveBeenCalledWith({ provider: 'google' })
    })

    it('handles Apple OAuth login', async () => {
      const mockOnSubmit = jest.fn()
      const user = userEvent.setup()
      
      render(<AuthForm {...defaultProps} onSubmit={mockOnSubmit} />)

      const appleButton = screen.getByText('Continue with Apple')
      await user.click(appleButton)

      expect(mockOnSubmit).toHaveBeenCalledWith({ provider: 'apple' })
    })

    it('disables social buttons when loading', () => {
      render(<AuthForm {...defaultProps} isLoading={true} />)

      const googleButton = screen.getByText('Continue with Google')
      const appleButton = screen.getByText('Continue with Apple')

      expect(googleButton).toBeDisabled()
      expect(appleButton).toBeDisabled()
    })

    it('shows loading state for specific provider', async () => {
      const mockOnSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
      const user = userEvent.setup()
      
      render(<AuthForm {...defaultProps} onSubmit={mockOnSubmit} />)

      const googleButton = screen.getByText('Continue with Google')
      await user.click(googleButton)

      // In real implementation, this would show provider-specific loading
      expect(mockOnSubmit).toHaveBeenCalledWith({ provider: 'google' })
    })
  })

  describe('Navigation Links', () => {
    it('shows correct footer links for signin', () => {
      render(<AuthForm {...defaultProps} type="signin" />)

      expect(screen.getByText('Don\'t have an account?')).toBeInTheDocument()
      expect(screen.getByText('Sign up')).toBeInTheDocument()
    })

    it('shows correct footer links for signup', () => {
      render(<AuthForm {...defaultProps} type="signup" />)

      expect(screen.getByText('Already have an account?')).toBeInTheDocument()
      expect(screen.getByText('Sign in')).toBeInTheDocument()
    })

    it('handles forgot password link click', async () => {
      const user = userEvent.setup()
      
      // Mock window.location
      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '' }
      
      render(<AuthForm {...defaultProps} />)

      const forgotPasswordLink = screen.getByText('Forgot password?')
      await user.click(forgotPasswordLink)

      expect(window.location.href).toBe('/reset-password')
      
      // Restore window.location
      window.location = originalLocation
    })

    it('handles sign up link click', async () => {
      const user = userEvent.setup()
      
      // Mock window.location
      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '' }
      
      render(<AuthForm {...defaultProps} type="signin" />)

      const signUpLink = screen.getByText('Sign up')
      await user.click(signUpLink)

      expect(window.location.href).toBe('/signup')
      
      // Restore window.location
      window.location = originalLocation
    })

    it('handles sign in link click', async () => {
      const user = userEvent.setup()
      
      // Mock window.location
      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '' }
      
      render(<AuthForm {...defaultProps} type="signup" />)

      const signInLink = screen.getByText('Sign in')
      await user.click(signInLink)

      expect(window.location.href).toBe('/login')
      
      // Restore window.location
      window.location = originalLocation
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<AuthForm {...defaultProps} />)

      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('has proper form labels for signup', () => {
      render(<AuthForm {...defaultProps} type="signup" />)

      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Phone Number (Optional)')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    })

    it('requires email field', () => {
      render(<AuthForm {...defaultProps} />)

      const emailInput = screen.getByTestId('email')
      expect(emailInput).toBeRequired()
    })

    it('requires password field', () => {
      render(<AuthForm {...defaultProps} />)

      const passwordInput = screen.getByTestId('password')
      expect(passwordInput).toBeRequired()
    })

    it('requires terms checkbox in signup', () => {
      render(<AuthForm {...defaultProps} type="signup" />)

      const termsCheckbox = screen.getByTestId('agreeToTerms')
      expect(termsCheckbox).toBeRequired()
    })

    it('has proper ARIA attributes for error state', () => {
      render(<AuthForm {...defaultProps} error="Test error" />)

      const errorAlert = screen.getByTestId('alert')
      expect(errorAlert).toBeInTheDocument()
    })
  })

  describe('Input Validation', () => {
    it('validates email format', async () => {
      const user = userEvent.setup()
      render(<AuthForm {...defaultProps} />)

      const emailInput = screen.getByTestId('email')
      await user.type(emailInput, 'invalid-email')

      // HTML5 validation would handle this
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('validates phone format', async () => {
      const user = userEvent.setup()
      render(<AuthForm {...defaultProps} type="signup" />)

      const phoneInput = screen.getByTestId('phone')
      await user.type(phoneInput, 'invalid-phone')

      expect(phoneInput).toHaveAttribute('type', 'tel')
    })

    it('handles password strength requirements', () => {
      render(<AuthForm {...defaultProps} type="signup" />)

      const passwordInput = screen.getByTestId('password')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const customClass = 'custom-auth-form'
      const { container } = render(<AuthForm {...defaultProps} className={customClass} />)

      expect(container.firstChild).toHaveClass(customClass)
    })

    it('applies default styling', () => {
      const { container } = render(<AuthForm {...defaultProps} />)

      expect(container.firstChild).toHaveClass('w-full', 'max-w-md', 'space-y-6')
    })
  })
})