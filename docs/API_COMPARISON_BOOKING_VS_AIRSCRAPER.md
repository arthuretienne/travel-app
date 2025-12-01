# API Comparison: Booking.com API vs Air Scraper API

**Date:** 2025-11-30
**Context:** Air Scraper API est cassée - évaluation de Booking.com API comme remplacement

---

## 📊 Comparison Overview

| Feature | Air Scraper API | Booking.com API | Status |
|---------|----------------|-----------------|--------|
| **Hotels** | ✅ Fonctionne | ✅ Disponible | ✅ REMPLACEMENT POSSIBLE |
| **Flights** | ❌ Cassé | ✅ Disponible | ✅ REMPLACEMENT POSSIBLE |
| **Search Everywhere** | ❌ Cassé | ❌ PAS DISPONIBLE | ⚠️ PROBLÈME MAJEUR |
| **Price Calendar** | ❌ Cassé | ✅ getMinPrice | ⚠️ FONCTIONNALITÉ DIFFÉRENTE |
| **Free Tier** | 500 req/month | **50 req/month** | ⚠️ LIMITE TRÈS BASSE |

---

## 🔍 Detailed Analysis

### 1. HOTELS

#### Air Scraper API (Actuel - Cassé)
```javascript
// Step 1: Search destination
GET /api/v2/hotels/searchDestination
params: { query: 'Barcelona', locale: 'fr-FR' }
→ Returns: entityId

// Step 2: Search hotels
GET /api/v2/hotels/searchHotels
params: { entityId, checkin, checkout, adults, rooms, currency, market }
→ Returns: Hotels avec prix, photos, ratings
```

#### Booking.com API (Nouveau)
```javascript
// Step 1: Search destination (MANQUANT DANS TA DOC!)
// On suppose qu'il existe un endpoint similaire pour obtenir dest_id

// Step 2: Search hotels
GET /api/v1/hotels/searchHotels
params: {
  dest_id: -2092174,        // ⚠️ Doit être obtenu d'abord
  search_type: 'CITY',
  arrival_date: 'yyyy-mm-dd',
  departure_date: 'yyyy-mm-dd',
  adults: 1,
  room_qty: 1,
  currency_code: 'EUR'
}
→ Returns: Hotels avec prix, photos, ratings
```

**VERDICT HOTELS:** ✅ **REMPLACEMENT POSSIBLE**
- Fonctionnalité équivalente
- ⚠️ BESOIN de l'endpoint pour chercher `dest_id` (probablement existe)

---

### 2. FLIGHTS

#### Air Scraper API (Actuel - Cassé)
```javascript
// Step 1: Search airport
GET /api/v1/flights/searchAirport
params: { query: 'Paris', locale: 'fr-FR' }
→ Returns: skyId, entityId

// Step 2: Search flights
GET /api/v2/flights/searchFlights
params: {
  originSkyId, destinationSkyId,
  originEntityId, destinationEntityId,
  date, returnDate, cabinClass, adults
}
→ Returns: Flights aller-retour

// Step 3: Search Everywhere (CRITIQUE!)
GET /api/v2/flights/searchFlightEverywhere
params: { originEntityId, cabinClass, journeyType, currency }
→ Returns: **TOUS les vols depuis Paris vers N'IMPORTE QUELLE destination**
```

#### Booking.com API (Nouveau)
```javascript
// Step 1: Search location (MANQUANT DANS TA DOC!)
// api/v1/flights/searchDestination mentionné mais pas documenté

// Step 2: Search flights
GET /api/v1/flights/searchFlights
params: {
  fromId: 'BOM.AIRPORT',    // ⚠️ Doit être obtenu d'abord
  toId: 'DEL.AIRPORT',      // ⚠️ DESTINATION DOIT ÊTRE CONNUE!
  departDate: 'yyyy-mm-dd',
  returnDate: 'yyyy-mm-dd',
  adults: 1,
  cabinClass: 'ECONOMY',
  currency_code: 'EUR'
}
→ Returns: Flights aller-retour

// Step 3: Get Min Price
GET /api/v1/flights/getMinPrice
params: { fromId, toId, cabinClass, currency_code }
→ Returns: Prix minimum pour cette route SPÉCIFIQUE
```

