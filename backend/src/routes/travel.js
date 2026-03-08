// backend/src/routes/travel.js
import express from 'express';
import { generateDestinationRecommendationWithData, generateRoadtripNarrative } from '../services/claudeService.js';
import * as destinationService from '../services/destinationService.js';
import * as roadtripService from '../services/roadtripService.js';
import { generateAffiliateLinks } from '../services/affiliateService.js';
import { getDestinationPhotos as getPexelsPhoto } from '../services/pexelsService.js';
import { authenticateUser } from '../middleware/auth.js';
import { strictLimiter, userStrictLimiter, userSearchLimiter } from '../middleware/rateLimiter.js';
import { checkLimit, incrementUsage } from '../middleware/checkSubscription.js';
import prisma from '../db/prisma.js';

// Helper function to determine season
function getSeason(dateStr) {
  const month = new Date(dateStr).getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

// Helper: Detect WITH vs WITHOUT destination scenario
function detectScenario(userProfile) {
  const hasDestination = userProfile.basic?.destination &&
                         userProfile.basic?.destination.trim() !== '' &&
                         userProfile.basic?.destination !== 'Surprise me';
  return hasDestination ? 'WITH_DESTINATION' : 'WITHOUT_DESTINATION';
}

// Helper: Get photos for multiple destinations
async function getDestinationPhotos(cityNames) {
  const photoPromises = cityNames.map(async (cityName) => {
    try {
      const photo = await getPexelsPhoto(cityName);
      return [cityName, photo];
    } catch (error) {
      console.warn(`Failed to get photo for ${cityName}:`, error.message);
      return [cityName, null];
    }
  });

  const results = await Promise.all(photoPromises);
  return new Map(results);
}

// Helper: Calculate score from optimized trip data
function calculateScoreFromTrip(trip, userBudget) {
  const totalCost = trip.budget.total;
  const remaining = trip.budget.remaining;
  const flightCost = trip.flight.totalCost;

  // Score based on budget utilization (optimal around 80-90%)
  const budgetUtilization = (totalCost / userBudget) * 100;
  const budgetScore = budgetUtilization >= 80 && budgetUtilization <= 100 ? 100 :
                      budgetUtilization < 80 ? 70 : 50;

  // Score based on flight cost (lower is better, <40% of budget is great)
  const flightPercentage = (flightCost / userBudget) * 100;
  const flightScore = flightPercentage < 30 ? 100 :
                      flightPercentage < 40 ? 85 :
                      flightPercentage < 50 ? 70 : 50;

  // Score based on remaining budget (having 15-25% left is ideal for activities)
  const remainingPercentage = (remaining / userBudget) * 100;
  const valueScore = remainingPercentage >= 15 && remainingPercentage <= 30 ? 100 :
                     remainingPercentage > 30 ? 80 :
                     remainingPercentage > 10 ? 60 : 40;

  const total = (budgetScore * 0.4) + (flightScore * 0.3) + (valueScore * 0.3);

  return {
    total: Math.round(total),
    breakdown: {
      // Map to frontend expected field names for backward compatibility
      aiMatch: budgetScore,      // Budget alignment = how well it matches user needs
      price: flightScore,        // Flight cost efficiency
      originality: valueScore,   // Value/activities remaining budget
      availability: 90           // Default high score (Air Scraper has good availability)
    }
  };
}

const router = express.Router();

// ==========================================
// DESTINATION AUTOCOMPLETE ENDPOINT
// Uses Hotel API which returns cities/regions (not airports)
// Backend will find appropriate airport when searching flights
// ==========================================
router.get('/destinations/search', authenticateUser, userSearchLimiter, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({ success: true, destinations: [] });
    }

    console.log(`🔍 Autocomplete search: "${query}"`);

    // Use HOTEL destination API - returns cities/regions instead of airports
    // This is better UX: user selects "Bali, Indonesia" not "Ngurah Rai Airport"
    const response = await fetch(`https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination?query=${encodeURIComponent(query)}`, {
      headers: {
        'x-rapidapi-key': process.env.BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      }
    });

    const data = await response.json();

    if (!data?.status || !data?.data?.length) {
      return res.json({ success: true, destinations: [] });
    }

    // Filter out airports - only show cities and regions
    const filtered = data.data.filter(d =>
      d.dest_type !== 'airport' && d.dest_type !== 'AIRPORT'
    );

    // Format results for frontend
    const destinations = filtered.map(d => ({
      id: d.dest_id,
      name: d.name,
      type: d.dest_type, // 'city', 'region', etc.
      city: d.city_name || d.name,
      country: d.country,
      // Display label for dropdown
      label: `${d.name}, ${d.country}`,
    }));

    res.json({
      success: true,
      destinations: destinations.slice(0, 6) // Limit to 6 results
    });

  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ success: false, error: 'Destination search failed' });
  }
});

// test-algorithm endpoint removed for security (exposed Claude API to public)

