'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react'

export default function BillingSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Here you could verify the session with Stripe and get subscription details
    // For now, we'll just show a success message
    setIsLoading(false)
  }, [sessionId])

  if (!user) {
    router.push('/login')
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-8">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to CreditAI! 🎉
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Your subscription has been activated successfully. You now have access to all premium features.
          </p>

          {/* Features Highlight */}
          <Card className="p-8 mb-8 text-left">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
              What's Next? Start Your Credit Repair Journey
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Upload Credit Reports</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Get AI-powered analysis of your credit reports
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Generate Dispute Letters</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Create professional FCRA-compliant letters
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Track Your Progress</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Monitor credit score improvements over time
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-amber-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Set Goals</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Create targets and track milestones
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button
              size="lg"
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/upload')}
              className="inline-flex items-center"
            >
              Upload Credit Report
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              🎁 Your 7-Day Free Trial Has Started!
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              You won't be charged until your trial period ends. You can cancel anytime during the trial 
              to avoid any charges. Access your subscription settings in your dashboard.
            </p>
          </div>

          {/* Support */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Need help getting started? 
              <a href="mailto:support@creditai.com" className="text-blue-600 hover:text-blue-500 ml-1">
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}