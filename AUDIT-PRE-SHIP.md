# AUDIT PRE-SHIP — Skusku (skusku.life)

> Audit lecture seule réalisé le 2026-06-10 (Claude Fable 5, mode AUDIT).
> Aucun fichier de code modifié. Chaque finding cite fichier:ligne ; ce qui n'a pas pu être prouvé dans le code est marqué `[À VÉRIFIER]`.

---

## 0. Synthèse d'architecture (Phase 0)

- **Front** : React 19 + Vite 7 + Tailwind 4, SPA pure (aucun SSR/prerender — `vite.config.js` n'a que le plugin react). Auth Clerk (`@clerk/clerk-react`), i18n react-i18next FR/EN, déployé Vercel (rewrites SPA dans `frontend/vercel.json`).
- **Back** : Express 4 + Prisma 6 sur **Render** (pas Railway — `railway.json` est un vestige). Entrée `backend/server.js` : helmet, CORS, rate-limit IP, 18 routers, Socket.io (chat temps réel), 3 endpoints cron HTTP protégés par `CRON_SECRET` (comparaison constant-time correcte).
- **Données** : Neon PostgreSQL via Prisma (18 modèles : users, trips collaboratifs, votes, abonnements, alertes prix, dépenses). Couche vectorielle **séparée sur Supabase** (pgvector, `destinations.embedding` + `user_travel_profiles`, 1536 dims via Voyage AI `voyage-large-2`). **Pas de BullMQ** (hypothèse du brief infirmée) : jobs = cron HTTP Render.
- **Reco — deux chemins distincts** :
  - `POST /api/travel/recommendations` (JSON) : moteur vectoriel déterministe (`recommendationEngine.getRecommendations` → ANN Supabase → scoring contextuel) puis Booking.com pour vols/hôtels, Claude uniquement pour la « raison ».
  - `POST /api/travel/recommendations/stream` (SSE) : **c'est le chemin utilisé par le flux principal** (découverte sans destination, `CreateTrip.jsx:497-503` → `Results.jsx:71`) et il appelle `discoverDestinations` → **Claude choisit la shortlist** (`destinationService.js:222`), pas le moteur vectoriel.
- **Intégrations** : Booking.com via RapidAPI (vols+hôtels, cache Upstash Redis avec fallback mémoire), Pexels (photos), Anthropic (Sonnet 4.5 / Haiku 4.5), Stripe (3 plans + Trip Pass), Resend (emails), Google Calendar OAuth, Web Push VAPID, Travelpayouts (affiliation).

**Hypothèses du brief corrigées** : pas de pgvector sur Neon (c'est Supabase), pas de BullMQ, dimension 1536 (pas 1024), backend sur Render.

---

## 1. Synthèse exécutive

### Verdict ship : 🔴 NO-GO en l'état

Le produit a une vraie profondeur fonctionnelle et une architecture saine sur le papier, mais **trois chaînes critiques sont cassées en production** (paiement → activation d'abonnement ; alertes de prix ; boucle d'apprentissage comportemental) et **une faille permet à n'importe qui de supprimer n'importe quel compte**. Le flux de recherche principal calcule en plus un budget faux pour les groupes. Tout est corrigeable en quelques jours — mais shipper avant, c'est encaisser des paiements sans livrer le service et exposer la base utilisateurs.

### Top 5 risques bloquants

1. **`POST /api/users/sync` sans aucune vérification de signature** : n'importe qui peut supprimer (cascade complète), créer ou modifier n'importe quel utilisateur ([user.js:14-81](backend/src/routes/user.js)).
2. **Webhook Stripe structurellement cassé** : `express.json()` global consomme le body avant `express.raw()` → la vérification de signature échoue sur 100 % des événements → **un client qui paie n'est jamais upgradé en DB** ([server.js:63](backend/server.js) vs [billing.js:224](backend/src/routes/billing.js)).
3. **Moteur d'alertes de prix mort** : objets passés là où des IDs sont attendus + lecture d'un champ `totalPrice` inexistant → chaque check retourne `null` silencieusement ([priceAlertService.js:151-180](backend/src/services/priceAlertService.js)).
4. **Budget groupe faux sur le flux principal** : l'endpoint streaming ne multiplie pas le budget par le nombre de voyageurs, contrairement à l'endpoint JSON ([travel.js:1034](backend/src/routes/travel.js) vs [travel.js:470](backend/src/routes/travel.js)).
5. **Boucle de signaux comportementaux 100 % rejetée** : le schéma zod accepte `'click'|'save'|'book'`, le frontend envoie `'clicked'|'saved'|'booked'` → 400 systématique, le DNA utilisateur n'apprend jamais ([recommendationSchemas.js:74-77](backend/src/schemas/recommendationSchemas.js) vs [Results.jsx:296,320,718](frontend/src/pages/Results.jsx)).

### Compte des findings

| Sévérité | Nombre |
|---|---|
| P0 (ship-blocker) | 5 |
| P1 (important) | 14 |
| P2 (souhaitable) | 19 |
| P3 (nice-to-have) | 7 |

---

## 2. Findings détaillés

### A. Sécurité

**A1 — P0 — Webhook Clerk `/api/users/sync` non authentifié et destructif**
- Fichier : [user.js:14-81](backend/src/routes/user.js)
- Preuve : aucune vérification de signature Svix (`svix-id`/`svix-signature` ignorés), aucun middleware d'auth. `type: 'user.deleted'` → `prisma.user.delete({ where: { clerkId } })` avec cascade sur Search, SavedTrip, Subscription, trips, votes, alertes…
- Impact : n'importe qui sur Internet peut effacer un compte et toutes ses données, ou créer/écraser des utilisateurs (email arbitraire → préparation d'account takeover combinée au linking par email de [auth.js:79-97](backend/src/middleware/auth.js)).

**A2 — P0 — Vérification de signature Stripe impossible (raw body déjà consommé)**
- Fichiers : [server.js:63](backend/server.js) (`app.use(express.json())` global, sans `verify` ni exclusion), [billing.js:224](backend/src/routes/billing.js) (`express.raw()` monté après coup — no-op car `req._body` est déjà true), [stripeService.js:275](backend/src/services/stripeService.js) (`stripe.webhooks.constructEvent` exige string/Buffer).
- Preuve : le commentaire [server.js:68-69](backend/server.js) reconnaît le problème (« must be before express.json() ») mais rien n'est fait.
- Impact : tous les webhooks répondent 400 → checkout.session.completed jamais traité → voir B1. Stripe finira par désactiver l'endpoint après échecs répétés.

**A3 — P1 — Clé privée VAPID réelle commitée**
- Fichier : [backend/.env.example](backend/.env.example) — `VAPID_PRIVATE_KEY="PMpaVvY_fKyj5lhEjWPLJsiQMSJjk9jq8CzbB4-c5J8"` (paire complète, pas un placeholder), fichier tracké par git.
- Impact : quiconque clone le repo peut signer des push notifications au nom de Skusku. À régénérer (`npx web-push generate-vapid-keys`) et remplacer par un placeholder.

**A4 — P1 — Rate limiting contournable par spoofing X-Forwarded-For**
- Fichiers : [server.js:39](backend/server.js) (`app.set('trust proxy', true)` — fait confiance à toute la chaîne XFF), [rateLimiter.js:18,39,57,73,91,111](backend/src/middleware/rateLimiter.js) (`validate: { trustProxy: false }` désactive précisément l'avertissement d'express-rate-limit sur ce problème).
- Impact : un attaquant fixe un XFF aléatoire par requête → `req.ip` change → tous les limiteurs IP (dont `strictLimiter` sur l'endpoint reco, coûteux en Claude/Booking) sont neutralisés. Correctif : `app.set('trust proxy', 1)` (un seul proxy Render).

**A5 — P1 — OAuth Google Calendar : `state` forgeable, pas de nonce CSRF**
- Fichier : [calendar.js:25-26](backend/src/routes/calendar.js) (`state` = base64 de `{userId}` non signé), [calendar.js:66-84](backend/src/routes/calendar.js) (callback public qui écrit les tokens du compte Google présenté sur le `userId` contenu dans `state`).
- Impact : CSRF OAuth classique — un attaquant peut lier SON calendrier Google au compte d'une victime (pollution des suggestions), ou rejouer des states. Correctif : state signé (HMAC + nonce + expiration) vérifié au callback.

**A6 — P1 — Vulnérabilités npm avec advisories critiques/high**
- Preuve : `npm audit` frontend : **1 critical** (`@clerk/shared` — bypass de protection de route, GHSA-vqx2-fgx2-5wq9), `@clerk/clerk-react` high (bypass d'autorisation), `react-router` 7.9.6 → 9 advisories (XSS, open redirect, CSRF, DoS), socket.io-parser high. Backend : 29 vulnérabilités (15 high) — ws, engine.io, socket.io-adapter.
- Impact : surface d'attaque connue et publique. `npm audit fix` (sans `--force`) suffit pour l'essentiel.

**A7 — P2 — CORS ouvert à tout `*.vercel.app`**
- Fichier : [server.js:58](backend/server.js) — `/\.vercel\.app$/` avec `credentials: true`.
- Impact : n'importe quel déploiement Vercel tiers peut faire des requêtes credentialées. Les tokens étant en header (pas cookie), l'exploitabilité est limitée, mais c'est une dérogation inutile en prod.

**A8 — P2 — Fuites de `error.message` dans des réponses API**
- Fichiers : [auth.js:125](backend/src/middleware/auth.js) (`details: error.message` sur 401), [checkSubscription.js:102,144,211](backend/src/middleware/checkSubscription.js) (`message: error.message` sur 500).
- Impact : contredit la règle « erreurs sanitizées » affichée comme acquise dans CLAUDE.md ; peut révéler des détails Prisma/Clerk.

**A9 — P2 — PII dans les logs**
- Fichier : [travel.js:178](backend/src/routes/travel.js) — `console.log(JSON.stringify(userProfile, null, 2))` logge le profil complet (texte libre inclus) ; emails loggés un peu partout (ex. [user.js:101](backend/src/routes/user.js)). 436 `console.log` dans `src/routes` + `src/services`.
- Impact : RGPD — les logs Render deviennent un stockage de données perso non déclaré.

**A10 — P2 — `requireFeature`/`checkLimit` appellent `checkSubscription` avec un `next` no-op**
- Fichier : [checkSubscription.js:123,174](backend/src/middleware/checkSubscription.js) — si `checkSubscription` répond 403 (abonnement inactif), l'exécution continue, `req.subscription` peut rester undefined → seconde écriture de réponse (« headers already sent ») ou crash → 500.
- Impact : comportement erratique pour les comptes `past_due` dès que BETA_MODE sera désactivé.

**A11 — P2 — Clé Booking.com historique non rotée `[À VÉRIFIER]`**
- Preuve : CLAUDE.md (« ⚠️ Rotate BOOKING_API_KEY on RapidAPI (old key exposed in git history) »). Aucun secret en clair trouvé dans le code actuel (grep sk_live/sk-ant/whsec/re_ négatif hors placeholders).
- Impact : si la rotation n'a pas eu lieu, quota RapidAPI consommable par un tiers.

**A12 — P2 — `BETA_MODE=true` neutralise limites ET monétisation `[À VÉRIFIER sur Render]`**
- Fichiers : [checkSubscription.js:114,157,224](backend/src/middleware/checkSubscription.js), défaut `BETA_MODE=true` dans [backend/.env.example](backend/.env.example).
- Impact : si toujours actif en prod, le compteur de recherches, les features gating et le tracking d'usage sont désactivés — le paywall n'existe pas.

**A13 — P3 — `/api/users/preferences/debug` expose `rawData` en prod**
- Fichier : [user.js:137-176](backend/src/routes/user.js). Authentifié et limité à l'utilisateur lui-même, mais un endpoint debug n'a rien à faire en production.

### B. Fonctionnel

**B1 — P0 — Un client qui paie n'obtient jamais son plan**
- Conséquence directe de A2 : `handleCheckoutCompleted` ([billing.js:281](backend/src/routes/billing.js)) n'est jamais exécuté → `Subscription.plan` reste FREE, Trip Pass jamais crédité, annulations/échecs de paiement jamais synchronisés.
- Impact : encaissement sans livraison = remboursements, litiges, réputation. Ship-blocker absolu pour la monétisation.

**B2 — P0 — Moteur d'alertes de prix entièrement cassé**
- Fichier : [priceAlertService.js:151-156](backend/src/services/priceAlertService.js) — `const [fromId, toId] = await Promise.all([getFlightDestinationId(...), ...])` : `getDestinationId` retourne un **objet** `{id, name, ...}` ([bookingService.js:478-495](backend/src/services/bookingService.js)), passé tel quel comme `fromId` à `searchFlights` → param API `"[object Object]"`.
- Deuxième bug : [priceAlertService.js:180](backend/src/services/priceAlertService.js) lit `flights.flights[0].totalPrice`, champ qui n'existe pas (`parseFlightOffers` retourne `price.amount`, [bookingService.js:762-766](backend/src/services/bookingService.js)) → `Math.min(..., undefined)` = NaN.
- Impact : le cron `POST /api/cron/check-prices` tourne mais chaque alerte échoue silencieusement (`return null`). Feature premium vendue (FREE 3 / EXPLORER 10 / WANDERER illimité) totalement inopérante, emails/push jamais envoyés.

**B3 — P0 — Capture de signaux comportementaux : 400 sur 100 % des appels**
- Chaîne : [Results.jsx:296,320,718](frontend/src/pages/Results.jsx) envoie `'saved'|'booked'|'clicked'` → [recommendationSchemas.js:74-77](backend/src/schemas/recommendationSchemas.js) n'accepte que `z.enum(['click','save','reject','view','book'])` → `validateBody` rejette en 400 ([travel.js:1402](backend/src/routes/travel.js)). Ironie : même si la validation passait, [recommendationEngine.js:212-217](backend/src/services/recommendationEngine.js) attend `clicked/saved/booked/rejected` — les valeurs du schéma zod n'y matchent pas non plus.
- Impact : la personnalisation « DNA » n'apprend jamais (pas de clicked/saved/booked en base, pas de régénération d'embedding). Le cœur différenciant du produit est inerte. Fire-and-forget côté front → personne ne l'a vu.

**B4 — P1 — Opt-out du digest hebdo sans effet (problème légal)**
- Fichier : [user.js:279-282,296-299](backend/src/routes/user.js) — `where: { user: { clerkId: req.user.id } }` : `req.user.id` est l'id Prisma (cuid), pas le `clerkId` → `updateMany` matche 0 ligne, répond `success: true`.
- Impact : un utilisateur qui se désinscrit continue de recevoir le digest ([digestService.js](backend/src/services/digestService.js) via cron). Non-conformité RGPD/anti-spam.

**B5 — P1 — Pas de suppression de compte**
- Preuve : aucun endpoint DELETE dans [user.js](backend/src/routes/user.js) ; [Account.jsx](frontend/src/pages/Account.jsx) n'offre que le portail Stripe (lignes 136-175). La page Mon compte existe (profil via Clerk, abonnement via portail) mais pas de droit à l'effacement.
- Impact : RGPD art. 17. Le seul chemin de suppression est le webhook Clerk `user.deleted`… qui est lui-même la faille A1.

**B6 — P1 — Webhook handlers Stripe : erreurs avalées, ack 200 quand même**
- Fichier : [billing.js:281-429](backend/src/routes/billing.js) — chaque handler fait `try/catch + console.error` puis la route répond `{received: true}`.
- Impact : une fois A2 corrigé, un échec DB (ex. P2025 sur `subscription.update` quand `customer.subscription.updated` arrive avant `checkout.session.completed`) sera perdu définitivement — Stripe ne retentera pas. Pas d'idempotence (pas de table d'événements traités) — acceptable car les writes sont des upserts, mais l'ack-on-error ne l'est pas.

**B7 — P1 — Cycle de vie des alertes incohérent**
- Fichier : [priceAlertService.js:203-206](backend/src/services/priceAlertService.js) — `status: 'triggered'` dès que le prix passe sous la cible, et [checkAllAlerts:232-238](backend/src/services/priceAlertService.js) ne requête que `status: 'active'` → une alerte déclenchée n'est plus jamais re-checkée (one-shot non documenté). Les alertes à date passée restent `active` pour toujours (jamais basculées `expired`).
- Impact : UX trompeuse (alerte affichée active mais morte) + lignes mortes en DB.

**B8 — P2 — Quota consommé sur le flux streaming même en cas d'erreur partielle**
- Fichier : [travel.js:1385-1389](backend/src/routes/travel.js) — correct (quota seulement si `completedCount > 0`). RAS — mentionné pour confirmer que ce point, lui, est bien géré. ✅

**B9 — P2 — Succès checkout non vérifiable côté client `[À VÉRIFIER]`**
- [billing.js:171](backend/src/routes/billing.js) renvoie vers `/account?session_id=...&success=true`. Tant que B1 n'est pas corrigé, l'utilisateur atterrit sur une page Account qui affiche toujours FREE. Vérifier après correction que Account relit `/api/billing/subscription` et affiche un état de confirmation.

**B10 — P2 — Token Clerk passé dans `location.state` pour le streaming**
- Fichier : [CreateTrip.jsx:500-502](frontend/src/pages/CreateTrip.jsx) → [Results.jsx:52](frontend/src/pages/Results.jsx). Les tokens Clerk expirent en ~60 s : un utilisateur qui laisse l'onglet ouvert puis revient sur /results en re-déclenchant le state peut partir avec un token mort → 401 → « La recherche a échoué » sans explication. Mieux : appeler `getToken()` dans Results au moment du fetch.

### C. Moteur de recommandation

**C1 — P1 — Le flux principal n'utilise PAS le moteur vectoriel**
- Preuve : découverte sans destination = `useStreaming` ([CreateTrip.jsx:497](frontend/src/pages/CreateTrip.jsx)) → `/recommendations/stream` → [travel.js:1048](backend/src/routes/travel.js) appelle `destinationService.discoverDestinations` directement → Claude génère la shortlist ([destinationService.js:222](backend/src/services/destinationService.js) → `generateDestinationShortlist`, Sonnet 4.5). Le moteur ANN+scoring (`getRecommendations`, [travel.js:603](backend/src/routes/travel.js)) n'est branché que sur l'endpoint JSON — qui ne sert qu'au scénario WITH_DESTINATION (où il n'est même pas utilisé puisque la destination est connue) et aux propositions de groupe.
- Impact : tout l'investissement Supabase/pgvector/Voyage (et l'arbitrage acté dans Audit.md : « le LLM ne choisit pas la destination ») est inopérant pour l'utilisateur réel. Coût Claude par recherche + destinations répétitives (bug connu).

