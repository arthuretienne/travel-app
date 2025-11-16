# 🤖 Guide d'Utilisation des MCPs Travel AI

## Table des matières
1. [Introduction aux MCPs](#introduction)
2. [Installation et Configuration](#installation)
3. [MCP Figma to Code](#mcp-figma)
4. [MCP Amadeus Optimizer](#mcp-amadeus)
5. [Exemples d'Utilisation](#exemples)
6. [Troubleshooting](#troubleshooting)

---

## 📚 Introduction aux MCPs

Les **Model Context Protocols (MCPs)** sont des serveurs spécialisés qui étendent les capacités de Claude Code avec des outils personnalisés pour votre projet.

### Nos 2 MCPs

1. **Figma to Code**: Convertit vos designs Figma en composants React/React Native
2. **Amadeus Optimizer**: Optimise vos appels API Amadeus (cache, batching, rate limiting)

---

## 🔧 Installation et Configuration

### Prérequis

```bash
# Node.js 20+
node --version

# Redis (pour le cache Amadeus)
redis-server --version

# Accès API
# - Figma Personal Access Token
# - Amadeus API credentials
```

### Installation des dépendances

```bash
# Depuis la racine du projet
cd mcp/figma-to-code
npm install
npm run build

cd ../amadeus-optimizer
npm install
npm run build
```

### Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet:

```env
# Figma
FIGMA_ACCESS_TOKEN=your_figma_token_here

# Amadeus
AMADEUS_API_KEY=your_amadeus_api_key
AMADEUS_API_SECRET=your_amadeus_api_secret

# Redis
REDIS_URL=redis://localhost:6379
```

### Obtenir les tokens

#### Figma Personal Access Token

1. Allez sur https://www.figma.com/developers/api
2. Connectez-vous à votre compte
3. Cliquez sur "Get personal access token"
4. Copiez le token généré

#### Amadeus API Credentials

1. Créez un compte sur https://developers.amadeus.com
2. Créez une application (Self-Service)
3. Notez votre API Key et API Secret
4. Utilisez d'abord l'environnement **test** (gratuit)

### Activation dans Claude Code

Le fichier `.claude/mcp.json` est déjà configuré. Les MCPs seront automatiquement chargés au démarrage de Claude Code.

Vérification:
```bash
# Dans Claude Code, tapez:
# "Liste les outils MCP disponibles"
```

Vous devriez voir:
- `extract_figma_design`
- `extract_design_tokens`
- `search_flights_optimized`
- `get_flight_inspiration`
- etc.

---

## 🎨 MCP Figma to Code

### Fonctionnalités

1. **Extraction de design tokens** (couleurs, typo, espacements)
2. **Génération de composants React**
3. **Génération de composants React Native**
4. **Export de screenshots**

### Utilisation

#### 1. Extraire les design tokens

```
Peux-tu extraire les design tokens depuis ce Figma:
https://www.figma.com/file/8Xn27RsBzEEZkgrqbM6hZL/Plan-your-trip
```

Claude va utiliser l'outil `extract_design_tokens` et vous retourner:

```typescript
{
  colors: {
    primary: { 50: '#E3F2FD', 500: '#2196F3', ... },
    secondary: { ... },
  },
  typography: {
    heading1: { fontSize: 32, fontWeight: 700, ... },
    body: { fontSize: 16, fontWeight: 400, ... },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
  }
}
```

#### 2. Générer un composant depuis Figma

```
Génère le composant OnboardingStep1 depuis ce design Figma:
URL: https://www.figma.com/file/8Xn27RsBzEEZkgrqbM6hZL/Plan-your-trip
Node ID: 123:456
Target: react
```

Claude va:
1. Extraire le design du node spécifié
2. Analyser la structure (layout, styles, textes)
3. Générer le code React/TypeScript
4. Créer le fichier avec les styles

Résultat: `src/components/OnboardingStep1.tsx`

#### 3. Workflow recommandé

**Pour le onboarding (4 étapes)**:

```
1. Génère OnboardingStep1 depuis Figma (Questions Basiques)
   Node ID: [à récupérer depuis Figma]

2. Génère OnboardingStep2 depuis Figma (Préférences Détaillées)

3. Génère OnboardingStep3 depuis Figma (Contraintes Pratiques)

4. Génère OnboardingStep4 depuis Figma (Disponibilités)
```

Claude créera automatiquement:
- Les 4 composants TypeScript
- Les styles inline ou CSS modules
- Les props interfaces
- L'import des design tokens

#### 4. Personnalisation du code généré

Le code généré est un **point de départ**. Vous devrez:
- Ajouter la logique métier (state, handlers)
- Connecter aux APIs
- Ajouter la validation des formulaires
- Gérer les erreurs

---

## 🚀 MCP Amadeus Optimizer

### Fonctionnalités

1. **Cache intelligent Redis** (TTL adaptatif)
2. **Batch processing** (recherche multiple optimisée)
3. **Rate limiting** (respect des limites API)
4. **Pre-screening** avec Flight Inspiration

### Architecture d'optimisation

```
┌─────────────────────────────────────────────┐
│  Requête: 10 destinations                   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  1. Pre-screening (1 call API)              │
│  Flight Inspiration → filtre budget         │
└─────────────────┬───────────────────────────┘
                  │
                  ▼ (Top 5 destinations)
┌─────────────────────────────────────────────┐
│  2. Check Cache Redis                       │
│  3 destinations trouvées en cache           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼ (2 destinations manquantes)
┌─────────────────────────────────────────────┐
│  3. Recherche détaillée (2 calls API)       │
│  Avec rate limiting                         │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  RÉSULTAT: 5 destinations                   │
│  Coût: 3 calls au lieu de 10                │
│  Économie: 70%                              │
└─────────────────────────────────────────────┘
```

### Utilisation

#### 1. Recherche de vols optimisée (méthode simple)

```
Recherche des vols depuis CDG vers:
- LIS (Lisbonne)
- OPO (Porto)
- BCN (Barcelone)
- MAD (Madrid)

Départ: 2025-04-15
Retour: 2025-04-22
Budget max: 1000€
```

Claude utilisera `search_flights_optimized` automatiquement.

#### 2. Batch search (méthode avancée)

```
Utilise le MCP Amadeus pour chercher les meilleures destinations depuis CDG:

Destinations candidates:
- LIS, OPO, BCN, MAD, VLC, SVQ, AGP, PMI
- AGP, FAO, GRX

Dates flexibles:
- Créneau 1: 15-22 avril
- Créneau 2: 01-08 juillet

Budget: 800€
```

Claude utilisera `batch_search_destinations`:
- 1 call Flight Inspiration
- Top 3-5 sélectionnés
- Recherche détaillée avec cache
- **Total: ~4-6 calls au lieu de 24**

#### 3. Inspiration de destinations

```
Donne-moi des idées de destinations depuis Paris (CDG)
Budget max: 500€
Pour la période: avril 2025
```

Claude utilisera `get_flight_inspiration` (1 seul call API).

Résultat:
```json
[
  { "destination": "LIS", "price": { "total": "280.00" } },
  { "destination": "OPO", "price": { "total": "320.00" } },
  { "destination": "BUD", "price": { "total": "180.00" } },
  { "destination": "PRG", "price": { "total": "220.00" } },
  ...
]
```

#### 4. Recherche d'hôtels

```
Cherche des hôtels à Lisbonne (LIS)
Check-in: 2025-04-15
Check-out: 2025-04-22
Fourchette de prix: 50-150€/nuit
```

Claude utilisera `search_hotels` avec cache 4h.

#### 5. Gestion du cache

```
# Voir les stats du cache
Donne-moi les statistiques du cache Amadeus

# Vider le cache
Vide le cache Amadeus pour les vols
```

### Économies réalisées

| Scenario | Approche naïve | Optimisée | Économie |
|----------|---------------|-----------|----------|
| 10 destinations | 30 calls (10×3) | 10 calls | 66% |
| Avec pre-screening | 30 calls | 6 calls | 80% |
| Avec cache 50% | 15 calls | 3 calls | 80% |

**Coût estimé par recherche**:
- Naïve: ~0.60€
- Optimisée: ~0.20€
- **Économie: 66%**

---

## 💡 Exemples d'Utilisation Complète

### Exemple 1: Créer l'écran d'onboarding complet

```
Tâche: Créer les 4 écrans d'onboarding basés sur le Figma

Figma: https://www.figma.com/file/8Xn27RsBzEEZkgrqbM6hZL/Plan-your-trip

Étapes:
1. Extrais les design tokens du Figma
2. Crée le fichier src/theme/tokens.ts avec ces tokens
3. Génère OnboardingStep1 (Questions Basiques)
4. Génère OnboardingStep2 (Préférences Détaillées)
5. Génère OnboardingStep3 (Contraintes Pratiques)
6. Génère OnboardingStep4 (Disponibilités)
7. Crée le composant parent OnboardingFlow qui gère la navigation

Pour chaque composant:
- Target: react
- Utilise TypeScript
- Importe les tokens du theme
- Ajoute les props interfaces
```

### Exemple 2: Implémenter le système de recommandations

```
Tâche: Créer le service de recommandations optimisé

1. Utilise le MCP Amadeus pour chercher les vols

Scénario utilisateur:
- Origine: CDG (Paris)
- Budget: 1000€
- Destinations préférées selon profil IA: LIS, OPO, BCN, VLC, SVQ, AGP, FAO, PRG, BUD, KRK

Dates disponibles:
- 15-22 avril 2025
- 01-08 juillet 2025
- 15-22 septembre 2025

Process:
1. Pour chaque créneau de dates:
   a. Utilise get_flight_inspiration pour pré-filtrer
   b. Utilise batch_search_destinations pour le top 5
   c. Recherche les hôtels pour les 3 meilleures destinations

2. Calcule le scoring combiné:
   - Match IA: 40%
   - Prix: 30%
   - Originalité: 20%
   - Disponibilité: 10%

3. Retourne le top 3 recommandations
```

### Exemple 3: Optimiser les coûts API en production

```
Tâche: Analyse et optimise notre consommation API Amadeus

1. Affiche les stats du cache Redis
2. Identifie les patterns de requêtes les plus fréquents
3. Suggère des optimisations (augmenter TTL, batch plus agressif)
4. Estime les économies sur 10,000 recherches/mois
```

---

## 🔍 Troubleshooting

### Problème: MCP Figma ne se connecte pas

**Symptômes**: Erreur "FIGMA_ACCESS_TOKEN is required"

**Solution**:
```bash
# Vérifier que le token est dans .env
cat .env | grep FIGMA

# Rebuild le MCP
cd mcp/figma-to-code
npm run build

# Redémarrer Claude Code
```

### Problème: Amadeus rate limit exceeded

**Symptômes**: Erreur 429 "Too Many Requests"

**Solution**:
```bash
# Le MCP gère automatiquement le rate limiting
# Mais si vous dépassez, attendez 1 minute

# Vérifier les stats du rate limiter
# (via Claude Code):
"Donne-moi les stats du rate limiter Amadeus"
```

### Problème: Cache Redis non disponible

**Symptômes**: "Error connecting to Redis"

**Solution**:
```bash
# Démarrer Redis
redis-server

# Ou via Docker
docker run -d -p 6379:6379 redis:7-alpine

# Vérifier la connexion
redis-cli ping
# Devrait retourner: PONG
```

### Problème: Node Figma introuvable

**Symptômes**: "Node with ID xyz not found"

**Solution**:
1. Ouvrez le fichier Figma dans votre navigateur
2. Sélectionnez le composant/frame désiré
3. Clic droit → "Copy link"
4. L'URL contient le node ID après `?node-id=`

Exemple:
```
https://www.figma.com/file/ABC123/Design?node-id=123%3A456

Node ID = 123:456
```

### Problème: Code généré ne compile pas

**Causes possibles**:
- Imports manquants
- Types incorrects
- Tokens non définis

**Solution**:
```
Le composant généré ne compile pas, peux-tu:
1. Ajouter les imports manquants
2. Corriger les erreurs TypeScript
3. Créer les types nécessaires
```

---

## 📊 Monitoring & Analytics

### Métriques à surveiller

```typescript
// backend/src/services/amadeus/amadeus.metrics.ts

export const amadeusMetrics = {
  // Appels API
  totalCalls: 0,
  cachedCalls: 0,
  failedCalls: 0,

  // Coûts
  estimatedCost: 0, // en €

  // Performance
  averageResponseTime: 0, // en ms
  cacheHitRate: 0, // en %

  // Rate limiting
  rateLimitHits: 0,
  throttledRequests: 0,
};
```

### Dashboard recommandé

Utilisez **Grafana + Prometheus** pour visualiser:
- Nombre d'appels API par heure
- Taux de cache hit
- Coûts estimés quotidiens
- Erreurs API

---

## 🚀 Prochaines Étapes

1. **Testez les MCPs** avec des vraies données
2. **Optimisez les TTL** du cache selon vos patterns
3. **Monitorez** les coûts API en temps réel
4. **Itérez** sur les composants générés depuis Figma
5. **Documentez** vos propres patterns d'utilisation

---

## 📞 Support

- **Documentation officielle**: `/docs`
- **Issues**: GitHub Issues
- **Slack**: #travel-ai-dev

---

*Document version 1.0 - Novembre 2024*
