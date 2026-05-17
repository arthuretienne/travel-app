// backend/src/services/stripeService.js
import Stripe from 'stripe';

// Initialize Stripe only if API key is provided (optional for development)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    })
  : null;

// Subscription plans configuration.
// DB stores the plan KEY (FREE / EXPLORER / WANDERER) — kept stable to avoid a
// migration. `name` is the customer-facing label (EXPLORER ships as "Starter").
// Monthly/annual Stripe price IDs are resolved per billing cycle; legacy
// `priceId`/`price`/`interval` are kept so older callers keep working.
export const PLANS = {
  FREE: {
    name: 'Free',
    priceId: null, // No Stripe price for free plan
    priceIdMonthly: null,
    priceIdAnnual: null,
    price: 0,
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'eur',
    interval: null,
    mode: 'subscription',
    features: {
      maxSearchesPerMonth: 10,
      maxGroupTrips: 2,
      maxMembersPerTrip: 5,
      aiRecommendations: true,
      flightSearch: true,
      hotelSearch: true,
      collaborativeVoting: true, // Enabled for beta testing
      prioritySupport: false,
    },
  },
  EXPLORER: {
    name: 'Starter',
    priceId: process.env.STRIPE_PRICE_ID_EXPLORER, // legacy alias = monthly
    priceIdMonthly: process.env.STRIPE_PRICE_ID_EXPLORER,
    priceIdAnnual: process.env.STRIPE_PRICE_ID_EXPLORER_ANNUAL,
    price: 3.99,
    priceMonthly: 3.99,
    priceAnnual: 29,
    currency: 'eur',
    interval: 'month',
    mode: 'subscription',
    features: {
      maxSearchesPerMonth: 50,
      maxGroupTrips: 5,
      maxMembersPerTrip: 10,
      aiRecommendations: true,
      flightSearch: true,
      hotelSearch: true,
      collaborativeVoting: true,
      prioritySupport: false,
    },
  },
  WANDERER: {
    name: 'Wanderer',
    priceId: process.env.STRIPE_PRICE_ID_WANDERER, // legacy alias = monthly
    priceIdMonthly: process.env.STRIPE_PRICE_ID_WANDERER,
    priceIdAnnual: process.env.STRIPE_PRICE_ID_WANDERER_ANNUAL,
    price: 6.99,
    priceMonthly: 6.99,
    priceAnnual: 49,
    currency: 'eur',
    interval: 'month',
    mode: 'subscription',
    features: {
      maxSearchesPerMonth: -1, // Unlimited
      maxGroupTrips: -1, // Unlimited
      maxMembersPerTrip: -1, // Unlimited
      aiRecommendations: true,
      flightSearch: true,
      hotelSearch: true,
      collaborativeVoting: true,
      prioritySupport: true,
    },
  },
  // One-time 7-day unlimited pass — not a recurring subscription.
  TRIP_PASS: {
    name: 'Trip Pass',
    priceId: process.env.STRIPE_PRICE_ID_TRIP_PASS,
    priceIdMonthly: process.env.STRIPE_PRICE_ID_TRIP_PASS,
    priceIdAnnual: process.env.STRIPE_PRICE_ID_TRIP_PASS,
    price: 5.99,
    priceMonthly: 5.99,
    priceAnnual: 5.99,
    currency: 'eur',
    interval: null,
    mode: 'payment',
    durationDays: 7,
    features: {
      maxSearchesPerMonth: -1,
      maxGroupTrips: -1,
      maxMembersPerTrip: -1,
      aiRecommendations: true,
      flightSearch: true,
      hotelSearch: true,
      collaborativeVoting: true,
      prioritySupport: true,
    },
  },
};

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession({ userId, userEmail, planName, billing = 'monthly', successUrl, cancelUrl }) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    const plan = PLANS[planName.toUpperCase()];

    if (!plan) {
      throw new Error(`Invalid plan: ${planName}`);
    }

    const isAnnual = billing === 'annual';
    const priceId = (isAnnual ? plan.priceIdAnnual : plan.priceIdMonthly) || plan.priceId;

    if (!priceId) {
      throw new Error(`No Stripe price configured for plan ${planName} (${billing})`);
    }

    const mode = plan.mode || 'subscription';

    console.log(`💳 Creating Stripe checkout (${mode}) for user ${userId} - Plan: ${planName} / ${billing}`);

    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      client_reference_id: userId,
      mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planName,
        billing,
      },
      ...(mode === 'subscription'
        ? {
            subscription_data: {
              metadata: {
                userId,
                planName,
                billing,
              },
            },
          }
        : {}),
    });

    console.log(`✅ Checkout session created: ${session.id}`);
    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create a billing portal session for subscription management
 */