**C2 — P0 — Budget non multiplié par le nombre de voyageurs sur le flux streaming**
- Preuve : [travel.js:1034](backend/src/routes/travel.js) `const budget = userProfile.basic.budget;` (per-person tel que saisi) vs endpoint JSON [travel.js:468-472](backend/src/routes/travel.js) qui fait `budget = budgetPerPerson * travelersCount`.
- Impact : pour un groupe de 4 avec 800 €/personne, le flux principal cherche avec 800 € totaux → faux négatifs « budget dépassé », alternatives train absurdes, hôtels sous-dimensionnés. Recoupe le bug connu « budget/personne vs budget total » de CLAUDE.md — il est corrigé sur le mauvais endpoint.

**C3 — P2 — Négation dans le texte d'embedding**
- Fichier : [embeddingService.js:76-78](backend/src/services/embeddingService.js) — `"Ne veut pas : Marrakech, Bali"` injecté dans le texte DNA. Les embeddings encodent mal la négation : le vecteur est tiré **vers** les destinations rejetées.
- Impact : les rejets risquent d'augmenter la similarité avec ce qui est rejeté. Les exclusions dures existent par ailleurs ([recommendationEngine.js:181-184](backend/src/services/recommendationEngine.js)) donc la ville exacte est filtrée, mais les destinations similaires aux rejets remontent. Retirer les rejets du texte d'embedding (les garder en hard filter).

