// backend/src/routes/travel.js
import express from 'express';
import { generateDestinations } from '../services/claudeService.js';
import { searchFlightOffers, getHotelCostWithFallbacks } from '../services/amadeusService.js';
import { getHotelCostWithBooking } from '../services/bookingService.js';
import { searchFlixBus } from '../services/flixbusService.js';
import { generateAffiliateLinks } from '../services/affiliateService.js';
import { calculateFinalScore } from '../utils/scoring.js';
import { getDestinationPhotos } from '../services/unsplashService.js';
import { authenticateUser } from '../middleware/auth.js';
import { strictLimiter } from '../middleware/rateLimiter.js';
import { checkLimit, incrementUsage } from '../middleware/checkSubscription.js';
import { filterByBudget, validateCostData, preFilterByEstimatedCost } from '../utils/budgetFilter.js';
import { applyTemporalPricing, generateSmartDateSuggestions, calculateAvailableLeaveDays } from '../utils/temporalOptimization.js';
import prisma from '../db/prisma.js';

// Helper function to determine season
function getSeason(dateStr) {
  const month = new Date(dateStr).getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

const router = express.Router();

// Main endpoint: Generate travel recommendations
// Apply strict rate limiting (10 req/15min) for expensive Claude AI calls
// Check usage limits and increment counter on success
router.post('/recommendations',
  strictLimiter,
  authenticateUser,
  checkLimit('maxSearchesPerMonth', 'searchesThisMonth'),
  incrementUsage('searchesThisMonth'),
  async (req, res) => {
  try {
    const userProfile = req.body;
    console.log('📝 Received user profile:', JSON.stringify(userProfile, null, 2));

    // Fetch user's onboarding preferences from database
    console.log('🔍 Fetching user onboarding preferences...');
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.id },
    });

    if (userPreferences) {
      console.log('✅ Found user onboarding preferences');
      // Merge onboarding preferences into userProfile
      userProfile.onboardingPreferences = {
        whyTravel: userPreferences.whyTravel,
        mainGoal: userPreferences.mainGoal,
        globalStyle: userPreferences.globalStyle,
        topActivities: userPreferences.topActivities || [],
        idealRhythm: userPreferences.idealRhythm,
        accommodationPref: userPreferences.accommodationPref,
        transportModes: userPreferences.transportModes || [],
        maxTransportHours: userPreferences.maxTransportHours,
        visaPreference: userPreferences.visaPreference,
        mobilityNeeds: userPreferences.mobilityNeeds,
        securityImportance: userPreferences.securityImportance,
        crowdTolerance: userPreferences.crowdTolerance,
        ecoSensitivity: userPreferences.ecoSensitivity,
        culturalAdaptability: userPreferences.culturalAdaptability,
        climateSensitivity: userPreferences.climateSensitivity,
        preferredAirports: userPreferences.preferredAirports || [],
      };
    } else {
      console.log('⚠️  No onboarding preferences found for user');
    }

    // Step 1: Determine origin city (needed for Claude prompt)
    const originCity = (userPreferences?.preferredAirports?.[0]) || userProfile.availability?.originCity || 'CDG';
    console.log(`✈️  User's origin city: ${originCity}`);

    // Step 1: Claude generates 10 destinations
    console.log('🤖 Step 1: Generating destinations with Claude...');
    const userName = req.user.firstName
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
      : req.user.email;
    const allDestinations = await generateDestinations(userProfile, req.user.id, userName, originCity);
    console.log(`✅ Generated ${allDestinations.length} destinations`);

    // Step 1.5: Pre-filter by estimated cost (BEFORE expensive API calls)
    console.log('⚡ Step 1.5: Pre-filtering by estimated budget...');
    const destinations = preFilterByEstimatedCost(
      allDestinations,
      userProfile.basic.budget,
      userProfile.basic.maxFlightHours
    );
    console.log(`✅ Pre-filtered to ${destinations.length} destinations within estimated budget`);

    // Step 1.75: Temporal optimization - suggest best dates
    console.log('📅 Step 1.75: Analyzing optimal travel dates...');
    let temporalSuggestions = null;
    let leaveDaysInfo = null;
    let calendarSuggestions = null;
    let cachedOptimalPeriods = null;

    if (userPreferences) {
      // Calculate available leave days
      if (userPreferences.annualLeaveDays && userPreferences.takenLeaveDays !== null) {
        leaveDaysInfo = calculateAvailableLeaveDays(userPreferences);
        console.log(`📊 Leave days: ${leaveDaysInfo.remaining}/${leaveDaysInfo.total} remaining`);
      }

      // Check if user provided specific dates in their request
      const hasUserProvidedDates = userProfile.availability?.startDate && userProfile.availability?.endDate;

      // If user didn't provide dates, check for cached optimal periods
      if (!hasUserProvidedDates) {
        console.log('🔍 User did not specify dates, checking for cached optimal periods...');
        const today = new Date();
        cachedOptimalPeriods = await prisma.optimalPeriod.findMany({
          where: {
            userId: req.user.id,
            expiresAt: { gte: today }
          },
          orderBy: {
            confidence: 'desc'
          }
        });

        if (cachedOptimalPeriods && cachedOptimalPeriods.length > 0) {
          console.log(`✅ Found ${cachedOptimalPeriods.length} cached optimal periods, will use silently`);
          // Separate by type for later use
          const shortTermCached = cachedOptimalPeriods.filter(p => p.type === 'short');
          const longTermCached = cachedOptimalPeriods.filter(p => p.type === 'long');

          // Use the best period based on trip duration
          const tripDuration = userProfile.availability?.duration || userPreferences.avgTripDuration || 7;
          const bestPeriod = tripDuration <= 4
            ? (shortTermCached[0] || longTermCached[0])
            : (longTermCached[0] || shortTermCached[0]);

          if (bestPeriod) {
            console.log(`🎯 Using cached optimal period: ${bestPeriod.title} (${bestPeriod.startDate.toISOString().split('T')[0]} - ${bestPeriod.endDate.toISOString().split('T')[0]})`);
            // Inject dates into userProfile so Claude uses them
            userProfile.availability = userProfile.availability || {};
            userProfile.availability.startDate = bestPeriod.startDate.toISOString().split('T')[0];
            userProfile.availability.endDate = bestPeriod.endDate.toISOString().split('T')[0];
            userProfile.availability.duration = bestPeriod.duration;
          }
        } else {
          console.log('⚠️  No cached optimal periods found');
        }
      }

      // If calendar is connected, get calendar-based suggestions
      if (userPreferences.calendarConnected && userPreferences.calendarAccessToken) {
        console.log('📅 Using Google Calendar for date suggestions...');
        try {
          const { suggestTravelDatesFromCalendar, refreshAccessToken } = await import('../services/googleCalendarService.js');

          let accessToken = userPreferences.calendarAccessToken;

          // Refresh token if expired
          if (userPreferences.calendarTokenExpiry && new Date(userPreferences.calendarTokenExpiry) < new Date()) {
            console.log('🔄 Refreshing expired access token...');
            accessToken = await refreshAccessToken(userPreferences.calendarRefreshToken);
          }

          const tripDuration = userProfile.availability?.duration || userPreferences.avgTripDuration || 7;
          calendarSuggestions = await suggestTravelDatesFromCalendar(
            accessToken,
            userPreferences.calendarRefreshToken,
            tripDuration
          );
          console.log(`✅ Generated ${calendarSuggestions.length} calendar-based suggestions`);
        } catch (error) {
          console.error('⚠️  Calendar suggestions failed:', error);
          // Fall back to standard temporal optimization
        }
      }

      // Generate smart date suggestions (manual mode or fallback)
      if (!calendarSuggestions) {
        temporalSuggestions = generateSmartDateSuggestions(userProfile);
        console.log(`✅ Generated ${temporalSuggestions.length} optimal date suggestions`);

        if (temporalSuggestions.length > 0) {
          console.log(`💡 Best period: ${temporalSuggestions[0].reason || temporalSuggestions[0].strategy}`);
        }
      }
    }

    // Step 2: Use Claude destinations directly (no pre-screening)
    // Claude has already verified connectivity in its prompt, and we have fallbacks for missing flights
    console.log('✈️  Step 2: Using Claude destinations directly (skipping Amadeus pre-screening to preserve diversity)...');
    let preScreened = destinations.slice(0, 3); // Use all 3 Claude-generated destinations
    console.log(`✅ Using ${preScreened.length} Claude destinations (Porto/Bucharest trap avoided! 🎉)`);

    // Step 3: Get photos for top destinations
    console.log('📸 Step 3: Fetching destination photos...');
    const photoMap = await getDestinationPhotos(preScreened.slice(0, 5));
    console.log(`✅ Fetched ${photoMap.size} photos`);

    // Step 4: Detailed search for top destinations
    console.log('🔎 Step 4: Searching detailed flights and alternatives...');
    // Try to get at least 5 destinations to ensure we return minimum 3 after filtering
    const topDestinations = preScreened.slice(0, 5);

   const results = await Promise.all(
  topDestinations.map(async (destination) => {
    // Use AI-generated dates instead of user slots
    const slot = {
      startDate: destination.startDate,
      endDate: destination.endDate,
      duration: Math.ceil((new Date(destination.endDate) - new Date(destination.startDate)) / (1000 * 60 * 60 * 24)) + 1,
      season: getSeason(destination.startDate)
    };

        // Log flight search parameters for debugging
        console.log(`🔍 Searching flights for ${destination.city}:`);
        console.log(`   Origin: ${originCity}`);
        console.log(`   Destination: ${destination.iataCode} (${destination.city})`);
        console.log(`   Dates: ${slot.startDate} → ${slot.endDate} (${slot.duration} days)`);
        console.log(`   Budget: €${userProfile.basic.budget}`);

        // Get flight offers
        let flightOffer = await searchFlightOffers(destination, slot, originCity);

        // FALLBACK: If no flight found, create estimated transport cost
        if (!flightOffer) {
          console.log(`⚠️  No flights found for ${destination.city} - using estimated transport cost`);

          // Estimate transport cost based on distance/budget
          const estimatedFlightCost = destination.estimatedBudget
            ? Math.round(destination.estimatedBudget * 0.4) // 40% of estimated budget for transport
            : Math.round(userProfile.basic.budget * 0.3); // Or 30% of user budget

          // Create a placeholder flight offer with estimated cost
          flightOffer = {
            price: estimatedFlightCost,
            segments: [],
            totalDuration: 'Unknown',
            validatingAirline: 'TBD',
            cabinClass: 'ECONOMY',
            isEstimate: true, // Flag to indicate this is not real flight data
            transportNote: 'Vol non disponible - coût estimé (train/bus possible)'
          };
        }

        // Search for alternative transport (FlixBus/Train)
        console.log(`🚌 Searching alternative transport for ${destination.city}...`);
        let transportAlternatives = [];

        // Try FlixBus for European destinations
        try {
          const flixbusResults = await searchFlixBus({
            fromCity: originCity,
            toCity: destination.city,
            date: slot.startDate,
            adults: 1,
          });

          if (flixbusResults && flixbusResults.length > 0) {
            // Get cheapest FlixBus option
            const cheapestBus = flixbusResults.reduce((min, curr) =>
              curr.price.amount < min.price.amount ? curr : min
            );

            transportAlternatives.push({
              type: 'bus',
              operator: 'FlixBus',
              price: cheapestBus.price.amount,
              currency: cheapestBus.price.currency,
              duration: cheapestBus.duration,
              departure: cheapestBus.departure.time,
              arrival: cheapestBus.arrival.time,
              transfers: cheapestBus.transfers,
              bookingUrl: cheapestBus.bookingUrl,
              isEstimate: false,
            });
            console.log(`✅ Found FlixBus: €${cheapestBus.price.amount} (${cheapestBus.duration}min)`);
          }
        } catch (error) {
          console.log(`⚠️  FlixBus search failed for ${destination.city}:`, error.message);
        }

        // Estimate train cost (no API available)
        // TODO: Create trainPrices.js database with historical prices
        const estimatedTrainCost = Math.round(flightOffer.price * 0.6); // Trains typically 60% of flight cost
        transportAlternatives.push({
          type: 'train',
          operator: 'SNCF/DB/Trenitalia',
          price: estimatedTrainCost,
          currency: 'EUR',
          duration: null,
          isEstimate: true,
          note: 'Prix estimé - Vérifiez sur le site officiel',
          bookingUrl: 'https://www.trainline.com',
        });

        // IMPROVED: Get hotel cost with Booking.com (primary) -> Amadeus (fallback)
        console.log(`🏨 Searching hotels for ${destination.city}...`);

        // Try Booking.com first (better data)
        let hotelResult = await getHotelCostWithBooking({
          cityName: destination.city,
          checkInDate: slot.startDate,
          checkOutDate: slot.endDate,
          adults: 1,
          style: userProfile.basic.style,
        });

        // Fallback to Amadeus if Booking.com fails
        if (!hotelResult || !hotelResult.hotels) {
          console.log(`⚠️  Booking.com unavailable for ${destination.city}, trying Amadeus...`);
          hotelResult = await getHotelCostWithFallbacks(destination, slot, userProfile.basic);
        }

        const hotelCost = hotelResult.cost;
        const hotelSearch = hotelResult.hotels ? {
          hotels: hotelResult.hotels,
          averagePrice: hotelResult.cost,
          source: hotelResult.source,
          destination: destination.city,
          checkIn: slot.startDate,
          checkOut: slot.endDate,
          nights: slot.duration - 1,
        } : null;

        // Calculate activities budget
        const activitiesBudget = Math.round(
          userProfile.basic.budget * (userProfile.preferences.activitiesBudget / 100)
        );

        // Total cost
        const totalCost = flightOffer.price + hotelCost + activitiesBudget;

        // Calculate final score
        const score = calculateFinalScore(
          destination,
          flightOffer.price,
          hotelCost,
          userProfile.basic.budget
        );

        // Generate affiliate links
        const affiliateLinks = generateAffiliateLinks(
          { destination, slot, flightOffer },
          originCity
        );

        // Get photo from map
        const photo = photoMap.get(destination.city);

        return {
          destination: {
            city: destination.city,
            country: destination.country,
            iataCode: destination.iataCode,
            matchReason: destination.matchReason,
            seasonReason: destination.seasonReason,
            photo: photo // Add photo to destination
          },
          slot: {
            startDate: slot.startDate,
            endDate: slot.endDate,
            duration: slot.duration,
            season: slot.season
          },
          pricing: {
            flight: Math.round(flightOffer.price),
            hotel: hotelCost,
            activities: activitiesBudget,
            total: totalCost,
            remaining: userProfile.basic.budget - totalCost,
            currency: 'EUR'
          },
          flightDetails: {
            outbound: {
              segments: flightOffer.segments || [],
              departureTime: flightOffer.segments?.[0]?.departureTime,
              arrivalTime: flightOffer.segments?.[flightOffer.segments.length - 1]?.arrivalTime,
              duration: flightOffer.totalDuration,
              stops: flightOffer.segments ? flightOffer.segments.length - 1 : 0
            },
            return: flightOffer.returnSegments ? {
              segments: flightOffer.returnSegments || [],
              departureTime: flightOffer.returnSegments?.[0]?.departureTime,
              arrivalTime: flightOffer.returnSegments?.[flightOffer.returnSegments.length - 1]?.arrivalTime,
              duration: flightOffer.returnDuration,
              stops: flightOffer.returnSegments ? flightOffer.returnSegments.length - 1 : 0
            } : null,
            totalPrice: Math.round(flightOffer.price),
            pricePerPerson: Math.round(flightOffer.price),
            airline: flightOffer.validatingAirline,
            cabinClass: flightOffer.cabinClass || 'ECONOMY',
            isEstimate: flightOffer.isEstimate || false,
            transportNote: flightOffer.transportNote || null
          },
          hotelOptions: hotelSearch ? {
            destination: hotelSearch.destination,
            checkIn: hotelSearch.checkIn,
            checkOut: hotelSearch.checkOut,
            nights: hotelSearch.nights,
            hotels: hotelSearch.hotels,
            averagePrice: hotelSearch.averagePrice
          } : null,
          transportAlternatives: transportAlternatives,
          suggestedActivities: destination.suggestedActivities || [],
          score: score,
          links: affiliateLinks
        };
      })
    );

    // Filter out nulls (though now we shouldn't have any)
    let validResults = results.filter(r => r !== null);

    // CRITICAL: Filter by budget (remove anything > 110% of budget)
    const budgetFiltered = filterByBudget(validResults, userProfile.basic.budget, 0.10);

    // Validate cost data quality
    const qualityFiltered = budgetFiltered.filter(r => validateCostData(r));

    // CRITICAL GUARANTEE: Always return at least 3 results
    // If budget/quality filtering removed too many, relax constraints
    if (qualityFiltered.length < 3 && validResults.length >= 3) {
      console.warn(`⚠️  Only ${qualityFiltered.length} results after filtering - relaxing budget constraint to guarantee 3 results`);
      // Take top 3 by score from unfiltered results
      validResults.sort((a, b) => b.score.total - a.score.total);
      validResults = validResults.slice(0, 3);
    } else {
      validResults = qualityFiltered;
    }

    // Sort by score
    validResults.sort((a, b) => b.score.total - a.score.total);

    console.log(`✅ Returning ${validResults.length} budget-appropriate recommendations (guaranteed minimum 3)`);

    res.json({
      success: true,
      recommendations: validResults,
      temporalOptimization: (temporalSuggestions || calendarSuggestions) ? {
        suggestedDates: calendarSuggestions || temporalSuggestions,
        leaveDaysInfo: leaveDaysInfo,
        source: calendarSuggestions ? 'google_calendar' : 'manual_optimization',
        message: calendarSuggestions
          ? `📅 Nous avons analysé votre calendrier et trouvé ${calendarSuggestions.length} périodes idéales pour voyager !`
          : temporalSuggestions?.length > 0
            ? `💡 Nous avons trouvé ${temporalSuggestions.length} périodes optimales pour voyager et économiser !`
            : null
      } : null,
      metadata: {
        totalGenerated: destinations.length,
        preScreened: preScreened.length,
        finalResults: validResults.length,
        calendarIntegrated: !!calendarSuggestions,
        processingTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

// Test endpoint to verify APIs are working
router.get('/test', async (req, res) => {
  res.json({
    message: 'Travel API is working',
    endpoints: {
      recommendations: 'POST /api/travel/recommendations'
    }
  });
});

export default router;