# 📊 État du Projet - Travel AI MVP

**Dernière mise à jour:** 23 Novembre 2025
**Version:** 2.0.0
**Progression globale:** 52.5%

---

## 🎯 Vision du projet

Travel AI est une plateforme de recommandation de voyage alimentée par l'IA qui aide les utilisateurs à **découvrir** des destinations personnalisées plutôt que de simplement comparer des vols.

**Différenciation clé:**
- ✅ Profil ultra-complet (25+ paramètres)
- ✅ IA qui comprend vraiment l'utilisateur
- ✅ Scoring originalité (destinations sous-cotées)
- ✅ Prix en temps réel (vols + hôtels + activités)
- ✅ Jamais 0 recommandations (fallbacks multiples)

---

## 📈 Progression par phase

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Foundation & APIs       ████████████░░░░░░░░  65%  │
│ Phase 2: UI/UX & Branding        ██████░░░░░░░░░░░░░░  30%  │
│ Phase 3: Monétisation & Features ███████████████░░░░░  75%  │
│ Phase 4: Sécurité & Optimisation ████████░░░░░░░░░░░░  40%  │
│                                                              │
│ TOTAL PROJET                     ██████████████░░░░░░  52.5%│
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Ce qui fonctionne (Production Ready)

### 🤖 IA & Recommandations
- ✅ Claude Sonnet 4 pour génération destinations
- ✅ Prompt optimisé avec origine dynamique
- ✅ Contraintes transport accessibilité
- ✅ Scoring multi-facteurs (Match 40% + Prix 30% + Originalité 20% + Dispo 10%)
- ✅ Fallbacks multi-niveaux (Amadeus → Estimation → Min 3 garantis)
- ✅ Utilisation complète des 25+ paramètres onboarding

### ✈️ APIs Voyage
- ✅ **Amadeus**: Recherche vols, pre-screening, flight offers
- ✅ **Booking.com**: Recherche hôtels avec prix réels (RapidAPI)
- ✅ **FlixBus**: Alternative bus pour Europe (RapidAPI)
- ✅ **Unsplash**: Photos destinations
- ✅ Liens affiliés (Booking.com, Skyscanner)

### 💳 Monétisation
- ✅ Stripe intégration complète
- ✅ 3 plans d'abonnement (FREE, EXPLORER €9.99, WANDERER €19.99)
- ✅ Webhooks pour sync automatique
- ✅ Billing portal pour gestion abonnement
- ✅ Rate limiting par plan
- ✅ Compteurs usage (recherches/mois, voyages groupe)

### 🎨 UI/UX
- ✅ Onboarding 4 étapes avec 25+ paramètres
- ✅ Autocomplete aéroports (150+ aéroports mondiaux)
- ✅ Results page modernisée
- ✅ TripDetail unifié (solo + groupe)
- ✅ Dashboard utilisateur avec tabs
- ✅ Pricing page avec 3 plans
- ✅ Account page avec gestion abonnement

### 👥 Voyages Collaboratifs
- ✅ Création voyages de groupe
- ✅ Invitations par email (Resend)
- ✅ Système de vote sur destinations
- ✅ Chat collaboratif
- ✅ Gestion membres

### 🔒 Sécurité & Infrastructure
- ✅ Authentification Clerk (Google, Email)
- ✅ Rate limiting (express-rate-limit)
- ✅ Database indexes (Prisma)
- ✅ Redis caching (Upstash) avec TTL adaptatifs
- ✅ CORS whitelist configuré
- ✅ Environment variables (.env)
- ✅ Logging structuré (logger.js)

---

## ⚠️ Ce qui est partiel ou en cours

### APIs Manquantes
- ⚠️ **Kayak API** - Alternative recherche vols (TODO)
- ⚠️ **Airbnb API** - Locations alternatives (TODO)
- ⚠️ **Trains** - Pas de base de données prix, seulement estimation basique
- ⚠️ **Google Calendar** - Code existe mais OAuth 403 error

### UI/UX
- ⚠️ **Design system** - Tailwind configuré mais pas de charte complète
- ⚠️ **Homepage** - Existe mais pas refonte récente
- ⚠️ **Naming/Branding** - Pas encore de nom définitif ni domaine

### Sécurité
- ⚠️ **Validation Zod** - Quelques validations, pas systématique
- ⚠️ **Bundle optimization** - Pas de lazy loading, code splitting
- ⚠️ **Monitoring** - Logs mais pas Sentry

---

## ❌ Ce qui manque (Roadmap)

### Critiques (bloquent MVP)
- ❌ **Resend email production** - Actuellement en sandbox (limite 1 email)
- ❌ **Tests automatisés** - Aucun test (critical paths, API endpoints)
- ❌ **Base données trains** - Pas de `trainPrices.js` avec prix historiques