**C4 — P2 — Embedding DNA recalculé à chaque recherche**
- Fichier : [recommendationEngine.js:153](backend/src/services/recommendationEngine.js) — `generateUserDNA` appelle Voyage AI à chaque requête ; le vecteur stocké dans `user_travel_profiles.embedding` (mis à jour ligne 156) n'est jamais relu.
- Impact : ~300-500 ms + coût par recherche pour rien quand le profil n'a pas changé. Hash du texte DNA → réutiliser le vecteur stocké.

**C5 — P2 — Pondération finale : la similarité vectorielle ne discrimine presque pas**
- Fichier : [recommendationEngine.js:196](backend/src/services/recommendationEngine.js) — `finalScore = similarity*60 + contextualScore*0.4`. Les similarités cosinus se concentrent typiquement dans [0.7, 0.9] → spread réel ~12 pts, contre ~40 pts pour le score contextuel : le « 60/40 » affiché est en pratique ~25/75.
- Impact : le ranking est dominé par météo/budget/affluence ; la personnalisation vectorielle pèse peu. Normaliser la similarité (min-max sur les candidats) avant pondération.

**C6 — P2 — Cold start / zéro résultat : globalement bien géré** ✅
- `discoverDestinations` retombe sur une liste curatée ([destinationService.js:356-366,474-477](backend/src/services/destinationService.js)), la route stream émet `no_destinations` avec conseils actionnables ([travel.js:1098-1110](backend/src/routes/travel.js)), un guard déterministe filtre les résultats absurdes ([travel.js:1356-1361](backend/src/routes/travel.js)), profil vide → `'voyage découverte'` ([embeddingService.js:80](backend/src/services/embeddingService.js)). Dédup destination côté front ([Results.jsx:143](frontend/src/pages/Results.jsx)).

**C7 — P2 — Stabilité/biais : liste « mainstream » codée en dur, mi-FR mi-EN**
- Fichier : [recommendationEngine.js:59](backend/src/services/recommendationEngine.js) — `['paris','rome','barcelone',...,'london','londres']` mélange graphies ; le bonus originalité dépend de la langue du nom en base. Déplacer en donnée (colonne `is_mainstream` Supabase).

### D. Données & API

**D1 — P1 — Aucun retry sur Booking.com ; fallback OK, quotas non gérés**
- Preuve : timeouts 30 s présents ([bookingService.js:601,656,1190](backend/src/services/bookingService.js)), fallback round-trip→2×one-way OK, mais zéro retry/backoff sur 429/5xx (grep `retry` vide) ; un 429 RapidAPI au mauvais moment fait perdre une destination entière (catch → null). Le commentaire [travel.js:1123-1124](backend/src/routes/travel.js) reconnaît que la limite par seconde RapidAPI est le plafond.
- Impact : résultats dégradés aléatoirement aux heures de pointe. Un retry simple (1 retry, backoff 1-2 s, sur 429/5xx) suffirait.

**D2 — P1 — Migrations Prisma ignorées par git, déploiement par `db push`**
- Preuve : [.gitignore](.gitignore) contient `backend/prisma/migrations/**/*.sql` ; build Render = `npx prisma db push` (CLAUDE.md).
- Impact : pas d'historique de migration, pas de rollback, drift silencieux possible entre environnements, et `db push` peut **supprimer des colonnes/données** sans avertissement bloquant en CI. À migrer vers `prisma migrate deploy` avant d'avoir de vrais clients payants.

**D3 — P2 — `priceHistory` doublement encodé**
- Fichier : [priceAlertService.js:47](backend/src/services/priceAlertService.js) — `JSON.stringify([...])` écrit dans un champ Prisma `Json` ([schema.prisma:572](backend/prisma/schema.prisma)) → la valeur stockée est une *string* JSON dans un champ JSON, d'où les `JSON.parse` partout ([priceAlertService.js:73,92](backend/src/services/priceAlertService.js)). Fragile (un write direct objet casserait les lecteurs).

**D4 — P2 — Stores en mémoire par instance**
- Rate limiters express-rate-limit sans store partagé ([rateLimiter.js](backend/src/middleware/rateLimiter.js)) et cache fallback mémoire ([cache.js:27](backend/src/utils/cache.js)) : OK pour 1 instance Render, à revoir si scale horizontal. (Le piège TTL minutes/secondes a été vérifié : `cache.set` convertit correctement, [cache.js:115-116](backend/src/utils/cache.js) ✅.)

