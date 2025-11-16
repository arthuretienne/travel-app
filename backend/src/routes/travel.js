// backend/src/routes/travel.js
import express from 'express';
import { generateDestinations } from '../services/claudeService.js';
import { preScreenDestinations, searchFlightOffers, estimateHotelCost } from '../services/amadeusService.js';
import { generateAffiliateLinks } from '../services/affiliateService.js';
import { calculateFinalScore } from '../utils/scoring.js';
import { getDestinationPhotos } from '../services/unsplashService.js';
import { authenticateUser } from '../middleware/auth.js';
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
router.post('/recommendations', authenticateUser, async (req, res) => {
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

    // Step 1: Claude generates 10 destinations
    console.log('🤖 Step 1: Generating destinations with Claude...');
    const destinations = await generateDestinations(userProfile);
    console.log(`✅ Generated ${destinations.length} destinations`);

    // Step 2: Pre-screen with Amadeus Flight Inspiration
    console.log('✈️  Step 2: Pre-screening with Amadeus...');
    // Use preferred airport from onboarding preferences, or fallback to availability.originCity, or CDG default
    const originCity = (userPreferences?.preferredAirports?.[0]) || userProfile.availability.originCity || 'CDG';
    console.log(`✈️  Using origin airport: ${originCity}`);
    const preScreened = await preScreenDestinations(
      destinations,
      originCity,
      userProfile.basic.budget
    );
    console.log(`✅ Pre-screened to ${preScreened.length} destinations`);

    // Step 3: Get photos for top destinations
    console.log('📸 Step 3: Fetching destination photos...');
    const photoMap = await getDestinationPhotos(preScreened.slice(0, 5));
    console.log(`✅ Fetched ${photoMap.size} photos`);

    // Step 4: Detailed search for top 3
    console.log('🔎 Step 4: Searching detailed flights for top 3...');
    const topThree = preScreened.slice(0, 3);
    
   const results = await Promise.all(
  topThree.map(async (destination) => {
    // Use AI-generated dates instead of user slots
    const slot = {
      startDate: destination.startDate,
      endDate: destination.endDate,
      duration: Math.ceil((new Date(destination.endDate) - new Date(destination.startDate)) / (1000 * 60 * 60 * 24)) + 1,
      season: getSeason(destination.startDate)
    };
        // Get flight offers
        const flightOffer = await searchFlightOffers(destination, slot, originCity);
        
        if (!flightOffer) {
          console.log(`⚠️  No flights found for ${destination.city}`);
          return null;
        }

        // Estimate hotel cost
        const hotelCost = estimateHotelCost(destination, slot, userProfile.basic.style);
        
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
            outbound: flightOffer.segments[0],
            duration: flightOffer.totalDuration,
            airline: flightOffer.validatingAirline
          },
          score: score,
          links: affiliateLinks
        };
      })
    );

    // Filter out nulls and sort by score
    const validResults = results
      .filter(r => r !== null)
      .sort((a, b) => b.score.total - a.score.total);

    console.log(`✅ Returning ${validResults.length} recommendations`);

    res.json({
      success: true,
      recommendations: validResults,
      metadata: {
        totalGenerated: destinations.length,
        preScreened: preScreened.length,
        finalResults: validResults.length,
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