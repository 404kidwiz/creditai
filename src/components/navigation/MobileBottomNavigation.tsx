'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Upload, 
  BarChart3, 
  FileText, 
  Settings,
  Plus,
  ChevronUp,
  User
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';
import { Button } from '@/components/ui/Button';

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isActive?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: Home,
  },
  {
    href: '/upload',
    label: 'Upload',
    icon: Upload,
  },
  {
    href: '/analysis',
    label: 'Analysis',
    icon: BarChart3,
  },
  {
    href: '/disputes',
    label: 'Disputes',
    icon: FileText,
    badge: 2, // Example badge
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
  },
];

const quickActions = [
  { label: 'Upload Report', href: '/upload', icon: Upload },
  { label: 'Generate Dispute', href: '/disputes/new', icon: FileText },
  { label: 'View Analysis', href: '/analysis', icon: BarChart3 },
  { label: 'Account Settings', href: '/settings/account', icon: User },
];

export function MobileBottomNavigation() {
  const pathname = usePathname();
  const { isMobile, isTouchDevice } = useResponsive();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Auto-hide navigation on scroll
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY;
      const scrollThreshold = 10;

      if (Math.abs(currentScrollY - lastScrollY) > scrollThreshold) {
        if (scrollingDown && currentScrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isMobile]);

  // Hide on non-mobile devices or when not needed
  if (!isMobile || !isTouchDevice) {
    return null;
  }

  return (
    <>
      {/* Quick Actions Overlay */}
      <AnimatePresence>
        {showQuickActions && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQuickActions(false)}
            />
            
            {/* Quick Actions Menu */}
            <motion.div
              className="fixed bottom-20 left-4 right-4 z-50"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', duration: 0.3 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      onClick={() => setShowQuickActions(false)}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
                    >
                      <action.icon className="w-6 h-6 text-primary mb-2" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
                        {action.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <motion.nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30',
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md',
          'border-t border-gray-200 dark:border-gray-700',
          'safe-bottom' // Safe area for devices with home indicators
        )}
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : 100 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="px-2 py-1">
          <div className="flex items-center justify-around">
            {navigationItems.map((item, index) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              
              // Replace middle item with floating action button
              if (index === Math.floor(navigationItems.length / 2)) {
                return (
                  <div key="fab" className="relative">
                    <Button
                      onClick={() => setShowQuickActions(!showQuickActions)}
                      className={cn(
                        'w-14 h-14 rounded-full shadow-lg',
                        'bg-primary hover:bg-primary/90 text-primary-foreground',
                        'flex items-center justify-center',
                        'touch-manipulation transform transition-transform',
                        'active:scale-95',
                        showQuickActions && 'rotate-45'
                      )}
                      aria-label="Quick actions"
                    >
                      {showQuickActions ? (
                        <Plus className="w-6 h-6" />
                      ) : (
                        <Plus className="w-6 h-6" />
                      )}
                    </Button>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center',
                    'min-w-[60px] py-2 px-3 rounded-lg',
                    'touch-manipulation transition-all duration-200',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'active:scale-95',
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="relative">
                    <item.icon className={cn(
                      'w-5 h-5 transition-transform',
                      isActive && 'scale-110'
                    )} />
                    
                    {/* Badge */}
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  
                  <span className={cn(
                    'text-xs font-medium mt-1 transition-colors',
                    isActive ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
                  )}>
                    {item.label}
                  </span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                      layoutId="bottomNavIndicator"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </motion.nav>

      {/* Safe area spacer */}
      <div className="h-20 safe-bottom" />
    </>
  );
}