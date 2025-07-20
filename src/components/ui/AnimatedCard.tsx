'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cardAnimation } from '@/lib/animations/variants';

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
  hover?: boolean;
  variant?: 'default' | 'interactive' | 'static';
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className,
  delay = 0,
  hover = true,
  variant = 'default',
  ...props
}) => {
  const getAnimationProps = () => {
    switch (variant) {
      case 'interactive':
        return {
          variants: cardAnimation,
          initial: 'hidden',
          animate: 'visible',
          whileHover: hover ? 'hover' : undefined,
          whileTap: 'tap',
          transition: { delay },
        };
      case 'static':
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { 
            duration: 0.4, 
            delay,
            ease: [0.25, 0.25, 0, 1]
          },
        };
      default:
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { 
            duration: 0.4, 
            delay,
            ease: [0.25, 0.25, 0, 1]
          },
          whileHover: hover ? { 
            y: -4,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            transition: { duration: 0.2 }
          } : undefined,
        };
    }
  };

  return (
    <motion.div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        variant === 'interactive' && 'cursor-pointer',
        className
      )}
      {...getAnimationProps()}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Loading skeleton with shimmer effect
export const LoadingSkeleton: React.FC<{
  width?: string;
  height?: string;
  className?: string;
}> = ({ width = '100%', height = '20px', className = '' }) => {
  const skeletonRef = useRef<HTMLDivElement>(null);
  const animationManager = AnimationManager.getInstance();

  useEffect(() => {
    if (skeletonRef.current) {
      animationManager.createShimmerEffect(skeletonRef.current);
    }

    return () => {
      if (skeletonRef.current) {
        animationManager.removeShimmerEffect(skeletonRef.current);
      }
    };
  }, [animationManager]);

  return (
    <div
      ref={skeletonRef}
      className={`bg-gray-200 rounded ${className}`}
      style={{ width, height }}
      aria-label="Loading..."
    />
  );
};

// Staggered list animation
export const StaggeredList: React.FC<{
  children: React.ReactNode[];
  staggerDelay?: number;
  animation?: 'fadeIn' | 'slideInLeft' | 'slideInRight';
  className?: string;
}> = ({ children, staggerDelay = 100, animation = 'fadeIn', className = '' }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const animationManager = AnimationManager.getInstance();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
            
            if (listRef.current) {
              const childElements = Array.from(listRef.current.children) as HTMLElement[];
              animationManager.staggerAnimate(childElements, animation, staggerDelay);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    if (listRef.current) {
      observer.observe(listRef.current);
    }

    return () => observer.disconnect();
  }, [animation, staggerDelay, isVisible, animationManager]);

  return (
    <div ref={listRef} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};