**VERDICT FLIGHTS:** ⚠️ **REMPLACEMENT PARTIEL**
- ✅ Peut chercher des vols si destination est connue
- ❌ **PAS d'équivalent à "searchFlightEverywhere"**
- ❌ **DOIT CONNAÎTRE LA DESTINATION À L'AVANCE**

---

## 🚨 PROBLÈME MAJEUR: "Search Everywhere" Manquant

### Workflow Actuel (Avec Air Scraper)
```
User: "Je veux partir 7 jours, budget €800, j'aime la culture"
     ↓
1. searchFlightEverywhere(from: Paris, budget: €800)
   → Returns: Barcelona (€272), Lisbon (€189), Amsterdam (€245)
     ↓
2. Pick best destination based on user preferences
     ↓
3. searchFlights(Paris → Barcelona)
     ↓
4. Return full trip recommendation
```

### Workflow avec Booking.com API
```
User: "Je veux partir 7 jours, budget €800, j'aime la culture"
     ↓
❌ IMPOSSIBLE de faire searchFlightEverywhere!
     ↓
SOLUTION 1: Claude AI génère liste de destinations
     ↓
1. Claude suggests: ["Barcelona", "Lisbon", "Amsterdam"]
     ↓
2. searchFlights(Paris → Barcelona)
   searchFlights(Paris → Lisbon)
   searchFlights(Paris → Amsterdam)
   → 3 API calls au lieu de 1
     ↓
3. Pick best destination based on prices + preferences
     ↓
4. Return full trip recommendation
```

---

## 📉 Impact sur les API Calls

### Scénario: User demande 1 trip recommendation

| Étape | Air Scraper API | Booking.com API |
|-------|----------------|-----------------|
| Search destinations | 1 call (searchEverywhere) | **0 calls** (Claude génère liste) |
| Search flights | 1 call (best destination) | **3-5 calls** (chaque destination) |
| Search hotels | 1 call | 1 call |
| Get hotel details | 1 call | 1 call |
| **TOTAL** | **4 calls** | **5-7 calls** |

### Avec Free Tier (50 requests/month)
- **Air Scraper:** 500 calls = ~125 trips/month
- **Booking.com:** 50 calls = ~7-10 trips/month ⚠️ **ÉNORME LIMITATION**

---

## 💡 Solutions Proposées

### OPTION 1: Hybrid Approach (RECOMMANDÉ)
**Keep Air Scraper for "searchEverywhere", use Booking.com pour le reste**

```javascript
// Si searchEverywhere fonctionne → use Air Scraper
const destinations = await airScraperService.searchFlightEverywhere(...)

// Pour flights + hotels → use Booking.com
const flights = await bookingService.searchFlights(...)
const hotels = await bookingService.searchHotels(...)
```

**PROS:**
- ✅ Garde la fonctionnalité "discover destinations"
- ✅ Fallback si Air Scraper se répare
- ✅ Économise les 50 calls de Booking.com

**CONS:**
- ⚠️ Si Air Scraper est VRAIMENT mort → cette option ne marche pas

---

### OPTION 2: Claude-Powered Destinations (FALLBACK)
**Claude AI génère liste de destinations basée sur preferences**

```javascript
// Prompt Claude
"User wants: 7 days, €800 budget, cultural trip from Paris
Suggest 5 European destinations that match these criteria"

→ Claude returns: ["Barcelona", "Lisbon", "Prague", "Budapest", "Athens"]

// Then search flights for each
const results = await Promise.all(
  destinations.map(dest => bookingService.searchFlights(paris, dest))
)

// Pick best based on actual prices
const bestTrip = pickBestDestination(results, userPreferences)
```

**PROS:**
- ✅ Fonctionne même si Air Scraper est mort
- ✅ Claude peut utiliser knowledge de saisonnalité, événements, etc.
- ✅ Plus intelligent que simple API call

