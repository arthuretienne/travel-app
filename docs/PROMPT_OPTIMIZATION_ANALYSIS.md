# Prompt Optimization Analysis

**Date:** 2025-11-28
**Status:** 🚧 Design Phase
**Goal:** Optimize Claude prompts by separating backend filtering from AI generation

---

## 🎯 Current Problem

The existing prompt in `backend/src/services/claudeService.js` (lines 150-349) is a **350+ line mega-prompt** that tries to do everything:

1. ❌ Generate destinations from scratch
2. ❌ Estimate costs without real data
3. ❌ Suggest optimal dates blindly
4. ❌ Create itineraries without flight times
5. ❌ Handle both WITH/WITHOUT destination scenarios identically

**Result:**
- Claude guesses instead of working with real data
- Often suggests destinations with no available flights
- Cannot provide accurate pricing
- Wastes tokens on destination discovery logic
- Cannot include real flight times in Day 1 planning

---

## ✅ New Approach: Backend Does Discovery, Claude Does Personalization

### Philosophy
- **Backend:** Filtering, ranking, API calls, cost calculations
- **Claude:** Storytelling, personalization, itinerary creativity

### Benefits
1. ✅ Claude works with REAL flight prices and times
2. ✅ No "no flights found" errors
3. ✅ Accurate budgets and timing
4. ✅ Smaller, focused prompts (faster, cheaper)
5. ✅ Better separation of concerns

---

## 📊 Workflow Comparison

### Current Workflow (Problematic)
```
User Input → Claude (generate 10 destinations) → Amadeus API (often 0 results)
→ Filter by budget → Return 3 destinations
```

### New Workflow: WITH Destination

```
User Input (Paris → Barcelona, €800, 7 days)
    ↓
Backend calls Air Scraper (parallel):
  - searchFlights(Paris → Barcelona, +30 days)
  - getPriceCalendar(Paris → Barcelona, next 3 months)
  - searchHotels(Barcelona, 7 days, €800 budget)
    ↓
Backend filters & ranks:
  - Remove flights > budget
  - Find optimal dates (cheapest + user preferences)
  - Match hotels to budget
  - Calculate total cost
    ↓
Claude receives 1 FOCUSED prompt:
  - Real flight: "Vueling, 15:25→17:10, 143€"
  - Real hotel: "Hotel Catalonia, €89/night, 4★"
  - Remaining budget: €177 for activities
  - User profile: preferences, pace, interests
    ↓
Claude generates:
  - Personalized day-by-day itinerary
  - Activities matching budget and interests
  - Timeline starting from actual arrival time (17:10)
  - Hidden gems based on user profile
```

**Advantages:**
- ✅ Accurate costs (real data)
- ✅ Realistic Day 1 timing (flight lands 17:10)
- ✅ No destination discovery overhead
- ✅ Focused personalization

### New Workflow: WITHOUT Destination

```
User Input (Origin: Paris, Budget: €800, Interests: beach+culture)
    ↓
Backend calls Air Scraper:
  - searchFlightEverywhere(Paris, maxPrice: €400)
    ↓
Backend filters destinations by:
  - User interests (beach → coastal cities)
  - Budget constraints
  - Climate preferences
  - Accessibility requirements
  - Diversity (different regions)
    ↓
Backend ranks top 5 destinations:
  - Barcelona (€143 flight)
  - Lisbon (€156 flight)
  - Rome (€178 flight)
  - Athens (€189 flight)
  - Malta (€195 flight)
    ↓
For each destination (PARALLEL), backend calls:
  - searchFlights (get best option)
  - searchHotels (get 3-5 options)
  - Calculate total cost
    ↓
Backend selects final 3 destinations with REAL data
    ↓
Claude receives 3 PARALLEL prompts (1 per destination):
  Prompt 1: Barcelona recommendation with real data
  Prompt 2: Lisbon recommendation with real data
  Prompt 3: Rome recommendation with real data
    ↓
Claude generates (parallel):
  - 3 personalized trip recommendations
  - Each with accurate costs
  - Each with realistic Day 1 timing
  - Each tailored to user profile
    ↓
Return 3 complete recommendations to user
```

