# Nouveau Workflow de Recommandations
## Air Scraper + Booking + Flixbus

---

## 🎯 Objectifs

1. **Prix en temps réel** - Données Skyscanner actualisées
2. **Horaires précis** - Pour créer le plan détaillé jour par jour
3. **Moins de destinations sans vols** - Meilleure couverture
4. **Recommandations personnalisées** - Basées sur onboarding riche
5. **Économies** - $8.99/mois vs ~$50/mois Amadeus

---

## 📊 User Data Available (Onboarding)

L'utilisateur fournit lors de l'onboarding:

```javascript
{
  // Location
  city: "Lyon",                    // Ville de départ (dynamique)
  nearestAirport: "LYS",           // Aéroport le plus proche

  // Calendar
  availableDates: [...],           // Dates libres (Google Calendar)
  preferredMonths: ["June", "September"], // Mois préférés

  // Transport preferences
  transportPreferences: {
    avion: true,                   // Peut décocher si no-fly
    train: true,
    bus: false,
  },

  // Values
  ecologyImportant: true,          // Importance écologie

  // Trip preferences
  activities: ["culture", "food", "nature"],
  budget: 1500,
  rhythmOfLife: "relaxed",         // ou "active"
}
```

---

## 🚀 Workflow Techniques

### **Cas 1: User AVEC destination fixe (Scenario C)**

**Input:**
```javascript
{
  destination: "Barcelona",
  dates: "2025-06-15 to 2025-06-20",
  budget: 800
}
```

**Processing:**
```
1. searchFlights (Air Scraper)
   → CDG/LYS → BCN, 2025-06-15
   → Retourne 20+ options triées par prix/qualité
   → Pick best 3: cheapest, fastest, best-rated

2. searchHotels (Booking API)
   → Barcelona, 2025-06-15 to 2025-06-20
   → Budget: €800 - flight_cost
   → Return 5 best hotels

3. IF ecologyImportant OR distance < 800km:
   → searchFlixbus (Flixbus API)
   → Paris → Barcelona
   → Compare train/bus vs flight

4. Create detailed plan:
   → Flight arrival time: 10:30 AM
   → Airport transfer: Aerobus (€5.90, 35min)
   → Hotel check-in: 2:00 PM
   → Activities with timing (from itineraryService)
   → Flight departure: 8:00 PM (last day)

5. Save to database:
   → flightDetails: { carrier, time, price, duration }
   → hotelDetails: { name, address, price, rating }
   → transportDetails: { type, routes, costs }
```

**Output:**
```javascript
{
  destination: {
    city: "Barcelona",
    country: "Spain",
    dates: "2025-06-15 to 2025-06-20"
  },

  transport: {
    flight: {
      outbound: {
        carrier: "Vueling",
        origin: "CDG",
        destination: "BCN",
        departureTime: "08:30",
        arrivalTime: "10:30",
        duration: "2h 00min",
        price: 89,
        co2: 150 // kg CO2
      },
      return: {
        carrier: "Vueling",
        origin: "BCN",
        destination: "CDG",
        departureTime: "20:00",
        arrivalTime: "22:00",
        duration: "2h 00min",
        price: 95
      }
    },
    alternatives: [
      {
        type: "train",
        provider: "Renfe-SNCF",
        duration: "6h 30min",
        price: 120,
        co2: 30,
        recommended: true // Si ecologyImportant
      }
    ]
  },

  hotel: {
    name: "Hotel Barcelona Center",
    address: "Carrer de Pelai, 28",
    rating: 4.2,
    pricePerNight: 95,
    totalPrice: 475,
    amenities: ["WiFi", "Breakfast", "AC"]
  },

  detailedPlan: [
    {
      day: 1,
      date: "2025-06-15",
      theme: "Arrival & Gothic Quarter",
      schedule: [
        {
          time: "10:30",
          activity: "Land at BCN Airport",
          type: "transport",
          tips: "Take Aerobus L1 to Plaça Catalunya (€5.90, 35min)"
        },
        {
          time: "12:00",
          activity: "Lunch at La Boqueria Market",
          location: "La Rambla, 91",
          cost: 15,
          type: "food"
        },
        // ... plus d'activités avec horaires précis
      ]
    }
    // ... autres jours
  ],

  totalCost: 659, // 89 + 95 (flights) + 475 (hotel)
  co2Total: 330,
  matchScore: 92 // Based on user preferences
}
```