**CONS:**
- ⚠️ **3-5 API calls** au lieu de 1 (consomme le quota rapidement)
- ⚠️ Limite à **50 calls/month = ~10 trips max**
- ⚠️ Pas de vraies données de prix avant l'appel API

---

### OPTION 3: Upgrade to Pro Plan ($8.99/month)
**35,000 calls/month au lieu de 50**

**PROS:**
- ✅ Plus de limitation de quota (35k calls)
- ✅ Peut faire Option 2 sans problème

**CONS:**
- ⚠️ Coût: $8.99/month
- ⚠️ Toujours pas de "searchEverywhere" endpoint

---

## 🎯 RECOMMANDATION FINALE

### Court Terme (Immédiat)
**Tester Booking.com API pour voir si elle fonctionne vraiment**

```bash
# Test 1: Search flights Paris → Barcelona
curl "https://booking-com15.p.rapidapi.com/api/v1/flights/searchFlights?..."

# Test 2: Search hotels Barcelona
curl "https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotels?..."

# Test 3: Vérifier si searchDestination existe pour flights
curl "https://booking-com15.p.rapidapi.com/api/v1/flights/searchDestination?..."
```

**Si ça fonctionne → Implémenter OPTION 2 (Claude-Powered Destinations)**

### Moyen Terme (Si usage augmente)
**Upgrade to Pro Plan ($8.99/month)** pour avoir 35k calls

### Long Terme (Production)
**Chercher une API avec "search everywhere" équivalent**
- Amadeus API
- Kiwi.com API
- Skyscanner Direct API

---

## 📋 Changements Nécessaires si Migration

### 1. Nouveau Service: `bookingService.js`
```javascript
// backend/src/services/bookingService.js
const BASE_URL = 'https://booking-com15.p.rapidapi.com';
const BOOKING_API_KEY = process.env.BOOKING_API_KEY;

export async function searchFlights({ fromId, toId, departDate, returnDate, ... }) {
  // Implementation
}

export async function searchHotels({ dest_id, arrival_date, departure_date, ... }) {
  // Implementation
}

export async function getFlightMinPrice({ fromId, toId, cabinClass }) {
  // Implementation
}
```

### 2. Modifier `destinationService.js`
```javascript
// AVANT: Air Scraper searchEverywhere
const destinations = await airScraperService.searchFlightEverywhere({
  originQuery: userOrigin,
  currency: 'EUR',
  maxBudget: userBudget
});

// APRÈS: Claude génère destinations
const suggestedDestinations = await claudeService.suggestDestinations({
  origin: userOrigin,
  budget: userBudget,
  preferences: userPreferences,
  duration: tripDuration
});

// Puis chercher vols pour chaque destination
const flightResults = await Promise.all(
  suggestedDestinations.map(dest =>
    bookingService.searchFlights({
      fromId: originId,
      toId: dest.id,
      departDate: dates.departure,
      returnDate: dates.return
    })
  )
);
```

### 3. Variables d'environnement
```bash
# .env
BOOKING_API_KEY=b723f67a8cmshf49874500229ca8p12d559jsnedd1aee8f4ea
BOOKING_API_HOST=booking-com15.p.rapidapi.com
```

---

## ⚡ Next Steps

1. **Test Booking.com API avec quelques calls** (tu as 50/month)
2. **Vérifier si `searchDestination` existe** pour flights (mentionné mais pas documenté)
3. **Décider**:
   - Keep Air Scraper (si se répare)
   - Migrate to Booking.com (si marche bien)
   - Upgrade to Pro ($8.99/month)
4. **Implémenter Claude-Powered Destinations** comme fallback

---

**VERDICT:** ⚠️ **MIGRATION POSSIBLE MAIS AVEC TRADE-OFFS**
- ✅ Booking.com API peut remplacer fonctionnalités de base
- ❌ Perte de "searchEverywhere" = workflow plus lent et coûteux
- ⚠️ Free tier (50 calls) = **~10 trips/month max** (vs 125 avec Air Scraper)
- 💰 Pro plan ($8.99) nécessaire pour usage réel

**NEXT ACTION:** Tester Booking.com API maintenant pour confirmer qu'elle fonctionne!
