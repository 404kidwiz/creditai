import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { SUBSCRIPTION_PLANS } from '@/lib/stripe/config'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil'
}) : null

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      )
    }

    const { planId, userId, billingInterval = 'month' } = await request.json()

    if (!planId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      )
    }

    // Calculate price based on billing interval
    let unitAmount = Math.round(plan.price * 100) // Convert to cents
    if (billingInterval === 'year') {
      unitAmount = Math.round(plan.price * 12 * 0.8 * 100) // 20% discount for yearly
    }

    // Create or retrieve customer
    const customers = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1
    })

    let customer
    if (customers.data.length > 0) {
      customer = customers.data[0]
    } else {
      customer = await stripe.customers.create({
        metadata: { userId }
      })
    }

    // Create price object
    const price = await stripe.prices.create({
      unit_amount: unitAmount,
      currency: 'usd',
      recurring: {
        interval: billingInterval === 'year' ? 'year' : 'month'
      },
      product_data: {
        name: plan.name,
        metadata: {
          planId
        }
      },
      metadata: {
        planId,
        billingInterval
      }
    })

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        userId,
        planId,
        billingInterval
      },
      subscription_data: {
        metadata: {
          userId,
          planId,
          billingInterval
        },
        trial_period_days: 7 // 7-day free trial
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto'
      }
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}