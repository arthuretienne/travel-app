// backend/src/routes/priceAlerts.js
import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { checkSubscription, requireFeature } from '../middleware/checkSubscription.js';
import { getPlanDetails, getEffectivePlan } from '../services/stripeService.js';
import {
  createPriceAlert,
  getUserAlerts,
  getAlertById,
  updateAlert,
  deleteAlert,
  checkAlertPrice,
  getAlertStats,
} from '../services/priceAlertService.js';

const router = express.Router();

/**
 * GET /api/price-alerts
 * Get all price alerts for the current user
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const alerts = await getUserAlerts(req.user.id);

    res.json({
      success: true,
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error('❌ Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price alerts',
    });
  }
});

/**
 * GET /api/price-alerts/stats
 * Get alert statistics for the current user
 */
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    const stats = await getAlertStats(req.user.id);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert statistics',
    });
  }
});

/**
 * GET /api/price-alerts/:id
 * Get a specific price alert
 */
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const alert = await getAlertById(req.params.id, req.user.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.json({
      success: true,
      alert,
    });
  } catch (error) {
    console.error('❌ Error fetching alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price alert',
    });
  }
});

/**
 * POST /api/price-alerts
 * Create a new price alert
 */
router.post('/', authenticateUser, checkSubscription, async (req, res) => {
  try {
    const {
      savedTripId,
      destination,
      country,
      origin,
      departureDate,
      returnDate,
      initialPrice,
      targetPrice,
      alertType,
      frequency,
    } = req.body;

    // Validate required fields
    if (!destination || !origin || !departureDate || !returnDate || !initialPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['destination', 'origin', 'departureDate', 'returnDate', 'initialPrice'],
      });
    }

    // Validate dates
    const departure = new Date(departureDate);
    const returnD = new Date(returnDate);
    const now = new Date();

    if (departure < now) {
      return res.status(400).json({
        success: false,
        error: 'Departure date must be in the future',
      });
    }

    if (returnD <= departure) {
      return res.status(400).json({
        success: false,
        error: 'Return date must be after departure date',
      });
    }

    // Alert limits per plan — source of truth: PLANS in stripeService.js,
    // aligned on the public pricing page (Free: 0, Starter: 3, Wanderer: unlimited)
    const existingAlerts = await getUserAlerts(req.user.id);
    const planDetails = getPlanDetails(getEffectivePlan(req.subscription));
    const limit = planDetails.features.maxPriceAlerts ?? 0;

    if (limit !== -1 && existingAlerts.length >= limit) {
      return res.status(403).json({
        success: false,
        error: 'Alert limit reached',
        message: limit === 0
          ? 'Les alertes de prix sont incluses à partir de l’offre Starter.'
          : `Votre offre ${planDetails.name} permet ${limit} alertes de prix. Passez à Wanderer pour des alertes illimitées.`,
        currentCount: existingAlerts.length,
        limit,
        upgradeUrl: '/pricing',
      });
    }

    const alert = await createPriceAlert({
      userId: req.user.id,
      savedTripId,
      destination,
      country,
      origin,
      departureDate,
      returnDate,
      initialPrice,
      targetPrice,
      alertType: alertType || 'flight',
      frequency: frequency || 'daily',
    });

    res.status(201).json({
      success: true,
      alert,
      message: `Price alert created for ${destination}. We'll notify you when the price drops below €${alert.targetPrice}.`,
    });
  } catch (error) {
    console.error('❌ Error creating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create price alert',
    });
  }
});

/**
 * PATCH /api/price-alerts/:id
 * Update a price alert
 */
router.patch('/:id', authenticateUser, async (req, res) => {
  try {
    const { targetPrice, isActive, frequency, status } = req.body;

    const alert = await updateAlert(req.params.id, req.user.id, {
      targetPrice,
      isActive,
      frequency,
      status,
    });

    res.json({
      success: true,
      alert,
      message: 'Price alert updated',
    });
  } catch (error) {
    console.error('❌ Error updating alert:', error);

    if (error.message === 'Alert not found') {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update price alert',
    });
  }
});

/**
 * DELETE /api/price-alerts/:id
 * Delete a price alert
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    await deleteAlert(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Price alert deleted',
    });
  } catch (error) {
    console.error('❌ Error deleting alert:', error);

    if (error.message === 'Alert not found') {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete price alert',
    });
  }
});

/**
 * POST /api/price-alerts/:id/check
 * Manually trigger a price check for a specific alert
 */
router.post('/:id/check', authenticateUser, async (req, res) => {
  try {
    const alert = await getAlertById(req.params.id, req.user.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    const result = await checkAlertPrice(alert);

    if (!result) {
      // Not a server error: the upstream flight search returned nothing for
      // now. Report it as a soft, retryable outcome so the UI can surface a
      // helpful message instead of swallowing an HTTP 500.
      return res.json({
        success: false,
        checked: false,
        message: 'Prix indisponible pour le moment (aucun vol trouvé pour cette recherche). Réessayez plus tard.',
      });
    }

    res.json({
      success: true,
      result: {
        currentPrice: result.currentPrice,
        previousPrice: result.previousPrice,
        priceDrop: result.priceDrop,
        percentDrop: result.percentDrop,
        priceDropped: result.priceDropped,
        targetReached: result.priceDropped,
      },
      message: result.priceDropped
        ? `Price dropped to €${result.currentPrice}! Your target was €${alert.targetPrice}.`
        : `Current price: €${result.currentPrice}. Target: €${alert.targetPrice}.`,
    });
  } catch (error) {
    console.error('❌ Error checking price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check price',
    });
  }
});

export default router;
