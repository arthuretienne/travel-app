# Travel AI - Nouvelle Architecture

## Vue d'ensemble

L'application Travel AI a été complètement restructurée avec une nouvelle architecture basée sur React Router et une expérience utilisateur moderne.

## Structure du Projet

```
frontend/src/
├── pages/                      # Pages principales
│   ├── Landing.jsx            # Page d'accueil publique
│   ├── Landing.css
│   ├── Onboarding.jsx         # Onboarding multi-step
│   ├── Onboarding.css
│   ├── Dashboard.jsx          # Tableau de bord utilisateur
│   ├── Dashboard.css
│   ├── CreateTrip.jsx         # Création de voyage
│   ├── CreateTrip.css
│   ├── Results.jsx            # Résultats des recommandations
│   └── Results.css
├── components/
│   ├── Layout/
│   │   ├── AppLayout.jsx      # Layout pour pages authentifiées
│   │   └── AppLayout.css
│   └── [anciens composants]
├── App.jsx                    # Routing principal
├── App.css                    # Styles globaux
└── main.jsx                   # Point d'entrée
```

## Flow Utilisateur

### 1. Landing Page (`/`)
- Page d'accueil avec présentation du service
- Bouton "Get Started" qui redirige vers l'onboarding
- Si l'utilisateur est déjà connecté : boutons vers Dashboard ou Create Trip

### 2. Onboarding (`/onboarding`)
- **Requis:** Utilisateur doit être connecté via Clerk
- Processus en 5 étapes :
  1. Budget
  2. Style de voyage et région préférée
  3. Mois préférés et durée de vol
  4. Activités
  5. Ville de départ et nombre de voyageurs
- Les préférences sont sauvegardées via `POST /api/users/preferences`
- Redirection vers `/dashboard` après complétion

### 3. Dashboard (`/dashboard`)
- **Requis:** Authentification
- Affiche :
  - Message de bienvenue personnalisé
  - Statistiques (nombre de trips sauvegardés, pays visités, score moyen)
  - Liste des voyages sauvegardés
  - Bouton "Create a New Trip"
- Récupère les trips via `GET /api/searches/trips/saved`

### 4. Create Trip (`/create-trip`)
- **Requis:** Authentification
- Formulaire pré-rempli avec les préférences utilisateur
- Permet de personnaliser les critères pour une recherche spécifique
- Soumet à `POST /api/travel/recommendations`
- Redirection vers `/results/:searchId` avec les résultats

### 5. Results (`/results/:searchId`)
- **Requis:** Authentification
- Affiche les recommandations de voyage
- Chaque trip propose :
  - Bouton "Save Trip" → `POST /api/searches/trips/save`
  - Liens de booking (Skyscanner, Booking.com)
  - Détails complets (prix, vols, scoring)
- Boutons de navigation : "Back to Dashboard", "New Search"

## Routes

### Routes Publiques
- `/` - Landing Page

### Routes Semi-Protégées
- `/onboarding` - Onboarding (redirige vers `/` si non connecté)

### Routes Protégées (avec AppLayout)
- `/dashboard` - Dashboard
- `/create-trip` - Création de voyage
- `/results/:searchId` - Résultats

## API Endpoints Utilisés

### Authentification
Toutes les requêtes aux routes protégées incluent le header:
```javascript
Authorization: Bearer ${token}
```

### User Preferences
- **POST** `/api/users/preferences` - Sauvegarder les préférences
- **GET** `/api/users/preferences` - Récupérer les préférences

### Travel Recommendations
- **POST** `/api/travel/recommendations` - Obtenir des recommandations
  - Retourne un `searchId` pour accéder aux résultats

### Searches
- **GET** `/api/searches/:searchId` - Récupérer les recommandations d'une recherche
- **GET** `/api/searches/trips/saved` - Liste des trips sauvegardés
- **POST** `/api/searches/trips/save` - Sauvegarder un trip

## Configuration

### Variables d'Environnement (.env)

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# API URL
VITE_API_URL=http://localhost:3001
```

### Pour Production (.env.production)

```env
VITE_API_URL=https://travel-app-production-9b66.up.railway.app
```

## Composants Principaux

### AppLayout
Wrapper pour toutes les pages authentifiées avec :
- Header avec logo et navigation (Dashboard, Create Trip)
- UserButton de Clerk
- Footer

### Protected Routes
Utilise le composant `ProtectedRoute` qui vérifie l'authentification via Clerk's `<SignedIn>` et `<SignedOut>`.

## Styles

### Palette de Couleurs
- **Primary Gradient:** `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Success:** `#15803d`
- **Error:** `#ef4444`
- **Background:** `#f5f7fa`

### Design System
- Border radius: 8px (petits éléments), 12px (cards), 20px (sections)
- Box shadows: Légères avec augmentation au hover
- Transitions: 0.3s ease
- Typography: Sans-serif system fonts

## Installation et Développement

### 1. Installation des dépendances
```bash
cd frontend
npm install
```

### 2. Configuration Clerk
1. Créer un compte sur [clerk.com](https://clerk.com)
2. Créer une nouvelle application
3. Copier la clé publique dans `.env`:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

### 3. Lancement du serveur de développement
```bash
npm run dev
```

### 4. Lancement du backend
Dans un autre terminal :
```bash
cd ../backend
node server.js
```

## Points Importants

### 1. Gestion de l'État
- Pas de state management global (Redux/Context) pour cette version
- État local dans chaque page
- Authentification gérée par Clerk

### 2. Persistance des Données
- User preferences sauvegardées en base de données
- Trips sauvegardés liés à l'utilisateur
- Searches identifiés par searchId

### 3. Responsive Design
- Mobile-first approach
- Breakpoints: 640px, 768px, 968px
- Grids qui s'adaptent en colonnes simples sur mobile

### 4. Performance
- Images chargées depuis Unsplash (avec fallback)
- Lazy loading des résultats de recherche
- Transitions CSS optimisées

## Prochaines Améliorations Suggérées

1. **Caching**
   - Cache des préférences utilisateur
   - Cache des résultats de recherche récents

2. **Optimisations**
   - Image optimization (WebP, lazy loading)
   - Code splitting par route
   - Service Worker pour PWA

3. **Fonctionnalités**
   - Partage de trips
   - Comparaison de trips
   - Export PDF des recommandations
   - Notifications (nouveau trip disponible)

4. **Analytics**
   - Tracking des conversions
   - Heatmaps
   - A/B testing

## Dépannage

### L'authentification ne fonctionne pas
- Vérifier que `VITE_CLERK_PUBLISHABLE_KEY` est bien définie
- Vérifier que la clé commence par `pk_test_` ou `pk_live_`

### Les API calls échouent
- Vérifier que le backend tourne sur `http://localhost:3001`
- Vérifier les CORS dans `backend/server.js`
- Vérifier les tokens d'authentification

### Les styles ne se chargent pas
- Vérifier que tous les fichiers CSS sont bien importés
- Relancer le serveur Vite après ajout de nouveaux fichiers CSS

## Support

Pour toute question ou problème, consulter :
- Documentation Clerk: https://clerk.com/docs
- Documentation React Router: https://reactrouter.com
- Documentation Vite: https://vitejs.dev