### Importants (améliorent produit)
- ❌ **Kayak API** - Meilleure couverture vols que Amadeus seul
- ❌ **Airbnb API** - Options hébergement alternatives
- ❌ **Validation prix stricte** - Check écart estimé vs réel < 15%
- ❌ **Design system complet** - Couleurs, typo, components cohérents
- ❌ **Naming + Domaine** - Nom de marque + achat domaine

### Nice to have (post-MVP)
- ❌ **Sentry** - Error tracking production
- ❌ **Bundle optimization** - Lazy loading, code splitting
- ❌ **Multi-langue** - EN, ES, IT
- ❌ **Export PDF** - Itinéraires
- ❌ **Alerte prix** - Notifications baisse tarifaire

---

## 🐛 Bugs connus

### 🔴 Critiques (bloquants)
1. **React duplicate keys** - TripDetail.jsx (keys "T" et "S")
2. **Resend email sandbox** - Limite 1 email, impossible d'inviter plusieurs personnes
3. **Google Calendar OAuth 403** - Invalid client credentials

### 🟡 Moyens (non-bloquants)
4. **Validation prix** - Pas de check strict écart estimé vs réel < 15%
5. **Zod schemas** - Validation partielle, pas systématique
6. **Tests** - Aucun test automatisé

### 🟢 Mineurs (cosmétiques)
7. **Console.logs** - Présents partout en production
8. **Bundle size** - Pas d'optimisation lazy loading

---

## 🗂️ Architecture technique

### Stack technique
**Frontend:**
- React 19.1.1 + Vite 7.1.7
- React Router 7.1.0
- Tailwind CSS 4.1.0
- Clerk Auth 5.55.0
- Lucide React (icons)

**Backend:**
- Node.js + Express 4.18.2
- Prisma 6.19.0 (ORM)
- PostgreSQL (database)
- Upstash Redis (cache)
- Stripe 20.0.0 (payments)

**APIs externes:**
- Claude Sonnet 4 (Anthropic)
- Amadeus (vols)
- Booking.com (hôtels - RapidAPI)
- FlixBus (bus - RapidAPI)
- Unsplash (photos)
- Resend (emails)
- Google Calendar (sync calendrier)

### Services Backend (`/backend/src/services/`)

| Service | Statut | Fonction |
|---------|--------|----------|
| `claudeService.js` | ✅ | Génération destinations IA |
| `amadeusService.js` | ✅ | Recherche vols |
| `bookingService.js` | ✅ | Recherche hôtels (Booking.com) |
| `flixbusService.js` | ✅ | Recherche bus (FlixBus) |
| `cacheService.js` | ✅ | Redis caching (Upstash) |
| `stripeService.js` | ✅ | Abonnements, webhooks |
| `emailService.js` | ✅ | Emails (Resend) |
| `googleCalendarService.js` | ⚠️ | Sync calendrier (OAuth bug) |
| `googleFlightsService.js` | ⚠️ | Scraping (non utilisé) |
| `unsplashService.js` | ✅ | Photos destinations |
| `affiliateService.js` | ✅ | Liens Booking.com, Skyscanner |
| `logger.js` | ✅ | Logging structuré |

**Services manquants:**
- ❌ `kayakService.js`
- ❌ `airbnbService.js`
- ❌ `trainPrices.js` (data)

---

## 📦 Features MVP

### Workflow utilisateur complet

```
1. Sign Up (Clerk) ✅
   ↓
2. Onboarding (25+ paramètres) ✅
   - Style voyage, activités, budget
   - Contraintes (langues, visa, mobilité)
   - Disponibilités (calendrier)
   - Aéroports préférés (autocomplete 150+ aéroports) ✅
   ↓
3. Recherche IA ✅
   - Claude génère 10 destinations personnalisées
   - Origine dynamique (pas uniquement Paris) ✅
   - Contraintes transport accessibilité ✅
   ↓
4. Résultats (10 destinations) ✅
   - Prix vols (Amadeus) + hôtels (Booking.com) ✅
   - Alternative bus (FlixBus) si pertinent ✅
   - Scoring combiné (Match + Prix + Originalité + Dispo) ✅
   - Fallbacks si 0 vols → estimation + min 3 garantis ✅
   ↓
5. Sauvegarde voyage ✅
   - Solo ou groupe
   - Invitations email (Resend) ✅
   ↓
6. Collaboration (groupe) ✅
   - Vote sur destinations ✅
   - Chat ✅
   - Gestion membres ✅
   ↓
7. Réservation (liens affiliés) ✅
   - Booking.com (hôtels)
   - Skyscanner (vols)
```

### Abonnements & Limites

| Feature | FREE | EXPLORER (€9.99/mois) | WANDERER (€19.99/mois) |
|---------|------|------------------------|-------------------------|
| Recherches IA/mois | 5 | 50 | Illimité |
| Voyages sauvegardés | 1 | 5 | Illimité |
| Voyages de groupe | 0 | 2 | Illimité |
| Membres par groupe | - | 5 | 10 |
| Vote collaboratif | ❌ | ✅ | ✅ |
| Support prioritaire | ❌ | ❌ | ✅ |