// Main endpoint: Generate travel recommendations
// Apply strict rate limiting (10 req/15min) for expensive Claude AI calls
// Check usage limits and increment counter on success
router.post('/recommendations',
  strictLimiter,
  authenticateUser,
  userStrictLimiter,
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
        // New onboarding fields
        personality: userPreferences.personality,
        refusedTransports: userPreferences.refusedTransports || [],
        professionalStatus: userPreferences.professionalStatus,
        idealDuration: userPreferences.idealDuration,
      };
    } else {
      console.log('⚠️  No onboarding preferences found for user');
    }

    // Determine origin city
    const originCity = (userPreferences?.preferredAirports?.[0]) || userProfile.availability?.originCity || 'Paris';
    console.log(`✈️  User's origin city: ${originCity}`);

    // Detect scenario: WITH or WITHOUT destination
    const scenario = detectScenario(userProfile);
    console.log(`🎯 Scenario detected: ${scenario}`);

    // NEW WORKFLOW: Route based on scenario
    if (scenario === 'WITH_DESTINATION') {
      // ====================================================================
      // WITH DESTINATION WORKFLOW - User specified destination
      // ====================================================================
      console.log('🎯 WITH DESTINATION workflow - Optimizing specific trip');

      const destination = userProfile.basic.destination;
      const destinationId = userProfile.basic.destinationId; // From autocomplete
      const budgetPerPerson = userProfile.basic.budget;
      const travelers = userProfile.basic.travelers || 1;
      const budget = budgetPerPerson * travelers; // Budget is per-person from frontend → multiply for total
      userProfile.basic.budget = budget; // Update so Claude and downstream services see the effective total
      userProfile.basic.budgetPerPerson = budgetPerPerson; // Keep per-person for reference
      console.log(`   💰 Budget: €${budgetPerPerson}/person × ${travelers} = €${budget} total`);
      const duration = userProfile.availability?.duration || 7;

      // Extract trip context (free text from user)
      const tripContext = userProfile.basic?.travelVibeDescription || null;
      if (tripContext) {
        console.log(`   🎯 Trip context from user: "${tripContext.substring(0, 80)}..."`);
      }

      // Step 1: Optimize trip with Booking.com API
      console.log(`🔍 Step 1: Optimizing ${destination} trip...`);
      if (destinationId) {
        console.log(`   Using pre-resolved destination ID: ${destinationId}`);
      }
      // Check if user wants fixed dates (no flexibility)
      const isFixedDate = userProfile.availability?.departureFlexibility === 'fixed' ||
                          userProfile.availability?.flexibleDates === false;

      const optimizedTrip = await destinationService.optimizeDestination({
        destination,
        destinationId, // Pass the pre-resolved ID to avoid name ambiguity
        userProfile,
        budget,
        origin: originCity,
        duration,
        departureDate: userProfile.availability?.startDate,
        tripContext, // NEW: Pass user's free text for context-aware hotel selection
        isFixedDate, // Respect fixed dates if specified
      });

      console.log(`✅ Trip optimized: €${optimizedTrip.flight.totalCost} flight + €${optimizedTrip.hotel.totalPrice} hotel`);

      // Step 2+3: Generate destination insights + fetch photos in parallel
      console.log('🤖 Step 2+3: Generating insights + fetching photos in parallel...');
      const [destinationInsights, photoMap] = await Promise.all([
        generateDestinationRecommendationWithData({
          destination: { name: optimizedTrip.destination.name, country: optimizedTrip.destination.country },
          userProfile,
          dates: { departure: optimizedTrip.dates.departure, duration: optimizedTrip.dates.duration },
          budget: { remaining: optimizedTrip.budget.activities },
        }).catch(err => {
          console.warn('⚠️  Failed to generate insights:', err.message);
          return null;
        }),
        getDestinationPhotos([optimizedTrip.destination.name]),
      ]);
      console.log(`✅ Generated insights: ${destinationInsights?.tagline || 'N/A'}`);
      const photo = photoMap.get(optimizedTrip.destination.name);

      // Step 4: Generate affiliate links
      const affiliateLinks = generateAffiliateLinks(
        {
          destination: {
            city: optimizedTrip.destination.name,
            country: optimizedTrip.destination.country,
            iataCode: optimizedTrip.destination.iata || optimizedTrip.destination.code,
          },
          slot: {
            startDate: optimizedTrip.dates.departure,
            endDate: optimizedTrip.dates.return,
          },
          flightOffer: {
            price: optimizedTrip.flight.totalCost,
          }
        },
        originCity
      );

      // Format result (without detailed itinerary - that's generated on save)
      const result = {
        destination: {
          city: optimizedTrip.destination.name,
          country: optimizedTrip.destination.country,
          iataCode: optimizedTrip.destination.iata || optimizedTrip.destination.code,
          photo: photo,
          tagline: destinationInsights?.tagline,
          matchReason: destinationInsights?.matchReason,
          seasonReason: destinationInsights?.seasonReason,
          highlights: destinationInsights?.highlights || [],
          // If flying to nearby airport, include that info
          nearestAirport: optimizedTrip.destination.nearestAirport,
        },
        slot: {
          startDate: optimizedTrip.dates.departure,
          endDate: optimizedTrip.dates.return,
          duration: optimizedTrip.dates.duration,
          season: getSeason(optimizedTrip.dates.departure)
        },
        pricing: {
          flight: optimizedTrip.budget.flight,
          hotel: optimizedTrip.budget.hotel,
          groundTransport: optimizedTrip.budget.groundTransport || 0,
          activities: optimizedTrip.budget.activities, // Estimated based on destination
          dailyActivities: optimizedTrip.budget.dailyActivities,
          total: optimizedTrip.budget.flight + optimizedTrip.budget.hotel + (optimizedTrip.budget.groundTransport || 0) + optimizedTrip.budget.activities,
          remaining: optimizedTrip.budget.remaining,
          currency: 'EUR'
        },
        // Ground transport info (if flying to nearby airport instead of destination)
        groundTransport: optimizedTrip.groundTransport,
        flightDetails: {
          outbound: {
            departureTime: optimizedTrip.flight.outbound.departureTime,
            arrivalTime: optimizedTrip.flight.outbound.arrivalTime,
            departureAirport: optimizedTrip.flight.outbound.departureAirport,
            arrivalAirport: optimizedTrip.flight.outbound.arrivalAirport,
            duration: typeof optimizedTrip.flight.outbound.duration === 'number'
              ? `${Math.floor(optimizedTrip.flight.outbound.duration / 60)}h${optimizedTrip.flight.outbound.duration % 60}m`
              : optimizedTrip.flight.outbound.duration || 'N/A',
            stops: optimizedTrip.flight.outbound.stops || 0,
            // Use actual segments from API if available, otherwise create single segment
            segments: optimizedTrip.flight.outbound.segments?.length > 0
              ? optimizedTrip.flight.outbound.segments.map(seg => ({
                  carrier: seg.airline || 'Airline',
                  carrierLogo: seg.airlineLogo,
                  departureTime: seg.departureTime,
                  arrivalTime: seg.arrivalTime,
                  origin: seg.departureAirport,
                  destination: seg.arrivalAirport,
                  duration: seg.duration ? `${Math.floor(seg.duration / 60)}h${seg.duration % 60}m` : null,
                  flightNumber: seg.flightNumber,
                }))
              : [{
                  carrier: optimizedTrip.flight.outbound.airline || 'Airline',
                  carrierLogo: optimizedTrip.flight.outbound.airlineLogo,
                  departureTime: optimizedTrip.flight.outbound.departureTime,
                  arrivalTime: optimizedTrip.flight.outbound.arrivalTime,
                  origin: optimizedTrip.flight.outbound.departureAirport,
                  destination: optimizedTrip.flight.outbound.arrivalAirport,
                }]
          },
          return: optimizedTrip.flight.return ? {
            departureTime: optimizedTrip.flight.return.departureTime,
            arrivalTime: optimizedTrip.flight.return.arrivalTime,
            departureAirport: optimizedTrip.flight.return.departureAirport,
            arrivalAirport: optimizedTrip.flight.return.arrivalAirport,
            duration: typeof optimizedTrip.flight.return.duration === 'number'
              ? `${Math.floor(optimizedTrip.flight.return.duration / 60)}h${optimizedTrip.flight.return.duration % 60}m`
              : optimizedTrip.flight.return.duration || 'N/A',
            stops: optimizedTrip.flight.return.stops || 0,
            segments: optimizedTrip.flight.return.segments?.length > 0
              ? optimizedTrip.flight.return.segments.map(seg => ({
                  carrier: seg.airline || 'Airline',
                  carrierLogo: seg.airlineLogo,
                  departureTime: seg.departureTime,
                  arrivalTime: seg.arrivalTime,
                  origin: seg.departureAirport,
                  destination: seg.arrivalAirport,
                  duration: seg.duration ? `${Math.floor(seg.duration / 60)}h${seg.duration % 60}m` : null,
                  flightNumber: seg.flightNumber,
                }))
              : [{
                  carrier: optimizedTrip.flight.return.airline || 'Airline',
                  carrierLogo: optimizedTrip.flight.return.airlineLogo,
                  departureTime: optimizedTrip.flight.return.departureTime,
                  arrivalTime: optimizedTrip.flight.return.arrivalTime,
                  origin: optimizedTrip.flight.return.departureAirport,
                  destination: optimizedTrip.flight.return.arrivalAirport,
                }]
          } : null,
          totalPrice: optimizedTrip.flight.totalCost,
          pricePerPerson: optimizedTrip.flight.totalCost,
          airline: optimizedTrip.flight.outbound.airline || 'Airline',
          cabinClass: 'ECONOMY',
          isEstimate: !optimizedTrip.flight.outbound.departureTime
        },
        hotelOptions: {
          destination: optimizedTrip.destination.name,
          checkIn: optimizedTrip.dates.departure,
          checkOut: optimizedTrip.dates.return,
          nights: optimizedTrip.hotel.totalNights,
          hotels: [{
            id: optimizedTrip.hotel.id,
            name: optimizedTrip.hotel.name,
            stars: optimizedTrip.hotel.stars,
            price: optimizedTrip.hotel.pricePerNight,
            totalPrice: optimizedTrip.hotel.totalPrice,
            location: optimizedTrip.hotel.location,
            amenities: optimizedTrip.hotel.amenities,
            rating: optimizedTrip.hotel.rating, // { value, count, word }
            mainPhoto: optimizedTrip.hotel.mainPhoto,
            checkInTime: optimizedTrip.hotel.checkInTime,
            checkOutTime: optimizedTrip.hotel.checkOutTime,
          }],
          averagePrice: optimizedTrip.hotel.pricePerNight
        },
        // Light summary - detailed itinerary generated on save
        tripSummary: {
          type: 'single-destination',
          cities: [optimizedTrip.destination.name],
          totalDays: optimizedTrip.dates.duration,
          highlights: [`Explore ${optimizedTrip.destination.name}`, 'Local experiences', 'Cultural immersion'],
        },
        links: affiliateLinks,
        // Include search context for itinerary personalization later
        searchContext: {
          travelVibeDescription: userProfile.basic?.travelVibeDescription || null,
          travelers: userProfile.basic?.travelers || 1,
          tripType: userProfile.basic?.tripType || null,
          activities: userProfile.basic?.activities || [],
          style: userProfile.basic?.style || null,
          personality: userProfile.onboardingPreferences?.personality || null,
          whyTravel: userProfile.onboardingPreferences?.whyTravel || null,
          mainGoal: userProfile.onboardingPreferences?.mainGoal || null,
          idealRhythm: userProfile.onboardingPreferences?.idealRhythm || null,
        }
      };

      console.log(`✅ Returning 1 complete trip recommendation for ${destination}`);

      return res.json({
        success: true,
        recommendations: [result],
        metadata: {
          scenario: 'WITH_DESTINATION',
          totalGenerated: 1,
          finalResults: 1,
          processingTime: new Date().toISOString(),
          usedAirScraper: true,
          usedOptimizedPrompt: true,
        }
      });

    } else {
      // ====================================================================
      // WITHOUT DESTINATION WORKFLOW - Discover destinations
      // ====================================================================
      console.log('🌍 WITHOUT DESTINATION workflow - Discovering destinations');

      const budgetPerPerson = userProfile.basic.budget;
      const travelersCount = userProfile.basic.travelers || 1;
      const budget = budgetPerPerson * travelersCount; // Budget is per-person from frontend → multiply for total
      userProfile.basic.budget = budget; // Update so Claude and downstream services see the effective total
      userProfile.basic.budgetPerPerson = budgetPerPerson; // Keep per-person for reference
      console.log(`   💰 Budget: €${budgetPerPerson}/person × ${travelersCount} = €${budget} total`);
      const duration = userProfile.availability?.duration || 7;

      // CHECK: Should we propose a roadtrip?
      const shouldRoadtrip = userPreferences ?
        roadtripService.shouldProposeRoadtrip(userPreferences, { budget, duration }) :
        false;

      if (shouldRoadtrip) {
        console.log('🗺️  ROADTRIP MODE DETECTED - Generating multi-city itinerary');

        // ====================================================================
        // ROADTRIP WORKFLOW - Multi-city/multi-country journey
        // ====================================================================

        try {
          // Generate complete roadtrip with transport, hotels, and activities
          // Use optimal date or default to 2 months from now
          const defaultDepartureDate = new Date();
          defaultDepartureDate.setMonth(defaultDepartureDate.getMonth() + 2);

          const roadtrip = await roadtripService.generateRoadtrip({
            userProfile: userPreferences,
            origin: originCity,
            budget,
            duration,
            departureDate: userProfile.availability?.startDate || defaultDepartureDate.toISOString().split('T')[0]
          });

          console.log(`✅ Roadtrip generated: ${roadtrip.cities.length} cities, €${roadtrip.budget.totalCost}`);

          // Generate detailed narrative for roadtrip card
          const enrichedRoadtrip = await generateRoadtripNarrative(roadtrip, userPreferences);

          console.log('✅ Roadtrip narrative generated');

          // Get photos for all cities
          const photoMap = await getDestinationPhotos(roadtrip.cities.map(c => c.name));

          // Format roadtrip result (different structure from single-city)
          const roadtripResult = {
            type: 'roadtrip',
            title: enrichedRoadtrip.narrative.title,
            tagline: enrichedRoadtrip.narrative.tagline,
            overview: enrichedRoadtrip.narrative.overview,
            cities: roadtrip.cities.map(city => ({
              name: city.name,
              country: city.country,
              nights: city.nights,
              arrivalDate: city.arrivalDate,
              departureDate: city.departureDate,
              photo: photoMap.get(city.name),
              hotel: city.hotel ? {
                name: city.hotel.name,
                stars: city.hotel.stars,
                rating: city.hotel.rating,
                pricePerNight: Math.round(city.hotel.price.amount / city.nights),
                totalPrice: city.hotel.price.amount,
                photos: city.hotel.photos
              } : null,
              topAttractions: city.attractions.slice(0, 3).map(a => ({
                name: a.name,
                description: a.description,
                rating: a.rating,
                price: a.price
              }))
            })),
            transport: {
              modes: roadtrip.acceptedTransportModes,
              plan: roadtrip.transport,
              narrative: enrichedRoadtrip.narrative.transportNarrative
            },
            pricing: {
              total: roadtrip.budget.total,
              transport: roadtrip.budget.transport,
              hotels: roadtrip.budget.hotels,
              activities: roadtrip.budget.activities,
              totalCost: roadtrip.budget.totalCost,
              currency: 'EUR'
            },
            narrative: {
              dayByDayHighlights: enrichedRoadtrip.narrative.dayByDayHighlights,
              perfectFor: enrichedRoadtrip.narrative.perfectFor,
              budgetExplanation: enrichedRoadtrip.narrative.budgetExplanation,
              practicalTips: enrichedRoadtrip.narrative.practicalTips,
              bestTimeToGo: enrichedRoadtrip.narrative.bestTimeToGo,
              hiddenGems: enrichedRoadtrip.narrative.hiddenGems
            },
            score: {
              total: roadtrip.isAffordable ? 95 : 70,
              breakdown: {
                aiMatch: 95,
                price: roadtrip.isAffordable ? 90 : 60,
                originality: 98, // Roadtrips are unique!
                availability: 85
              }
            },
            duration: roadtrip.duration,
            origin: roadtrip.origin
          };

          console.log('✅ Returning roadtrip recommendation');

          return res.json({
            success: true,
            recommendations: [roadtripResult],
            metadata: {
              scenario: 'ROADTRIP',
              totalGenerated: 1,
              finalResults: 1,
              processingTime: new Date().toISOString(),
              usedBookingAPI: true,
              roadtripMode: true
            }
          });

        } catch (error) {
          console.error('❌ Roadtrip generation failed:', error.message);
          console.warn('⚠️  Falling back to standard destination discovery');
          // Fall through to standard destination discovery
        }
      }

      // ====================================================================
      // STANDARD DESTINATION DISCOVERY (3 single-city recommendations)
      // ====================================================================

      // Step 1: Discover top destinations with Booking.com
      console.log('🔍 Step 1: Discovering destinations with Booking.com...');
      const topDestinations = await destinationService.discoverDestinations({
        userProfile,
        budget,
        origin: originCity,
        duration,
        departureDate: userProfile.availability?.startDate,
        userId: req.user.id // For diversity tracking (avoids recently suggested cities)
      });

      console.log(`✅ Discovered ${topDestinations.length} destinations`);

      // Extract trip context for hotel scoring (same as WITH_DESTINATION)
      const tripContextWithout = userProfile.basic?.travelVibeDescription || null;
      if (tripContextWithout) {
        console.log(`   🎯 Trip context for hotel selection: "${tripContextWithout.substring(0, 80)}..."`);
      }

      // Step 2: Optimize top 3 destinations in PARALLEL
      console.log('⚡ Step 2: Optimizing top 3 destinations in parallel...');

      // Check if user wants fixed dates (no flexibility)
      const isFixedDateWithout = userProfile.availability?.departureFlexibility === 'fixed' ||
                                  userProfile.availability?.flexibleDates === false;

      const optimizedTrips = await Promise.all(
        topDestinations.slice(0, 3).map(dest =>
          destinationService.optimizeDestination({
            destination: dest.name,
            userProfile,
            budget,
            origin: originCity,
            duration,
            departureDate: userProfile.availability?.startDate,
            tripContext: tripContextWithout, // NEW: Pass user's free text for context-aware hotel selection
            isFixedDate: isFixedDateWithout, // Respect fixed dates if specified
          }).catch(error => {
            console.warn(`⚠️  Failed to optimize ${dest.name}:`, error.message);
            return null;
          })
        )
      );

      // Filter out failures
      const validTrips = optimizedTrips.filter(t => t !== null);
      console.log(`✅ Successfully optimized ${validTrips.length} trips`);

      if (validTrips.length === 0) {
        throw new Error('Could not optimize any destinations. Please try again with different criteria.');
      }

      // Step 3: Generate recommendations with Claude + Fetch photos (PARALLEL)
      console.log('🤖 Step 3: Generating recommendations + fetching photos (parallel)...');
      const userName = req.user.firstName
        ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
        : req.user.email;

      // Run Claude recommendations AND photo fetching in parallel
      const [recommendations, photoMap] = await Promise.all([
        // Claude recommendations for all trips in parallel
        Promise.all(
          validTrips.map((trip, idx) =>
            generateDestinationRecommendationWithData(
              {
                userProfile,
                ...trip,
                alternativeDestinations: validTrips
                  .filter((_, i) => i !== idx)
                  .map(t => t.destination.name)
              },
              req.user.id,
              userName
            ).catch(error => {
              console.warn(`⚠️  Failed to generate recommendation for ${trip.destination.name}:`, error.message);
              return null;
            })
          )
        ),
        // Photos fetched in parallel with Claude
        getDestinationPhotos(validTrips.map(t => t.destination.name))
      ]);

      console.log(`✅ Generated ${recommendations.filter(r => r).length} recommendations + ${photoMap.size} photos`);

      // Step 4: Combine and format results
      const results = validTrips.map((trip, idx) => {
        const recommendation = recommendations[idx];
        const photo = photoMap.get(trip.destination.name);
        const score = calculateScoreFromTrip(trip, budget);

        const affiliateLinks = generateAffiliateLinks(
          {
            destination: {
              city: trip.destination.name,
              iataCode: trip.destination.iata,
            },
            slot: {
              startDate: trip.dates.departure,
              endDate: trip.dates.return,
            },
            flightOffer: {
              price: trip.flight.totalCost,
            }
          },
          originCity
        );

        return {
          destination: {
            city: trip.destination.name,
            country: trip.destination.country || trip.destination.name,
            iataCode: trip.destination.iata,
            photo: photo,
            matchReason: recommendation?.matchReason || recommendation?.tagline || `Perfect for ${userProfile.basic?.activities?.join(', ') || 'your interests'}`,
            seasonReason: recommendation?.seasonReason || `Great time to visit ${trip.destination.name}`
          },
          slot: {
            startDate: trip.dates.departure,
            endDate: trip.dates.return,
            duration: trip.dates.duration,
            season: getSeason(trip.dates.departure)
          },
          pricing: {
            flight: trip.budget.flight,
            hotel: trip.budget.hotel,
            activities: trip.budget.remaining,
            total: trip.budget.total,
            remaining: trip.budget.remaining,
            currency: 'EUR'
          },
          flightDetails: trip.flight?.outbound ? {
            outbound: {
              departureTime: trip.flight.outbound.departureTime,
              arrivalTime: trip.flight.outbound.arrivalTime,
              departureAirport: trip.flight.outbound.departureAirport,
              arrivalAirport: trip.flight.outbound.arrivalAirport,
              duration: typeof trip.flight.outbound.duration === 'number'
                ? `${Math.floor(trip.flight.outbound.duration / 60)}h${trip.flight.outbound.duration % 60}m`
                : trip.flight.outbound.duration || 'N/A',
              stops: trip.flight.outbound.stops || 0,
              // Use actual segments from API for multi-leg flights
              segments: trip.flight.outbound.segments?.length > 0
                ? trip.flight.outbound.segments.map(seg => ({
                    carrier: seg.airline || 'Airline',
                    carrierLogo: seg.airlineLogo,
                    departureTime: seg.departureTime,
                    arrivalTime: seg.arrivalTime,
                    origin: seg.departureAirport,
                    destination: seg.arrivalAirport,
                    duration: seg.duration,
                    flightNumber: seg.flightNumber,
                  }))
                : [{
                    carrier: trip.flight.outbound.airline || 'Airline',
                    carrierLogo: trip.flight.outbound.airlineLogo,
                    departureTime: trip.flight.outbound.departureTime,
                    arrivalTime: trip.flight.outbound.arrivalTime,
                    origin: trip.flight.outbound.departureAirport || originCity,
                    destination: trip.flight.outbound.arrivalAirport || trip.destination.iata,
                  }]
            },
            return: trip.flight.return ? {
              departureTime: trip.flight.return.departureTime,
              arrivalTime: trip.flight.return.arrivalTime,
              departureAirport: trip.flight.return.departureAirport,
              arrivalAirport: trip.flight.return.arrivalAirport,
              duration: typeof trip.flight.return.duration === 'number'
                ? `${Math.floor(trip.flight.return.duration / 60)}h${trip.flight.return.duration % 60}m`
                : trip.flight.return.duration || 'N/A',
              stops: trip.flight.return.stops || 0,
              // Use actual segments from API for multi-leg flights
              segments: trip.flight.return.segments?.length > 0
                ? trip.flight.return.segments.map(seg => ({
                    carrier: seg.airline || 'Airline',
                    carrierLogo: seg.airlineLogo,
                    departureTime: seg.departureTime,
                    arrivalTime: seg.arrivalTime,
                    origin: seg.departureAirport,
                    destination: seg.arrivalAirport,
                    duration: seg.duration,
                    flightNumber: seg.flightNumber,
                  }))
                : [{
                    carrier: trip.flight.return.airline || 'Airline',
                    carrierLogo: trip.flight.return.airlineLogo,
                    departureTime: trip.flight.return.departureTime,
                    arrivalTime: trip.flight.return.arrivalTime,
                    origin: trip.flight.return.departureAirport || trip.destination.iata,
                    destination: trip.flight.return.arrivalAirport || originCity,
                  }]
            } : null,
            totalPrice: trip.flight.totalCost || trip.budget.flight,
            pricePerPerson: trip.flight.totalCost || trip.budget.flight,
            // Collect all unique airlines from outbound segments
            airlines: [...new Set([
              ...(trip.flight.outbound.segments?.map(s => s.airline) || [trip.flight.outbound.airline]),
            ].filter(Boolean))],
            // Collect all unique airlines from return segments
            returnAirlines: trip.flight.return ? [...new Set([
              ...(trip.flight.return.segments?.map(s => s.airline) || [trip.flight.return.airline]),
            ].filter(Boolean))] : [],
            airline: trip.flight.outbound.airline || 'Airline', // Keep for backwards compat
            cabinClass: 'ECONOMY',
            isEstimate: !trip.flight.outbound.departureTime
          } : null,
          hotelOptions: trip.hotel?.name ? {
            destination: trip.destination.name,
            checkIn: trip.dates.departure,
            checkOut: trip.dates.return,
            nights: trip.hotel.totalNights || (trip.dates.duration ? trip.dates.duration - 1 : 3),
            hotels: [{
              id: trip.hotel.id,
              name: trip.hotel.name,
              stars: trip.hotel.stars || 0,
              price: trip.hotel.pricePerNight || Math.round(trip.budget.hotel / Math.max(1, (trip.dates.duration || 4) - 1)),
              pricePerNight: trip.hotel.pricePerNight || Math.round(trip.budget.hotel / Math.max(1, (trip.dates.duration || 4) - 1)),
              totalPrice: trip.hotel.totalPrice,
              location: trip.hotel.location || trip.destination.name,
              amenities: trip.hotel.amenities || [],
              rating: trip.hotel.rating, // { value, count, word }
              mainPhoto: trip.hotel.mainPhoto,
              checkInTime: trip.hotel.checkInTime,
              checkOutTime: trip.hotel.checkOutTime,
            }],
            averagePrice: trip.hotel.pricePerNight || Math.round(trip.budget.hotel / Math.max(1, (trip.dates.duration || 4) - 1))
          } : null,
          recommendation: recommendation,
          score: score,
          links: affiliateLinks,
          // Include search context for itinerary personalization later
          searchContext: {
            travelVibeDescription: userProfile.basic?.travelVibeDescription || null,
            travelers: userProfile.basic?.travelers || 1,
            tripType: userProfile.basic?.tripType || null,
            activities: userProfile.basic?.activities || [],
            style: userProfile.basic?.style || null,
            personality: userProfile.onboardingPreferences?.personality || null,
            whyTravel: userProfile.onboardingPreferences?.whyTravel || null,
            mainGoal: userProfile.onboardingPreferences?.mainGoal || null,
            idealRhythm: userProfile.onboardingPreferences?.idealRhythm || null,
          }
        };
      });

      // Sort by score
      results.sort((a, b) => b.score.total - a.score.total);

      // Log hotel data for debugging
      results.forEach((r, idx) => {
        const hotel = r.hotelOptions?.hotels?.[0];
        console.log(`📊 Hotel ${idx + 1} (${r.destination.city}): ${hotel?.name || 'N/A'} | rating: ${hotel?.rating?.value || 'N/A'} | photo: ${hotel?.mainPhoto ? 'YES' : 'NO'}`);
      });

      // Track algorithm results for diversity analysis
      try {
        await prisma.algorithmResult.create({
          data: {
            userId: req.user?.id,
            claudeDestinations: topDestinations.map(d => d.name),
            finalDestinations: results.map(r => r.destination.city),
            userProfile: {
              activities: userProfile.basic?.activities,
              style: userProfile.basic?.style,
              personality: userProfile.onboardingPreferences?.personality,
              topActivities: userProfile.onboardingPreferences?.topActivities,
              globalStyle: userProfile.onboardingPreferences?.globalStyle,
            },
            scenario: 'WITHOUT_DESTINATION',
            origin: originCity,
            budget: budget,
            duration: duration,
          }
        });
        console.log('📈 Algorithm result tracked for diversity analysis');
      } catch (trackError) {
        console.warn('⚠️  Failed to track algorithm result:', trackError.message);
      }

      console.log(`✅ Returning ${results.length} diverse trip recommendations`);

      return res.json({
        success: true,
        recommendations: results,
        metadata: {
          scenario: 'WITHOUT_DESTINATION',
          totalGenerated: topDestinations.length,
          optimized: validTrips.length,
          finalResults: results.length,
          processingTime: new Date().toISOString(),
          usedAirScraper: true,
          usedOptimizedPrompt: true,
          parallelProcessing: true,
        }
      });
    }

  } catch (error) {
    console.error('❌ Error in recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations. Please try again.',
    });
  }
});

