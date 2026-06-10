# AUDIT_REPORT — Skusku (Étape 0 du brief `Audit.md`)

> Livrable de la **Phase Audit** (section 1 du brief). **Aucune modification de code n'a été effectuée.**
>
> ⚠️ **Note de nommage** : le brief demande un fichier `AUDIT.md`, mais le brief lui-même s'appelle `Audit.md` et le système de fichiers macOS est **insensible à la casse** → `AUDIT.md` écraserait le brief. Ce rapport est donc écrit dans `AUDIT_REPORT.md` pour ne rien détruire.

---

## 0. Stack de référence — confirmation / correction des hypothèses

| Hypothèse du brief | Réalité constatée | Verdict |
|---|---|---|
| Front React + Vite + Clerk sur Vercel | ✅ Confirmé | **OK** |
| Back Express + Prisma sur **Railway** | Express + Prisma ✅ mais déployé sur **Render** (CLAUDE.md + `GOOGLE_REDIRECT_URI=...onrender.com`). `railway.json` présent mais vestige ; `env.js` mentionne encore Railway en commentaire. | **À CORRIGER (doc)** |
| Neon PostgreSQL **avec pgvector** | Neon = base applicative (Prisma). **pgvector n'est PAS sur Neon.** La couche vectorielle vit sur **Supabase** (base séparée, `supabase-sprint2.sql`). | **À CORRIGER (divergence d'archi)** |
| Embeddings Voyage AI | ✅ Voyage AI, mais modèle **`voyage-large-2` = 1536 dimensions** (le brief suppose `voyage-3` = 1024). | **À CORRIGER (dimension)** |
| LLM Claude (Anthropic) | ✅ Confirmé (`@anthropic-ai/sdk`) | **OK** |
| Booking.com (RapidAPI) + Pexels | ✅ Confirmé | **OK** |
| Jobs / cron « à introduire » | **Déjà amorcés** : 3 endpoints cron HTTP (déclenchés par Render Cron Jobs). | **OK (partiel)** |

> **Divergence structurante n°1** : l'archi cible du brief (pgvector **sur Neon, via Prisma**, dimension 1024) ne correspond pas à l'existant (**Supabase**, tables hors-Prisma, dimension 1536). Toute l'Étape 1 du plan doit être arbitrée : *aligner sur Supabase (existant)* ou *migrer la couche vecteur vers Neon/Prisma (cible littérale)*. → **décision produit requise**.

---

## 1.1 Données & schéma

**Modèles Prisma existants (`backend/prisma/schema.prisma`, 18 modèles)** :
`User`, `UserPreferences`, `Search`, `Recommendation`, `AlgorithmResult`, `SavedTrip`, `OptimalPeriod`, `CollaborativeTrip`, `TripMember`, `TripInvitation`, `ProposedDestination`, `TripVote`, `TripMessage`, `Friendship`, `Subscription`, `PriceAlert`, `PushSubscription`, `TripExpense`.

| Question | État réel | Verdict |
|---|---|---|
| Table de destinations ? | **Pas dans Prisma.** Existe dans **Supabase** (`destinations`, colonne `embedding vector(1536)`) + données source dans `src/data/destinations-seed.js`. | **OK (hors Prisma)** |
| Base de connaissance pré-calculée ? | Oui : destinations Supabase enrichies (scripts `enrichDestinations.js`, `seedNewDestinations.js`, `precache-destinations.js`) avec `monthly_weather_score`, `monthly_crowd_score`, `trip_types`, `safety_index`, prix moyens. | **OK** |
| Embeddings stockés ? | Oui, **dans Supabase** : `destinations.embedding` et `user_travel_profiles.embedding` (1536). Rien dans Neon/Prisma. | **OK (hors Prisma)** |
| Profil utilisateur structuré ? | Oui, **deux** : `UserPreferences` (Prisma, très riche — onboarding) + `user_travel_profiles` (Supabase, signaux comportementaux + vecteur DNA). | **OK (mais dédoublé)** |
| `pgvector` activé ? | **Non sur Neon.** Oui sur Supabase (`CREATE EXTENSION IF NOT EXISTS vector`). Colonnes `vector(1536)` présentes. | **OK (sur Supabase)** |
| Dimension | **1536** (`voyage-large-2`), pas 1024. | **À CORRIGER (vs brief)** |
| Index ANN | **`ivfflat`** (`lists=100` destinations, `lists=50` users) via `vector_cosine_ops`. **Pas de HNSW** (le brief le recommande). | **À FAIRE (si HNSW visé)** |