---

### **Cas 2: User SANS destination (Scenario A - "Surprise me")**

**Input:**
```javascript
{
  destination: null,
  budget: 600,
  dates: "flexible", // ou specific
  preferences: ["beach", "culture", "food"]
}
```

**Processing:**
```
1. searchFlightEverywhere (Air Scraper)
   → Origin: user.city airport
   → Budget: 600
   → Returns 50+ destinations sorted by price

2. Filter by user preferences:
   → Match activities (beach, culture, food)
   → Match climate (if specified)
   → Match vibe (relaxed vs active)
   → Score each destination (0-100)

3. Top 10 destinations → Parallel fetch:
   → searchHotels (Booking)
   → getWeather (Weather API)
   → Calculate total trip cost

4. Rank by score:
   → Price weight: 40%
   → Preference match: 30%
   → Weather: 15%
   → Hidden gems bonus: 15%

5. Return top 3 recommendations
```

**Output:**
```javascript
{
  recommendations: [
    {
      rank: 1,
      destination: "Porto, Portugal",
      score: 95,
      matchReasons: [
        "Perfect for food lovers (pastéis de nata!)",
        "Beach within 30min",
        "Rich culture & architecture",
        "Under budget by €200"
      ],
      totalCost: 420,
      flight: { price: 68, ... },
      hotel: { price: 280, ... },
      weather: { avgTemp: 24, sunny: true },
      highlights: ["Port wine tasting", "Livraria Lello", "Beaches"]
    },
    {
      rank: 2,
      destination: "Prague, Czech Republic",
      score: 88,
      // ...
    },
    {
      rank: 3,
      destination: "Valencia, Spain",
      score: 85,
      // ...
    }
  ]
}
```

---

### **Cas 3: User avec dates flexibles**

**Input:**
```javascript
{
  destination: "Amsterdam",
  dates: {
    flexible: true,
    month: "June",
    duration: 5 // days
  },
  budget: 700
}
```

**Processing:**
```
1. getPriceCalendar (Air Scraper)
   → Paris → Amsterdam, June 2025
   → Returns price for each day of month

2. Cross-reference with user.availableDates:
   → Find dates where:
     * User is available (Google Calendar)
     * Flight price is low
     * Hotel availability good

3. Calculate total cost for each valid date range:
   → Flight (outbound + return)
   → Hotel (5 nights)
   → Rank by total cost

4. Return best 3 date options with prices
```

**Output:**
```javascript
{
  destination: "Amsterdam",
  dateOptions: [
    {
      dates: "June 12-17",
      totalCost: 580,
      savings: 120, // vs average
      flight: { outbound: 52, return: 58 },
      hotel: { total: 470 },
      reason: "Weekday travel = cheaper flights"
    },
    {
      dates: "June 19-24",
      totalCost: 650,
      savings: 50,
      // ...
    },
    {
      dates: "June 26-July 1",
      totalCost: 720,
      savings: -20,
      warning: "High season, more expensive"
    }
  ]
}
```

---

## 🚦 Transport Decision Logic

```javascript
function decideTransport(userProfile, destination, distance) {
  const options = [];

  // Always check flights (unless user opted out)
  if (userProfile.transportPreferences.avion) {
    const flights = await searchFlights(origin, destination);
    options.push({ type: 'flight', ...flights[0] });
  }

  // Check train/bus if:
  // 1. User prefers ecology
  // 2. Distance < 800km
  // 3. User opted out of flights
  if (
    userProfile.ecologyImportant ||
    distance < 800 ||
    !userProfile.transportPreferences.avion
  ) {
    const buses = await searchFlixbus(origin, destination);
    const trains = await searchTrains(origin, destination); // TODO: API?

    options.push({ type: 'bus', ...buses[0] });
    options.push({ type: 'train', ...trains[0] });
  }

  // Rank options
  return options.sort((a, b) => {
    let scoreA = 0, scoreB = 0;

    // Price weight: 40%
    scoreA += (200 - a.price) * 0.4;
    scoreB += (200 - b.price) * 0.4;

    // Ecology weight: 30% if important
    if (userProfile.ecologyImportant) {
      scoreA += (200 - a.co2) * 0.3;
      scoreB += (200 - b.co2) * 0.3;
    }

    // Duration weight: 30%
    scoreA += (500 - a.durationMinutes) * 0.3;
    scoreB += (500 - b.durationMinutes) * 0.3;

    return scoreB - scoreA;
  });
}
```

