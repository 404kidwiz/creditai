'use client';

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface NavigationBreadcrumbsProps {
  customItems?: BreadcrumbItem[];
  showHome?: boolean;
  maxItems?: number;
  className?: string;
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/upload': 'Upload Report',
  '/analysis': 'Credit Analysis',
  '/disputes': 'Dispute Letters',
  '/billing': 'Billing & Subscription',
  '/settings': 'Settings',
  '/settings/account': 'Account Settings',
  '/settings/profile': 'Profile Settings',
  '/settings/notifications': 'Notification Settings',
  '/settings/security': 'Security Settings',
  '/help': 'Help Center',
  '/feedback': 'Feedback',
  '/onboarding': 'Getting Started',
};

export function NavigationBreadcrumbs({
  customItems,
  showHome = true,
  maxItems = 4,
  className,
}: NavigationBreadcrumbsProps) {
  const pathname = usePathname();
  const { isMobile } = useResponsive();

  // Build breadcrumb items from pathname
  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) {
      return customItems;
    }

    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Add home if requested and not on dashboard
    if (showHome && pathname !== '/dashboard') {
      breadcrumbs.push({
        label: 'Home',
        href: '/dashboard',
        icon: Home,
      });
    }

    // Build breadcrumbs from path segments
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip if it's the current page (last item)
      if (index === pathSegments.length - 1) {
        return;
      }

      const label = routeLabels[currentPath] || 
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

      breadcrumbs.push({
        label,
        href: currentPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();
  const currentPageLabel = routeLabels[pathname] || 
    pathname.split('/').pop()?.replace(/-/g, ' ') || 'Page';

  // Limit breadcrumbs on mobile
  const displayBreadcrumbs = isMobile 
    ? breadcrumbs.slice(-Math.min(maxItems - 1, 2)) 
    : breadcrumbs.slice(-maxItems + 1);

  // Don't show breadcrumbs if we're on the home page with no additional context
  if (breadcrumbs.length === 0 && pathname === '/dashboard') {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={cn(
        'flex items-center space-x-1 text-sm text-muted-foreground',
        'mobile-container py-2 sm:py-3',
        className
      )}
    >
      <ol className="flex items-center space-x-1 min-w-0">
        {/* Ellipsis for truncated breadcrumbs */}
        {breadcrumbs.length > (isMobile ? 2 : maxItems - 1) && (
          <li className="flex items-center space-x-1">
            <span className="text-muted-foreground">...</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </li>
        )}

        {/* Breadcrumb items */}
        {displayBreadcrumbs.map((item, index) => (
          <li key={item.href} className="flex items-center space-x-1 min-w-0">
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-1 hover:text-foreground transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-md px-1 py-0.5',
                'truncate max-w-[150px] sm:max-w-[200px]',
                'touch-manipulation'
              )}
              title={item.label}
            >
              {item.icon && (
                <item.icon className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate">{item.label}</span>
            </Link>
            {index < displayBreadcrumbs.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </li>
        ))}

        {/* Current page */}
        {displayBreadcrumbs.length > 0 && (
          <li className="flex items-center space-x-1 min-w-0">
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span 
              className="font-medium text-foreground truncate max-w-[150px] sm:max-w-[200px]"
              title={currentPageLabel}
            >
              {currentPageLabel}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

// Hook to get current page context
export function usePageContext() {
  const pathname = usePathname();
  
  const getPageTitle = () => {
    return routeLabels[pathname] || 'CreditAI';
  };

  const getPageSection = () => {
    const segments = pathname.split('/').filter(Boolean);
    return segments[0] || 'dashboard';
  };

  const getParentPage = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 1) {
      const parentPath = `/${segments.slice(0, -1).join('/')}`;
      return {
        label: routeLabels[parentPath] || segments[segments.length - 2],
        href: parentPath,
      };
    }
    return null;
  };

  return {
    title: getPageTitle(),
    section: getPageSection(),
    pathname,
    parentPage: getParentPage(),
  };
}