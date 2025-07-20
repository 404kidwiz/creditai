'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Home, 
  Upload, 
  BarChart3, 
  FileText, 
  Settings, 
  User,
  CreditCard,
  Bell,
  Search,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useKeyboardNavigation, useListKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useSwipeGestures, useNavigationSwipes } from '@/hooks/useSwipeGestures';
import { useResponsive } from '@/hooks/useResponsive';
import { ARIA_LABELS } from '@/lib/accessibility/a11y';
import { slideInFromLeft, fadeIn } from '@/lib/animations/variants';
import { cn } from '@/lib/utils';

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const navigationItems: NavigationItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    href: '/upload',
    label: 'Upload Report',
    icon: <Upload className="h-5 w-5" />,
  },
  {
    href: '/analysis',
    label: 'Analysis',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    href: '/disputes',
    label: 'Disputes',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    href: '/billing',
    label: 'Billing',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
  },
];

export function AccessibleNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, isTouchDevice } = useResponsive();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Create refs for each navigation item
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Keyboard navigation for mobile menu
  useKeyboardNavigation(mobileMenuRef, {
    onEscape: () => setIsOpen(false),
    enabled: isOpen,
  });

  // List navigation for menu items
  useListKeyboardNavigation(
    navItemRefs.current.map(ref => ({ current: ref })),
    {
      orientation: 'vertical',
      enabled: isOpen,
    }
  );

  // Swipe gestures for mobile menu
  const swipeRef = useNavigationSwipes({
    onBack: () => {
      if (isOpen) {
        setIsOpen(false);
      } else {
        router.back();
      }
    },
    onHideMenu: () => setIsOpen(false),
    onShowMenu: () => !isOpen && setIsOpen(true),
    disabled: !isMobile || !isTouchDevice,
  });

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
    setShowSearch(false);
  }, [pathname]);

  // Focus management for mobile menu
  useEffect(() => {
    if (isOpen) {
      // Focus first menu item when opened
      const firstItem = navItemRefs.current[0];
      if (firstItem) {
        firstItem.focus();
      }
    }
  }, [isOpen]);

  // Focus management for search
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (!showSearch) {
      setSearchQuery('');
    }
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    
    // Simple search logic - navigate to most relevant page
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('upload') || lowerQuery.includes('report')) {
      router.push('/upload');
    } else if (lowerQuery.includes('dispute') || lowerQuery.includes('letter')) {
      router.push('/disputes');
    } else if (lowerQuery.includes('analysis') || lowerQuery.includes('score')) {
      router.push('/analysis');
    } else if (lowerQuery.includes('billing') || lowerQuery.includes('payment')) {
      router.push('/billing');
    } else if (lowerQuery.includes('setting') || lowerQuery.includes('account')) {
      router.push('/settings');
    } else {
      // Default to dashboard for general searches
      router.push('/dashboard');
    }
    
    setShowSearch(false);
    setSearchQuery('');
    setIsOpen(false);
  };

  const filteredNavigationItems = navigationItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* Desktop Navigation */}
      <nav
        className="hidden lg:flex lg:space-x-8"
        role="navigation"
        aria-label={ARIA_LABELS.navigation.main}
      >
        {navigationItems.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground'
            )}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            {item.icon}
            {item.label}
            {item.badge && (
              <span
                className="ml-2 px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded-full"
                aria-label={`${item.badge} notifications`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Mobile Menu Button */}
      <Button
        ref={menuButtonRef}
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={isOpen ? 'Close menu' : ARIA_LABELS.buttons.menu}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Mobile Menu */}
            <motion.div
              ref={(node) => {
                mobileMenuRef.current = node;
                if (node) {
                  swipeRef.current = node;
                }
              }}
              id="mobile-menu"
              className="fixed inset-y-0 left-0 z-50 w-80 bg-background border-r shadow-lg lg:hidden"
              variants={slideInFromLeft}
              initial="initial"
              animate="animate"
              exit="exit"
              role="navigation"
              aria-label="Mobile navigation"
            >
              <div className="flex flex-col h-full">
                {/* Mobile Menu Header */}
                <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-sm">CA</span>
                    </div>
                    <h2 className="text-lg font-semibold">CreditAI</h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleSearch}
                      aria-label="Search"
                      className="w-9 h-9"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                    <ThemeToggle />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      aria-label={ARIA_LABELS.buttons.close}
                      className="w-9 h-9"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Search Bar */}
                <AnimatePresence>
                  {showSearch && (
                    <motion.div
                      className="p-4 border-b bg-gray-50 dark:bg-gray-800/50"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Search pages, features..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSearch(searchQuery);
                            } else if (e.key === 'Escape') {
                              setShowSearch(false);
                              setSearchQuery('');
                            }
                          }}
                          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mobile Menu Items */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="list">
                  {(showSearch ? filteredNavigationItems : navigationItems).map((item, index) => {
                    const isActive = pathname === item.href || 
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    
                    return (
                      <Link
                        key={item.href}
                        ref={(el) => {
                          navItemRefs.current[index] = el;
                        }}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-4 px-4 py-4 rounded-xl text-base font-medium transition-all duration-200',
                          'touch-manipulation active:scale-95',
                          'hover:bg-accent/50 hover:text-accent-foreground',
                          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                          'min-h-[56px]', // Touch-friendly minimum height
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                        role="listitem"
                        aria-current={isActive ? 'page' : undefined}
                        tabIndex={0}
                      >
                        <div className={cn(
                          'p-2 rounded-lg transition-colors',
                          isActive
                            ? 'bg-primary-foreground/20'
                            : 'bg-gray-100 dark:bg-gray-800'
                        )}>
                          {React.cloneElement(item.icon as React.ReactElement, {
                            className: cn(
                              'w-5 h-5',
                              isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                            )
                          })}
                        </div>
                        <span className="flex-1">{item.label}</span>
                        <div className="flex items-center gap-2">
                          {item.badge && item.badge > 0 && (
                            <span
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded-full min-w-[20px] text-center"
                              aria-label={`${item.badge} notifications`}
                            >
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                          <ChevronRight className={cn(
                            'w-4 h-4 transition-colors',
                            isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          )} />
                        </div>
                      </Link>
                    );
                  })}
                  
                  {/* Search results indicator */}
                  {showSearch && filteredNavigationItems.length === 0 && searchQuery && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <div className="text-center">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No results found for "{searchQuery}"</p>
                      </div>
                    </div>
                  )}
                </nav>

                {/* Mobile Menu Footer */}
                <div className="p-4 border-t bg-gray-50 dark:bg-gray-800/50">
                  <div className="space-y-3">
                    {/* User Profile */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-700 shadow-sm">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">John Doe</p>
                        <p className="text-xs text-muted-foreground truncate">
                          john@example.com
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/settings/profile')}
                        className="p-2"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          router.push('/help');
                          setIsOpen(false);
                        }}
                        className="flex items-center gap-2 justify-start h-10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Help
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          router.push('/feedback');
                          setIsOpen(false);
                        }}
                        className="flex items-center gap-2 justify-start h-10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        Feedback
                      </Button>
                    </div>
                    
                    {/* Swipe hint for first-time users */}
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground">
                        💡 Swipe right to close menu
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}