Modèles cible du brief (`Destination`, `DestinationEmbedding`, `UserFeature`, `UserEmbedding`, `Recommendation` enrichi) → **absents de Prisma** ; leurs équivalents fonctionnels existent côté Supabase mais avec un découpage différent (pas de séparation `UserFeature` lisible vs `UserEmbedding` vectoriel : tout est dans `user_travel_profiles`).

---

## 1.2 Pipeline de recommandation actuel

**Endpoints** : `POST /api/travel/recommendations` (JSON) et `POST /api/travel/recommendations/stream` (SSE).

**Chemin tracé (`WITHOUT_DESTINATION`, JSON)** :
1. `travel.js:603` → `recommendationEngine.getRecommendations()`
2. → `embeddingService.generateUserDNA()` (Voyage, **à la volée**)
3. → Supabase RPC `match_destinations` (ANN, top 30)
4. → `passesHardConstraints()` + `computeContextualScore()` (météo/budget/affluence/trip-type/originalité) + `applyCountryDiversity()` — **100 % déterministe, zéro LLM**
5. → `optimizeDestination()` par destination (Booking.com)
6. → Claude `generateDestinationRecommendationWithData()` pour **la « raison » / l'enrichissement uniquement**.

| Question | État réel | Verdict |
|---|---|---|
| Le matching passe-t-il par l'ANN ? | **Oui** sur le chemin JSON principal (`getRecommendations`). La sélection est déjà déterministe ; Claude n'enrichit qu'après. | **OK** ✅ |
| Le LLM choisit-il encore la destination ? | **Oui, sur deux chemins résiduels** : (a) le **fallback** `discoverDestinations → generateDestinationShortlist` (`travel.js:616`) ; (b) la **route SSE `/recommendations/stream`** appelle `discoverDestinations` **directement** (`travel.js:1048`), donc Claude choisit encore en streaming. | **À CORRIGER** 🔴 |
| Où Claude est-il appelé, pour quoi ? | `claudeService.js` : `generateDestinationShortlist` (sélection legacy), `generateDestinationRecommendationWithData` (raison perso), itinéraires, périodes optimales. **Aucun `tool_use`, aucun Structured Output, aucun `zod` sur la sortie Claude.** | **À FAIRE (Étape 4)** |

Garde-fou présent : `recoGuard.guardRecommendation()` — gate pur, synchrone, filtre les recos absurdes (budget, ville/pays manquants) avant affichage. Bon alignement avec l'esprit « pas de LLM sur le chemin critique ».

> **Divergence structurante n°2** : la sélection déterministe **existe déjà et est branchée** sur le chemin JSON — une grande partie de l'objectif du brief est donc **déjà atteinte**. Le travail restant est surtout : (1) supprimer/neutraliser le chemin « Claude choisit » résiduel (stream + fallback), (2) ajouter `tool_use` + Structured Output à la couche d'enrichissement.

---

## 1.3 Intégrations externes

| Intégration | Où / comment | Erreur / cache / rate-limit | Verdict |
|---|---|---|---|
| **Booking.com (RapidAPI)** | `bookingService.js` (ID lieu, vols, hôtels). | Cache via `utils/cache.js` (Upstash Redis ou in-memory), TTL dédiés (`DESTINATION_ID` 30 j, `FLIGHT_SEARCH`…). `try/catch` autour des appels. Clé via env. | **OK** |
| **Pexels** | `pexelsService.js` (`getDestinationPhotos`). | À vérifier en détail, mais appelé en parallèle (non bloquant) et le pipeline tolère l'absence de photo. | **OK** |
| **Voyage AI** | `embeddingService.js`. Destinations : **batch** (scripts seed/enrich). User DNA : **à la volée à chaque recherche** (`generateUserDNA` dans `getRecommendations`). | Pas de cache du vecteur user → coût + latence Voyage à chaque reco. Mise à jour Supabase async non bloquante. | **À FAIRE (optim : cacher/persister le user embedding)** |

---

## 1.4 Jobs / proactivité (mode « trip-push »)

Le mode trip-push est **amorcé et fonctionnel** (analogue du `bucket → action`) :

- `opportunityService.scanAllUsers()` (quotidien) : pour chaque user → ANN → contextual scoring → meilleure destination → **push notification** (`pushService`) → stockage dans Supabase `travel_opportunities`.
- **Idempotence** : vérifie qu'il n'existe pas déjà une opportunité `pending` pour le couple user+destination avant d'en créer une. ✅
- **Déclenchement** : endpoint `POST /api/cron/scan-opportunities` (protégé par `x-cron-secret`, comparaison constante-time), via **Render Cron Jobs** (pas de scheduler interne).
- Autres crons : `POST /api/cron/check-prices`, `POST /api/cron/weekly-digest`.

