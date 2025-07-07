import React from 'react'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Authentication | CreditAI',
  description: 'Sign in to your CreditAI account to start improving your credit score',
}

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex min-h-screen">
        {/* Left Side - Branding (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">C</span>
                </div>
                <span className="text-2xl font-bold">CreditAI</span>
              </Link>
            </div>
            
            <div className="max-w-md">
              <h2 className="text-4xl font-bold mb-6">
                Take control of your credit score
              </h2>
              <p className="text-lg text-blue-100 mb-8">
                AI-powered credit repair and monitoring to help you achieve your financial goals.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-blue-100">AI-powered credit analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-blue-100">Automated dispute letters</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-blue-100">24/7 credit monitoring</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white rounded-full opacity-20" />
              <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-white rounded-full opacity-15" />
              <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-white rounded-full opacity-25" />
              <div className="absolute bottom-1/3 right-1/3 w-16 h-16 bg-white rounded-full opacity-20" />
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden mb-8 text-center">
              <Link href="/" className="inline-flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">CreditAI</span>
              </Link>
            </div>
            
            {/* Auth Form */}
            <div className="bg-white dark:bg-gray-950 shadow-xl rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
              {children}
            </div>
            
            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>
                Protected by industry-standard encryption and security measures
              </p>
              <div className="mt-4 flex justify-center space-x-4">
                <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-300">
                  Terms of Service
                </Link>
                <Link href="/help" className="hover:text-gray-700 dark:hover:text-gray-300">
                  Help Center
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 