---

## 💾 Caching Strategy (In-Memory)

```javascript
// backend/src/utils/cache.js
const cache = new Map();

export function get(key) {
  const item = cache.get(key);

  if (!item) return null;

  // Check expiry
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

export function set(key, value, ttlMinutes) {
  cache.set(key, {
    value,
    expiry: Date.now() + (ttlMinutes * 60 * 1000)
  });
}

// Usage
const cacheKey = `flights:${origin}:${destination}:${date}`;
let flights = cache.get(cacheKey);

if (!flights) {
  flights = await searchFlights(origin, destination, date);
  cache.set(cacheKey, flights, 360); // 6 hours TTL
}
```

**Cache TTLs:**
- Flight searches: 6 hours (prix changent souvent)
- Price calendars: 12 hours (moins volatil)
- Airport data: 7 days (statique)
- Hotel searches: 6 hours
- Flixbus routes: 24 hours

---

## 📁 File Structure

```
backend/src/
├── services/
│   ├── airScraperService.js      (NEW)
│   ├── flixbusService.js          (NEW)
│   ├── bookingService.js          (KEEP)
│   ├── recommendationService.js   (REFACTOR)
│   └── itineraryService.js        (UPDATE - add flight times)
│
├── routes/
│   └── recommendations.js         (REFACTOR)
│
├── utils/
│   └── cache.js                   (NEW)
│
└── scripts/
    └── testAirScraper.js          (NEW - POC)
```

---

## 🧪 Testing Plan

### Phase 1: POC (1-2 days)
- ✅ Test Air Scraper API
- ✅ Validate data quality
- ✅ Check response times
- ✅ Compare prices with Skyscanner

### Phase 2: Service Layer (2-3 days)
- 🔧 Create airScraperService.js
- 🔧 Create flixbusService.js
- 🔧 Implement caching
- 🧪 Unit tests

### Phase 3: Workflow Integration (3-4 days)
- 🔄 Refactor recommendationService.js
- 🔄 Update routes
- 🔄 Update itineraryService (add flight times)
- 🧪 Integration tests

### Phase 4: Frontend Updates (2-3 days)
- 🎨 Update Results page (show flight times)
- 🎨 Update TripDetail (detailed plan with times)
- 🎨 Add transport alternatives UI
- 🧪 E2E tests

### Phase 5: Deployment (1 day)
- 🚀 Deploy to Railway
- 📊 Monitor API usage
- 🗑️ Remove Amadeus
- ✅ Validate production

**Total: ~2 weeks**

---

## 💰 Cost Analysis

### Current (Amadeus)
- Amadeus API: ~$50/month
- **Total: $50/month**

### New (Air Scraper + Booking + Flixbus)
- Air Scraper Pro: $8.99/month
- Booking API: Free
- Flixbus API: Free
- **Total: $8.99/month**

**Savings: $41.01/month (82% reduction!)**

---

## 🎯 Success Metrics

### Performance
- ✅ Response time < 5s for flight search
- ✅ Response time < 10s for full recommendations
- ✅ 95%+ API success rate

### Quality
- ✅ Prices match Skyscanner ±5%
- ✅ Flight times accurate
- ✅ 90%+ destinations have flight data
- ✅ Detailed plan includes real flight times

### Business
- ✅ Reduce API costs by 80%+
- ✅ Increase user satisfaction (better data)
- ✅ Reduce "no flights found" errors by 50%

---

## 🚀 Next Steps

**Immediate (Today):**
1. Subscribe Air Scraper free tier
2. Run POC test script
3. Validate data quality

**Week 1:**
4. Create airScraperService.js
5. Create flixbusService.js
6. Implement caching

**Week 2:**
7. Refactor recommendation workflow
8. Update itinerary service
9. Test end-to-end

**Week 3:**
10. Update frontend
11. Deploy to production
12. Monitor & optimize

**Week 4:**
13. Remove Amadeus dependency
14. Celebrate! 🎉
