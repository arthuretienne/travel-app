# 🚀 Stratégie d'Amélioration de l'Algorithme de Recommandation

**Date**: Novembre 2024
**Objectif**: Transformer le MVP en assistant de voyage intelligent avec des recommandations précises et budget-friendly

---

## 📊 Problèmes Actuels Identifiés

### 🔴 Critiques
1. **Budget non respecté** - Recommandations à 3000€ pour budget 1000€
2. **Hotels manquants** - Aucune offre pour Porto/Prague dans les tests
3. **Prix non validés** - Estimations basiques sans vérification marché réel
4. **Données incomplètes** - Pas de fallback robuste quand API échoue

### 🟡 Importants
5. **Transport limité** - Uniquement avion (pas de train, bus, vélo)
6. **Pas d'activités** - Aucune recommandation d'activités locales
7. **Pas d'affiliation** - Aucune commission sur réservations
8. **Scoring simpliste** - Ne prend pas assez en compte le budget

---

## 🎯 Solutions par Priorité

## Phase 1: FIXES CRITIQUES (Urgent - Cette semaine)

### 1.1 Filtrage Budgétaire Strict ⭐⭐⭐

**Problème**: Recommandations hors budget
**Solution**: Filtrer AVANT de présenter à l'utilisateur

```javascript
// Nouveau flux dans travel.js
function filterByBudget(recommendations, userBudget) {
  return recommendations.filter(rec => {
    const totalCost = rec.cost.total;
    const withinBudget = totalCost <= userBudget * 1.1; // Max 10% au-dessus

    if (!withinBudget) {
      console.log(`❌ Filtered out ${rec.city}: ${totalCost}€ exceeds budget ${userBudget}€`);
    }

    return withinBudget;
  });
}
```

**Impact**: Élimine toutes les options irréalistes
**Effort**: 1 heure
**Dépendances**: Aucune

---

### 1.2 Optimisation Amadeus + Meilleur Caching ⭐⭐⭐

**Problème**: Quotas Amadeus limités, requêtes inefficaces
**Solution**: Optimiser les appels API + cache agressif

#### Optimisations Amadeus:

1. **Réduire les appels inutiles**
```javascript
// Avant: 10 destinations → 10 appels API
// Après: Filtrer par distance/budget AVANT d'appeler Amadeus

function preFilterDestinations(destinations, userBudget, maxFlightHours) {
  return destinations.filter(dest => {
    // Estimation rapide SANS API
    const estimatedFlightCost = estimateFlightCostByDistance(dest.distance);
    const estimatedHotelCost = estimateHotelCost(dest, slot, style);
    const estimatedTotal = estimatedFlightCost + estimatedHotelCost + 200; // Activities

    return estimatedTotal <= userBudget * 1.2;
  });
}
```

2. **Batch requests quand possible**
```javascript
// Au lieu de 3 appels séparés pour 3 villes
// Utiliser Flight Inspiration API pour tout filtrer d'un coup
```

3. **Cache plus long**
```javascript
const CACHE_TTL = {
  FLIGHT_DESTINATIONS: 3600 * 24 * 7, // 7 jours au lieu de 1
  FLIGHT_OFFERS: 3600 * 12,           // 12h au lieu de 2h
  HOTELS: 3600 * 24 * 3,              // 3 jours
};
```

**Impact**: Division par 5 des appels API Amadeus
**Effort**: 3 heures
**ROI**: Économie de quota + vitesse

---

### 1.3 Fallbacks Hotels Robustes ⭐⭐

**Problème**: "No hotel offers found for Porto/Prague"
**Solution**: Chaîne de fallback intelligente

#### Stratégie de Fallback:

```javascript
async function getHotelPricing(destination, slot, userPreferences) {
  // Niveau 1: Amadeus Hotel API (préféré)
  let hotelData = await searchHotels(destination, slot, userPreferences);
  if (hotelData) return hotelData;

  // Niveau 2: Prix moyens Booking.com via web scraping léger
  hotelData = await scrapeBookingPrices(destination, slot);
  if (hotelData) return hotelData;

  // Niveau 3: Base de données de prix moyens par ville
  hotelData = await getHistoricalHotelPrices(destination.city, slot.season);
  if (hotelData) return hotelData;

  // Niveau 4: Estimation améliorée (dernier recours)
  return {
    averagePrice: calculateSmartEstimate(destination, slot, userPreferences),
    hotels: generatePlaceholderHotels(destination),
    source: 'estimated',
    confidence: 'low'
  };
}
```