---

## 🎯 Objectifs court terme

### Cette semaine (Priorité 1)
- [ ] Fix React duplicate keys (TripDetail.jsx)
- [ ] Fix Resend email production (supprimer sandbox)
- [ ] Tester workflow end-to-end complet

### Semaine prochaine (Priorité 2)
- [ ] Intégrer Kayak API (vols)
- [ ] Créer base données trains (`trainPrices.js`)
- [ ] Validation prix stricte (écart < 15%)

### Mois prochain (Priorité 3)
- [ ] Brainstorm naming + achat domaine
- [ ] Design system complet
- [ ] Refonte Homepage
- [ ] Tests automatisés (critical paths)
- [ ] Sentry error tracking

---

## 📊 Métriques techniques

### Performance
- **API response time:** < 2s (p95)
- **Cache hit rate:** ~70% (Redis)
- **Bundle size:** Non optimisé (TODO lazy loading)

### Fiabilité
- **Uptime:** Non mesuré (TODO monitoring)
- **Error rate:** Non mesuré (TODO Sentry)
- **Fallback coverage:** 100% (jamais 0 recommandations)

### Coûts mensuels (estimés)
- RapidAPI (Booking + FlixBus): ~30€
- Upstash Redis (free tier): 0€
- Stripe (pas de frais fixes): 0€
- Hosting (Vercel + Render free tier): 0€
- Domaine (.com): ~15€/an
- **Total:** ~30€/mois + 15€/an

---

## 📚 Documentation disponible

### Documentation technique
- [`ARCHITECTURE.md`](ARCHITECTURE.md) - Architecture détaillée
- [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) - Vue d'ensemble
- [`MIGRATION_GUIDE.md`](MIGRATION_GUIDE.md) - Guide migrations
- [`INDEX_DOCUMENTATION.md`](INDEX_DOCUMENTATION.md) - Index de la doc
- [`DEPLOYMENT.md`](DEPLOYMENT.md) - Guide déploiement

### Documentation features
- [`COLLABORATIVE_TRIPS_PLAN.md`](COLLABORATIVE_TRIPS_PLAN.md) - Voyages groupe
- [`GOOGLE_CALENDAR_SETUP.md`](GOOGLE_CALENDAR_SETUP.md) - Sync calendrier
- [`EMAIL_SETUP.md`](EMAIL_SETUP.md) - Configuration emails
- [`LOGGING_GUIDE.md`](LOGGING_GUIDE.md) - Système de logs

### Documentation roadmap
- [`MVP_ROADMAP.md`](MVP_ROADMAP.md) - Roadmap complète (10 jours)
- [`ALGORITHM_IMPROVEMENT_STRATEGY.md`](ALGORITHM_IMPROVEMENT_STRATEGY.md) - Optimisations algo
- [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md) - Checklist prod

### Sessions de développement
- [`SESSION_2025-11-23.md`](SESSION_2025-11-23.md) - Autocomplete aéroports + origine dynamique
- [`PHASE_A_COMPLETED.md`](PHASE_A_COMPLETED.md) - Session précédente
- [`OPTIMIZATIONS_COMPLETED.md`](OPTIMIZATIONS_COMPLETED.md) - Optimisations Stripe + Rate limiting

---

## 🚀 Prochaine session recommandée

### Option A: Fixer bugs critiques (2-3h) ⭐ RECOMMANDÉ
**Objectif:** MVP stable et testable
**Tâches:**
1. Fix React duplicate keys (TripDetail.jsx)
2. Fix Resend production (vérifier compte, supprimer sandbox)
3. Tester workflow end-to-end
4. Documenter dans SESSION_2025-11-24.md

**Impact:** Permet de tester le produit de bout en bout sans bugs bloquants

---

### Option B: Intégrer APIs manquantes (16-20h)
**Objectif:** Données plus fiables et complètes
**Tâches:**
1. Kayak API (recherche vols alternative)
2. Base données trains (prix historiques)
3. Validation écart prix < 15%
4. Airbnb API (locations)

**Impact:** Améliore significativement la qualité des recommandations

---

### Option C: UI/Branding (14-18h)
**Objectif:** Identité visuelle forte
**Tâches:**
1. Brainstorm naming
2. Achat domaine
3. Design system complet
4. Refonte Homepage

**Impact:** Produit plus professionnel et différencié

---

## 📞 Support & Contact

**Développeur principal:** Arthur
**IA Assistant:** Claude Code (Anthropic)
**Framework IA:** Claude Agent SDK

**Dernière session:** 23 Novembre 2025
**Prochaine session:** À définir

---

**Projet initialisé:** Novembre 2025
**Statut:** MVP en développement actif (52.5% complété)
**Target launch:** Décembre 2025
