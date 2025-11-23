# 📊 Analyse du Flux de Données - Onboarding → Claude

## 🗂️ Ce qui est récupéré de la Database

### **Table: UserPreferences** (Onboarding complet)

Voici TOUTES les données récupérées depuis `prisma.userPreferences.findUnique()`:

```javascript
{
  // ===== ONBOARDING CORE =====
  onboardingCompleted: boolean,
  onboardingType: string,           // 'complete' ou 'quick'

  // ===== MOTIVATIONS & STYLE =====
  whyTravel: string,                // Ex: "Découvrir de nouvelles cultures"
  mainGoal: string,                 // Ex: "Culture et patrimoine"
  globalStyle: string,              // Ex: "Routard", "Confort", "Luxe"
  riskTolerance: int,               // 1-5
  originalityAppetite: int,         // 1-5
  introvertExtrovert: int,          // 1-5
  plannerImprovisator: int,         // 1-5
  modernComfortAuth: int,           // 1-5

  // ===== ACTIVITÉS =====
  topActivities: string[],          // Ex: ["randonnée", "culture", "gastronomie"]
  idealRhythm: string,              // Ex: "intense", "balanced", "relaxed"

  // ===== LOGEMENT =====
  accommodationPref: string,        // Ex: "hotel", "hostel", "airbnb"
  comfortAuthSlider: int,           // 1-5
  stayOrMove: string,               // "stay" ou "move"

  // ===== TRANSPORT =====
  transportModes: string[],         // Ex: ["train", "bus", "car"]
  transportComfort: string,         // Ex: "economy", "premium"
  maxTransportHours: int,           // Heures max de transport/jour
  materialComfort: string,          // Ex: "minimalist", "comfortable"

  // ===== CONTRAINTES =====
  visaPreference: string,           // Ex: "visa_free", "simple", "any"
  avoidCountries: string[],         // Ex: ["USA", "China"]
  mobilityNeeds: string,            // Ex: "none", "wheelchair", "reduced"
  mobilityDetails: string,          // Détails si besoin spécial

  // ===== PERSONNALITÉ VOYAGE =====
  securityImportance: string,       // Ex: "low", "medium", "high"
  crowdTolerance: string,           // Ex: "love", "ok", "avoid"
  ecoSensitivity: string,           // Ex: "low", "medium", "high"
  culturalAdaptability: string,     // Ex: "low", "medium", "high"
  climateSensitivity: string,       // Ex: "low", "medium", "high"

  // ===== FRÉQUENCE & BUDGET =====
  tripsPerYear: int,                // Nombre de voyages/an
  departureFlexibility: string,     // Ex: "semaine", "weekend", "peu-importe"

  // ===== CALENDAR INTEGRATION =====
  calendarConnected: boolean,
  calendarType: string,             // Ex: "google"
  calendarAccessToken: string,
  calendarRefreshToken: string,
  calendarTokenExpiry: datetime,

  // ===== CONGÉS =====
  annualLeaveDays: int,             // Ex: 25
  takenLeaveDays: int,              // Ex: 10 (déjà pris)
  avgTripDuration: int,             // Ex: 7 jours

  // ===== AÉROPORTS =====
  preferredAirports: string[],      // Ex: ["CDG", "ORY"]

  // ===== QUICK FORM (legacy) =====
  budget: int,                      // Ex: 2000
  style: string,                    // Ex: "adventure"
  preferredMonths: string[],        // Ex: ["may", "jun"]
  activities: string[],             // Ex: ["cultural", "nature"]
  maxFlightHours: int,              // Ex: 6
  destinationPref: string,          // Ex: "any", "popular", "off-beaten"
}
```

---

## 📤 Ce qui est ENVOYÉ au Frontend (dans le form de recherche)

