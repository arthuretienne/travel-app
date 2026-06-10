// backend/src/routes/user.js
import express from 'express';
import crypto from 'crypto';
import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../db/prisma.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

/**
 * Verify a Clerk (Svix) webhook signature against the raw request body.
 * Clerk signs webhooks with the Svix scheme:
 *   signedContent = `${svix-id}.${svix-timestamp}.${rawBody}`
 *   expected      = base64( HMAC-SHA256(signedContent, base64decode(secret)) )
 * The `svix-signature` header is a space-separated list of `v1,<sig>` pairs;
 * the request is authentic if ANY of them matches (constant-time compare).
 * Returns the parsed JSON payload on success, or null on any failure.
 */
function verifyClerkWebhook(req) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[user/sync] CLERK_WEBHOOK_SECRET not set — rejecting webhook');
    return null;
  }

  const svixId = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];
  if (!svixId || !svixTimestamp || !svixSignature) return null;

  // Reject stale timestamps (>5 min skew) to blunt replay attacks.
  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return null;

  // req.body is a Buffer here (express.raw); keep it raw for the HMAC.
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;

  // Secret format: "whsec_<base64>". Strip the prefix, decode the key.
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64');

  const provided = String(svixSignature)
    .split(' ')
    .map((part) => part.split(',')[1])
    .filter(Boolean);

  const expectedBuf = Buffer.from(expected);
  const ok = provided.some((sig) => {
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });

  if (!ok) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

/**
 * POST /api/users/sync
 * Synchronise un utilisateur depuis Clerk webhook.
 * Public endpoint appelé par Clerk — protégé par signature Svix (HMAC).
 * Reçoit le body brut (express.raw) car la signature couvre les octets exacts.
 * NB : la création d'utilisateur se fait aussi paresseusement au premier appel
 * authentifié (auth.js) ; ce webhook gère surtout update/delete.
 */
