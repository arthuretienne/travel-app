# 🚀 Guide de Configuration Complet - Travel AI

Ce guide vous accompagne étape par étape pour configurer tous les services de Travel AI.

---

## 📋 Checklist Globale

- [x] ✅ **Backend environnement** - Variables chargées correctement
- [x] ✅ **Amadeus API** - Environnement TEST configuré
- [x] ✅ **Claude API** - Génération de destinations
- [x] ✅ **Unsplash API** - Photos de destinations
- [ ] ⏳ **Clerk Auth** - Authentification utilisateur
- [ ] ⏳ **Neon PostgreSQL** - Base de données
- [ ] ⏳ **Upstash Redis** - Cache pour API
- [ ] ⏸️ **Figma MCP** - Génération composants (optionnel)

---

## 🎯 Configuration par Priorité

### Priorité 1 : Essentiels (Aujourd'hui)

1. **[Clerk Auth](CLERK_SETUP_GUIDE.md)** - 10 minutes
2. **[Neon PostgreSQL](NEON_SETUP_GUIDE.md)** - 15 minutes
3. **[Upstash Redis](UPSTASH_SETUP_GUIDE.md)** - 10 minutes

**Temps total** : ~35 minutes

### Priorité 2 : Optionnels (Plus tard)

4. **Figma MCP** - Pour générer des composants depuis Figma
5. **Resend Email** - Pour envoyer des emails
6. **Analytics** - Google Analytics, Posthog, etc.

---

## 1️⃣ Clerk Auth (Authentification)

### Pourquoi ?
- Permet aux utilisateurs de créer un compte
- Sauvegarder leurs recherches
- Historique des voyages

### Steps
1. 📖 Suivez le guide : [CLERK_SETUP_GUIDE.md](CLERK_SETUP_GUIDE.md)
2. ✅ Récupérez vos clés
3. ✅ Ajoutez dans `.env`
4. ✅ Redémarrez le backend

### Après configuration

Vous aurez dans votre `.env` :
```env
# ==================================
# 🔐 CLERK AUTH ✅ CONFIGURÉ
# ==================================
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

**Limites gratuites** : 10,000 utilisateurs actifs/mois

---

## 2️⃣ Neon PostgreSQL (Base de données)

### Pourquoi ?
- Stocker les utilisateurs
- Sauvegarder les recherches
- Historique des recommandations
- Voyages favoris

### Steps
1. 📖 Suivez le guide : [NEON_SETUP_GUIDE.md](NEON_SETUP_GUIDE.md)
2. ✅ Créez un projet Neon
3. ✅ Copiez la connection string
4. ✅ Ajoutez dans `.env`
5. ✅ Initialisez Prisma
6. ✅ Poussez le schéma

### Après configuration

Vous aurez dans votre `.env` :
```env
# ==================================
# 🐘 NEON DATABASE ✅ CONFIGURÉ
# ==================================
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

**Limites gratuites** : 0.5 GB (~5,000 users + 50,000 recherches)

---

## 3️⃣ Upstash Redis (Cache)

### Pourquoi ?
- Cache les résultats Amadeus API
- **Économie de 66%** sur les coûts API
- Réponses plus rapides

### Steps
1. 📖 Créez un compte sur https://console.upstash.com
2. ✅ Créez une database Redis
3. ✅ Sélectionnez région Europe
4. ✅ Copiez l'URL Redis
5. ✅ Ajoutez dans `.env`

### Configuration `.env`

```env
# ==================================
# 🔴 UPSTASH REDIS ✅ CONFIGURÉ
# ==================================
REDIS_URL=rediss://default:xxxxx@grateful-lemur-12345.upstash.io:6379
```

### Implémentation du Cache

Créez `backend/src/services/cacheService.js` :

```javascript
// backend/src/services/cacheService.js
import Redis from 'ioredis';

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

if (redis) {
  console.log('✅ Redis cache initialized');
} else {
  console.warn('⚠️  Redis not configured, caching disabled');
}

export async function getCached(key) {
  if (!redis) return null;

  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCached(key, value, ttlSeconds = 3600) {
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function deleteCached(key) {
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}
```

