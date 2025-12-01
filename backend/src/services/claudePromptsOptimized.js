// backend/src/services/claudePromptsOptimized.js
// Optimized Claude prompts for WITH and WITHOUT destination scenarios

import { getSeasonalInsights } from './seasonalityService.js';

/**
 * Generate itinerary prompt for WITH DESTINATION scenario
 * Backend has already found flights, hotel, and calculated budget
 * Claude focuses on personalized day-by-day itinerary generation
 */
export function generateItineraryWithDestination({
  // User profile
  userProfile,

  // Real travel data from Air Scraper
  destination,
  origin,
  dates,
  flight,
  hotel,
  budget,
}) {
  // Extract user preferences safely from nested structure
  const interests = userProfile.basic?.activities || userProfile.preferences?.interests || [];
  const travelPace = userProfile.preferences?.travelPace || 'balanced';
  const budgetLevel = userProfile.basic?.budgetLevel || 'moderate';
  const accessibility = userProfile.preferences?.accessibility;
  const climate = userProfile.preferences?.climate;

  return {
    role: 'user',
    content: `You are a travel expert creating a personalized ${dates.duration}-day itinerary for ${destination.name}.

## Trip Details (CONFIRMED & REAL DATA)

**Dates:** ${dates.departure} to ${dates.return} (${dates.duration} days)

**Outbound Flight:**
- ${flight.outbound.carrier}
- Departure: ${flight.outbound.departure} from ${origin.name} (${flight.outbound.origin})
- Arrival: ${flight.outbound.arrival} at ${destination.name} (${flight.outbound.destination})
- Duration: ${Math.floor(flight.outbound.duration / 60)}h ${flight.outbound.duration % 60}min
- ${flight.outbound.stops === 0 ? 'Direct flight' : `${flight.outbound.stops} stop(s)`}
- Cost: €${flight.totalCost}

${flight.return ? `**Return Flight:**
- ${flight.return.carrier}
- Departure: ${flight.return.departure} from ${destination.name}
- Arrival: ${flight.return.arrival} at ${origin.name}
- Duration: ${Math.floor(flight.return.duration / 60)}h ${flight.return.duration % 60}min
- ${flight.return.stops === 0 ? 'Direct flight' : `${flight.return.stops} stop(s)`}` : ''}

**Accommodation:**
- ${hotel.name} (${hotel.stars}★)
- ${hotel.totalNights} nights × €${hotel.pricePerNight} = €${hotel.totalPrice}
- Location: ${hotel.location}${hotel.distanceToCenter ? ` (${hotel.distanceToCenter} from center)` : ''}
- Amenities: ${(hotel.amenities || []).join(', ')}

**Budget Breakdown:**
- Total trip budget: €${budget.total}
- Flights: €${budget.flight} ✅
- Hotel: €${budget.hotel} ✅
- **Available for activities/meals/transport: €${budget.remaining}**
- Suggested daily budget: €${budget.dailyActivities}

## Traveler Profile

**Interests:** ${interests.length > 0 ? interests.join(', ') : 'Culture, Food, Local experiences'}
**Travel Pace:** ${travelPace}
**Budget Level:** ${budgetLevel}
**Climate Preference:** ${climate || 'No preference'}
${accessibility ? `**Accessibility Needs:** ${accessibility}` : ''}

## Your Task

Create a detailed, personalized day-by-day itinerary that:

### 1. **Realistic Timing**
- **Day 1:** Activities start AFTER flight arrival (${flight.outbound.arrival})
  - Account for: immigration (~30min), baggage (~20min), airport → hotel transfer (~45min)
  - First activity should start around ${calculateFirstActivityTime(flight.outbound.arrival)}
  - Suggest evening activities near the hotel given arrival fatigue

- **Day ${dates.duration}:** Wrap up activities 3 hours before departure (${flight.return?.departure || 'TBD'})
  - Morning activities only
  - Hotel → airport transfer timing

### 2. **Budget Allocation (€${budget.remaining} total)**
Allocate approximately:
- Meals: €${Math.round(budget.remaining * 0.35)} (€${Math.round((budget.remaining * 0.35) / dates.duration)}/day)
  - Breakfast: €8-12 (if not included in hotel)
  - Lunch: €${budgetLevel === 'budget' ? '10-15' : budgetLevel === 'luxury' ? '30-50' : '15-25'}
  - Dinner: €${budgetLevel === 'budget' ? '15-20' : budgetLevel === 'luxury' ? '50-80' : '25-40'}
- Activities/Entrance Fees: €${Math.round(budget.remaining * 0.45)} total
- Local Transport: €${Math.round(budget.remaining * 0.10)} total
- Buffer/Spontaneous: €${Math.round(budget.remaining * 0.10)}

### 3. **Personalization**
Match activities to traveler's profile:
- ${interests.includes('culture') ? '70% cultural sites (museums, historical landmarks, local neighborhoods)' : ''}
- ${interests.includes('food') ? '30% food experiences (local markets, cooking classes, food tours)' : ''}
- ${interests.includes('beach') ? 'Include beach time and water activities' : ''}
- ${interests.includes('nature') ? 'Include parks, hikes, and natural attractions' : ''}
- ${interests.includes('adventure') ? 'Include active/adventurous experiences' : ''}
- ${interests.includes('shopping') ? 'Include markets and shopping districts' : ''}

Travel Pace: ${travelPace === 'slow' ? '2-3 activities per day with downtime' : travelPace === 'fast' ? '5-6 activities per day, packed schedule' : '3-4 activities per day, balanced'}

${accessibility ? `Accessibility: Ensure all suggested activities are ${accessibility}-accessible` : ''}

### 4. **Mix of Experiences**
- 60% iconic must-sees
- 30% local/authentic experiences
- 10% unexpected "hidden gems"
- Include at least 2 off-the-beaten-path discoveries

### 5. **Practical Details**
- Walking distances and transport between activities
- Opening hours and reservation recommendations
- Money-saving tips specific to ${destination.name}
- Local customs and etiquette

## Output Format

Return ONLY valid JSON (no markdown, no code blocks):

{
  "destination": "${destination.name}",
  "duration": ${dates.duration},
  "totalBudget": ${budget.total},
  "itinerary": {
    "day1": {
      "title": "Arrival & Evening Exploration",
      "morning": null,
      "afternoon": "Flight arrives ${flight.outbound.arrival}. Airport → hotel transfer (~45min). Check-in at ${hotel.name}. Rest and freshen up.",
      "evening": "Gentle evening walk to [specific area]. Dinner at [specific restaurant]. Estimated €35.",
      "meals": {
        "breakfast": null,
        "lunch": "In-flight or airport (€15)",
        "dinner": "[Restaurant name] - [Cuisine type] - €25"
      },
      "activities": [
        {
          "time": "${calculateFirstActivityTime(flight.outbound.arrival)}",
          "activity": "Arrival and hotel check-in",
          "duration": "2 hours",
          "cost": 0,
          "transport": "Airport taxi/train - €25"
        },
        {
          "time": "19:00",
          "activity": "[Evening activity]",
          "duration": "2 hours",
          "cost": 0,
          "transport": "Walking"
        }
      ],
      "estimatedCost": 60,
      "tips": ["Tip 1", "Tip 2"]
    },
    "day2": {
      "title": "[Thematic day title]",
      "morning": "...",
      "afternoon": "...",
      "evening": "...",
      "meals": { "breakfast": "...", "lunch": "...", "dinner": "..." },
      "activities": [
        {
          "time": "09:00",
          "activity": "[Activity name]",
          "duration": "2 hours",
          "cost": 15,
          "transport": "Metro - €2"
        }
      ],
      "estimatedCost": 70,
      "tips": ["Tip"]
    }
    // ... more days
  },
  "budgetBreakdown": {
    "flights": ${budget.flight},
    "hotel": ${budget.hotel},
    "meals": 245,
    "activities": 180,
    "transport": 65,
    "buffer": 20,
    "total": ${budget.total}
  },
  "highlights": [
    "Must-see: [Specific landmark]",
    "Hidden gem: [Specific place]",
    "Food experience: [Specific dish/restaurant]",
    "Local tip: [Specific insider advice]"
  ],
  "practicalTips": [
    "Airport transfer: [Best option with price and time]",
    "Local transport: [How to get around, card/pass recommendations]",
    "Money-saving: [Specific ways to save in this destination]",
    "Best times: [When to visit attractions to avoid crowds]",
    "Safety: [Any important safety or scam warnings]"
  ]
}`,
  };
}

