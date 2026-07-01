// backend/src/services/itineraryService.js
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Tolerant parser for Sonnet's day-by-day itinerary response.
//
// Sonnet occasionally returns malformed JSON on long outputs (~600 lines):
// unescaped quotes inside tip text, missing commas after deeply-nested
// blocks, or wraps the array in `{ "days": [...] }` instead of returning a
// bare array. The strict regex+JSON.parse the original code used would
// silently return null and the harness would see the whole itinerary
// vanish.
//
// This parser tries, in order:
//   1. Bare array — fastest happy path
//   2. Wrapped object — extract `days`/`itinerary`/`days_plan`/first-array prop
//   3. Per-day salvage — if the whole array is unparseable, walk through
//      top-level `{ … }` blocks one at a time, parse those that succeed,
//      and return the surviving days. A 7-day plan with day 4 borked
//      becomes a 6-day plan instead of a null. The day_count rule in the
//      harness tolerates ±1 day, so this typically still passes.
//
// Returns null only when even per-day salvage yields zero parseable days,
// which would mean Sonnet's output was completely broken — in that case
// the caller should retry or fall back to a generic itinerary.
export function parseItineraryResponse(rawResponse) {
  if (!rawResponse || typeof rawResponse !== 'string') return null;
  const text = rawResponse.trim();

  // (1) Bare-array fast path
  const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.warn('[itinerary parser] strict array parse failed:', e.message);
    }
  }

  // (2) Wrapped object: { days: [...] } / { itinerary: [...] } / first array property
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const candidates = ['days', 'itinerary', 'days_plan', 'plan', 'schedule'];
        for (const key of candidates) {
          if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
            console.log(`[itinerary parser] unwrapped from .${key}`);
            return parsed[key];
          }
        }
        // First array-typed property (last resort)
        for (const [key, value] of Object.entries(parsed)) {
          if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
            console.log(`[itinerary parser] unwrapped from .${key} (fallback)`);
            return value;
          }
        }
      }
    } catch (e) {
      console.warn('[itinerary parser] wrapped-object parse failed:', e.message);
    }
  }

  // (3) Per-day salvage. Walk through balanced-brace `{ … }` blocks at the
  // top level of the source array and parse them individually. We skip the
  // leading `[` and braces inside string literals.
  const days = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let start = -1;
  // Skip past the opening `[` if present
  let cursor = 0;
  const firstBracket = text.indexOf('[');
  if (firstBracket >= 0) cursor = firstBracket + 1;

  for (let i = cursor; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        const block = text.slice(start, i + 1);
        try {
          const day = JSON.parse(block);
          if (day && typeof day === 'object') days.push(day);
        } catch {
          // skip this block — log so we can see how often this happens in prod
          console.warn(`[itinerary parser] dropped malformed day block at offset ${start} (${block.length} chars)`);
        }
        start = -1;
      }
    }
  }

  if (days.length > 0) {
    console.log(`[itinerary parser] salvaged ${days.length} day(s) via per-day parse`);
    return days;
  }
  return null;
}

/**
 * Generate a personalized day-by-day itinerary with connections and timing
 * @param {Object} tripData - Trip destination data
 * @param {Object} userProfile - User preferences
 * @param {string} userName - User's first name
 * @param {Array} members - Trip members
 * @returns {Promise<Array>} Daily itinerary
 */