### Utilisation dans amadeusService

Modifiez `backend/src/services/amadeusService.js` :

```javascript
import { getCached, setCached } from './cacheService.js';

export async function searchFlightOffers(destination, slot, originCity) {
  // Cache key
  const cacheKey = `flight:${originCity}:${destination.iataCode}:${slot.startDate}:${slot.endDate}`;

  // Check cache
  const cached = await getCached(cacheKey);
  if (cached) {
    console.log(`💨 Cache hit for ${destination.city}`);
    return cached;
  }

  // Amadeus API call
  const response = await amadeus.shopping.flightOffersSearch.get({
    // ... params
  });

  const result = {
    price: parseFloat(response.data[0].price.total),
    // ... rest
  };

  // Store in cache (1 hour TTL)
  await setCached(cacheKey, result, 3600);

  return result;
}
```

**Limites gratuites** : 10,000 commandes/jour

---

## 🧪 Tests de Vérification

### Test 1 : Backend démarre correctement

```bash
cd backend
npm start
```

**Output attendu** :
```
📁 Loading .env from: /Users/arthur/Documents/travel-ai-mvp/.env
✅ .env file loaded successfully
🔑 Environment variables:
  - ANTHROPIC_API_KEY: ✅ SET
  - AMADEUS_CLIENT_ID: ✅ SET
  - AMADEUS_CLIENT_SECRET: ✅ SET

✅ Amadeus client initialized successfully
✅ Unsplash client initialized successfully
✅ Redis cache initialized (si configuré)
🚀 Server running on http://localhost:3001
```

### Test 2 : Frontend démarre

```bash
cd frontend
npm run dev
```

Ouvrez http://localhost:5173

### Test 3 : Recherche complète

1. Remplir le formulaire onboarding
2. Soumettre
3. Vérifier les résultats :
   - ✅ Photos des destinations
   - ✅ Prix des vols
   - ✅ Dates optimales
   - ✅ Liens Skyscanner/Booking

### Test 4 : Authentification (après Clerk)

1. Cliquer sur "Sign In"
2. Créer un compte
3. Se connecter
4. Voir le profil utilisateur

### Test 5 : Base de données (après Neon)

```bash
cd backend
npx prisma studio
```

Devrait ouvrir http://localhost:5555 avec vos tables.

### Test 6 : Cache (après Upstash)

Effectuez 2 recherches identiques :
- 1ère recherche : ~10 secondes
- 2ème recherche : ~2 secondes (cache hit 💨)

Vérifiez les logs backend pour `Cache hit`

---

## 📁 Structure Finale `.env`

```env
# ==================================
# TRAVEL AI - Configuration Complète
# ==================================

# ==================================
# 🤖 ANTHROPIC CLAUDE ✅ CONFIGURÉ
# ==================================
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# ==================================
# ✈️ AMADEUS API ✅ CONFIGURÉ
# ==================================
AMADEUS_API_KEY=xxxxx
AMADEUS_API_SECRET=xxxxx
AMADEUS_CLIENT_ID=xxxxx
AMADEUS_CLIENT_SECRET=xxxxx
AMADEUS_ENVIRONMENT=test

# ==================================
# 📸 UNSPLASH API ✅ CONFIGURÉ
# ==================================
UNSPLASH_ACCESS_KEY=xxxxx

# ==================================
# 🔐 CLERK AUTH ✅ CONFIGURÉ
# ==================================
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
# CLERK_WEBHOOK_SECRET=whsec_xxxxx (optionnel)

# ==================================
# 🐘 NEON DATABASE ✅ CONFIGURÉ
# ==================================
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require

# ==================================
# 🔴 UPSTASH REDIS ✅ CONFIGURÉ
# ==================================
REDIS_URL=rediss://default:xxxxx@xxx.upstash.io:6379

# ==================================
# ⚙️ SERVER CONFIG
# ==================================
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173

# ==================================
# 📝 LOGS
# ==================================
LOG_LEVEL=debug
LOG_FORMAT=simple
```

