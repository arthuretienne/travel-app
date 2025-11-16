# Aperçu du Projet Travel AI

**Status**: ✅ **MVP FONCTIONNEL** | **Date**: 2025-11-16

## 📌 Description du Projet
Application de voyage intelligente multi-plateforme (Web + Mobile) qui utilise l'IA pour découvrir des destinations personnalisées que vous n'auriez jamais trouvées seul.

**Pitch**: "Une IA conseillère de voyage qui propose des destinations que tu ignores aimer, aux dates où tu peux vraiment partir, dans ton budget."

## 🚀 État Actuel (MVP)

**Ce qui fonctionne MAINTENANT**:
- ✅ Backend complet avec tous les services (Prisma, Upstash Cache, Clerk Auth, Claude AI, Amadeus API, Unsplash)
- ✅ Frontend moderne avec nouveau design onboarding
- ✅ Authentification Clerk (Sign In/Sign Up/User Profile)
- ✅ Base de données PostgreSQL (Neon) avec schéma complet
- ✅ Cache Redis (Upstash REST API) pour optimisation coûts (66% économie)
- ✅ Photos destinations automatiques (Unsplash avec fallback)
- ✅ Génération 10 recommandations personnalisées par Claude
- ✅ Prix vols réels depuis Amadeus API (mode TEST)
- ✅ Responsive design mobile

**URLs**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- Prisma Studio: http://localhost:5555

**Guides rapides**:
- [QUICKSTART.md](QUICKSTART.md) - Lancer l'app en 2 minutes
- [docs/SETUP_COMPLETION_SUMMARY.md](docs/SETUP_COMPLETION_SUMMARY.md) - Résumé complet du setup

## 🎯 Objectifs
- ✅ Découvrir des destinations personnalisées (pas de recherche manuelle)
- ✅ Recommandations basées sur profil ultra-détaillé (25+ paramètres)
- ✅ Disponibilités réelles via sync calendrier
- ✅ Prix vols A/R + hôtels + activités en temps réel
- ✅ Chat collaboratif pour voyages en groupe
- ✅ Scoring avec originalité (éviter destinations saturées)

## 🛠 Stack Technique Complète

### Frontend Web
- **Framework** : React 19.1.1 + TypeScript
- **Bundler** : Vite 7
- **Styling** : TailwindCSS 4
- **State** : Zustand + React Query
- **Routing** : React Router v6
- **Forms** : React Hook Form + Zod
- **PWA** : Vite PWA Plugin (offline-first)

### Frontend Mobile
- **Framework** : React Native + Expo SDK 51
- **Navigation** : React Navigation v6
- **UI** : React Native Paper + Design System
- **Storage** : MMKV (ultra-rapide)

### Backend
- **Runtime** : Node.js 20 LTS + TypeScript
- **Framework** : Express.js
- **Database** : PostgreSQL 16 + Prisma ORM
- **Cache** : Redis 7 (sessions + cache API)
- **Real-time** : Socket.IO (chat)
- **Queue** : BullMQ (jobs asynchrones)
- **Auth** : Passport.js + JWT + OAuth2

### APIs & Services
- **Claude Sonnet 4** : Recommandations IA
- **Amadeus API** : Vols + Hôtels en temps réel
- **Google/Outlook Calendar** : Sync disponibilités
- **Stripe** : Paiements (freemium)

### Infrastructure
- **Web Hosting** : Vercel
- **Backend** : Railway / Render
- **Database** : Supabase / Railway PostgreSQL
- **Redis** : Upstash (serverless)
- **CI/CD** : GitHub Actions
- **Monitoring** : Sentry + Prometheus

## 📂 Structure du Projet (Modernisée)

