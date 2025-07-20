import React from 'react';
import { Header } from '@/components/layout/Header';
import { PageSwipeNavigation, PageNavigationProgress } from '@/components/navigation/PageSwipeNavigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageSwipeNavigation enableSwipeNavigation={true}>
        <main id="main-content" className="relative">
          {children}
        </main>
        <PageNavigationProgress />
      </PageSwipeNavigation>
    </div>
  );
}