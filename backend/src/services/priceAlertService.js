// backend/src/services/priceAlertService.js
// Price alert service for tracking flight and hotel prices

import prisma from '../db/prisma.js';
import { searchFlights, getDestinationId as getFlightDestinationId, searchHotels } from './bookingService.js';
import { sendPriceDropEmail } from './emailService.js';
import { sendPriceDropPush } from './pushService.js';

/**
 * Create a new price alert for a user
 */
export async function createPriceAlert({
  userId,
  savedTripId,
  destination,
  country,
  origin,
  departureDate,
  returnDate,
  initialPrice,
  targetPrice,
  alertType = 'flight',
  frequency = 'daily',
}) {
  // Calculate duration
  const start = new Date(departureDate);
  const end = new Date(returnDate);
  const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  // Target price defaults to 10% below initial price
  const finalTargetPrice = targetPrice || Math.round(initialPrice * 0.9);

  const alert = await prisma.priceAlert.create({
    data: {
      userId,
      savedTripId,
      destination,
      country,
      origin,
      departureDate: new Date(departureDate),
      returnDate: new Date(returnDate),
      duration,
      initialPrice,
      targetPrice: finalTargetPrice,
      currentPrice: initialPrice,
      lowestPrice: initialPrice,
      priceHistory: JSON.stringify([{ date: new Date().toISOString(), price: initialPrice }]),
      alertType,
      frequency,
      isActive: true,
      status: 'active',
    },
  });

  console.log(`🔔 Created price alert: ${destination} from ${origin} (target: €${finalTargetPrice})`);

  return alert;
}

/**
 * Get all active alerts for a user
 */
export async function getUserAlerts(userId) {
  const alerts = await prisma.priceAlert.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return alerts.map(alert => ({
    ...alert,
    priceHistory: JSON.parse(alert.priceHistory || '[]'),
  }));
}

/**
 * Get a single alert by ID
 */
export async function getAlertById(alertId, userId) {
  const alert = await prisma.priceAlert.findFirst({
    where: {
      id: alertId,
      userId,
    },
  });

  if (!alert) return null;

  return {
    ...alert,
    priceHistory: JSON.parse(alert.priceHistory || '[]'),
  };
}

/**
 * Update alert settings
 */
export async function updateAlert(alertId, userId, updates) {
  const alert = await prisma.priceAlert.findFirst({
    where: { id: alertId, userId },
  });

  if (!alert) {
    throw new Error('Alert not found');
  }

  const updated = await prisma.priceAlert.update({
    where: { id: alertId },
    data: {
      targetPrice: updates.targetPrice,
      isActive: updates.isActive,
      frequency: updates.frequency,
      status: updates.status,
    },
  });

  console.log(`📝 Updated price alert ${alertId}`);
  return updated;
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId, userId) {
  const alert = await prisma.priceAlert.findFirst({
    where: { id: alertId, userId },
  });

  if (!alert) {
    throw new Error('Alert not found');
  }

  await prisma.priceAlert.delete({
    where: { id: alertId },
  });

  console.log(`🗑️ Deleted price alert ${alertId}`);
  return { success: true };
}

/**
 * Check price for a single alert and update
 */
export async function checkAlertPrice(alert) {
  try {
    console.log(`🔍 Checking price for alert: ${alert.destination}`);

    // Get destination IDs
    const [fromId, toId] = await Promise.all([
      getFlightDestinationId(alert.origin),
      getFlightDestinationId(alert.destination),
    ]);

    if (!fromId || !toId) {
      console.warn(`⚠️ Could not resolve destination IDs for alert ${alert.id}`);
      return null;
    }

    // Format dates
    const departDate = new Date(alert.departureDate).toISOString().split('T')[0];
    const returnDate = new Date(alert.returnDate).toISOString().split('T')[0];

    // Search for current price
    const flights = await searchFlights({
      fromId,
      toId,
      departDate,
      returnDate,
      adults: 1,
    });

    if (!flights?.flights?.length) {
      console.warn(`⚠️ No flights found for alert ${alert.id}`);
      return null;
    }

    // Get cheapest price
    const currentPrice = flights.flights[0].totalPrice;
    const priceHistory = JSON.parse(alert.priceHistory || '[]');

    // Add to price history (keep last 30 entries)
    priceHistory.push({ date: new Date().toISOString(), price: currentPrice });
    if (priceHistory.length > 30) {
      priceHistory.shift();
    }

    // Calculate new lowest price
    const newLowestPrice = Math.min(alert.lowestPrice || currentPrice, currentPrice);

    // Check if price dropped below target
    const priceDropped = currentPrice <= alert.targetPrice;
    const priceDrop = alert.currentPrice ? alert.currentPrice - currentPrice : 0;
    const percentDrop = alert.currentPrice ? Math.round((priceDrop / alert.currentPrice) * 100) : 0;

    // Update alert in database
    await prisma.priceAlert.update({
      where: { id: alert.id },
      data: {
        currentPrice,
        lowestPrice: newLowestPrice,
        priceHistory: JSON.stringify(priceHistory),
        lastCheckedAt: new Date(),
        status: priceDropped ? 'triggered' : 'active',
      },
    });

    console.log(`✅ Price check: ${alert.destination} = €${currentPrice} (was €${alert.currentPrice || alert.initialPrice})`);

    return {
      alertId: alert.id,
      currentPrice,
      previousPrice: alert.currentPrice || alert.initialPrice,
      targetPrice: alert.targetPrice,
      lowestPrice: newLowestPrice,
      priceDropped,
      priceDrop,
      percentDrop,
    };
  } catch (error) {
    console.error(`❌ Error checking price for alert ${alert.id}:`, error.message);
    return null;
  }
}

