// backend/src/services/claudeService.js
import Anthropic from '@anthropic-ai/sdk';
import { logger } from './logger.js';
import * as cache from '../utils/cache.js';
import prisma from '../db/prisma.js';

// NOTE: dotenv est déjà chargé dans server.js
// Les variables d'environnement sont disponibles via process.env

console.log('Checking Claude API Key:', process.env.ANTHROPIC_API_KEY ? 'API key is set' : 'API key is missing');

let client;
try {
  client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
} catch (error) {
  console.error('Failed to initialize Claude client:', error);
  // Client will be undefined, but server should still start
}

export async function generateDestinations(userProfile, userId = null, userName = null, originCity = 'CDG') {
  if (!client) {
    throw new Error('Claude client not initialized. Please check ANTHROPIC_API_KEY environment variable.');
  }

  const startTime = Date.now();
  const prompt = buildPrompt(userProfile, originCity);

  // Log user profile being used
  logger.logUserAction({
    userId: userId || userProfile.userId || 'unknown',
    userName: userName || userProfile.userName || 'Unknown User',
    action: 'Generate AI Destinations',
    details: {
      budget: userProfile.basic?.budget,
      style: userProfile.basic?.style,
      activities: userProfile.basic?.activities,
      timeHorizon: userProfile.availability?.timeHorizon,
      hasOnboardingPrefs: !!userProfile.onboardingPreferences,
    }
  });

  try {
    logger.logClaudeAPI({
      operation: 'Generate Destinations - Request',
      input: prompt,
      tokensUsed: null,
      duration: null,
    });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      temperature: 1.0, // Increased for maximum creativity and diversity
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const duration = Date.now() - startTime;
    const response = message.content[0].text;

    logger.logClaudeAPI({
      operation: 'Generate Destinations - Response',
      input: null,
      output: response,
      tokensUsed: {
        input: message.usage?.input_tokens,
        output: message.usage?.output_tokens,
        total: message.usage?.input_tokens + message.usage?.output_tokens,
      },
      duration,
    });

    const destinations = parseDestinations(response);

    logger.logRecommendation({
      step: 'Destinations Generated',
      tripId: userProfile.tripId || 'N/A',
      groupPreferences: {
        memberCount: 1,
        budget: {
          min: userProfile.basic?.budget || 0,
          max: userProfile.basic?.budget || 0,
          average: userProfile.basic?.budget || 0,
        },
        climate: userProfile.preferences?.climate ? [userProfile.preferences.climate] : [],
        activities: userProfile.basic?.activities || [],
        availability: {
          recommendedDuration: userProfile.availability?.duration || 7,
          minAvailableLeaveDays: null,
          departureFlexibility: userProfile.availability?.departureFlexibility,
          preferredMonths: userProfile.availability?.preferredMonths || [],
        },
        dietaryRestrictions: [],
        accessibility: userProfile.onboardingPreferences?.mobilityNeeds ? [userProfile.onboardingPreferences.mobilityNeeds] : [],
      },
      aiPrompt: prompt,
      aiResponse: response,
      destinations,
      duration,
    });

    return destinations;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Claude API Error:', error);

    logger.logClaudeAPI({
      operation: 'Generate Destinations - Error',
      input: prompt,
      output: null,
      error: error.message || error,
      tokensUsed: null,
      duration,
    });

    throw new Error(`Claude generation failed: ${error.message}`);
  }
}

