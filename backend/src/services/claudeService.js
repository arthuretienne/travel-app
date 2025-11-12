// backend/src/services/claudeService.js
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: __dirname + '/../../.env' });

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

export async function generateDestinations(userProfile) {
  if (!client) {
    throw new Error('Claude client not initialized. Please check ANTHROPIC_API_KEY environment variable.');
  }
  
  const prompt = buildPrompt(userProfile);

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
    return parseDestinations(response);
  } catch (error) {
    console.error('Claude API Error:', error);
    throw new Error(`Claude generation failed: ${error.message}`);
  }
}

function buildPrompt(profile) {
  const { basic, preferences, constraints, availability } = profile;
  
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
  
  return `You are a travel recommendation AI. Based on this user profile, generate EXACTLY 10 diverse travel destinations WITH their optimal travel dates.

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
Travelers: ${constraints.travelers}

TRAVEL PLANNING WINDOW:
Planning horizon: ${monthsAhead} months (from ${startDateStr} to ${endDateStr})
Professional status: ${availability.professionalStatus}
Ideal trip duration: ${tripDays} days
Departure flexibility: ${availability.departureFlexibility}
${preferredMonthsText}

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
6. Generate varied destinations (don't suggest 10 beach destinations)
7. Mix popular and off-beaten locations based on "${basic.destinationPreference}" preference
8. Ensure trips don't overlap in dates
9. Respect departure flexibility:
   - "semaine" = prefer weekday departures (Monday-Thursday)
   - "weekend" = prefer weekend departures (Friday-Sunday)
   - "peu-importe" = any day is fine

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
      "popularityScore": 7
    }
  ]
}

IMPORTANT RULES:
- popularityScore: 1-10 (1=very unknown, 10=very touristy)
- IATA codes must be valid 3-letter airport codes
- estimatedBudget should fit within user's total budget of €${basic.budget}
- seasonReason should explain why THESE SPECIFIC DATES are perfect (not just "good weather")
- Dates must be realistic and within the planning window
- Return ONLY valid JSON, absolutely no markdown formatting or code blocks`;
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