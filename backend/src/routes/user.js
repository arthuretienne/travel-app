// backend/src/routes/user.js
import express from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../db/prisma.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/users/sync
 * Synchronise un utilisateur depuis Clerk webhook
 * Public endpoint (appelé par Clerk webhooks)
 */
router.post('/sync', async (req, res) => {
  try {
    const { type, data } = req.body;

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

      console.log('✅ User synced from webhook:', user.email);
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

      console.log('✅ User updated from webhook:', user.email);
      return res.json({ message: 'User updated', user });
    }

    // Handle user.deleted event
    if (type === 'user.deleted') {
      const { id: clerkId } = data;

      await prisma.user.delete({
        where: { clerkId },
      });

      console.log('✅ User deleted from webhook:', clerkId);
      return res.json({ message: 'User deleted' });
    }

    res.json({ message: 'Event not handled', type });
  } catch (error) {
    console.error('User sync error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
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

    console.log('✅ User fetched:', user.email);
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
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

    console.log('✅ User preferences fetched:', req.user.email);
    res.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
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

    console.log('✅ User preferences updated:', req.user.email);
    res.json({ preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
