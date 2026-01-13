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
 * Helper: Safely extract time from ISO datetime string
 * Returns 'TBD' if the value is undefined or invalid
 */
function safeTimeExtract(datetime) {
  if (!datetime || typeof datetime !== 'string') return 'TBD';
  try {
    if (datetime.includes('T')) {
      return datetime.split('T')[1].slice(0, 5);
    }
    // If it's already just a time or doesn't contain 'T'
    return datetime.slice(0, 5) || 'TBD';
  } catch {
    return 'TBD';
  }
}

/**
 * Generate recommendation prompt for WITHOUT DESTINATION scenario
 * OPTIMIZED: Simplified prompt for faster response (~10s instead of 60s)
 */
export function generateDestinationRecommendation({
  userProfile,
  destination,
  origin,
  dates,
  flight,
  hotel,
  budget,
  alternativeDestinations = [],
}) {
  const interests = userProfile.basic?.activities || [];
  const style = userProfile.basic?.style || 'explorer';

  // Get seasonal insights
  const seasonalInsights = getSeasonalInsights(destination.name, dates.departure, {
    avoidCrowds: userProfile.preferences?.avoidCrowds || false,
    climate: userProfile.preferences?.climate,
    budgetLevel: userProfile.basic?.budgetLevel || 'moderate',
  });

  return {
    role: 'user',
    content: `Generate a travel recommendation for ${destination.name}, ${destination.country || ''} (${dates.duration} days).

USER: ${style} traveler, loves ${interests.length > 0 ? interests.join(', ') : 'culture, nature'}
SEASON: ${seasonalInsights.monthName} - ${seasonalInsights.weather.description}

Return ONLY this JSON (no markdown):
{
  "tagline": "Max 10 words catchy phrase about ${destination.name}",
  "matchReason": "1-2 sentences why ${destination.name} matches this traveler. Be specific!",
  "seasonReason": "1 sentence about ${seasonalInsights.monthName} in ${destination.name}",
  "activities": [
    {
      "name": "Specific activity name with real place",
      "price": 25,
      "type": "culture|food|nature|nightlife|tour",
      "tip": "Optional insider tip or money-saving advice"
    }
  ],
  "budgetTips": "2-3 money-saving tips for ${destination.name} (cheap eats, free days, transport hacks)"
}

ACTIVITIES RULES:
- Generate 5-6 QUALITY activities only (no generic filler!)
- Would a LOCAL recommend this? Not just tourist traps!
- REAL prices in EUR reflecting ${destination.name}'s cost of living
- Required mix:
  * 2 FREE activities (viewpoints, markets, parks, free walking tours)
  * 2-3 paid but worth it (€10-50: museums, food tours)
  * 1 splurge-worthy experience if budget allows
- Add "tip" for activities where you know a money-saving trick or local secret
- Examples of good tips:
  * "Free entry first Sunday of month"
  * "Book online to skip €5 queue fee"
  * "Best at sunset, arrive 30min early for good spot"
  * "Skip the restaurant, eat at the market stalls for 1/3 price"`
  };
}

/**
 * Helper: Calculate when first activity can start after flight arrival
 */
function calculateFirstActivityTime(arrivalTime) {
  if (!arrivalTime) return '14:00'; // Default to 2 PM if no arrival time
  try {
    const arrival = new Date(arrivalTime);
    if (isNaN(arrival.getTime())) return '14:00'; // Invalid date
    // Add 90 minutes (immigration + baggage + transfer)
    arrival.setMinutes(arrival.getMinutes() + 90);
    return arrival.toISOString().split('T')[1].slice(0, 5); // Return HH:MM format
  } catch {
    return '14:00'; // Default fallback
  }
}

export default {
  generateItineraryWithDestination,
  generateDestinationRecommendation,
};