#### Amélioration des Estimations:

```javascript
// Données réelles de prix moyens par ville (manuellement collectées)
const REAL_HOTEL_PRICES = {
  'Paris': { budget: 60, mid: 120, luxury: 250 },
  'Prague': { budget: 35, mid: 70, luxury: 150 },
  'Porto': { budget: 40, mid: 80, luxury: 180 },
  'Tokyo': { budget: 50, mid: 100, luxury: 300 },
  // ... 50+ villes populaires
};

function calculateSmartEstimate(destination, slot, userPreferences) {
  // Utiliser vraies données si disponibles
  if (REAL_HOTEL_PRICES[destination.city]) {
    const cityPrices = REAL_HOTEL_PRICES[destination.city];
    const priceCategory = mapStyleToCategory(userPreferences.style);
    const basePrice = cityPrices[priceCategory];

    // Ajuster pour saison haute/basse
    const seasonalMultiplier = getSeasonalMultiplier(slot.season, destination.city);

    return Math.round(basePrice * seasonalMultiplier * slot.duration);
  }

  // Sinon utiliser l'estimation existante (améliorée)
  return estimateHotelCost(destination, slot, userPreferences.style);
}
```

**Impact**: Toujours des prix réalistes, même si API échoue
**Effort**: 4 heures (collecte données + code)
**Dépendances**: Aucune API externe

---

## Phase 2: ENRICHISSEMENT (Important - Semaine prochaine)

### 2.1 APIs Gratuites & Alternatives

#### 🎯 APIs Recommandées (Free Tier Généreux)

| Service | Type | Quota Gratuit | Avantages |
|---------|------|---------------|-----------|
| **Amadeus Self-Service** | Vols + Hôtels | 2000 calls/mois | ✅ Déjà intégré, fiable |
| **Kiwi.com Tequila** | Vols + Trains | Commission-based | ✅ Pas de limite, multi-modal |
| **OpenTripMap** | Points d'intérêt | 1000 calls/jour | ✅ 100% gratuit, activités |
| **Geoapify** | Geocoding | 3000 calls/jour | ✅ Gratuit, pour coordonnées |

#### 🚂 Transport Alternatif

**Option 1: Google Maps Directions API** (Recommandé)
- **Quota**: 40,000 requests/mois gratuits
- **Modes**: Train, bus, vélo, marche, voiture
- **Avantage**: Données temps-réel, toutes les villes
- **Inconvénient**: Pas de prix directs

```javascript
async function getAlternativeTransport(origin, destination, date) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?` +
    `origin=${origin}&destination=${destination}&` +
    `mode=transit&transit_mode=train|bus&` +
    `departure_time=${date}&key=${GOOGLE_MAPS_API_KEY}`
  );

  // Retourne: durée, correspondances, type de transport
  // Puis on estime le prix selon distance
}
```

**Option 2: Base de données de prix trains** (Manuel)
- Collecter prix moyens par route populaire
- Ex: Paris-Marseille TGV = 40-80€, Paris-Amsterdam Thalys = 80-150€
- 50-100 routes couvrent 80% des voyages européens

**Option 3: Kiwi.com API** (Si budget permet)
- Inclut trains + bus dans résultats vols
- Commission sur réservation (pas de frais fixes)

---

### 2.2 Activités + Affiliation ⭐⭐

**APIs Gratuites pour Activités**:

1. **OpenTripMap API** (100% gratuit)
```javascript
async function getLocalActivities(lat, lon, radius = 5000) {
  const response = await fetch(
    `https://api.opentripmap.com/0.1/en/places/radius?` +
    `radius=${radius}&lon=${lon}&lat=${lat}&` +
    `rate=3&format=json&apikey=${OPENTRIPMAP_KEY}`
  );

  // Retourne: musées, monuments, parcs, etc.
}
```

2. **Programmes d'Affiliation** (Commission sans frais):

| Plateforme | Commission | Signup |
|------------|-----------|--------|
| GetYourGuide | 6-8% | Gratuit |
| Viator (TripAdvisor) | 8-10% | Gratuit |
| Booking.com | 25-40% | Gratuit |
| Trainline | 3-5% | Approval requis |

**Implémentation**:

```javascript
function generateActivityLinks(destination, activities) {
  return activities.map(activity => ({
    name: activity.name,
    type: activity.type,
    description: activity.description,
    bookingUrl: `https://www.getyourguide.com/s/?q=${encodeURIComponent(activity.name + ' ' + destination.city)}&partner_id=YOUR_ID`,
    estimatedPrice: estimatePriceByType(activity.type)
  }));
}
```

**Impact**: Revenus d'affiliation + contenu enrichi
**Effort**: 5 heures
**ROI**: Potentiel de revenus dès premiers utilisateurs

---

### 2.3 Scoring Amélioré ⭐⭐

**Nouveau système de scoring**:

```javascript
function calculateFinalScore(destination, userProfile, pricing) {
  const weights = {
    budgetFit: 0.35,      // 35% - Le plus important!
    activityMatch: 0.25,  // 25%
    climate: 0.15,        // 15%
    distance: 0.10,       // 10%
    popularity: 0.10,     // 10%
    seasonality: 0.05     // 5%
  };

  const scores = {
    budgetFit: calculateBudgetScore(pricing.total, userProfile.budget),
    activityMatch: calculateActivityScore(destination.activities, userProfile.preferences),
    climate: calculateClimateScore(destination.climate, userProfile.climatePref),
    distance: calculateDistanceScore(destination.distance, userProfile.maxFlightHours),
    popularity: destination.popularityScore / 10,
    seasonality: calculateSeasonScore(destination, slot.season)
  };

  const finalScore = Object.entries(scores).reduce((total, [key, score]) => {
    return total + (score * weights[key]);
  }, 0);

  return Math.round(finalScore * 100); // Score sur 100
}

