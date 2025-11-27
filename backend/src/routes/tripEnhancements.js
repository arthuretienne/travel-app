// backend/src/routes/tripEnhancements.js
import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { getWeatherForecast, getPackingRecommendations } from '../services/weatherService.js';
import { generatePersonalizedItinerary } from '../services/itineraryService.js';
import { getLocalEvents, getAllCityEvents } from '../data/localEvents.js';
import prisma from '../db/prisma.js';

const router = express.Router();

// Helper function to get trip data (used by all routes)
async function getTripData(id, userId) {
  // Try collaborative trip first
  let trip = await prisma.collaborativeTrip.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

  let isSavedTrip = false;
  let members = [];

  // Try saved trip if not found
  if (!trip) {
    trip = await prisma.savedTrip.findUnique({ where: { id } });
    isSavedTrip = true;
  }

  if (!trip) return null;

  // Check access
  if (!isSavedTrip) {
    const userMember = trip.members.find(m => m.userId === userId);
    const isCreator = trip.creatorId === userId;
    members = trip.members;
    if (!isCreator && !userMember) return null;
  } else {
    if (trip.userId !== userId) return null;
  }

  // Extract destination
  let city, country, startDate, endDate;
  if (isSavedTrip) {
    city = trip.city;
    country = trip.country;
    startDate = trip.startDate;
    endDate = trip.endDate;
  } else if (trip.finalDestination) {
    city = trip.finalDestination.city;
    country = trip.finalDestination.country;
    startDate = trip.finalDestination.startDate || trip.finalStartDate;
    endDate = trip.finalDestination.endDate || trip.finalEndDate;
  } else {
    // Fallback
    city = 'Paris';
    country = 'France';
    startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    endDate = new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  return { trip, isSavedTrip, members, city, country, startDate, endDate };
}

/**
 * GET /api/trips/:id/weather
 * FAST: Get weather forecast only (2-3 seconds)
 */
router.get('/:id/weather', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const tripData = await getTripData(id, req.user.id);

    if (!tripData) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    const { city, country } = tripData;

    // Get weather forecast
    const weather = await getWeatherForecast(city, country);

    if (!weather) {
      return res.status(500).json({ error: 'Failed to fetch weather' });
    }

    res.json({ success: true, data: { weather } });
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather', message: error.message });
  }
});

/**
 * GET /api/trips/:id/packing
 * FAST: Get packing recommendations (depends on weather, 3-5 seconds)
 */
router.get('/:id/packing', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const tripData = await getTripData(id, req.user.id);

    if (!tripData) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    const { city, country, startDate, endDate } = tripData;

    // Get weather forecast for packing
    const weather = await getWeatherForecast(city, country);
    const packing = weather
      ? getPackingRecommendations(weather.forecast, { startDate, endDate })
      : {
          clothing: ['Versatile layers', 'Comfortable walking shoes'],
          essentials: ['Sunscreen', 'Water bottle'],
          optional: ['Umbrella'],
        };

    res.json({ success: true, data: { packing, city, country } });
  } catch (error) {
    console.error('Error fetching packing tips:', error);
    res.status(500).json({ error: 'Failed to fetch packing tips', message: error.message });
  }
});

/**
 * GET /api/trips/:id/itinerary
 * SLOW: Generate personalized itinerary with Claude AI (10-15 seconds)
 */
router.get('/:id/itinerary', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const tripData = await getTripData(id, req.user.id);

    if (!tripData) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    const { trip, isSavedTrip, members, city, country, startDate, endDate } = tripData;
    const destination = { city, country, startDate, endDate };

    // Get user preferences
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.id },
    });

    const userProfile = {
      personality: userPreferences?.personality,
      topActivities: userPreferences?.topActivities || [],
      budget: userPreferences?.budget || 1500,
      idealRhythm: userPreferences?.idealRhythm,
    };

    const userName = req.user.firstName || 'there';

    // Generate itinerary
    const itinerary = await generatePersonalizedItinerary(
      destination,
      userProfile,
      userName,
      isSavedTrip ? [] : members
    );

    res.json({ success: true, data: { itinerary, city, country } });
  } catch (error) {
    console.error('Error generating itinerary:', error);
    res.status(500).json({ error: 'Failed to generate itinerary', message: error.message });
  }
});

/**
 * GET /api/trips/:id/events
 * FAST: Get local events (instant, from static data)
 */
router.get('/:id/events', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const tripData = await getTripData(id, req.user.id);

    if (!tripData) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    const { city, startDate, endDate } = tripData;

    // Get events
    const upcomingEvents = getLocalEvents(city, startDate, endDate);
    const allCityEvents = getAllCityEvents(city);

    res.json({
      success: true,
      data: {
        events: {
          upcoming: upcomingEvents,
          regular: allCityEvents,
        },
        city,
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events', message: error.message });
  }
});

/**
 * GET /api/trips/:id/enhancements
 * DEPRECATED: Use separate routes above for better performance
 * Keep for backward compatibility
 */
router.get('/:id/enhancements', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find as collaborative trip first
    let trip = await prisma.collaborativeTrip.findUnique({
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

    let isSavedTrip = false;
    let members = [];

    // If not found, try as saved trip
    if (!trip) {
      trip = await prisma.savedTrip.findUnique({
        where: { id },
      });
      isSavedTrip = true;
      console.log('📌 Found saved trip:', trip ? trip.city : 'not found');
    }

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if user has access
    if (!isSavedTrip) {
      const userMember = trip.members.find(m => m.userId === req.user.id);
      const isCreator = trip.creatorId === req.user.id;
      members = trip.members;

      if (!isCreator && !userMember) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else {
      // For saved trips, check if user owns it
      if (trip.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Debug: Log trip data
    console.log('🔍 Trip data:', {
      id: trip.id,
      name: trip.name,
      status: trip.status,
      hasFinalDestination: !!trip.finalDestination,
      finalStartDate: trip.finalStartDate,
      finalEndDate: trip.finalEndDate,
    });

    // Get destination data - handle both collaborative trips and saved trips
    let destination, city, country, startDate, endDate;

    if (isSavedTrip) {
      // Saved trip - data is directly on trip object
      city = trip.city;
      country = trip.country;
      startDate = trip.startDate;
      endDate = trip.endDate;
      destination = { city, country, startDate, endDate };
      console.log('✅ Using saved trip data:', { city, country, startDate, endDate });
    } else if (trip.finalDestination) {
      // Collaborative trip - confirmed destination
      destination = trip.finalDestination;
      city = destination.city;
      country = destination.country;
      startDate = destination.startDate || trip.finalStartDate;
      endDate = destination.endDate || trip.finalEndDate;
      console.log('✅ Using finalDestination (collaborative trip):', { city, country });
    } else {
      // Fallback: create mock data for testing
      console.log('⚠️  No destination found - using fallback for testing');
      city = 'Paris';
      country = 'France';
      startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      endDate = new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      destination = { city, country, startDate, endDate };
    }

    console.log('📅 Trip dates:', { startDate, endDate });

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
      isSavedTrip ? [] : members  // Saved trips have no members array
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