---

## 🎯 Fonctionnalités Débloquées

### Avec Clerk Auth
- ✅ Connexion/Inscription
- ✅ Profil utilisateur
- ✅ Sessions persistantes
- ✅ OAuth (Google, etc.)

### Avec Neon DB
- ✅ Sauvegarde des recherches
- ✅ Historique des recommandations
- ✅ Voyages favoris
- ✅ Préférences utilisateur

### Avec Upstash Redis
- ✅ Cache Amadeus (66% économie)
- ✅ Réponses instantanées
- ✅ Rate limiting
- ✅ Session storage

---

## 💡 Prochaines Étapes Après Configuration

### 1. Intégrer l'authentification dans l'UI

Modifiez `frontend/src/App.jsx` :

```jsx
import { ClerkProvider, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <div className="app">
        <header className="app-header">
          <h1>🌍 Travel AI</h1>
          <SignedOut>
            <a href="/sign-in">Sign In</a>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </header>
        {/* ... rest */}
      </div>
    </ClerkProvider>
  );
}
```

### 2. Sauvegarder les recherches

Ajoutez un bouton "Sauvegarder" dans Results.jsx :

```javascript
const handleSave = async (trip) => {
  const response = await fetch('/api/trips/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getToken()}`,
    },
    body: JSON.stringify(trip),
  });
};
```

### 3. Ajouter une page "Mes Voyages"

Créez `frontend/src/pages/MyTrips.jsx` :

```jsx
function MyTrips() {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    fetch('/api/trips/my-trips', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    .then(res => res.json())
    .then(setTrips);
  }, []);

  return (
    <div>
      <h2>Mes Voyages Sauvegardés</h2>
      {trips.map(trip => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}
```

---

## 🆘 Aide & Support

### Documentation
- [Clerk Setup](CLERK_SETUP_GUIDE.md)
- [Neon Setup](NEON_SETUP_GUIDE.md)
- [Fix Environnement](ENV_FIX_SUMMARY.md)
- [Progress Update](PROGRESS_UPDATE.md)

### Troubleshooting Commun

| Problème | Solution |
|----------|----------|
| Backend ne démarre pas | Vérifier `.env` à la racine |
| "API key missing" | Redémarrer backend après modif .env |
| Clerk erreur 401 | Vérifier VITE_CLERK_PUBLISHABLE_KEY |
| Prisma erreur | `npx prisma generate` puis redémarrer |
| Redis timeout | Vérifier REDIS_URL commence par `rediss://` |

### Commandes Utiles

```bash
# Restart backend
cd backend && npm start

# Restart frontend
cd frontend && npm run dev

# Check .env
grep CLERK .env
grep DATABASE .env
grep REDIS .env

# Prisma studio
cd backend && npx prisma studio

# Test Redis
redis-cli -u "$REDIS_URL" ping
```

---

## ✅ Validation Finale

Une fois tout configuré, vous devriez avoir :

- [x] Backend avec toutes les clés
- [x] Frontend avec Clerk provider
- [x] Database avec schéma Prisma
- [x] Redis cache fonctionnel
- [x] Photos Unsplash
- [x] Authentification utilisateur
- [x] Sauvegarde des recherches

**Félicitations ! Votre MVP est opérationnel !** 🎉

---

## 📊 Coûts Totaux

| Service | Tier Gratuit | Limite |
|---------|--------------|--------|
| Clerk | Gratuit | 10k MAU |
| Neon | Gratuit | 0.5 GB |
| Upstash | Gratuit | 10k cmd/jour |
| Unsplash | Gratuit | 50 req/heure |
| Amadeus TEST | Gratuit | Illimité |
| Claude | 5$ gratuits | ~100 recherches |

**Total : 0€/mois** pour commencer ! 🎉

---

**Prêt à continuer ?** Suivez les guides dans l'ordre de priorité ci-dessus !
