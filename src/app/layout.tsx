import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'

import { cn } from '@/lib/utils'
import '@/styles/globals.css'
import { AuthProvider } from '@/context/AuthContext'

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
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
      >
        <AuthProvider>
          {children}
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
      </body>
    </html>
  )
}