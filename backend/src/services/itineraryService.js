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
  const { city, country, startDate, endDate, suggestedActivities } = tripData;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

  const memberCount = members.length + 1; // +1 for the user
  const groupText = memberCount > 1 ? `for ${userName} and ${memberCount - 1} friend${memberCount > 1 ? 's' : ''}` : `for ${userName}`;

  const activitiesText = suggestedActivities?.length > 0
    ? suggestedActivities.map(a => `- ${a.name} (${a.category}, ${a.duration}, €${a.estimatedPrice})`).join('\n')
    : 'Activities based on user preferences';

  const personalityText = userProfile?.personality
    ? `Traveler personality: ${userProfile.personality} (${
        userProfile.personality === 'routard' ? 'backpacker style - authentic, budget-conscious' :
        userProfile.personality === 'explorateur' ? 'explorer style - curious, discovery-focused' :
        userProfile.personality === 'confort' ? 'comfort style - quality and relaxation' :
        'luxury style - premium experiences'
      })`
    : '';

  const prompt = `You are a local travel expert creating a PERSONALIZED day-by-day itinerary ${groupText} visiting ${city}, ${country}.

TRIP DETAILS:
- Dates: ${startDate} to ${endDate} (${days} days)
- City: ${city}, ${country}
- Group size: ${memberCount} traveler${memberCount > 1 ? 's' : ''}
${personalityText}
- User preferences: ${userProfile?.topActivities?.join(', ') || 'various activities'}
- Budget per person: €${userProfile?.budget || 1500}

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
1. Day 1: Include arrival logistics (airport transfer, hotel check-in, first meal)
2. Last day: Include checkout time, departure logistics, airport timing
3. Include REALISTIC transport times (walking, metro, taxi, etc.)
4. Budget breakdown per day (stay under €${userProfile?.budget || 1500} total)
5. Mix free and paid activities
6. Include meal breaks (breakfast, lunch, dinner) with cost estimates
7. Add personal touches referencing ${userName} and their preferences
8. Include "insider tips" for each major activity
9. Pace appropriately - don't exhaust travelers!
10. Consider ${userProfile?.idealRhythm || 'balanced'} rhythm preference

PERSONALIZATION FOR ${userName}:
- Address them directly in tips ("${userName}, you'll love...")
- Reference their travel personality
- Match activity intensity to their preferences
- Include activities from the suggested list
${memberCount > 1 ? `- Suggest group-friendly activities for ${memberCount} people` : ''}

OUTPUT: JSON array of ${days} days only, no markdown, no code blocks.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const response = message.content[0].text;
    const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);

    if (!jsonMatch) {
      console.error('Failed to parse itinerary JSON');
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating itinerary:', error);
    return null;
  }
}