function buildPrompt(profile, originCity = 'CDG') {
  const { basic, preferences, constraints, availability, onboardingPreferences } = profile;

  // Extract the free text field (travelVibeDescription) - THIS IS THE MOST IMPORTANT USER INPUT
  const userFreeText = basic?.travelVibeDescription || '';

  // Determine origin city name from IATA code for better readability
  const originCityMap = {
    'CDG': 'Paris', 'ORY': 'Paris', 'BVA': 'Paris',
    'LYS': 'Lyon', 'MRS': 'Marseille', 'NCE': 'Nice',
    'TLS': 'Toulouse', 'BOD': 'Bordeaux', 'NTE': 'Nantes',
    'BSL': 'Basel/Mulhouse', 'LIL': 'Lille', 'MPL': 'Montpellier'
  };
  const originCityName = originCityMap[originCity] || originCity;
  
  // Calculate time horizon dates
  const today = new Date();
  const monthsMap = {
    '3-mois': 3,
    '6-mois': 6,
    '12-mois': 12
  };
  const monthsAhead = monthsMap[availability.timeHorizon] || 6;

  // CRITICAL: Amadeus Flight API only searches up to 330 days in the future
  // Cap the search window to 11 months maximum
  const maxMonths = Math.min(monthsAhead, 11);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + maxMonths);

  // Start from tomorrow to avoid same-day booking issues
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + 1);

  // Format dates for prompt
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = maxDate.toISOString().split('T')[0];
  
  // Build preferred months text
  const monthNames = {
    jan: 'January', feb: 'February', mar: 'March', apr: 'April',
    may: 'May', jun: 'June', jul: 'July', aug: 'August',
    sep: 'September', oct: 'October', nov: 'November', dec: 'December'
  };
  
  let preferredMonthsText = 'No specific month preference - choose the best season for each destination';
  if (availability.preferredMonths && availability.preferredMonths.length > 0) {
    const monthList = availability.preferredMonths.map(m => monthNames[m] || m).join(', ');
    preferredMonthsText = `User prefers these months: ${monthList}`;
  }
  
  // Map ideal duration to days
  const durationMap = {
    '3-5-jours': 4,
    '1-semaine': 7,
    '2-semaines': 14,
    'flexible': 7
  };
  const tripDays = durationMap[availability.idealDuration] || 7;
  
  // Build onboarding preferences section
  let onboardingSection = '';
  if (onboardingPreferences) {
    const activitiesList = onboardingPreferences.topActivities?.length > 0
      ? onboardingPreferences.topActivities.join(', ')
      : 'Not specified';

    const airportsList = onboardingPreferences.preferredAirports?.length > 0
      ? onboardingPreferences.preferredAirports.join(', ')
      : 'CDG (default)';

    onboardingSection = `

🎯 PERSONAL TRAVEL PROFILE (from onboarding - USE THIS FOR ULTRA-PERSONALIZATION):
Traveler personality: ${onboardingPreferences.personality || 'Not specified'} (Routard=backpacker, Explorateur=explorer, Confort=comfort, Luxe=luxury)
Why they travel: ${onboardingPreferences.whyTravel || 'Not specified'}
Main goal: ${onboardingPreferences.mainGoal || 'Not specified'}
Global style: ${onboardingPreferences.globalStyle || 'Not specified'}
Preferred activities: ${activitiesList}
Ideal rhythm: ${onboardingPreferences.idealRhythm || 'Not specified'}
Ideal duration: ${onboardingPreferences.idealDuration || 'Not specified'}
Professional status: ${onboardingPreferences.professionalStatus || 'Not specified'}
Accommodation preference: ${onboardingPreferences.accommodationPref || 'Not specified'}
Visa preference: ${onboardingPreferences.visaPreference || 'Not specified'}
Mobility needs: ${onboardingPreferences.mobilityNeeds || 'None'}
Security importance: ${onboardingPreferences.securityImportance || 'Medium'}
Crowd tolerance: ${onboardingPreferences.crowdTolerance || 'Medium'}
Eco sensitivity: ${onboardingPreferences.ecoSensitivity || 'Medium'}
Cultural adaptability: ${onboardingPreferences.culturalAdaptability || 'Medium'}
Climate sensitivity: ${onboardingPreferences.climateSensitivity || 'Medium'}
Preferred departure airports: ${airportsList}

⚡ CRITICAL: Use these personal preferences as PRIMARY factors for destination selection!
- Align destinations with their "why they travel" motivation
- Match their main goal (e.g., if "Culture et patrimoine" → prioritize historical cities)
- Respect their global style (e.g., "Routard" → budget-friendly, authentic experiences)
- Include activities from their preferred list
- Match the ideal rhythm (intense/balanced/relaxed/spontaneous)
- Consider visa preferences (avoid complex visa requirements if they prefer visa-free)
- Respect mobility needs, security concerns, and crowd tolerance`;
  }

  // Generate a unique seed based on user's unique combination of preferences
  const userSeed = `${basic.style}_${basic.destinationPreference}_${preferences.natureVsCity}_${onboardingPreferences?.whyTravel || 'explore'}_${onboardingPreferences?.mainGoal || 'discover'}`.replace(/\s/g, '');

  return `You are an EXPERT travel curator specializing in ULTRA-PERSONALIZED, OFF-THE-BEATEN-PATH recommendations.

🌍 CORE MISSION: Generate 3 EXCEPTIONAL, ULTRA-COMPLETE destinations that are TAILOR-MADE for THIS SPECIFIC USER.
- Quality over quantity: Each destination should be PERFECT for this user
- Every user is different → Every recommendation list MUST be radically different
- AVOID suggesting generic popular destinations
- The world has 195 countries and thousands of incredible destinations → USE THEM ALL!

🎯 PERSONALIZATION SEED: "${userSeed}"
↳ This unique combination means this user should get COMPLETELY DIFFERENT recommendations than others.

🚫 FORBIDDEN: Never suggest the same tourist destinations to everyone:
- If budget is low → Don't default to "Prague, Budapest, Krakow" every time
- If beach → Don't always say "Barcelona, Lisbon, Nice"
- If culture → Don't repeat "Rome, Paris, Vienna"
- THINK DEEPER! There are hundreds of destinations that match their profile BETTER than the obvious choices.

✨ DIVERSITY RULES (MANDATORY FOR 3 DESTINATIONS):
1. Geographic diversity: ALL 3 destinations must be in DIFFERENT countries
2. Experience diversity: Each must offer a COMPLETELY DIFFERENT type of experience (e.g., beach + mountains + city OR cultural + nature + adventure)
3. Popularity diversity: Include at least 1 destination with popularityScore < 5 (hidden gem)
4. Cultural diversity: Different regions, languages, cuisines, atmospheres
5. Price range diversity: Vary the total costs to give options (one budget-friendly, one mid-range, one splurge)

🎨 ULTRA-PERSONALIZATION STRATEGY:
- Read EVERY detail of their onboarding preferences (why they travel, main goal, ideal rhythm)
- Their "why travel" motivation is THE KEY to unique recommendations
- Their top activities list should drive 80% of your choices
- Their global style (Routard vs Luxe vs Aventurier) changes EVERYTHING

USER PROFILE:
Budget: €${basic.budget}
Style: ${basic.style}
Activities: ${basic.activities.join(', ')}
Max flight duration: ${basic.maxFlightHours}h
Destination preference: ${basic.destinationPreference}
${userFreeText ? `
🎯 USER'S SPECIFIC REQUEST (HIGHEST PRIORITY):
"${userFreeText}"
⚠️ THIS IS THE USER'S OWN WORDS - IT OVERRIDES OTHER PREFERENCES!
- If they mention a specific destination → INCLUDE THAT DESTINATION
- If they mention a specific occasion (birthday, anniversary, honeymoon) → MATCH THE VIBE
- If they mention "romantic", "couples", "spa" → Prioritize romantic/luxury experiences
- If they mention "adventure", "hiking" → Prioritize outdoor destinations
- The free text is MORE IMPORTANT than the style/activities checkboxes above!
` : ''}

Climate: ${preferences.climate}
Accommodation: ${preferences.accommodation}
Pace: ${preferences.pace}
Gastronomy importance: ${preferences.gastronomy}
Nature vs City: ${preferences.natureVsCity}% nature
Nightlife: ${preferences.nightlife}
Activities budget: ${preferences.activitiesBudget}%
Avoid crowds: ${preferences.avoidCrowds}

Languages: ${constraints.languages}
Security: ${constraints.security}
Visa: ${constraints.visa}
Mobility: ${constraints.mobility}
Travelers: ${basic?.travelers || constraints.travelers || 1}${(basic?.travelers === 2 || basic?.travelers === '2' || constraints.travelers === 2 || constraints.travelers === '2') ? ' (COUPLE TRIP - prioritize romantic/couples-friendly experiences, boutique hotels, intimate restaurants)' : ''}${onboardingSection}

TRAVEL PLANNING WINDOW:
Planning horizon: ${monthsAhead} months (from ${startDateStr} to ${endDateStr})
Professional status: ${availability.professionalStatus}
Ideal trip duration: ${tripDays} days
Departure flexibility: ${availability.departureFlexibility}
${preferredMonthsText}

🚨 CRITICAL TRANSPORT ACCESSIBILITY CONSTRAINT 🚨
You MUST ONLY suggest destinations that are ACTUALLY REACHABLE from ${originCityName} (${originCity}) within the budget and flight time constraints.
${onboardingPreferences?.refusedTransports?.length > 0
  ? `\n⚠️ USER REFUSES THESE TRANSPORT MODES: ${onboardingPreferences.refusedTransports.join(', ')}
  - DO NOT suggest destinations that REQUIRE these transport modes
  - If plane refused: ONLY suggest destinations reachable by train/bus/car
  - If train refused: Focus on air-accessible destinations
  - If bus refused: Avoid bus-only destinations
  - If car refused: Ensure good public transport at destination
  - If boat refused: Avoid island destinations requiring ferry access\n`
  : ''}
MANDATORY FLIGHT CONNECTIVITY RULES:
1. For destinations under €${basic.budget} budget:
   - PRIORITIZE cities with direct flights or 1-stop connections from ${originCityName}
   - Focus on routes served by LOW-COST carriers: Ryanair, EasyJet, Transavia, Vueling, Wizz Air, Volotea
   - Verify the route actually exists year-round (check ${originCity} airport connections)
   - Avoid suggesting remote islands or exotic locations unless budget > €1500

2. For European destinations (under 1500km from ${originCityName}):${onboardingPreferences?.refusedTransports?.includes('train') ? '' : '\n   - Consider TRAIN alternatives: Eurostar, TGV, ICE depending on origin city'}${onboardingPreferences?.refusedTransports?.includes('bus') ? '' : '\n   - Consider BUS alternatives: FlixBus, BlaBlaBus serve most European capitals'}
   - These alternatives can be CHEAPER than flights and should be suggested when relevant

3. For long-haul destinations (>5h flight from ${originCity}):
   - ONLY suggest if budget > €1000
   - Ensure major international airport with regular ${originCity} connections
   - Check if budget can cover both flights AND local expenses

4. IATA codes MUST be real airport codes that:
   - Actually have flights from ${originCity}
   - Are served by at least 2 airlines
   - Have year-round connectivity (not seasonal-only routes)

5. Smart destination selection based on budget:
   - Budget €300-600: Focus on Eastern Europe, Balkans, Morocco, Portugal (cheap flights + low costs)
   - Budget €600-1000: Add Western Europe, Scandinavia, Greece, Tunisia
   - Budget €1000-1500: Consider Canary Islands, Madeira, Iceland, Jordan
   - Budget >€1500: Long-haul options (Morocco, Egypt, Senegal, Georgia)

6. If you're unsure about flight availability from ${originCityName}:
   - Choose MAJOR tourist hubs with good connectivity: London, Barcelona, Rome, Athens, Lisbon, Amsterdam, Berlin, Prague, Budapest
   - These cities typically have multiple daily flights from major European airports

FALLBACK STRATEGY:
- If a perfect match requires expensive/rare flights, suggest a nearby alternative city with better connectivity
- Consider the user's origin city when suggesting alternatives
- Example: Instead of "Santorini" (expensive + seasonal), suggest "Athens" (daily flights) + ferry option

CRITICAL INSTRUCTIONS:
1. For EACH destination, YOU MUST generate the OPTIMAL travel dates
2. Dates must be in format YYYY-MM-DD (e.g., "2025-06-15")
3. Each trip should be ${tripDays} days long (startDate + ${tripDays} days = endDate)
4. ALL dates must be between ${startDateStr} and ${endDateStr}
   ⚠️ IMPORTANT: Dates too far in future won't have flight availability - prioritize dates in next 6-8 months for better flight prices
5. Consider for each destination:
   - Best season/weather for that location
   - Avoiding peak tourist periods (if user wants to avoid crowds)
   - Local festivals or events (if relevant to activities)
   - Budget implications (peak season = higher prices)
   - User's preferred months (if specified)
6. Generate RADICALLY VARIED destinations that THIS USER has probably never heard of
7. Prioritize ORIGINALITY based on "${basic.destinationPreference}":
   - "Peu connu": 70% hidden gems (popularityScore < 5)
   - "Équilibré": 50% hidden gems, 50% known
   - "Populaire": 30% hidden gems, 70% known
8. Ensure trips don't overlap in dates

🎯 QUALITY ACTIVITIES (5-6 per destination):
Generate ONLY activities that are TRULY worth doing - no generic filler!

ACTIVITY SELECTION CRITERIA:
1. Would a LOCAL recommend this? (not just tourist traps)
2. Is it UNIQUE to this destination? (no generic "city walking tour")
3. Does it match user's interests: ${onboardingPreferences.topActivities?.join(', ') || 'various activities'}
4. Good value for money (quality experience, not overpriced)

BUDGET-ADAPTED ACTIVITIES (user budget: €${basic.budget}):
${basic.budget < 600 ? `- FOCUS on FREE/cheap activities: free walking tours, public beaches, viewpoints, local markets, street food
- Include "insider tips" for saving money (free museum days, happy hours, local lunch spots)
- Prioritize authentic local experiences over expensive tourist attractions` :
basic.budget < 1000 ? `- MIX of free activities and affordable paid experiences
- Include 1-2 splurge-worthy experiences that are really worth it
- Mention budget-friendly alternatives when relevant` :
`- Can include premium experiences (private tours, fine dining, exclusive access)
- Still prioritize quality over price - expensive doesn't always mean better
- Include some authentic local experiences alongside luxury options`}

REQUIRED MIX:
- 2 FREE activities (viewpoints, beaches, markets, free tours)
- 2-3 MID-RANGE activities (€10-50: museums, food tours, day trips)
- 1 SPECIAL experience (€50-150: unique experience worth the splurge)

OUTPUT FORMAT (JSON only, no markdown, no code blocks):
{
  "destinations": [
    {
      "city": "City Name",
      "country": "Country",
      "iataCode": "XXX",
      "startDate": "2025-06-15",
      "endDate": "2025-06-22",
      "matchReason": "Why this destination matches the profile (max 100 chars)",
      "seasonReason": "Why these specific dates/season are ideal (max 80 chars)",
      "estimatedBudget": 800,
      "popularityScore": 7,
      "suggestedActivities": [
        {
          "name": "Activity name",
          "description": "Brief description (max 100 chars)",
          "duration": "2h" | "Half-day" | "Full-day",
          "estimatedPrice": 25,
          "category": "Culture" | "Nature" | "Food" | "Adventure" | "Relaxation" | "Nightlife",
          "when": "Morning" | "Afternoon" | "Evening" | "Anytime",
          "insiderTip": "Optional: money-saving tip or local secret (max 80 chars)"
        }
      ],
      "budgetTips": "2-3 money-saving tips specific to this destination (max 150 chars)"
    }
  ]
}

IMPORTANT RULES:
- popularityScore: 1-10 (1=very unknown, 10=very touristy)
- IATA codes must be valid 3-letter airport codes
- estimatedBudget should fit within user's total budget of €${basic.budget}
- seasonReason should explain why THESE SPECIFIC DATES are perfect (not just "good weather")
- Dates must be realistic and within the planning window
- suggestedActivities: 5-6 QUALITY activities only (no filler!)
- Activity prices: €0 for free, €5-50 for mid-range, €50-150 for special experiences
- insiderTip: Add for activities where you know a money-saving trick or local secret
- budgetTips: 2-3 destination-specific tips (cheap eats, free days, transport hacks)
- Activity duration: "2h", "3h", "Half-day", "Full-day"
- Activity when: "Morning", "Afternoon", "Evening", "Anytime"
- Return ONLY valid JSON, absolutely no markdown formatting or code blocks

🔥 FINAL CHECKLIST BEFORE SUBMITTING YOUR 10 RECOMMENDATIONS:
✅ Did I read their "why they travel" and choose destinations that fulfill that motivation?
✅ Did I match their "main goal" (e.g., Culture → historical cities, Nature → national parks)?
✅ Did I respect their "global style" (Routard → authentic/cheap, Luxe → upscale, Aventurier → wild)?
✅ Did I include activities from their TOP ACTIVITIES list?
✅ Did I generate 5-8 SPECIFIC activities for EACH destination (not generic suggestions)?
✅ Are my activities REALISTIC and actually available in these destinations?
✅ Did I vary the experiences (3 COMPLETELY different types of trips)?
✅ Did I include at least 1 hidden gem (popularityScore < 5)?
✅ Are these 3 destinations ULTRA-PERSONALIZED to THIS USER (not generic recommendations)?
✅ Would another user with different preferences get a COMPLETELY DIFFERENT list?
✅ Is each destination COMPLETE with all details (flights, hotels, activities)?

If you answered NO to any of these → START OVER and think deeper! 🎯`;
}

