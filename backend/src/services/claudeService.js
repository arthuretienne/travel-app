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
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + monthsAhead);
  
  // Format dates for prompt
  const startDateStr = today.toISOString().split('T')[0];
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
Why they travel: ${onboardingPreferences.whyTravel || 'Not specified'}
Main goal: ${onboardingPreferences.mainGoal || 'Not specified'}
Global style: ${onboardingPreferences.globalStyle || 'Not specified'}
Preferred activities: ${activitiesList}
Ideal rhythm: ${onboardingPreferences.idealRhythm || 'Not specified'}
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

MANDATORY FLIGHT CONNECTIVITY RULES:
1. For destinations under €${basic.budget} budget:
   - PRIORITIZE cities with direct flights or 1-stop connections from ${originCityName}
   - Focus on routes served by LOW-COST carriers: Ryanair, EasyJet, Transavia, Vueling, Wizz Air, Volotea
   - Verify the route actually exists year-round (check ${originCity} airport connections)
   - Avoid suggesting remote islands or exotic locations unless budget > €1500

2. For European destinations (under 1500km from ${originCityName}):
   - Consider TRAIN alternatives: Eurostar, TGV, ICE depending on origin city
   - Consider BUS alternatives: FlixBus, BlaBlaBus serve most European capitals
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