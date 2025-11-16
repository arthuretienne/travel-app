# 🆓 Guide Setup Gratuit - Travel AI

> Tous les services listés ici ont un **tier gratuit généreux** parfait pour un MVP

---

## 📋 Checklist Services Gratuits

- [ ] Clerk (Auth) - 10k users gratuits
- [ ] Neon (PostgreSQL) - 0.5GB gratuit
- [ ] Upstash (Redis) - 10k commandes/jour gratuit
- [ ] Figma (Design) - Gratuit
- [ ] Amadeus (API Vols/Hôtels) - Environment TEST gratuit
- [ ] Anthropic Claude - 5$ de crédits gratuits au départ
- [ ] Vercel (Hosting Frontend) - Gratuit
- [ ] Railway (Hosting Backend) - 5$ de crédits/mois gratuits

**Total : 0€/mois pour commencer** 🎉

---

## 🔑 1. Clerk (Authentication)

**Pourquoi Clerk ?**
- ✅ 10,000 utilisateurs gratuits (MAU)
- ✅ UI pré-faite (sign-in, sign-up, profil)
- ✅ Google, Email, Facebook, Apple inclus
- ✅ Composants React clé en main
- ✅ Webhooks pour sync avec votre DB

### Setup (5 min)

1. **Créez un compte** : https://clerk.com
2. **Créez une application** : "Create Application"
   - Nom : `Travel AI`
   - Providers : Cochez `Email` + `Google`
3. **Récupérez vos clés** :
   - Dashboard → API Keys
   - Copiez `Publishable Key` et `Secret Key`

### Dans votre `.env`

```env
# CLERK AUTH (Gratuit jusqu'à 10k MAU)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Installation

```bash
npm install @clerk/clerk-react @clerk/clerk-sdk-node
```

### Configuration Frontend (`apps/web/src/main.tsx`)

```tsx
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

root.render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <App />
  </ClerkProvider>
);
```

### Composants d'auth prêts à l'emploi

```tsx
import { SignIn, SignUp, UserButton } from '@clerk/clerk-react';

// Page de connexion
<SignIn routing="path" path="/sign-in" />

// Bouton profil utilisateur (avatar + menu)
<UserButton afterSignOutUrl="/" />
```

**Avantage** : Vous n'avez PAS à coder l'UI d'authentification !

---

## 🐘 2. Neon PostgreSQL (Database)

**Pourquoi Neon ?**
- ✅ 0.5 GB gratuit (suffisant pour MVP)
- ✅ Compatible Prisma
- ✅ Serverless (auto-suspend quand inactif)
- ✅ Branching (DB par feature)

### Setup (3 min)

1. **Créez un compte** : https://neon.tech
2. **Créez un projet** :
   - Project name : `travel-ai-db`
   - Region : Europe (Paris ou Frankfurt)
3. **Copiez la connection string** :
   - Dashboard → Connection Details
   - Pooled connection (pour Prisma)

### Dans votre `.env`

```env
# NEON POSTGRESQL (Gratuit 0.5GB)
DATABASE_URL=postgresql://user:password@ep-cool-darkness-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### Test de connexion

```bash
cd backend
npx prisma db push
npx prisma studio
```

Si ça ouvre Prisma Studio, c'est bon ! ✅

---

## 🔴 3. Upstash Redis (Cache)

**Pourquoi Upstash ?**
- ✅ 10,000 commandes/jour gratuit
- ✅ Serverless (pay-per-request)
- ✅ Compatible Redis standard

### Setup (2 min)

1. **Créez un compte** : https://console.upstash.com
2. **Créez une database Redis** :
   - Name : `travel-ai-cache`
   - Type : Regional
   - Region : Europe
3. **Copiez l'URL** :
   - Details → REST URL ou Redis URL

### Dans votre `.env`

```env
# UPSTASH REDIS (Gratuit 10k cmd/jour)
REDIS_URL=rediss://default:AbCdEfGh123@grateful-lemur-12345.upstash.io:6379
```

### Test

```bash
# Dans votre terminal
redis-cli -u "rediss://default:AbCdEfGh123@grateful-lemur-12345.upstash.io:6379" ping
# Devrait retourner: PONG
```

