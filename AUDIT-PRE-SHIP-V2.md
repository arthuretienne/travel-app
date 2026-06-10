# AUDIT PRE-SHIP V2 — Skusku (skusku.life)

> Re-audit lecture seule réalisé le 2026-06-10 (Claude Fable 5, mode AUDIT), sur l'état courant (`main` @ 3ae6a32, correctifs livrés en c7a0730).
> Référence : [AUDIT-PRE-SHIP.md](AUDIT-PRE-SHIP.md) (V1). Aucun fichier de code modifié.
> Chaque statut cite fichier:ligne. `[RUNTIME]` = non vérifiable en statique, n'est pas compté comme échec.

---

## 0. Carte du repo (Phase 0 — re-vérifiée)

- **Front** : React 19 + Vite 7 + Tailwind, SPA pure (toujours aucun prerender — [vite.config.js](frontend/vite.config.js) = plugin react seul). Clerk, react-i18next (config présente, pages cœur non traduites), Vercel.
- **Back** : Express 4 + Prisma sur Render. [server.js](backend/server.js) : helmet, CORS, `trust proxy = 1` (ligne 42), parser JSON global **avec exclusion raw-body** pour les 2 webhooks (lignes 71-75), 18 routers, Socket.io, 3 crons HTTP protégés `CRON_SECRET`, route `/api/dev` montée uniquement en dev (lignes 125-129).
- **Données** : Neon PostgreSQL (Prisma) + couche vectorielle Supabase pgvector (1536 dims, Voyage AI `voyage-large-2`).
- **Reco** : les **deux** endpoints (`/recommendations` JSON et `/recommendations/stream` SSE) passent désormais par le moteur vectoriel `getRecommendations` avec `discoverDestinations` (Claude) en fallback — [travel.js:611-624](backend/src/routes/travel.js) et [travel.js:1070-1098](backend/src/routes/travel.js).
- **Nouveau depuis V1** : refonte TripDetail (1959 lignes modifiées) + [components/group/](frontend/src/components/group/) (GroupTripOverview, JourneyRibbon) ; dev-tooling d'impersonation ([dev.js](backend/src/routes/dev.js), [devAuth.js](frontend/src/lib/devAuth.js), [DevPersonaBar.jsx](frontend/src/components/DevPersonaBar.jsx)) ; page Pricing refondue avec Trip Pass et FAQ ; shim analytics.
- **Intégrations** : inchangées (Booking/RapidAPI avec retry désormais, Stripe, Resend, Pexels, Google OAuth, Web Push, Travelpayouts).

---

## 1. Synthèse exécutive

### Verdict ship : 🟠 ORANGE — shippable en bêta contrôlée, pas en lancement marketing

| | V1 | V2 | Delta |
|---|---|---|---|
| **Ship-Readiness Score** | **0/100** 🔴 | **72/100** 🟠 | **+72** |
| Score ajusté (reports assumés) | — | **82/100** 🟠 | — |
| P0 ouverts | 5 | **0** | −5 |

**Les 5 chaînes critiques de V1 sont réparées et vérifiées dans le code** : webhook Clerk signé (Svix), webhook Stripe sur raw body, moteur d'alertes de prix fonctionnel, budget × voyageurs sur le flux principal, signaux comportementaux alignés de bout en bout. Le moteur vectoriel est branché sur le flux utilisateur réel. RGPD : opt-out digest réparé et suppression de compte livrée avec réattribution des voyages de groupe.

**Mais le re-audit trouve 1 nouveau P1** : le **cron du digest hebdo crashe à chaque exécution** (filtre Prisma invalide introduit par le correctif opt-out — prouvé par exécution, voir N1). Et il reste la dette assumée (npm audit avec 1 critical Clerk, prerender SEO, migrations Prisma, i18n) plus une traîne de P2.

**La phrase clé — ce qui reste avant 🟢** : corriger le filtre Prisma du digest (1 ligne), passer `npm audit fix` sur les 2 packages (critical Clerk), activer le provider analytics, puis valider en runtime les webhooks Stripe/Clerk et un paiement bout-en-bout ; le prerender SEO et les migrations Prisma restent les deux gros chantiers structurels d'après-lancement immédiat.

---

## 2. Vérification des 24 TASK (Phase 1)

