'use client'

import React, { useState, ReactNode } from 'react'
import { useResponsive } from '@/hooks/useResponsive'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from './Button'

interface ResponsiveSectionProps {
  title: string
  children: ReactNode
  icon?: ReactNode
  defaultCollapsed?: boolean
  collapsibleOnMobile?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
  priority?: 'high' | 'medium' | 'low'
}

export function ResponsiveSection({
  title,
  children,
  icon,
  defaultCollapsed = false,
  collapsibleOnMobile = true,
  className = '',
  headerClassName = '',
  contentClassName = '',
  priority = 'medium'
}: ResponsiveSectionProps) {
  const { isMobile } = useResponsive()
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed && isMobile && collapsibleOnMobile)

  const shouldBeCollapsible = isMobile && collapsibleOnMobile
  const isCurrentlyCollapsed = shouldBeCollapsible && isCollapsed

  const handleToggle = () => {
    if (shouldBeCollapsible) {
      setIsCollapsed(!isCollapsed)
    }
  }

  const getPriorityStyles = () => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-l-red-500'
      case 'medium':
        return 'border-l-4 border-l-blue-500'
      case 'low':
        return 'border-l-4 border-l-gray-300'
      default:
        return ''
    }
  }

  return (
    <div className={`collapsible-section ${getPriorityStyles()} ${className}`}>
      <div 
        className={`collapsible-header ${shouldBeCollapsible ? 'cursor-pointer' : ''} ${headerClassName}`}
        onClick={handleToggle}
        role={shouldBeCollapsible ? 'button' : undefined}
        tabIndex={shouldBeCollapsible ? 0 : undefined}
        onKeyDown={(e) => {
          if (shouldBeCollapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            handleToggle()
          }
        }}
        aria-expanded={shouldBeCollapsible ? !isCurrentlyCollapsed : undefined}
        aria-controls={shouldBeCollapsible ? `section-content-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex-shrink-0 text-gray-600 dark:text-gray-400">
              {icon}
            </div>
          )}
          <h3 className="mobile-subtitle text-gray-900 dark:text-white">
            {title}
          </h3>
          {priority === 'high' && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 rounded-full">
              Priority
            </span>
          )}
        </div>
        
        {shouldBeCollapsible && (
          <Button
            variant="ghost"
            size="sm"
            className="touch-target p-2"
            aria-label={isCurrentlyCollapsed ? `Expand ${title}` : `Collapse ${title}`}
          >
            {isCurrentlyCollapsed ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </Button>
        )}
      </div>
      
      <div 
        id={shouldBeCollapsible ? `section-content-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}
        className={`collapsible-content mobile-animate ${contentClassName} ${
          isCurrentlyCollapsed ? 'hidden' : 'block'
        }`}
        aria-hidden={isCurrentlyCollapsed}
      >
        {children}
      </div>
    </div>
  )
}

// Responsive grid component
interface ResponsiveGridProps {
  children: ReactNode
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: string
  className?: string
}

export function ResponsiveGrid({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'gap-4',
  className = ''
}: ResponsiveGridProps) {
  const getGridClasses = () => {
    const classes = ['grid', gap]
    
    if (columns.mobile) classes.push(`grid-cols-${columns.mobile}`)
    if (columns.tablet) classes.push(`sm:grid-cols-${columns.tablet}`)
    if (columns.desktop) classes.push(`lg:grid-cols-${columns.desktop}`)
    
    return classes.join(' ')
  }

  return (
    <div className={`${getGridClasses()} ${className}`}>
      {children}
    </div>
  )
}

// Responsive stack component
interface ResponsiveStackProps {
  children: ReactNode
  direction?: {
    mobile?: 'row' | 'column'
    tablet?: 'row' | 'column'
    desktop?: 'row' | 'column'
  }
  spacing?: string
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  className?: string
}

export function ResponsiveStack({
  children,
  direction = { mobile: 'column', tablet: 'row', desktop: 'row' },
  spacing = 'gap-4',
  align = 'start',
  justify = 'start',
  className = ''
}: ResponsiveStackProps) {
  const getStackClasses = () => {
    const classes = ['flex', spacing]
    
    // Direction
    if (direction.mobile === 'row') classes.push('flex-row')
    else classes.push('flex-col')
    
    if (direction.tablet === 'row') classes.push('sm:flex-row')
    else if (direction.tablet === 'column') classes.push('sm:flex-col')
    
    if (direction.desktop === 'row') classes.push('lg:flex-row')
    else if (direction.desktop === 'column') classes.push('lg:flex-col')
    
    // Alignment
    switch (align) {
      case 'center':
        classes.push('items-center')
        break
      case 'end':
        classes.push('items-end')
        break
      case 'stretch':
        classes.push('items-stretch')
        break
      default:
        classes.push('items-start')
    }
    
    // Justification
    switch (justify) {
      case 'center':
        classes.push('justify-center')
        break
      case 'end':
        classes.push('justify-end')
        break
      case 'between':
        classes.push('justify-between')
        break
      case 'around':
        classes.push('justify-around')
        break
      case 'evenly':
        classes.push('justify-evenly')
        break
      default:
        classes.push('justify-start')
    }
    
    return classes.join(' ')
  }

  return (
    <div className={`${getStackClasses()} ${className}`}>
      {children}
    </div>
  )
}

// Mobile-optimized modal wrapper
interface MobileModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
}

export function MobileModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true
}: MobileModalProps) {
  const { isMobile } = useResponsive()

  if (!isOpen) return null

  const getSizeClasses = () => {
    if (isMobile) return 'w-full h-full sm:max-w-lg sm:max-h-[80vh] sm:h-auto'
    
    switch (size) {
      case 'sm':
        return 'max-w-sm'
      case 'md':
        return 'max-w-md'
      case 'lg':
        return 'max-w-lg'
      case 'xl':
        return 'max-w-xl'
      case 'full':
        return 'max-w-full'
      default:
        return 'max-w-md'
    }
  }

  return (
    <div className="mobile-modal animate-mobile-fade-in">
      <div 
        className="mobile-modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`mobile-modal-content ${getSizeClasses()} animate-mobile-slide-up`}>
        <div className="mobile-modal-header">
          <h2 className="mobile-subtitle text-gray-900 dark:text-white">
            {title}
          </h2>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="touch-target"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>
        <div className="mobile-modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}