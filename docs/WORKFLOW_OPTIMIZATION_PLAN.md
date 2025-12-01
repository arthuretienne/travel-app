# Workflow Optimization Plan - Air Scraper Integration

**Date:** 2025-11-28
**Status:** 🔍 Analysis & Recommendations

---

## 🎯 Current State Analysis

### **Existing Workflow (Amadeus)**
```javascript
1. User fills form → destination (optional), budget, dates
2. Single Claude prompt generates 3 recommendations
3. Amadeus API: Search flights (often fails)
4. Booking API: Search hotels
5. Return recommendations (often missing flights)
```

**Problems:**
- ❌ Destinations répétitives (same cities)
- ❌ Prix pas à jour
- ❌ Horaires manquants
- ❌ Peu de destinations exotiques (Asie, Afrique, Amérique)
- ❌ Claude prompt fait tout d'un coup (lourd)

---

## 🚀 Nouveau Workflow Optimisé - Air Scraper + Hotels

### **Découverte Importante: Hotels API Disponible!**

Air Scraper propose aussi:
- ✅ `searchDestinationOrHotel` - Search hotels by destination
- ✅ `searchHotels` - Full hotel search with filters
- ✅ `getHotelDetails` - Detailed hotel info
- ✅ `getHotelPrices` - Price comparison
- ✅ `getHotelReviews` - User reviews

**Impact:** On peut avoir **flights + hotels** depuis la même API!
→ Plus cohérent, meilleure couverture mondiale, 1 seul provider

---

## 📋 Recommandations Workflow

### **Scénario 1: User AVEC Destination**

**Exemple:** "Barcelona, 800€, 7 jours, dates flexibles"

**Nouveau Workflow:**

```javascript
// ÉTAPE 1: Prix Calendar (trouver meilleures dates)
// API Call: getPriceCalendar
// Temps: ~1-2s
// Cache: 12h

const calendar = await airScraper.getPriceCalendar({
  originQuery: user.city, // From onboarding
  destinationQuery: "Barcelona",
  year: 2025,
  month: 6,
  currency: 'EUR'
});

// Trouve 3 meilleures périodes:
// - Cheapest: 12-19 juin (143€)
// - Mid-range: 19-26 juin (178€)
// - Weekend: 26-30 juin (195€)

// ÉTAPE 2: Search Flights pour chaque période
// API Call: searchFlights (x3 parallel)
// Temps: ~2-4s chacun (parallel = 4s total)
// Cache: 6h

const flightOptions = await Promise.all([
  airScraper.searchFlights({
    originQuery: user.city,
    destinationQuery: "Barcelona",
    date: "2025-06-12",
    adults: user.travelers || 1
  }),
  // ... 2 autres dates
]);

// ÉTAPE 3: Search Hotels (NEW!)
// API Call: searchHotels
// Temps: ~2-3s
// Cache: 12h

const hotels = await airScraper.searchHotels({
  destinationQuery: "Barcelona",
  checkIn: "2025-06-12",
  checkOut: "2025-06-19",
  adults: 1,
  currency: 'EUR',
  sortBy: 'best_value'
});

// ÉTAPE 4: Claude Prompt (simplifié)
// Input: flights + hotels + user preferences
// Output: Personalized recommendation + itinerary

const recommendation = await generateRecommendation({
  destination: "Barcelona",
  flights: flightOptions[0].flights.slice(0, 3),
  hotels: hotels.slice(0, 5),
  userProfile: {
    personality: user.personality,
    activities: user.topActivities,
    budget: 800,
    rhythm: user.idealRhythm
  },
  dates: { checkIn: "2025-06-12", checkOut: "2025-06-19" }
});
```

**Prompt Claude Optimisé:**
```javascript
const prompt = `
Tu es un expert voyage. Crée une recommandation personnalisée pour ${userName}.

DESTINATION: Barcelona, Spain
DATES: 12-19 juin 2025 (7 jours)
BUDGET: 800€

