// backend/src/routes/tripEnhancements.js
import express from 'express';
import { authenticateUser, authenticateUserOrGuest } from '../middleware/auth.js';
import { getWeatherForecast, getPackingRecommendations } from '../services/weatherService.js';
import { generatePersonalizedItinerary, generatePackingFromItinerary, generateItineraryStreaming } from '../services/itineraryService.js';
import { getDestinationPhotoGallery } from '../services/pexelsService.js';
import { getLocalEvents, getAllCityEvents } from '../data/localEvents.js';
import { generateSmartPacking, generateSmartEvents } from '../services/claudeService.js';
import { broadcastTripUpdate } from '../services/socketService.js';
import prisma from '../db/prisma.js';

const router = express.Router();

// Helper function to get trip data (used by all routes)
// `user` = req.user : soit un compte (id), soit un invité (isGuest +
// allowedTripId, posé par authenticateUserOrGuest). L'invité n'a accès
// qu'au voyage de son invitation — audit V4 P0 #1 : le stream d'itinéraire
// lui renvoyait 401 et le frontend bouclait dessus.
async function getTripData(id, user) {
  const userId = typeof user === 'string' ? user : user?.id;
  const isGuestWithAccess = typeof user === 'object' && user?.isGuest === true && user?.allowedTripId === id;
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
    if (!isCreator && !userMember && !isGuestWithAccess) return null;
  } else {
    // Les invités n'ont jamais accès aux voyages solo sauvegardés.
    if (trip.userId !== userId) return null;
  }

  // Extract destination
  let city, country, startDate, endDate, suggestedActivities, flightDetails, hotelDetails, recommendedTransport;
  if (isSavedTrip) {
    city = trip.city;
    country = trip.country;
    startDate = trip.startDate;
    endDate = trip.endDate;
    // Parse trip data JSON for activities, flights, hotel
    if (trip.tripData) {
      const tripData = typeof trip.tripData === 'string' ? JSON.parse(trip.tripData) : trip.tripData;
      suggestedActivities = tripData.suggestedActivities || [];
      // Audit V3 T3 (« Hotel Cubo » fantôme) : les résultats sauvegardés
      // stockent flightDetails/hotelOptions.hotels[], pas flight/hotel —
      // le prompt itinéraire tournait donc sans le vrai vol ni le vrai hôtel
      // et en inventait un.
      flightDetails = tripData.flightDetails || tripData.flight;
      hotelDetails = tripData.hotelDetails
        || tripData.hotelOptions?.hotels?.[0]
        || tripData.hotel
        || tripData.hotelOptions;
      recommendedTransport = tripData.recommendedTransport || null;
    }
  } else if (trip.finalDestination) {
    // finalDestination can be flat { city, country } or nested { destination: { city, country }, slot, pricing }
    const fd = trip.finalDestination;
    city = fd.city || fd.destination?.city;
    country = fd.country || fd.destination?.country;
    startDate = fd.startDate || fd.slot?.startDate || trip.finalStartDate;
    endDate = fd.endDate || fd.slot?.endDate || trip.finalEndDate;
    // Activities might be at different levels
    suggestedActivities = fd.suggestedActivities || fd.destination?.suggestedActivities || [];
    flightDetails = fd.flightDetails || fd.flight;
    hotelDetails = fd.hotelDetails || fd.hotelOptions?.hotels?.[0] || fd.hotel || fd.hotelOptions;
    recommendedTransport = fd.recommendedTransport || null;
  } else {
    // Fallback
    city = 'Paris';
    country = 'France';
    startDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    endDate = new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  // Expected itinerary length from the trip's own dates. Used to detect a
  // stale cached itinerary (e.g. a 7-day trip holding a 5-day itinerary).
  let expectedDays = null;
  if (startDate && endDate) {
    const d = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    if (Number.isFinite(d) && d > 0) expectedDays = d;
  }

  return {
    trip,
    isSavedTrip,
    members,
    city,
    country,
    startDate,
    endDate,
    expectedDays,
    suggestedActivities: suggestedActivities || [],
    flightDetails,
    hotelDetails,
    recommendedTransport
  };
}

