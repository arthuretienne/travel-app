// backend/src/routes/push.js
// Push notification subscription management

import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { saveSubscription, removeSubscription } from '../services/pushService.js';

const router = express.Router();

/**
 * GET /api/push/vapid-key
 * Return the VAPID public key for the frontend
 */
router.get('/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ publicKey: key });
});

/**
 * POST /api/push/subscribe
 * Save a push subscription for the authenticated user
 */
router.post('/subscribe', authenticateUser, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    await saveSubscription(req.user.id, subscription);
    res.json({ success: true, message: 'Push subscription saved' });
  } catch (error) {
    console.error('[Push] Subscribe error:', error.message);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

/**
 * POST /api/push/unsubscribe
 * Remove a push subscription
 */
router.post('/unsubscribe', authenticateUser, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint' });
    }

    await removeSubscription(req.user.id, endpoint);
    res.json({ success: true, message: 'Push subscription removed' });
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error.message);
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

export default router;
