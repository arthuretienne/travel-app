// backend/src/services/stripeService.js
import Stripe from 'stripe';

// Initialize Stripe only if API key is provided (optional for development)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    })
  : null;

// Subscription plans configuration
export const PLANS = {
  FREE: {
    name: 'Free',
    priceId: null, // No Stripe price for free plan
    price: 0,
    currency: 'eur',
    interval: null,
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
    name: 'Explorer',
    priceId: process.env.STRIPE_PRICE_ID_EXPLORER, // Will be set from Stripe dashboard
    price: 9.99,
    currency: 'eur',
    interval: 'month',
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
    priceId: process.env.STRIPE_PRICE_ID_WANDERER, // Will be set from Stripe dashboard
    price: 19.99,
    currency: 'eur',
    interval: 'month',
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
};

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession({ userId, userEmail, planName, successUrl, cancelUrl }) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }

    const plan = PLANS[planName.toUpperCase()];

    if (!plan || !plan.priceId) {
      throw new Error(`Invalid plan: ${planName}`);
    }

    console.log(`💳 Creating Stripe checkout session for user ${userId} - Plan: ${planName}`);

    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      client_reference_id: userId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planName,
      },
      subscription_data: {
        metadata: {
          userId,
          planName,
        },
      },
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
  hasFeatureAccess,
  isWithinLimit,
};
