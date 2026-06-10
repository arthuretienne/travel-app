# Skusku — Architecture Trip-Push & Brief d'exécution Claude Code

> **Objectif de ce document** : servir de brief unique à Claude Code. Il doit (1) auditer l'existant, (2) comparer à la cible décrite ici, (3) implémenter les changements par étapes, en gardant le projet testable et propre à chaque palier.
>
> **Principe directeur** : le LLM ne prédit pas et ne choisit pas la destination. La sélection est portée par une couche déterministe (vecteurs pgvector + scoring). Claude intervient uniquement pour l'orchestration (`tool_use`) et la génération de la *raison* personnalisée. C'est ce qui distingue un vrai système IA d'un wrapper.

---

## 0. Stack de référence (existant supposé)

- **Front** : React + Vite + Clerk, déployé sur Vercel
- **Back** : Express + Prisma, déployé sur Railway
- **DB** : Neon PostgreSQL (avec extension `pgvector`)
- **Embeddings** : Voyage AI
- **LLM** : Claude API (Anthropic)
- **Données voyage** : Booking.com via RapidAPI, Pexels (images)
- **Jobs** : à introduire (cron) — historiquement VPS chez Arthur

Claude Code doit **confirmer ou corriger** ces hypothèses pendant l'audit.

---

## 1. PHASE AUDIT (à exécuter en premier, ne rien modifier)

Claude Code produit un fichier `AUDIT.md` à la racine répondant à :

### 1.1 Données & schéma
- Lister les modèles Prisma existants (`schema.prisma`). Quelles tables, quelles relations ?
- Existe-t-il déjà : une table de destinations ? une base de connaissance pré-calculée ? des embeddings stockés ? un profil utilisateur structuré ?
- `pgvector` est-il activé sur Neon ? Les colonnes `vector` existent-elles ? Quelle dimension (Voyage `voyage-3` = 1024) ?
- Y a-t-il un index ANN (`ivfflat` ou `hnsw`) ? Sinon, le noter comme manquant.

### 1.2 Pipeline de recommandation actuel
- Tracer le chemin d'une requête de reco : endpoint → service → calcul → réponse.
- Le matching destination↔user passe-t-il par l'ANN ou encore par un appel LLM ? (point critique — si c'est encore le LLM qui choisit, c'est le premier chantier).
- Où le Claude API est-il appelé aujourd'hui, et pour quoi exactement ?

### 1.3 Intégrations externes
- Booking.com (RapidAPI) : où, comment, avec quelle gestion d'erreur/cache/rate-limit ?
- Pexels : idem.
- Voyage AI : où les embeddings sont-ils générés (à la volée ? batch ?).

### 1.4 Jobs / proactivité
- Existe-t-il un mécanisme de tâche planifiée (cron, queue, worker) ? Le mode "trip-push" est-il amorcé ?

### 1.5 Qualité & testabilité
- Y a-t-il des tests (unitaires, intégration) ? Un framework configuré (Vitest/Jest) ?
- Variables d'environnement : sont-elles documentées (`.env.example`) ?
- Le projet démarre-t-il proprement en local (front + back) ? Noter toute friction.

> **Sortie attendue de la phase** : `AUDIT.md` avec, pour chaque point, l'état réel + un verdict `OK` / `À FAIRE` / `À CORRIGER`.

---

## 2. ARCHITECTURE CIBLE

### 2.1 Vue d'ensemble (les 3 couches, comme le pipeline churn)

```
┌─────────────────────────────────────────────────────────────────┐
│ COUCHE 1 — FEATURE / DATA (déterministe, pré-calculée)            │
│                                                                   │
│  destinations ──embed──▶ destination_embeddings (pgvector)        │
│  user activity ──build──▶ user_features + user_embedding          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ COUCHE 2 — SCORING / MATCHING (déterministe, PAS de LLM)          │
│                                                                   │
│  ANN search (pgvector) ──▶ top-N destinations candidates          │
│  + re-rank par règles (budget, saison, fenêtre dispo)             │
│  + push_score utilisateur (réceptivité à un voyage maintenant)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ COUCHE 3 — AGENT CLAUDE (orchestration + langage uniquement)      │
│                                                                   │
│  tool_use: get_booking_availability, get_destination_images       │
│  ──▶ génère la "raison" personnalisée                             │
│  ──▶ Structured Output JSON ──▶ table recommendations             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
     API on-demand (front)          CRON trip-push (proactif)
```

### 2.2 Modèle de données cible (Prisma)

À ajouter / aligner :