```
travel-ai-mvp/
├── apps/
│   ├── web/              # Application React (Vite + TypeScript)
│   └── mobile/           # Application React Native (Expo)
├── backend/              # API Node.js + TypeScript
│   ├── src/
│   │   ├── modules/      # Modules métier (auth, users, trips, chat, etc.)
│   │   ├── services/     # Services externes (Claude, Amadeus, Calendar)
│   │   ├── jobs/         # Background jobs (BullMQ)
│   │   └── websockets/   # Handlers Socket.IO
│   └── prisma/           # Schema DB + migrations
├── mcp/                  # Model Context Protocol servers
│   ├── figma-to-code/    # MCP: Figma → React/RN
│   └── amadeus-optimizer/# MCP: Optimisation API Amadeus
├── packages/
│   ├── shared/           # Code partagé (types, utils, constants)
│   └── ui/               # Design system partagé
└── docs/                 # Documentation
```

## 🤖 MCPs (Model Context Protocol)

Deux MCPs custom pour automatiser et optimiser le développement :

### 1. MCP Figma to Code
**Fonctionnalités** :
- Extraction design tokens depuis Figma
- Génération composants React/React Native
- Export assets optimisés

**Utilisation** :
```
"Génère OnboardingStep1 depuis le Figma"
"Extrais les design tokens du Figma"
```

### 2. MCP Amadeus Optimizer
**Fonctionnalités** :
- Cache intelligent Redis (TTL adaptatif)
- Batch processing (économie 60% des appels)
- Rate limiting automatique
- Pre-screening avec Flight Inspiration

**Économies** :
- Approche naïve : 0.60€/recherche (30 calls)
- Optimisée : 0.20€/recherche (10 calls)
- **Gain : 66%**

**Utilisation** :
```
"Cherche des vols CDG → LIS, OPO, BCN pour le 15-22 avril, budget 1000€"
"Batch search destinations depuis Paris avec pre-screening"
```

Voir [docs/MCP_GUIDE.md](docs/MCP_GUIDE.md) pour le guide complet.

## 🔌 Points d'API Principaux

### Authentication
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/google` - OAuth Google
- `GET /api/auth/me` - Profil utilisateur

### Recommendations
- `POST /api/recommendations/generate` - Générer recommandations IA
- `GET /api/recommendations/:id` - Détails recommandation
- `POST /api/recommendations/:id/save` - Sauvegarder

### Trips
- `GET /api/trips` - Liste des voyages
- `POST /api/trips` - Créer un voyage
- `POST /api/trips/:id/invite` - Inviter des membres

### Chat (REST + WebSocket)
- `GET /api/trips/:tripId/messages` - Historique messages
- `POST /api/trips/:tripId/messages` - Envoyer message
- `WS /socket.io` - Real-time chat

### Calendar
- `POST /api/calendar/google/connect` - Sync Google Calendar
- `GET /api/calendar/availability` - Détection créneaux libres

## 🔄 Workflow de Développement

### Setup local
```bash
# 1. Clone & install
git clone <repo>
cd travel-ai-mvp
npm install

# 2. Setup env
cp .env.example .env
# Remplir les API keys

# 3. Start services
docker-compose up -d  # PostgreSQL + Redis

# 4. Database
cd backend
npx prisma migrate dev
npx prisma generate

# 5. Build MCPs
cd mcp/figma-to-code && npm install && npm run build
cd ../amadeus-optimizer && npm install && npm run build

