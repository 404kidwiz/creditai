'use client'

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { SUBSCRIPTION_PLANS, formatPrice, type SubscriptionPlan } from '@/lib/stripe/config'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Check, Star, Zap, Crown } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'

interface PricingPlansProps {
  currentPlan?: SubscriptionPlan | null
  onSelectPlan?: (plan: SubscriptionPlan) => void
  showCurrentPlan?: boolean
}

export function PricingPlans({ 
  currentPlan, 
  onSelectPlan, 
  showCurrentPlan = true 
}: PricingPlansProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')

  const handleSelectPlan = async (planId: SubscriptionPlan) => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login?redirect=/pricing'
      return
    }

    if (onSelectPlan) {
      onSelectPlan(planId)
      return
    }

    // Default behavior: create Stripe checkout session
    setIsLoading(planId)
    
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          userId: user.id,
          billingInterval
        }),
      })

      const { sessionId } = await response.json()
      
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId })
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const getPlanIcon = (planId: SubscriptionPlan) => {
    switch (planId) {
      case 'basic':
        return <Star className="w-6 h-6 text-blue-600" />
      case 'pro':
        return <Zap className="w-6 h-6 text-purple-600" />
      case 'premium':
        return <Crown className="w-6 h-6 text-amber-600" />
      default:
        return <Star className="w-6 h-6 text-gray-600" />
    }
  }

  const getPlanColor = (planId: SubscriptionPlan) => {
    switch (planId) {
      case 'basic':
        return 'border-blue-200 hover:border-blue-300'
      case 'pro':
        return 'border-purple-500 ring-2 ring-purple-500 ring-opacity-20'
      case 'premium':
        return 'border-amber-200 hover:border-amber-300'
      default:
        return 'border-gray-200'
    }
  }

  const getYearlyPrice = (monthlyPrice: number) => {
    return monthlyPrice * 12 * 0.8 // 20% discount for yearly
  }

  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setBillingInterval('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'month'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'year'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {Object.entries(SUBSCRIPTION_PLANS).map(([planId, plan]) => {
          const isCurrentPlan = currentPlan === planId
          const price = billingInterval === 'year' ? getYearlyPrice(plan.price) : plan.price
          const displayPrice = billingInterval === 'year' ? price / 12 : price

          return (
            <Card
              key={planId}
              className={`relative p-8 ${getPlanColor(planId as SubscriptionPlan)} ${
                (plan as any).popular ? 'transform scale-105' : ''
              }`}
            >
              {/* Popular Badge */}
              {(plan as any).popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && showCurrentPlan && (
                <div className="absolute -top-4 right-4">
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  {getPlanIcon(planId as SubscriptionPlan)}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(displayPrice)}
                  </span>
                  <span className="text-gray-600">
                    /{billingInterval === 'year' ? 'mo' : 'month'}
                  </span>
                  {billingInterval === 'year' && (
                    <div className="text-sm text-gray-500 mt-1">
                      {formatPrice(price)} billed annually
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleSelectPlan(planId as SubscriptionPlan)}
                  disabled={isCurrentPlan || isLoading === planId}
                  className={`w-full ${
                    (plan as any).popular
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  size="lg"
                >
                  {isLoading === planId ? (
                    'Loading...'
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : (
                    `Choose ${plan.name}`
                  )}
                </Button>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 mb-3">What's included:</h4>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Usage Limits */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Usage Limits:</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Dispute Letters:</span>
                    <span className="font-medium">
                      {plan.limits.disputeLetters === -1 ? 'Unlimited' : plan.limits.disputeLetters}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credit Reports:</span>
                    <span className="font-medium">
                      {plan.limits.creditReports === -1 ? 'Unlimited' : plan.limits.creditReports}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Score Tracking:</span>
                    <span className="font-medium">
                      {plan.limits.scoreTracking ? 'Included' : 'Not included'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Feature Comparison */}
      <div className="max-w-4xl mx-auto mt-16">
        <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Compare Plans
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 p-4 text-left font-semibold">Features</th>
                <th className="border border-gray-200 p-4 text-center font-semibold">Basic</th>
                <th className="border border-gray-200 p-4 text-center font-semibold">Pro</th>
                <th className="border border-gray-200 p-4 text-center font-semibold">Premium</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 p-4">AI Credit Analysis</td>
                <td className="border border-gray-200 p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                <td className="border border-gray-200 p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                <td className="border border-gray-200 p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 p-4">Dispute Letters/Month</td>
                <td className="border border-gray-200 p-4 text-center">5</td>
                <td className="border border-gray-200 p-4 text-center">Unlimited</td>
                <td className="border border-gray-200 p-4 text-center">Unlimited</td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-4">Credit Reports/Month</td>
                <td className="border border-gray-200 p-4 text-center">3</td>
                <td className="border border-gray-200 p-4 text-center">10</td>
                <td className="border border-gray-200 p-4 text-center">Unlimited</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 p-4">Score Tracking & Goals</td>
                <td className="border border-gray-200 p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                <td className="border border-gray-200 p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                <td className="border border-gray-200 p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-4">Priority Support</td>
                <td className="border border-gray-200 p-4 text-center">-</td>
                <td className="border border-gray-200 p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                <td className="border border-gray-200 p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 p-4">Phone Support</td>
                <td className="border border-gray-200 p-4 text-center">-</td>
                <td className="border border-gray-200 p-4 text-center">-</td>
                <td className="border border-gray-200 p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-4">Credit Consultations</td>
                <td className="border border-gray-200 p-4 text-center">-</td>
                <td className="border border-gray-200 p-4 text-center">-</td>
                <td className="border border-gray-200 p-4 text-center">Quarterly</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mt-16">
        <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Frequently Asked Questions
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h4>
            <p className="text-gray-600">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h4>
            <p className="text-gray-600">
              We accept all major credit cards including Visa, MasterCard, American Express, and Discover.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h4>
            <p className="text-gray-600">
              Yes, all plans come with a 7-day free trial. No credit card required to start.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h4>
            <p className="text-gray-600">
              Yes, you can cancel your subscription at any time. You'll continue to have access until your current billing period ends.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}