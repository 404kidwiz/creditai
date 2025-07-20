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
  async getUserSubscription(userId: string, supabaseClient?: any): Promise<Subscription | null> {
    if (!supabaseClient) {
      console.log('No Supabase client provided, returning null subscription')
      return null
    }

    try {
      const { data, error } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (error || !data) return null

      return this.mapDatabaseToSubscription(data)
    } catch (error) {
      console.error('Error getting user subscription:', error)
      return null
    }
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
    currentPeriodEnd: Date,
    supabaseClient?: any
  ): Promise<Subscription | null> {
    if (!supabaseClient) {
      console.log('No Supabase client provided, skipping subscription creation')
      return null
    }

    try {
      const subscription = {
        id: this.generateId(),
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        plan: plan,
        status: 'active',
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: false,
        usage: {
          disputeLetters: 0,
          creditReports: 0,
          scoreUpdates: 0,
          periodStart: currentPeriodStart
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabaseClient
        .from('subscriptions')
        .insert(subscription)

      if (error) {
        console.error('Error creating subscription:', error)
        return null
      }

      return this.mapDatabaseToSubscription(subscription)
    } catch (error) {
      console.error('Error creating subscription:', error)
      return null
    }
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: string,
    currentPeriodStart?: Date,
    currentPeriodEnd?: Date,
    supabaseClient?: any
  ): Promise<void> {
    if (!supabaseClient) {
      console.log('No Supabase client provided, skipping subscription update')
      return
    }

    try {
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

      const { error } = await supabaseClient
        .from('subscriptions')
        .update(updateData)
        .eq('stripe_subscription_id', stripeSubscriptionId)

      if (error) {
        console.error('Error updating subscription status:', error)
      }
    } catch (error) {
      console.error('Error updating subscription status:', error)
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string, supabaseClient?: any): Promise<void> {
    if (!supabaseClient) {
      console.log('No Supabase client provided, skipping subscription cancellation')
      return
    }

    try {
      const { error } = await supabaseClient
        .from('subscriptions')
        .update({ 
          status: 'canceled',
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active')

      if (error) {
        console.error('Error canceling subscription:', error)
        throw new Error('Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      throw error
    }
  }

  /**
   * Reactivate a subscription
   */
  async reactivateSubscription(userId: string, supabaseClient?: any): Promise<void> {
    if (!supabaseClient) {
      console.log('No Supabase client provided, skipping subscription reactivation')
      return
    }

    try {
      const { error } = await supabaseClient
        .from('subscriptions')
        .update({ 
          status: 'active',
          cancel_at_period_end: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .in('status', ['canceled', 'past_due'])

      if (error) {
        console.error('Error reactivating subscription:', error)
        throw new Error('Failed to reactivate subscription')
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      throw error
    }
  }

  /**
   * Check if user can perform action based on subscription limits
   */
  async canPerformAction(
    userId: string,
    action: 'dispute_letter' | 'credit_report' | 'score_update',
    supabaseClient?: any
  ): Promise<boolean> {
    if (!supabaseClient) {
      console.log('No Supabase client provided, allowing action')
      return true
    }

    try {
      const subscription = await this.getUserSubscription(userId, supabaseClient)
      if (!subscription) return false

      // Check limits based on plan
      const limits = this.getPlanLimits(subscription.plan)
      
      switch (action) {
        case 'dispute_letter':
          return subscription.usage.disputeLetters < limits.disputeLetters
        case 'credit_report':
          return subscription.usage.creditReports < limits.creditReports
        case 'score_update':
          return subscription.usage.scoreUpdates < limits.scoreUpdates
        default:
          return false
      }
    } catch (error) {
      console.error('Error checking subscription limits:', error)
      return false
    }
  }

  /**
   * Map database record to Subscription object
   */
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

  /**
   * Get plan limits
   */
  private getPlanLimits(plan: SubscriptionPlan) {
    const limits = {
      basic: { disputeLetters: 5, creditReports: 1, scoreUpdates: 12 },
      premium: { disputeLetters: 15, creditReports: 3, scoreUpdates: 36 },
      professional: { disputeLetters: 50, creditReports: 12, scoreUpdates: 120 }
    }
    return limits[plan] || limits.basic
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
export const subscriptionManager = new SubscriptionManager()