// Budget score favorise les options SOUS budget
function calculateBudgetScore(totalCost, userBudget) {
  if (totalCost > userBudget) return 0; // Éliminé

  const ratio = totalCost / userBudget;

  // Meilleur score entre 70-90% du budget
  if (ratio >= 0.7 && ratio <= 0.9) return 1.0;
  if (ratio < 0.7) return 0.8;  // Trop cheap peut être suspect
  if (ratio > 0.9) return 0.5;  // Proche limite
}
```

**Impact**: Recommandations vraiment pertinentes
**Effort**: 2 heures

---

## Phase 3: NICE-TO-HAVE (Si temps/budget)

### 3.1 Modes de Transport Écologiques

- **Vélo longue distance**: API EuroVelo (gratuit)
- **Covoiturage**: BlaBlaCar API (affiliation)
- **Bus longue distance**: FlixBus API (affiliation)

### 3.2 Validation Temps-Réel des Prix

- Comparer avec Kayak/Skyscanner via scraping
- Alerter si écart > 20% vs estimation

---

## 🛠️ Plan d'Implémentation Recommandé

### Semaine 1 (Urgent)
- [x] Jour 1-2: Filtrage budgétaire strict
- [ ] Jour 3-4: Optimisation Amadeus + cache
- [ ] Jour 5: Fallbacks hotels robustes
- [ ] Jour 6: Tests + validation

### Semaine 2 (Important)
- [ ] Jour 1-2: Base de données prix réels (50 villes)
- [ ] Jour 3-4: Intégration OpenTripMap (activités)
- [ ] Jour 5: Affiliation GetYourGuide + Booking
- [ ] Jour 6: Nouveau scoring

### Semaine 3+ (Nice-to-have)
- [ ] Google Maps integration (train/bus)
- [ ] Programmes d'affiliation transport
- [ ] Modes écologiques

---

## 📈 Métriques de Succès

| Métrique | Avant | Objectif |
|----------|-------|----------|
| % recommandations hors budget | 60% | < 5% |
| Hotels avec prix réels | 40% | > 80% |
| Appels API Amadeus / recherche | 15 | < 5 |
| Temps réponse moyen | 15s | < 10s |
| Options transport par reco | 1 | 2-3 |
| Activités par destination | 0 | 5-10 |

---

## 💰 Coûts Estimés

| Service | Coût |
|---------|------|
| Amadeus (2000/mois gratuit) | 0€ |
| OpenTripMap | 0€ |
| Google Maps API (40k/mois gratuit) | 0€ |
| Affiliation (commission only) | 0€ fixe |
| **Total mensuel MVP** | **0€** |

Une fois 100+ utilisateurs/jour:
- Amadeus: ~50€/mois
- Google Maps: ~30€/mois
- **Total avec trafic** | **~80€/mois**

---

## ✅ Quick Wins (Aujourd'hui)

1. **Filtrage budget** (1h)
2. **Cache TTL x3** (15 min)
3. **Ajouter 20 villes prix réels** (1h)
4. **Total: 2h15 de dev pour 50% d'amélioration**

---

**Prochaine étape**: Implémenter les Quick Wins ?
