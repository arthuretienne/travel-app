# Air Scraper API - Proof of Concept

## Objectif

Tester la qualité et performance de l'API Air Scraper (Skyscanner) avant migration complète depuis Amadeus.

## Setup

1. Subscribe to Air Scraper API (RapidAPI):
   - Free tier: 20 req/month (pour tests)
   - Pro tier: $8.99/month, 10k req/month (pour production)

2. Add API key to `.env`:
```bash
AIR_SCRAPER_API_KEY=your_rapidapi_key_here
```

3. Run test:
```bash
cd backend
node src/scripts/testAirScraper.js
```

## Test Scenarios

### Scenario A: User avec destination fixe
- **Use Case:** User sait où il veut aller et quand
- **Example:** Paris → Barcelona, 15 juin 2025
- **API:** `searchFlights` v2
- **Expected:** Prix exact, horaires, compagnies, durée

### Scenario B: User avec dates flexibles
- **Use Case:** User sait où aller mais cherche dates les moins chères
- **Example:** Paris → Amsterdam en juin 2025
- **API:** `getPriceCalendar`
- **Expected:** Prix par jour, trouve date optimale

### Scenario C: User sans destination
- **Use Case:** User veut inspiration, cherche destinations pas chères
- **Example:** Depuis Paris, budget max €200
- **API:** `searchFlightEverywhere`
- **Expected:** Liste destinations triées par prix

## Metrics à Évaluer

### 1. Performance
- ⏱️ Temps de réponse (cible: <3s)
- 📊 Taux de succès (cible: >95%)

### 2. Qualité des Données
- ✅ Prix cohérents avec Skyscanner
- ✅ Horaires précis (departure/arrival times)
- ✅ Détails compagnies
- ✅ Durée de vol
- ✅ Nombre d'escales

### 3. Coverage
- 🌍 Destinations européennes (priorité)
- 🌎 Destinations internationales
- ✈️ Low-cost carriers (Ryanair, EasyJet, etc.)

## Expected Output

```
🚀 Starting Air Scraper API Tests...

============================================================

📋 TEST 1: Specific Flight Search (Paris → Barcelona)
------------------------------------------------------------
✅ searchFlights SUCCESS (2450ms)
   Origin: CDG → Destination: BCN
   Date: 2025-06-15
   Found 3 flights:
   1. €89 - Vueling
      Departure: 2025-06-15T08:30:00
      Arrival: 2025-06-15T10:30:00
      Duration: 120min
   2. €125 - Air France
      Departure: 2025-06-15T14:15:00
      Arrival: 2025-06-15T16:20:00
      Duration: 125min
   3. €156 - Iberia
      Departure: 2025-06-15T18:45:00
      Arrival: 2025-06-15T20:50:00
      Duration: 125min

📋 TEST 2: Price Calendar (Paris → Amsterdam, June 2025)
------------------------------------------------------------
✅ getPriceCalendar SUCCESS (1850ms)
   Origin: CDG → Destination: AMS
   Month: 2025-6
   Cheapest date: 2025-06-12 (€52)
   Price range: €52 - €145

📋 TEST 3: Search Flight Everywhere (Paris, Budget €200)
------------------------------------------------------------
✅ searchFlightEverywhere SUCCESS (3200ms)
   Origin: CDG
   Budget: €200
   Found 10 destinations under €200:
   1. Porto - €68
   2. Prague - €75
   3. Budapest - €82
   4. Lisbon - €95
   5. Vienna - €102
   6. Athens - €115
   7. Rome - €128
   8. Madrid - €135
   9. Copenhagen - €148
   10. Stockholm - €165

============================================================
✅ Tests completed!
```

## Décision Go/No-Go

### ✅ GO si:
- Response time < 5s
- Success rate > 90%
- Prices match Skyscanner website
- Detailed flight info (times, carriers, duration)

### ❌ NO-GO si:
- Response time > 10s
- Success rate < 70%
- Missing critical data (times, prices)
- Too many API errors

## Next Steps

Si POC successful:
1. ✅ Subscribe to Pro plan ($8.99/month)
2. 🔧 Create `airScraperService.js`
3. 🔧 Create `flixbusService.js`
4. 🔄 Refactor recommendation workflow
5. 🧪 Test end-to-end
6. 🚀 Deploy and monitor
7. 🗑️ Remove Amadeus dependency

## Resources

- API Docs: https://rapidapi.com/3b-data-3b-data-default/api/sky-scrapper
- RapidAPI Dashboard: https://rapidapi.com/developer/dashboard
- Skyscanner (for comparison): https://www.skyscanner.fr