VOLS DISPONIBLES:
${flights.map((f, i) => `
${i+1}. ${f.price.formatted} - ${f.outbound.carriers[0].name}
   Aller: ${f.outbound.departure} → ${f.outbound.arrival}
   Retour: ${f.return.departure} → ${f.return.arrival}
   Durée: ${f.outbound.durationMinutes}min
`).join('\n')}

HOTELS DISPONIBLES:
${hotels.map((h, i) => `
${i+1}. ${h.name} - ${h.price}/nuit
   Note: ${h.rating}/5 (${h.reviewCount} avis)
   Quartier: ${h.location.neighborhood}
`).join('\n')}

PROFIL UTILISATEUR:
- Personnalité: ${userProfile.personality}
- Activités préférées: ${userProfile.activities.join(', ')}
- Rythme: ${userProfile.rhythm}

TÂCHE:
1. Choisis le MEILLEUR vol (équilibre prix/horaires/qualité)
2. Choisis le MEILLEUR hotel (équilibre prix/localisation/note)
3. Crée un itinéraire jour par jour personnalisé
4. Explique pourquoi cette combinaison est parfaite pour ${userName}

Format JSON:
{
  "selectedFlight": { index, reason },
  "selectedHotel": { index, reason },
  "totalCost": number,
  "matchScore": 0-100,
  "matchReason": "Pourquoi Barcelona est parfait pour toi...",
  "itinerary": [
    {
      "day": 1,
      "date": "2025-06-12",
      "theme": "Arrivée & Gaudi",
      "schedule": [
        {
          "time": "10:30",
          "activity": "Atterrissage à BCN",
          "duration": "2h",
          "cost": 0,
          "type": "transport",
          "tips": "Prends l'Aerobus (€5.90, 35min) vers Plaça Catalunya"
        },
        // ... plus d'activités
      ]
    },
    // ... plus de jours
  ]
}
`;
```

**Avantages:**
- ✅ Claude a toutes les vraies données (vols + hotels réels)
- ✅ Peut faire des choix intelligents (prix vs horaires vs qualité)
- ✅ Recommandation basée sur vraies options, pas hypothétique
- ✅ 1 seul prompt Claude (pas plusieurs)

---

### **Scénario 2: User SANS Destination ("Surprise me")**

**Exemple:** "800€, 7 jours, juin, aime culture + food + plage"

**Nouveau Workflow:**

```javascript
// ÉTAPE 1: Discover Destinations
// API Call: searchFlightEverywhere
// Temps: ~2-3s
// Cache: 12h

const destinations = await airScraper.searchFlightEverywhere({
  originQuery: user.city,
  maxPrice: 400, // Half budget for flights
  currency: 'EUR'
});

// Retourne 50+ destinations triées par prix
// Ex: Porto €68, Prague €75, Budapest €82, Athens €115, etc.

// ÉTAPE 2: Filter par Préférences User
// Logic côté backend, pas Claude
// Temps: <100ms

const filtered = destinations.filter(dest => {
  // Match activities
  const destProfile = getDestinationProfile(dest.name);

  const activityMatch = user.topActivities.some(activity =>
    destProfile.activities.includes(activity)
  );

  // Match climate (if specified)
  const climateMatch = !user.preferredClimate ||
    destProfile.climate === user.preferredClimate;

  // Match vibe
  const vibeMatch = !user.preferredVibe ||
    destProfile.vibe === user.preferredVibe;

  return activityMatch && climateMatch && vibeMatch;
});

// ÉTAPE 3: Get Hotels pour Top 5
// API Call: searchHotels (x5 parallel)
// Temps: ~2-3s (parallel)
// Cache: 12h

const destinationsWithHotels = await Promise.all(
  filtered.slice(0, 5).map(async (dest) => {
    const hotels = await airScraper.searchHotels({
      destinationQuery: dest.name,
      checkIn: calculateCheckIn(user.availableDates),
      checkOut: calculateCheckOut(user.availableDates, 7),
      adults: 1,
      maxPrice: 400, // Remaining budget
    });

    return {
      destination: dest,
      bestHotel: hotels[0],
      totalCost: dest.price.amount + (hotels[0]?.pricePerNight * 7 || 0),
    };
  })
);

// ÉTAPE 4: Score & Rank
// Logic côté backend
// Temps: <100ms

const ranked = destinationsWithHotels
  .map(dest => ({
    ...dest,
    score: calculateScore(dest, user)
  }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);

// ÉTAPE 5: Claude Prompts (x3 parallel - 1 par destination)
// Temps: ~10-15s chacun (parallel = 15s total)

const recommendations = await Promise.all(
  ranked.map(dest => generateRecommendation({
    destination: dest.destination.name,
    flight: { price: dest.destination.price },
    hotel: dest.bestHotel,
    userProfile: user,
    totalBudget: 800,
    matchScore: dest.score
  }))
);
```