export async function createBillingPortalSession({ customerId, returnUrl }) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    console.log(`💳 Creating billing portal session for customer ${customerId}`);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    console.log(`✅ Billing portal session created: ${session.id}`);
    return {
      url: session.url,
    };
  } catch (error) {
    console.error('❌ Error creating billing portal session:', error);
    throw error;
  }
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscription(subscriptionId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('❌ Error retrieving subscription:', error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    console.log(`💳 Canceling subscription: ${subscriptionId}`);

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    console.log(`✅ Subscription will be canceled at period end`);
    return subscription;
  } catch (error) {
    console.error('❌ Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(subscriptionId) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    console.log(`💳 Reactivating subscription: ${subscriptionId}`);

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    console.log(`✅ Subscription reactivated`);
    return subscription;
  } catch (error) {
    console.error('❌ Error reactivating subscription:', error);
    throw error;
  }
}

/**
 * Verify Stripe webhook signature
 */
export function constructWebhookEvent(payload, signature, webhookSecret) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    throw error;
  }
}

/**
 * Get customer from Stripe by email
 */
export async function getCustomerByEmail(email) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    return customers.data.length > 0 ? customers.data[0] : null;
  } catch (error) {
    console.error('❌ Error getting customer by email:', error);
    throw error;
  }
}

/**
 * Create a Stripe customer
 */
export async function createCustomer({ email, name, metadata }) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    console.log(`💳 Creating Stripe customer: ${email}`);

    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    console.log(`✅ Customer created: ${customer.id}`);
    return customer;
  } catch (error) {
    console.error('❌ Error creating customer:', error);
    throw error;
  }
}

/**
 * Get plan details by name
 */
export function getPlanDetails(planName) {
  const plan = PLANS[planName?.toUpperCase()];
  if (!plan) {
    return PLANS.FREE; // Default to free plan
  }
  return plan;
}

/**
 * Resolve the plan KEY a user effectively has right now.
 * An active Trip Pass (tripPassExpiresAt in the future) grants TRIP_PASS-level
 * entitlements without overwriting the user's base `plan` — so they revert
 * cleanly to their original plan once it lapses.
 */
export function isTripPassActive(subscription) {
  return Boolean(
    subscription?.tripPassExpiresAt &&
    new Date(subscription.tripPassExpiresAt) > new Date()
  );
}

export function getEffectivePlan(subscription) {
  if (isTripPassActive(subscription)) return 'TRIP_PASS';
  return subscription?.plan || 'FREE';
}

/**
 * Check if user has feature access based on plan
 */
export function hasFeatureAccess(userPlan, feature) {
  const plan = getPlanDetails(userPlan);
  return plan.features[feature] === true || plan.features[feature] === -1;
}

/**
 * Check if user is within usage limits
 */
export function isWithinLimit(userPlan, limitType, currentUsage) {
  const plan = getPlanDetails(userPlan);
  const limit = plan.features[limitType];

  // -1 means unlimited
  if (limit === -1) {
    return true;
  }

  return currentUsage < limit;
}

export default {
  PLANS,
  createCheckoutSession,
  createBillingPortalSession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  constructWebhookEvent,
  getCustomerByEmail,
  createCustomer,
  getPlanDetails,
  getEffectivePlan,
  isTripPassActive,
  hasFeatureAccess,
  isWithinLimit,
};
