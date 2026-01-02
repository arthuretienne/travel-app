# Skusku - AI Travel Planner (Etat Actuel)

## Vision du Projet

**Skusku** est un planificateur de voyage intelligent qui utilise l'IA pour recommander des destinations personnalisees basees sur le profil de l'utilisateur, puis trouve automatiquement les meilleurs vols et hotels dans son budget.

### Probleme Resolu
- Les utilisateurs passent des heures a chercher des destinations, comparer les vols, et trouver des hotels
- Les recommandations de voyage generiques ne tiennent pas compte des preferences individuelles
- Difficile de rester dans un budget tout en optimisant l'experience

### Solution
Un assistant IA qui:
1. Apprend les preferences de l'utilisateur (onboarding)
2. Suggere des destinations personnalisees via Claude AI
3. Trouve automatiquement les vols et hotels via Booking.com API
4. Propose des itineraires optimises dans le budget

---

## Architecture Actuelle

```
                         FRONTEND (Vercel - skusku.life)
                    +----------------------------------+
                    |   React 18 + Vite + CSS          |
                    |   Clerk Auth (Google, Email)     |
                    |   Components:                    |
                    |   - Onboarding (8 questions)     |
                    |   - TravelForm (recherche)       |
                    |   - Results (cartes voyage)      |
                    +----------------------------------+
                                    |
                                    | HTTPS API Calls
                                    v
                         BACKEND (Railway - Node.js)
                    +----------------------------------+
                    |   Express.js Server              |
                    |   Clerk JWT Verification         |
                    |   Rate Limiting                  |
                    |                                  |
                    |   Services:                      |
                    |   - claudeService (AI)           |
                    |   - bookingService (vols/hotels) |
                    |   - destinationService           |
                    |   - roadtripService              |
                    |   - pexelsService (photos)       |
                    |                                  |
                    |   Cache In-Memory (2h TTL)       |
                    +----------------------------------+
                           |              |
                           v              v
            +-------------+    +------------------+
            | PostgreSQL  |    | APIs Externes    |
            | (Neon)      |    | - Claude AI      |
            | - Users     |    | - Booking.com    |
            | - Prefs     |    | - Pexels         |
            | - Searches  |    +------------------+
            +-------------+
```

---

## Stack Technique Actuelle

### Frontend
| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 18.x | Framework UI |
| Vite | 5.x | Build tool |
| Clerk | @clerk/clerk-react | Authentification |
| CSS | Vanilla | Styling (pas de Tailwind) |

### Backend
| Technologie | Version | Usage |
|-------------|---------|-------|
| Node.js | 20.x | Runtime |
| Express | 4.x | Serveur API REST |
| Prisma | 5.x | ORM PostgreSQL |
| Clerk | @clerk/express | Verification JWT |

### APIs Externes
| API | Usage | Modele/Plan |
|-----|-------|-------------|
| Claude API (Anthropic) | Generation destinations, recommandations | claude-3-5-haiku (rapide), claude-sonnet-4-5 (itineraires) |
| Booking.com (RapidAPI) | Recherche vols et hotels, prix reels | Pay-as-you-go |
| Pexels | Photos des destinations | Gratuit |

### Infrastructure
| Service | Usage | URL |
|---------|-------|-----|
| Vercel | Frontend hosting | skusku.life |
| Railway | Backend hosting | Auto-deploy depuis GitHub |
| Neon | PostgreSQL serverless | - |
| Clerk | Auth service | Production instance |

---

## Flux Utilisateur Principal

### 1. Onboarding (premiere connexion)
L'utilisateur repond a 8 questions pour creer son profil voyageur:
- Personnalite (routard, explorateur, confort, luxe)
- Motivation de voyage (decouvrir, se relaxer, aventure)
- Activites preferees (culture, nature, plage, gastronomie)
- Rythme ideal (intense, equilibre, relaxe)
- Hebergement prefere (hotel, airbnb, auberge)
- Transports refuses (avion, train, bus, voiture, bateau)
- Sensibilites (eco, foule, securite)
- Aeroports de depart preferes

### 2. Recherche de voyage (WITHOUT_DESTINATION)
Quand l'utilisateur ne specifie pas de destination:

```
1. User remplit formulaire: budget, duree, style, activites
2. Backend detecte scenario "WITHOUT_DESTINATION"
3. Claude AI genere 6 destinations personnalisees
4. Pour chaque destination (en parallele):
   - Booking.com API -> recherche vols
   - Booking.com API -> recherche hotels
5. Filtre les 3 meilleures dans le budget
6. Claude AI (Haiku) -> genere matchReason + seasonReason (~5s)
7. Pexels -> photos des destinations
8. Retourne 3 recommandations avec prix reels
```

### 3. Recherche avec destination (WITH_DESTINATION)
Quand l'utilisateur specifie une destination:

```
1. User specifie destination + budget
2. Backend detecte scenario "WITH_DESTINATION"
3. Optimise le voyage:
   - Trouve le meilleur vol dans le budget
   - Trouve le meilleur hotel avec budget restant
4. Claude AI (Sonnet) -> genere itineraire jour par jour
5. Retourne 1 recommandation complete avec planning
```

### 4. Mode Roadtrip (multi-villes)
Active si l'utilisateur a choisi "itinerant" dans l'onboarding:

```
1. Backend detecte profil "stayOrMove = itinerant"
2. Genere un roadtrip 2-3 villes
3. Planifie transport inter-villes + hotels par ville
4. Claude AI -> genere narrative du roadtrip
5. Retourne 1 roadtrip avec toutes les etapes
```

---

## Structure des Fichiers Cles

```
travel-ai-mvp/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Results/
│       │   │   ├── Results.jsx      # Cartes de resultats
│       │   │   └── Results.css      # Styles (inclut roadtrip)
│       │   └── TravelForm/
│       │       └── TravelForm.jsx   # Formulaire de recherche
│       ├── pages/
│       │   ├── Onboarding.jsx       # 8 questions profil
│       │   └── Dashboard.jsx        # Page principale
│       └── App.jsx                  # Routes Clerk
│
├── backend/
│   └── src/
│       ├── routes/
│       │   └── travel.js            # POST /recommendations
│       ├── services/
│       │   ├── claudeService.js     # Appels Claude API
│       │   │   - generateDestinations()
│       │   │   - generateDestinationRecommendationWithData()
│       │   │   - generateRoadtripNarrative()
│       │   │   - generateDestinationShortlist()
│       │   │
│       │   ├── claudePromptsOptimized.js  # Prompts Claude
│       │   │   - generateItineraryWithDestination()
│       │   │   - generateDestinationRecommendation()
│       │   │
│       │   ├── bookingService.js    # Booking.com API
│       │   │   - searchFlights()
│       │   │   - searchHotels()
│       │   │   - getDestinationId()  # IATA -> city name
│       │   │
│       │   ├── destinationService.js # Orchestration
│       │   │   - discoverDestinations()
│       │   │   - optimizeDestination()
│       │   │
│       │   └── roadtripService.js    # Multi-villes
│       │       - shouldProposeRoadtrip()
│       │       - generateRoadtrip()
│       │
│       ├── middleware/
│       │   └── auth.js              # Clerk JWT verification
│       │
│       └── server.js                # Express entry point
│
└── prisma/
    └── schema.prisma                # DB schema
```

---

## Endpoint Principal

### POST /api/travel/recommendations

**Headers:**
```
Authorization: Bearer <clerk_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "basic": {
    "budget": 2250,
    "style": "relaxation",
    "activities": ["cultural", "nature"],
    "maxFlightHours": 6,
    "destination": ""
  },
  "preferences": {
    "climate": "any",
    "accommodation": "hotel",
    "pace": "moderate"
  },
  "availability": {
    "duration": 5,
    "timeHorizon": "6-mois",
    "flexibleDates": true
  }
}
```

