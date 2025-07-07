import { supabase } from '@/lib/supabase/client'
import { SubscriptionPlan } from './config'

export interface Subscription {
  id: string
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  plan: SubscriptionPlan
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  usage: SubscriptionUsage
  createdAt: Date
  updatedAt: Date
}

export interface SubscriptionUsage {
  disputeLetters: number
  creditReports: number
  scoreUpdates: number
  periodStart: Date
}

export class SubscriptionManager {
  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error || !data) return null

    return this.mapDatabaseToSubscription(data)
  }

  /**
   * Create a new subscription
   */
  async createSubscription(
    userId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    plan: SubscriptionPlan,
    currentPeriodStart: Date,
    currentPeriodEnd: Date
  ): Promise<Subscription> {
    const subscription: Partial<Subscription> = {
      id: this.generateId(),
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      plan,
      status: 'active',
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      usage: {
        disputeLetters: 0,
        creditReports: 0,
        scoreUpdates: 0,
        periodStart: currentPeriodStart
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const { error } = await supabase
      .from('subscriptions')
      .insert({
        id: subscription.id,
        user_id: subscription.userId,
        stripe_customer_id: subscription.stripeCustomerId,
        stripe_subscription_id: subscription.stripeSubscriptionId,
        plan: subscription.plan,
        status: subscription.status,
        current_period_start: subscription.currentPeriodStart?.toISOString(),
        current_period_end: subscription.currentPeriodEnd?.toISOString(),
        cancel_at_period_end: subscription.cancelAtPeriodEnd,
        usage: subscription.usage,
        created_at: subscription.createdAt?.toISOString(),
        updated_at: subscription.updatedAt?.toISOString()
      })

    if (error) {
      console.error('Error creating subscription:', error)
      throw new Error('Failed to create subscription')
    }

    return subscription as Subscription
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: Subscription['status'],
    currentPeriodStart?: Date,
    currentPeriodEnd?: Date
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (currentPeriodStart) {
      updateData.current_period_start = currentPeriodStart.toISOString()
    }
    if (currentPeriodEnd) {
      updateData.current_period_end = currentPeriodEnd.toISOString()
    }

    const { error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('stripe_subscription_id', stripeSubscriptionId)

    if (error) {
      console.error('Error updating subscription:', error)
      throw new Error('Failed to update subscription')
    }
  }

  /**
   * Track usage for a feature
   */
  async trackUsage(
    userId: string,
    feature: keyof SubscriptionUsage
  ): Promise<void> {
    const subscription = await this.getUserSubscription(userId)
    if (!subscription) return

    // Reset usage if we're in a new period
    const now = new Date()
    if (now >= subscription.currentPeriodEnd) {
      await this.resetUsage(subscription.id, now)
      return
    }

    // Increment usage
    const currentUsage = (subscription.usage[feature] as number) || 0
    const newUsage = {
      ...subscription.usage,
      [feature]: currentUsage + 1
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({
        usage: newUsage,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (error) {
      console.error('Error tracking usage:', error)
    }
  }

  /**
   * Check if user can use a feature
   */
  async canUseFeature(
    userId: string,
    feature: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const subscription = await this.getUserSubscription(userId)
    
    if (!subscription) {
      return { allowed: false, reason: 'No active subscription' }
    }

    if (subscription.status !== 'active') {
      return { allowed: false, reason: 'Subscription not active' }
    }

    // Import here to avoid circular dependency
    const { isFeatureAvailable } = await import('./config')
    
    let usage = 0
    switch (feature) {
      case 'disputeLetters':
        usage = subscription.usage.disputeLetters
        break
      case 'creditReports':
        usage = subscription.usage.creditReports
        break
    }

    const allowed = isFeatureAvailable(subscription.plan, feature, usage)
    
    if (!allowed) {
      return { 
        allowed: false, 
        reason: `Feature limit reached for ${subscription.plan} plan` 
      }
    }

    return { allowed: true }
  }

  /**
   * Get subscription usage statistics
   */
  async getUsageStats(userId: string): Promise<SubscriptionUsage | null> {
    const subscription = await this.getUserSubscription(userId)
    return subscription?.usage || null
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(userId: string): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) {
      console.error('Error canceling subscription:', error)
      throw new Error('Failed to cancel subscription')
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(userId: string): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) {
      console.error('Error reactivating subscription:', error)
      throw new Error('Failed to reactivate subscription')
    }
  }

  /**
   * Private helper methods
   */
  private async resetUsage(subscriptionId: string, periodStart: Date): Promise<void> {
    const resetUsage: SubscriptionUsage = {
      disputeLetters: 0,
      creditReports: 0,
      scoreUpdates: 0,
      periodStart
    }

    await supabase
      .from('subscriptions')
      .update({
        usage: resetUsage,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
  }

  private generateId(): string {
    return `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private mapDatabaseToSubscription(data: any): Subscription {
    return {
      id: data.id,
      userId: data.user_id,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      plan: data.plan,
      status: data.status,
      currentPeriodStart: new Date(data.current_period_start),
      currentPeriodEnd: new Date(data.current_period_end),
      cancelAtPeriodEnd: data.cancel_at_period_end,
      usage: data.usage || {
        disputeLetters: 0,
        creditReports: 0,
        scoreUpdates: 0,
        periodStart: new Date(data.current_period_start)
      },
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }
}

// Singleton instance
export const subscriptionManager = new SubscriptionManager()