function parseDestinations(response) {
  try {
    // Remove any markdown formatting that might be present
    let cleaned = response.trim();
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Try to find JSON object if there's extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    const parsed = JSON.parse(cleaned);
    
    if (!parsed.destinations || !Array.isArray(parsed.destinations)) {
      throw new Error('Invalid response format: destinations array not found');
    }
    
    // Validate each destination has required fields
    parsed.destinations.forEach((dest, index) => {
      if (!dest.city || !dest.country || !dest.iataCode || !dest.startDate || !dest.endDate) {
        throw new Error(`Destination ${index} missing required fields`);
      }
      
      // Validate dates are valid
      const start = new Date(dest.startDate);
      const end = new Date(dest.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error(`Destination ${index} has invalid dates`);
      }
      
      if (end <= start) {
        throw new Error(`Destination ${index}: endDate must be after startDate`);
      }
    });

    console.log(`✅ Successfully parsed ${parsed.destinations.length} destinations with dates`);
    return parsed.destinations;
    
  } catch (error) {
    console.error('Failed to parse Claude response:', response);
    console.error('Parse error:', error.message);
    throw new Error(`Failed to parse destination recommendations: ${error.message}`);
  }
}

/**
 * Generate detailed itinerary with real flight/hotel data (WITH DESTINATION scenario)
 * Uses optimized prompt from claudePromptsOptimized.js
 */