/**
 * Attach a destination photo to each itinerary day that lacks one.
 * Fetches a Pexels gallery once and assigns photos round-robin so days
 * read as a varied photo essay. Mutates + returns the itinerary; never throws.
 */
async function enrichDaysWithPhotos(itinerary, city, country) {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return itinerary;
  if (itinerary.every((d) => d?.photo)) return itinerary;
  try {
    const count = Math.min(Math.max(itinerary.length, 3), 15);
    const gallery = await getDestinationPhotoGallery(city, country, count);
    if (gallery && gallery.length > 0) {
      itinerary.forEach((day, i) => {
        if (day && !day.photo) {
          day.photo = gallery[i % gallery.length]?.url || gallery[0]?.url;
        }
      });
    }
  } catch (err) {
    console.warn('⚠️ Failed to attach day photos:', err.message);
  }
  return itinerary;
}

/**
 * GET /api/trips/:id/weather
 * FAST: Get weather forecast only (2-3 seconds)
 */
router.get('/:id/weather', authenticateUserOrGuest, async (req, res) => {
  try {
    const { id } = req.params;
    const tripData = await getTripData(id, req.user);

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
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

/**
 * GET /api/trips/:id/packing
 * FAST: Get packing recommendations (depends on weather, 3-5 seconds)
 */
router.get('/:id/packing', authenticateUserOrGuest, async (req, res) => {
  try {
    const { id } = req.params;
    const tripData = await getTripData(id, req.user);

    if (!tripData) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    const { city, country, startDate, endDate } = tripData;

    // Get weather + generate AI-powered packing in parallel
    const weather = await getWeatherForecast(city, country);

    // Try Claude AI packing first, fall back to static
    let packing;
    try {
      packing = await generateSmartPacking({
        city,
        country,
        startDate,
        endDate,
        weatherForecast: weather?.forecast || [],
        activities: [],
      });
    } catch {
      packing = weather
        ? getPackingRecommendations(weather.forecast, { startDate, endDate })
        : { clothing: ['Vêtements confortables'], essentials: ['Documents de voyage'], activityItems: [] };
    }

    res.json({ success: true, data: { packing, city, country } });
  } catch (error) {
    console.error('Error fetching packing tips:', error);
    res.status(500).json({ error: 'Failed to fetch packing tips' });
  }
});

/**
 * GET /api/trips/:id/itinerary
 * SLOW: Generate personalized itinerary with Claude AI (10-15 seconds)
 * CACHING: Saves itinerary to tripData to avoid regeneration on revisit
 */
router.get('/:id/itinerary', authenticateUserOrGuest, async (req, res) => {
  try {
    const { id } = req.params;
    const tripData = await getTripData(id, req.user);

    if (!tripData) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    const { trip, isSavedTrip, members, city, country, startDate, endDate, expectedDays, suggestedActivities, flightDetails, hotelDetails, recommendedTransport } = tripData;

    // Check if itinerary already exists in tripData
    const existingTripData = typeof trip.tripData === 'string' ? JSON.parse(trip.tripData) : (trip.tripData || {});

    // Only reuse the cache when its length matches the trip duration (±1 day,
    // since the parser legitimately salvages a day at the boundary). A larger
    // mismatch means the cache is stale (e.g. dates changed) → regenerate.
    const cachedLen = existingTripData.cachedItinerary?.length || 0;
    const cacheMatchesDuration = !expectedDays || Math.abs(cachedLen - expectedDays) <= 1;

    if (existingTripData.cachedItinerary && cacheMatchesDuration) {
      console.log(`✅ Using cached itinerary for trip ${id}`);
      const cached = await enrichDaysWithPhotos(existingTripData.cachedItinerary, city, country);
      return res.json({
        success: true,
        data: {
          itinerary: cached,
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
      hotelDetails,
      recommendedTransport
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

    // Attach a destination photo per day (photo-essay feel)
    await enrichDaysWithPhotos(itinerary, city, country);

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
    res.status(500).json({ error: 'Failed to generate itinerary' });
  }
});

/**
 * GET /api/trips/:id/itinerary/stream
 * STREAMING: Generate personalized itinerary day by day
 * Uses Server-Sent Events (SSE) to stream each day as it's generated
 */
router.get('/:id/itinerary/stream', authenticateUserOrGuest, async (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Helper to send SSE event
  const sendEvent = (type, data) => {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { id } = req.params;
    const tripData = await getTripData(id, req.user);

    if (!tripData) {
      sendEvent('error', { message: 'Trip not found or access denied' });
      res.end();
      return;
    }

    const { trip, isSavedTrip, members, city, country, startDate, endDate, expectedDays, suggestedActivities, flightDetails, hotelDetails, recommendedTransport } = tripData;

    // Check if itinerary already exists in cache
    const existingTripData = typeof trip.tripData === 'string' ? JSON.parse(trip.tripData) : (trip.tripData || {});
    const cachedItinerary = existingTripData.cachedItinerary || trip.finalDestination?.cachedItinerary;

    // Reuse the cache only when its length matches the trip duration (±1 day).
    // A larger mismatch means it's stale (dates changed) → regenerate.
    const cacheMatchesDuration = !expectedDays || Math.abs((cachedItinerary?.length || 0) - expectedDays) <= 1;

    if (cachedItinerary && cachedItinerary.length > 0 && cacheMatchesDuration) {
      console.log(`✅ [STREAM] Using cached itinerary for trip ${id}`);
      // Send cached days one by one (simulated streaming for cached data)
      sendEvent('status', { stage: 'cached', message: 'Loading saved itinerary...' });

      await enrichDaysWithPhotos(cachedItinerary, city, country);

      for (let i = 0; i < cachedItinerary.length; i++) {
        sendEvent('day', {
          day: cachedItinerary[i],
          dayNumber: i + 1,
          totalDays: cachedItinerary.length
        });
      }

      sendEvent('complete', {
        itinerary: cachedItinerary,
        packing: existingTripData.cachedPacking || trip.finalDestination?.cachedPacking,
        cached: true
      });
      res.end();
      return;
    }

    console.log(`🔄 [STREAM] Generating new itinerary for trip ${id}...`);
    sendEvent('status', { stage: 'starting', message: 'Starting itinerary generation...' });

    const destination = {
      city,
      country,
      startDate,
      endDate,
      suggestedActivities,
      flightDetails,
      hotelDetails,
      recommendedTransport
    };

    // Get user preferences from database
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.id },
    });

    // Extract search context from trip data (saved when trip was created)
    // Note: existingTripData already declared above for cache check
    const searchContext = existingTripData.searchContext || trip.finalDestination?.searchContext || {};

    // Merge user preferences with search context for maximum personalization
    const userProfile = {
      // From database (general preferences)
      personality: userPreferences?.personality || searchContext.personality,
      topActivities: userPreferences?.topActivities || searchContext.activities || [],
      budget: userPreferences?.budget || 1500,
      idealRhythm: userPreferences?.idealRhythm || searchContext.idealRhythm,
      whyTravel: userPreferences?.whyTravel || searchContext.whyTravel,
      mainGoal: userPreferences?.mainGoal || searchContext.mainGoal,
      globalStyle: userPreferences?.globalStyle || searchContext.style,
      // From search context (specific to this trip)
      travelVibeDescription: searchContext.travelVibeDescription,
      travelers: searchContext.travelers || 1,
      tripType: searchContext.tripType,
    };

    console.log('👤 User profile for itinerary:', {
      personality: userProfile.personality,
      travelers: userProfile.travelers,
      tripType: userProfile.tripType,
      travelVibeDescription: userProfile.travelVibeDescription?.substring(0, 50),
    });

    const userName = req.user.firstName || 'there';

    // Pre-fetch a destination photo gallery so each streamed day carries a photo
    let dayGallery = [];
    try {
      dayGallery = await getDestinationPhotoGallery(city, country, 12);
    } catch (galleryError) {
      console.warn('⚠️ [STREAM] Failed to prefetch day photos:', galleryError.message);
    }

    // Generate itinerary with streaming callback
    const itinerary = await generateItineraryStreaming(
      destination,
      userProfile,
      userName,
      isSavedTrip ? [] : members,
      (dayData, dayNumber, totalDays) => {
        // Attach a photo (mutates dayData → persists into cached itinerary)
        if (dayData && !dayData.photo && dayGallery.length > 0) {
          const pick = dayGallery[(dayNumber - 1) % dayGallery.length] || dayGallery[0];
          dayData.photo = pick?.url;
        }
        // Stream each day as it's generated
        sendEvent('day', {
          day: dayData,
          dayNumber,
          totalDays
        });
      }
    );

    // Get weather and generate packing list
    let packing = null;
    try {
      const weather = await getWeatherForecast(city, country);
      packing = generatePackingFromItinerary(itinerary, weather, { city, country });
      sendEvent('packing', { packing });
    } catch (packingError) {
      console.warn('⚠️ Failed to generate packing:', packingError.message);
    }

    // Save itinerary to cache
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
      } else if (trip.finalDestination) {
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
      console.log(`💾 [STREAM] Itinerary cached for trip ${id}`);
    } catch (cacheError) {
      console.warn('⚠️ Failed to cache itinerary:', cacheError.message);
    }

    // Send completion event
    sendEvent('complete', {
      itinerary,
      packing,
      city,
      country,
      cached: false
    });
    res.end();

  } catch (error) {
    console.error('Error streaming itinerary:', error);
    sendEvent('error', { message: 'Failed to generate itinerary' });
    res.end();
  }
});

/**
 * GET /api/trips/:id/events
 * FAST: Get local events (instant, from static data)
 */
router.get('/:id/events', authenticateUserOrGuest, async (req, res) => {
  try {
    const { id } = req.params;
    const tripData = await getTripData(id, req.user);

    if (!tripData) {
      return res.status(404).json({ error: 'Trip not found or access denied' });
    }

    const { city, country, startDate, endDate } = tripData;

    // Try Claude AI events first — only returns real/confirmed events
    let events;
    try {
      const aiResult = await generateSmartEvents({ city, country, startDate, endDate });
      if (aiResult.events.length > 0) {
        // Return AI-generated events in a unified format
        events = {
          upcoming: aiResult.events,
          regular: [],
          source: 'ai',
        };
      } else {
        // Claude found nothing relevant — try static fallback
        const upcomingEvents = getLocalEvents(city, startDate, endDate);
        const allCityEvents = getAllCityEvents(city);
        events = {
          upcoming: upcomingEvents,
          regular: allCityEvents,
          source: 'static',
        };
      }
    } catch {
      const upcomingEvents = getLocalEvents(city, startDate, endDate);
      const allCityEvents = getAllCityEvents(city);
      events = { upcoming: upcomingEvents, regular: allCityEvents };
    }

    res.json({ success: true, data: { events, city } });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * GET /api/trips/:id/enhancements
 * DEPRECATED: Use separate routes above for better performance
 * Keep for backward compatibility
 */
router.get('/:id/enhancements', authenticateUserOrGuest, async (req, res) => {
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
      const isGuestWithAccess = req.user.isGuest === true && req.user.allowedTripId === id;
      members = trip.members;

      if (!isCreator && !userMember && !isGuestWithAccess) {
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

    const tripData = await getTripData(id, req.user);
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
    res.status(500).json({ error: 'Failed to modify itinerary' });
  }
});

export default router;
