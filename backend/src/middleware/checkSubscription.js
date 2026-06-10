// backend/src/middleware/checkSubscription.js
import prisma from '../db/prisma.js';
import { getPlanDetails, getEffectivePlan, isTripPassActive, isWithinLimit } from '../services/stripeService.js';

/**
 * Check if we need to reset monthly usage (first of the month)
 * Returns true if reset was performed
 */
async function checkAndResetMonthlyUsage(subscription) {
  if (!subscription) return false;

  const now = new Date();
  const lastReset = subscription.updatedAt;

  // Check if we're in a new month compared to the last update
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastResetMonth = lastReset.getMonth();
  const lastResetYear = lastReset.getFullYear();

  // Reset if it's a new month
  if (currentYear > lastResetYear || (currentYear === lastResetYear && currentMonth > lastResetMonth)) {
    console.log(`🔄 New month detected - resetting usage for user ${subscription.userId}`);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        searchesThisMonth: 0,
        // groupTripsCreated stays - only reset searches
      },
    });

    return true;
  }

  return false;
}

/**
 * Middleware to check if user has an active subscription
 * Attaches subscription data to req.subscription
 */
export async function checkSubscription(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get or create subscription
    let subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    // Create default free subscription if doesn't exist
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          plan: 'FREE',
          status: 'active',
        },
      });
      console.log(`✅ Created default FREE subscription for user ${userId}`);
    }

    // An active Trip Pass grants access on its own, independent of the
    // subscription status (it's a one-time purchase, not a renewal).
    const tripPassActive = isTripPassActive(subscription);

    // Check if subscription is active
    if (!tripPassActive && subscription.status !== 'active' && subscription.status !== 'trialing') {
      return res.status(403).json({
        error: 'Subscription inactive',
        message: 'Your subscription is not active. Please update your payment method.',
        plan: subscription.plan,
        status: subscription.status,
      });
    }

    // Check if Stripe subscription has expired
    if (!tripPassActive && subscription.stripeCurrentPeriodEnd && new Date() > subscription.stripeCurrentPeriodEnd) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'past_due' },
      });

      return res.status(403).json({
        error: 'Subscription expired',
        message: 'Your subscription has expired. Please renew to continue.',
      });
    }

    // Attach subscription to request
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error('❌ Subscription check error:', error);
    return res.status(500).json({
      error: 'Failed to verify subscription',
    });
  }
}

/**
 * Middleware to check feature access
 * Usage: requireFeature('collaborativeVoting')
 */
export function requireFeature(featureName) {
  return async (req, res, next) => {
    // BETA MODE: Bypass all feature checks - set BETA_MODE=true to disable limits
    const BETA_MODE = process.env.BETA_MODE === 'true' || process.env.STRIPE_DISABLED === 'true';

    if (BETA_MODE) {
      console.log(`🚀 BETA MODE: Bypassing feature check for ${featureName}`);
      return next();
    }

    try {
      if (!req.subscription) {
        await checkSubscription(req, res, () => {});
        // checkSubscription may have already answered (403 inactive / 500). If
        // so, stop here — writing again would throw "headers already sent".
        if (res.headersSent) return;
        if (!req.subscription) return res.status(500).json({ error: 'Failed to verify feature access' });
      }

      const plan = getPlanDetails(getEffectivePlan(req.subscription));
      const hasAccess = plan.features[featureName];

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Feature not available',
          message: `This feature requires ${featureName === 'collaborativeVoting' ? 'Explorer or Wanderer' : 'a higher'} plan.`,
          currentPlan: req.subscription.plan,
          requiredFeature: featureName,
          upgradeUrl: '/pricing',
        });
      }

      next();
    } catch (error) {
      console.error('❌ Feature check error:', error);
      return res.status(500).json({
        error: 'Failed to verify feature access',
      });
    }
  };
}

/**
 * Middleware to check usage limits
 * Usage: checkLimit('maxSearchesPerMonth', 'searchesThisMonth')
 */
