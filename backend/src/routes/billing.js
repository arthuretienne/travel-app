// backend/src/routes/billing.js
import express from 'express';
import prisma from '../db/prisma.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  createCheckoutSession,
  createBillingPortalSession,
  constructWebhookEvent,
  getSubscription as getStripeSubscription,
  getEffectivePlan,
  isTripPassActive,
  PLANS,
} from '../services/stripeService.js';

const router = express.Router();

/**
 * GET /api/billing/plans
 * Get all available subscription plans
 */
router.get('/plans', (req, res) => {
  try {
    const plans = Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
      price: plan.price,
      priceMonthly: plan.priceMonthly,
      priceAnnual: plan.priceAnnual,
      currency: plan.currency,
      interval: plan.interval,
      mode: plan.mode || 'subscription',
      durationDays: plan.durationDays || null,
      features: plan.features,
    }));

    res.json({ plans });
  } catch (error) {
    console.error('❌ Error getting plans:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

/**
 * GET /api/billing/usage
 * Get current user's usage stats (searches, limits)
 */
router.get('/usage', authenticateUser, async (req, res) => {
  try {
    let subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
    });

    // Create default free subscription if doesn't exist
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId: req.user.id,
          plan: 'FREE',
          status: 'active',
        },
      });
    }

    const effectivePlan = getEffectivePlan(subscription);
    const planDetails = PLANS[effectivePlan] || PLANS.FREE;
    const limit = planDetails.features.maxSearchesPerMonth;
    const used = subscription.searchesThisMonth || 0;
    const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

    res.json({
      plan: subscription.plan,
      effectivePlan,
      tripPass: {
        active: isTripPassActive(subscription),
        expiresAt: subscription.tripPassExpiresAt || null,
      },
      searches: {
        used,
        limit,
        remaining,
        unlimited: limit === -1,
        percentUsed: limit === -1 ? 0 : Math.round((used / limit) * 100),
      },
      groupTrips: {
        created: subscription.groupTripsCreated || 0,
        limit: planDetails.features.maxGroupTrips,
        unlimited: planDetails.features.maxGroupTrips === -1,
      },
      canSearch: limit === -1 || used < limit,
      needsUpgrade: limit !== -1 && used >= limit,
      upgradeUrl: '/pricing',
    });
  } catch (error) {
    console.error('❌ Error getting usage:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

/**
 * GET /api/billing/subscription
 * Get current user's subscription details
 */
router.get('/subscription', authenticateUser, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
    });

    if (!subscription) {
      // Create default free subscription
      const newSubscription = await prisma.subscription.create({
        data: {
          userId: req.user.id,
          plan: 'FREE',
          status: 'active',
        },
      });

      return res.json({
        subscription: newSubscription,
        planDetails: PLANS.FREE,
      });
    }

    const effectivePlan = getEffectivePlan(subscription);
    const planDetails = PLANS[effectivePlan] || PLANS.FREE;

    res.json({
      subscription,
      planDetails,
      effectivePlan,
      tripPass: {
        active: isTripPassActive(subscription),
        expiresAt: subscription.tripPassExpiresAt || null,
      },
    });
  } catch (error) {
    console.error('❌ Error getting subscription:', error);
    res.status(500).json({ error: 'Failed to get subscription details' });
  }
});

/**
 * POST /api/billing/checkout
 * Create a Stripe checkout session
 */