**Prompt Claude Optimisé (par destination):**
```javascript
const prompt = `
Tu es un expert voyage. Crée une recommandation personnalisée pour ${userName}.

DESTINATION: ${dest.name}, ${dest.country}
DATES: Flexibles en juin 2025 (7 jours)
BUDGET: 800€

VOL:
- Prix: ${dest.price.formatted} aller-retour
- Depuis: ${user.city}

HOTEL RECOMMANDÉ:
- Nom: ${hotel.name}
- Prix: ${hotel.pricePerNight}€/nuit (${hotel.pricePerNight * 7}€ total)
- Note: ${hotel.rating}/5
- Quartier: ${hotel.location.neighborhood}

COÛT TOTAL: ${dest.totalCost}€ (reste ${800 - dest.totalCost}€ pour activités)

PROFIL UTILISATEUR:
- Activités préférées: ${user.topActivities.join(', ')}
- Personnalité: ${user.personality}
- Rythme: ${user.rhythm}

POURQUOI CETTE DESTINATION:
${explainMatch(dest, user)} // Pre-calculated match reasons

TÂCHE:
Crée un itinéraire 7 jours personnalisé qui va faire RÊVER ${userName}.
Explique pourquoi ${dest.name} est PARFAIT pour lui/elle.

Format JSON: { ... }
`;
```

**Avantages:**
- ✅ 3 prompts parallèles = chacun optimisé pour 1 destination
- ✅ Claude se concentre sur itinéraire, pas sur choix destination
- ✅ Données réelles (vols + hotels) pour chaque reco
- ✅ Plus rapide que 1 gros prompt

---

## 🏨 Hotels API Integration

### **Nouveaux Endpoints à Implémenter**

#### 1. `searchHotels()`
```javascript
export async function searchHotels({
  destinationQuery,
  checkIn,
  checkOut,
  adults = 1,
  rooms = 1,
  maxPrice = null,
  minRating = null,
  sortBy = 'best_value', // best_value, price_low, rating
  currency = 'EUR',
  market = 'fr-FR'
}) {
  // API Call: /api/v1/hotels/searchHotels
  // Returns: hotels with prices, ratings, location
}
```

#### 2. `getHotelDetails()`
```javascript
export async function getHotelDetails(hotelId) {
  // API Call: /api/v1/hotels/getHotelDetails
  // Returns: Full hotel info, amenities, photos
}
```

#### 3. `getHotelReviews()`
```javascript
export async function getHotelReviews(hotelId) {
  // API Call: /api/v1/hotels/getHotelReviews
  // Returns: User reviews, ratings breakdown
}
```

---

## 🌍 Coverage Mondiale - Destinations Exotiques

### **Problème Actuel**
- Amadeus: Focus Europe/US
- Peu de destinations Asie, Afrique, Amérique du Sud

### **Solution: searchFlightEverywhere + Filtering**