/**
 * Check all active alerts and send notifications
 * Called by cron job
 */
export async function checkAllAlerts() {
  console.log('🔔 Starting price alert check...');

  // Get all active alerts that need checking
  const alerts = await prisma.priceAlert.findMany({
    where: {
      isActive: true,
      status: 'active',
      // Don't check alerts for past dates
      departureDate: {
        gte: new Date(),
      },
    },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
        },
      },
    },
  });

  console.log(`📊 Found ${alerts.length} active alerts to check`);

  const results = {
    checked: 0,
    priceDrops: 0,
    notifications: 0,
    errors: 0,
  };

  // Process alerts in batches to avoid rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < alerts.length; i += BATCH_SIZE) {
    const batch = alerts.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (alert) => {
        try {
          const result = await checkAlertPrice(alert);
          results.checked++;

          if (result?.priceDropped) {
            results.priceDrops++;

            // Send email notification
            const shouldNotify = shouldSendNotification(alert);
            if (shouldNotify) {
              await sendPriceDropNotification(alert, result);
              results.notifications++;
            }
          }
        } catch (error) {
          console.error(`Error processing alert ${alert.id}:`, error.message);
          results.errors++;
        }
      })
    );

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < alerts.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`✅ Price check complete: ${results.checked} checked, ${results.priceDrops} drops, ${results.notifications} notifications`);

  return results;
}

/**
 * Check if we should send a notification
 * Avoids spamming users
 */
function shouldSendNotification(alert) {
  if (!alert.lastNotifiedAt) return true;

  const lastNotified = new Date(alert.lastNotifiedAt);
  const now = new Date();
  const hoursSinceLastNotification = (now - lastNotified) / (1000 * 60 * 60);

  // Daily frequency: notify max once per 24 hours
  if (alert.frequency === 'daily') {
    return hoursSinceLastNotification >= 24;
  }

  // Weekly frequency: notify max once per 7 days
  if (alert.frequency === 'weekly') {
    return hoursSinceLastNotification >= 168; // 7 * 24
  }

  return hoursSinceLastNotification >= 24; // Default to daily
}

/**
 * Send price drop notification email
 */
async function sendPriceDropNotification(alert, priceResult) {
  try {
    await sendPriceDropEmail({
      to: alert.user.email,
      userName: alert.user.firstName || 'Traveler',
      destination: alert.destination,
      country: alert.country,
      origin: alert.origin,
      departureDate: alert.departureDate,
      returnDate: alert.returnDate,
      originalPrice: alert.initialPrice,
      currentPrice: priceResult.currentPrice,
      targetPrice: alert.targetPrice,
      priceDrop: priceResult.priceDrop,
      percentDrop: priceResult.percentDrop,
      alertId: alert.id,
    });

    // Update notification tracking
    await prisma.priceAlert.update({
      where: { id: alert.id },
      data: {
        lastNotifiedAt: new Date(),
        notificationsSent: {
          increment: 1,
        },
      },
    });

    console.log(`📧 Sent price drop notification for ${alert.destination} to ${alert.user.email}`);

    // Also send push notification
    await sendPriceDropPush(alert.userId, {
      destination: alert.destination,
      currentPrice: priceResult.currentPrice,
      previousPrice: priceResult.previousPrice,
      targetPrice: alert.targetPrice,
    });
  } catch (error) {
    console.error(`❌ Failed to send notification for alert ${alert.id}:`, error.message);
  }
}

/**
 * Get alert statistics for a user
 */
export async function getAlertStats(userId) {
  const [totalAlerts, activeAlerts, triggeredAlerts] = await Promise.all([
    prisma.priceAlert.count({ where: { userId } }),
    prisma.priceAlert.count({ where: { userId, status: 'active' } }),
    prisma.priceAlert.count({ where: { userId, status: 'triggered' } }),
  ]);

  // Calculate total savings from triggered alerts
  const triggeredDetails = await prisma.priceAlert.findMany({
    where: { userId, status: 'triggered' },
    select: { initialPrice: true, currentPrice: true },
  });

  const totalSavings = triggeredDetails.reduce((sum, alert) => {
    const savings = (alert.initialPrice || 0) - (alert.currentPrice || 0);
    return sum + Math.max(0, savings);
  }, 0);

  return {
    totalAlerts,
    activeAlerts,
    triggeredAlerts,
    totalSavings: Math.round(totalSavings),
  };
}

export default {
  createPriceAlert,
  getUserAlerts,
  getAlertById,
  updateAlert,
  deleteAlert,
  checkAlertPrice,
  checkAllAlerts,
  getAlertStats,
};