---

## 🎨 4. Figma (Design)

### Setup (2 min)

1. **Ouvrez votre Figma** : https://www.figma.com/design/8Xn27RsBzEEZkgrqbM6hZL/Plan-your-trip
2. **Générez un token** :
   - Settings → Account → Personal Access Tokens
   - "Generate new token"
   - Name : `Travel AI MCP`
   - Copiez le token (vous ne le reverrez plus !)

### Dans votre `.env`

```env
# FIGMA (Gratuit)
FIGMA_ACCESS_TOKEN=figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## ✈️ 5. Amadeus API (Vols & Hôtels)

**Environnement TEST = Gratuit illimité** 🎉

### Setup (5 min)

1. **Créez un compte** : https://developers.amadeus.com/register
2. **Créez une app** :
   - My Apps → Create New App
   - App Name : `Travel AI`
   - Select APIs :
     - ✅ Flight Offers Search
     - ✅ Flight Inspiration Search
     - ✅ Hotel Search
3. **Récupérez vos clés** :
   - App Details → API Key & Secret
   - **IMPORTANT** : Utilisez les clés de l'environnement **TEST**

### Dans votre `.env`

```env
# AMADEUS API (TEST = Gratuit)
AMADEUS_API_KEY=your_test_api_key_here
AMADEUS_API_SECRET=your_test_api_secret_here
AMADEUS_ENVIRONMENT=test
```

### Test

```bash
# Test avec curl
curl -X POST "https://test.api.amadeus.com/v1/security/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_KEY&client_secret=YOUR_SECRET"
```

Si vous obtenez un `access_token`, c'est bon ! ✅

---

## 🤖 6. Anthropic Claude API

### Setup (3 min)

1. **Créez un compte** : https://console.anthropic.com
2. **Obtenez 5$ de crédits gratuits** (offre de départ)
3. **Créez une API Key** :
   - Settings → API Keys
   - "Create Key"

### Dans votre `.env`

```env
# ANTHROPIC CLAUDE (5$ gratuits au départ)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxx
```

**Note** : 5$ = environ 100 recommandations avec votre prompt actuel

---

## 📧 7. Email (Optionnel - Resend Gratuit)

Si vous voulez envoyer des emails (vérification, notifications) :

### Setup Resend (2 min)

1. **Créez un compte** : https://resend.com
2. **Gratuit** : 3,000 emails/mois, 100 emails/jour
3. **API Key** : Settings → API Keys

### Dans votre `.env`

```env
# RESEND (Gratuit 3k emails/mois)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@votredomaine.com
```

---

## 🎯 8. Variables d'Environnement Locales

Pour le développement local :

### Dans votre `.env`

```env
# ==================================
# ENVIRONNEMENT LOCAL
# ==================================
NODE_ENV=development
PORT=3001
VITE_API_URL=http://localhost:3001/api

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
CORS_CREDENTIALS=true

# JWT (générez des secrets aléatoires)
JWT_SECRET=votre_secret_jwt_ultra_long_et_securise_123456789
REFRESH_TOKEN_SECRET=votre_secret_refresh_token_different_987654321

# Feature Flags (activez progressivement)
FEATURE_CALENDAR_SYNC=false
FEATURE_CHAT_REALTIME=false
FEATURE_PRICE_ALERTS=false
FEATURE_PREMIUM=false
```

### Générer des secrets JWT sécurisés

```bash
# Dans votre terminal
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Utilisez le résultat pour `JWT_SECRET` et `REFRESH_TOKEN_SECRET`

---

## 📝 Votre `.env` Final (Version MVP Gratuite)

Copiez ce template dans votre `.env` :

