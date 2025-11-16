# Structure du Projet - Travel AI MVP

## Arborescence Frontend

```
frontend/
├── src/
│   ├── pages/                          # 📄 Pages principales (NOUVEAU)
│   │   ├── Landing.jsx                 # Page d'accueil publique
│   │   ├── Landing.css
│   │   ├── Onboarding.jsx              # Onboarding multi-step
│   │   ├── Onboarding.css
│   │   ├── Dashboard.jsx               # Dashboard utilisateur
│   │   ├── Dashboard.css
│   │   ├── CreateTrip.jsx              # Création de voyage
│   │   ├── CreateTrip.css
│   │   ├── Results.jsx                 # Résultats des recommandations
│   │   └── Results.css
│   │
│   ├── components/
│   │   ├── Layout/                     # 🧩 Layout components (NOUVEAU)
│   │   │   ├── AppLayout.jsx           # Layout pour pages authentifiées
│   │   │   └── AppLayout.css
│   │   │
│   │   ├── Onboarding/                 # (Ancien - peut être supprimé)
│   │   │   ├── OnboardingNew.jsx
│   │   │   └── OnboardingNew.css
│   │   │
│   │   └── Results/                    # (Ancien - peut être supprimé)
│   │       ├── Results.jsx
│   │       └── Results.css
│   │
│   ├── App.jsx                         # ⚙️ Router principal (MODIFIÉ)
│   ├── App.css
│   ├── main.jsx                        # Point d'entrée
│   └── index.css
│
├── .env                                # 🔐 Variables d'environnement (NOUVEAU)
├── .env.production
├── package.json
├── vite.config.js
└── README_NEW_ARCHITECTURE.md          # 📚 Documentation (NOUVEAU)

```

## Mapping Routes → Fichiers

```
Route                    →  Fichier                    →  Protected
─────────────────────────────────────────────────────────────────────
/                        →  pages/Landing.jsx          →  ❌ Public
/onboarding              →  pages/Onboarding.jsx       →  ⚠️ Clerk Only
/dashboard               →  pages/Dashboard.jsx        →  ✅ Protected + Layout
/create-trip             →  pages/CreateTrip.jsx       →  ✅ Protected + Layout
/results/:searchId       →  pages/Results.jsx          →  ✅ Protected + Layout
```

## Flow des Données

### 1. Onboarding Flow
```
User → Onboarding.jsx
  ↓ (5 steps)
  ↓ Submit
  ↓
POST /api/users/preferences
  {
    userId: "user_...",
    preferences: {
      budget: 1500,
      travelStyle: "cultural",
      activities: ["museums"],
      ...
    }
  }
  ↓ Success
  ↓
Navigate to /dashboard
```

### 2. Create Trip Flow
```
User → Dashboard.jsx
  ↓ Click "Create Trip"
  ↓
CreateTrip.jsx
  ↓ Load preferences
GET /api/users/preferences
  ↓
  ↓ User fills form
  ↓ Submit
POST /api/travel/recommendations
  {
    basic: {...},
    preferences: {...},
    constraints: {...},
    availability: {...}
  }
  ↓ Response
  {
    success: true,
    searchId: "search_abc123",
    recommendations: [...]
  }
  ↓
Navigate to /results/search_abc123
```

### 3. View Results Flow
```
User → Results.jsx (searchId from URL)
  ↓
GET /api/searches/:searchId
  ↓ Response
  {
    recommendations: [
      {
        destination: {...},
        pricing: {...},
        flightDetails: {...},
        score: {...}
      }
    ]
  }
  ↓ Display trips
  ↓
User clicks "Save Trip"
  ↓
POST /api/searches/trips/save
  {
    searchId: "search_abc123",
    tripData: {...}
  }
  ↓ Success
  ↓
Alert "Trip saved!"
```

### 4. Dashboard Flow
```
User → Dashboard.jsx
  ↓
GET /api/searches/trips/saved
  ↓ Response
  {
    trips: [
      {
        searchId: "...",
        destination: {...},
        slot: {...},
        pricing: {...},
        score: {...}
      }
    ]
  }
  ↓ Display trips in grid
  ↓
User clicks "View Details"
  ↓
Navigate to /results/:searchId
```

## Composants Réutilisables

### AppLayout (Layout/AppLayout.jsx)
```
┌─────────────────────────────────────────┐
│ Header                                  │
│  [Logo] [Dashboard] [Create Trip] [👤] │
├─────────────────────────────────────────┤
│                                         │
│         {children}                      │
│     (Page content here)                 │
│                                         │
├─────────────────────────────────────────┤
│ Footer                                  │
│  © 2025 Travel AI | Privacy | Terms    │
└─────────────────────────────────────────┘
```

### Boutons Standards
```jsx
// Primary Button
<button className="btn-primary">
  Action
</button>

// Secondary Button
<button className="btn-secondary">
  Action
</button>
```

### Cards Standards
```jsx
// Trip Card (Dashboard)
<div className="trip-card">
  <div className="trip-card-header">
    <h3>Barcelona</h3>
    <span className="match-badge">95%</span>
  </div>
  <div className="trip-card-body">
    <div className="trip-detail">📅 Apr 15-22</div>
    <div className="trip-detail">💰 €1,450</div>
  </div>
  <div className="trip-card-footer">
    <button>View Details</button>
  </div>
</div>
```

## États des Pages

### Landing
```
States:
  - user (from Clerk)

Actions:
  - handleGetStarted() → /onboarding
  - handleGoToDashboard() → /dashboard
```

### Onboarding
```
States:
  - currentStep (1-5)
  - formData
  - errors
  - loading

Actions:
  - handleNext()
  - handlePrevious()
  - handleSubmit() → POST /api/users/preferences → /dashboard
```