```javascript
// Get ALL destinations from user city
const allDestinations = await airScraper.searchFlightEverywhere({
  originQuery: user.city,
  maxPrice: user.budget * 0.6, // 60% budget for flights
});

// Group by continent
const byContinent = {
  europe: allDestinations.filter(d => isEurope(d.country)),
  asia: allDestinations.filter(d => isAsia(d.country)),
  africa: allDestinations.filter(d => isAfrica(d.country)),
  americas: allDestinations.filter(d => isAmericas(d.country)),
  oceania: allDestinations.filter(d => isOceania(d.country)),
};

// Ensure diversity in top 10
const diverseTop10 = [
  ...byContinent.europe.slice(0, 3),
  ...byContinent.asia.slice(0, 2),
  ...byContinent.africa.slice(0, 2),
  ...byContinent.americas.slice(0, 2),
  ...byContinent.oceania.slice(0, 1),
].sort((a, b) => a.price.amount - b.price.amount);
```

**Destinations Database Enrichment:**
```javascript
// Create destination profiles database
const destinationProfiles = {
  "Marrakech": {
    country: "Morocco",
    continent: "Africa",
    activities: ["culture", "food", "shopping", "spa"],
    climate: "hot_dry",
    vibe: "exotic",
    bestMonths: [3, 4, 5, 10, 11],
    highlights: ["Medina", "Jemaa el-Fnaa", "Majorelle Garden"],
  },
  "Bangkok": {
    country: "Thailand",
    continent: "Asia",
    activities: ["culture", "food", "nightlife", "temples"],
    climate: "tropical",
    vibe: "vibrant",
    bestMonths: [11, 12, 1, 2],
    highlights: ["Grand Palace", "Street food", "Floating markets"],
  },
  // ... 100+ destinations
};
```

---

## 🎯 Optimizations Recommandées

### **1. Caching Strategy**

```javascript
// Cache keys with strategic TTLs
const CACHE_CONFIG = {
  // Static data - long cache
  'airport': 7 * 24 * 60, // 7 days
  'destination_profile': 30 * 24 * 60, // 30 days

  // Semi-static - medium cache
  'price_calendar': 12 * 60, // 12 hours
  'flight_everywhere': 12 * 60, // 12 hours
  'hotels_search': 12 * 60, // 12 hours

  // Dynamic - short cache
  'flights': 6 * 60, // 6 hours
  'hotel_prices': 6 * 60, // 6 hours

  // Very dynamic - very short cache
  'hotel_availability': 2 * 60, // 2 hours
};
```

### **2. Parallel API Calls**

```javascript
// BAD: Sequential (slow)
const origin = await searchAirport('Paris');
const dest = await searchAirport('Barcelona');
const flights = await searchFlights(origin, dest);
// Total: 1s + 1s + 3s = 5s

// GOOD: Parallel (fast)
const [origin, dest] = await Promise.all([
  searchAirport('Paris'),
  searchAirport('Barcelona'),
]);
const flights = await searchFlights(origin, dest);
// Total: 1s + 3s = 4s

// BETTER: Full parallel
const [flights, hotels] = await Promise.all([
  searchFlights(origin, dest),
  searchHotels(dest),
]);
// Total: max(3s, 2s) = 3s
```

### **3. Pre-fetching Popular Routes**

```javascript
// Cron job every 6 hours
async function prefetchPopularRoutes() {
  const popularDestinations = [
    'Barcelona', 'Amsterdam', 'Rome', 'London',
    'Berlin', 'Prague', 'Budapest', 'Lisbon'
  ];

  const origins = ['Paris', 'Lyon', 'Marseille'];

  const nextMonth = getNextMonthDates();

  for (const origin of origins) {
    for (const dest of popularDestinations) {
      // Pre-fill cache
      await searchFlights({
        originQuery: origin,
        destinationQuery: dest,
        date: nextMonth.start,
      });

      await delay(100); // Avoid rate limits
    }
  }
}
```

### **4. Smart Fallbacks**

