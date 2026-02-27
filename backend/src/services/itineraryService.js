// backend/src/services/itineraryService.js
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate a personalized day-by-day itinerary with connections and timing
 * @param {Object} tripData - Trip destination data
 * @param {Object} userProfile - User preferences
 * @param {string} userName - User's first name
 * @param {Array} members - Trip members
 * @returns {Promise<Array>} Daily itinerary
 */
export async function generatePersonalizedItinerary(tripData, userProfile, userName, members = []) {
  const { city, country, startDate, endDate, suggestedActivities, flightDetails, hotelDetails } = tripData;

  console.log('📅 Generating itinerary for:', { city, country, startDate, endDate });
  console.log('🎯 Activities to include:', suggestedActivities?.length || 0);
  console.log('✈️  Flight details available:', !!flightDetails);
  console.log('🏨 Hotel details available:', !!hotelDetails);

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  // Calculate group size - use explicit travelers count or fallback to members
  const explicitTravelers = userProfile?.travelers || 1;
  const memberCount = Math.max(explicitTravelers, members.length + 1);

  // Build group description
  let groupText = `for ${userName}`;
  if (memberCount > 1) {
    if (userProfile?.tripType === 'couple') {
      groupText = `for ${userName} and their partner (romantic couple trip)`;
    } else if (userProfile?.tripType === 'family') {
      groupText = `for ${userName}'s family (${memberCount} people)`;
    } else if (userProfile?.tripType === 'friends') {
      groupText = `for ${userName} and ${memberCount - 1} friend${memberCount > 2 ? 's' : ''}`;
    } else {
      groupText = `for ${userName} and ${memberCount - 1} companion${memberCount > 2 ? 's' : ''}`;
    }
  }

  // User's custom request is the most important context
  const customRequestText = userProfile?.travelVibeDescription
    ? `\n🎯 USER'S SPECIFIC REQUEST: "${userProfile.travelVibeDescription}"\n   ↳ Make sure the itinerary directly addresses what the user asked for!`
    : '';

  // Trip type context
  const tripTypeContext = userProfile?.tripType
    ? `\nTrip type: ${userProfile.tripType}${
        userProfile.tripType === 'couple' ? ' → Prioritize romantic experiences, intimate dinners, couples activities' :
        userProfile.tripType === 'family' ? ' → Prioritize kid-friendly activities, family restaurants, safe areas' :
        userProfile.tripType === 'friends' ? ' → Prioritize group activities, social experiences, fun venues' :
        ''
      }`
    : '';

  const activitiesText = suggestedActivities?.length > 0
    ? suggestedActivities.map(a => `- ${a.name} (${a.category || 'activity'}, ${a.duration || '2h'}, €${a.estimatedPrice || a.price || 0})`).join('\n')
    : 'Activities based on user preferences';

  // Build flight info section for the prompt
  let flightInfoText = '';
  if (flightDetails) {
    const outbound = flightDetails.outbound || flightDetails;
    const returnFlight = flightDetails.return || flightDetails.inbound;
    flightInfoText = `
FLIGHT INFORMATION (REAL DATA):
- Outbound: ${outbound?.departure || 'N/A'} → ${outbound?.arrival || city}
  - Departure: ${outbound?.departureTime || startDate}
  - Arrival: ${outbound?.arrivalTime || 'morning'}
  - Airline: ${flightDetails.airline || outbound?.airline || 'N/A'}
  - Duration: ${flightDetails.duration || outbound?.duration || 'N/A'}
${returnFlight ? `- Return: ${returnFlight?.departure || city} → ${returnFlight?.arrival || 'origin'}
  - Departure: ${returnFlight?.departureTime || endDate}` : ''}
- Total flight cost: €${flightDetails.totalCost || flightDetails.price || 'N/A'}`;
  }

  // Build hotel info section for the prompt
  let hotelInfoText = '';
  if (hotelDetails) {
    hotelInfoText = `
HOTEL INFORMATION (REAL DATA):
- Hotel: ${hotelDetails.name || 'Booked accommodation'}
- Location: ${hotelDetails.location || hotelDetails.address || city}
- Check-in: ${hotelDetails.checkIn || startDate}
- Check-out: ${hotelDetails.checkOut || endDate}
- Rating: ${hotelDetails.rating || hotelDetails.stars || 'N/A'} stars
- Price per night: €${hotelDetails.pricePerNight || Math.round((hotelDetails.totalPrice || 0) / Math.max(days - 1, 1))}
- Total hotel cost: €${hotelDetails.totalPrice || hotelDetails.price || 'N/A'}
${hotelDetails.amenities ? `- Amenities: ${Array.isArray(hotelDetails.amenities) ? hotelDetails.amenities.join(', ') : hotelDetails.amenities}` : ''}`;
  }

  const personalityText = userProfile?.personality
    ? `Traveler personality: ${userProfile.personality} (${
        userProfile.personality === 'routard' ? 'backpacker style - authentic, budget-conscious' :
        userProfile.personality === 'explorateur' ? 'explorer style - curious, discovery-focused' :
        userProfile.personality === 'confort' ? 'comfort style - quality and relaxation' :
        'luxury style - premium experiences'
      })`
    : '';

  const prompt = `You are a local travel expert creating a PERSONALIZED day-by-day itinerary ${groupText} visiting ${city}, ${country}.
${customRequestText}

TRIP DETAILS:
- Dates: ${startDate} to ${endDate} (${days} days)
- City: ${city}, ${country}
- Group size: ${memberCount} traveler${memberCount > 1 ? 's' : ''}
${personalityText}${tripTypeContext}
- User preferences: ${userProfile?.topActivities?.join(', ') || 'various activities'}
- Budget per person: €${userProfile?.budget || 1500}
${flightInfoText}
${hotelInfoText}

SUGGESTED ACTIVITIES TO INCLUDE:
${activitiesText}

MISSION: Create a REALISTIC, PRACTICAL itinerary with:
1. **Exact timing** for each activity (e.g., "9:00 AM - 11:30 AM")
2. **Transportation details** between locations (walk 10 min, metro line 2, taxi €8, etc.)
3. **Meal breaks** (breakfast, lunch, dinner) with restaurant suggestions
4. **Rest periods** - don't overschedule! Include downtime
5. **Personalization** - match ${userName}'s personality and preferences
6. **Local insider tips** - hidden gems, best viewpoints, timing to avoid crowds

STRUCTURE EACH DAY AS:
{
  "day": 1,
  "date": "${startDate}",
  "theme": "Arrival & City Discovery",
  "schedule": [
    {
      "time": "9:00 AM",
      "duration": "2.5h",
      "activity": "Walking tour of Old Town",
      "type": "Culture",
      "location": "Historic Center",
      "transport": "Walk from hotel (10 min)",
      "cost": 0,
      "tips": "Start early to avoid crowds. Best photos from Cathedral steps.",
      "forWho": "Perfect for ${userName}"
    },
    {
      "time": "11:30 AM",
      "duration": "1.5h",
      "activity": "Lunch at Café Local",
      "type": "Food",
      "location": "Main Square",
      "transport": "Walk (5 min)",
      "cost": 15,
      "tips": "Try the traditional dish. Outdoor seating has best atmosphere."
    }
  ],
  "totalCost": 50,
  "walkingDistance": "5km",
  "highlights": ["Old Town architecture", "Local cuisine"]
}

IMPORTANT RULES:
1. Day 1: Include arrival logistics (airport transfer to hotel, check-in time, first meal)
   ${flightDetails ? `- Use REAL flight arrival time to plan Day 1 (arriving ${flightDetails.outbound?.arrivalTime || 'morning'})` : '- Assume morning arrival'}
   ${hotelDetails ? `- Hotel check-in at ${hotelDetails.name || 'hotel'}: typically 3 PM but can store luggage earlier` : ''}
2. Last day: Include checkout time (usually 11 AM), departure logistics, airport timing
   ${flightDetails?.return ? `- Return flight departs at ${flightDetails.return?.departureTime || 'evening'} - plan accordingly!` : ''}
3. Include REALISTIC transport times (walking, metro, taxi with estimated costs)
4. Budget breakdown per day (stay under €${userProfile?.budget || 1500} total)
5. Mix free and paid activities
6. Include meal breaks (breakfast, lunch, dinner) with SPECIFIC restaurant suggestions near activities
7. Add personal touches referencing ${userName} and their preferences
8. Include "insider tips" for each major activity
9. Pace appropriately - don't exhaust travelers!
10. Consider ${userProfile?.idealRhythm || 'balanced'} rhythm preference
11. Include AIRPORT TRANSFER options with prices (taxi, metro, bus, Uber estimate)

PERSONALIZATION FOR ${userName}:
- Address them directly in tips ("${userName}, you'll love...")
- Reference their travel personality
- Match activity intensity to their preferences
- Include activities from the suggested list
${memberCount > 1 ? `- Suggest group-friendly activities for ${memberCount} people` : ''}

OUTPUT: JSON array of ${days} days only, no markdown, no code blocks.`;

  try {
    console.log('🤖 Calling Claude API for itinerary generation...');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000, // Increased for detailed multi-day itineraries
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    console.log('✅ Claude API response received');

    let response = message.content[0].text.trim();
    console.log('📝 Response preview:', response.substring(0, 200) + '...');

    // Strip markdown code blocks if present
    if (response.startsWith('```')) {
      console.log('⚠️  Detected markdown wrapper, stripping...');
      response = response.replace(/^```(?:json)?\n?/g, '').replace(/\n?```$/g, '').trim();
    }

    const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);

    if (!jsonMatch) {
      console.error('❌ Failed to parse itinerary JSON');
      console.error('Response was:', response);
      return null;
    }

    const itinerary = JSON.parse(jsonMatch[0]);
    console.log(`✅ Generated ${itinerary.length} days of itinerary`);

    return itinerary;
  } catch (error) {
    console.error('❌ Error generating itinerary:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

/**
 * Generate packing list based on itinerary activities and weather
 * @param {Array} itinerary - Generated itinerary with activities
 * @param {Object} weatherData - Weather forecast data
 * @param {Object} tripData - Trip destination info
 * @returns {Object} Packing recommendations
 */
/**
 * Generate itinerary day by day with streaming
 * @param {Object} tripData - Trip destination data
 * @param {Object} userProfile - User preferences
 * @param {string} userName - User's first name
 * @param {Array} members - Trip members
 * @param {Function} onDay - Callback called when a day is generated
 * @returns {Promise<Array>} Complete itinerary array
 */
export async function generateItineraryStreaming(tripData, userProfile, userName, members = [], onDay) {
  const { city, country, startDate, endDate, suggestedActivities, flightDetails, hotelDetails } = tripData;

  console.log('📅 [STREAMING] Generating itinerary for:', { city, country, startDate, endDate });

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  // Calculate group size - use explicit travelers count or fallback to members
  const explicitTravelers = userProfile?.travelers || 1;
  const memberCount = Math.max(explicitTravelers, members.length + 1);

  // Build group description
  let groupText = `for ${userName}`;
  if (memberCount > 1) {
    if (userProfile?.tripType === 'couple') {
      groupText = `for ${userName} and their partner (romantic couple trip)`;
    } else if (userProfile?.tripType === 'family') {
      groupText = `for ${userName}'s family (${memberCount} people)`;
    } else if (userProfile?.tripType === 'friends') {
      groupText = `for ${userName} and ${memberCount - 1} friend${memberCount > 2 ? 's' : ''}`;
    } else {
      groupText = `for ${userName} and ${memberCount - 1} companion${memberCount > 2 ? 's' : ''}`;
    }
  }

  const activitiesText = suggestedActivities?.length > 0
    ? suggestedActivities.map(a => `- ${a.name} (${a.category || 'activity'}, ${a.duration || '2h'}, €${a.estimatedPrice || a.price || 0})`).join('\n')
    : 'Activities based on user preferences';

  // Build flight and hotel info
  let flightInfoText = '';
  if (flightDetails) {
    const outbound = flightDetails.outbound || flightDetails;
    const returnFlight = flightDetails.return || flightDetails.inbound;
    flightInfoText = `
FLIGHT INFORMATION:
- Outbound: ${outbound?.departure || 'N/A'} → ${outbound?.arrival || city}
  - Departure: ${outbound?.departureTime || startDate}
  - Arrival: ${outbound?.arrivalTime || 'morning'}
- Total flight cost: €${flightDetails.totalCost || flightDetails.price || 'N/A'}`;
  }

  let hotelInfoText = '';
  if (hotelDetails) {
    hotelInfoText = `
HOTEL INFORMATION:
- Hotel: ${hotelDetails.name || 'Booked accommodation'}
- Location: ${hotelDetails.location || hotelDetails.address || city}
- Check-in: ${hotelDetails.checkIn || startDate}
- Check-out: ${hotelDetails.checkOut || endDate}`;
  }

  // Build comprehensive user context
  const personalityText = userProfile?.personality
    ? `Traveler personality: ${userProfile.personality}`
    : '';

  // User's custom request is the most important context
  const customRequestText = userProfile?.travelVibeDescription
    ? `\n🎯 USER'S SPECIFIC REQUEST: "${userProfile.travelVibeDescription}"\n   ↳ This is what the user REALLY wants - make sure activities match this!`
    : '';

  // Trip type context
  const tripTypeText = userProfile?.tripType
    ? `Trip type: ${userProfile.tripType}${
        userProfile.tripType === 'couple' ? ' (prioritize romantic experiences, intimate dinners, couples activities)' :
        userProfile.tripType === 'family' ? ' (prioritize kid-friendly activities, family restaurants, safe areas)' :
        userProfile.tripType === 'friends' ? ' (prioritize group activities, social experiences, fun nightlife)' :
        ''
      }`
    : '';

  // Why travel and main goal context
  const motivationText = userProfile?.whyTravel || userProfile?.mainGoal
    ? `Motivation: ${userProfile.whyTravel || ''} ${userProfile.mainGoal ? `(Goal: ${userProfile.mainGoal})` : ''}`
    : '';

  const itinerary = [];

  // Generate each day one by one
  for (let dayNum = 1; dayNum <= days; dayNum++) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + dayNum - 1);
    const dateStr = currentDate.toISOString().split('T')[0];

    const isFirstDay = dayNum === 1;
    const isLastDay = dayNum === days;

    const dayPrompt = `You are creating DAY ${dayNum} of a ${days}-day trip ${groupText} to ${city}, ${country}.
Date: ${dateStr}

TRAVELER PROFILE:
${personalityText}
${tripTypeText}
${motivationText}
Group size: ${memberCount} traveler${memberCount > 1 ? 's' : ''}
${customRequestText}

${isFirstDay ? `This is ARRIVAL day. ${flightInfoText}` : ''}
${isLastDay ? 'This is DEPARTURE day - include checkout and airport transfer.' : ''}
${hotelInfoText}

Activities to possibly include: ${activitiesText}

Create a SINGLE day schedule with 4-6 activities. Return ONLY valid JSON (no markdown):
{
  "day": ${dayNum},
  "date": "${dateStr}",
  "theme": "Short theme (3-4 words)",
  "schedule": [
    {
      "time": "HH:MM AM/PM",
      "duration": "Xh",
      "activity": "Activity name",
      "type": "Culture|Food|Nature|Adventure|Relaxation",
      "location": "Location name",
      "transport": "How to get there",
      "cost": 0,
      "tips": "One sentence tip for ${userName}"
    }
  ],
  "totalCost": 50,
  "walkingDistance": "5km",
  "highlights": ["highlight1", "highlight2"]
}`;

    try {
      console.log(`🤖 [STREAMING] Generating day ${dayNum}/${days}...`);

      const message = await client.messages.create({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [{ role: 'user', content: dayPrompt }]
      });

      let response = message.content[0].text.trim();

      // Strip markdown if present
      if (response.startsWith('```')) {
        response = response.replace(/^```(?:json)?\n?/g, '').replace(/\n?```$/g, '').trim();
      }

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const dayData = JSON.parse(jsonMatch[0]);
        itinerary.push(dayData);

        // Call the callback with the day data
        if (onDay) {
          onDay(dayData, dayNum, days);
        }
        console.log(`✅ [STREAMING] Day ${dayNum} completed`);
      }
    } catch (error) {
      console.error(`❌ [STREAMING] Error generating day ${dayNum}:`, error.message);
      // Send error but continue with other days
      if (onDay) {
        onDay({ day: dayNum, date: dateStr, theme: 'Error generating day', schedule: [], error: true }, dayNum, days);
      }
    }
  }

  return itinerary;
}