Légende : ✅ RESOLVED · 🟡 PARTIAL · ❌ OPEN · ⏸️ DEFERRED (assumé) · 🔵 RUNTIME (code OK, validation à l'exécution)

| TASK | Statut | Preuve | Note |
|---|---|---|---|
| **001** Webhook Clerk Svix | ✅ + 🔵 | [user.js:19-64](backend/src/routes/user.js) `verifyClerkWebhook` (HMAC-SHA256, comparaison constant-time, fenêtre anti-replay ±5 min), [user.js:74](backend/src/routes/user.js) `express.raw`, [server.js:71-75](backend/server.js) `RAW_BODY_PATHS` exclut `/api/users/sync` du parser JSON. Rejet 401 sans signature ([user.js:76-78](backend/src/routes/user.js)). `user.deleted` → `deleteMany` idempotent ([user.js:130-139](backend/src/routes/user.js)). | 🔵 Reste : `CLERK_WEBHOOK_SECRET` + endpoint configuré dans le dashboard Clerk. Fail-closed si secret absent ([user.js:21-24](backend/src/routes/user.js)) ✅. |
| **002** Stripe raw body | ✅ + 🔵 | [server.js:71-75](backend/server.js) : middleware app-level, `req.path` y vaut le chemin complet → le match `/api/billing/webhook` est correct. [billing.js:224](backend/src/routes/billing.js) `express.raw({type:'application/json'})` sur la route. `constructEvent` reçoit le Buffer intact. Signature invalide → 400 ([billing.js:229-235](backend/src/routes/billing.js)). | Piège vérifié : le skip matche bien le bon path (middleware monté avant les routers, pas de préfixe consommé). 🔵 Reste : `STRIPE_WEBHOOK_SECRET` + endpoint Stripe + `stripe trigger checkout.session.completed` → 200. |
| **003** Alertes prix `.id` + `price.amount` | ✅ | [priceAlertService.js:152-157](backend/src/services/priceAlertService.js) : `fromDest.id`/`toDest.id` extraits avec garde `!fromDest?.id`. [priceAlertService.js:182-185](backend/src/services/priceAlertService.js) : `flights.flights[0].price?.amount` + garde `Number.isFinite(currentPrice) && > 0` (le NaN ne peut plus passer). | Cohérent avec le shape de `parseFlightOffers` ([bookingService.js](backend/src/services/bookingService.js)). |
| **004** Budget × voyageurs (stream) | ✅ | [travel.js:1046-1050](backend/src/routes/travel.js) : `budget = budgetPerPerson * travelersCount`, `budgetPerPerson` conservé, `userProfile.basic.budget` mis à jour — identique au bloc JSON [travel.js:476-481](backend/src/routes/travel.js). | Pas de double multiplication en aval : `discoverDestinations` n'utilise `travelers` que pour le nombre d'adultes ([destinationService.js:571-586](backend/src/services/destinationService.js)). Logique dupliquée (pas de helper partagé) — divergence future possible, mineur. |
| **005** Signaux clicked/saved/booked/rejected | ✅ | Schéma zod : `z.enum(['clicked','saved','booked','rejected'])` ([recommendationSchemas.js:75-79](backend/src/schemas/recommendationSchemas.js)) = vocabulaire du moteur `columnMap` ([recommendationEngine.js:212-217](backend/src/services/recommendationEngine.js)). Frontend envoie `'clicked'` ([Results.jsx:745](frontend/src/pages/Results.jsx)), `'saved'` ([Results.jsx:322](frontend/src/pages/Results.jsx)), `'booked'` ([Results.jsx:347](frontend/src/pages/Results.jsx)). | `'rejected'` accepté par l'API mais jamais émis par le front (pas de UI de rejet) — pas une régression, opportunité produit. |
| **006** Moteur vectoriel sur le stream | ✅ | [travel.js:1070-1098](backend/src/routes/travel.js) : `getRecommendations` en chemin primaire, `discoverDestinations` en fallback catch. Shape géré : `vectorDestinations.map(d => ({...d, name: d.city \|\| d.name}))` ([travel.js:1084](backend/src/routes/travel.js)) — l'aval (`dest.name`, lignes 1184, 1204) fonctionne. `AlgorithmResult.claudeDestinations` corrigé : `d.city \|\| d.name` ([travel.js:882](backend/src/routes/travel.js)). | Piège vérifié : `budget_warning` ne vit que dans le fallback `discoverDestinations` — choix documenté ([travel.js:1061-1065](backend/src/routes/travel.js)). Si le moteur vectoriel réussit avec des destinations hors budget, pas d'événement `budget_warning` (le scoring contextuel pénalise le budget, mais sans message dédié). Acceptable, à garder en tête. |
| **007** VAPID placeholder | ✅ + 🔵 | [backend/.env.example:61-62](backend/.env.example) : `"your_vapid_public_key"` / `"your_vapid_private_key"`. | 🔵 Rotation effective de la paire sur Render = config utilisateur (l'ancienne clé reste dans l'historique git → rotation obligatoire). |
| **008** trust proxy + erreurs sanitizées | ✅ | [server.js:42](backend/server.js) `app.set('trust proxy', 1)`. [rateLimiter.js](backend/src/middleware/rateLimiter.js) : plus aucun `validate:{trustProxy:false}`. [auth.js:121-126](backend/src/middleware/auth.js) : 401 sans `error.message`. [checkSubscription.js:100-102,145-147,213-215](backend/src/middleware/checkSubscription.js) : 500 génériques. Handler d'erreur global sans stack ([server.js:231-236](backend/server.js)). | — |
| **009** npm audit | ⏸️ (confirmé ouvert) | `npm audit --omit=dev` exécuté : **front 8 vulns (1 critical `@clerk/shared`, 5 high : `@clerk/clerk-react`, `react-router`, `js-cookie`, `socket.io-parser`)** ; **back 29 vulns (15 high)**. Toutes annoncées corrigeables par `npm audit fix` sans `--force`. | Le critical Clerk (bypass de protection de route) est le plus gênant pour un lancement public. |
| **010** State OAuth signé | ✅ | [calendar.js:23-28](backend/src/routes/calendar.js) `signState` (HMAC-SHA256 + nonce + exp 10 min), [calendar.js:30-45](backend/src/routes/calendar.js) `verifyState` (constant-time, fail-closed si secret absent), vérifié au callback **avant** toute écriture ([calendar.js:98-103](backend/src/routes/calendar.js)). | `STATE_SECRET` retombe sur `CLERK_SECRET_KEY` si `OAUTH_STATE_SECRET` absent — fonctionnel mais un secret dédié serait plus propre. Tokens calendrier toujours en clair en DB (P2 V1 optionnel, inchangé). |
| **011** Stripe handlers throw→500 + upsert | ✅ | [billing.js:240-285](backend/src/routes/billing.js) : signature invalide → 400 (pas de retry), échec handler → **500** (retry Stripe), commentaires explicites. `handleSubscriptionUpdate` = upsert par `userId` tolérant à l'ordre des événements ([billing.js:375-394](backend/src/routes/billing.js)) ; `deleted`/`payment_*` en `updateMany` idempotents ([billing.js:401-441](backend/src/routes/billing.js)). | Pas de table d'événements traités (acceptable : writes idempotents). |
| **012** Opt-out digest + DELETE /me | 🟡 | (a) Opt-out : `upsert` sur `userId` correct ([user.js:344-358](backend/src/routes/user.js)) ✅. (b) `DELETE /api/users/me` ([user.js:388-438](backend/src/routes/user.js)) : réattribution de chaque trip créé au membre le plus ancien (promu organizer, transaction), **cas « aucun autre membre » géré** (fall-through → cascade delete, [user.js:418](backend/src/routes/user.js)), suppression Clerk best-effort puis `deleteMany`. UI avec confirmation ([Account.jsx:396-410](frontend/src/pages/Account.jsx), bouton ligne 1054) ✅. | **MAIS** : le consommateur du flag est cassé — le `where` Prisma de [digestService.js:29-35](backend/src/services/digestService.js) est invalide et fait crasher tout le cron digest (voir **N1**, nouveau P1). L'opt-out est « efficace » uniquement parce que plus personne ne reçoit rien. |
| **013** /pricing public + analytics | 🟡 | Route publique hors `ProtectedRoute` ([App.jsx:66](frontend/src/App.jsx)) ✅. Visiteur anonyme → `openSignIn` puis retour pricing ([Pricing.jsx:812-816](frontend/src/pages/Pricing.jsx)) ✅. [robots.txt](frontend/public/robots.txt) : `Allow: /pricing` + politique bots IA (GPTBot/ClaudeBot/PerplexityBot) ✅. Shim [analytics.js](frontend/src/lib/analytics.js) ✅ avec 4 events câblés : `search_started` ([CreateTrip.jsx:409](frontend/src/pages/CreateTrip.jsx)), `results_viewed` ([Results.jsx:246](frontend/src/pages/Results.jsx)), `trip_saved` ([Results.jsx:323](frontend/src/pages/Results.jsx)), `checkout_started` ([Pricing.jsx:794](frontend/src/pages/Pricing.jsx)). | Manquent : `signup`, `checkout_completed`, `invitation_sent/accepted`. Provider Plausible commenté dans [index.html:49](frontend/index.html) (deferred assumé) → **le funnel n'est toujours pas mesuré en prod**. |
| **014** Cycle de vie alertes | 🟡 | Expiration : `updateMany → status:'expired'` pour `departureDate < now` ([priceAlertService.js:242-246](backend/src/services/priceAlertService.js)) ✅. Re-check des alertes `triggered` : la requête ne filtre plus sur `status:'active'`, spam borné par `shouldSendNotification` ([priceAlertService.js:251-257,321-339](backend/src/services/priceAlertService.js)) ✅. | `priceHistory` toujours double-encodé (string JSON dans un champ `Json`) : [priceAlertService.js:47,187,209](backend/src/services/priceAlertService.js) — la partie « vrai JSON » de la task n'est pas faite. |
| **015** Prerender + canonical + og:image | ⏸️ | [vite.config.js](frontend/vite.config.js) : plugin react seul, aucun prerender. [index.html:6](frontend/index.html) : canonical unique vers la home sur toutes les routes. Aucune og:image (`grep og:image` vide, pas de fichier dans `frontend/public/`). | Les 20 pages destinations restent invisibles aux crawlers sans JS (SEO + GEO). Plus gros chantier restant. |
| **016** Rejets hors embedding + cache DNA | ✅ | Rejets exclus du texte DNA avec commentaire explicatif ([embeddingService.js:83-86](backend/src/services/embeddingService.js)) — hard filter conservé dans le moteur ([recommendationEngine.js:180-184](backend/src/services/recommendationEngine.js)). Cache par SHA-256 du texte DNA, TTL 24 h ([embeddingService.js:94-107](backend/src/services/embeddingService.js)). | Piège vérifié : **pas de vecteur périmé possible** — les signaux comportementaux (saved/booked/clicked) font partie du texte DNA ([embeddingService.js:71-81](backend/src/services/embeddingService.js)), donc un nouveau signal change le texte → nouveau hash → nouvel embedding. |
| **017** Retry Booking | 🟡 | `bookingGet` : 1 retry + backoff progressif sur 429/5xx/réseau, jamais sur 4xx≠429 ([bookingService.js:10-29](backend/src/services/bookingService.js)), utilisé par les 5 appels API (lignes 447, 619, 674, 1150, 1208) ✅. | Factorisation du mapping `flightDetails` non faite : toujours **3 copies** ([travel.js:346](backend/src/routes/travel.js), [travel.js:753](backend/src/routes/travel.js), [travel.js:1288](backend/src/routes/travel.js)) — deferred assumé. |
| **018** prisma migrate | ⏸️ | [.gitignore:43](.gitignore) contient toujours `backend/prisma/migrations/**/*.sql` ; build Render toujours `db push`. | Décision ASK (CLAUDE.md) — à faire avant la prochaine modif de schéma. |
| **019** Dead code | ❌ | [budgetFilter.js](backend/src/utils/budgetFilter.js) **toujours présent** (référencé nulle part — grep négatif), `generateDestinations` toujours exporté/jamais importé ([claudeService.js:22](backend/src/services/claudeService.js)), [railway.json](backend/railway.json), [vercel.json](backend/vercel.json), `voting-images-fixed.jpeg`, `backend/.env.bak` (2,2 Ko, non tracké mais sur disque) tous présents. `airScraperService.js` présent (deferred assumé). | Contrairement au brief de livraison, la suppression de `budgetFilter.js` n'a **pas** été faite. Aucun impact runtime, mais la task est ouverte, pas partielle. |
| **020** i18n pages cœur | ⏸️ | 0 appel `t()` dans [Results.jsx](frontend/src/pages/Results.jsx) (1 426 l.), [TripDetail.jsx](frontend/src/pages/TripDetail.jsx) (2 563 l.), [Pricing.jsx](frontend/src/pages/Pricing.jsx) (926 l.) — tout en français en dur. | Décision produit FR-only vs i18n toujours pendante. |
| **021** headersSent + Trip Pass + config | ✅ + 🔵 | Guard `headersSent` après `checkSubscription(req,res,()=>{})` dans `requireFeature` ([checkSubscription.js:121-127](backend/src/middleware/checkSubscription.js)) et `checkLimit` ([checkSubscription.js:175-179](backend/src/middleware/checkSubscription.js)) ✅. **Carte Trip Pass présente sur Pricing** ([Pricing.jsx:377-462](frontend/src/pages/Pricing.jsx), checkout ligne 872) — mieux que le brief qui l'annonçait absente. Backend Trip Pass géré ([billing.js:301-322](backend/src/routes/billing.js)). | 🔵 `BETA_MODE=false`, `VITE_TP_MARKER` = config Render/Vercel, visibles via `/api/health/internal` ([server.js:220](backend/server.js)). |
| **022** Logs PII | 🟡 | Le dump du profil complet a disparu (`grep "JSON.stringify(userProfile"` vide) ✅. | ~10 logs d'emails en clair subsistent dans les routes (ex. [user.js:105,123,168](backend/src/routes/user.js)) et 692 `console.*` au total backend — la migration vers logger.js n'a pas commencé. |
| **023** GEO FAQ destinations | ⏸️/🟡 | Politique bots IA dans [robots.txt](frontend/public/robots.txt) ✅ ; FAQ présente sur Pricing ([Pricing.jsx:105-118](frontend/src/pages/Pricing.jsx)). Pas de FAQ/`FAQPage` sur les pages destinations, pas de datation des prix. | Dépend de TASK-015 (sans prerender, une FAQ destination resterait invisible aux bots). |
| **024** Token frais + erreurs stream | ✅ | `getToken()` appelé **au moment du fetch** ([Results.jsx:72-80](frontend/src/pages/Results.jsx)) avec commentaire explicatif. Messages différenciés 401 (reconnexion) / 403 (quota + upsell) / 429 (patientez) / défaut ([Results.jsx:90-98](frontend/src/pages/Results.jsx)). | Vestige inoffensif : [CreateTrip.jsx:508](frontend/src/pages/CreateTrip.jsx) passe encore `token` dans `location.state`, mais Results ne le lit plus. À nettoyer (voir N7). |

**Bilan tasks** : 13 ✅ (dont 4 avec part 🔵 runtime) · 5 🟡 · 1 ❌ (019) · 5 ⏸️ (009, 015, 018, 020, 023).

---

## 3. Nouveaux findings V2 (Phase 2 — re-audit A→J)

### B. Fonctionnel

**N1 — P1 — Le cron du digest hebdo crashe à chaque exécution (régression du fix opt-out)**
- Fichier : [digestService.js:29-35](backend/src/services/digestService.js)
- Preuve (par exécution, pas seulement par lecture) : `prisma.user.findMany({ where: { preferences: { isNot: null, digestOptOut: false } } })` → `PrismaClientValidationError: Unknown argument 'digestOptOut'`. On ne peut pas mélanger le filtre relationnel `isNot` et un champ scalaire au même niveau ; il faut `preferences: { is: { digestOptOut: false } }` (qui implique non-null).
- Impact : `sendWeeklyDigestToAll` throw dès la première requête → le cron `POST /api/cron/weekly-digest` ([server.js:150-163](backend/server.js)) répond 500 à chaque tirage → **aucun digest n'est jamais envoyé**. Feature d'engagement morte + bruit d'erreurs cron. (Effet pervers : l'opt-out RGPD est « respecté » uniquement parce que plus personne ne reçoit rien.)
- Correctif : 1 ligne — `preferences: { is: { digestOptOut: false } }`.

