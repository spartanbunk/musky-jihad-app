const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { query } = require('../database/connection')
const { authenticateToken } = require('./auth')

const router = express.Router()

// Create Stripe checkout session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { priceId, mode = 'subscription' } = req.body

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({ error: 'Stripe not configured' })
    }

    // Get or create Stripe customer
    let customerId
    const userResult = await query(
      'SELECT stripe_customer_id, email FROM users WHERE id = $1',
      [req.user.userId]
    )

    if (userResult.rows[0].stripe_customer_id) {
      customerId = userResult.rows[0].stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userResult.rows[0].email,
        metadata: {
          userId: req.user.userId
        }
      })
      
      customerId = customer.id
      
      // Save customer ID
      await query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, req.user.userId]
      )
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId || 'price_1234567890', // Replace with actual price ID
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/subscription`,
      metadata: {
        userId: req.user.userId
      }
    })

    res.json({ sessionId: session.id })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

// Get subscription status
router.get('/subscription-status', authenticateToken, async (req, res) => {
  try {
    const userResult = await query(
      'SELECT subscription_status, subscription_id, trial_end_date, stripe_customer_id FROM users WHERE id = $1',
      [req.user.userId]
    )

    const user = userResult.rows[0]
    let subscriptionDetails = null

    if (user.subscription_id && process.env.STRIPE_SECRET_KEY) {
      try {
        subscriptionDetails = await stripe.subscriptions.retrieve(user.subscription_id)
      } catch (error) {
        console.error('Error retrieving subscription:', error)
      }
    }

    res.json({
      status: user.subscription_status,
      trialEndDate: user.trial_end_date,
      subscription: subscriptionDetails,
      hasStripeCustomer: !!user.stripe_customer_id
    })
  } catch (error) {
    console.error('Subscription status error:', error)
    res.status(500).json({ error: 'Failed to get subscription status' })
  }
})

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const userResult = await query(
      'SELECT subscription_id FROM users WHERE id = $1',
      [req.user.userId]
    )

    const subscriptionId = userResult.rows[0]?.subscription_id

    if (!subscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' })
    }

    // Cancel at period end
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    })

    // Update database
    await query(
      'UPDATE users SET subscription_status = $1 WHERE id = $2',
      ['canceled', req.user.userId]
    )

    res.json({ message: 'Subscription canceled successfully' })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    res.status(500).json({ error: 'Failed to cancel subscription' })
  }
})

// Stripe webhook handler
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.json({received: true})
  } catch (error) {
    console.error('Webhook handler error:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

async function handleCheckoutSessionCompleted(session) {
  const userId = session.metadata.userId
  if (!userId) return

  await query(
    'UPDATE users SET subscription_status = $1 WHERE id = $2',
    ['active', userId]
  )

  console.log(`Checkout completed for user ${userId}`)
}

async function handleSubscriptionUpdated(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer)
  const userId = customer.metadata.userId
  if (!userId) return

  let status = 'active'
  if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
    status = 'canceled'
  } else if (subscription.status === 'past_due') {
    status = 'past_due'
  }

  await query(
    'UPDATE users SET subscription_status = $1, subscription_id = $2 WHERE id = $3',
    [status, subscription.id, userId]
  )

  console.log(`Subscription ${subscription.id} updated to ${status} for user ${userId}`)
}

async function handleSubscriptionDeleted(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer)
  const userId = customer.metadata.userId
  if (!userId) return

  await query(
    'UPDATE users SET subscription_status = $1, subscription_id = NULL WHERE id = $2',
    ['canceled', userId]
  )

  console.log(`Subscription deleted for user ${userId}`)
}

async function handlePaymentSucceeded(invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
  const customer = await stripe.customers.retrieve(subscription.customer)
  const userId = customer.metadata.userId
  if (!userId) return

  await query(
    'UPDATE users SET subscription_status = $1 WHERE id = $2',
    ['active', userId]
  )

  console.log(`Payment succeeded for user ${userId}`)
}

async function handlePaymentFailed(invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
  const customer = await stripe.customers.retrieve(subscription.customer)
  const userId = customer.metadata.userId
  if (!userId) return

  await query(
    'UPDATE users SET subscription_status = $1 WHERE id = $2',
    ['past_due', userId]
  )

  console.log(`Payment failed for user ${userId}`)
}

module.exports = router