export function generatePackingFromItinerary(itinerary, weatherData, tripData) {
  // Extract all activity types from itinerary
  const activityTypes = new Set();
  itinerary?.forEach(day => {
    day.schedule?.forEach(activity => {
      if (activity.type) {
        activityTypes.add(activity.type.toLowerCase());
      }
    });
  });

  console.log('📦 Generating packing for activities:', [...activityTypes]);

  // Base essentials
  const essentials = [
    'Passport & travel documents',
    'Phone & charger',
    'Wallet & cards',
    'Travel insurance docs',
    'Medications',
  ];

  // Clothing based on weather
  const clothing = ['Underwear (1 per day + extra)', 'Socks'];

  if (weatherData?.forecast) {
    const avgTemp = weatherData.forecast.reduce((acc, d) => acc + (d.day?.avgtemp_c || 20), 0) / weatherData.forecast.length;
    const hasRain = weatherData.forecast.some(d => d.day?.daily_chance_of_rain > 40);

    if (avgTemp < 15) {
      clothing.push('Warm jacket', 'Sweaters/layers', 'Long pants');
    } else if (avgTemp < 25) {
      clothing.push('Light jacket', 'Mix of shorts & pants', 'Light layers');
    } else {
      clothing.push('Light clothing', 'Shorts', 'T-shirts', 'Sunhat');
    }

    if (hasRain) {
      clothing.push('Rain jacket or umbrella');
    }
  } else {
    clothing.push('Versatile layers', 'Light jacket');
  }

  // Activity-based items
  const activityItems = [];

  if (activityTypes.has('culture') || activityTypes.has('museum') || activityTypes.has('sightseeing')) {
    activityItems.push('Comfortable walking shoes');
  }
  if (activityTypes.has('beach') || activityTypes.has('swimming') || activityTypes.has('pool')) {
    activityItems.push('Swimsuit', 'Beach towel', 'Sandals', 'Sunscreen SPF 50');
  }
  if (activityTypes.has('hiking') || activityTypes.has('nature') || activityTypes.has('outdoor')) {
    activityItems.push('Hiking shoes', 'Daypack', 'Water bottle', 'Sunscreen');
  }
  if (activityTypes.has('nightlife') || activityTypes.has('dinner') || activityTypes.has('restaurant')) {
    activityItems.push('Smart casual outfit', 'Nice shoes');
  }
  if (activityTypes.has('sport') || activityTypes.has('adventure')) {
    activityItems.push('Athletic wear', 'Sports shoes');
  }

  // Always add walking shoes if not already
  if (!activityItems.includes('Comfortable walking shoes') && !activityItems.includes('Hiking shoes')) {
    activityItems.push('Comfortable walking shoes');
  }

  // Optional nice-to-haves
  const optional = [
    'Book or e-reader',
    'Reusable shopping bag',
    'Snacks for travel',
    'Travel pillow',
  ];

  return {
    essentials,
    clothing,
    activityItems,
    optional,
    generatedAt: new Date().toISOString(),
    basedOnActivities: [...activityTypes],
  };
}
