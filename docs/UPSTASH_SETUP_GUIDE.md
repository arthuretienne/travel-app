# 🔴 Guide Configuration Upstash Redis

## Pourquoi Upstash Redis ?

- ✅ **Serverless** : Pay-per-request, pas de serveur à gérer
- ✅ **10,000 commandes/jour gratuit** (largement suffisant pour MVP)
- ✅ **Latence ultra-faible** avec edge caching
- ✅ **Compatible Redis standard** (ioredis, node-redis)
- ✅ **Économie de 66%** sur les coûts API Amadeus

---

## 📊 Impact du Cache

### Sans cache
- Recherche de 3 destinations = **30 appels Amadeus**
  - 10 destinations pré-screening
  - 3 destinations × 3 vols chacune
  - 3 destinations × 3 hôtels chacune
- **Coût** : ~0.30€ par recherche
- **Temps** : ~10-12 secondes

### Avec cache Upstash
- 1ère recherche : 30 appels (mise en cache)
- 2ème recherche identique : **0 appel** (lecture cache)
- Recherches similaires : **~10 appels** (66% d'économie)
- **Coût** : ~0.10€ par recherche
- **Temps** : ~2-3 secondes

---

## Étape 1 : Créer un Compte

1. **Aller sur** : https://console.upstash.com
2. **Sign up** avec :
   - GitHub (recommandé)
   - Google
   - Email

3. **Confirmer** votre email

---

## Étape 2 : Créer une Database Redis

1. **Cliquer** sur "Create Database"

2. **Configuration** :
   - **Name** : `travel-ai-cache`
   - **Type** :
     - ✅ **Regional** (gratuit)
     - ❌ Global (payant)
   - **Region** :
     - 🇪🇺 `eu-central-1` (Francfort) - Recommandé pour Europe
     - 🇺🇸 `us-east-1` (Virginie) - Si users aux US
   - **Eviction** : `allkeys-lru` (supprime anciennes clés si plein)
   - **TLS** : ✅ Enabled (recommandé)

3. **Cliquer** sur "Create"

---

## Étape 3 : Récupérer l'URL Redis

Après création, vous voyez le dashboard de votre DB.

### 📋 Connection Strings

Upstash fournit **plusieurs formats** :

#### 1. Redis URL (Recommandé pour Node.js)
```
rediss://default:AbCdEfGh123456789@grateful-lemur-12345.upstash.io:6379
```

#### 2. REST URL (Alternative pour serverless)
```
https://grateful-lemur-12345.upstash.io
```

### 📸 Où trouver ?

**Dashboard** → Votre database → **Connect** → Copier `UPSTASH_REDIS_REST_URL`

---

## Étape 4 : Ajouter dans `.env`

```env
# ==================================
# 🔴 UPSTASH REDIS ✅ CONFIGURÉ
# ==================================
REDIS_URL=rediss://default:AbCdEfGh123456789@grateful-lemur-12345.upstash.io:6379
```

⚠️ **Important** :
- L'URL doit commencer par `rediss://` (avec double 's' pour TLS)
- Inclut le mot de passe après `default:`

---

## Étape 5 : Installer ioredis

```bash
cd backend
npm install ioredis
```

---

## Étape 6 : Créer le Service de Cache

Créez `backend/src/services/cacheService.js` :

```javascript
// backend/src/services/cacheService.js
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

let redis = null;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redis.on('connect', () => {
      console.log('✅ Redis cache connected');
    });

    redis.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error.message);
  }
} else {
  console.warn('⚠️  REDIS_URL not set, caching disabled');
}

/**
 * Récupère une valeur du cache
 */
export async function getCached(key) {
  if (!redis) return null;

  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log(`💨 Cache HIT: ${key}`);
      return JSON.parse(cached);
    }
    console.log(`❌ Cache MISS: ${key}`);
    return null;
  } catch (error) {
    console.error('Redis get error:', error.message);
    return null;
  }
}

/**
 * Stocke une valeur dans le cache
 */
export async function setCached(key, value, ttlSeconds = 3600) {
  if (!redis) return false;

  try {
    await redis.set(
      key,
      JSON.stringify(value),
      'EX',
      ttlSeconds
    );
    console.log(`✅ Cached: ${key} (TTL: ${ttlSeconds}s)`);
    return true;
  } catch (error) {
    console.error('Redis set error:', error.message);
    return false;
  }
}

/**
 * Supprime une clé du cache
 */
export async function deleteCached(key) {
  if (!redis) return false;

  try {
    await redis.del(key);
    console.log(`🗑️  Deleted from cache: ${key}`);
    return true;
  } catch (error) {
    console.error('Redis delete error:', error.message);
    return false;
  }
}

/**
 * Supprime toutes les clés matchant un pattern
 */
export async function deletePattern(pattern) {
  if (!redis) return 0;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;

    await redis.del(...keys);
    console.log(`🗑️  Deleted ${keys.length} keys matching ${pattern}`);
    return keys.length;
  } catch (error) {
    console.error('Redis delete pattern error:', error.message);
    return 0;
  }
}

/**
 * Vérifie si une clé existe
 */
export async function exists(key) {
  if (!redis) return false;

  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    console.error('Redis exists error:', error.message);
    return false;
  }
}

/**
 * Statistiques du cache
 */
export async function getCacheStats() {
  if (!redis) return null;

  try {
    const info = await redis.info('stats');
    const lines = info.split('\r\n');

    const stats = {};
    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });

    return {
      hits: parseInt(stats.keyspace_hits) || 0,
      misses: parseInt(stats.keyspace_misses) || 0,
      hitRate: stats.keyspace_hits
        ? (parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100).toFixed(2)
        : 0,
    };
  } catch (error) {
    console.error('Redis stats error:', error.message);
    return null;
  }
}

export { redis };
```

---

## Étape 7 : Intégrer dans amadeusService

Modifiez `backend/src/services/amadeusService.js` :

```javascript
import { getCached, setCached } from './cacheService.js';
import crypto from 'crypto';

// Fonction helper pour générer des clés de cache
function generateCacheKey(prefix, params) {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(params))
    .digest('hex');
  return `${prefix}:${hash}`;
}

// TTL adaptatif selon le type de recherche
const CACHE_TTL = {
  inspiration: 24 * 3600,  // 24h (données peu changeantes)
  flights: 1 * 3600,       // 1h (prix fluctuent)
  hotels: 4 * 3600,        // 4h (plus stables que vols)
};

export async function searchFlightOffers(destination, slot, originCity) {
  if (!amadeus) {
    console.warn('Amadeus client not initialized');
    return null;
  }

  // Générer clé de cache
  const cacheKey = generateCacheKey('flight', {
    origin: originCity,
    destination: destination.iataCode,
    departureDate: slot.startDate,
    returnDate: slot.endDate,
  });

  // Vérifier le cache
  const cached = await getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // Appel API Amadeus
  try {
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: originCity,
      destinationLocationCode: destination.iataCode,
      departureDate: slot.startDate,
      returnDate: slot.endDate,
      adults: 1,
      currencyCode: 'EUR',
      max: 3,
    });

    if (!response.data || response.data.length === 0) {
      return null;
    }

    const bestOffer = response.data[0];
    const result = {
      price: parseFloat(bestOffer.price.total),
      currency: bestOffer.price.currency,
      segments: bestOffer.itineraries[0].segments.map(seg => ({
        departure: seg.departure.iataCode,
        arrival: seg.arrival.iataCode,
        departureTime: seg.departure.at,
        arrivalTime: seg.arrival.at,
        carrier: seg.carrierCode,
        flightNumber: seg.number,
        duration: seg.duration,
      })),
      totalDuration: bestOffer.itineraries[0].duration,
      validatingAirline: bestOffer.validatingAirlineCodes[0],
    };

    // Mettre en cache (1 heure)
    await setCached(cacheKey, result, CACHE_TTL.flights);

    return result;
  } catch (error) {
    console.error(`Flight search error for ${destination.city}:`, error.message);
    return null;
  }
}

export async function preScreenDestinations(destinations, originCity, userBudget) {
  if (!amadeus) {
    console.warn('Amadeus client not initialized');
    return destinations.slice(0, 5);
  }

  // Cache key pour le pre-screening
  const cacheKey = generateCacheKey('inspiration', {
    origin: originCity,
    maxPrice: Math.floor(userBudget * 0.5),
  });

  // Vérifier le cache
  const cached = await getCached(cacheKey);
  if (cached) {
    console.log('💨 Using cached flight inspiration data');

    // Filtrer les destinations
    const availableDestinations = cached.map(d => d.destination);
    const filtered = destinations.filter(dest =>
      availableDestinations.includes(dest.iataCode)
    );

    return filtered.slice(0, 5);
  }

  // Appel API
  try {
    const response = await amadeus.shopping.flightDestinations.get({
      origin: originCity,
      maxPrice: Math.floor(userBudget * 0.5),
      oneWay: false,
    });

    // Mettre en cache (24 heures)
    await setCached(cacheKey, response.data, CACHE_TTL.inspiration);

    const availableDestinations = response.data.map(d => d.destination);
    const filtered = destinations.filter(dest =>
      availableDestinations.includes(dest.iataCode)
    );

    return filtered.slice(0, 5);
  } catch (error) {
    console.error('Amadeus pre-screening error:', error.message);
    return destinations.slice(0, 5);
  }
}
```

---

## Étape 8 : Ajouter un Endpoint de Stats

Créez `backend/src/routes/cache.js` :

```javascript
// backend/src/routes/cache.js
import express from 'express';
import { getCacheStats, deletePattern } from '../services/cacheService.js';

const router = express.Router();

// Statistiques du cache
router.get('/stats', async (req, res) => {
  try {
    const stats = await getCacheStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Vider le cache (développement seulement)
router.delete('/clear', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Cache clear disabled in production',
    });
  }

  try {
    const deleted = await deletePattern('*');
    res.json({
      success: true,
      deleted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
```

Ajoutez dans `backend/server.js` :

```javascript
import cacheRoutes from './src/routes/cache.js';

app.use('/api/cache', cacheRoutes);
```

---

## 🧪 Test du Cache

### Test 1 : Vérifier la connexion

```bash
cd backend
npm start
```

Vous devriez voir :
```
✅ Redis cache connected
```

### Test 2 : Test manuel

```bash
# Installer redis-cli (macOS)
brew install redis

# Tester la connexion
redis-cli -u "rediss://default:AbCd...@xxx.upstash.io:6379" ping

# Devrait retourner: PONG
```

### Test 3 : Tester dans l'app

1. Faire une recherche de voyage
2. Vérifier les logs backend :
   ```
   ❌ Cache MISS: flight:CDG:BCN:2025-06-15:2025-06-22
   ✅ Cached: flight:CDG:BCN:2025-06-15:2025-06-22 (TTL: 3600s)
   ```

3. Refaire la MÊME recherche :
   ```
   💨 Cache HIT: flight:CDG:BCN:2025-06-15:2025-06-22
   ```

### Test 4 : Stats du cache

```bash
curl http://localhost:3001/api/cache/stats
```

Réponse :
```json
{
  "success": true,
  "stats": {
    "hits": 12,
    "misses": 8,
    "hitRate": "60.00"
  }
}
```

---

## 📊 Monitoring dans Upstash Dashboard

**Dashboard Upstash** → Votre database :

- **Commands/sec** : Commandes par seconde
- **Bandwidth** : Bande passante utilisée
- **Storage** : Espace utilisé
- **Hit Rate** : Taux de succès du cache

### Graphiques utiles
- Commands over time
- Bandwidth usage
- Storage usage

---

## 💰 Limites du Tier Gratuit

| Métrique | Limite Gratuite |
|----------|-----------------|
| **Commands** | 10,000/jour |
| **Storage** | 256 MB |
| **Bandwidth** | 200 MB/jour |
| **Connections** | 100 simultanées |

**Estimation pour Travel AI** :
- 1 recherche = ~30 commands (sans cache)
- 1 recherche = ~5 commands (avec cache)
- **Capacité** : ~2,000 recherches/jour (avec cache)

---

## 🚀 Optimisations Avancées

### 1. Cache Warming

Pré-remplir le cache avec des destinations populaires :

```javascript
// backend/src/scripts/warmCache.js
import { preScreenDestinations } from '../services/amadeusService.js';

const popularOrigins = ['CDG', 'LHR', 'JFK', 'SFO'];
const budget = 1000;

for (const origin of popularOrigins) {
  await preScreenDestinations([], origin, budget);
  console.log(`Warmed cache for ${origin}`);
}
```

### 2. Cache Invalidation

Invalider le cache quand les prix changent trop :

```javascript
export async function invalidateOldFlights() {
  // Supprimer les vols de plus de 1 heure
  await deletePattern('flight:*');
  console.log('Invalidated old flight cache');
}
```

### 3. Compression

Compresser les données avant mise en cache :

```javascript
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export async function setCachedCompressed(key, value, ttl) {
  const compressed = await gzip(JSON.stringify(value));
  await redis.set(key, compressed, 'EX', ttl);
}
```

---

## 🆘 Troubleshooting

### Erreur : "Connection timeout"

**Solution** :
- Vérifier que l'URL est correcte
- Vérifier que TLS est activé (`rediss://`)
- Vérifier le firewall

### Erreur : "NOAUTH Authentication required"

**Solution** :
- L'URL doit contenir le mot de passe
- Format : `rediss://default:PASSWORD@host:6379`

### Cache ne fonctionne pas

**Debug** :
```javascript
// Activer les logs Redis
const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  enableReadyCheck: true,
  showFriendlyErrorStack: true,
});

redis.on('connect', () => console.log('Connected'));
redis.on('ready', () => console.log('Ready'));
redis.on('error', (err) => console.error('Error:', err));
```

### Upstash Dashboard ne montre pas de données

- Attendre quelques minutes (lag de monitoring)
- Vérifier que les commandes sont exécutées
- Vérifier les logs backend

---

## 📚 Documentation

- **Upstash Docs** : https://upstash.com/docs/redis
- **ioredis** : https://github.com/luin/ioredis
- **Redis Commands** : https://redis.io/commands

---

**Prêt à économiser 66% sur vos coûts API !** 🚀💰