// Test endpoint to verify APIs are working
router.get('/test', async (req, res) => {
  res.json({
    message: 'Travel API is working',
    endpoints: {
      recommendations: 'POST /api/travel/recommendations',
      streamingRecommendations: 'POST /api/travel/recommendations/stream'
    }
  });
});

// Endpoint to analyze destination diversity (auth required)
router.get('/algorithm-stats', authenticateUser, async (req, res) => {
  try {
    const results = await prisma.algorithmResult.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Count destination frequency
    const claudeFrequency = {};
    const finalFrequency = {};

    results.forEach(r => {
      r.claudeDestinations.forEach(d => {
        claudeFrequency[d] = (claudeFrequency[d] || 0) + 1;
      });
      r.finalDestinations.forEach(d => {
        finalFrequency[d] = (finalFrequency[d] || 0) + 1;
      });
    });

    // Sort by frequency
    const sortedClaude = Object.entries(claudeFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    const sortedFinal = Object.entries(finalFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    res.json({
      success: true,
      totalSearches: results.length,
      claudeTopDestinations: sortedClaude.map(([city, count]) => ({
        city,
        count,
        percentage: Math.round((count / results.length) * 100)
      })),
      finalTopDestinations: sortedFinal.map(([city, count]) => ({
        city,
        count,
        percentage: Math.round((count / results.length) * 100)
      })),
      recentSearches: results.slice(0, 10).map(r => ({
        date: r.createdAt,
        claude: r.claudeDestinations,
        final: r.finalDestinations,
        profile: r.userProfile
      }))
    });
  } catch (error) {
    console.error('Error fetching algorithm stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * STREAMING RECOMMENDATIONS ENDPOINT
 * Uses Server-Sent Events (SSE) to stream results progressively
 * Benefits: User sees first result in ~5s instead of waiting 15s for all
 */
router.post('/recommendations/stream',
  strictLimiter,
  authenticateUser,
  userStrictLimiter,
  checkLimit('maxSearchesPerMonth', 'searchesThisMonth'),
  incrementUsage('searchesThisMonth'),
  async (req, res) => {
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
      const userProfile = req.body;

      // Send initial status
      sendEvent('status', { stage: 'starting', message: 'Initializing search...' });

      // Fetch user preferences
      const userPreferences = await prisma.userPreferences.findUnique({
        where: { userId: req.user.id },
      });

      if (userPreferences) {
        userProfile.onboardingPreferences = userPreferences;
      }

      const originCity = (userPreferences?.preferredAirports?.[0]) || userProfile.availability?.originCity || 'Paris';
      const budget = userProfile.basic.budget;
      const duration = userProfile.availability?.duration || 7;

      // Only handle WITHOUT_DESTINATION scenario for streaming
      const scenario = detectScenario(userProfile);
      if (scenario === 'WITH_DESTINATION') {
        sendEvent('error', { message: 'Streaming not available for specific destination searches' });
        res.end();
        return;
      }

      // Step 1: Discover destinations
      sendEvent('status', { stage: 'discovering', message: 'Finding perfect destinations...' });

      const discoveryResult = await destinationService.discoverDestinations({
        userProfile,
        budget,
        origin: originCity,
        duration,
        departureDate: userProfile.availability?.startDate,
        userId: req.user.id
      });

      // Handle budget exceeded case (returns object with alternatives)
      let topDestinations;
      if (discoveryResult.budgetWarning) {
        console.log('⚠️ Budget exceeded - sending alternatives to client');
        sendEvent('budget_warning', {
          message: discoveryResult.budgetWarning.message,
          suggestions: discoveryResult.budgetWarning.suggestions,
          flightOptions: discoveryResult.flightOptions?.map(d => ({
            name: d.name,
            price: d.price.amount,
            priceDifference: d.priceDifference,
            budgetAdvice: d.budgetAdvice
          })),
          trainAlternatives: discoveryResult.alternatives?.map(a => ({
            name: a.name,
            country: a.country,
            transport: a.transport,
            duration: a.duration,
            price: a.totalTransportCost,
            operator: a.operator,
            hasBeach: a.hasBeach,
            message: a.message
          }))
        });

        // Still process the over-budget flights but mark them
        topDestinations = discoveryResult.flightOptions || [];
      } else {
        topDestinations = Array.isArray(discoveryResult) ? discoveryResult : [];
      }

      sendEvent('status', {
        stage: 'discovered',
        message: `Found ${topDestinations.length} destinations`,
        destinations: topDestinations.slice(0, 3).map(d => d.name)
      });

      // Step 2: Process each destination and stream results as they complete
      const userName = req.user.firstName
        ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
        : req.user.email;

      const destinationsToProcess = topDestinations.slice(0, 3);
      let completedCount = 0;

      // Extract trip context for streaming (same as non-streaming)
      const tripContextStreaming = userProfile.basic?.travelVibeDescription || null;

      // Check if user wants fixed dates (no flexibility)
      const isFixedDateStreaming = userProfile.availability?.departureFlexibility === 'fixed' ||
                                    userProfile.availability?.flexibleDates === false;

      // Process destinations in parallel but stream results as they complete
      await Promise.all(
        destinationsToProcess.map(async (dest, idx) => {
          try {
            // Optimize trip
            const trip = await destinationService.optimizeDestination({
              destination: dest.name,
              userProfile,
              budget,
              origin: originCity,
              duration,
              departureDate: userProfile.availability?.startDate,
              tripContext: tripContextStreaming, // NEW: Pass trip context for context-aware hotel selection
              isFixedDate: isFixedDateStreaming, // Respect fixed dates if specified
            });

            if (!trip) return;

            // Generate recommendation and get photo in parallel
            const [recommendation, photoResult] = await Promise.all([
              generateDestinationRecommendationWithData(
                {
                  userProfile,
                  ...trip,
                  alternativeDestinations: destinationsToProcess
                    .filter((_, i) => i !== idx)
                    .map(d => d.name)
                },
                req.user.id,
                userName
              ).catch(() => null),
              getPexelsPhoto(trip.destination.name).catch(() => null)
            ]);

            // Calculate score
            const score = calculateScoreFromTrip(trip, budget);

            // Generate affiliate links
            const affiliateLinks = generateAffiliateLinks(
              {
                destination: {
                  city: trip.destination.name,
                  iataCode: trip.destination.iata,
                },
                slot: {
                  startDate: trip.dates.departure,
                  endDate: trip.dates.return,
                },
                flightOffer: {
                  price: trip.flight.totalCost,
                }
              },
              originCity
            );

            // Calculate activities cost from Claude's recommendations (with prices)
            const nights = trip.hotel.totalNights || (trip.dates.duration ? trip.dates.duration - 1 : 3);

            // Parse activities from recommendation (new format with prices)
            const activities = recommendation?.activities || [];
            const activitiesWithPrices = activities.map(act => ({
              name: typeof act === 'string' ? act : act.name,
              price: typeof act === 'object' ? (act.price || 0) : 0,
              type: typeof act === 'object' ? act.type : 'activity'
            }));

            // Calculate total from actual activity prices, fallback to 25€/day estimate
            const estimatedActivitiesCost = activitiesWithPrices.length > 0
              ? activitiesWithPrices.reduce((sum, act) => sum + (act.price || 0), 0)
              : Math.round(25 * trip.dates.duration);

            const actualTotal = trip.budget.flight + trip.budget.hotel + estimatedActivitiesCost;
            const actualRemaining = budget - actualTotal;

            // Build result with all data properly mapped
            const result = {
              destination: {
                city: trip.destination.name,
                country: trip.destination.country || recommendation?.destinationName || trip.destination.name,
                iataCode: trip.destination.iata,
                photo: photoResult,
                tagline: recommendation?.tagline,
                matchReason: recommendation?.matchReason || `Perfect for ${userProfile.basic.activities?.join(', ') || 'your interests'}`,
                seasonReason: recommendation?.seasonReason,
                // Support both old format (highlights array of strings) and new format (activities with prices)
                highlights: activitiesWithPrices.length > 0
                  ? activitiesWithPrices.map(a => a.name)
                  : (recommendation?.highlights || []),
                activities: activitiesWithPrices // Full activity data with prices
              },
              slot: {
                startDate: trip.dates.departure,
                endDate: trip.dates.return,
                duration: trip.dates.duration,
                season: getSeason(trip.dates.departure)
              },
              pricing: {
                flight: trip.budget.flight,
                hotel: trip.budget.hotel,
                activities: estimatedActivitiesCost,
                total: actualTotal,
                remaining: actualRemaining,
                currency: 'EUR'
              },
              flightDetails: {
                outbound: {
                  departureTime: trip.flight.outbound.departureTime,
                  arrivalTime: trip.flight.outbound.arrivalTime,
                  departureAirport: trip.flight.outbound.departureAirport,
                  arrivalAirport: trip.flight.outbound.arrivalAirport,
                  duration: typeof trip.flight.outbound.duration === 'number'
                    ? `${Math.floor(trip.flight.outbound.duration / 60)}h${trip.flight.outbound.duration % 60}m`
                    : trip.flight.outbound.duration || 'N/A',
                  stops: trip.flight.outbound.stops || 0,
                  // Full segments with all details
                  segments: trip.flight.outbound.segments?.length > 0
                    ? trip.flight.outbound.segments.map(seg => ({
                        carrier: seg.airline || 'Airline',
                        carrierLogo: seg.airlineLogo,
                        departureTime: seg.departureTime,
                        arrivalTime: seg.arrivalTime,
                        origin: seg.departureAirport,
                        destination: seg.arrivalAirport,
                        duration: seg.duration,
                        flightNumber: seg.flightNumber,
                      }))
                    : [{
                        carrier: trip.flight.outbound.airline || 'Airline',
                        carrierLogo: trip.flight.outbound.airlineLogo,
                        departureTime: trip.flight.outbound.departureTime,
                        arrivalTime: trip.flight.outbound.arrivalTime,
                        origin: trip.flight.outbound.departureAirport,
                        destination: trip.flight.outbound.arrivalAirport,
                      }]
                },
                return: trip.flight.return ? {
                  departureTime: trip.flight.return.departureTime,
                  arrivalTime: trip.flight.return.arrivalTime,
                  departureAirport: trip.flight.return.departureAirport,
                  arrivalAirport: trip.flight.return.arrivalAirport,
                  duration: typeof trip.flight.return.duration === 'number'
                    ? `${Math.floor(trip.flight.return.duration / 60)}h${trip.flight.return.duration % 60}m`
                    : trip.flight.return.duration || 'N/A',
                  stops: trip.flight.return.stops || 0,
                  segments: trip.flight.return.segments?.length > 0
                    ? trip.flight.return.segments.map(seg => ({
                        carrier: seg.airline || 'Airline',
                        carrierLogo: seg.airlineLogo,
                        departureTime: seg.departureTime,
                        arrivalTime: seg.arrivalTime,
                        origin: seg.departureAirport,
                        destination: seg.arrivalAirport,
                        duration: seg.duration,
                        flightNumber: seg.flightNumber,
                      }))
                    : [{
                        carrier: trip.flight.return.airline || 'Airline',
                        carrierLogo: trip.flight.return.airlineLogo,
                        departureTime: trip.flight.return.departureTime,
                        arrivalTime: trip.flight.return.arrivalTime,
                        origin: trip.flight.return.departureAirport,
                        destination: trip.flight.return.arrivalAirport,
                      }]
                } : null,
                totalPrice: trip.flight.totalCost,
                airline: trip.flight.outbound.airline || 'Airline',
                cabinClass: 'ECONOMY',
                isEstimate: !trip.flight.outbound.departureTime
              },
              hotelOptions: {
                destination: trip.destination.name,
                checkIn: trip.dates.departure,
                checkOut: trip.dates.return,
                nights: nights,
                hotels: [{
                  id: trip.hotel.id,
                  name: trip.hotel.name || 'Hotel',
                  stars: trip.hotel.stars || 0,
                  price: trip.hotel.pricePerNight || Math.round(trip.budget.hotel / Math.max(1, nights)),
                  pricePerNight: trip.hotel.pricePerNight || Math.round(trip.budget.hotel / Math.max(1, nights)),
                  totalPrice: trip.hotel.totalPrice,
                  location: trip.hotel.location || trip.destination.name,
                  amenities: trip.hotel.amenities || [],
                  rating: trip.hotel.rating, // { value, count, word }
                  mainPhoto: trip.hotel.mainPhoto,
                  checkInTime: trip.hotel.checkInTime,
                  checkOutTime: trip.hotel.checkOutTime,
                }],
                averagePrice: trip.hotel.pricePerNight || Math.round(trip.budget.hotel / Math.max(1, nights))
              },
              recommendation: recommendation,
              score: score,
              links: affiliateLinks,
              // Include search context for itinerary personalization later
              searchContext: {
                travelVibeDescription: userProfile.basic?.travelVibeDescription || null,
                travelers: userProfile.basic?.travelers || 1,
                tripType: userProfile.basic?.tripType || null,
                activities: userProfile.basic?.activities || [],
                style: userProfile.basic?.style || null,
                personality: userProfile.onboardingPreferences?.personality || null,
                whyTravel: userProfile.onboardingPreferences?.whyTravel || null,
                mainGoal: userProfile.onboardingPreferences?.mainGoal || null,
                idealRhythm: userProfile.onboardingPreferences?.idealRhythm || null,
              }
            };

            completedCount++;

            // Stream this result immediately
            sendEvent('recommendation', {
              index: completedCount,
              total: destinationsToProcess.length,
              data: result
            });

          } catch (error) {
            console.warn(`⚠️  Streaming: Failed to process ${dest.name}:`, error.message);
            sendEvent('warning', { destination: dest.name, error: 'Failed to process destination' });
          }
        })
      );

      // Send completion event
      sendEvent('complete', {
        totalResults: completedCount,
        processingTime: new Date().toISOString()
      });

      res.end();

    } catch (error) {
      console.error('Streaming error:', error);
      sendEvent('error', { message: 'Failed to generate recommendations. Please try again.' });
      res.end();
    }
  }
);

export default router;