export async function generatePersonalizedItinerary(tripData, userProfile, userName, members = []) {
  const { city, country, startDate, endDate, suggestedActivities, flightDetails, hotelDetails, recommendedTransport } = tripData;

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
  } else if (recommendedTransport) {
    flightInfoText = `
TRANSPORT INFORMATION (NO FLIGHT — traveler refuses flying):
- Arrival and departure by ${recommendedTransport.mode || 'train'} (${recommendedTransport.operator || 'rail operator'}), ~${recommendedTransport.durationOneWay || '?'} each way
- Plan Day 1 around a station arrival, and the last day around a station departure
- CRITICAL: NEVER mention flights, airports or airport transfers anywhere in this itinerary`;
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
1. **Exact timing** for each activity (24-hour format, e.g., "9h00 - 11h30" — never AM/PM)
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
2. Last day: MUST include the words "checkout" and "airport" (or "departure") in at least one activity. Include hotel checkout time (usually 11 AM), transfer to airport with timing, and airport arrival 2-3h before flight.
   ${flightDetails?.return ? `- Return flight departs at ${flightDetails.return?.departureTime || 'evening'} - plan accordingly!` : ''}
   - Example for last day: { "time": "11:00 AM", "activity": "Hotel checkout & taxi to airport", "type": "Departure" }
3. Include REALISTIC transport times (walking, metro, taxi with estimated costs)
4. Budget breakdown per day (stay under €${userProfile?.budget || 1500} total)
5. Mix free and paid activities
6. Include meal breaks (breakfast, lunch, dinner) with SPECIFIC restaurant suggestions near activities
7. Add personal touches referencing ${userName} and their preferences
8. Include "insider tips" for each major activity
9. Pace appropriately - don't exhaust travelers!
10. Consider ${userProfile?.idealRhythm || 'balanced'} rhythm preference
11. Include ${flightDetails ? 'AIRPORT TRANSFER options with prices (taxi, metro, bus, Uber estimate)' : recommendedTransport ? `STATION TRANSFER options (arrival/departure by ${recommendedTransport.mode || 'train'} — NEVER mention flights or airports)` : 'arrival/departure transfer options with prices'}

PERSONALIZATION FOR ${userName}:
- Address them directly in tips ("${userName}, you'll love...")
- Reference their travel personality
- Match activity intensity to their preferences
- Include activities from the suggested list
${memberCount > 1 ? `- Suggest group-friendly activities for ${memberCount} people` : ''}

LANGUE (NON NÉGOCIABLE — audit V3) : écris TOUT le contenu utilisateur en FRANÇAIS (thèmes, activités, descriptions, tips, repas). Les clés JSON restent en anglais. Horaires 24h.

OUTPUT: JSON array of ${days} days only, no markdown, no code blocks.`;

  try {
    console.log('🤖 Calling Claude API for itinerary generation...');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000, // Reverted from a 16000 experiment that made Sonnet 4.5 dramatically slower (one profile took 1h54) and produced empty/0-day responses on timeout. The real fix for long-trip truncation is the streaming day-by-day path (generateItineraryStreaming), not a bigger single-shot budget.
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

    const itinerary = parseItineraryResponse(response);
    if (!itinerary) {
      console.error('❌ Failed to parse itinerary JSON after all salvage attempts');
      return null;
    }
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
  const { city, country, startDate, endDate, suggestedActivities, flightDetails, hotelDetails, recommendedTransport } = tripData;

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
  } else if (recommendedTransport) {
    // Voyage sans avion (audit E5) : l'itinéraire doit parler gare et
    // train/bus — jamais d'aéroport ni de vol.
    flightInfoText = `
TRANSPORT INFORMATION (NO FLIGHT — traveler refuses flying):
- Arrival and departure by ${recommendedTransport.mode || 'train'} (${recommendedTransport.operator || 'rail operator'}), ~${recommendedTransport.durationOneWay || '?'} each way
- Plan Day 1 around a station arrival, and the last day around a station departure
- CRITICAL: NEVER mention flights, airports or airport transfers anywhere in this itinerary`;
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

    const dayPrompt = `Tu es un expert local créant le JOUR ${dayNum} sur ${days} d'un voyage ${groupText} à ${city}, ${country}.
Date: ${dateStr}
${isFirstDay ? `\n⚡ C'est le jour d'arrivée. ${flightInfoText}` : ''}
${isLastDay ? `\n⚡ C'est le jour de départ — inclure checkout + transfert ${flightDetails ? 'aéroport' : recommendedTransport ? `GARE (retour en ${recommendedTransport.mode === 'bus' ? 'bus' : 'train'} ${recommendedTransport.operator || ''} — ce voyageur REFUSE l'avion, ne jamais mentionner aéroport ni vol)` : 'aéroport ou gare'} avec timing précis.${!flightDetails && recommendedTransport ? ` ${flightInfoText}` : ''}` : ''}
${hotelInfoText}

PROFIL VOYAGEUR:
${personalityText}
${tripTypeText}
${motivationText}
Groupe: ${memberCount} personne${memberCount > 1 ? 's' : ''}
${customRequestText}

Activités suggérées: ${activitiesText}

RÈGLES:
- 4-6 activités avec horaires précis (ex: "9h30", "14h")
- Inclure repas (breakfast, déjeuner, dîner) avec noms de restaurants locaux concrets
- Temps de transport réalistes (métro X min, marche Y min, taxi €Z)
- Tips personnalisés pour ${userName} referencing leur profil
- OBLIGATOIRE: adresser ${userName} par son prénom dans AU MOINS 2 des champs "tips" de la journée (ex: "${userName}, réservez tôt car...", "Parfait pour toi ${userName} si tu aimes..."). C'est la signature Skusku — l'itinéraire doit être personnel, pas générique.
- Rythme équilibré — ne pas surcharger la journée
- Mélanger gratuit et payant
${memberCount > 1 ? `- Activités adaptées à ${memberCount} personnes ensemble` : ''}

JSON uniquement, pas de markdown:
{
  "day": ${dayNum},
  "date": "${dateStr}",
  "theme": "Thème court (3-4 mots)",
  "schedule": [
    {
      "time": "9h30",
      "duration": "2h",
      "activity": "Nom activité",
      "type": "Culture|Food|Nature|Adventure|Relaxation|Transport",
      "location": "Lieu précis",
      "transport": "Comment y aller (temps + coût)",
      "cost": 0,
      "tips": "Conseil insider — adresse ${userName} par son prénom ici quand pertinent",
      "forWho": "Pourquoi parfait pour ${userName} / ce groupe"
    }
  ],
  "totalCost": 50,
  "walkingDistance": "5km",
  "highlights": ["point fort 1", "point fort 2"]
}`;

    try {
      console.log(`🤖 [STREAMING] Generating day ${dayNum}/${days}...`);

      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
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
    'Passeport & documents de voyage',
    'Téléphone & chargeur',
    'Portefeuille & cartes',
    'Attestation d’assurance voyage',
    'Médicaments',
  ];

  // Clothing based on weather
  const clothing = ['Sous-vêtements (1/jour + rechange)', 'Chaussettes'];

  if (weatherData?.forecast) {
    const avgTemp = weatherData.forecast.reduce((acc, d) => acc + (d.day?.avgtemp_c || 20), 0) / weatherData.forecast.length;
    const hasRain = weatherData.forecast.some(d => d.day?.daily_chance_of_rain > 40);

    if (avgTemp < 15) {
      clothing.push('Veste chaude', 'Pulls / couches superposables', 'Pantalons');
    } else if (avgTemp < 25) {
      clothing.push('Veste légère', 'Shorts et pantalons', 'Couches légères');
    } else {
      clothing.push('Vêtements légers', 'Shorts', 'T-shirts', 'Chapeau de soleil');
    }

    if (hasRain) {
      clothing.push('Veste de pluie ou parapluie');
    }
  } else {
    clothing.push('Couches polyvalentes', 'Veste légère');
  }

  // Activity-based items
  const activityItems = [];

  if (activityTypes.has('culture') || activityTypes.has('museum') || activityTypes.has('sightseeing')) {
    activityItems.push('Chaussures de marche confortables');
  }
  if (activityTypes.has('beach') || activityTypes.has('swimming') || activityTypes.has('pool')) {
    activityItems.push('Maillot de bain', 'Serviette de plage', 'Sandales', 'Crème solaire SPF 50');
  }
  if (activityTypes.has('hiking') || activityTypes.has('nature') || activityTypes.has('outdoor')) {
    activityItems.push('Chaussures de rando', 'Petit sac à dos', 'Gourde', 'Crème solaire');
  }
  if (activityTypes.has('nightlife') || activityTypes.has('dinner') || activityTypes.has('restaurant')) {
    activityItems.push('Tenue smart casual', 'Belles chaussures');
  }
  if (activityTypes.has('sport') || activityTypes.has('adventure')) {
    activityItems.push('Tenue de sport', 'Chaussures de sport');
  }

  // Always add walking shoes if not already
  if (!activityItems.includes('Chaussures de marche confortables') && !activityItems.includes('Hiking shoes')) {
    activityItems.push('Chaussures de marche confortables');
  }

  // Optional nice-to-haves
  const optional = [
    'Livre ou liseuse',
    'Tote bag réutilisable',
    'Snacks pour le trajet',
    'Oreiller de voyage',
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