export async function generateItineraryWithRealData(tripData, userId = null, userName = null) {
  if (!client) {
    throw new Error('Claude client not initialized. Please check ANTHROPIC_API_KEY environment variable.');
  }

  const { generateItineraryWithDestination } = await import('./claudePromptsOptimized.js');

  const startTime = Date.now();
  const promptMessage = generateItineraryWithDestination(tripData);

  logger.logUserAction({
    userId: userId || 'unknown',
    userName: userName || 'Unknown User',
    action: 'Generate Detailed Itinerary',
    details: {
      destination: tripData.destination.name,
      budget: tripData.budget.total,
      duration: tripData.dates.duration,
    }
  });

  try {
    logger.logClaudeAPI({
      operation: 'Generate Itinerary WITH Destination - Request',
      input: promptMessage.content.substring(0, 500) + '...',
      tokensUsed: null,
      duration: null,
    });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      temperature: 0.7, // Lower temperature for consistent JSON output
      messages: [promptMessage]
    });

    const duration = Date.now() - startTime;
    let response = message.content[0].text.trim();

    logger.logClaudeAPI({
      operation: 'Generate Itinerary WITH Destination - Response',
      input: null,
      output: response.substring(0, 500) + '...',
      tokensUsed: {
        input: message.usage?.input_tokens,
        output: message.usage?.output_tokens,
        total: message.usage?.input_tokens + message.usage?.output_tokens,
      },
      duration,
    });

    // Strip markdown code blocks if present
    if (response.startsWith('```')) {
      response = response.replace(/^```(?:json)?\n?/g, '').replace(/\n?```$/g, '').trim();
    }

    // Parse JSON response
    const itinerary = JSON.parse(response);

    console.log(`✅ Generated detailed itinerary for ${tripData.destination.name}`);
    return itinerary;

  } catch (error) {
    console.error('Failed to generate itinerary:', error.message);
    throw new Error(`Failed to generate itinerary: ${error.message}`);
  }
}

/**
 * Generate destination recommendation (WITHOUT DESTINATION scenario)
 * Uses optimized prompt from claudePromptsOptimized.js
 */