**D5 — P2 — `AlgorithmResult.claudeDestinations` reçoit `d.name` qui n'existe pas sur le chemin vectoriel**
- Fichier : [travel.js:873](backend/src/routes/travel.js) — `topDestinations.map(d => d.name)` : le moteur vectoriel retourne `city` ([recommendationEngine.js:190-199](backend/src/services/recommendationEngine.js)) → tableau d'`undefined` (Prisma String[] refusera ou stockera du bruit) → tracking diversité faussé.

**D6 — `[À VÉRIFIER]` — Qualité/couverture de la table `destinations` Supabase**
- Le moteur dépend de `monthly_weather_score`, `avg_flight_price_eur`, `safety_index`, `trip_types` ; non vérifiable hors connexion DB. À auditer avec `backend/scripts/test-reco-quality.js` (harness existant).

### E. Qualité du code & dead code

**E1 — P2 — Dead code à supprimer**
- [backend/src/utils/budgetFilter.js](backend/src/utils/budgetFilter.js) : importé nulle part (grep négatif).
- `generateDestinations` dans [claudeService.js:22](backend/src/services/claudeService.js) : exporté, jamais importé.
- [backend/src/services/airScraperService.js](backend/src/services/airScraperService.js) (409 lignes) : référencé uniquement par destinationService — vérifier si l'appel est encore atteint, sinon supprimer avec ses mentions `usedAirScraper` dans les metadata ([travel.js:457,909](backend/src/routes/travel.js)) qui sont d'ailleurs mensongères (c'est Booking qui est utilisé).
- Vestiges de déploiement : [backend/railway.json](backend/railway.json), [backend/vercel.json](backend/vercel.json).
- `backend/.env.bak` sur disque (non tracké, mais 2,2 Ko de secrets probables qui traînent).
- `voting-images-fixed.jpeg` à la racine du repo.
- ~40 fichiers de session dans [docs/](docs/) (SESSION_SUMMARY, MIGRATION_COMPLETE×3…) qui noient la doc utile.

**E2 — P2 — Fichiers monstres et duplication massive**
- [TripDetail.jsx](frontend/src/pages/TripDetail.jsx) : 2 563 lignes. [claudeService.js](backend/src/services/claudeService.js) 1 528, [destinationService.js](backend/src/services/destinationService.js) 1 520, [travel.js](backend/src/routes/travel.js) 1 416, [Results.jsx](frontend/src/pages/Results.jsx) 1 399, [bookingService.js](backend/src/services/bookingService.js) 1 396.
- Le mapping `flightDetails` (~60 lignes) est copié-collé **3 fois** dans travel.js (lignes 338-403, 745-819, 1245-1309) — toute correction doit être faite en triple.

**E3 — P2 — 436 `console.log` backend, logger sous-utilisé**
- Un service [logger.js](backend/src/services/logger.js) existe mais n'est importé que par 2 fichiers. Logs verbeux (profil complet, emails) → cf. A9.

**E4 — P3 — TODO résiduels**
- [voting.js:541-542](backend/src/routes/voting.js) : notifications email de fin de vote non implémentées (TODO loggé en prod).
- [localEvents.js:3](backend/src/data/localEvents.js) : événements locaux = données statiques.

### F. CRO & conversion

**F1 — P1 — La page Pricing est inaccessible aux visiteurs non connectés**
- Preuve : [App.jsx:122-129](frontend/src/App.jsx) — `/pricing` est sous `ProtectedRoute` → redirect `/` pour un anonyme. En plus, [robots.txt](frontend/public/robots.txt) fait `Disallow: /pricing`.
- Impact : impossible d'évaluer le prix avant de créer un compte = friction majeure d'acquisition ; aucune indexation du pricing. Une page pricing doit être publique.

**F2 — P1 — Zéro analytics / tracking de conversion**
- Preuve : grep `gtag|plausible|posthog|umami|fathom|analytics` négatif sur tout le front (et index.html).
- Impact : funnel acquisition→activation→paiement non mesurable ; impossible de piloter le lancement. Poser au minimum un Plausible/PostHog + events (signup, première recherche, résultat vu, save, checkout).

**F3 — P1 — Affiliation Travelpayouts probablement non monétisée `[À VÉRIFIER]`**
- Preuve : [frontend/.env.example](frontend/.env.example) — « Without TP_MARKER set, booking links still work but earn no commission » ; `VITE_TP_MARKER=` vide ; [.env.production](frontend/.env.production) ne contient que `VITE_API_URL`.
- Impact : seule source de revenu hors abonnement à zéro si le marker n'est pas posé sur Vercel/Render.

**F4 — P2 — Trip Pass défini côté back, absent de la page Pricing `[À VÉRIFIER]`**
- [stripeService.js:84-106](backend/src/services/stripeService.js) définit TRIP_PASS (5,99 €, levier de conversion fort « pay-per-trip ») ; [Pricing.jsx:19-53](frontend/src/pages/Pricing.jsx) ne liste que FREE/Starter/Wanderer.

**F5 — P2 — Pas de preuve sociale / trust signals sur la Landing**
- [Landing.jsx](frontend/src/pages/Landing.jsx) : CTAs corrects (SignInButton modal — friction faible ✅), mais grep testimonial/avis négatif. Pour du voyage + paiement, un minimum de réassurance (nombre de voyages planifiés, logos presse, FAQ remboursement) est nécessaire.

### G. UX / UI

**G1 — P1 — i18n EN annoncé mais cœur d'app en français codé en dur**
- Preuve : [Results.jsx](frontend/src/pages/Results.jsx) ne contient que 2 appels `t()` pour 1 399 lignes (strings FR en dur lignes 56, 65, 114, 133, 140, 160, 206…), [TripDetail.jsx](frontend/src/pages/TripDetail.jsx) 2 appels pour 2 563 lignes, [Pricing.jsx](frontend/src/pages/Pricing.jsx) 1.
- Impact : un utilisateur EN (détection navigateur active) voit Landing en anglais puis bascule en français dès la recherche — expérience cassée. Soit finir l'i18n des pages cœur, soit assumer FR-only au lancement et retirer le switcher.

**G2 — P2 — Erreurs streaming peu actionnables**
- [Results.jsx:114](frontend/src/pages/Results.jsx) : tout échec → « La recherche a échoué. Réessayez dans un instant. » sans distinguer 401 (token expiré, cf. B10), 403 (quota), 429 (rate limit). L'utilisateur au quota reçoit le même message qu'en cas de panne.

**G3 — P2 — Modale sans scroll-lock (connu, différé)** — CLAUDE.md audit item 17. Cosmétique, confirmé toujours présent.

**G4 — P3 — Dates au locale FR en dur** — connu (CLAUDE.md item 18), cohérent avec G1.

### H. SEO technique

**H1 — P1 — SPA sans prerender : pages SEO invisibles aux crawlers sans JS**
- Preuve : [vite.config.js](frontend/vite.config.js) = plugin react seul ; `vite-plugin-prerender` est dans les devDependencies ([package.json](frontend/package.json)) mais **jamais configuré**. Les 20 pages destinations + /destinations sont lazy-loadées côté client ([App.jsx:20-21](frontend/src/App.jsx)).
- Impact : Googlebot rend le JS (avec délai et budget), mais Bing partiellement et la plupart des crawlers IA pas du tout (cf. section I). Tout l'investissement « 20 landing pages SEO » sert un HTML vide (`<div id="root">`). Prerender / SSG des routes publiques = priorité SEO n°1.

**H2 — P1 — Canonical unique vers la home sur toutes les pages**
- Preuve : [index.html:6](frontend/index.html) — `<link rel="canonical" href="https://skusku.life/" />` dans le HTML statique servi pour **toutes** les routes. Seules 2 pages corrigent dynamiquement via [SEO.jsx:40-48](frontend/src/components/SEO.jsx) (JS-only) : [DestinationLanding.jsx:87](frontend/src/pages/DestinationLanding.jsx) et [Destinations.jsx:27](frontend/src/pages/Destinations.jsx).
- Impact : au premier crawl HTML (sans rendu JS), chaque URL déclare « ma version canonique est la home » → signal de désindexation des pages destinations. Aggrave H1.

**H3 — P2 — Pas d'`og:image` / `twitter:image`**
- Preuve : [index.html:13-25](frontend/index.html) — `twitter:card summary_large_image` déclaré sans aucune image. Tout partage social affiche une carte vide.

**H4 — P3 — Sitemap statique sans `lastmod`** — [sitemap.xml](frontend/public/sitemap.xml). Mineur.

### I. GEO (Generative Engine Optimization)

**I1 — P1 — Contenu invisible pour les crawlers IA**
- GPTBot, ClaudeBot, PerplexityBot n'exécutent pas le JavaScript : ils voient le `<div id="root">` vide. Le contenu factuel des destinations (prix estimés, highlights, conseils — [frontend/src/data/destinations.js](frontend/src/data/destinations.js)) est inaccessible. **Dépend de H1** : le prerender résout SEO et GEO d'un coup.
- robots.txt n'adresse pas les agents IA (ni allow explicite ni politique) — décision à prendre, et ajouter les pages destinations en HTML statique citable.

**I2 — P2 — Données structurées limitées et non vérifiables par les LLM**
- Schema.org `WebApplication` sur la home ([index.html:28-45](frontend/index.html)) ✅ mais injecté en JS pour le reste (SEO.jsx). Manquent : `FAQPage` (questions type « combien coûte un week-end à Lisbonne »), `Offer`/`PriceSpecification` sur le pricing public (cf. F1), attribution/date des prix estimés. Actions GEO ≠ SEO : contenu factuel daté + attribué + en HTML statique + FAQ structurée ; éventuellement un `llms.txt`.

### J. Stratégie de trafic / growth

**J1 — P1 — Aucune mesure = aucun pilotage** (cf. F2). Premier investissement growth : analytics + events + UTM.
**J2 — P2 — SEO programmatique : la bonne idée est déjà là, sous-exploitée**
- 20 pages destinations bilingues existent. Une fois H1/H2 corrigés : étendre par templates (« {destination} en {mois} », « budget {destination} {durée} jours ») depuis les données Supabase déjà enrichies (météo mensuelle, prix moyens) — contenu unique et factuel, exactement ce que les moteurs IA citent.
**J3 — P2 — Boucle virale dormante : les invitations de groupe**
- Le flux invitation email → AcceptInvitation → création de compte existe ([invitations.js](backend/src/routes/invitations.js), [AcceptInvitation.jsx](frontend/src/pages/AcceptInvitation.jsx)). C'est le canal d'acquisition le moins cher du produit. À instrumenter (taux d'acceptation, K-factor) et soigner (l'email d'invitation est limité à 3/h par IP par `emailLimiter` — vérifier que ça ne bride pas un organisateur légitime qui invite 6 amis `[À VÉRIFIER]` : la limite est par IP, 6 invitations en un POST passent, OK).
**J4 — P3 — Affiliation : poser TP_MARKER (F3) puis mesurer le revenu par clic sortant.**

---

## 3. Backlog opérationnel pour Opus

> Triés par priorité. Chaque carte est autoportante.

### TASK-001 — Sécuriser le webhook Clerk `/api/users/sync` avec Svix
- Sévérité : P0
- Catégorie : Sécurité
- Contexte : l'endpoint est public et traite `user.deleted` par un `prisma.user.delete` en cascade. N'importe qui peut supprimer/créer/modifier des comptes.
- Fichiers concernés : `backend/src/routes/user.js:14-81`, `backend/.env.example` (ajouter `CLERK_WEBHOOK_SECRET`)
- Action attendue : vérifier la signature Svix (`svix` est le format des webhooks Clerk : headers `svix-id`, `svix-timestamp`, `svix-signature`) avec `CLERK_WEBHOOK_SECRET` avant tout traitement. Le webhook a besoin du **raw body** → monter `express.raw()` sur cette route AVANT le json parser global (coordonner avec TASK-002). Rejeter en 401 si signature invalide. Documenter la config du webhook dans le dashboard Clerk.
- Critères d'acceptation : un POST sans signature valide → 401 et aucune écriture DB ; un événement Clerk réel (ou signé en test avec le secret) est traité ; test unitaire sur le rejet.
- Effort : S
- Dépendances : aucune (synergique avec TASK-002)
- Risque de régression : sync de nouveaux utilisateurs Clerk — tester signup complet.

### TASK-002 — Réparer la vérification de signature des webhooks Stripe (raw body)
- Sévérité : P0
- Catégorie : Sécurité / Paiement
- Contexte : `app.use(express.json())` (server.js:63) consomme le body avant le `express.raw()` de billing.js:224 → `constructEvent` reçoit un objet → 100 % des webhooks échouent en 400 → les abonnements payés ne sont jamais activés en DB.
- Fichiers concernés : `backend/server.js:63`, `backend/src/routes/billing.js:224`
- Action attendue : exclure le webhook du json parser global, p.ex. `app.use((req,res,next)=> req.originalUrl === '/api/billing/webhook' ? next() : express.json()(req,res,next))` ou monter le webhook avant `express.json()`. Vérifier avec `stripe listen --forward-to localhost:3001/api/billing/webhook`.
- Critères d'acceptation : `stripe trigger checkout.session.completed` → 200, `Subscription.plan` mis à jour en DB ; un payload sans signature → 400.
- Effort : S
- Dépendances : aucune
- Risque de régression : tous les endpoints JSON (vérifier que le parser global s'applique toujours ailleurs).

### TASK-003 — Réparer le moteur d'alertes de prix (IDs + champ prix)
- Sévérité : P0
- Catégorie : Fonctionnel
- Contexte : `checkAlertPrice` passe les objets destination entiers comme `fromId`/`toId` et lit `flights.flights[0].totalPrice` qui n'existe pas (`parseFlightOffers` expose `price.amount`). Chaque check échoue silencieusement ; la feature premium est morte.
- Fichiers concernés : `backend/src/services/priceAlertService.js:151-180`, référence : `backend/src/services/bookingService.js:478-495` (retour de `getDestinationId`) et `:762-766` (shape du prix)
- Action attendue : `const [fromDest, toDest] = ...` puis `searchFlights({ fromId: fromDest.id, toId: toDest.id, ... })` ; lire `flights.flights[0].price.amount`. Ajouter un test unitaire avec une réponse Booking mockée. Bonus même fichier : basculer `status: 'expired'` quand `departureDate < now` (voir TASK-014).
- Critères d'acceptation : `node -e` ou script de test qui exécute `checkAlertPrice` sur une alerte seedée → `currentPrice` numérique en DB, `priceHistory` enrichi ; le cron `/api/cron/check-prices` rapporte `checked > 0, errors: 0`.
- Effort : S
- Dépendances : aucune
- Risque de régression : emails/push de baisse de prix (tester `shouldSendNotification`).

### TASK-004 — Multiplier le budget par voyageur sur l'endpoint streaming
- Sévérité : P0
- Catégorie : Moteur de reco / Fonctionnel
- Contexte : le flux principal (découverte) passe par `/recommendations/stream` qui utilise `userProfile.basic.budget` brut (per-person), alors que l'endpoint JSON multiplie par `travelers`. Les recherches de groupe utilisent un budget 2-8× trop bas.
- Fichiers concernés : `backend/src/routes/travel.js:1034` (à aligner sur le bloc `:468-473`)
- Action attendue : répliquer la logique `budget = budgetPerPerson * travelers` + `budgetPerPerson` conservé dans le profil, avant `discoverDestinations`. Factoriser dans un helper partagé par les deux endpoints pour éviter une nouvelle divergence.
- Critères d'acceptation : recherche streaming avec 4 voyageurs × 800 € → logs `discoverDestinations` montrent `budget: 3200` ; test unitaire sur le helper.
- Effort : S
- Dépendances : aucune
- Risque de régression : seuils `passesHardConstraints` et messages budget_warning (re-tester un cas solo).

### TASK-005 — Réparer la chaîne de signaux comportementaux (click/save/book)
- Sévérité : P0
- Catégorie : Moteur de reco
- Contexte : trois vocabulaires incompatibles : frontend envoie `'clicked'|'saved'|'booked'` (Results.jsx:296,320,718), le schéma zod n'accepte que `'click'|'save'|'reject'|'view'|'book'` (→ 400 systématique), et `captureSignal` attend `'clicked'|'saved'|'booked'|'rejected'`. La boucle d'apprentissage du DNA ne reçoit rien.
- Fichiers concernés : `backend/src/schemas/recommendationSchemas.js:74-77`, `backend/src/services/recommendationEngine.js:211-219`, `frontend/src/pages/Results.jsx:252-260,296,320,718`
- Action attendue : choisir UN vocabulaire (recommandé : celui du moteur `clicked/saved/booked/rejected`, qui correspond aux colonnes Supabase), aligner le zod enum et le frontend. Ajouter un log de succès côté route pour vérifier en prod.
- Critères d'acceptation : clic « save » sur un résultat → `POST /api/travel/signal` 200 → ligne ajoutée dans `user_travel_profiles.saved_destinations` (Supabase) et DNA régénéré (log `[Reco] DNA vector refreshed`).
- Effort : S
- Dépendances : aucune
- Risque de régression : aucun appelant d'autres types (`view` n'est envoyé nulle part — le retirer ou l'implémenter).

### TASK-006 — Brancher le moteur vectoriel sur l'endpoint streaming
- Sévérité : P1
- Catégorie : Moteur de reco
- Contexte : le flux utilisateur principal laisse Claude choisir les destinations (`discoverDestinations` → `generateDestinationShortlist`), contournant le moteur ANN/scoring (décision d'archi actée dans Audit.md). Coût LLM par recherche + destinations répétitives.
- Fichiers concernés : `backend/src/routes/travel.js:1048` (remplacer l'appel direct par `getRecommendations(...)` comme en `:603-621`, en gardant `discoverDestinations` comme fallback catch), `backend/src/services/recommendationEngine.js`
- Action attendue : même pattern que l'endpoint JSON : `getRecommendations(...).catch(() => discoverDestinations(...))`. Adapter le shape (`dest.city` vs `dest.name`) pour la boucle d'optimisation en aval (`destinationsToProcess.map(dest => dest.name)` → `dest.city || dest.name`). Corriger au passage `AlgorithmResult` (travel.js:873 : `d.name` → `d.city || d.name`).
- Critères d'acceptation : une recherche découverte logge `[Reco] N destinations (from 30 candidates...)` et n'appelle `generateDestinationShortlist` qu'en fallback ; `npm run test:reco` (harness existant) ne régresse pas.
- Effort : M
- Dépendances : TASK-004 (budget correct d'abord), TASK-005 (signaux alimentent le DNA)
- Risque de régression : tout le flux résultats streaming (events SSE `recommendation`, guard, photos). Tester aussi le scénario budget serré (le chemin `budget_warning` n'existe que dans discoverDestinations — décider de son équivalent).

### TASK-007 — Roter et retirer la clé privée VAPID du repo (+ vérifier rotation Booking)
- Sévérité : P1
- Catégorie : Sécurité
- Contexte : la paire VAPID réelle est commitée dans `backend/.env.example` ; CLAUDE.md signale aussi que l'ancienne BOOKING_API_KEY exposée dans l'historique git n'a pas été confirmée rotée.
- Fichiers concernés : `backend/.env.example` (lignes VAPID_*)
- Action attendue : générer une nouvelle paire (`npx web-push generate-vapid-keys`), mettre à jour Render + le placeholder dans .env.example ; les abonnements push existants devront se réabonner (le frontend lit la clé publique via `/api/push/vapid-key` — vérifier la gestion d'erreur de mismatch). Confirmer auprès d'Arthur la rotation RapidAPI.
- Critères d'acceptation : plus aucune clé réelle dans les fichiers trackés (`git grep` négatif) ; toggle push fonctionne avec la nouvelle clé.
- Effort : S
- Dépendances : aucune
- Risque de régression : abonnements push existants invalidés (acceptable pré-launch).

### TASK-008 — `trust proxy` correct + erreurs sanitizées
- Sévérité : P1
- Catégorie : Sécurité
- Contexte : `app.set('trust proxy', true)` rend `req.ip` spoofable via X-Forwarded-For → tous les rate limits IP contournables. Par ailleurs auth.js:125 et checkSubscription.js:102,144,211 renvoient `error.message` au client.
- Fichiers concernés : `backend/server.js:39`, `backend/src/middleware/rateLimiter.js` (retirer les `validate: { trustProxy: false }`), `backend/src/middleware/auth.js:119-127`, `backend/src/middleware/checkSubscription.js:98-104,140-147,207-214`
- Action attendue : `app.set('trust proxy', 1)` (Render = 1 proxy) ; supprimer le champ `details`/`message: error.message` des réponses d'erreur (garder le log serveur).
- Critères d'acceptation : requête avec `X-Forwarded-For: 1.2.3.4` forgé → `req.ip` reste l'IP du client réel ; les 401/500 ne contiennent plus de message interne.
- Effort : S
- Dépendances : aucune
- Risque de régression : rate limiting derrière le proxy Render (vérifier en prod que les IP loggées sont plausibles).

### TASK-009 — `npm audit fix` front + back (Clerk critical, react-router)
- Sévérité : P1
- Catégorie : Sécurité
- Contexte : frontend : 1 critical (`@clerk/shared` bypass), `@clerk/clerk-react` high, react-router 9 advisories (XSS/open redirect/CSRF/DoS) ; backend : 29 vulns (ws/engine.io/socket.io). Tous corrigeables sans `--force` d'après npm.
- Fichiers concernés : `frontend/package.json` + lockfile, `backend/package.json` + lockfile
- Action attendue : `npm audit fix` dans les deux packages, puis `npm run build` (front) et `npm test` (back, vitest) ; vérifier que Clerk (login/SignedIn) et socket.io (chat de groupe) fonctionnent.
- Critères d'acceptation : `npm audit --omit=dev` : 0 critical/high sur les deux packages ; build OK ; login + chat OK.
- Effort : S
- Dépendances : aucune
- Risque de régression : auth Clerk, routing, websockets — smoke test complet.

### TASK-010 — Sécuriser le `state` OAuth Google Calendar
- Sévérité : P1
- Catégorie : Sécurité
- Contexte : `state` = base64(`{userId}`) non signé ; le callback public écrit les tokens sur le userId fourni → CSRF OAuth / liaison de calendrier arbitraire.
- Fichiers concernés : `backend/src/routes/calendar.js:19-94`
- Action attendue : signer le state (HMAC SHA-256 avec un secret serveur + timestamp, expiration 10 min) à l'authorize ; vérifier signature + fraîcheur au callback avant d'écrire les tokens. (Optionnel P2 : chiffrer `calendarAccessToken`/`calendarRefreshToken` au repos — le schéma l'annonce « encrypted in production », schema.prisma:95-96.)
- Critères d'acceptation : un callback avec state forgé/expiré → redirect erreur sans écriture DB ; le flow légitime connecte toujours le calendrier.
- Effort : M
- Dépendances : aucune
- Risque de régression : connexion calendrier de bout en bout (authorize → consent → callback → /account?calendar_success).

### TASK-011 — Webhooks Stripe : répondre 500 sur échec handler + garde-fous
- Sévérité : P1
- Catégorie : Paiement
- Contexte : les handlers avalent les erreurs puis la route ack 200 → événements perdus sans retry Stripe. Une fois TASK-002 livré, c'est le maillon faible suivant.
- Fichiers concernés : `backend/src/routes/billing.js:234-275,281-429`
- Action attendue : faire remonter les erreurs des handlers (throw) et répondre 500 pour déclencher le retry Stripe ; rendre `handleSubscriptionUpdate` tolérant à l'ordre des événements (upsert par `stripeSubscriptionId` au lieu d'update sec) ; ignorer idempotemment les événements déjà appliqués (comparaison `stripeCurrentPeriodEnd`).
- Critères d'acceptation : simulate handler failure → réponse 500 ; `customer.subscription.updated` reçu avant `checkout.session.completed` ne crashe pas et converge.
- Effort : M
- Dépendances : TASK-002
- Risque de régression : double-traitement d'événements lors des retries — vérifier l'idempotence des upserts.

### TASK-012 — Réparer l'opt-out digest + endpoint de suppression de compte (RGPD)
- Sévérité : P1
- Catégorie : Fonctionnel / Légal
- Contexte : (a) opt-out digest matche 0 ligne (`clerkId: req.user.id` au lieu de `req.user.clerkId`) → les emails continuent ; (b) aucun moyen de supprimer son compte.
- Fichiers concernés : `backend/src/routes/user.js:277-305` (fix where : `userId: req.user.id`), nouveau `DELETE /api/users/me` + bouton dans `frontend/src/pages/Account.jsx`
- Action attendue : (a) corriger le `where` (le plus simple : `prisma.userPreferences.upsert` sur `userId: req.user.id`) ; (b) endpoint authentifié qui supprime l'utilisateur Clerk (`clerkClient.users.deleteUser`) puis la ligne Prisma (cascade) ; UI avec confirmation type « taper SUPPRIMER ».
- Critères d'acceptation : opt-out → `digestOptOut: true` en DB et exclusion dans `digestService` ; suppression → user absent de Clerk ET de la DB, session invalidée.
- Effort : M
- Dépendances : TASK-001 (le webhook user.deleted déclenchera aussi la suppression DB — éviter le double delete : gérer P2025)
- Risque de régression : cascade Prisma sur les trips de groupe dont l'utilisateur est créateur (CollaborativeTrip onDelete: Cascade — les voyages de groupe de ses amis seront supprimés ! Décider : réassigner l'organisateur ou bloquer la suppression si trips actifs).

### TASK-013 — Rendre /pricing public + poser l'analytics
- Sévérité : P1
- Catégorie : CRO / Growth
- Contexte : la page pricing est derrière auth et disallow dans robots.txt ; aucun analytics nulle part → funnel non mesurable.
- Fichiers concernés : `frontend/src/App.jsx:122-129` (sortir `/pricing` de ProtectedRoute ; gérer l'état signed-out dans `Pricing.jsx` : CTA = SignUp au lieu de checkout), `frontend/public/robots.txt` (retirer `Disallow: /pricing`), `frontend/index.html` (script analytics)
- Action attendue : route publique ; checkout déclenche le sign-in si anonyme ; intégrer Plausible ou PostHog avec events : `signup`, `search_started`, `results_viewed`, `trip_saved`, `checkout_started`, `checkout_completed`, `invitation_sent/accepted` + UTM passthrough.
- Critères d'acceptation : navigation anonyme vers /pricing → page visible ; clic « S'abonner » anonyme → modal Clerk puis retour pricing ; events visibles dans le dashboard analytics.
- Effort : M
- Dépendances : aucune
- Risque de régression : redirections Clerk post-signup (signUpFallbackRedirectUrl=/onboarding).

### TASK-014 — Cycle de vie des alertes de prix (expiration, re-check, double encodage)
- Sévérité : P2
- Catégorie : Fonctionnel
- Contexte : alertes `triggered` jamais re-checkées, alertes à date passée jamais expirées, `priceHistory` stocké en string dans un champ Json.
- Fichiers concernés : `backend/src/services/priceAlertService.js:47,203-206,232-246`, `backend/prisma/schema.prisma:572`
- Action attendue : dans `checkAllAlerts`, basculer en `expired` les alertes dont `departureDate < now` ; décider du comportement post-trigger (recommandé : continuer à checker tant que `isActive`, notifier selon `shouldSendNotification`) ; stocker `priceHistory` en vrai JSON (migration douce : parse si string).
- Critères d'acceptation : cron sur jeu d'alertes mixte → statuses corrects ; UI PriceAlerts cohérente.
- Effort : M
- Dépendances : TASK-003
- Risque de régression : lecture de `priceHistory` côté front (PriceAlerts.jsx).

### TASK-015 — Prerender des routes publiques + canonical/og:image corrects
- Sévérité : P1
- Catégorie : SEO / GEO
- Contexte : SPA sans prerender : les 20 pages destinations sont vides pour les crawlers sans JS (dont tous les bots IA) ; canonical statique pointe la home sur toutes les routes ; aucune og:image.
- Fichiers concernés : `frontend/vite.config.js`, `frontend/index.html:6` (retirer le canonical statique global), `frontend/src/components/SEO.jsx`, `frontend/public/` (og-image)
- Action attendue : configurer le prerender des routes `/`, `/destinations`, `/destination/:slug` (×20, slugs dans `frontend/src/data/destinations.js`) — via vite-plugin-prerender déjà installé, ou `vite-ssg`/script puppeteer post-build si le plugin est incompatible Vite 7 `[À VÉRIFIER compatibilité]` ; canonical par page injecté au prerender ; créer une og-image (1200×630) et la référencer.
- Critères d'acceptation : `curl https://skusku.life/destination/lisbon | grep -i lisbon` retourne du contenu (titre, description, prix) sans exécuter de JS ; canonical de chaque page = sa propre URL ; aperçu de partage avec image.
- Effort : L
- Dépendances : aucune
- Risque de régression : build Vercel (temps de build, rewrites SPA pour les routes non prerendered).

### TASK-016 — Retirer les rejets du texte d'embedding + cacher le DNA
- Sévérité : P2
- Catégorie : Moteur de reco
- Contexte : « Ne veut pas : X » tire le vecteur VERS les destinations rejetées (les embeddings n'encodent pas la négation) ; le DNA est recalculé via Voyage AI à chaque recherche alors qu'il est déjà persisté.
- Fichiers concernés : `backend/src/services/embeddingService.js:76-78`, `backend/src/services/recommendationEngine.js:150-156,244-268`
- Action attendue : exclure `rejectedDestinations` du texte DNA (les hard filters de `getRecommendations` les gèrent déjà) ; mémoïser l'embedding par hash du texte DNA (réutiliser `user_travel_profiles.embedding` si le hash stocké correspond).
- Critères d'acceptation : `npm run test:reco` ne régresse pas ; deuxième recherche du même utilisateur ne déclenche pas d'appel Voyage (log absent).
- Effort : M
- Dépendances : TASK-006
- Risque de régression : pertinence reco — passer le harness avant/après.

### TASK-017 — Retry léger Booking.com + factorisation du mapping flightDetails
- Sévérité : P2
- Catégorie : Données & API / Qualité
- Contexte : aucun retry sur 429/5xx RapidAPI (destinations perdues aléatoirement) ; le mapping flightDetails est dupliqué 3× dans travel.js (~180 lignes).
- Fichiers concernés : `backend/src/services/bookingService.js` (wrapper axios avec 1 retry + backoff sur 429/5xx), `backend/src/routes/travel.js:338-403,745-819,1245-1309` (extraire `formatFlightDetails(trip)`)
- Action attendue : helper retry (max 1 retry, 1500 ms backoff, jamais sur 4xx hors 429) ; fonction unique de formatting utilisée par les 3 blocs.
- Critères d'acceptation : tests unitaires du formatter (les 3 shapes actuels produisent un résultat identique à l'existant) ; mock 429 → 1 retry puis succès.
- Effort : M
- Dépendances : aucune
- Risque de régression : structure JSON consommée par Results.jsx/TripDetail.jsx — snapshot test conseillé.

### TASK-018 — Passer de `prisma db push` à `prisma migrate`
- Sévérité : P1
- Catégorie : Données
- Contexte : migrations SQL gitignorées + `db push` au build Render = pas d'historique ni rollback, risque de perte de données silencieuse à chaque déploiement de schéma.
- Fichiers concernés : `.gitignore` (retirer `backend/prisma/migrations/**/*.sql`), build command Render (→ `npx prisma migrate deploy`), baseline initiale à générer
- Action attendue : `prisma migrate dev --name baseline` localement (ou `migrate diff` + `migrate resolve` pour baseliner la prod sans reset), committer les migrations, changer la commande de build. **Demander confirmation à Arthur avant** (règle CLAUDE.md : schéma DB = ASK).
- Critères d'acceptation : déploiement Render réussi avec `migrate deploy` ; `prisma migrate status` propre en prod.
- Effort : M
- Dépendances : aucune — à faire avant toute prochaine modif de schéma
- Risque de régression : build Render (tester sur un déploiement de staging d'abord).

### TASK-019 — Nettoyage dead code & vestiges
- Sévérité : P2
- Catégorie : Qualité
- Contexte : code et fichiers morts qui ralentissent toute intervention.
- Fichiers concernés : `backend/src/utils/budgetFilter.js` (supprimer), `claudeService.js:22-122` (`generateDestinations` — supprimer), `backend/src/services/airScraperService.js` (vérifier l'unique référence dans destinationService ; si non atteinte, supprimer + corriger les metadata mensongères `usedAirScraper` travel.js:457,909), `backend/railway.json`, `backend/vercel.json`, `voting-images-fixed.jpeg`, `backend/.env.bak` (supprimer du disque), `docs/` (archiver les ~40 fichiers de session dans `docs/archive/`)
- Action attendue : suppression + `npm run build` front + `npm test` back pour valider qu'aucun import ne casse.
- Critères d'acceptation : grep des symboles supprimés vide ; build et tests verts.
- Effort : M
- Dépendances : aucune
- Risque de régression : faible (code non référencé), vérifier airScraperService avant suppression.

### TASK-020 — i18n des pages cœur OU lancement FR-only assumé
- Sévérité : P2
- Catégorie : UX
- Contexte : l'EN est annoncé (switcher, landing traduite) mais Results/TripDetail/Pricing sont en français codé en dur — expérience EN cassée à la première recherche.
- Fichiers concernés : `frontend/src/pages/Results.jsx`, `frontend/src/pages/TripDetail.jsx`, `frontend/src/pages/Pricing.jsx`, `frontend/src/i18n/{fr,en}.json`
- Action attendue : décision produit d'abord (demander à Arthur). Option A : extraire les ~80 strings vers i18n. Option B : forcer `lng: 'fr'`, masquer le switcher, retirer l'EN du sitemap/OG — et le réintroduire post-launch.
- Critères d'acceptation : navigateur en anglais → expérience cohérente de bout en bout (A) ou entièrement FR sans switcher (B).
- Effort : M (A) / S (B)
- Dépendances : aucune
- Risque de régression : interpolations de strings dynamiques (compteurs, pluriels).

### TASK-021 — Hardening config prod : BETA_MODE, TP_MARKER, Trip Pass sur Pricing, no-op next
- Sévérité : P1 (config) / P2 (code)
- Catégorie : CRO / Fonctionnel
- Contexte : trois interrupteurs business potentiellement sur OFF + un bug latent de middleware.
- Fichiers concernés : env Render (`BETA_MODE=false` quand prêt), env Vercel (`VITE_TP_MARKER`), `frontend/src/pages/Pricing.jsx:19-53` (ajouter la carte Trip Pass, plan défini dans `stripeService.js:84-106`), `backend/src/middleware/checkSubscription.js:122-124,173-184` (remplacer `await checkSubscription(req, res, () => {})` par un helper qui retourne la subscription ou répond et `return`)
- Action attendue : checklist env documentée + vérification via `/api/health/internal` ; carte Trip Pass avec `mode: 'payment'` (le backend checkout la gère déjà) ; fix du no-op next.
- Critères d'acceptation : `/api/health/internal` montre `betaModeActive: false` au lancement ; achat Trip Pass de bout en bout (dépend TASK-002) ; un compte `past_due` reçoit un 403 propre, pas un crash.
- Effort : M
- Dépendances : TASK-002 (Trip Pass), TASK-013 (pricing public)
- Risque de régression : gating des recherches en prod — tester le passage FREE → limite atteinte → upsell.

### TASK-022 — Logs : retirer le PII, brancher le logger
- Sévérité : P2
- Catégorie : Sécurité / RGPD
- Contexte : profil utilisateur complet loggé en JSON (travel.js:178), emails loggés partout, 436 console.log.
- Fichiers concernés : `backend/src/routes/travel.js:178`, passes ciblées sur `backend/src/routes/*` et `src/services/*`, `backend/src/services/logger.js`
- Action attendue : supprimer le dump du profil (logger uniquement scenario/budget/duration) ; remplacer email par userId dans les logs ; migrer progressivement vers logger.js avec niveaux (pas un big-bang : prioriser routes auth/billing/user).
- Critères d'acceptation : grep `JSON.stringify(userProfile` vide ; aucun email en clair dans les logs des chemins critiques.
- Effort : M
- Dépendances : aucune
- Risque de régression : aucune (logs only) — garder les logs pipeline grep-friendly existants.

### TASK-023 — GEO : FAQ structurée + contenu citable sur les pages destinations
- Sévérité : P2
- Catégorie : GEO / Growth
- Contexte : une fois TASK-015 livré (HTML statique), rendre le contenu citable par ChatGPT/Perplexity/AI Overviews : c'est différent du SEO classique (mots-clés) — il faut des faits datés, attribués, structurés.
- Fichiers concernés : `frontend/src/data/destinations.js`, `frontend/src/pages/DestinationLanding.jsx`, `frontend/src/components/SEO.jsx`, `frontend/public/robots.txt`
- Action attendue : ajouter par destination un bloc FAQ (3-4 Q/R factuelles : budget moyen, meilleure période, durée idéale) rendu en HTML + schema `FAQPage` ; dater les estimations de prix (« estimation juin 2026 ») ; politique bots IA explicite dans robots.txt (recommandé : allow GPTBot/ClaudeBot/PerplexityBot sur les pages publiques) ; optionnel `llms.txt` décrivant le produit.
- Critères d'acceptation : Rich Results Test valide le FAQPage ; le HTML statique contient les Q/R.
- Effort : M
- Dépendances : TASK-015
- Risque de régression : aucune.

### TASK-024 — Erreurs streaming actionnables + token frais
- Sévérité : P2
- Catégorie : UX
- Contexte : tout échec du stream → message générique ; le token Clerk est figé dans location.state (expire ~60 s).
- Fichiers concernés : `frontend/src/pages/Results.jsx:52,71-117`, `frontend/src/pages/CreateTrip.jsx:500-502`
- Action attendue : appeler `getToken()` dans Results au moment du fetch (ne plus passer le token par le state) ; différencier 401 (reconnectez-vous), 403 quota (CTA /pricing), 429 (réessayez dans X min) du cas erreur serveur.
- Critères d'acceptation : simuler chaque code → message dédié ; recherche lancée après 2 min d'attente sur CreateTrip fonctionne.
- Effort : S
- Dépendances : aucune
- Risque de régression : flux streaming nominal.

---

## 4. Ordre d'exécution recommandé

**Vague 1 — Ship-blockers sécurité & paiement (à faire avant tout le reste)**
1. TASK-002 (Stripe raw body) → 2. TASK-001 (webhook Clerk/Svix) → 3. TASK-003 (alertes prix) → 4. TASK-004 (budget × voyageurs) → 5. TASK-005 (signaux comportementaux) → 6. TASK-007 (VAPID) → 7. TASK-008 (trust proxy + sanitization) → 8. TASK-009 (npm audit fix)

**Vague 2 — Fiabilité fonctionnelle & légal**
9. TASK-011 (webhooks robustes) → 10. TASK-012 (opt-out + suppression compte) → 11. TASK-010 (OAuth state) → 12. TASK-021 (config prod + Trip Pass) → 13. TASK-018 (prisma migrate) → 14. TASK-014 (cycle de vie alertes)

**Vague 3 — Produit & moteur de reco**
15. TASK-006 (moteur vectoriel sur le flux principal) → 16. TASK-016 (embeddings : négation + cache) → 17. TASK-017 (retry Booking + factorisation) → 18. TASK-024 (erreurs streaming)

**Vague 4 — Croissance : CRO, SEO, GEO, qualité**
19. TASK-013 (pricing public + analytics — peut être avancée en vague 2 si lancement marketing imminent) → 20. TASK-015 (prerender) → 21. TASK-023 (GEO/FAQ) → 22. TASK-020 (i18n : décision) → 23. TASK-019 (dead code) → 24. TASK-022 (logs PII)

**Décisions à demander à Arthur avant exécution** : TASK-018 (migrations = changement de workflow DB), TASK-020 (FR-only vs i18n complet), TASK-012 (politique de suppression quand l'utilisateur est créateur de trips de groupe), TASK-006 (sort du chemin `budget_warning` propre à discoverDestinations).