export function checkLimit(limitType, usageField) {
  return async (req, res, next) => {
    // BETA MODE: Bypass all limits - set BETA_MODE=true to disable limits
    const BETA_MODE = process.env.BETA_MODE === 'true' || process.env.STRIPE_DISABLED === 'true';

    if (BETA_MODE) {
      console.log(`🚀 BETA MODE: Bypassing limit check for ${limitType}`);
      return next();
    }

    try {
      // DEV MODE: Bypass all usage limits during development. Never in prod —
      // a stray DEV_MODE=true on Render must not silently disable the paywall.
      const DEV_MODE = process.env.NODE_ENV !== 'production' &&
        (process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development');

      if (DEV_MODE) {
        console.log('🚀 DEV MODE: Bypassing usage limits for testing');
        return next();
      }

      if (!req.subscription) {
        await checkSubscription(req, res, () => {});
        if (res.headersSent) return;
        if (!req.subscription) return res.status(500).json({ error: 'Failed to verify usage limits' });
      }

      // Check for monthly reset before checking limits
      const wasReset = await checkAndResetMonthlyUsage(req.subscription);
      if (wasReset) {
        // Refresh subscription data after reset
        req.subscription = await prisma.subscription.findUnique({
          where: { userId: req.user.id },
        });
      }

      const plan = getPlanDetails(getEffectivePlan(req.subscription));
      const limit = plan.features[limitType];
      const currentUsage = req.subscription[usageField] || 0;

      // -1 means unlimited
      if (limit === -1) {
        return next();
      }

      if (currentUsage >= limit) {
        return res.status(403).json({
          error: 'Usage limit reached',
          message: `You have reached your monthly limit of ${limit} ${limitType}. Upgrade to continue.`,
          currentPlan: req.subscription.plan,
          limit,
          currentUsage,
          upgradeUrl: '/pricing',
        });
      }

      next();
    } catch (error) {
      console.error('❌ Limit check error:', error);
      return res.status(500).json({
        error: 'Failed to verify usage limits',
      });
    }
  };
}

/**
 * Middleware to increment usage counter after successful operation
 * Usage: incrementUsage('searchesThisMonth')
 */
export function incrementUsage(usageField) {
  return async (req, res, next) => {
    // BETA MODE: Skip all usage tracking - set BETA_MODE=true to disable limits
    const BETA_MODE = process.env.BETA_MODE === 'true' || process.env.STRIPE_DISABLED === 'true';

    if (BETA_MODE) {
      return next();
    }

    // DEV MODE: Skip incrementing usage during development (never in prod).
    const DEV_MODE = process.env.NODE_ENV !== 'production' &&
      (process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development');

    if (DEV_MODE) {
      console.log('🚀 DEV MODE: Skipping usage increment for testing');
      return next();
    }

    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Only increment if response is successful (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.id) {
        prisma.subscription
          .updateMany({
            where: { userId: req.user.id },
            data: {
              [usageField]: {
                increment: 1,
              },
            },
          })
          .then((result) => {
            if (result.count > 0) {
              console.log(`📊 Incremented ${usageField} for user ${req.user.id}`);
            }
          })
          .catch(err => {
            console.error(`❌ Failed to increment ${usageField}:`, err.message);
          });
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Reset monthly usage counters (run via cron job)
 */
export async function resetMonthlyUsage() {
  try {
    console.log('🔄 Resetting monthly usage counters...');

    const result = await prisma.subscription.updateMany({
      data: {
        searchesThisMonth: 0,
      },
    });

    console.log(`✅ Reset usage for ${result.count} subscriptions`);
    return result;
  } catch (error) {
    console.error('❌ Error resetting monthly usage:', error);
    throw error;
  }
}

export default {
  checkSubscription,
  requireFeature,
  checkLimit,
  incrementUsage,
  resetMonthlyUsage,
};
