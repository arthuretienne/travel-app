// backend/src/routes/opportunities.js
import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { getUserOpportunities, updateOpportunityStatus } from '../services/opportunityService.js';

const router = express.Router();

/**
 * GET /api/opportunities
 * Returns active deal opportunities for the current user
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const opportunities = await getUserOpportunities(req.user.clerkId);
    res.json({ success: true, data: opportunities });
  } catch (error) {
    console.error('[Opportunities] GET error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch opportunities' });
  }
});

/**
 * PATCH /api/opportunities/:id
 * Update status: 'clicked' | 'dismissed'
 */
router.patch('/:id', authenticateUser, async (req, res) => {
  const { status } = req.body;
  if (!['clicked', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    await updateOpportunityStatus(req.user.clerkId, req.params.id, status);
    res.json({ success: true });
  } catch (error) {
    console.error('[Opportunities] PATCH error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update opportunity' });
  }
});

export default router;
