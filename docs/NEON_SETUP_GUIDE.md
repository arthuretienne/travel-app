# 🐘 Guide Configuration Neon PostgreSQL

## Pourquoi Neon ?

- ✅ **Serverless PostgreSQL** moderne
- ✅ **0.5 GB gratuit** (suffisant pour MVP)
- ✅ **Auto-suspend** quand inactif (économie)
- ✅ **Branching** : DB par feature (comme Git !)
- ✅ **Compatible Prisma** out-of-the-box

---

## Étape 1 : Créer un Compte Neon

1. **Aller sur** : https://neon.tech
2. **Sign up** avec GitHub (recommandé) ou Email
3. **Confirmer** votre email si nécessaire

## Étape 2 : Créer un Projet

1. **Cliquer** sur "Create a project"
2. **Configuration** :
   - **Project name** : `travel-ai-db`
   - **Region** :
     - 🇪🇺 Europe (Paris ou Frankfurt) - Recommandé si users en Europe
     - 🇺🇸 US East (Ohio) - Si users aux US
   - **PostgreSQL version** : 16 (par défaut)
   - **Compute size** : Shared (gratuit)

3. **Cliquer** sur "Create Project"

## Étape 3 : Récupérer la Connection String

Après création, Neon affiche automatiquement votre **connection string**.

### 📋 Deux types de connexion

1. **Direct Connection** (pour migrations Prisma)
   ```
   postgres://username:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

2. **Pooled Connection** (pour l'application - recommandé)
   ```
   postgres://username:password@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

⚠️ **Important** : Utilisez la **Pooled Connection** pour votre app !

### 📸 Où trouver la connection string

1. **Dashboard Neon** → Votre projet
2. **Connection Details** (en haut à droite)
3. **Connection string** → Copier

Ou aller dans **Settings** → **Connection String**

## Étape 4 : Ajouter dans `.env`

```env
# ==================================
# 🐘 NEON DATABASE ✅ CONFIGURÉ
# ==================================
DATABASE_URL=postgresql://username:password@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

⚠️ **Remplacez** par votre vraie connection string !

## Étape 5 : Installer Prisma (si pas déjà fait)

```bash
cd backend
npm install prisma @prisma/client
npm install -D prisma
```

## Étape 6 : Initialiser Prisma

```bash
cd backend
npx prisma init
```

Cela crée :
- `prisma/schema.prisma` - Schéma de votre base de données
- `.env` avec DATABASE_URL (vous l'avez déjà configuré !)

## Étape 7 : Créer le Schéma Prisma

Créez le fichier `backend/prisma/schema.prisma` :

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ========================================
// USER & AUTH
// ========================================

model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique // Clerk user ID
  email     String   @unique
  firstName String?
  lastName  String?
  imageUrl  String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  searches  Search[]
  savedTrips SavedTrip[]
  preferences UserPreferences?
}

model UserPreferences {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Preferences sauvegardées
  budget            Int?
  style             String? // backpacker, confort, aventure, luxe
  preferredMonths   String[] // jan, feb, etc.
  activities        String[] // culture, nature, food, etc.

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ========================================
// SEARCHES & RECOMMENDATIONS
// ========================================

model Search {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Search parameters (stockés en JSON pour flexibilité)
  searchParams Json

  // Metadata
  createdAt DateTime @default(now())

  // Relations
  recommendations Recommendation[]
}

model Recommendation {
  id       String @id @default(cuid())
  searchId String
  search   Search @relation(fields: [searchId], references: [id], onDelete: Cascade)

  // Destination
  city        String
  country     String
  iataCode    String

  // Dates
  startDate   DateTime
  endDate     DateTime
  duration    Int

  // Pricing
  flightPrice Float
  hotelPrice  Float
  totalPrice  Float
  currency    String @default("EUR")

  // Scoring
  score       Float
  matchReason String
  seasonReason String

  // Data complète (JSON pour flexibilité)
  fullData    Json

  createdAt   DateTime @default(now())
}

// ========================================
// SAVED TRIPS
// ========================================

model SavedTrip {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Trip details
  city        String
  country     String
  startDate   DateTime
  endDate     DateTime

  // Status
  status      String @default("wishlist") // wishlist, planned, booked, completed

  // Notes
  notes       String?

  // Data complète
  tripData    Json

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Étape 8 : Pousser le Schéma vers Neon

```bash
cd backend
npx prisma db push
```

✅ **Success** : Vous devriez voir :
```
🚀  Your database is now in sync with your Prisma schema.
```

## Étape 9 : Générer Prisma Client

```bash
npx prisma generate
```

Cela génère le client TypeScript/JavaScript pour interagir avec votre DB.

## Étape 10 : Tester la Connexion

```bash
npx prisma studio
```

Cela ouvre **Prisma Studio** dans votre navigateur → Interface graphique pour voir/éditer vos données !

Si ça s'ouvre sur http://localhost:5555, **c'est bon !** ✅

---

## 🔧 Utilisation dans le Code

### Créer un client Prisma

Créez `backend/src/db/prisma.js` :

```javascript
// backend/src/db/prisma.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### Utiliser dans vos routes

