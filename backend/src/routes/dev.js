// backend/src/routes/dev.js
// DEV-ONLY routes for local testing (persona impersonation switcher).
// This router is only mounted when NODE_ENV=development or DEV_MODE=true.
// It must NEVER be reachable in production.

import express from 'express';
import prisma from '../db/prisma.js';

const router = express.Router();

const TEST_DOMAIN = '@skusku-test.dev';

// Hard guard: refuse to serve if dev mode is somehow off.
router.use((req, res, next) => {
  const enabled =
    process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
  if (!enabled) return res.status(404).json({ error: 'Not found' });
  next();
});

/**
 * GET /api/dev/personas
 * List seeded test users + the collaborative trips they belong to,
 * so the frontend dev bar can offer one-click impersonation.
 */
router.get('/personas', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { email: { endsWith: TEST_DOMAIN } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        imageUrl: true,
        tripMemberships: {
          select: {
            role: true,
            trip: { select: { id: true, name: true, status: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const personas = users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      imageUrl: u.imageUrl,
      memberships: u.tripMemberships.map((m) => ({
        role: m.role,
        tripId: m.trip.id,
        tripName: m.trip.name,
        tripStatus: m.trip.status,
      })),
    }));

    // Distinct list of seeded trips for convenience
    const tripMap = {};
    personas.forEach((p) =>
      p.memberships.forEach((m) => {
        tripMap[m.tripId] = { id: m.tripId, name: m.tripName, status: m.tripStatus };
      })
    );

    res.json({ success: true, personas, trips: Object.values(tripMap) });
  } catch (error) {
    console.error('[Dev] personas error:', error.message);
    res.status(500).json({ error: 'Failed to list personas' });
  }
});

export default router;
