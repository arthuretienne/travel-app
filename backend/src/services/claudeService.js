// backend/src/services/claudeService.js
import Anthropic from '@anthropic-ai/sdk';
import { logger } from './logger.js';

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
      model: 'claude-sonnet-4-20250514',
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
Travelers: ${constraints.travelers}${onboardingSection}

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

💡 INSPIRATION - HIDDEN GEMS BY CATEGORY (use these as examples, not exhaustive):
Budget Beach Escapes: Albanian Riviera (Ksamil), Romania (Constanta), Bulgaria (Sozopol), Tunisia (Djerba), Croatia (Vis Island)
Culture Off-Path: Georgia (Tbilisi), Armenia (Yerevan), Albania (Berat), North Macedonia (Ohrid), Bosnia (Mostar), Moldova (Chișinău)
Nature Adventures: Azores (Portugal), Faroe Islands, Slovenia (Triglav), Albania (Theth), Madeira, Corsica wild trails
Mountain Retreats: Dolomites (Italy - NOT Cortina), Tatra Mountains (Poland/Slovakia), Picos de Europa (Spain), Rila (Bulgaria)
Island Gems: Crete villages (not Heraklion), Sardinia interior, Malta (Gozo), Sicily (Ragusa), Canary Islands (La Palma)
City Discoveries: Plovdiv, Gdansk, Tallinn, Riga, Brno, Cluj-Napoca, Sarajevo, Kotor, Funchal
Desert/Unique: Jordan (Wadi Rum), Morocco (Sahara), Lanzarote, Tunisia (Matmata), Egypt (Siwa Oasis)
9. Respect departure flexibility:
   - "semaine" = prefer weekday departures (Monday-Thursday)
   - "weekend" = prefer weekend departures (Friday-Sunday)
   - "peu-importe" = any day is fine

🎯 STRUCTURED ACTIVITIES GENERATION (MANDATORY):
For each destination, generate 5-8 concrete, bookable activities that:
1. MATCH user's top activities preferences (${onboardingPreferences.topActivities?.join(', ') || 'various activities'})
2. Are REALISTIC and actually available in that destination
3. Cover different times of day (morning, afternoon, evening)
4. Mix FREE activities (parks, walking tours) and PAID activities (museums, excursions)
5. Include SPECIFIC names (not generic "visit museum" → "Louvre Museum Tour")
6. Price activities realistically (€5-150 range depending on type)
7. Categories: Culture, Nature, Food, Adventure, Relaxation, Nightlife
8. Examples:
   - Culture: "Guided walking tour of Old Town" (Half-day, €25, Morning)
   - Nature: "Hike to scenic viewpoint" (2h, €0, Morning/Afternoon)
   - Food: "Traditional cooking class" (3h, €60, Afternoon)
   - Adventure: "Paragliding experience" (2h, €120, Morning)
   - Relaxation: "Spa and thermal baths" (Half-day, €40, Anytime)
   - Nightlife: "Rooftop bar with city views" (2h, €20, Evening)

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
          "when": "Morning" | "Afternoon" | "Evening" | "Anytime"
        }
      ]
    }
  ]
}

IMPORTANT RULES:
- popularityScore: 1-10 (1=very unknown, 10=very touristy)
- IATA codes must be valid 3-letter airport codes
- estimatedBudget should fit within user's total budget of €${basic.budget}
- seasonReason should explain why THESE SPECIFIC DATES are perfect (not just "good weather")
- Dates must be realistic and within the planning window
- suggestedActivities: MUST include 5-8 specific, realistic activities matching user's top activities preferences
- Activity prices should be realistic (FREE for parks/viewpoints, €5-50 for museums, €50-150 for experiences)
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7, // Lower temperature for consistent JSON output
      messages: [promptMessage]
    });

    const duration = Date.now() - startTime;
    const response = message.content[0].text;

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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      temperature: 0.8, // Slightly higher for creative hooks
      messages: [promptMessage]
    });

    const duration = Date.now() - startTime;
    const response = message.content[0].text;

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
 * Generate personalized destination shortlist for Booking.com API workflow
 * Returns 5-8 diverse destination names to search flights for
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
    count = 6
  } = options;

  const prompt = `You are an expert travel advisor. Generate ${count} PERSONALIZED, DIVERSE European destination recommendations for this traveler.

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

TRIP PARAMETERS:
- Origin: ${origin}
- Budget: €${budget}
- Duration: ${duration} days

🎯 REQUIREMENTS:
1. **DIVERSITY IS CRITICAL**: Each destination must be in a DIFFERENT country
2. **PERSONALIZATION**: Match their interests, vibe, and travel style
3. **VARIETY**: Mix popular + hidden gems (at least 2 off-the-beaten-path)
4. **REALISTIC**: Must be reachable from ${origin} within budget
5. **SEASONAL**: Consider current season (December 2025)
6. **NO REPEATS**: Avoid obvious tourist traps everyone suggests

🚫 FORBIDDEN PATTERNS:
- Don't default to "Barcelona, Lisbon, Amsterdam" for every young traveler
- Don't suggest "Prague, Budapest, Krakow" for every budget traveler
- Think beyond the top 10 European cities!

✨ PERSONALIZATION FACTORS TO CONSIDER:
- Travel vibe (${userProfile.basic?.style || 'explorer'})
- Main activities (${userProfile.basic?.activities?.join(', ') || 'sightseeing'})
- Budget level (${budget < 500 ? 'budget' : budget < 1000 ? 'mid-range' : 'comfortable'})
- Nature vs City preference
- Crowd tolerance
- Cultural interests

Return ONLY a valid JSON array of city names (no explanations):
["City1", "City2", "City3", "City4", "City5", "City6"]

Example good output: ["Porto", "Ljubljana", "Tallinn", "Valencia", "Krakow", "Bergen"]
Example bad output: ["Paris", "Barcelona", "Amsterdam", "London", "Berlin", "Rome"] (too obvious!)`;

  try {
    logger.logClaudeAPI({
      operation: 'Generate Destination Shortlist - Request',
      input: { budget, duration, origin, userProfile: userProfile.basic },
      tokensUsed: null,
      duration: null,
    });

    const startTime = Date.now();

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.8, // Higher temperature for more creative suggestions
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const apiDuration = Date.now() - startTime;  // Renamed to avoid conflict with trip duration
    const response = message.content[0].text.trim();

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

    // Parse JSON response
    const destinations = JSON.parse(response);

    if (!Array.isArray(destinations) || destinations.length === 0) {
      throw new Error('Invalid destination shortlist format');
    }

    console.log(`✅ Generated ${destinations.length} personalized destinations:`, destinations);
    return destinations;

  } catch (error) {
    console.error('Failed to generate destination shortlist:', error.message);

    // Fallback to diverse default destinations if Claude fails
    console.warn('⚠️  Using fallback destinations');
    return ['Porto', 'Ljubljana', 'Valencia', 'Tallinn', 'Krakow', 'Bergen'];
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
      model: 'claude-3-5-sonnet-20241022',
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
    const response = message.content[0].text.trim();

    console.log({
      function: 'generateRoadtripNarrative',
      tokensUsed: {
        input: message.usage?.input_tokens,
        output: message.usage?.output_tokens,
        total: message.usage?.input_tokens + message.usage?.output_tokens,
      },
      duration,
    });

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