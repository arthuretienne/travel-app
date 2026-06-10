# Prompt — Re-audit pre-ship V2 (mode AUDIT, lecture seule)

> À coller dans une **nouvelle session Claude Code (Fable 5)**, à la racine du repo, après le déploiement du commit `c7a0730`.
> Objectif : mesurer si le **Ship-Readiness Score** a augmenté depuis l'audit V1, en vérifiant chaque correctif dans le code et en cherchant les régressions.

---

## Rôle & contraintes

Tu es l'auditeur senior qui a produit `AUDIT-PRE-SHIP.md` (V1). Tu refais le **même audit** sur l'état actuel du code pour produire un **V2 comparatif**.

1. **READ-ONLY.** Tu ne modifies aucun fichier de code. Seul livrable écrit : `AUDIT-PRE-SHIP-V2.md`.
2. **Vérifie, ne suppose pas.** Chaque statut doit citer `fichier:ligne`. Si tu ne peux pas le prouver dans le code → `[À VÉRIFIER]`.
3. **Distingue code vs runtime.** Certains correctifs ne sont vérifiables qu'à l'exécution (webhooks Stripe/Clerk, clés rotées sur Render). Tu peux confirmer la **correction du code** ; marque la partie runtime `[RUNTIME — non vérifiable en statique]`, ne la compte pas comme un échec.
4. **Lis d'abord** `AUDIT-PRE-SHIP.md` (findings A→J + backlog TASK-001..024) — c'est ta référence.

---

## Phase 0 — Contexte de ce qui a été livré (commit `c7a0730`)

Correctifs **censés être présents** (à VÉRIFIER, pas à croire) :

| TASK | Attendu | Où regarder |
|---|---|---|
| 001 | Vérif signature Svix sur `/users/sync` | `backend/src/routes/user.js` (`verifyClerkWebhook`), `server.js` (RAW_BODY_PATHS) |
| 002 | Webhook Stripe reçoit le raw body | `server.js` (skip `express.json` pour `/api/billing/webhook`) |
| 003 | Price alerts : `.id` + `price.amount` | `backend/src/services/priceAlertService.js:~150-185` |
| 004 | Budget × voyageurs sur le stream | `backend/src/routes/travel.js` (endpoint `/recommendations/stream`) |
| 005 | Signaux : enum `clicked/saved/booked/rejected` | `recommendationSchemas.js` + `Results.jsx` + `recommendationEngine.js` |
| 006 | Moteur vectoriel branché sur le stream (fallback discover) | `travel.js` (`getRecommendations` dans le bloc stream) |
| 007 | VAPID privée = placeholder | `backend/.env.example` |
| 008 | `trust proxy=1` + erreurs sanitizées | `server.js`, `rateLimiter.js`, `auth.js`, `checkSubscription.js` |
| 010 | State OAuth signé HMAC | `backend/src/routes/calendar.js` (`signState`/`verifyState`) |
| 011 | Handlers Stripe throw→500 + upsert idempotent | `backend/src/routes/billing.js` |
| 012 | Opt-out digest réparé + `DELETE /api/users/me` | `user.js`, `frontend/src/pages/Account.jsx` |
| 013 | `/pricing` public + events analytics | `App.jsx`, `Pricing.jsx`, `robots.txt`, `frontend/src/lib/analytics.js` |
| 014 | Alertes : expire + re-check | `priceAlertService.js` (`checkAllAlerts`) |
| 016 | Rejets hors embedding + cache DNA | `embeddingService.js` |
| 017 | Retry Booking 429/5xx | `bookingService.js` (`bookingGet`) |
| 019 | Dead code retiré (`budgetFilter.js`) | absence du fichier |
| 021 | Garde `headersSent` (no-op next) | `checkSubscription.js` |
| 022 | Plus de dump profil complet en log | `travel.js` |
| 024 | Token frais + erreurs streaming actionnables | `frontend/src/pages/Results.jsx` |

**Volontairement NON faits (à confirmer comme encore ouverts, ne pas pénaliser comme régression) :**
- **TASK-009** `npm audit fix` (Clerk critical, react-router) — **toujours ouvert**, à re-vérifier (`npm audit --omit=dev` dans les 2 packages).
- **TASK-015** prerender SEO (pages destinations invisibles aux crawlers) — ouvert.
- **TASK-018** migrations Prisma (`db push` → `migrate`) — ouvert.
- **TASK-020** i18n des pages cœur (Results/TripDetail/Pricing FR en dur) — ouvert.
- **TASK-017 partiel** : retry fait, **factorisation du mapping flightDetails (×3) non faite**.
- **TASK-019 partiel** : `airScraperService.js` (fichier) laissé en place.
- **TASK-021 partiel** : carte **Trip Pass** absente de Pricing ; `BETA_MODE`/`TP_MARKER` = config Render/Vercel.
- Analytics : shim `track()` câblé mais **provider non activé** (script Plausible commenté).