router.post('/sync', express.raw({ type: 'application/json' }), async (req, res) => {
  const payload = verifyClerkWebhook(req);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  try {
    const { type, data } = payload;

    // Handle user.created event
    if (type === 'user.created') {
      const { id: clerkId, email_addresses, first_name, last_name, image_url } = data;

      const existingUser = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (existingUser) {
        return res.json({ message: 'User already exists', user: existingUser });
      }

      const user = await prisma.user.create({
        data: {
          clerkId,
          email: email_addresses[0]?.email_address || '',
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
        },
      });

      console.log('✅ User synced from webhook:', user.id);
      return res.json({ message: 'User created', user });
    }

    // Handle user.updated event
    if (type === 'user.updated') {
      const { id: clerkId, email_addresses, first_name, last_name, image_url } = data;

      const user = await prisma.user.update({
        where: { clerkId },
        data: {
          email: email_addresses[0]?.email_address || '',
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
        },
      });

      console.log('✅ User updated from webhook:', user.id);
      return res.json({ message: 'User updated', user });
    }

    // Handle user.deleted event. Use deleteMany so it is idempotent — the
    // account may already be gone (e.g. deleted via DELETE /api/users/me),
    // and a hard delete() would throw P2025 on a missing record.
    if (type === 'user.deleted') {
      const { id: clerkId } = data;

      const result = await prisma.user.deleteMany({
        where: { clerkId },
      });

      console.log(`✅ User deleted from webhook: ${clerkId} (${result.count} row(s))`);
      return res.json({ message: 'User deleted', count: result.count });
    }

    res.json({ message: 'Event not handled', type });
  } catch (error) {
    console.error('User sync error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/users/me
 * Récupère l'utilisateur actuel avec ses préférences
 * Protected route
 */
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        preferences: true,
        savedTrips: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    console.log('✅ User fetched:', user.id);
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/users/preferences
 * Récupère les préférences utilisateur
 * Protected route
 */
router.get('/preferences', authenticateUser, async (req, res) => {
  try {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.id },
    });

    console.log('✅ User preferences fetched:', req.user.id);
    res.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/users/preferences
 * Met à jour les préférences utilisateur
 * Protected route
 */
router.put('/preferences', authenticateUser, async (req, res) => {
  try {
    const preferencesData = {
      // Metadata
      onboardingCompleted: req.body.onboardingCompleted !== undefined ? req.body.onboardingCompleted : true,
      onboardingType: req.body.onboardingType,

      // Part 1: Style & Objectif
      whyTravel: req.body.whyTravel,
      mainGoal: req.body.mainGoal,
      globalStyle: req.body.globalStyle,
      riskTolerance: req.body.riskTolerance,
      originalityAppetite: req.body.originalityAppetite,
      introvertExtrovert: req.body.introvertExtrovert,
      plannerImprovisator: req.body.plannerImprovisator,
      modernComfortAuth: req.body.modernComfortAuth,

      // Part 2: Activities
      topActivities: req.body.topActivities || [],

      // Part 3: Rhythm & Comfort
      idealRhythm: req.body.idealRhythm,
      accommodationPref: req.body.accommodationPref,
      comfortAuthSlider: req.body.comfortAuthSlider,
      stayOrMove: req.body.stayOrMove,
      transportModes: req.body.transportModes || [],
      transportComfort: req.body.transportComfort,
      maxTransportHours: req.body.maxTransportHours,
      materialComfort: req.body.materialComfort,

      // Part 4: Constraints
      visaPreference: req.body.visaPreference,
      avoidCountries: req.body.avoidCountries || [],
      mobilityNeeds: req.body.mobilityNeeds,
      mobilityDetails: req.body.mobilityDetails,
      securityImportance: req.body.securityImportance,
      crowdTolerance: req.body.crowdTolerance,
      ecoSensitivity: req.body.ecoSensitivity,
      culturalAdaptability: req.body.culturalAdaptability,
      climateSensitivity: req.body.climateSensitivity,

      // Part 5: Availability & Patterns
      tripsPerYear: req.body.tripsPerYear,
      departureFlexibility: req.body.departureFlexibility,
      calendarConnected: req.body.calendarConnected || false,
      calendarType: req.body.calendarType,
      annualLeaveDays: req.body.annualLeaveDays,
      takenLeaveDays: req.body.takenLeaveDays,
      avgTripDuration: req.body.avgTripDuration,
      preferredAirports: req.body.preferredAirports || [],

      // Legacy fields (for backward compatibility)
      budget: req.body.budget,
      style: req.body.style,
      preferredMonths: req.body.preferredMonths || [],
      activities: req.body.activities || [],
      maxFlightHours: req.body.maxFlightHours,
      destinationPref: req.body.destinationPref,

      // New onboarding fields (OnboardingNew component)
      personality: req.body.personality,
      refusedTransports: req.body.refusedTransports || [],
      professionalStatus: req.body.professionalStatus,
      idealDuration: req.body.idealDuration,
    };

    // Remove undefined values
    Object.keys(preferencesData).forEach(key =>
      preferencesData[key] === undefined && delete preferencesData[key]
    );

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: req.user.id },
      update: preferencesData,
      create: {
        userId: req.user.id,
        ...preferencesData,
      },
    });

    console.log('✅ User preferences updated:', req.user.id);
    res.json({ preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/users/digest-optout
 * Opt-out from weekly digest emails (authenticated)
 */
router.post('/digest-optout', authenticateUser, async (req, res) => {
  try {
    // req.user.id is the Prisma user id (cuid), NOT the Clerk id — match on userId.
    // upsert so the flag sticks even for users who never saved onboarding prefs.
    await prisma.userPreferences.upsert({
      where: { userId: req.user.id },
      update: { digestOptOut: true },
      create: { userId: req.user.id, digestOptOut: true },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[User] digest-optout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users/digest-optin
 * Re-subscribe to weekly digest emails
 */
router.post('/digest-optin', authenticateUser, async (req, res) => {
  try {
    await prisma.userPreferences.upsert({
      where: { userId: req.user.id },
      update: { digestOptOut: false },
      create: { userId: req.user.id, digestOptOut: false },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[User] digest-optin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/me
 * Right-to-erasure (RGPD art. 17). Deletes the Clerk user and the local row
 * (Prisma cascade wipes searches, saved trips, alerts, votes, etc.).
 *
 * Group-trip safety: a CollaborativeTrip cascades on its creator, so naively
 * deleting an organiser would also destroy their co-travellers' trips. Before
 * deleting, we hand off every trip the user created (that still has another
 * member) to the longest-standing other member, promoting them to organizer.
 */
router.delete('/me', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  try {
    const ownedTrips = await prisma.collaborativeTrip.findMany({
      where: { creatorId: userId },
      include: {
        // `not: userId` also excludes guest rows (userId NULL) at the SQL level,
        // so the heir is always a real, non-creator member.
        members: {
          where: { userId: { not: userId } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    for (const trip of ownedTrips) {
      const heir = trip.members[0];
      if (heir?.userId) {
        await prisma.$transaction([
          prisma.collaborativeTrip.update({
            where: { id: trip.id },
            data: { creatorId: heir.userId },
          }),
          prisma.tripMember.update({
            where: { id: heir.id },
            data: { role: 'organizer' },
          }),
        ]);
        console.log(`🔁 Reassigned trip ${trip.id} to ${heir.userId} before deleting ${userId}`);
      }
      // Trips with no other member fall through and are cascade-deleted.
    }

    // Best-effort Clerk deletion (may already be gone, or Clerk unreachable).
    if (req.user.clerkId) {
      try {
        await clerkClient.users.deleteUser(req.user.clerkId);
      } catch (e) {
        console.warn('[User] Clerk deleteUser failed (continuing):', e.message);
      }
    }

    await prisma.user.deleteMany({ where: { id: userId } });

    console.log(`🗑️ Account deleted: ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[User] account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;