| Question | État réel | Verdict |
|---|---|---|
| Mécanisme planifié existe ? | Oui (HTTP cron déclenché par Render). | **OK** |
| Trip-push amorcé ? | Oui, avec idempotence + push. | **OK** |
| Persistance des recos proactives | Dans Supabase `travel_opportunities`, **pas** dans une table `Recommendation(source=trip_push)` Prisma comme le décrit la cible. | **À FAIRE (si on aligne sur la cible)** |

---

## 1.5 Qualité & testabilité

| Question | État réel | Verdict |
|---|---|---|
| Tests unitaires / intégration ? | **Aucun framework** (pas de Vitest/Jest/Mocha). Seuls des **scripts de qualité** (`test:reco`, `test:trip-packages`, `test:itinerary`) lancés via `node`, qui **tapent les APIs live**. Aucun test de fonction pure. | **À CORRIGER** 🔴 (bloquant pour Étapes 2-3 du plan qui exigent des tests unitaires) |
| `.env.example` documenté ? | Existe mais **incomplet** : **manquent `VOYAGE_AI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`** (dépendances **cœur** du moteur de reco !) et `AMADEUS_CLIENT_ID/SECRET` (référencés par `env.js`). | **À CORRIGER** 🔴 |
| Validation env / fail-fast ? | `env.js` charge `../.env` (racine projet) et **log** seulement quelques clés ; pas de validation bloquante. Deux fichiers `.env` coexistent (racine + `backend/.env`) → source de confusion. | **À FAIRE** |
| Démarrage local propre ? | Back nécessite a minima `DATABASE_URL` + Supabase + Voyage + Anthropic, sinon `recommendationEngine` lève (`SUPABASE_URL ... required`). Non vérifié par exécution (audit en lecture seule). Friction probable : env non documentées ci-dessus. | **À VÉRIFIER** |

---

## Synthèse — verdict global

**Bonne nouvelle** : le principe directeur du brief (« le LLM ne choisit pas la destination, une couche déterministe vecteurs+scoring le fait ») est **déjà implémenté et branché** sur le chemin JSON principal. Le projet est plus avancé que ne le suppose le brief.

**Divergences à arbitrer avant l'Étape 1** :
1. **Couche vecteur sur Supabase (existant) vs Neon/Prisma (cible littérale)** — c'est la décision la plus coûteuse. Recommandation : *garder Supabase* et réécrire les Étapes 1-2 du plan en conséquence (sinon migration lourde sans gain produit).
2. **Dimension 1536 (`voyage-large-2`) vs 1024 (`voyage-3`)** — aligner le brief sur l'existant.
3. **Déploiement Render** (pas Railway).

**Chantiers concrets restants (par verdict)** :

- 🔴 **À CORRIGER**
  - Neutraliser les chemins « Claude choisit » résiduels : route SSE `/recommendations/stream` (`travel.js:1048`) + fallback (`travel.js:616`).
  - Compléter `.env.example` (Voyage + Supabase + Amadeus).
  - Introduire un framework de tests (Vitest) — prérequis des Étapes 2-3.
- 🟡 **À FAIRE**
  - `tool_use` + Structured Output (zod) sur la couche d'enrichissement Claude (Étape 4).
  - Index **HNSW** si visé (actuellement `ivfflat`).
  - Persistance/cache du user embedding (éviter un appel Voyage par recherche).
  - Validation env fail-fast + unifier les deux `.env`.
- ✅ **OK / déjà fait**
  - ANN déterministe branché (chemin JSON), scoring contextuel pur, `recoGuard`, trip-push avec idempotence + push, crons HTTP, cache Booking.

---

## Décision attendue (point STOP du brief)

Avant l'**Étape 1 — Fondations data**, merci d'arbitrer :

1. **Couche vecteur** : rester sur **Supabase** (recommandé) ou migrer vers **Neon + pgvector via Prisma** (cible littérale du brief) ?
2. **Modèles cible** (`Destination` / `UserFeature` / `UserEmbedding` / `Recommendation`) : les matérialiser dans Prisma, ou considérer les tables Supabase comme l'implémentation officielle et adapter le plan ?

Le reste du plan (Étapes 2→7) sera réécrit en fonction de ces deux réponses.
