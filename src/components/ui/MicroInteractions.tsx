'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Upload, 
  Download,
  Heart,
  Star,
  Zap,
  TrendingUp,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Toast Notification Component
export interface ToastProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export function Toast({ 
  type, 
  title, 
  message, 
  duration = 5000,
  action,
  onClose 
}: ToastProps & { onClose: () => void }) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (duration / 100))
        if (newProgress <= 0) {
          onClose()
          return 0
        }
        return newProgress
      })
    }, 100)

    return () => clearInterval(interval)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'info': return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getBorderColor = () => {
    switch (type) {
      case 'success': return 'border-green-200 dark:border-green-800'
      case 'error': return 'border-red-200 dark:border-red-800'
      case 'warning': return 'border-yellow-200 dark:border-yellow-800'
      case 'info': return 'border-blue-200 dark:border-blue-800'
    }
  }

  const getProgressColor = () => {
    switch (type) {
      case 'success': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      case 'info': return 'bg-blue-500'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      className={cn(
        "relative overflow-hidden bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-w-md",
        getBorderColor()
      )}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-gray-200 dark:bg-gray-700 w-full">
        <motion.div
          className={cn("h-full", getProgressColor())}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start space-x-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {title}
            </h4>
            {message && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {message}
              </p>
            )}
            {action && (
              <button
                onClick={action.onClick}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-2 font-medium"
              >
                {action.label}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Floating Action Button with ripple effect
export function FloatingActionButton({
  icon: Icon,
  label,
  onClick,
  color = 'blue',
  size = 'md',
  className
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  color?: 'blue' | 'green' | 'purple' | 'red'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-16 h-16'
  }

  const iconSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7'
  }

  const colorClasses = {
    blue: 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/25',
    green: 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/25',
    purple: 'bg-purple-500 hover:bg-purple-600 text-white shadow-purple-500/25',
    red: 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/25'
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newRipple = { id: Date.now(), x, y }
    setRipples(prev => [...prev, newRipple])

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
    }, 600)

    onClick()
  }

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative overflow-hidden rounded-full shadow-lg transition-all duration-200 group",
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      aria-label={label}
    >
      <Icon className={cn("relative z-10", iconSizeClasses[size])} />
      
      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            className="absolute bg-white/30 rounded-full"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
          {label}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    </motion.button>
  )
}

// Interactive Button with loading states
export function InteractiveButton({
  children,
  onClick,
  loading = false,
  success = false,
  error = false,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}: {
  children: React.ReactNode
  onClick?: () => void | Promise<void>
  loading?: boolean
  success?: boolean
  error?: boolean
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [localLoading, setLocalLoading] = useState(false)
  const [localSuccess, setLocalSuccess] = useState(false)

  const handleClick = async () => {
    if (!onClick || loading || localLoading) return

    try {
      setLocalLoading(true)
      await onClick()
      setLocalSuccess(true)
      setTimeout(() => setLocalSuccess(false), 2000)
    } catch (error) {
      console.error('Button action failed:', error)
    } finally {
      setLocalLoading(false)
    }
  }

  const isLoading = loading || localLoading
  const isSuccess = success || localSuccess

  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white border-transparent',
    outline: 'bg-transparent hover:bg-gray-50 text-gray-900 border-gray-300',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-900 border-transparent'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || isLoading}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        "relative inline-flex items-center justify-center rounded-md border font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        variants[variant],
        sizes[size],
        (disabled || isLoading) && "opacity-50 cursor-not-allowed",
        error && "bg-red-600 hover:bg-red-700 text-white border-transparent",
        isSuccess && "bg-green-600 hover:bg-green-700 text-white border-transparent",
        className
      )}
      {...props}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            />
            <span>Loading...</span>
          </motion.div>
        ) : isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Success!</span>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center space-x-2"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Error</span>
          </motion.div>
        ) : (
          <motion.span
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// Animated Counter
export function AnimatedCounter({
  value,
  duration = 2000,
  className,
  prefix = '',
  suffix = ''
}: {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}) {
  const [count, setCount] = useState(0)
  const controls = useAnimation()

  useEffect(() => {
    const startTime = Date.now()
    const startValue = count

    const updateCount = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)
      const easeOutProgress = 1 - Math.pow(1 - progress, 3) // Ease out cubic
      const currentValue = Math.floor(startValue + (value - startValue) * easeOutProgress)
      
      setCount(currentValue)

      if (progress < 1) {
        requestAnimationFrame(updateCount)
      }
    }

    requestAnimationFrame(updateCount)
  }, [value, duration, count])

  return (
    <motion.span
      className={className}
      animate={controls}
      initial={{ scale: 1 }}
      onUpdate={() => {
        controls.start({ scale: [1, 1.1, 1] })
      }}
    >
      {prefix}{count.toLocaleString()}{suffix}
    </motion.span>
  )
}

// Copy to Clipboard with feedback
export function CopyButton({
  text,
  className,
  size = 'md'
}: {
  text: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "p-1 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Check className={cn("text-green-500", sizeClasses[size])} />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Copy className={sizeClasses[size]} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// Toggle Visibility Button
export function ToggleVisibilityButton({
  visible,
  onToggle,
  className,
  size = 'md'
}: {
  visible: boolean
  onToggle: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <motion.button
      onClick={onToggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "p-1 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {visible ? (
          <motion.div
            key="visible"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
          >
            <Eye className={sizeClasses[size]} />
          </motion.div>
        ) : (
          <motion.div
            key="hidden"
            initial={{ scale: 0, rotate: 90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: -90 }}
          >
            <EyeOff className={sizeClasses[size]} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// Pulse Animation for notifications
export function PulseNotification({
  children,
  active = false,
  color = 'red',
  className
}: {
  children: React.ReactNode
  active?: boolean
  color?: 'red' | 'blue' | 'green' | 'yellow'
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      {children}
      <AnimatePresence>
        {active && (
          <motion.div
            className={cn(
              "absolute -top-1 -right-1 w-3 h-3 rounded-full",
              color === 'red' && "bg-red-500",
              color === 'blue' && "bg-blue-500",
              color === 'green' && "bg-green-500",
              color === 'yellow' && "bg-yellow-500"
            )}
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              opacity: [0, 1, 1]
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full opacity-75",
                color === 'red' && "bg-red-400",
                color === 'blue' && "bg-blue-400",
                color === 'green' && "bg-green-400",
                color === 'yellow' && "bg-yellow-400"
              )}
              animate={{ scale: [1, 1.5], opacity: [0.75, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default {
  Toast,
  FloatingActionButton,
  InteractiveButton,
  AnimatedCounter,
  CopyButton,
  ToggleVisibilityButton,
  PulseNotification
}