**Response (WITHOUT_DESTINATION):**
```json
{
  "success": true,
  "recommendations": [
    {
      "destination": {
        "city": "Thessaloniki",
        "country": "Greece",
        "iataCode": "SKG",
        "photo": { "url": "https://...", "photographer": {...} },
        "matchReason": "Perfect blend of culture and relaxation",
        "seasonReason": "January offers mild weather and fewer tourists"
      },
      "slot": {
        "startDate": "2026-01-04",
        "endDate": "2026-01-09",
        "duration": 5,
        "season": "winter"
      },
      "pricing": {
        "flight": 254,
        "hotel": 350,
        "activities": 599,
        "total": 1203,
        "remaining": 599,
        "currency": "EUR"
      },
      "flightDetails": {
        "outbound": {
          "departureTime": "2026-01-04T08:30:00",
          "arrivalTime": "2026-01-04T12:45:00",
          "duration": "3h15m",
          "stops": 0,
          "segments": [{
            "carrier": "Ryanair",
            "origin": "PAR",
            "destination": "SKG"
          }]
        },
        "return": {...},
        "airline": "Ryanair",
        "totalPrice": 254
      },
      "hotelOptions": {
        "nights": 4,
        "hotels": [{
          "name": "City Hotel Thessaloniki",
          "stars": 3,
          "price": 87,
          "location": "City Center"
        }]
      },
      "score": {
        "total": 92,
        "breakdown": {
          "aiMatch": 95,
          "price": 88,
          "originality": 90,
          "availability": 85
        }
      },
      "links": {
        "skyscanner": "https://www.skyscanner.fr/transport/vols/...",
        "booking": "https://www.booking.com/searchresults.html?..."
      }
    }
  ],
  "metadata": {
    "scenario": "WITHOUT_DESTINATION",
    "totalGenerated": 6,
    "finalResults": 3,
    "processingTime": "2026-01-01T12:00:00Z"
  }
}
```

**Response (ROADTRIP):**
```json
{
  "success": true,
  "recommendations": [{
    "type": "roadtrip",
    "title": "Mediterranean Discovery",
    "tagline": "Explore 3 cities in 7 days",
    "cities": [
      {
        "name": "Barcelona",
        "country": "Spain",
        "nights": 2,
        "hotel": { "name": "Hotel Arts", "stars": 4 },
        "photo": {...}
      },
      {
        "name": "Nice",
        "country": "France",
        "nights": 2,
        "hotel": {...}
      }
    ],
    "transport": {
      "modes": ["plane", "train"],
      "plan": [...],
      "narrative": "Fly to Barcelona, then scenic train to Nice..."
    },
    "pricing": {
      "total": 1850,
      "transport": 450,
      "hotels": 800,
      "activities": 600
    },
    "narrative": {
      "dayByDayHighlights": [...],
      "practicalTips": [...],
      "hiddenGems": [...]
    }
  }]
}
```

---

## Optimisations Implementees

### Performance
- **Cache in-memory**: Destinations (2h), vols (1h), hotels (6h)
- **Parallel processing**: Vols + hotels + photos en parallele
- **Claude Haiku**: Pour recommendations rapides (~5s vs 60s avec Sonnet)
- **Prompts simplifies**: ~150 tokens output vs ~2500

### Fiabilite
- **IATA code mapping**: 70+ codes (PAR, CDG, ORY -> Paris, etc.)
- **Fallback gracieux**: Prix estimes si API echoue
- **Null checks**: Protection donnees manquantes flight/hotel
- **Safe time extract**: Gestion dates invalides

### Mapping IATA (bookingService.js)
```javascript
const IATA_TO_CITY = {
  'PAR': 'Paris', 'CDG': 'Paris', 'ORY': 'Paris',
  'LON': 'London', 'LHR': 'London', 'LGW': 'London',
  'NYC': 'New York', 'JFK': 'New York',
  // ... 70+ mappings
};
```

---

## Variables d'Environnement

### Backend (.env sur Railway)
```
DATABASE_URL=postgresql://...@neon.tech/travel_db
ANTHROPIC_API_KEY=sk-ant-...
RAPIDAPI_KEY=...
PEXELS_API_KEY=...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
FRONTEND_URL=https://skusku.life
NODE_ENV=production
```

### Frontend (.env sur Vercel)
```
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=https://backend-production-xxx.railway.app
```

---

## Problemes Connus / Limitations

1. **Booking.com API**: Certaines villes non reconnues (Sofia, Tallinn)
2. **Roadtrip**: Si une ville echoue, fallback vers destinations simples
3. **Cache**: In-memory = perdu au redemarrage Railway
4. **Photos**: Pexels parfois hors-sujet pour villes peu connues

---

## Commits Recents

1. `fix: Fix split() error + add roadtrip display support` - Correction erreur undefined dans prompts + UI roadtrip
2. `perf: Optimize Claude recommendations` - Haiku + prompts simplifies (60s -> 5s)
3. `fix: Improve destination diversity` - Random seed, cache 2h, temperature 0.95
4. `fix: Add IATA code mapping` - 70+ codes airport -> ville