**Advantages:**
- ✅ Global coverage (Air Scraper Hotels API)
- ✅ Real prices for all 3 options
- ✅ Parallel Claude calls (faster)
- ✅ No "no flights found" errors
- ✅ Better diversity (Asia, Africa, Americas)

---

## 📝 New Prompt Templates

### Template 1: WITH Destination (Single Focused Prompt)

```javascript
export function generateItineraryWithDestination({
  // User profile
  userProfile,

  // Real travel data
  destination,
  flightData: {
    outbound: { departure, arrival, carrier, price, duration },
    return: { departure, arrival, carrier, price, duration }
  },
  hotelData: {
    name, stars, pricePerNight, totalNights, totalPrice, amenities, location
  },

  // Budget breakdown
  totalBudget,
  flightCost,
  hotelCost,
  remainingBudget, // for activities, food, transport

  // Dates
  departureDate,
  returnDate,
  duration
}) {
  return `You are a travel expert creating a personalized ${duration}-day itinerary for ${destination.name}.

## Trip Details (CONFIRMED & BOOKED)

**Dates:** ${departureDate} to ${returnDate} (${duration} days)

**Flight:**
- Outbound: ${flightData.outbound.departure} → ${flightData.outbound.arrival} (${flightData.outbound.carrier}, ${flightData.outbound.price})
- Return: ${flightData.return.departure} → ${flightData.return.arrival} (${flightData.return.carrier}, ${flightData.return.price})
- Total flight cost: ${flightCost}

**Hotel:**
- ${hotelData.name} (${hotelData.stars}★)
- ${hotelData.totalNights} nights × ${hotelData.pricePerNight} = ${hotelData.totalPrice}
- Location: ${hotelData.location}
- Amenities: ${hotelData.amenities.join(', ')}

**Budget:**
- Total: ${totalBudget}
- Flights: ${flightCost}
- Hotel: ${hotelCost}
- Available for activities/food/transport: ${remainingBudget}

## Traveler Profile

${JSON.stringify(userProfile, null, 2)}

## Your Task

Create a personalized day-by-day itinerary that:

1. **Day 1 timing:** Start activities AFTER arrival time (${flightData.outbound.arrival})
   - Include airport → hotel transfer (estimate 30-45min)
   - Suggest realistic evening activities near hotel

2. **Daily budget:** Allocate ~${Math.round(remainingBudget / duration)}/day for:
   - Meals (breakfast, lunch, dinner)
   - Activities and entrance fees
   - Local transport
   - Spontaneous experiences

3. **Personalization:** Match activities to traveler's:
   - Interests: ${userProfile.interests.join(', ')}
   - Pace: ${userProfile.travelPace}
   - Budget level: ${userProfile.budgetLevel}
   - Accessibility: ${userProfile.accessibility || 'none specified'}

4. **Last day timing:** Ensure activities end 3 hours before departure (${flightData.return.departure})

5. **Mix of experiences:**
   - 70% aligned with stated interests
   - 30% unexpected discoveries
   - Include 1-2 "hidden gems" off typical tourist path

## Output Format

Return JSON:
{
  "itinerary": {
    "day1": {
      "morning": "Arrival at ${flightData.outbound.arrival}. Transfer to hotel (~30-45min).",
      "afternoon": "Check-in at ${hotelData.name}. Rest and freshen up.",
      "evening": "...",
      "meals": { "lunch": "...", "dinner": "..." },
      "estimatedCost": 45
    },
    "day2": { ... },
    ...
  },
  "budgetBreakdown": {
    "activitiesTotal": 280,
    "mealsTotal": 210,
    "transportTotal": 80,
    "buffer": 30
  },
  "highlights": [
    "Sunset at ...",
    "Hidden gem: ...",
    "Must-try: ..."
  ],
  "practicalTips": [
    "Best way from airport: ...",
    "Local transport: ...",
    "Money-saving tip: ..."
  ]
}`;
}
```

**Why this works:**
- Claude receives REAL data, not estimates
- Can create realistic Day 1 timeline (flight lands 17:10)
- Accurate budget allocation
- Focused on personalization, not discovery

---

### Template 2: WITHOUT Destination (Per-Destination Prompt)

```javascript
export function generateDestinationRecommendation({
  // User profile
  userProfile,

  // Destination selected by backend
  destination: {
    name,
    country,
    description, // Why backend chose this (beaches, culture, etc.)
    climate,
    highlights
  },

  // Real travel data
  flightData: {
    outbound: { departure, arrival, carrier, price, duration, stops },
    return: { departure, arrival, carrier, price, duration, stops }
  },
  hotelOptions: [
    { name, stars, pricePerNight, location, amenities, distanceToCenter },
    // 3-5 options at different price points
  ],

  // Budget
  totalBudget,
  flightCost,
  suggestedHotel, // Backend's top pick
  remainingBudget,

  // Context
  duration,
  departureDate,
  alternativeDestinations: ['Lisbon', 'Rome'] // The other 2 options
}) {
  return `You are a travel expert presenting ${destination.name}, ${destination.country} as a ${duration}-day trip option.

## Why ${destination.name}?

${destination.description}

**Perfect for travelers who love:** ${userProfile.interests.slice(0, 3).join(', ')}

**Climate:** ${destination.climate}

**Top highlights:** ${destination.highlights.join(', ')}

## Trip Snapshot (${duration} days)

**Flight:**
- ${flightData.outbound.carrier}: ${flightData.outbound.departure} → ${flightData.outbound.arrival}
- ${flightData.outbound.stops === 0 ? 'Direct flight' : `${flightData.outbound.stops} stop(s)`}
- Duration: ${Math.floor(flightData.outbound.duration / 60)}h ${flightData.outbound.duration % 60}min
- Round-trip: ${flightCost}

**Suggested Hotel:**
- ${suggestedHotel.name} (${suggestedHotel.stars}★)
- ${suggestedHotel.pricePerNight}/night × ${duration - 1} nights
- Location: ${suggestedHotel.location} (${suggestedHotel.distanceToCenter})
- Total: €${suggestedHotel.pricePerNight * (duration - 1)}

**Budget:**
- Flights: ${flightCost}
- Hotel: €${suggestedHotel.pricePerNight * (duration - 1)}
- Available for experiences: ${remainingBudget}
- Daily budget: ~€${Math.round(remainingBudget / duration)}

## Traveler Profile

${JSON.stringify(userProfile, null, 2)}

## Your Task

Create a compelling trip recommendation that includes:

1. **Opening hook:** 2-3 sentences selling the destination's unique appeal to THIS traveler

2. **Day-by-day preview:** Brief overview of each day (2-3 sentences per day)
   - Day 1: Arrival at ${flightData.outbound.arrival}, evening exploration
   - Days 2-${duration - 1}: Mix of must-sees and hidden gems
   - Day ${duration}: Morning activities, depart ${flightData.return.departure}

3. **Why you'll love it:** 3-5 personalized reasons based on:
   - Interests: ${userProfile.interests.join(', ')}
   - Travel style: ${userProfile.travelPace}
   - Unique experiences available here

4. **Budget-friendly tips:** 2-3 ways to maximize ${remainingBudget} for activities

5. **Hidden gem:** 1 off-the-beaten-path experience

## Output Format

Return JSON:
{
  "destinationName": "${destination.name}",
  "tagline": "One compelling sentence",
  "hook": "2-3 sentences selling this destination",
  "dayByDayPreview": [
    "Day 1: Arrive in the evening...",
    "Day 2: ...",
    ...
  ],
  "whyYoullLoveIt": [
    "Reason 1...",
    "Reason 2...",
    ...
  ],
  "budgetTips": [
    "Tip 1...",
    "Tip 2...",
    ...
  ],
  "hiddenGem": "Off-the-beaten-path experience",
  "perfectFor": ["Beach lovers", "Culture enthusiasts", ...],
  "totalCost": {
    "flights": ${flightCost},
    "hotel": ${suggestedHotel.pricePerNight * (duration - 1)},
    "estimated": ${totalBudget}
  },
  "comparedTo": {
    "alternatives": ${JSON.stringify(alternativeDestinations)},
    "advantage": "Why this beats the alternatives for THIS user"
  }
}`;
}
```

**Why this works:**
- Backend already filtered to relevant destinations
- Claude focuses on selling ONE option compellingly
- Real data makes it trustworthy
- Can run 3 prompts in parallel (faster)
- User gets 3 diverse, personalized options

---

## 🔧 Backend Filtering Logic

### WITHOUT Destination: Discovery Algorithm

```javascript
async function discoverDestinations(userProfile, budget, origin) {
  // Step 1: Get all affordable destinations
  const maxFlightBudget = budget * 0.5; // 50% for flights
  const destinations = await airScraper.searchFlightEverywhere({
    originQuery: origin,
    maxPrice: maxFlightBudget,
    currency: 'EUR'
  });

  // Step 2: Score each destination
  const scored = destinations.map(dest => {
    let score = 0;

    // Interest matching
    if (userProfile.interests.includes('beach') && dest.isCoastal) score += 30;
    if (userProfile.interests.includes('culture') && dest.culturalSites > 5) score += 25;
    if (userProfile.interests.includes('food') && dest.foodScene) score += 20;
    if (userProfile.interests.includes('nature') && dest.naturalAttractions) score += 25;
    if (userProfile.interests.includes('adventure') && dest.activities) score += 20;

    // Climate preferences
    if (userProfile.climate === 'warm' && dest.avgTemp > 20) score += 15;
    if (userProfile.climate === 'mild' && dest.avgTemp >= 15 && dest.avgTemp <= 25) score += 15;

    // Budget level
    if (userProfile.budgetLevel === 'budget' && dest.costOfLiving < 60) score += 10;
    if (userProfile.budgetLevel === 'medium' && dest.costOfLiving >= 60 && dest.costOfLiving <= 120) score += 10;
    if (userProfile.budgetLevel === 'luxury' && dest.luxuryOptions) score += 10;

    // Accessibility
    if (userProfile.accessibility?.wheelchair && dest.accessible) score += 20;

    // Diversity bonus (different regions)
    if (dest.region === 'Asia') score += 10; // Encourage non-European
    if (dest.region === 'Africa') score += 10;
    if (dest.region === 'Americas') score += 10;

    // Flight quality
    if (dest.flight.stops === 0) score += 15; // Direct flights preferred
    if (dest.flight.duration < 180) score += 10; // <3 hours
    if (dest.flight.price < maxFlightBudget * 0.6) score += 10; // Great price

    return { ...dest, score };
  });

  // Step 3: Sort and diversify
  const sorted = scored.sort((a, b) => b.score - a.score);

  // Pick top 5, ensuring diversity
  const selected = [];
  const regions = new Set();

  for (const dest of sorted) {
    if (selected.length >= 5) break;

    // Ensure no more than 2 from same region
    const regionCount = selected.filter(d => d.region === dest.region).length;
    if (regionCount < 2) {
      selected.push(dest);
      regions.add(dest.region);
    }
  }

  return selected; // Top 5 diverse destinations
}
```

### WITH Destination: Optimization Algorithm

```javascript
async function optimizeDestination(destination, userProfile, budget, origin, duration) {
  // Step 1: Get price calendar (find cheapest dates)
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const priceCalendar = await airScraper.getPriceCalendar({
    originQuery: origin,
    destinationQuery: destination,
    year: nextMonth.getFullYear(),
    month: nextMonth.getMonth() + 1,
    currency: 'EUR'
  });

  // Step 2: Find optimal dates balancing price + user preferences
  let optimalDate = priceCalendar.cheapestDate;

  // Adjust if user has weekend preferences
  if (userProfile.preferWeekend) {
    const weekendDates = priceCalendar.days.filter(d => {
      const day = new Date(d.date).getDay();
      return day === 5 || day === 6; // Friday/Saturday
    });
    optimalDate = weekendDates.sort((a, b) => a.price - b.price)[0] || optimalDate;
  }

  // Step 3: Search flights for optimal date
  const flights = await airScraper.searchFlights({
    originQuery: origin,
    destinationQuery: destination,
    date: optimalDate.date,
    adults: 1,
    cabinClass: 'economy',
    currency: 'EUR'
  });

  const bestFlight = flights.flights[0]; // Already sorted by 'best'

  // Step 4: Search hotels within remaining budget
  const remainingBudget = budget - bestFlight.price.amount;
  const maxNightlyRate = remainingBudget / (duration - 1) * 0.7; // 70% for hotel

  const hotels = await airScraper.searchHotels({
    destination: destination,
    checkIn: optimalDate.date,
    nights: duration - 1,
    maxPrice: maxNightlyRate,
    currency: 'EUR'
  });

  // Step 5: Return optimized package
  return {
    destination,
    flight: bestFlight,
    hotel: hotels[0], // Backend picks best match
    totalCost: bestFlight.price.amount + (hotels[0].pricePerNight * (duration - 1)),
    remainingBudget: budget - (bestFlight.price.amount + hotels[0].pricePerNight * (duration - 1)),
    dates: {
      departure: optimalDate.date,
      return: calculateReturnDate(optimalDate.date, duration)
    }
  };
}
```