### E. Qualité du code (refonte TripDetail / groupe)

**N2 — P2 — Stream SSE d'itinéraire : cleanup mort, pas d'abort, flux concurrents**
- Fichier : [TripDetail.jsx:2127-2219](frontend/src/pages/TripDetail.jsx)
- Preuve : le stream est lu via `fetch` + `response.body.getReader()`, mais le cleanup du `useEffect` ne ferme qu'une variable `eventSource` qui n'est **jamais assignée** (toujours `null`, lignes 2128 et 2214-2218). Aucun `AbortController`.
- Impact : chaque démontage/remontage de la section (changement d'onglet Aperçu ↔ autre) relance un stream complet sans annuler le précédent → lecteurs concurrents qui écrivent dans le même state (`setItinerary`), et régénération côté serveur si `cachedItinerary` n'est pas encore peuplé (coût Claude répété). Mitigé par le cache serveur, mais le pattern correct existe déjà ailleurs dans le même repo ([Results.jsx:61-68](frontend/src/pages/Results.jsx) : AbortController + flag `cancelled`).

**N3 — P2 — Impersonation dev : correcte mais à un flip d'env de la prod**
- Fichiers : [auth.js:13-29](backend/src/middleware/auth.js), [dev.js:14-19](backend/src/routes/dev.js), [server.js:125-129](backend/server.js), [devAuth.js:9](frontend/src/lib/devAuth.js), [App.jsx:165-169](frontend/src/App.jsx)
- Preuve du gating (✅ conforme) : backend `NODE_ENV==='development' || DEV_MODE==='true'` aux **deux** niveaux (montage + hard guard par-requête) ; frontend `import.meta.env.DEV` (no-op dans le build prod) ; `dev.js` n'expose qu'un GET read-only listant les comptes `@skusku-test.dev`. **Aucun chemin d'impersonation atteignable en prod avec la config attendue → pas de P0.**
- Risque résiduel : `Bearer dev:<userId>` = bypass d'auth total, et la garde repose sur l'absence d'UNE variable d'env. `DEV_MODE=true` posé par erreur sur Render (debug un soir de rush) = takeover de n'importe quel compte par ID + le même flag désactive les limites d'usage ([checkSubscription.js:168-173](backend/src/middleware/checkSubscription.js)). Hardening 2 lignes : refuser l'impersonation si `NODE_ENV === 'production'`, quoi que dise `DEV_MODE`.

### G. UX / données affichées

**N4 — P3 — GroupTripOverview : sémantique per-person incohérente**
- Fichier : [GroupTripOverview.jsx:302-303](frontend/src/components/group/GroupTripOverview.jsx) vs [GroupTripOverview.jsx:512-513](frontend/src/components/group/GroupTripOverview.jsx)
- Preuve : `FlightRecapCard` affiche `pricing.flight` avec l'unité « / pers. » alors que `BudgetCard` calcule `perPerson = pricing.total / members.length`. Or `pricing` vient du `tripData` de la recherche, dont les montants sont des **totaux groupe** calculés pour `searchContext.travelers` — qui peut différer du nombre de membres effectifs du trip (ex. recherche pour 4, 2 inscrits).
- Impact : chiffres « par personne » potentiellement faux ×2 sur l'écran de confirmation. Diviser par `searchContext.travelers` quand disponible.

**N5 — P3 — Session invité chargée mais inutilisable sur la page trip**
- Fichiers : [TripDetail.jsx:124-139](frontend/src/pages/TripDetail.jsx) (lecture du `guestSession` localStorage), [trips.js:184](backend/src/routes/trips.js) (`GET /:id` exige `authenticateUser`)
- Preuve : `fetchTripDetails` n'envoie que le token Clerk ; un invité non connecté obtient « Failed to load trip ». Le `guestSession` n'alimente que `TripChat` ([TripDetail.jsx:642](frontend/src/pages/TripDetail.jsx)).
- Impact : si le flux invité (vote sans compte) est censé donner accès à la page trip, il est cassé ; sinon, code mort trompeur. `[À VÉRIFIER]` l'intention produit du flux AcceptInvitation invité.

**N6 — P3 — TripExpenses : identification de l'utilisateur par comparaison d'email**
- Fichier : [TripDetail.jsx:650-653](frontend/src/pages/TripDetail.jsx)
- Preuve : `currentUserId={trip.members?.find(m => m.user?.email === user?.primaryEmailAddress?.emailAddress)?.user?.id}` alors que `currentUserId` (fourni par l'API, [TripDetail.jsx:171](frontend/src/pages/TripDetail.jsx)) est déjà dans le state.
- Impact : si l'email Clerk diffère de l'email DB (changement d'adresse), l'onglet Dépenses perd l'identité → soldes sans « vous ». Utiliser le state existant.

**N7 — P3 — Vestige : token Clerk encore copié dans `location.state`**
- Fichier : [CreateTrip.jsx:508](frontend/src/pages/CreateTrip.jsx)
- Preuve : `state: { streamingMode: true, searchPayload: payload, token }` — Results n'en a plus besoin (TASK-024). Un token de session traîne dans l'historique de navigation pour rien.

### Cohérence des deux endpoints reco (vérifiée, RAS)
- Les deux blocs WITHOUT_DESTINATION sont symétriques : multiplication budget ([travel.js:476-481](backend/src/routes/travel.js) / [travel.js:1046-1050](backend/src/routes/travel.js)), moteur vectoriel + fallback ([travel.js:611-624](backend/src/routes/travel.js) / [travel.js:1070-1098](backend/src/routes/travel.js)), mapping `city→name` identique. Les recherches de groupe (PlanningSection) passent par l'endpoint JSON avec un budget `groupPrefs.budget.average` **par personne** (moyenne des préférences membres, [trips.js:412-418](backend/src/routes/trips.js)) × `travelers` côté serveur — cohérent. ✅

### Findings V1 hors-backlog re-vérifiés (échantillon)
- A7 CORS `*.vercel.app` credentialé : **toujours présent** ([server.js:61](backend/server.js)) — P2 ouvert.
- A13 `/preferences/debug` : **toujours présent** ([user.js:204](backend/src/routes/user.js)) — P3 ouvert.
- C5 pondération (`similarity*60 + score*0.4` sans normalisation) : **inchangé** ([recommendationEngine.js:196](backend/src/services/recommendationEngine.js)) — P2 ouvert.
- C7 liste mainstream en dur mi-FR mi-EN : **inchangée** ([recommendationEngine.js:59](backend/src/services/recommendationEngine.js)) — P2 ouvert.
- D3 `priceHistory` double-encodé : ouvert (cf. TASK-014).
- D4 stores en mémoire (rate limit + cache fallback) : inchangé, acceptable à 1 instance — P2 ouvert-accepté.
- E2 fichiers monstres : TripDetail.jsx toujours 2 563 lignes (la refonte a extrait GroupTripOverview mais réinjecté autant) — P2 ouvert.
- F4 Trip Pass sur Pricing : **RÉSOLU** ([Pricing.jsx:377-462](frontend/src/pages/Pricing.jsx)).
- F5 preuve sociale Landing : **RÉSOLU** — testimonials présents ([Landing.jsx:54,91,516](frontend/src/pages/Landing.jsx)).
- G2 erreurs streaming : **RÉSOLU** (cf. TASK-024). B10 token périmé : **RÉSOLU**.
- G3 scroll-lock modale : toujours absent — P2 cosmétique ouvert.
- H3 og:image : toujours absente — lié à TASK-015.

---

## 4. Compte par sévérité — V1 vs V2

| Sévérité | V1 (ouverts) | Résolus | Restants (open/partial) | Deferred assumés | Nouveaux V2 | V2 net ouverts |
|---|---|---|---|---|---|---|
| **P0** | 5 | 5 | 0 | 0 | 0 | **0** |
| **P1** | 14 | ~10 (A3,A4,A5,B4*,B5,B6,B7,C1,D1,F1) | 1 partial (F2 analytics) | 6 (A6/npm, D2/migrations, G1/i18n, H1/prerender, H2/canonical, I1/GEO) | **1 (N1 digest)** | **2 + 6 deferred** |
| **P2** | 19 | 11 (A8,A10,B8,B10,C3,C4,C6,D5,F4,F5,G2) | 7 open (A7,C5,C7,D4,E1,E2,G3) + 3 partial (A9,D3,E3) | 4 liés au prerender/growth (H3,I2,J2,J3) | 2 (N2 SSE, N3 dev-hardening) | **12 + 4 deferred** |
| **P3** | 7 | — | 4 open (A13,E4,G4,H4) | — | 4 (N4-N7) | **8** |

\* B4 (opt-out) : l'écriture du flag est réparée, mais le consommateur est cassé par N1.
Exclus du compte (🔵 runtime/config purs) : F3/TP_MARKER, A11/rotation Booking, A12/BETA_MODE, B9/confirmation checkout, J4, rotation VAPID, secrets webhooks.

---

## 5. Scorecard & verdict (Phase 3)

**Barème** : P0=10 · P1=4 · P2=1.5 · P3=0.5. Baseline V1 = 138. PARTIAL et DEFERRED comptés à 50 %. RUNTIME/config exclus.

| Composante | Détail | Poids |
|---|---|---|
| P0 ouverts | aucun | 0 |
| P1 ouverts/partial | F2 partial (2) | 2 |
| P1 deferred ×50 % | A6, D2, G1, H1, H2, I1 | 12 |
| P2 ouverts | A7, C5, C7, D4, E1, E2, G3 (7 × 1.5) | 10.5 |
| P2 partial ×50 % | A9, D3, E3 | 2.25 |
| P2 deferred ×50 % | H3, I2, J2, J3 | 3 |
| P3 ouverts | A13, E4, G4, H4 (4 × 0.5) | 2 |
| **Nouveaux V2** | N1 (P1=4) + N2, N3 (2×1.5=3) + N4-N7 (4×0.5=2) | **9** |
| **open_weight total** | | **40.75** |

- `new_weight = 9` → dénominateur = 138 + 9 = **147**
- **Score V2 = round(100 × (1 − 40.75/147)) = 72/100** → verdict **🟠** (60-84, zéro P0 ouvert, pas de plafonnement)
- **Score ajusté** (DEFERRED assumés exclus : −12 −3) : open_weight 25.75 → **round(100 × (1 − 25.75/147)) = 82/100** → toujours 🟠. **Ce qui bloque le 🟢 même en assumant les reports** : le digest cassé (N1), le critical npm Clerk (A6 — techniquement « deferred » mais un critical d'auth ne devrait pas l'être), et la traîne P2 (CORS, SSE, pondération moteur, dead code).

**Lecture honnête** : V1 = 0/100 (tout ouvert) → V2 = 72/100 réel, 82/100 si on assume les reports. Le produit est passé de « shipper = encaisser sans livrer » à « shippable en bêta dès que N1 est corrigé et les webhooks validés en runtime ». Le 🟢 (≥85, zéro P0) est à une demi-journée de code (N1 + npm audit fix + provider analytics + N2/N3) plus la validation runtime.

---

## 6. Backlog V2 (OPEN + NEW + PARTIAL uniquement, trié P1→P3)

### V2-T01 — Réparer le filtre Prisma du digest hebdo (NEW N1)
- Sévérité : **P1** · Catégorie : Fonctionnel / Régression
- Contexte : `where: { preferences: { isNot: null, digestOptOut: false } }` est un mélange invalide filtre-relation/champ-scalaire → `PrismaClientValidationError` à chaque exécution du cron, prouvé par exécution. Aucun digest n'est envoyé.
- Fichiers : `backend/src/services/digestService.js:29-35`
- Action : remplacer par `preferences: { is: { digestOptOut: false } }` (le `is` implique la non-nullité). Ajouter un test qui exécute la requête (c'est une erreur de validation client, détectable sans données).
- Acceptation : `POST /api/cron/weekly-digest` (avec `CRON_SECRET`) → 200 avec `results` ; un user avec `digestOptOut: true` est exclu.
- Effort : XS · Dépendances : aucune · Risque : contenu du digest (chemin jamais exercé en prod jusqu'ici — le tester entièrement).

### V2-T02 — `npm audit fix` front + back (TASK-009, ouvert)
- Sévérité : **P1** · Catégorie : Sécurité
- Contexte : front 8 vulns dont 1 **critical** `@clerk/shared` (bypass de protection de route) et `react-router`/`socket.io-parser` high ; back 29 vulns (15 high). Tout annoncé corrigeable sans `--force`.
- Action : `npm audit fix` dans les 2 packages, puis build front + tests back + smoke test login/chat.
- Acceptation : `npm audit --omit=dev` : 0 critical/high ; login Clerk + chat socket.io OK.
- Effort : S · Risque : auth Clerk, routing, websockets.

### V2-T03 — Activer l'analytics + compléter les events (F2 partial)
- Sévérité : **P1** · Catégorie : Growth
- Contexte : le shim `track()` est câblé (4 events) mais le script Plausible est commenté (`frontend/index.html:49`) → zéro mesure en prod. Events manquants : `signup`, `checkout_completed`, `invitation_sent/accepted`.
- Fichiers : `frontend/index.html:48-49`, `frontend/src/lib/analytics.js`, `frontend/src/pages/Account.jsx` (retour checkout `success=true` → `checkout_completed`), flux invitations.
- Acceptation : events visibles dans le dashboard Plausible sur un parcours complet.
- Effort : S · Dépendances : compte Plausible (config).

### V2-T04 — AbortController sur le stream d'itinéraire (NEW N2)
- Sévérité : **P2** · Catégorie : Qualité / Coût
- Contexte : cleanup mort (`eventSource` jamais assigné), pas d'annulation → streams concurrents au changement d'onglet, régénérations Claude potentielles.
- Fichiers : `frontend/src/pages/TripDetail.jsx:2127-2219` (modèle correct : `Results.jsx:48-84`)
- Action : `AbortController` + flag `cancelled`, passer `signal` au fetch, abort dans le cleanup.
- Acceptation : changer d'onglet pendant la génération n'ouvre pas un second stream (network tab) ; pas de setState après démontage.
- Effort : S.

### V2-T05 — Hardening impersonation dev : verrou production (NEW N3)
- Sévérité : **P2** · Catégorie : Sécurité (défense en profondeur)
- Contexte : le bypass `Bearer dev:<userId>` et `/api/dev` sont gatés par `NODE_ENV==='development' || DEV_MODE==='true'` — un `DEV_MODE=true` accidentel sur Render = takeover par ID. 
- Fichiers : `backend/src/middleware/auth.js:13-14`, `backend/src/routes/dev.js:14-19`
- Action : ajouter `&& process.env.NODE_ENV !== 'production'` aux deux gardes (et idéalement au bypass limites de `checkSubscription.js:168`).
- Acceptation : avec `NODE_ENV=production DEV_MODE=true`, `Bearer dev:x` → 401 et `/api/dev/personas` → 404.
- Effort : XS.

### V2-T06 — Nettoyage dead code (TASK-019, ouvert)
- Sévérité : **P2** · Catégorie : Qualité
- Contexte : rien du périmètre V1 n'a été supprimé : `backend/src/utils/budgetFilter.js` (0 référence), `generateDestinations` (`claudeService.js:22`), `backend/railway.json`, `backend/vercel.json`, `voting-images-fixed.jpeg`, `backend/.env.bak` (secrets sur disque), ~40 fichiers de session dans `docs/`.
- Action/acceptation/risque : inchangés vs TASK-019 V1.
- Effort : M.

### V2-T07 — `priceHistory` en vrai JSON (TASK-014 reliquat)
- Sévérité : **P2** · Catégorie : Données
- Contexte : `JSON.stringify` écrit dans un champ Prisma `Json` (`priceAlertService.js:47,187,209`) → string dans du JSON, `JSON.parse` partout, fragile.
- Action : écrire l'array nu ; à la lecture, `typeof === 'string' ? JSON.parse : as-is` (migration douce).
- Effort : S · Risque : lecture front PriceAlerts.jsx.

### V2-T08 — CORS : retirer `*.vercel.app` en prod (A7, ouvert)
- Sévérité : **P2** · Catégorie : Sécurité
- Fichiers : `backend/server.js:61`
- Action : limiter la regex aux previews du projet (`/^travel-app-[a-z0-9-]+\.vercel\.app$/`) ou la conditionner à `NODE_ENV !== 'production'`.
- Effort : XS · Risque : previews Vercel (vérifier le pattern réel des URLs de preview).

### V2-T09 — Moteur : normaliser la similarité + externaliser la liste mainstream (C5+C7, ouverts)
- Sévérité : **P2** · Catégorie : Moteur de reco
- Contexte : `finalScore = similarity*60 + contextualScore*0.4` (`recommendationEngine.js:196`) — le spread cosinus réel (~12 pts) fait que le contextuel domine ; liste mainstream en dur mi-FR mi-EN (`recommendationEngine.js:59`).
- Action : min-max normaliser `similarity` sur les 30 candidats avant pondération ; colonne `is_mainstream` côté Supabase. Passer `npm run test:reco` avant/après.
- Effort : M · Dépendances : harness reco existant.

### V2-T10 — Logs : finir la passe PII (TASK-022 reliquat, A9/E3)
- Sévérité : **P2** · Catégorie : RGPD
- Contexte : ~10 logs d'emails en clair dans les routes (`user.js:105,123,168,189,235,330…`), 692 `console.*` backend, logger.js toujours sous-utilisé.
- Action : remplacer email par userId dans les logs des routes auth/user/billing ; migration progressive vers logger.js.
- Effort : S-M.

### V2-T11 — Lot P3 (ouverts V1 + nouveaux V2)
- Sévérité : **P3** · Catégorie : Divers
- Contenu : retirer `/api/users/preferences/debug` en prod (`user.js:204`) ; per-person basé sur `searchContext.travelers` dans GroupTripOverview (N4, `GroupTripOverview.jsx:302,512`) ; clarifier/réparer l'accès invité à la page trip (N5) ; `currentUserId` du state au lieu du match email dans l'onglet Dépenses (N6, `TripDetail.jsx:652`) ; retirer `token` de `location.state` (N7, `CreateTrip.jsx:508`) ; scroll-lock modale (G3) ; TODO voting.js:541 ; `lastmod` sitemap (H4) ; dates locale FR (G4, lié à TASK-020).
- Effort : S-M cumulé.

*(Deferred assumés, non re-cartés : TASK-015 prerender+canonical+og:image — premier chantier growth ; TASK-018 migrations Prisma — ASK avant ; TASK-020 i18n — décision produit ; TASK-023 GEO — après 015.)*

---

## 7. Reste à valider en runtime (non comptés dans le score)

- [ ] **Webhook Clerk** : endpoint configuré dans le dashboard + `CLERK_WEBHOOK_SECRET` sur Render → un événement réel `user.updated` répond 200 ; un POST sans signature → 401.
- [ ] **Webhook Stripe** : endpoint + `STRIPE_WEBHOOK_SECRET` + produits/prix créés → `stripe trigger checkout.session.completed` → 200 et `Subscription.plan` mis à jour en DB.
- [ ] **Paiement bout-en-bout** (mode test) : checkout Starter → retour `/account` → plan affiché ; achat Trip Pass → `tripPassExpiresAt` posé ; annulation → downgrade FREE.
- [ ] **Suppression de compte** : DELETE depuis l'UI → user absent de Clerk ET de la DB ; trip de groupe avec ≥2 membres → réattribué (pas supprimé).
- [ ] **Cron alertes prix** : `POST /api/cron/check-prices` → `checked > 0, errors: 0` sur une alerte seedée.
- [ ] **Cron digest** : après V2-T01 → 200 (aujourd'hui : 500 systématique).
- [ ] **Rotations** : VAPID (paire régénérée, ancienne dans l'historique git) + `BOOKING_API_KEY` RapidAPI.
- [ ] **Env prod Render** : `NODE_ENV=production`, `DEV_MODE` **non défini**, `BETA_MODE=false` au lancement payant, `OAUTH_STATE_SECRET` dédié (optionnel), `CLERK_WEBHOOK_SECRET`, `CRON_SECRET` — contrôlable via `GET /api/health/internal` (header `x-cron-secret`).
- [ ] **Env Vercel** : `VITE_TP_MARKER` (affiliation), `VITE_PLAUSIBLE_DOMAIN` après V2-T03.