router.post('/checkout', authenticateUser, async (req, res) => {
  try {
    const { planName, billing = 'monthly' } = req.body;

    if (!planName || !PLANS[planName.toUpperCase()]) {
      return res.status(400).json({ error: 'Invalid plan name' });
    }

    const plan = PLANS[planName.toUpperCase()];
    const billingCycle = billing === 'annual' ? 'annual' : 'monthly';
    const priceId =
      (billingCycle === 'annual' ? plan.priceIdAnnual : plan.priceIdMonthly) || plan.priceId;

    if (!priceId) {
      return res.status(400).json({ error: 'Cannot create checkout for this plan' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await createCheckoutSession({
      userId: req.user.id,
      userEmail: req.user.email,
      planName: planName.toUpperCase(),
      billing: billingCycle,
      successUrl: `${frontendUrl}/account?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancelUrl: `${frontendUrl}/pricing?canceled=true`,
    });

    res.json({
      sessionId: session.sessionId,
      url: session.url,
    });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
    });
  }
});

/**
 * POST /api/billing/portal
 * Create a billing portal session for subscription management
 */
router.post('/portal', authenticateUser, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
    });

    if (!subscription?.stripeCustomerId) {
      return res.status(400).json({
        error: 'No subscription found',
        message: 'You need an active subscription to access the billing portal',
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await createBillingPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${frontendUrl}/account`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Error creating portal session:', error);
    res.status(500).json({
      error: 'Failed to create billing portal session',
    });
  }
});

/**
 * POST /api/billing/webhook
 * Stripe webhook handler for subscription events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // 1) Verify signature — a failure here is the CLIENT's fault → 400, no retry.
  let event;
  try {
    event = constructWebhookEvent(req.body, sig, webhookSecret);
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // 2) Process — a failure here is OUR fault (DB, etc.) → 500 so Stripe RETRIES.
  // Previously handlers swallowed their own errors and we always acked 200,
  // permanently losing events (e.g. a failed subscription upsert).
  try {
    console.log(`🪝 Stripe webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`⚠️  Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    // 500 → Stripe will retry with backoff instead of dropping the event.
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// ========================================
// WEBHOOK HANDLERS
// ========================================

async function handleCheckoutCompleted(session) {
  {
    const userId = session.metadata.userId;
    const planName = session.metadata.planName;

    console.log(`✅ Checkout completed for user ${userId} - Plan: ${planName}`);

    // Trip Pass: one-time payment, no Stripe subscription. Grant a 7-day
    // unlimited window without touching the user's base plan.
    if (planName === 'TRIP_PASS' || session.mode === 'payment') {
      const durationDays = PLANS.TRIP_PASS?.durationDays || 7;
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      await prisma.subscription.upsert({
        where: { userId },
        update: {
          stripeCustomerId: session.customer || undefined,
          tripPassExpiresAt: expiresAt,
        },
        create: {
          userId,
          plan: 'FREE',
          status: 'active',
          stripeCustomerId: session.customer || null,
          tripPassExpiresAt: expiresAt,
        },
      });

      console.log(`✅ Trip Pass granted to user ${userId} until ${expiresAt.toISOString()}`);
      return;
    }

    // Get subscription from Stripe
    const stripeSubscription = await getStripeSubscription(session.subscription);

    // Update or create subscription in database
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        plan: planName,
        status: 'active',
        lastBillingDate: new Date(),
        nextBillingDate: new Date(stripeSubscription.current_period_end * 1000),
      },
      create: {
        userId,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        plan: planName,
        status: 'active',
        lastBillingDate: new Date(),
        nextBillingDate: new Date(stripeSubscription.current_period_end * 1000),
      },
    });

    console.log(`✅ Subscription activated for user ${userId}`);
  }
}

// NB: handlers intentionally do NOT swallow errors — they bubble up to the
// webhook route which answers 500 so Stripe retries. Writes are idempotent.
async function handleSubscriptionUpdate(stripeSubscription) {
  const userId = stripeSubscription.metadata?.userId;

  if (!userId) {
    console.warn('⚠️  No userId in subscription metadata — skipping');
    return;
  }

  const status = stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing'
    ? 'active'
    : stripeSubscription.status;

  const periodEnd = new Date(stripeSubscription.current_period_end * 1000);

  // Upsert by userId (unique) so this is safe regardless of event ordering —
  // e.g. customer.subscription.updated arriving before checkout.session.completed.
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      status,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCurrentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      nextBillingDate: periodEnd,
    },
    create: {
      userId,
      plan: stripeSubscription.metadata?.planName || 'FREE',
      status,
      stripeCustomerId: stripeSubscription.customer || null,
      stripeSubscriptionId: stripeSubscription.id,
      stripeCurrentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      nextBillingDate: periodEnd,
    },
  });

  console.log(`✅ Subscription updated for user ${userId}`);
}

async function handleSubscriptionDeleted(stripeSubscription) {
  // updateMany → no throw if the row is already gone/unknown (idempotent).
  const result = await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: stripeSubscription.id },
    data: {
      status: 'canceled',
      plan: 'FREE', // Downgrade to free
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
    },
  });

  console.log(`✅ Subscription canceled, downgraded to FREE (${result.count} row(s))`);
}

async function handlePaymentSucceeded(invoice) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: 'active',
      lastBillingDate: new Date(invoice.created * 1000),
    },
  });

  console.log(`✅ Payment succeeded for subscription ${subscriptionId}`);
}

async function handlePaymentFailed(invoice) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: 'past_due',
    },
  });

  console.log(`⚠️  Payment failed for subscription ${subscriptionId}`);
}

export default router;