export async function generateDestinationRecommendationWithData(tripData, userId = null, userName = null) {
  if (!client) {
    throw new Error('Claude client not initialized. Please check ANTHROPIC_API_KEY environment variable.');
  }

  const { generateDestinationRecommendation } = await import('./claudePromptsOptimized.js');

  const startTime = Date.now();
  const promptMessage = generateDestinationRecommendation(tripData);

  logger.logUserAction({
    userId: userId || 'unknown',
    userName: userName || 'Unknown User',
    action: 'Generate Destination Recommendation',
    details: {
      destination: tripData.destination.name,
      budget: tripData.budget.total,
      duration: tripData.dates.duration,
    }
  });

  try {
    logger.logClaudeAPI({
      operation: 'Generate Destination Recommendation - Request',
      input: promptMessage.content.substring(0, 500) + '...',
      tokensUsed: null,
      duration: null,
    });

    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022', // Fast model for quick recommendations
      max_tokens: 500, // Reduced - simplified prompt needs less tokens
      temperature: 0.7,
      messages: [promptMessage]
    });

    const duration = Date.now() - startTime;
    let response = message.content[0].text.trim();

    logger.logClaudeAPI({
      operation: 'Generate Destination Recommendation - Response',
      input: null,
      output: response.substring(0, 500) + '...',
      tokensUsed: {
        input: message.usage?.input_tokens,
        output: message.usage?.output_tokens,
        total: message.usage?.input_tokens + message.usage?.output_tokens,
      },
      duration,
    });

    // Strip markdown code blocks if present
    if (response.startsWith('```')) {
      response = response.replace(/^```(?:json)?\n?/g, '').replace(/\n?```$/g, '').trim();
    }

    // Parse JSON response
    const recommendation = JSON.parse(response);

    console.log(`✅ Generated recommendation for ${tripData.destination.name}`);
    return recommendation;

  } catch (error) {
    console.error('Failed to generate recommendation:', error.message);
    throw new Error(`Failed to generate recommendation: ${error.message}`);
  }
}

/**
 * Generate hash from user profile for cache key
 * @param {Object} userProfile - User profile
 * @param {Object} options - Options
 * @returns {string} Hash string
 */
function generateProfileHash(userProfile, options) {
  const key = {
    activities: userProfile.basic?.activities?.sort() || [],
    style: userProfile.basic?.style || 'explorer',
    budget: options.budget || 800,
    origin: options.origin || 'Paris',
    duration: options.duration || 7
  };
  // Simple hash: JSON stringify and take first 32 chars of base64
  return Buffer.from(JSON.stringify(key)).toString('base64').slice(0, 32);
}

// TESTING MODE: Set to true to disable cache and see fresh results each time
const TESTING_MODE = true;

/**
 * Generate personalized destination shortlist for Booking.com API workflow
 * Returns 5-8 diverse destination names to search flights for
 * Uses cache to avoid repeated Claude calls (24h TTL)
 * @param {Object} userProfile - User preferences and profile
 * @param {Object} options - Additional options
 * @returns {Promise<string[]>} Array of destination city names
 */
