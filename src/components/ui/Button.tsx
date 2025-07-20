import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { useAccessibility } from '@/hooks/useAccessibility'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-target touch-enhanced',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification'
  announceClick?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, hapticFeedback = 'medium', announceClick, onClick, ...props }, ref) => {
    const { hapticFeedback: triggerHaptic, announce, enhanceElement } = useAccessibility()
    const buttonRef = React.useRef<HTMLButtonElement>(null)
    
    // Combine refs
    React.useImperativeHandle(ref, () => buttonRef.current!, [])
    
    // Auto-enhance button on mount
    React.useEffect(() => {
      if (buttonRef.current) {
        enhanceElement(buttonRef.current)
      }
    }, [enhanceElement])
    
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      // Provide haptic feedback
      triggerHaptic(hapticFeedback)
      
      // Announce click if specified
      if (announceClick) {
        announce(announceClick, 'polite')
      }
      
      // Call original onClick
      onClick?.(event)
    }, [triggerHaptic, hapticFeedback, announce, announceClick, onClick])
    
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={buttonRef}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }