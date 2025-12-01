# Route Refactoring Plan - travel.js

**Date:** 2025-11-28
**Goal:** Replace Amadeus with Air Scraper, integrate new workflow

---

## 🎯 Current Structure Analysis

### Current Flow (lines 31-476):
```
1. Fetch user preferences from DB (lines 42-75)
2. Claude generates 10 destinations (line 86)
3. Pre-filter by estimated cost (lines 89-96)
4. Temporal optimization (dates) (lines 98-190)
5. Use top 3-5 destinations (line 195)
6. Get photos (lines 198-206)
7. For each destination (Promise.all):
   - searchFlightOffers (Amadeus) ← REPLACE WITH AIR SCRAPER
   - FlixBus search
   - Train estimate
   - getHotelCostWithBooking/Amadeus ← KEEP FOR NOW
   - Calculate costs
   - Calculate score
   - Generate affiliate links
8. Filter by budget
9. Return top 3 results
```

### Key Observations:
- ✅ Already has user preferences loading
- ✅ Already has temporal optimization
- ✅ Already uses Promise.all for parallel processing
- ❌ Claude generates destinations WITHOUT real flight data
- ❌ Amadeus searchFlightOffers (lines 231-252) needs replacement
- ❌ No detection of WITH vs WITHOUT destination scenarios
- ❌ No use of optimized prompts

---

## 🔧 Refactoring Strategy

### Phase 1: Add Scenario Detection ✅
```javascript
// After loading user preferences
const hasDestination = userProfile.basic?.destination &&
                       userProfile.basic?.destination !== '';

if (hasDestination) {
  // WITH DESTINATION workflow
} else {
  // WITHOUT DESTINATION workflow
}
```

### Phase 2: WITH Destination Workflow 🆕
```javascript
// User specified: Paris → Barcelona, €800, 7 days
async function handleWithDestination(userProfile, userPreferences, req) {
  const destination = userProfile.basic.destination;
  const budget = userProfile.basic.budget;
  const duration = userProfile.availability?.duration || 7;
  const origin = userPreferences?.preferredAirports?.[0] || 'Paris';

  // 1. Optimize trip using Air Scraper
  const optimizedTrip = await destinationService.optimizeDestination({
    destination,
    userProfile,
    budget,
    origin,
    duration,
    departureDate: userProfile.availability?.startDate
  });

  // 2. Generate detailed itinerary with Claude (optimized prompt)
  const itinerary = await claudeService.generateItineraryWithRealData({
    userProfile,
    ...optimizedTrip
  });

  // 3. Get photos
  const photos = await getDestinationPhotos([destination]);

  // 4. Return 1 complete trip plan
  return [{
    destination: optimizedTrip.destination,
    dates: optimizedTrip.dates,
    pricing: optimizedTrip.budget,
    flightDetails: optimizedTrip.flight,
    hotelOptions: optimizedTrip.hotel,
    itinerary: itinerary,
    photo: photos.get(destination),
    score: calculateScore(optimizedTrip)
  }];
}
```

### Phase 3: WITHOUT Destination Workflow 🆕
```javascript
// User specified: Origin Paris, €800, beach+culture
async function handleWithoutDestination(userProfile, userPreferences, req) {
  const budget = userProfile.basic.budget;
  const origin = userPreferences?.preferredAirports?.[0] || 'Paris';
  const duration = userProfile.availability?.duration || 7;

  // 1. Discover destinations (Air Scraper + scoring)
  const topDestinations = await destinationService.discoverDestinations({
    userProfile,
    budget,
    origin,
    duration,
    departureDate: userProfile.availability?.startDate
  });

  // 2. For top 3 destinations, optimize trips (PARALLEL)
  const optimizedTrips = await Promise.all(
    topDestinations.slice(0, 3).map(dest =>
      destinationService.optimizeDestination({
        destination: dest.name,
        userProfile,
        budget,
        origin,
        duration,
        departureDate: userProfile.availability?.startDate
      }).catch(error => {
        console.warn(`Failed to optimize ${dest.name}:`, error.message);
        return null;
      })
    )
  );

  // Filter out failures
  const validTrips = optimizedTrips.filter(t => t !== null);

  // 3. Generate recommendations with Claude (3 PARALLEL prompts)
  const recommendations = await Promise.all(
    validTrips.map((trip, idx) =>
      claudeService.generateDestinationRecommendationWithData({
        userProfile,
        ...trip,
        alternativeDestinations: validTrips
          .filter((_, i) => i !== idx)
          .map(t => t.destination.name)
      })
    )
  );

  // 4. Get photos
  const photos = await getDestinationPhotos(
    validTrips.map(t => t.destination.name)
  );

  // 5. Combine and return
  return validTrips.map((trip, idx) => ({
    destination: trip.destination,
    dates: trip.dates,
    pricing: trip.budget,
    flightDetails: trip.flight,
    hotelOptions: trip.hotel,
    recommendation: recommendations[idx],
    photo: photos.get(trip.destination.name),
    score: calculateScore(trip)
  }));
}
```

### Phase 4: Backward Compatibility 🔄
Keep existing fallback logic:
- FlixBus search (lines 254-289)
- Train estimates (lines 291-303)
- Booking.com hotels (lines 305-332)
- Affiliate links (lines 350-354)

---

## 📝 Changes Summary

### Files to Import:
```javascript
// Add new imports
import * as airScraper from '../services/airScraperService.js';
import * as destinationService from '../services/destinationService.js';
import {
  generateItineraryWithRealData,
  generateDestinationRecommendationWithData
} from '../services/claudeService.js'; // New functions to add
```

### Files to Keep:
```javascript
// Keep these (still useful)
import { getHotelCostWithBooking } from '../services/bookingService.js';
import { searchFlixBus } from '../services/flixbusService.js';
import { generateAffiliateLinks } from '../services/affiliateService.js';
import { getDestinationPhotos } from '../services/unsplashService.js';
```

### Files to Remove/Deprecate:
```javascript
// Remove Amadeus
import { searchFlightOffers, getHotelCostWithFallbacks } from '../services/amadeusService.js'; // ← REMOVE

// Update Claude import (keep generateDestinations for now as fallback)
import { generateDestinations } from '../services/claudeService.js'; // Keep as fallback
```

---

## 🚧 Implementation Steps

### Step 1: Add Imports ✅
Add new service imports at top of file

### Step 2: Add Helper Functions 🆕
```javascript
// Helper: Detect scenario
function detectScenario(userProfile) {
  const hasDestination = userProfile.basic?.destination &&
                         userProfile.basic?.destination.trim() !== '';
  return hasDestination ? 'WITH_DESTINATION' : 'WITHOUT_DESTINATION';
}

// Helper: Calculate score from optimized trip
function calculateScoreFromTrip(trip) {
  const flightCost = trip.flight.totalCost;
  const hotelCost = trip.hotel.totalPrice;
  const totalCost = trip.budget.total;
  const remaining = trip.budget.remaining;

  return {
    total: 100 - Math.abs((totalCost / trip.budget.total) * 100 - 50), // Closer to 50% = better
    breakdown: {
      budget: remaining > 0 ? 100 : 50,
      flights: flightCost < trip.budget.total * 0.4 ? 100 : 70,
      value: (remaining / trip.budget.total) * 100
    }
  };
}
```

### Step 3: Refactor Main Route 🔄
Replace lines 81-419 with new workflow logic

### Step 4: Update Response Format 📊
Ensure response matches frontend expectations

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Air Scraper API failure | Keep generateDestinations as fallback |
| Breaking frontend | Keep response format compatible |
| Performance regression | Use Promise.all for parallelization |
| Budget calculation errors | Validate all cost data before returning |
| Missing flight data | Use isEstimate flag, show warnings |

---

## 🧪 Testing Plan

### Test Cases:
1. ✅ WITH destination: "Paris → Barcelona, €800, 7 days"
2. ✅ WITHOUT destination: "Origin: Paris, €800, beach+culture"
3. ✅ Edge case: No flights found (fallback to estimates)
4. ✅ Edge case: Air Scraper API down (fallback to old workflow)
5. ✅ Budget constraints: Results under budget
6. ✅ Parallel processing: 3 destinations optimized simultaneously

### Success Criteria:
- ✅ Response time < 10s (WITH dest) or < 15s (WITHOUT dest)
- ✅ All 3 results have real flight data (not estimates)
- ✅ Budget remaining > 0 for all results
- ✅ Flight times included in response
- ✅ Frontend displays correctly

---

## 📊 Expected Improvements

### Before (Current):
```
Claude → "Generate 10 destinations" (6,500 tokens, 5-8s)
  ↓
Amadeus → Search flights (often 0 results, 2-4s per dest)
  ↓
Filter → Return 3 destinations (often with errors)

Total: ~15-20s, ~30% "no flights found"
```

### After (New WITH Destination):
```
Air Scraper → searchFlights + optimal date (2-4s)
  ↓
Claude → "Generate itinerary with REAL data" (2,700 tokens, 3-5s)
  ↓
Return → 1 complete trip plan

Total: ~5-9s, <5% "no flights found"
Speed: 2-3x faster ✅
```

### After (New WITHOUT Destination):
```
Air Scraper → discoverDestinations + score (2-4s)
  ↓
Air Scraper → optimizeDestination × 3 PARALLEL (4-6s total)
  ↓
Claude → 3 PARALLEL prompts (4,200 tokens, 4-6s)
  ↓
Return → 3 compelling trip options

Total: ~10-16s, <5% "no flights found"
Speed: Similar, but BETTER quality ✅
```

---

## 🎯 Success Metrics

### Performance:
- ✅ WITH dest response time: < 10s (vs 15-20s currently)
- ✅ WITHOUT dest response time: < 15s (vs 15-20s currently)
- ✅ "No flights found" rate: < 10% (vs ~30% currently)

### Cost:
- ✅ API costs: $8.99/month (vs $50/month) = 82% savings
- ✅ Token usage: 40-60% reduction
- ✅ Faster = cheaper server costs

### Quality:
- ✅ Real flight times (vs missing)
- ✅ Accurate pricing (vs estimates)
- ✅ Global destinations (vs Europe-only)

---

**Status:** 📋 Plan Complete
**Next:** Implementation
**Estimated Time:** 1-2 hours