---

## 📊 Token & Cost Comparison

### Current Approach (Mega-Prompt)
```
Input tokens:  ~4,000 (350-line prompt + user profile)
Output tokens: ~2,500 (3 destinations × 800 tokens each)
Total:         ~6,500 tokens per request
Cost:          ~$0.10 per recommendation set
```

### New Approach: WITH Destination
```
Input tokens:  ~1,200 (focused prompt + real data)
Output tokens: ~1,500 (1 detailed itinerary)
Total:         ~2,700 tokens per request
Cost:          ~$0.04 per recommendation
Savings:       60% cheaper
```

### New Approach: WITHOUT Destination (3 parallel prompts)
```
Input tokens:  ~800 × 3 = 2,400 (3 focused prompts)
Output tokens: ~600 × 3 = 1,800 (3 concise recommendations)
Total:         ~4,200 tokens per request
Cost:          ~$0.06 per recommendation set
Savings:       40% cheaper + FASTER (parallel)
```

---

## 🎯 Success Metrics

### Quality Improvements
- ✅ **0% "no flights found" errors** (vs current ~30%)
- ✅ **100% accurate pricing** (vs current estimates)
- ✅ **Realistic Day 1 timing** (flight arrival integrated)
- ✅ **Global diversity** (Asia, Africa, Americas via Hotels API)

### Performance Improvements
- ✅ **40-60% faster** (parallel Claude calls)
- ✅ **40-60% cheaper** (smaller prompts)
- ✅ **70% fewer API calls** (intelligent caching)

### User Experience
- ✅ **Trustworthy costs** (real data, not guesses)
- ✅ **Bookable immediately** (real flights/hotels shown)
- ✅ **Better personalization** (Claude focuses on storytelling)

---

## 🚀 Implementation Checklist

### Phase 1: Backend Services ✅
- [x] Create `airScraperService.js`
- [x] Create `cache.js`
- [x] Test all endpoints
- [x] Validate performance

### Phase 2: Backend Logic 🚧
- [ ] Create `discoverDestinations()` function
- [ ] Create `optimizeDestination()` function
- [ ] Implement scoring algorithm
- [ ] Add diversity rules
- [ ] Test with real user profiles

### Phase 3: Prompt Updates 🚧
- [ ] Create `generateItineraryWithDestination()` prompt
- [ ] Create `generateDestinationRecommendation()` prompt
- [ ] Test with real Air Scraper data
- [ ] Validate JSON output format
- [ ] A/B test vs current prompts

### Phase 4: Route Refactor 🚧
- [ ] Update `/recommendations` endpoint
- [ ] Split into WITH/WITHOUT scenarios
- [ ] Add parallel Claude calls
- [ ] Replace Amadeus with Air Scraper
- [ ] Update response format

### Phase 5: Hotels API 📅
- [ ] Create `hotelService.js`
- [ ] Integrate into backend logic
- [ ] Test global coverage
- [ ] Validate diversity improvements

### Phase 6: Frontend 📅
- [ ] Update Results page with flight details
- [ ] Update TripDetail timeline
- [ ] Add real-time pricing display
- [ ] Show carrier logos

---

## 📞 Next Steps

**Immediate:**
1. Review and approve this prompt design
2. Implement `discoverDestinations()` function
3. Implement `optimizeDestination()` function
4. Create new prompt templates in `claudeService.js`

**This Week:**
5. Refactor `/recommendations` route
6. Test WITH destination scenario
7. Test WITHOUT destination scenario
8. Validate end-to-end with real user profiles

**Next Week:**
9. Add Hotels API integration
10. Deploy to staging
11. A/B test vs current workflow
12. Production deployment

---

**Status:** ✅ Design Complete - Ready for Implementation
**Blockers:** None
**Decision Required:** User approval to proceed with implementation
