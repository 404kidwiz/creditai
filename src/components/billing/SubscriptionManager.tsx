'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { subscriptionManager, type Subscription } from '@/lib/stripe/subscriptions'
import { SUBSCRIPTION_PLANS, formatPrice, getPlanDetails } from '@/lib/stripe/config'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { 
  Calendar, 
  CreditCard, 
  Download, 
  Settings, 
  AlertCircle,
  CheckCircle,
  TrendingUp,
  FileText,
  Target
} from 'lucide-react'

export function SubscriptionManager() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (user) {
      loadSubscription()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadSubscription = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const sub = await subscriptionManager.getUserSubscription(user.id)
      setSubscription(sub)
    } catch (error) {
      console.error('Error loading subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!subscription || !user) return

    if (!confirm('Are you sure you want to cancel your subscription? You\'ll continue to have access until the end of your current billing period.')) {
      return
    }

    setIsUpdating(true)
    try {
      await subscriptionManager.cancelSubscription(user.id)
      await loadSubscription()
    } catch (error) {
      console.error('Error canceling subscription:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReactivateSubscription = async () => {
    if (!subscription || !user) return

    setIsUpdating(true)
    try {
      await subscriptionManager.reactivateSubscription(user.id)
      await loadSubscription()
    } catch (error) {
      console.error('Error reactivating subscription:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: Subscription['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        )
      case 'canceled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Canceled
          </span>
        )
      case 'past_due':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Past Due
          </span>
        )
      case 'trialing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Calendar className="w-3 h-3 mr-1" />
            Trial
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subscription</h3>
        <p className="text-gray-600 mb-6">
          Start your credit repair journey with one of our subscription plans.
        </p>
        <Button
          onClick={() => window.location.href = '/pricing'}
          className="inline-flex items-center"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          View Pricing Plans
        </Button>
      </Card>
    )
  }

  const plan = getPlanDetails(subscription.plan)
  const daysUntilRenewal = Math.ceil(
    (subscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="space-y-6">
      {/* Current Subscription Overview */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
              {getStatusBadge(subscription.status)}
            </div>
            <p className="text-gray-600 mb-4">{plan.description}</p>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                <span>
                  {subscription.cancelAtPeriodEnd ? 'Expires' : 'Renews'} in {daysUntilRenewal} days
                </span>
              </div>
              <div className="flex items-center">
                <CreditCard className="w-4 h-4 mr-1" />
                <span>{formatPrice(plan.price)}/month</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/billing/invoices'}
            >
              <Download className="w-4 h-4 mr-2" />
              Invoices
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/billing/payment-method'}
            >
              <Settings className="w-4 h-4 mr-2" />
              Payment
            </Button>
          </div>
        </div>
      </Card>

      {/* Usage Statistics */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Usage This Month</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dispute Letters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Dispute Letters</span>
              </div>
              <span className="text-sm text-gray-600">
                {subscription.usage.disputeLetters} / {plan.limits.disputeLetters === -1 ? '∞' : plan.limits.disputeLetters}
              </span>
            </div>
            {plan.limits.disputeLetters !== -1 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getUsageColor(
                    getUsagePercentage(subscription.usage.disputeLetters, plan.limits.disputeLetters)
                  )}`}
                  style={{
                    width: `${getUsagePercentage(subscription.usage.disputeLetters, plan.limits.disputeLetters)}%`
                  }}
                />
              </div>
            )}
          </div>

          {/* Credit Reports */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Credit Reports</span>
              </div>
              <span className="text-sm text-gray-600">
                {subscription.usage.creditReports} / {plan.limits.creditReports === -1 ? '∞' : plan.limits.creditReports}
              </span>
            </div>
            {plan.limits.creditReports !== -1 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getUsageColor(
                    getUsagePercentage(subscription.usage.creditReports, plan.limits.creditReports)
                  )}`}
                  style={{
                    width: `${getUsagePercentage(subscription.usage.creditReports, plan.limits.creditReports)}%`
                  }}
                />
              </div>
            )}
          </div>

          {/* Score Updates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Target className="w-4 h-4 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Score Updates</span>
              </div>
              <span className="text-sm text-gray-600">{subscription.usage.scoreUpdates}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full w-full" />
            </div>
          </div>
        </div>
      </Card>

      {/* Subscription Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Manage Subscription</h3>
        
        <div className="space-y-4">
          {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h4 className="font-medium text-blue-900">Upgrade Plan</h4>
                <p className="text-sm text-blue-700">
                  Get more features and higher limits with our Pro or Premium plans.
                </p>
              </div>
              <Button
                onClick={() => window.location.href = '/pricing'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Upgrade
              </Button>
            </div>
          )}

          {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Cancel Subscription</h4>
                <p className="text-sm text-gray-600">
                  You'll continue to have access until {subscription.currentPeriodEnd.toLocaleDateString()}.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleCancelSubscription}
                disabled={isUpdating}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {isUpdating ? 'Processing...' : 'Cancel'}
              </Button>
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div>
                <h4 className="font-medium text-yellow-900">Subscription Canceled</h4>
                <p className="text-sm text-yellow-700">
                  Your subscription will end on {subscription.currentPeriodEnd.toLocaleDateString()}.
                  You can reactivate it anytime before then.
                </p>
              </div>
              <Button
                onClick={handleReactivateSubscription}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUpdating ? 'Processing...' : 'Reactivate'}
              </Button>
            </div>
          )}

          {subscription.status === 'past_due' && (
            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div>
                <h4 className="font-medium text-red-900">Payment Required</h4>
                <p className="text-sm text-red-700">
                  Your subscription is past due. Please update your payment method to continue service.
                </p>
              </div>
              <Button
                onClick={() => window.location.href = '/billing/payment-method'}
                className="bg-red-600 hover:bg-red-700"
              >
                Update Payment
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Billing History Preview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Billing</h3>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/billing/history'}
          >
            View All
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{plan.name} - Monthly</p>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleDateString()} • Next bill: {subscription.currentPeriodEnd.toLocaleDateString()}
              </p>
            </div>
            <span className="font-medium text-gray-900">{formatPrice(plan.price)}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}