- **`Destination`** : `id`, `name`, `country`, `description`, `tags[]`, `bestSeasons[]`, `avgBudgetEur`, `lat`, `lng`, `createdAt`.
- **`DestinationEmbedding`** : `destinationId` (FK, unique), `embedding vector(1024)`, `model`, `updatedAt`. Index HNSW.
- **`UserFeature`** : `userId` (FK Clerk, unique), `preferredSeasons[]`, `avgBudgetEur`, `tripTypes[]` (city/beach/nature…), `lastTripAt`, `homeAirport`, `updatedAt`.
- **`UserEmbedding`** : `userId`, `embedding vector(1024)`, `model`, `updatedAt`. Construit à partir de l'historique (voyages, likes, recherches).
- **`Recommendation`** : `id`, `userId`, `destinationId`, `matchScore` (float, vient de l'ANN), `pushScore` (float, réceptivité), `reason` (text, généré par Claude), `availabilityJson`, `source` (`on_demand` | `trip_push`), `status` (`pending`/`sent`/`clicked`/`booked`), `createdAt`.

> Le découpage `UserFeature` (lisible) vs `UserEmbedding` (vectoriel) reproduit volontairement le couple `churn_features` + scoring du pipeline de référence.

### 2.3 La couche scoring (cœur déterministe)

**Matching** : requête pgvector ANN entre `UserEmbedding` et `DestinationEmbedding` → top-N (ex. 20).

**Re-rank par règles** (pures fonctions testables, zéro LLM) :
- pénalité si saison courante ∉ `bestSeasons`
- pénalité si `avgBudgetEur` destination > budget user × marge
- bonus si fenêtre calendrier libre détectée
→ produit `matchScore` final et l'ordre.

**`pushScore`** (réceptivité, l'analogue du `bucket_ml`) : fonction de `lastTripAt` (récence), saison favorable, budget compatible, fenêtre libre. Seuil configurable au-dessus duquel le trip-push se déclenche. C'est l'équivalent exact du `bucket = 4 → action`.

### 2.4 La couche agent Claude

Claude API appelé **uniquement** sur les candidates déjà sélectionnées, avec `tool_use` :
- `get_booking_availability(destination, dates)` → Booking.com RapidAPI
- `get_destination_images(destination)` → Pexels

Sortie : **Structured Output JSON strict** (`{ destinationId, reason, confidence }`), parsé et écrit dans `Recommendation`. Prompt système : interdire d'inventer une destination hors de la liste fournie ; rôle = expliquer + enrichir, pas choisir.

### 2.5 Le mode trip-push (proactif)

Un job planifié (cron Railway, ou worker dédié) :
1. Sélectionne les users avec `pushScore ≥ seuil`.
2. Pour chacun : ANN → re-rank → top destination.
3. Appelle l'agent Claude pour la raison + dispo.
4. Écrit une `Recommendation` `source=trip_push, status=pending`.
5. (Notification : hors scope code initial, prévoir le hook.)

Idempotence obligatoire : pas de doublon de push pour un même user/destination dans une fenêtre donnée.

---

## 3. PLAN D'EXÉCUTION ITÉRATIF (pour Claude Code)

> Règle : **chaque étape doit laisser le projet dans un état qui démarre, qui passe ses tests, et qui est commitable.** Pas d'étape suivante tant que la précédente n'est pas verte.

### Étape 0 — Audit
Produire `AUDIT.md` (section 1). **STOP** et présenter le verdict avant toute modif.

### Étape 1 — Fondations data
- Activer `pgvector`, migrations Prisma pour les 5 modèles cible (ou alignement de l'existant).
- `.env.example` complété (clés Voyage, Anthropic, RapidAPI, Pexels, DB).
- Index HNSW sur les colonnes vector.
- **Critère vert** : `prisma migrate` passe ; un script de seed insère 3 destinations de test + leurs embeddings ; une requête ANN brute retourne un résultat.

### Étape 2 — Embeddings & features (services purs)
- Service `embedDestination()` et `buildUserEmbedding()` (Voyage).
- Service `buildUserFeatures()` à partir de l'historique.
- **Critère vert** : tests unitaires sur la construction des features (entrées mockées → sortie attendue) ; embeddings générés et stockés pour le seed.

### Étape 3 — Scoring déterministe (le plus testable)
- Fonctions pures : `annSearch()`, `reRank()`, `computePushScore()`.
- **Critère vert** : tests unitaires couvrant les règles de re-rank et les seuils de pushScore (cas limites : budget dépassé, hors-saison, voyage récent). Aucun appel réseau dans ces tests.

### Étape 4 — Agent Claude + tool_use
- Implémenter l'appel Claude avec les 2 tools, Structured Output JSON, validation du schéma de sortie (zod).
- Garde-fou : rejeter toute reco dont le `destinationId` n'est pas dans les candidates.
- **Critère vert** : test d'intégration avec Booking/Pexels mockés ; la reco produite est bien parsée et écrite en base.

### Étape 5 — Endpoint API on-demand
- `GET/POST /recommendations` : pipeline complet couches 1→3, retourne les recos + raison.
- **Critère vert** : test e2e (supertest) sur l'endpoint avec services externes mockés ; réponse < 2s hors latence LLM réelle.

### Étape 6 — Cron trip-push
- Worker planifié, sélection par `pushScore`, idempotence, écriture `Recommendation source=trip_push`.
- **Critère vert** : exécution manuelle du job en local produit des recos cohérentes pour les users de test, sans doublon sur seconde exécution.

### Étape 7 — Nettoyage & doc
- README mis à jour (lancer le projet, lancer les tests, lancer le job).
- Supprimer le code de l'ancien chemin "LLM choisit la destination" s'il subsiste.
- **Critère vert** : `npm run lint` + `npm test` verts sur front et back ; démarrage local propre documenté.

---

## 4. CONSIGNES DE STYLE POUR CLAUDE CODE

- Travaille **étape par étape**, commit atomique par étape, ne saute pas une étape rouge.
- Privilégie les **fonctions pures testables** pour tout ce qui est scoring/règles.
- **Aucun secret en dur** ; tout via env.
- Le LLM ne doit jamais être sur le chemin critique de la *sélection*. S'il l'est dans l'existant, c'est le premier refactor.
- Demande validation après l'**Étape 0 (audit)** et après l'**Étape 3 (scoring)** — ce sont les deux points où une mauvaise hypothèse coûte cher.
- À la fin de chaque étape : résume ce qui a changé, ce qui est vert, ce qui reste.