```javascript
async function searchFlightsWithFallback(params) {
  try {
    // Try Air Scraper first
    return await airScraper.searchFlights(params);
  } catch (error) {
    console.error('Air Scraper failed, trying Amadeus fallback');

    // Fallback to Amadeus (keep for 1 month)
    return await amadeus.searchFlights(params);
  }
}
```

---

## 📊 Performance Targets

### **Scenario: User WITH Destination**
```
ÉTAPE 1: Price Calendar         ~1-2s
ÉTAPE 2: Search Flights (x3)    ~4s (parallel)
ÉTAPE 3: Search Hotels          ~2s (parallel with flights)
ÉTAPE 4: Claude Prompt          ~10s
───────────────────────────────────
TOTAL:                          ~15s ✅

With cache (70% hit rate):
TOTAL:                          ~11s ✅
```

### **Scenario: User WITHOUT Destination**
```
ÉTAPE 1: Flight Everywhere      ~2s
ÉTAPE 2: Filter Destinations    <100ms
ÉTAPE 3: Hotels (x5 parallel)   ~3s
ÉTAPE 4: Score & Rank           <100ms
ÉTAPE 5: Claude (x3 parallel)   ~15s
───────────────────────────────────
TOTAL:                          ~20s ✅

With cache (50% hit rate):
TOTAL:                          ~16s ✅
```

---

## 🚀 Implementation Plan

### **Phase 1: Hotels API** (1-2 jours)
- [ ] Create `hotelService.js` (Air Scraper hotels)
- [ ] Implement searchHotels()
- [ ] Implement getHotelDetails()
- [ ] Tests complets
- [ ] Cache strategy

### **Phase 2: Workflow Refactor** (2-3 jours)
- [ ] Refactor recommendationService.js
  - [ ] Scenario WITH destination
  - [ ] Scenario WITHOUT destination
  - [ ] Parallel API calls
  - [ ] Smart caching
- [ ] Update Claude prompts (optimized)
- [ ] Add destination profiles database

### **Phase 3: Destination Coverage** (1 jour)
- [ ] Create destination profiles (100+ cities)
- [ ] Add continent/country metadata
- [ ] Implement diversity algorithm
- [ ] Test coverage Asie, Afrique, Amériques

### **Phase 4: Testing & Optimization** (1-2 jours)
- [ ] E2E tests both scenarios
- [ ] Performance benchmarks
- [ ] Cache hit rate monitoring
- [ ] A/B test vs old workflow

---

## 💡 Key Recommendations

### **DO:**
1. ✅ Use Air Scraper for BOTH flights AND hotels (1 provider)
2. ✅ Separate prompts pour WITH vs WITHOUT destination
3. ✅ Parallel API calls partout
4. ✅ Cache agressivement (70% hit rate target)
5. ✅ Pre-compute destination profiles
6. ✅ Keep Amadeus as fallback for 1 month

### **DON'T:**
1. ❌ Single mega-prompt pour tout
2. ❌ Sequential API calls
3. ❌ Re-fetch même data plusieurs fois
4. ❌ Ignorer cache opportunities
5. ❌ Forget diversity (Europe only)

---

## 🎯 Expected Improvements

### **Coverage**
- Before: ~20 destinations (Europe heavy)
- After: 100+ destinations (global coverage)
- Asie: Bangkok, Tokyo, Singapore, Bali, etc.
- Afrique: Marrakech, Cairo, Cape Town, etc.
- Amériques: NYC, Buenos Aires, Mexico City, etc.

### **Data Quality**
- Before: Prix approximatifs, horaires manquants
- After: Prix réels, horaires exacts, reviews hotels

### **Performance**
- Before: ~20s, souvent timeout
- After: ~15s WITH dest, ~20s WITHOUT dest

### **Success Rate**
- Before: ~60% (beaucoup de "no flights")
- After: ~95% (Skyscanner coverage)

---

**Ready to implement?** 🚀

**Next:** Create hotelService.js with Air Scraper hotels API
