// backend/src/routes/tripEnhancements.js
import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { getWeatherForecast, getPackingRecommendations } from '../services/weatherService.js';
import { generatePersonalizedItinerary, generatePackingFromItinerary } from '../services/itineraryService.js';
import { getLocalEvents, getAllCityEvents } from '../data/localEvents.js';
import { broadcastTripUpdate } from '../services/socketService.js';
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
  let city, country, startDate, endDate, suggestedActivities, flightDetails, hotelDetails;
  if (isSavedTrip) {
    city = trip.city;
    country = trip.country;
    startDate = trip.startDate;
    endDate = trip.endDate;
    // Parse trip data JSON for activities, flights, hotel
    if (trip.tripData) {
      const tripData = typeof trip.tripData === 'string' ? JSON.parse(trip.tripData) : trip.tripData;
      suggestedActivities = tripData.suggestedActivities || [];
      flightDetails = tripData.flight;
      hotelDetails = tripData.hotel;
    }
  } else if (trip.finalDestination) {
    city = trip.finalDestination.city;
    country = trip.finalDestination.country;
    startDate = trip.finalDestination.startDate || trip.finalStartDate;
    endDate = trip.finalDestination.endDate || trip.finalEndDate;
    // For collaborative trips, activities might be in finalDestination
    if (trip.finalDestination.suggestedActivities) {
      suggestedActivities = trip.finalDestination.suggestedActivities;
    }
  } else {
    // Fallback
    city = 'Paris';
    country = 'France';
    startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    endDate = new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  return {
    trip,
    isSavedTrip,
    members,
    city,
    country,
    startDate,
    endDate,
    suggestedActivities: suggestedActivities || [],
    flightDetails,
    hotelDetails
  };
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
      // Return mock weather data if API fails or key not configured
      const mockWeather = {
        location: { name: city, country: country },
        current: {
          temp_c: 20,
          condition: 'Partly cloudy',
          icon: 'https://cdn.weatherapi.com/weather/64x64/day/116.png',
          humidity: 50,
        },
        forecast: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          day: {
            maxtemp_c: 22 + Math.floor(Math.random() * 5),
            mintemp_c: 14 + Math.floor(Math.random() * 3),
            condition: 'Partly cloudy',
            icon: 'https://cdn.weatherapi.com/weather/64x64/day/116.png',
            daily_chance_of_rain: Math.floor(Math.random() * 30),
          },
        })),
      };
      return res.json({ success: true, data: { weather: mockWeather, isMock: true } });
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
 * CACHING: Saves itinerary to tripData to avoid regeneration on revisit
 */
