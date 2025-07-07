import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { subscriptionManager } from '@/lib/stripe/subscriptions'
import { supabase } from '@/lib/supabase/server'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil'
}) : null

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  if (!stripe || !endpointSecret) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { userId, planId } = session.metadata || {}
  
  if (!userId || !planId) {
    console.error('Missing metadata in checkout session')
    return
  }

  console.log(`Checkout completed for user ${userId}, plan ${planId}`)
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { userId, planId } = subscription.metadata || {}
  
  if (!userId || !planId) {
    console.error('Missing metadata in subscription')
    return
  }

  try {
    await subscriptionManager.createSubscription(
      userId,
      subscription.customer as string,
      subscription.id,
      planId as any,
      new Date((subscription as any).current_period_start * 1000),
      new Date((subscription as any).current_period_end * 1000)
    )

    console.log(`Subscription created for user ${userId}`)
  } catch (error) {
    console.error('Error creating subscription in database:', error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    let status: any = subscription.status
    
    // Map Stripe statuses to our statuses
    if (subscription.status === 'incomplete_expired') {
      status = 'incomplete'
    }

    await subscriptionManager.updateSubscriptionStatus(
      subscription.id,
      status,
      new Date((subscription as any).current_period_start * 1000),
      new Date((subscription as any).current_period_end * 1000)
    )

    console.log(`Subscription ${subscription.id} updated with status ${status}`)
  } catch (error) {
    console.error('Error updating subscription in database:', error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    await subscriptionManager.updateSubscriptionStatus(
      subscription.id,
      'canceled'
    )

    console.log(`Subscription ${subscription.id} canceled`)
  } catch (error) {
    console.error('Error canceling subscription in database:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string
  
  if (!subscriptionId) return

  try {
    // Log successful payment
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id, id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (subscription) {
      await supabase
        .from('payment_history')
        .insert({
          id: `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          stripe_payment_intent_id: (invoice as any).payment_intent as string,
          amount: ((invoice as any).amount_paid / 100), // Convert from cents
          currency: (invoice as any).currency,
          status: 'succeeded',
          description: (invoice as any).description || `Payment for ${(invoice as any).lines.data[0]?.description}`
        })
    }

    console.log(`Payment succeeded for invoice ${invoice.id}`)
  } catch (error) {
    console.error('Error logging payment success:', error)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string
  
  if (!subscriptionId) return

  try {
    // Update subscription status to past_due
    await subscriptionManager.updateSubscriptionStatus(
      subscriptionId,
      'past_due'
    )

    // Log failed payment
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id, id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (subscription) {
      await supabase
        .from('payment_history')
        .insert({
          id: `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          stripe_payment_intent_id: (invoice as any).payment_intent as string || 'failed',
          amount: ((invoice as any).amount_due / 100), // Convert from cents
          currency: (invoice as any).currency,
          status: 'failed',
          description: `Failed payment for ${(invoice as any).lines.data[0]?.description}`
        })
    }

    console.log(`Payment failed for invoice ${invoice.id}`)
  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}