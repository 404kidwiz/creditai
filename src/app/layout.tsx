import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Script from 'next/script'

import { cn } from '@/lib/utils'
import '@/styles/globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { AnalyticsProvider } from '@/context/AnalyticsContext'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { GlobalKeyboardProvider } from '@/providers/GlobalKeyboardProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'CreditAI - AI-Powered Credit Repair',
    template: '%s | CreditAI',
  },
  description: 'AI-powered credit repair and monitoring platform that helps you improve your credit score with smart dispute generation and real-time tracking.',
  keywords: [
    'credit repair',
    'credit score',
    'ai',
    'dispute letters',
    'credit monitoring',
    'FCRA',
    'credit analysis',
  ],
  authors: [
    {
      name: 'CreditAI Team',
      url: 'https://creditai.com',
    },
  ],
  creator: 'CreditAI',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://creditai.com',
    title: 'CreditAI - AI-Powered Credit Repair',
    description: 'AI-powered credit repair and monitoring platform that helps you improve your credit score.',
    siteName: 'CreditAI',
    images: [
      {
        url: '/web-app-manifest-512x512.png',
        width: 512,
        height: 512,
        alt: 'CreditAI - AI-Powered Credit Repair',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CreditAI - AI-Powered Credit Repair',
    description: 'AI-powered credit repair and monitoring platform that helps you improve your credit score.',
    images: ['/web-app-manifest-512x512.png'],
    creator: '@creditai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  metadataBase: new URL('https://creditai.com'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GlobalKeyboardProvider>
            <AuthProvider>
              <AnalyticsProvider>
                {children}
              </AnalyticsProvider>
            <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#10b981',
                  color: '#fff',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: '#ef4444',
                  color: '#fff',
                },
              },
            }}
            />
            </AuthProvider>
          </GlobalKeyboardProvider>
        </ThemeProvider>
        
        {/* Performance optimization script */}
        <Script
          id="performance-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize performance optimizations
              if (typeof window !== 'undefined') {
                window.addEventListener('load', () => {
                  import('/src/lib/performance/init.js').then(module => {
                    module.initPerformanceOptimizations();
                  }).catch(err => {
                    console.warn('Failed to load performance optimizations:', err);
                  });
                });
              }
            `,
          }}
        />
        
        {/* Web Vitals monitoring */}
        <Script
          id="web-vitals"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Report Web Vitals
              if (typeof window !== 'undefined' && 'web-vital' in window) {
                ['CLS', 'FID', 'FCP', 'LCP', 'TTFB'].forEach(metric => {
                  window.addEventListener(metric.toLowerCase(), (event) => {
                    // Send to analytics
                    if (window.gtag) {
                      window.gtag('event', metric, {
                        value: event.detail,
                        event_category: 'Web Vitals',
                        event_label: metric,
                      });
                    }
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}