/**
 * Generate recommendation prompt for WITHOUT DESTINATION scenario
 * Backend has selected a destination and found real flights/hotel
 * Claude creates a compelling pitch for this specific destination
 */
export function generateDestinationRecommendation({
  // User profile
  userProfile,

  // Destination selected by backend
  destination,
  origin,

  // Real travel data
  dates,
  flight,
  hotel,
  budget,

  // Context
  alternativeDestinations = [], // The other 2 options being generated in parallel
}) {
  // Extract user preferences safely from nested structure
  const interests = userProfile.basic?.activities || userProfile.preferences?.interests || [];
  const travelPace = userProfile.preferences?.travelPace || 'balanced';
  const budgetLevel = userProfile.basic?.budgetLevel || 'moderate';
  const climate = userProfile.preferences?.climate;
  const avoidCrowds = userProfile.preferences?.avoidCrowds || false;

  // Get seasonal insights for this trip
  const seasonalInsights = getSeasonalInsights(destination.name, dates.departure, {
    avoidCrowds,
    climate,
    budgetLevel,
  });

  return {
    role: 'user',
    content: `You are a travel expert presenting ${destination.name} as a ${dates.duration}-day trip option.

## Your Goal
Create a compelling, personalized recommendation that makes the traveler excited about ${destination.name}.

## Trip Snapshot (${dates.duration} days)

**Flight:**
- ${flight.outbound.carrier}: ${flight.outbound.departure.split('T')[1].slice(0, 5)} → ${flight.outbound.arrival.split('T')[1].slice(0, 5)} on ${dates.departure}
- ${flight.outbound.stops === 0 ? '✈️ Direct flight' : `${flight.outbound.stops} stop(s)`} • ${Math.floor(flight.outbound.duration / 60)}h ${flight.outbound.duration % 60}min
- Return: ${flight.return ? flight.return.departure.split('T')[1].slice(0, 5) : 'TBD'} on ${dates.return}
- **€${flight.totalCost}** round-trip

**Suggested Hotel:**
- ${hotel.name} (${hotel.stars}★)
- ${hotel.location}${hotel.distanceToCenter ? ` • ${hotel.distanceToCenter} from center` : ''}
- €${hotel.pricePerNight}/night × ${hotel.totalNights} nights = **€${hotel.totalPrice}**

**Budget:**
- Flights: €${budget.flight}
- Hotel: €${budget.hotel}
- **Available for experiences: €${budget.remaining}**
- Daily budget: ~€${budget.dailyActivities}

## Traveler Profile

**Loves:** ${interests.length > 0 ? interests.join(', ') : 'Culture, Food, Local experiences'}
**Travel Style:** ${travelPace} pace • ${budgetLevel} budget
**Climate Preference:** ${climate || 'Flexible'}
${avoidCrowds ? '**Important:** This traveler wants to AVOID CROWDS' : ''}

## Seasonal Context for ${destination.name} in ${seasonalInsights.monthName}

**Season:** ${seasonalInsights.season.charAt(0).toUpperCase() + seasonalInsights.season.slice(1)}
**Weather:** ${seasonalInsights.weather.temp} - ${seasonalInsights.weather.description}
**Crowds:** ${seasonalInsights.crowds.description}
**Pricing:** ${seasonalInsights.pricing.description}
${seasonalInsights.userMatch.length > 0 ? `\n**Perfect for this traveler:** ${seasonalInsights.userMatch.join(' • ')}` : ''}

## Your Task

Create a compelling trip recommendation that includes:

### 1. **Opening Hook (2-3 sentences)**
Start with an exciting, specific detail about ${destination.name} that connects to this traveler's interests (${interests.length > 0 ? interests.slice(0, 2).join(' and ') : 'culture and local experiences'}).

### 2. **Why Now (Timing-specific reasons)**
Explain why ${seasonalInsights.monthName} is THE perfect time to visit:
- **Season & Weather:** ${seasonalInsights.weather.description} at ${seasonalInsights.weather.temp} - How does this benefit their trip?
- **Crowds:** ${seasonalInsights.crowds.description} ${avoidCrowds ? '- EMPHASIZE this since traveler avoids crowds!' : ''}
- **Pricing:** ${seasonalInsights.pricing.description} - Specific money saved
- **Personal Match:** ${seasonalInsights.userMatch.length > 0 ? seasonalInsights.userMatch.join('; ') : 'How this timing matches their preferences'}

### 3. **Why ${destination.name} is Perfect for You (Destination-specific reasons)**
Personalized reasons based on their profile:
- **Vibe Match:** Their travel vibe is "${userProfile.basic?.style || travelPace}" - How does ${destination.name} deliver this?
${interests.length > 0 ? interests.map(int => `- **${int.charAt(0).toUpperCase() + int.slice(1)} Lovers:** Specific ${int} experiences in ${destination.name}`).join('\n') : '- **Culture Lovers:** Specific cultural experiences\n- **Food Lovers:** Specific culinary experiences'}
- **Budget Value:** €${budget.remaining} remaining = [Specific amazing things this enables]
- **Pace Alignment:** ${travelPace} pace = [How ${destination.name} perfectly fits - 2-3 activities/day or 5-6?]

### 4. **Day-by-Day Preview (Brief)**
Quick overview of each day (1-2 sentences per day):
- **Day 1:** Arrive ${flight.outbound.arrival.split('T')[1].slice(0, 5)}, evening [specific activity]
- **Day 2-${dates.duration - 1}:** Mix of [specific experiences]
- **Day ${dates.duration}:** Morning [activity], depart ${flight.return?.departure.split('T')[1].slice(0, 5) || 'afternoon'}

### 5. **Hidden Gem**
One off-the-beaten-path experience unique to ${destination.name} that matches their interests.

### 6. **Budget Breakdown Preview**
Show how €${budget.remaining} can be spent across ${dates.duration} days for an amazing trip.

## Output Format

Return ONLY valid JSON (no markdown, no code blocks):

{
  "destinationName": "${destination.name}",
  "tagline": "One compelling sentence (max 12 words)",
  "hook": "2-3 sentence opening that creates excitement and connects to traveler's interests (${interests.length > 0 ? interests.join(', ') : 'culture, food, local experiences'})",
  "whyNow": {
    "season": "${seasonalInsights.monthName} is ${seasonalInsights.isPeakSeason ? 'peak season' : 'off-season'} - [Explain why this timing is perfect]",
    "weather": "${seasonalInsights.weather.temp} - [How this weather benefits the traveler's plans]",
    "crowds": "${seasonalInsights.crowds.description} - ${avoidCrowds ? '[Emphasize low crowds since traveler avoids them]' : '[Mention crowd level matter-of-factly]'}",
    "pricing": "${seasonalInsights.pricing.description} - [Specific savings or value at this time]",
    "personalMatch": "${seasonalInsights.userMatch.length > 0 ? seasonalInsights.userMatch[0] : '[How this timing matches their preferences]'}"
  },
  "whyThisDestination": {
    "vibeMatch": "[How ${destination.name} matches their '${userProfile.basic?.style || travelPace}' vibe from the form]",
    "activities": [
      ${interests.length > 0 ? interests.map(int => `"${int.charAt(0).toUpperCase() + int.slice(1)} lovers: [Specific ${int} experience in ${destination.name}]"`).join(',\n      ') : '"Culture: [Specific cultural experience]",\n      "Food: [Specific culinary experience]"'}
    ],
    "budgetValue": "Your €${budget.total} budget breakdown: €${budget.flight} flights + €${budget.hotel} hotel = €${budget.remaining} for [Specific amazing experiences this enables]",
    "paceAlignment": "${travelPace} pace means [How ${destination.name} perfectly fits this pace - specific examples]",
    "hiddenBenefit": "[One unexpected benefit of ${destination.name} for this specific traveler profile]"
  },
  "whyYoullLoveIt": [
    "Interest match: [Specific reason for ${interests[0] || 'culture'}]",
    "Interest match: [Specific reason for ${interests[1] || interests[0] || 'food'}]",
    "Value: [Specific way €${budget.remaining} goes far here]",
    "Experience: [Unique thing only possible here]",
    "Vibe: [Why the atmosphere/culture matches their style]"
  ],
  "dayByDayPreview": [
    "Day 1: Arrive in the evening (${flight.outbound.arrival.split('T')[1].slice(0, 5)}), [specific evening activity]",
    "Day 2: [Specific experiences]",
    "Day 3: [Specific experiences]"
    // ... for each day
  ],
  "hiddenGem": {
    "name": "[Specific place/experience]",
    "description": "Why it's special and perfect for this traveler",
    "estimatedCost": 25
  },
  "budgetPreview": {
    "activities": "€${Math.round(budget.remaining * 0.45)} - [Examples: specific activities with costs]",
    "food": "€${Math.round(budget.remaining * 0.35)} - [Examples: specific restaurants/experiences]",
    "transport": "€${Math.round(budget.remaining * 0.10)} - [Specific transport advice]",
    "highlight": "[One specific experience this budget enables]"
  },
  "perfectFor": [
    "[Interest 1] lovers",
    "[Interest 2] enthusiasts",
    "${travelPace}-paced travelers",
    "${budgetLevel} budget travelers"
  ],
  "tripCost": {
    "flights": ${budget.flight},
    "hotel": ${budget.hotel},
    "experiences": ${budget.remaining},
    "total": ${budget.total}
  },
  "comparedTo": {
    "alternatives": ${JSON.stringify(alternativeDestinations)},
    "advantage": "Why ${destination.name} stands out vs ${alternativeDestinations.join(' and ')} for THIS specific traveler"
  },
  "bookingDetails": {
    "flight": {
      "outbound": "${dates.departure} at ${flight.outbound.departure.split('T')[1].slice(0, 5)}",
      "return": "${dates.return} at ${flight.return?.departure.split('T')[1].slice(0, 5) || 'TBD'}",
      "carrier": "${flight.outbound.carrier}",
      "price": ${flight.totalCost}
    },
    "hotel": {
      "name": "${hotel.name}",
      "stars": ${hotel.stars},
      "pricePerNight": ${hotel.pricePerNight},
      "nights": ${hotel.totalNights},
      "total": ${hotel.totalPrice}
    }
  }
}`,
  };
}

/**
 * Helper: Calculate when first activity can start after flight arrival
 */
function calculateFirstActivityTime(arrivalTime) {
  const arrival = new Date(arrivalTime);
  // Add 90 minutes (immigration + baggage + transfer)
  arrival.setMinutes(arrival.getMinutes() + 90);
  return arrival.toISOString().split('T')[1].slice(0, 5); // Return HH:MM format
}

export default {
  generateItineraryWithDestination,
  generateDestinationRecommendation,
};