### Dashboard
```
States:
  - savedTrips
  - loading
  - error

Actions:
  - fetchSavedTrips() → GET /api/searches/trips/saved
  - handleCreateTrip() → /create-trip
  - handleViewTrip(id) → /results/:id
```

### CreateTrip
```
States:
  - formData
  - errors
  - loading
  - loadingPreferences

Actions:
  - loadUserPreferences() → GET /api/users/preferences
  - handleSubmit() → POST /api/travel/recommendations → /results/:searchId
```

### Results
```
States:
  - recommendations
  - loading
  - error
  - savingTripId

Actions:
  - fetchRecommendations() → GET /api/searches/:searchId
  - handleSaveTrip(index) → POST /api/searches/trips/save
  - handleBackToDashboard() → /dashboard
  - handleNewSearch() → /create-trip
```

## API Endpoints Map

```
Frontend File          API Endpoint                      Method  Auth
─────────────────────────────────────────────────────────────────────
Onboarding.jsx    →   /api/users/preferences           POST    ✅
CreateTrip.jsx    →   /api/users/preferences           GET     ✅
CreateTrip.jsx    →   /api/travel/recommendations      POST    ✅
Results.jsx       →   /api/searches/:searchId          GET     ✅
Results.jsx       →   /api/searches/trips/save         POST    ✅
Dashboard.jsx     →   /api/searches/trips/saved        GET     ✅
```

## Variables d'Environnement

### Development (.env)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3001
```

### Production (.env.production)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=https://travel-app-production-9b66.up.railway.app
```

## Fichiers CSS

### Hiérarchie des Styles
```
Global
  ├── index.css                    # Reset & base styles
  └── App.css                      # Styles globaux (buttons, etc.)

Pages
  ├── Landing.css                  # Landing page specific
  ├── Onboarding.css               # Onboarding specific
  ├── Dashboard.css                # Dashboard specific
  ├── CreateTrip.css               # CreateTrip specific
  └── Results.css                  # Results specific

Components
  └── AppLayout.css                # Layout specific
```

### Classes CSS Réutilisables (App.css)
```css
/* Boutons */
.btn-primary          # Bouton principal (gradient violet)
.btn-secondary        # Bouton secondaire (blanc/bordure)
.btn-submit           # Bouton submit (plus grand)

/* Layout */
.app                  # Container principal
.app-header           # Header
.app-main             # Main content

/* States */
.loading-screen       # Écran de chargement
.spinner              # Spinner animation
.error-banner         # Bannière d'erreur
```

## Dépendances Principales

```json
{
  "dependencies": {
    "@clerk/clerk-react": "^5.55.0",      // Auth
    "react": "^19.1.1",                    // Framework
    "react-dom": "^19.1.1",                // DOM
    "react-router-dom": "^7.9.6"           // Routing
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.4",      // Vite React
    "vite": "^7.1.7",                      // Build tool
    "tailwindcss": "^4.1.17"               // CSS (optional)
  }
}
```

## Performance Optimizations

### Code Splitting (Futur)
```jsx
// Lazy loading des pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateTrip = lazy(() => import('./pages/CreateTrip'));
const Results = lazy(() => import('./pages/Results'));

// Dans App.jsx
<Suspense fallback={<LoadingScreen />}>
  <Routes>...</Routes>
</Suspense>
```

### Image Optimization (Futur)
```jsx
// Utiliser WebP avec fallback
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <img src="image.jpg" alt="..." />
</picture>
```

## Testing Structure (Futur)

```
frontend/
├── src/
│   └── __tests__/
│       ├── pages/
│       │   ├── Landing.test.jsx
│       │   ├── Dashboard.test.jsx
│       │   └── ...
│       └── components/
│           └── AppLayout.test.jsx
├── e2e/
│   ├── onboarding.spec.js
│   ├── create-trip.spec.js
│   └── ...
└── vitest.config.js
```

## Métriques du Code

```
Pages:                   5 fichiers (10 avec CSS)
Composants:              1 fichier (2 avec CSS)
Total lignes React:      ~1,800 lignes
Total lignes CSS:        ~2,400 lignes
Routes:                  5 routes
API Endpoints:           6 endpoints
Average File Size:       ~350 lignes
Complexity:              Moyenne (facile à maintenir)
```

## Checklist de Vérification

### Avant de Commencer
- [ ] Node.js installé (v18+)
- [ ] npm installé
- [ ] Compte Clerk créé
- [ ] Clé Clerk obtenue

### Installation
- [ ] `cd frontend && npm install`
- [ ] Copier .env et ajouter clé Clerk
- [ ] Vérifier backend fonctionne sur :3001

### Lancement
- [ ] Backend: `cd backend && node server.js`
- [ ] Frontend: `cd frontend && npm run dev`
- [ ] Ouvrir http://localhost:5173

### Vérification Flow
- [ ] Landing page s'affiche
- [ ] Sign In fonctionne
- [ ] Onboarding se complète
- [ ] Dashboard s'affiche
- [ ] Create Trip fonctionne
- [ ] Results s'affichent
- [ ] Save Trip fonctionne

## Contacts & Support

### Documentation
- Architecture: `/frontend/README_NEW_ARCHITECTURE.md`
- Migration: `/MIGRATION_GUIDE.md`
- Résumé: `/RESTRUCTURATION_COMPLETE.md`
- Structure: Ce fichier

### Liens Utiles
- Clerk: https://clerk.com/docs
- React Router: https://reactrouter.com
- Vite: https://vitejs.dev
- React: https://react.dev

---

**Dernière mise à jour:** 2025-11-16
**Version:** 2.0.0
