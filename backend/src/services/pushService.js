// backend/src/services/pushService.js
// Web Push notification service using VAPID

import webpush from 'web-push';
import prisma from '../db/prisma.js';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:hello@skusku.life';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  console.log('✅ Web Push: VAPID configured');
} else {
  console.warn('⚠️ Web Push: Missing VAPID keys. Run: npx web-push generate-vapid-keys');
}

/**
 * Save a push subscription for a user
 */
export async function saveSubscription(userId, subscription) {
  // Upsert: replace existing subscription for this endpoint
  await prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: {
        userId,
        endpoint: subscription.endpoint,
      },
    },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      updatedAt: new Date(),
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

/**
 * Remove a push subscription
 */
export async function removeSubscription(userId, endpoint) {
  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(userId, payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return;

  const message = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        );
      } catch (err) {
        // 410 Gone or 404 = subscription expired, clean up
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
          console.log(`[Push] Removed expired subscription for user ${userId}`);
        } else {
          console.error(`[Push] Error sending to user ${userId}:`, err.message);
        }
      }
    })
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  console.log(`[Push] Sent ${sent}/${subscriptions.length} notifications to user ${userId}`);
}

/**
 * Send price drop push notification
 */
export async function sendPriceDropPush(userId, { destination, currentPrice, previousPrice, targetPrice }) {
  const priceDrop = previousPrice - currentPrice;
  await sendPushToUser(userId, {
    title: `Price drop for ${destination}!`,
    body: `Price dropped by ${priceDrop} to ${currentPrice} (target: ${targetPrice})`,
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    tag: `price-drop-${destination}`,
    data: {
      url: '/price-alerts',
      type: 'price-drop',
      destination,
    },
  });
}

export default { saveSubscription, removeSubscription, sendPushToUser, sendPriceDropPush };