```javascript
// Frontend envoie ça dans POST /api/travel/recommendations
{
  "basic": {
    "budget": 2250,
    "style": "adventure",
    "activities": ["cultural", "nature"],
    "maxFlightHours": 6,
    "destinationPreference": "any",
    "travelers": 1
  },
  "preferences": {
    "climate": "any",
    "accommodation": "hotel",
    "pace": "moderate",
    "gastronomy": "important",
    "natureVsCity": 50,
    "nightlife": "optional",
    "activitiesBudget": 20
  },
  "constraints": {
    "budget": 2250,
    "maxFlightHours": 6,
    "avoidCountries": []
  },
  "availability": {
    "duration": 7,
    "timeHorizon": "6-mois",
    "idealDuration": "7-jours",
    "flexibleDates": true,
    "preferredMonths": [],
    "originCity": "CDG",
    "professionalStatus": "salaried",
    "departureFlexibility": "peu-importe"
  },
  "chatbotPreferences": {
    "tone": "friendly"
  }
}
```

---

## 🔄 Ce qui est MERGÉ dans le Backend

Dans `backend/src/routes/travel.js:38-55`, on merge l'onboarding:

```javascript
userProfile.onboardingPreferences = {
  whyTravel: userPreferences.whyTravel,
  mainGoal: userPreferences.mainGoal,
  globalStyle: userPreferences.globalStyle,
  topActivities: userPreferences.topActivities || [],
  idealRhythm: userPreferences.idealRhythm,
  accommodationPref: userPreferences.accommodationPref,
  transportModes: userPreferences.transportModes || [],
  maxTransportHours: userPreferences.maxTransportHours,
  visaPreference: userPreferences.visaPreference,
  mobilityNeeds: userPreferences.mobilityNeeds,
  securityImportance: userPreferences.securityImportance,
  crowdTolerance: userPreferences.crowdTolerance,
  ecoSensitivity: userPreferences.ecoSensitivity,
  culturalAdaptability: userPreferences.culturalAdaptability,
  climateSensitivity: userPreferences.climateSensitivity,
  preferredAirports: userPreferences.preferredAirports || [],
};
```

---

## 🤖 Ce qui est UTILISÉ par Claude

Dans `backend/src/services/claudeService.js:buildPrompt()`, le prompt inclut:

### **Données du Form (basic, preferences, constraints)**
```
Budget: €2250
Style: adventure
Activities: cultural, nature
Max flight duration: 6h
Destination preference: any

Climate: any
Accommodation: hotel
Pace: moderate
Gastronomy importance: important
Nature vs City: 50% nature
Nightlife: optional
Activities budget: 20%
Avoid crowds: ...

Languages: ...
Security: ...
Visa: ...
Mobility: ...
Travelers: 1
```

### **Données de l'Onboarding (si présentes)**
```
🎯 PERSONAL TRAVEL PROFILE (from onboarding - USE THIS FOR ULTRA-PERSONALIZATION):
Why they travel: ${onboardingPreferences.whyTravel || 'Not specified'}
Main goal: ${onboardingPreferences.mainGoal || 'Not specified'}
Global style: ${onboardingPreferences.globalStyle || 'Not specified'}
Preferred activities: ${activitiesList}
Ideal rhythm: ${onboardingPreferences.idealRhythm || 'Not specified'}
Accommodation preference: ${onboardingPreferences.accommodationPref || 'Not specified'}
Visa preference: ${onboardingPreferences.visaPreference || 'Not specified'}
Mobility needs: ${onboardingPreferences.mobilityNeeds || 'None'}
Security importance: ${onboardingPreferences.securityImportance || 'Medium'}
Crowd tolerance: ${onboardingPreferences.crowdTolerance || 'Medium'}
Eco sensitivity: ${onboardingPreferences.ecoSensitivity || 'Medium'}
Cultural adaptability: ${onboardingPreferences.culturalAdaptability || 'Medium'}
Climate sensitivity: ${onboardingPreferences.climateSensitivity || 'Medium'}
Preferred departure airports: ${airportsList}
```

### **Données de Disponibilité**
```
TRAVEL PLANNING WINDOW:
Planning horizon: 6 months (from 2025-11-23 to 2026-05-23)
Professional status: salaried
Ideal trip duration: 7 days
Departure flexibility: peu-importe
```

---

## ❌ Ce qui MANQUE actuellement