router.get('/:id/itinerary', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const tripData = await getTripData(id, req.user.id);

    if (!tripData) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    const { trip, isSavedTrip, members, city, country, startDate, endDate, suggestedActivities, flightDetails, hotelDetails } = tripData;

    // Check if itinerary already exists in tripData
    const existingTripData = typeof trip.tripData === 'string' ? JSON.parse(trip.tripData) : (trip.tripData || {});

    if (existingTripData.cachedItinerary) {
      console.log(`✅ Using cached itinerary for trip ${id}`);
      return res.json({
        success: true,
        data: {
          itinerary: existingTripData.cachedItinerary,
          packing: existingTripData.cachedPacking,
          city,
          country,
          cached: true
        }
      });
    }

    console.log(`🔄 Generating new itinerary for trip ${id}...`);

    const destination = {
      city,
      country,
      startDate,
      endDate,
      suggestedActivities,
      flightDetails,
      hotelDetails
    };

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

    // Get weather and generate packing list based on itinerary activities
    let packing = null;
    try {
      const weather = await getWeatherForecast(city, country);
      packing = generatePackingFromItinerary(itinerary, weather, { city, country });
      console.log(`📦 Generated packing list with ${packing.activityItems?.length || 0} activity-specific items`);
    } catch (packingError) {
      console.warn('⚠️ Failed to generate packing:', packingError.message);
    }

    // Save itinerary and packing to tripData for caching
    try {
      const updatedTripData = {
        ...existingTripData,
        cachedItinerary: itinerary,
        cachedPacking: packing,
        itineraryCachedAt: new Date().toISOString()
      };

      if (isSavedTrip) {
        await prisma.savedTrip.update({
          where: { id },
          data: { tripData: updatedTripData }
        });
      } else {
        // For collaborative trips, update the finalDestination or trip data
        if (trip.finalDestination) {
          await prisma.collaborativeTrip.update({
            where: { id },
            data: {
              finalDestination: {
                ...trip.finalDestination,
                cachedItinerary: itinerary,
                cachedPacking: packing,
                itineraryCachedAt: new Date().toISOString()
              }
            }
          });
        }
      }
      console.log(`💾 Itinerary and packing cached for trip ${id}`);
    } catch (cacheError) {
      console.warn('⚠️ Failed to cache itinerary:', cacheError.message);
      // Continue even if caching fails
    }

    res.json({ success: true, data: { itinerary, packing, city, country, cached: false } });
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

/**
 * PATCH /api/trips/:id/itinerary/activities
 * Modify activities in the cached itinerary
 * Only trip creator can execute modifications
 */
router.patch('/:id/itinerary/activities', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, dayNumber, activity, newActivity } = req.body;
    // action: 'add' | 'remove' | 'modify'

    if (!action || !dayNumber || !activity) {
      return res.status(400).json({ error: 'Missing required fields: action, dayNumber, activity' });
    }

    const tripData = await getTripData(id, req.user.id);
    if (!tripData) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    const { trip, isSavedTrip } = tripData;

    // Check if user is creator (for collaborative trips)
    if (!isSavedTrip && trip.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Only trip creator can modify itinerary' });
    }

    // Get existing itinerary
    let existingData;
    if (isSavedTrip) {
      existingData = typeof trip.tripData === 'string' ? JSON.parse(trip.tripData) : (trip.tripData || {});
    } else {
      existingData = trip.finalDestination || {};
    }

    let itinerary = existingData.cachedItinerary || [];

    if (!Array.isArray(itinerary) || dayNumber < 1 || dayNumber > itinerary.length) {
      return res.status(400).json({ error: `Invalid day number. Trip has ${itinerary.length} days.` });
    }

    const dayIndex = dayNumber - 1;

    // Ensure activities array exists for the day
    if (!itinerary[dayIndex].activities) {
      itinerary[dayIndex].activities = [];
    }

    switch (action) {
      case 'add':
        itinerary[dayIndex].activities.push({
          name: activity.name,
          time: activity.time || null,
          price: activity.price || null,
          addedByAI: true,
          addedAt: new Date().toISOString(),
        });
        break;

      case 'remove':
        itinerary[dayIndex].activities = itinerary[dayIndex].activities.filter(
          (a) => a.name.toLowerCase() !== activity.name.toLowerCase()
        );
        break;

      case 'modify':
        if (!newActivity) {
          return res.status(400).json({ error: 'newActivity is required for modify action' });
        }
        const actIndex = itinerary[dayIndex].activities.findIndex(
          (a) => a.name.toLowerCase() === activity.name.toLowerCase()
        );
        if (actIndex !== -1) {
          itinerary[dayIndex].activities[actIndex] = {
            ...itinerary[dayIndex].activities[actIndex],
            ...newActivity,
            modifiedAt: new Date().toISOString(),
          };
        } else {
          return res.status(404).json({ error: `Activity "${activity.name}" not found in day ${dayNumber}` });
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid action. Use: add, remove, or modify' });
    }

    // Save updated itinerary
    const updatedData = { ...existingData, cachedItinerary: itinerary };

    if (isSavedTrip) {
      await prisma.savedTrip.update({
        where: { id },
        data: { tripData: updatedData },
      });
    } else {
      await prisma.collaborativeTrip.update({
        where: { id },
        data: { finalDestination: updatedData },
      });
    }

    // Broadcast update via socket for real-time sync
    broadcastTripUpdate(id, 'itinerary_modified', {
      dayNumber,
      action,
      activity: activity.name,
      modifiedBy: req.user.firstName || req.user.email,
    });

    console.log(`✅ Itinerary modified: ${action} "${activity.name}" on day ${dayNumber}`);

    res.json({
      success: true,
      data: {
        dayNumber,
        action,
        activity: activity.name,
        updatedDay: itinerary[dayIndex],
      },
    });
  } catch (error) {
    console.error('Error modifying itinerary:', error);
    res.status(500).json({ error: 'Failed to modify itinerary', message: error.message });
  }
});

export default router;