```env
# ==================================
# TRAVEL AI - MVP GRATUIT
# ==================================

# CLERK AUTH (https://clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# NEON DATABASE (https://neon.tech)
DATABASE_URL=postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require

# UPSTASH REDIS (https://console.upstash.com)
REDIS_URL=rediss://default:xxxxx@xxx.upstash.io:6379

# FIGMA (https://figma.com/developers/api)
FIGMA_ACCESS_TOKEN=figd_xxxxx

# AMADEUS TEST (https://developers.amadeus.com)
AMADEUS_API_KEY=your_test_key
AMADEUS_API_SECRET=your_test_secret
AMADEUS_ENVIRONMENT=test

# ANTHROPIC CLAUDE (https://console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# RESEND EMAIL - Optionnel (https://resend.com)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@votredomaine.com

# SERVER CONFIG
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001

# JWT SECRETS (générez avec: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=CHANGEZ_MOI_AVEC_VALEUR_ALEATOIRE_LONGUE
REFRESH_TOKEN_SECRET=CHANGEZ_MOI_AUSSI_AVEC_AUTRE_VALEUR

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
CORS_CREDENTIALS=true

# LOGS
LOG_LEVEL=debug
LOG_FORMAT=simple

# FEATURE FLAGS
FEATURE_CALENDAR_SYNC=false
FEATURE_CHAT_REALTIME=false
FEATURE_PRICE_ALERTS=false
FEATURE_PREMIUM=false
```

---

## ✅ Checklist de Vérification

Après avoir rempli votre `.env`, vérifiez :

### Backend
```bash
cd backend

# 1. Test connexion DB
npx prisma db push

# 2. Ouvre Prisma Studio (devrait se connecter)
npx prisma studio

# 3. Test Redis (devrait retourner PONG)
node -e "const Redis = require('ioredis'); const redis = new Redis(process.env.REDIS_URL); redis.ping().then(console.log);"
```

### MCPs
```bash
# Build les MCPs
cd mcp/figma-to-code && npm install && npm run build
cd ../amadeus-optimizer && npm install && npm run build
```

### Frontend
```bash
cd apps/web
npm run dev
# Devrait démarrer sur http://localhost:5173
```

---

## 💰 Coûts Estimés

| Service | Tier Gratuit | Limite MVP |
|---------|--------------|------------|
| Clerk | 10k MAU | Suffisant jusqu'à lancement |
| Neon | 0.5GB | ~5k users avec profils |
| Upstash | 10k cmd/jour | ~100 recherches/jour (avec cache) |
| Amadeus TEST | Illimité | Parfait pour développement |
| Claude API | 5$ gratuits | ~100 recommandations |
| Vercel | Illimité | Parfait |
| Railway | 5$/mois gratuit | Suffisant pour backend |

**Total : 0€/mois** pour commencer 🎉

---

## 🚀 Prochaines Étapes

1. ✅ Remplissez votre `.env` avec les clés obtenues
2. ✅ Testez la connexion DB : `npx prisma db push`
3. ✅ Build les MCPs
4. ✅ Lancez le dev : `npm run dev`
5. ✅ Testez l'auth Clerk dans le frontend
6. ✅ Générez vos premiers composants depuis Figma

---

## ⚠️ Passage en Production

Quand vous aurez des vrais users, vous devrez :

1. **Amadeus** : Passer en environnement PRODUCTION (payant)
2. **Claude API** : Recharger des crédits (~20$/100k tokens)
3. **Neon** : Possiblement upgrade si >0.5GB
4. **Clerk** : Gratuit jusqu'à 10k MAU

**Coût production estimé** (100 users actifs/mois) :
- Amadeus : ~50€/mois
- Claude : ~20€/mois
- Infrastructure : ~10€/mois
- **Total : ~80€/mois**

---

## 🆘 Besoin d'Aide ?

**Problème de connexion DB** :
```bash
# Vérifiez que l'URL est correcte
echo $DATABASE_URL

# Test direct
psql "postgresql://user:pass@host/db?sslmode=require"
```

**Clerk ne fonctionne pas** :
- Vérifiez que les clés commencent par `pk_test_` et `sk_test_`
- Assurez-vous que l'URL de callback est configurée dans Clerk Dashboard

**Redis timeout** :
- Vérifiez que l'URL commence par `rediss://` (avec double 's')
- Testez avec `redis-cli -u "votre_url" ping`

---

✨ **Vous êtes prêt à développer sans aucun coût !**