```javascript
// backend/src/routes/user.js
import { prisma } from '../db/prisma.js';

// Créer un user
router.post('/users', async (req, res) => {
  const user = await prisma.user.create({
    data: {
      clerkId: req.body.clerkId,
      email: req.body.email,
      firstName: req.body.firstName,
    },
  });
  res.json(user);
});

// Sauvegarder une recherche
router.post('/searches', async (req, res) => {
  const search = await prisma.search.create({
    data: {
      userId: req.user.id,
      searchParams: req.body.params,
      recommendations: {
        create: req.body.recommendations.map(rec => ({
          city: rec.city,
          country: rec.country,
          // ... autres champs
        })),
      },
    },
    include: {
      recommendations: true,
    },
  });
  res.json(search);
});

// Récupérer l'historique
router.get('/searches/history', async (req, res) => {
  const searches = await prisma.search.findMany({
    where: { userId: req.user.id },
    include: {
      recommendations: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  res.json(searches);
});
```

---

## 📊 Limites du Tier Gratuit

| Feature | Limite Gratuite |
|---------|-----------------|
| **Storage** | 0.5 GB |
| **Compute hours** | 100 heures/mois |
| **Connections** | 20 simultanées |
| **Branching** | 10 branches |
| **Projects** | Illimité |

**Estimation** : 0.5 GB = ~5,000 users avec profils + 50,000 recherches

---

## 🔄 Migrations Prisma

### Créer une migration

```bash
npx prisma migrate dev --name add_user_preferences
```

### Appliquer en production

```bash
npx prisma migrate deploy
```

### Reset la DB (⚠️ Développement seulement)

```bash
npx prisma migrate reset
```

---

## 🌿 Branching (Feature Unique Neon !)

Créez une copie de votre DB pour tester :

```bash
# Dans Neon Dashboard
1. Aller dans "Branches"
2. Cliquer "Create Branch"
3. Name: "feature-payment"
4. From: "main"
```

Vous obtenez une nouvelle connection string pour cette branch !

Parfait pour :
- Tester des migrations risquées
- Développer une nouvelle feature sans casser la prod
- Tests end-to-end

---

## 🆘 Troubleshooting

### Erreur : "Can't reach database server"

**Causes possibles** :
1. Connection string incorrecte
2. Neon project suspendu (inactif depuis longtemps)
3. Problème réseau/firewall

**Solution** :
```bash
# Vérifier la connection string
echo $DATABASE_URL

# Tester la connexion
npx prisma db push

# Si erreur "SSL required"
# Assurez-vous que l'URL contient ?sslmode=require
```

### Erreur : "Schema validation failed"

**Solution** :
```bash
# Formater le schema
npx prisma format

# Valider
npx prisma validate
```

### Base de données corrompue

**Solution (développement)** :
```bash
# Reset complet
npx prisma migrate reset

# Re-push
npx prisma db push
```

### Prisma Studio ne s'ouvre pas

**Solution** :
```bash
# Vérifier que le port 5555 est libre
lsof -ti:5555 | xargs kill -9

# Relancer
npx prisma studio
```

---

## 📚 Commandes Prisma Utiles

```bash
# Formater schema.prisma
npx prisma format

# Valider le schéma
npx prisma validate

# Générer le client
npx prisma generate

# Pousser le schéma (développement)
npx prisma db push

# Créer une migration
npx prisma migrate dev --name nom_migration

# Voir les données (GUI)
npx prisma studio

# Seed la DB
npx prisma db seed
```

---

## 📖 Documentation Officielle

- **Neon Docs** : https://neon.tech/docs
- **Prisma Docs** : https://www.prisma.io/docs
- **Prisma + Neon** : https://neon.tech/docs/guides/prisma

---

**Prêt ?** Une fois configuré, passez à l'étape suivante ! 🚀