**Runtime (config faite par l'utilisateur, non vérifiable en statique) :** rotation VAPID, webhook Clerk + `CLERK_WEBHOOK_SECRET`, setup Stripe (produits/prix + webhook + secret).

Reconstitue ta carte du repo en 8-10 lignes, puis lance la vérification.

---

## Phase 1 — Vérification des 24 TASK

Pour chaque TASK ci-dessus, donne un statut **prouvé par `fichier:ligne`** :

- ✅ **RESOLVED** — corrigé et correct.
- 🟡 **PARTIAL** — partiellement (précise ce qui manque).
- ❌ **OPEN** — non corrigé / cassé.
- ⏸️ **DEFERRED** — sciemment reporté (cf. liste ci-dessus).
- 🔵 **RUNTIME** — code OK, reste à valider à l'exécution.

⚠️ Sois critique : vérifie que les correctifs sont **réellement corrects**, pas juste présents. Exemples de pièges à contrôler :
- TASK-002 : le skip `express.json` matche-t-il vraiment le bon path ? La route webhook a-t-elle bien son `express.raw` ?
- TASK-006 : le shape `dest.city` vs `dest.name` est-il géré en aval du stream ? Le `budget_warning` fonctionne-t-il encore via le fallback ?
- TASK-012 : la réattribution créateur gère-t-elle le cas « aucun autre membre » sans casser ?
- TASK-016 : le cache DNA peut-il servir un vecteur périmé après un nouveau signal comportemental ?

## Phase 2 — Re-audit dimensionnel A→J (chercher les NOUVEAUX problèmes)

Refais l'audit complet des dimensions A→J de `AUDIT-PRE-SHIP.md` sur le code **actuel** (qui inclut aussi la refonte `TripDetail`/groupe livrée en même temps). Objectif : détecter les **régressions** et **nouveaux findings** introduits depuis V1. Même format (sévérité P0/P1/P2/P3, `fichier:ligne`, preuve, impact).

Porte une attention particulière à :
- `frontend/src/pages/TripDetail.jsx` (refonte massive, +1959 lignes) et `components/group/*` — non audités en V1.
- Le dev-tooling commité (`backend/src/routes/dev.js`, `DevPersonaBar.jsx`, `lib/devAuth.js`) : confirme qu'il est **bien gated** (`NODE_ENV=development`/`DEV_MODE`) et **inerte en prod**. Tout chemin d'impersonation atteignable en prod = **P0**.
- Cohérence des deux endpoints reco (JSON vs stream) après les changements de budget.

---

## Phase 3 — Scorecard & verdict

### Barème (Ship-Readiness Score /100)

Poids par sévérité : **P0 = 10, P1 = 4, P2 = 1.5, P3 = 0.5**.

- `total_weight_V1` = 5×10 + 14×4 + 19×1.5 + 7×0.5 = **138** (baseline V1).
- `open_weight` = somme des poids des findings **OPEN ou PARTIAL** (compter PARTIAL à 50%) **+ NEW** (nouveaux findings V2) **+ DEFERRED à 50%** (risque réel mais accepté).
- `RUNTIME` et `DEFERRED`-purement-config (BETA_MODE, TP_MARKER, rotation clés) ne comptent **pas** dans open_weight.

```
Ship-Readiness Score = round( 100 × (1 − open_weight / (138 + new_weight)) )
```

- **Baseline V1 = 0/100, verdict 🔴** (tout était ouvert).
- **Règle dure** : tout P0 **OPEN ou NEW** → verdict **🔴** et score **plafonné à 40**, quel que soit le calcul.
- Verdict : 🔴 < 60 · 🟠 60–84 · 🟢 ≥ 85 **et** zéro P0 ouvert.

Donne aussi un **score ajusté** excluant les DEFERRED acceptés, pour que l'utilisateur voie « readiness réelle » vs « readiness si on assume les reports ».

### Livrable : `AUDIT-PRE-SHIP-V2.md`

1. **Synthèse** : verdict V2, **Score V1 (0) → V2 (X)**, delta, score ajusté, et la phrase clé « ce qui reste avant 🟢 ».
2. **Tableau de vérification des 24 TASK** : TASK · statut · preuve `fichier:ligne` · note.
3. **Nouveaux findings (Phase 2)** groupés A→J, format V1.
4. **Compte par sévérité** : V1 vs V2 (résolus / restants / nouveaux).
5. **Backlog V2** : uniquement les OPEN + NEW + PARTIAL, en task cards autoportantes (même format que V1), triées P0→P3.
6. **Reste à valider en runtime** : checklist courte (webhooks Stripe/Clerk en 200, paiement test bout-en-bout, suppression de compte).

Commence par la Phase 0.
