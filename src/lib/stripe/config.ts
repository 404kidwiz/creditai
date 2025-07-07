import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic Plan',
    description: 'Perfect for individuals starting their credit repair journey',
    price: 29.99,
    interval: 'month',
    features: [
      'AI-powered credit report analysis',
      'Up to 5 dispute letters per month',
      'Basic credit score tracking',
      'Email support'
    ],
    limits: {
      disputeLetters: 5,
      creditReports: 3,
      scoreTracking: true
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    description: 'For serious credit repair with advanced features',
    price: 59.99,
    interval: 'month',
    popular: true,
    features: [
      'Everything in Basic',
      'Unlimited dispute letters',
      'Advanced credit monitoring',
      'Goal tracking with milestones',
      'Priority email support',
      'Monthly credit score updates'
    ],
    limits: {
      disputeLetters: -1, // unlimited
      creditReports: 10,
      scoreTracking: true,
      goalTracking: true,
      prioritySupport: true
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium Plan',
    description: 'Complete credit repair solution with expert guidance',
    price: 99.99,
    interval: 'month',
    features: [
      'Everything in Pro',
      'Unlimited credit reports',
      'Personalized action plans',
      'Phone support',
      'Quarterly credit consultations',
      'Identity monitoring',
      'Credit building recommendations'
    ],
    limits: {
      disputeLetters: -1, // unlimited
      creditReports: -1, // unlimited
      scoreTracking: true,
      goalTracking: true,
      prioritySupport: true,
      phoneSupport: true,
      consultations: true
    }
  }
} as const

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS
export type PlanDetails = typeof SUBSCRIPTION_PLANS[SubscriptionPlan]

// Helper functions
export function getPlanDetails(planId: SubscriptionPlan): PlanDetails {
  return SUBSCRIPTION_PLANS[planId]
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}

export function isFeatureAvailable(
  userPlan: SubscriptionPlan | null,
  feature: string,
  usage?: number
): boolean {
  if (!userPlan) return false
  
  const plan = getPlanDetails(userPlan)
  
  switch (feature) {
    case 'disputeLetters':
      const limit = plan.limits.disputeLetters
      return limit === -1 || (usage || 0) < limit
    
    case 'creditReports':
      const reportLimit = plan.limits.creditReports
      return reportLimit === -1 || (usage || 0) < reportLimit
    
    case 'scoreTracking':
      return plan.limits.scoreTracking || false
    
    case 'goalTracking':
      return (plan.limits as any).goalTracking || false
    
    case 'prioritySupport':
      return (plan.limits as any).prioritySupport || false
    
    case 'phoneSupport':
      return (plan.limits as any).phoneSupport || false
    
    case 'consultations':
      return (plan.limits as any).consultations || false
    
    default:
      return false
  }
}