export async function generateDestinationShortlist(userProfile, options = {}) {
  if (!client) {
    throw new Error('Claude client not initialized. Please check ANTHROPIC_API_KEY environment variable.');
  }

  const {
    budget = 800,
    duration = 7,
    origin = 'Paris',
    count = 6,
    excludeDestinations = [], // Previously recommended destinations to exclude
    userId = null, // For fetching past recommendations
    maxFlightHours = null // User's max flight duration preference
  } = options;

  // Generate a random seed for this session to encourage variety
  const randomSeed = Math.floor(Math.random() * 10000);

  // CACHE DISABLED FOR TESTING - Set TESTING_MODE = false in production
  const cacheKey = `destinations:${generateProfileHash(userProfile, options)}`;
  if (!TESTING_MODE) {
    const cachedDestinations = cache.get(cacheKey);
    if (cachedDestinations && excludeDestinations.length === 0) {
      console.log(`⚡ Cache HIT for destination shortlist`);
      return cachedDestinations;
    }
  } else {
    console.log(`🧪 TESTING MODE: Cache disabled, generating fresh destinations`);
  }

  // Fetch user's LAST 10 searches to exclude those destinations
  let pastDestinations = [...excludeDestinations];
  if (userId) {
    try {
      // Get from AlgorithmResult (new table - most reliable)
      const algorithmResults = await prisma.algorithmResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { finalDestinations: true, claudeDestinations: true }
      });

      // Collect all destinations from last 10 searches
      algorithmResults.forEach(r => {
        pastDestinations.push(...(r.finalDestinations || []));
        pastDestinations.push(...(r.claudeDestinations || []));
      });

      // Also check Recommendation table as backup
      const recentRecommendations = await prisma.recommendation.findMany({
        where: {
          search: { userId },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        },
        select: { city: true },
        distinct: ['city'],
        take: 30
      });
      pastDestinations.push(...recentRecommendations.map(r => r.city));

      // Remove duplicates
      pastDestinations = [...new Set(pastDestinations)];
      console.log(`📊 Found ${pastDestinations.length} past destinations to exclude for this user`);
    } catch (error) {
      console.warn('⚠️  Could not fetch past recommendations:', error.message);
    }
  }

  // Add some globally over-suggested destinations to exclusion (rotate based on day)
  // This prevents ALL users from seeing the same "Claude favorites" every time
  const overSuggestedPools = [
    ['Funchal', 'Tbilisi', 'Innsbruck'], // Pool A
    ['Marrakech', 'Tenerife', 'Reykjavik'], // Pool B
    ['Porto', 'Split', 'Budapest'], // Pool C
  ];
  // Rotate which pool to exclude based on random seed
  const poolIndex = randomSeed % overSuggestedPools.length;
  const globalExclusions = overSuggestedPools[poolIndex];

  const allExclusions = [...new Set([...pastDestinations, ...globalExclusions])];

  // Build exclusion text for prompt
  const exclusionText = allExclusions.length > 0
    ? `\n🚫 DO NOT SUGGEST: ${allExclusions.join(', ')}\n`
    : '';

  // Current month for seasonal context
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

  // Extract key user preferences for better personalization
  const style = userProfile.basic?.style || 'explorer';
  const activities = userProfile.basic?.activities || [];
  const budgetLevel = budget < 500 ? 'budget' : budget < 1000 ? 'mid-range' : budget < 2000 ? 'comfortable' : 'luxury';
  const onboarding = userProfile.onboardingPreferences || {};

  // CRITICAL: Extract the custom field (travelVibeDescription) - THIS IS THE USER'S MAIN INPUT
  const customField = userProfile.basic?.travelVibeDescription || '';
  const customFieldLower = customField.toLowerCase();

  // Extract user activities for context - NOW INCLUDING CUSTOM FIELD
  const userActivities = [
    ...(activities || []),
    ...(onboarding.topActivities || []),
    onboarding.mainGoal || ''
  ].map(a => a.toLowerCase().trim()).filter(Boolean);

  console.log(`🎯 User activities detected: ${userActivities.join(', ') || 'none specified'}`);
  console.log(`📝 Custom field: "${customField}"`);

  // EXPANDED keyword detection - check both activities AND custom field
  const BEACH_KEYWORDS = ['plage', 'beach', 'baigner', 'nager', 'mer', 'océan', 'ocean', 'sea', 'swimming', 'sunbathing', 'snorkeling', 'coastal', 'bord de mer', 'farniente', 'île', 'island'];
  const HIKING_KEYWORDS = ['montagne', 'mountain', 'randonnée', 'hiking', 'trek', 'trekking', 'altitude', 'alpes', 'alps'];
  const SKI_KEYWORDS = ['ski', 'skiing', 'snowboard', 'neige', 'snow', 'piste'];
  const ROMANTIC_KEYWORDS = ['amoureux', 'romantic', 'couple', 'honeymoon', 'lune de miel', 'romantique', 'love'];
  const CULTURE_KEYWORDS = ['culture', 'musée', 'museum', 'histoire', 'history', 'patrimoine', 'heritage', 'temples', 'architecture'];

  // Check in both activities and custom field
  const textToCheck = [...userActivities, customFieldLower].join(' ');

  const hasBeach = BEACH_KEYWORDS.some(kw => textToCheck.includes(kw));
  const hasHiking = HIKING_KEYWORDS.some(kw => textToCheck.includes(kw));
  const hasSki = SKI_KEYWORDS.some(kw => textToCheck.includes(kw));
  const hasRomantic = ROMANTIC_KEYWORDS.some(kw => textToCheck.includes(kw));
  const hasCulture = CULTURE_KEYWORDS.some(kw => textToCheck.includes(kw));

  // Detect geographic constraints from custom field
  const SCHENGEN_KEYWORDS = ['schengen', 'europe', 'européen', 'european', 'ue', 'eu'];
  const wantsSchengen = SCHENGEN_KEYWORDS.some(kw => customFieldLower.includes(kw)) || onboarding.visaPreference === 'sans-visa';

  console.log(`🏖️  Beach detected: ${hasBeach}, 🏔️  Hiking: ${hasHiking}, ⛷️  Ski: ${hasSki}, 💕 Romantic: ${hasRomantic}, 🇪🇺 Schengen: ${wantsSchengen}`);

  // Build activity context with STRICT requirements for certain activities
  let activityContext = 'Open to all types of experiences';
  let activityConstraint = '';

  if (userActivities.length > 0 || customField) {
    const mainInterests = [...userActivities];
    if (hasBeach) mainInterests.push('BEACH/SEA');
    if (hasHiking) mainInterests.push('HIKING/MOUNTAINS');
    if (hasRomantic) mainInterests.push('ROMANTIC');
    if (hasCulture) mainInterests.push('CULTURE');

    activityContext = `Main interests: ${mainInterests.join(', ').toUpperCase()}`;
    if (customField) {
      activityContext += `\nUser's exact request: "${customField}"`;
    }

    // Add strict constraints for specific activity types
    if (hasBeach) {
      activityConstraint = `\n⚠️ CRITICAL: User wants BEACH/SEA activities. ONLY suggest coastal cities or islands with beaches.
ABSOLUTELY NO landlocked cities like Budapest, Vienna, Prague, Belgrade, Sofia, Munich!
REQUIRED: Cities must have direct beach access or be on an island.`;
    } else if (hasHiking) {
      activityConstraint = `\n⚠️ CRITICAL: User wants HIKING/MOUNTAINS. Prioritize destinations near mountains or national parks with good trails.`;
    } else if (hasSki) {
      activityConstraint = `\n⚠️ CRITICAL: User wants SKI/SNOW. ONLY suggest destinations with ski resorts accessible in winter.`;
    }

    // Add romantic constraint
    if (hasRomantic) {
      activityConstraint += `\n💕 ROMANTIC TRIP: Suggest destinations known for couples (charming cities, beaches, scenic views).`;
    }

    // Add Schengen constraint
    if (wantsSchengen) {
      activityConstraint += `\n🇪🇺 SCHENGEN ZONE ONLY: User specified European/Schengen destinations. ONLY suggest Schengen countries: Austria, Belgium, Croatia, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Iceland, Italy, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta, Netherlands, Norway, Poland, Portugal, Slovakia, Slovenia, Spain, Sweden, Switzerland.`;
    }
  }

  // Adapt geographic scope based on budget AND flight duration preference
  let geographicGuidance = '';

  // If user has a max flight hours constraint, this OVERRIDES budget-based distance suggestions
  if (maxFlightHours && maxFlightHours <= 4) {
    // User wants SHORT flights - focus on nearby but PREMIUM experiences
    geographicGuidance = `🌍 SHORT FLIGHTS ONLY (max ${maxFlightHours}h from ${origin}):
- ONLY suggest destinations reachable in ${maxFlightHours} hours or less from ${origin}
- User prefers COMFORT over distance - respect this preference!
- With €${budget} budget: focus on PREMIUM/LUXURY experiences at nearby destinations
- Suggest: upscale hotels, fine dining, exclusive experiences
- Examples from ${origin}: ${maxFlightHours <= 2 ? 'neighboring countries only' : 'same continent, nearby regions'}`;
  } else if (maxFlightHours && maxFlightHours <= 6) {
    // Medium-haul preferred
    geographicGuidance = `🌍 MEDIUM-HAUL FLIGHTS (max ${maxFlightHours}h from ${origin}):
- Prefer destinations reachable in ${maxFlightHours} hours or less
- Can include some closer long-haul if within time limit
- Budget €${budget} allows for quality experiences`;
  } else if (budget < 600) {
    geographicGuidance = `🌍 BUDGET CONSTRAINT (€${budget}):
- Focus on destinations reachable CHEAPLY from ${origin}
- Prioritize: nearby countries, budget airline routes, low cost of living
- Short flights = more budget for experiences`;
  } else if (budget < 1200) {
    geographicGuidance = `🌍 MODERATE BUDGET (€${budget}):
- Can reach medium-haul destinations from ${origin}
- Mix nearby destinations with 1-2 further options
- Consider good value destinations with reasonable flight costs`;
  } else if (budget < 2000) {
    geographicGuidance = `🌍 COMFORTABLE BUDGET (€${budget}):
- Can reach worldwide destinations from ${origin}
- Include at least 2 LONG-HAUL destinations (different continent)
- Mix: 2-3 nearby + 3-4 far away (Asia, Americas, Oceania, Africa)`;
  } else {
    geographicGuidance = `🌍 LUXURY BUDGET (€${budget}):
- PRIORITIZE dream destinations far from ${origin}!
- Include at least 3-4 LONG-HAUL destinations (Bali, Maldives, Japan, Australia, Polynesia, Caribbean, etc.)
- This budget can reach ANYWHERE in the world - be ambitious!
- Don't waste a €${budget} budget on nearby destinations the user could visit cheaply`;
  }

  const prompt = `You are a world travel expert. Recommend ${count} destinations that PERFECTLY match this traveler.

👤 TRAVELER:
- Budget: €${budget} total (flights from ${origin} + ${duration-1} nights hotel + activities)
- Duration: ${duration} days
- Travel month: ${currentMonth}
- Style: ${style}
- ${activityContext}
${activityConstraint}
${exclusionText}

${geographicGuidance}

✅ REQUIREMENTS:
1. ${count} cities from ${count} DIFFERENT countries
2. Flights must exist from ${origin} (direct or max 1 stop)
3. Match traveler's interests perfectly
4. Good weather in ${currentMonth}
5. Realistic for €${budget} budget

🎯 MAXIMIZE VARIETY:
- Suggest ${count + 4} destinations (more than needed) so we can randomize
- Include a MIX of: 1/3 popular, 1/3 emerging, 1/3 hidden gems
- Think globally - not just the usual European destinations
- What would SURPRISE someone who travels often?

🎲 SEED: ${randomSeed}

Return ONLY a JSON array of ${count + 4} cities: ["City1", "City2", ...]`;

  try {
    logger.logClaudeAPI({
      operation: 'Generate Destination Shortlist - Request',
      input: { budget, duration, origin, userProfile: userProfile.basic },
      tokensUsed: null,
      duration: null,
    });

    const startTime = Date.now();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      temperature: 0.95, // Very high temperature for maximum diversity
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const apiDuration = Date.now() - startTime;  // Renamed to avoid conflict with trip duration
    let response = message.content[0].text.trim();

    logger.logClaudeAPI({
      operation: 'Generate Destination Shortlist - Response',
      output: response,
      tokensUsed: {
        input: message.usage?.input_tokens,
        output: message.usage?.output_tokens,
        total: message.usage?.input_tokens + message.usage?.output_tokens,
      },
      duration: apiDuration,
    });

    // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
    if (response.startsWith('```')) {
      console.log('⚠️  Detected markdown wrapper in Claude response, stripping...');
      response = response.replace(/^```(?:json)?\n?/g, '').replace(/\n?```$/g, '').trim();
      console.log('✅ Cleaned response:', response);
    }

    // Parse JSON response
    const destinations = JSON.parse(response);

    if (!Array.isArray(destinations) || destinations.length === 0) {
      throw new Error('Invalid destination shortlist format');
    }

    console.log(`✅ Claude returned ${destinations.length} destinations:`, destinations);

    // Shuffle and pick only what we need (adds randomness on our side)
    const shuffled = destinations.sort(() => Math.random() - 0.5);
    const finalDestinations = shuffled.slice(0, count);

    console.log(`🎲 After shuffle, selected ${finalDestinations.length}:`, finalDestinations);

    // Log detailed justification for debugging
    console.log('\n📍 ========== DESTINATION JUSTIFICATION ==========');
    console.log(`📍 User Profile Summary:`);
    console.log(`   - Style: ${style}`);
    console.log(`   - Activities: ${userActivities.join(', ') || 'none specified'}`);
    console.log(`   - Budget: €${budget} (${budgetLevel})`);
    console.log(`   - Duration: ${duration} days`);
    console.log(`   - Origin: ${origin}`);
    console.log(`📍 Activity constraint: ${activityConstraint || 'none'}`);
    console.log(`📍 Excluded (past recommendations): ${pastDestinations.length} destinations`);
    console.log(`📍 Random seed: ${randomSeed}`);
    console.log(`📍 Claude suggestions: ${destinations.join(', ')}`);
    console.log(`📍 Final (shuffled): ${finalDestinations.join(', ')}`);
    console.log('📍 ==================================================\n');

    // Cache results only if not in testing mode
    if (!TESTING_MODE && excludeDestinations.length === 0) {
      cache.set(cacheKey, finalDestinations, 30); // 30 min cache in production
      console.log(`💾 Cached destination shortlist for 30min`);
    }

    return finalDestinations;

  } catch (error) {
    console.error('Failed to generate destination shortlist:', error.message);

    // Fallback with RANDOM selection from diverse list
    console.warn('⚠️  Using randomized fallback destinations');
    const allFallbacks = [
      'Porto', 'Valencia', 'Seville', 'Malaga', 'Bilbao',
      'Florence', 'Bologna', 'Naples', 'Palermo', 'Turin',
      'Krakow', 'Gdansk', 'Wroclaw', 'Budapest', 'Ljubljana',
      'Split', 'Dubrovnik', 'Athens', 'Thessaloniki', 'Sofia',
      'Tallinn', 'Riga', 'Vilnius', 'Helsinki', 'Stockholm',
      'Copenhagen', 'Edinburgh', 'Dublin', 'Reykjavik', 'Bergen',
      'Marrakech', 'Fez', 'Istanbul', 'Tbilisi', 'Amman'
    ];
    // Shuffle and pick random 6
    const shuffled = allFallbacks.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

/**
 * Generate detailed roadtrip narrative with rich explanations
 * Roadtrip cards need MORE TEXT and MORE EXPLANATIONS than single-city cards
 * @param {Object} roadtripData - Complete roadtrip data from roadtripService
 * @param {Object} userProfile - User preferences
 * @returns {Promise<Object>} Enhanced roadtrip with narrative, highlights, logistics
 */
export async function generateRoadtripNarrative(roadtripData, userProfile) {
  console.log('🤖 Generating detailed roadtrip narrative...');

  const startTime = Date.now();

  try {
    // Build comprehensive roadtrip context
    const citiesInfo = roadtripData.cities.map((city, i) => ({
      order: i + 1,
      name: city.name,
      country: city.country,
      nights: city.nights,
      arrivalDate: city.arrivalDate,
      departureDate: city.departureDate,
      hotel: city.hotel ? {
        name: city.hotel.name,
        stars: city.hotel.stars,
        rating: city.hotel.rating?.value,
        pricePerNight: Math.round(city.hotel.price.amount / city.nights),
        totalPrice: city.hotel.price.amount
      } : null,
      topAttractions: city.attractions.slice(0, 5).map(a => ({
        name: a.name,
        description: a.description,
        price: a.price?.amount,
        rating: a.rating?.value
      }))
    }));

    const transportInfo = roadtripData.transport.map(t => ({
      type: t.type,
      cost: t.totalCost,
      details: t.type === 'plane' ?
        (t.details.segments ? `${t.details.segments.length} flight segments` : `${t.details.length} individual flights`) :
        (t.details.name || 'Car rental')
    }));

    const prompt = `You are an expert travel writer creating a COMPELLING, DETAILED roadtrip itinerary card.

🎯 CRITICAL: Roadtrip cards need MORE TEXT and MORE EXPLANATIONS than single-destination cards!

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

ROADTRIP DATA:
- Origin: ${roadtripData.origin}
- Duration: ${roadtripData.duration} days
- Cities: ${citiesInfo.map(c => c.name).join(' → ')}
- Transport modes: ${roadtripData.acceptedTransportModes.join(', ')}
- Budget: €${roadtripData.budget.total} (Transport: €${Math.round(roadtripData.budget.transport)}, Hotels: €${Math.round(roadtripData.budget.hotels)}, Activities: €${Math.round(roadtripData.budget.activities)})

CITIES DETAILS:
${JSON.stringify(citiesInfo, null, 2)}

TRANSPORT:
${JSON.stringify(transportInfo, null, 2)}

📝 YOUR TASK:
Create a RICH, DETAILED roadtrip narrative with:

1. **Title** (creative, evocative)
2. **Tagline** (2-3 lines capturing the essence)
3. **Overview** (4-6 lines explaining the journey concept, why this route, what makes it special)
4. **Day-by-Day Highlights** (2-3 lines per city explaining what to expect)
5. **Transport Narrative** (Explain the journey between cities - flights, car rental, etc. Make it sound exciting!)
6. **Perfect For** (Who would love this roadtrip - based on user profile)
7. **Budget Breakdown Explanation** (Not just numbers - explain what they get for their money)
8. **Practical Tips** (2-3 logistics tips specific to this route)
9. **Best Time to Go** (Season/weather considerations)
10. **Hidden Gems** (1-2 unique experiences along the route)

⚠️ IMPORTANT FORMATTING:
- Use **markdown** for emphasis
- Be DESCRIPTIVE and NARRATIVE (not just bullet points)
- Make it INSPIRATIONAL and INFORMATIVE
- Include PRACTICAL DETAILS (transport times, distances, etc.)
- Each section should have MORE DEPTH than a single-city card

Return a JSON object with this structure:
{
  "title": "...",
  "tagline": "...",
  "overview": "...",
  "dayByDayHighlights": [
    {"day": 1, "city": "...", "description": "..."},
    {"day": 2, "city": "...", "description": "..."}
  ],
  "transportNarrative": "...",
  "perfectFor": "...",
  "budgetExplanation": "...",
  "practicalTips": ["...", "...", "..."],
  "bestTimeToGo": "...",
  "hiddenGems": ["...", "..."]
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 3000, // More tokens for detailed narrative
      temperature: 0.8, // Higher creativity for storytelling
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const duration = Date.now() - startTime;
    let response = message.content[0].text.trim();

    console.log({
      function: 'generateRoadtripNarrative',
      tokensUsed: {
        input: message.usage?.input_tokens,
        output: message.usage?.output_tokens,
        total: message.usage?.input_tokens + message.usage?.output_tokens,
      },
      duration,
    });

    // Strip markdown code blocks if present
    if (response.startsWith('```')) {
      response = response.replace(/^```(?:json)?\n?/g, '').replace(/\n?```$/g, '').trim();
    }

    // Parse JSON response
    const narrative = JSON.parse(response);

    console.log(`✅ Roadtrip narrative generated (${duration}ms)`);
    return {
      ...roadtripData,
      narrative
    };

  } catch (error) {
    console.error('Failed to generate roadtrip narrative:', error.message);

    // Fallback: Basic narrative
    return {
      ...roadtripData,
      narrative: {
        title: roadtripData.title,
        tagline: `Explore ${roadtripData.cities.length} amazing cities in ${roadtripData.duration} days`,
        overview: `This ${roadtripData.duration}-day roadtrip takes you through ${roadtripData.cities.map(c => c.name).join(', ')}, combining culture, adventure, and discovery.`,
        dayByDayHighlights: roadtripData.cities.map((city, i) => ({
          day: i + 1,
          city: city.name,
          description: `Explore ${city.name} and discover its unique charm.`
        })),
        transportNarrative: `Travel between cities using ${roadtripData.acceptedTransportModes.join(' and ')}.`,
        perfectFor: 'Adventurous travelers who love to explore multiple destinations.',
        budgetExplanation: `Your €${roadtripData.budget.total} budget covers transport, accommodation, and activities.`,
        practicalTips: ['Pack light for easy travel', 'Book transport in advance', 'Stay flexible with timing'],
        bestTimeToGo: 'Spring and fall for pleasant weather',
        hiddenGems: ['Local markets in each city', 'Regional cuisine tasting']
      }
    };
  }
}