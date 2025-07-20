'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AccessibleNavigation } from '@/components/navigation/AccessibleNavigation';
import { MobileBottomNavigation } from '@/components/navigation/MobileBottomNavigation';
import { NavigationBreadcrumbs } from '@/components/navigation/NavigationBreadcrumbs';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { fadeIn } from '@/lib/animations/variants';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';

export function Header() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, signOut } = useAuth();
  const { isMobile } = useResponsive();

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Store completion in localStorage or user preferences
    localStorage.setItem('onboarding-completed', 'true');
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboarding-skipped', 'true');
  };

  return (
    <>
      <motion.header
        className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md p-1"
          >
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CA</span>
            </div>
            <span className="hidden font-bold sm:inline-block">
              CreditAI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:space-x-6">
            <AccessibleNavigation />
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle - Desktop */}
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative touch-manipulation"
              aria-label="View notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>

            {/* User Menu */}
            <Button
              variant="ghost"
              size="icon"
              className="touch-manipulation"
              aria-label="User account menu"
            >
              <User className="h-5 w-5" />
            </Button>

            {/* Onboarding Trigger - Development only */}
            {process.env.NODE_ENV === 'development' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOnboarding(true)}
                className="touch-manipulation"
              >
                Tour
              </Button>
            )}

            {/* Mobile Navigation */}
            <div className="lg:hidden">
              <AccessibleNavigation />
            </div>
          </div>
        </div>
        
        {/* Breadcrumbs - Only show on desktop or when there's meaningful navigation context */}
        {!isMobile && (
          <div className="border-t border-border/40">
            <NavigationBreadcrumbs 
              showHome={true}
              maxItems={4}
              className="container"
            />
          </div>
        )}
      </motion.header>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNavigation />

      {/* Onboarding Flow */}
      <OnboardingFlow
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </>
  );
}