# 6. Start dev servers
npm run dev  # Lance web + backend en parallèle
```

### CI/CD
- **GitHub Actions** : Tests + Build automatique
- **Vercel** : Auto-deploy web sur push main
- **Railway** : Auto-deploy backend sur push main

## 🚀 Déploiement Production

### Web
```bash
cd apps/web
npm run build
vercel deploy --prod
```

### Backend
```bash
cd backend
railway up
```

### Mobile
```bash
cd apps/mobile
eas build --platform all
eas submit
```

## 🎯 Fonctionnalités Principales

### ✅ Phase 1 (MVP - Complété)
- [x] Onboarding 4 étapes (25+ paramètres)
- [x] Intégration Claude API (recommandations)
- [x] Simulation Amadeus (données réalistes)
- [x] Affichage résultats + liens affiliés
- [x] Scoring combiné (IA + Prix + Originalité)

### 🚧 Phase 2 (En cours)
- [ ] MCP Figma integration
- [ ] MCP Amadeus optimizer
- [ ] Migration TypeScript complète
- [ ] Architecture modulaire backend
- [ ] Auth + Profils utilisateurs
- [ ] Vraies API Amadeus (production)

### 📅 Phase 3 (Planifié)
- [ ] Calendar sync (Google + Outlook)
- [ ] Chat real-time (Socket.IO)
- [ ] Mobile app (React Native)
- [ ] Price alerts system
- [ ] Premium features (freemium)

### 🔮 Phase 4 (Futur)
- [ ] B2B API white-label
- [ ] ML model (amélioration recommandations)
- [ ] Multi-language (i18n)
- [ ] Advanced analytics
- [ ] Publication App Store + Play Store

## 💡 Innovation Clé

### 1. Scoring avec Originalité
```typescript
finalScore = (
  aiMatchScore * 40% +      // Match profil utilisateur
  priceScore * 30% +         // Rapport qualité/prix
  originalityScore * 20% +   // Destinations peu proposées ⭐
  availabilityScore * 10%    // Disponibilité temps réel
)
```

### 2. Dates Réelles
- Connexion calendrier (Google/Outlook)
- Détection automatique créneaux libres (3+ jours)
- Optimisation selon saison de chaque créneau

### 3. Profil Ultra-Personnalisé
25+ paramètres vs 3-5 chez concurrents :
- Budget + répartition (vol/hôtel/activités)
- Style voyage (confort/aventure/luxe/backpacker)
- Préférences climat, hébergement, rythme
- Contraintes (langues, visa, mobilité)
- Disponibilités réelles (créneaux précis)

## 💰 Modèle Économique

### Revenus
- **Affiliation** : Booking.com, Skyscanner, GetYourGuide
- **Freemium** : 3 recherches/mois gratuit, 9.99€/mois premium
- **B2B** : API white-label pour agences

### Coûts (10k recherches/mois)
- Infrastructure : ~100€/mois
- APIs (Claude + Amadeus) : ~2,600€/mois
- **Total : ~2,700€/mois**

### Revenus estimés
- 10k recherches × 10% conversion × 20€ commission = **20,000€/mois**
- **Marge brute : ~86%**

## 📊 Métriques de Succès

### KPIs Techniques
- Uptime : >99.9%
- Response time API : <500ms (p95)
- Time to recommendation : <20s
- Cache hit rate : >70%

### KPIs Business
- Conversion rate : >10%
- User retention D30 : >40%
- NPS score : >60
- ARPU : >5€

## 📝 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Architecture technique complète
- **[docs/MCP_GUIDE.md](docs/MCP_GUIDE.md)** - Guide utilisation MCPs
- **[docs/API.md](docs/API.md)** - Documentation API REST
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Guide déploiement

## 🔗 Liens Utiles

### Documentation Technique
- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/)
- [Socket.IO](https://socket.io/)

### APIs
- [Claude API](https://docs.anthropic.com/)
- [Amadeus for Developers](https://developers.amadeus.com/)
- [Google Calendar API](https://developers.google.com/calendar)

### Design
- [Figma du projet](https://www.figma.com/design/8Xn27RsBzEEZkgrqbM6hZL/Plan-your-trip)

---

## 🚀 Quick Start

```bash
# 1. Clone et install
git clone <repo> && cd travel-ai-mvp
npm install

# 2. Setup environnement
cp .env.example .env
# Remplir les clés API

# 3. Start DB + Redis
docker-compose up -d

# 4. Build MCPs
npm run build:mcp

# 5. Start dev
npm run dev
# → Web: http://localhost:5173
# → API: http://localhost:3001
```

**Prêt à coder !** 🎉

---

*Dernière mise à jour : 15/11/2024*
*Version 2.0 - Architecture refondée avec MCPs*
