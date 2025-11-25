// backend/src/routes/tripEnhancements.js
import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { getWeatherForecast, getPackingRecommendations } from '../services/weatherService.js';
import { generatePersonalizedItinerary } from '../services/itineraryService.js';
import { getLocalEvents, getAllCityEvents } from '../data/localEvents.js';
import prisma from '../db/prisma.js';

const router = express.Router();

/**
 * GET /api/trips/:id/enhancements
 * Get weather, itinerary, packing tips, and local events for a trip
 */
router.get('/:id/enhancements', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch trip details
    const trip = await prisma.collaborativeTrip.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if user has access
    const userMember = trip.members.find(m => m.userId === req.user.id);
    const isCreator = trip.creatorId === req.user.id;

    if (!isCreator && !userMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only provide enhancements if trip is confirmed
    if (!trip.finalDestination) {
      return res.status(400).json({ error: 'Trip destination not yet confirmed' });
    }

    const destination = trip.finalDestination;
    const { city, country, startDate, endDate } = destination;

    // Fetch user preferences for personalization
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.id },
    });

    const userName = req.user.firstName || 'there';

    console.log(`📊 Generating enhancements for ${city}, ${country}...`);

    // 1. Weather Forecast
    console.log('☀️  Fetching weather...');
    const weather = await getWeatherForecast(city, country);

    // 2. Packing Recommendations
    console.log('🎒 Generating packing tips...');
    const packing = weather
      ? getPackingRecommendations(weather.forecast, { startDate, endDate })
      : null;

    // 3. Personalized Itinerary
    console.log('🗺️  Generating personalized itinerary...');
    const userProfile = {
      personality: userPreferences?.personality,
      topActivities: userPreferences?.topActivities || [],
      budget: userPreferences?.budget || 1500,
      idealRhythm: userPreferences?.idealRhythm,
    };

    const itinerary = await generatePersonalizedItinerary(
      destination,
      userProfile,
      userName,
      trip.members
    );

    // 4. Local Events
    console.log('🎉 Finding local events...');
    const upcomingEvents = getLocalEvents(city, startDate, endDate);
    const allCityEvents = upcomingEvents.length === 0 ? getAllCityEvents(city).slice(0, 5) : [];

    console.log(`✅ Enhancements generated for ${city}`);

    res.json({
      success: true,
      data: {
        weather,
        packing,
        itinerary,
        events: {
          upcoming: upcomingEvents,
          regular: allCityEvents,
        },
      },
    });
  } catch (error) {
    console.error('Error generating trip enhancements:', error);
    res.status(500).json({
      error: 'Failed to generate trip enhancements',
      message: error.message,
    });
  }
});

export default router;