### **Données Onboarding NON utilisées:**
- `riskTolerance` - Tolérance au risque (1-5)
- `originalityAppetite` - Envie d'originalité (1-5)
- `introvertExtrovert` - Introverti/Extraverti (1-5)
- `plannerImprovisator` - Planificateur/Improvisateur (1-5)
- `modernComfortAuth` - Moderne/Authentique (1-5)
- `comfortAuthSlider` - Slider confort/authenticité
- `stayOrMove` - Rester au même endroit ou bouger
- `transportModes` - Modes de transport préférés
- `transportComfort` - Niveau de confort transport
- `maxTransportHours` - Heures max de transport/jour
- `materialComfort` - Confort matériel
- `mobilityDetails` - Détails sur mobilité réduite
- `tripsPerYear` - Nombre de voyages par an

### **Données Calendar NON affichées dans logs:**
- `calendarConnected` - Utilisé mais pas loggé
- `annualLeaveDays` - Utilisé mais valeur pas affichée
- `takenLeaveDays` - Utilisé mais valeur pas affichée
- `avgTripDuration` - Utilisé comme fallback

---

## ✅ Ce qui fonctionne BIEN

1. **Onboarding → Merge → Claude** ✅
   - Les données onboarding sont bien récupérées
   - Elles sont mergées dans `userProfile.onboardingPreferences`
   - Claude les reçoit dans le prompt

2. **Form → API** ✅
   - Le frontend envoie bien les données du form
   - Budget, style, activités, etc. correctement transmis

3. **Claude génère les destinations** ✅
   - 10 destinations générées
   - Avec dates optimales
   - IATA codes corrects

---

## ⚠️  Problèmes actuels

### **1. Données utilisateur dans les logs**
**AVANT (undefined):**
```
👤 User ID: unknown
👤 User Name: Unknown User
```

**APRÈS (corrigé):**
```
👤 User ID: user_abc123
👤 User Name: Arthur Etienne
```

### **2. Group Preferences dans les logs**
**AVANT (undefined):**
```
- Member Count: undefined
- Budget Range: undefined - undefined EUR
```

**APRÈS (corrigé):**
```
- Member Count: 1
- Budget Range: 2250 - 2250 EUR
```

### **3. Noms de destinations**
**AVANT (undefined):**
```
1. undefined (Georgia) - Score: N/A
```

**APRÈS (corrigé):**
```
1. Tbilisi (Georgia) - Score: 7
```

---

## 🎯 Recommandations

### **Pour améliorer Claude:**
On pourrait ajouter ces données au prompt:
```javascript
Risk tolerance: ${onboardingPreferences.riskTolerance}/5
Originality appetite: ${onboardingPreferences.originalityAppetite}/5
Traveler type: ${onboardingPreferences.introvertExtrovert < 3 ? 'Introvert' : 'Extrovert'}
Planning style: ${onboardingPreferences.plannerImprovisator < 3 ? 'Structured' : 'Spontaneous'}
Transport preferences: ${transportModes.join(', ')}
Max transport hours/day: ${maxTransportHours}h
```

### **Pour les logs:**
Afficher aussi:
- Les jours de congés restants
- Le statut de connection calendar
- Les données de transport

---

## 📝 Résumé

| Donnée | Source | Utilisé par Claude? | Loggé? |
|--------|--------|---------------------|--------|
| Budget | Form | ✅ | ✅ |
| Style | Form | ✅ | ✅ |
| Activities | Form | ✅ | ✅ |
| WhyTravel | Onboarding | ✅ | ✅ |
| MainGoal | Onboarding | ✅ | ✅ |
| TopActivities | Onboarding | ✅ | ✅ |
| RiskTolerance | Onboarding | ❌ | ❌ |
| TransportModes | Onboarding | ❌ | ❌ |
| AnnualLeaveDays | Onboarding | ❌ | Partiellement |
| PreferredAirports | Onboarding | ✅ | ✅ |

**Conclusion:** La majorité des données importantes sont bien transmises à Claude. Les `undefined` étaient dus à un problème de mapping dans les logs, maintenant corrigé!
