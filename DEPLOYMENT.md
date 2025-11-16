# Travel AI MVP - Guide de Déploiement

Ce guide explique comment déployer l'application Travel AI sur GitHub, Vercel (frontend) et Railway (backend).

## Prérequis

- Compte GitHub
- Compte Vercel
- Compte Railway
- Tous les clés API nécessaires (Clerk, Claude, Amadeus, etc.)

## 1. Préparation - GitHub

### 1.1 Créer un nouveau repository GitHub

```bash
cd /Users/arthur/Documents/travel-ai-mvp
git init
git add .
git commit -m "Initial commit: Travel AI MVP"
```

### 1.2 Créer le repository sur GitHub.com

1. Aller sur https://github.com/new
2. Nommer le repository (ex: `travel-ai-mvp`)
3. Ne pas initialiser avec README, .gitignore ou license
4. Créer le repository

### 1.3 Pousser le code vers GitHub

```bash
git remote add origin https://github.com/VOTRE_USERNAME/travel-ai-mvp.git
git branch -M main
git push -u origin main
```

## 2. Déploiement Backend - Railway

### 2.1 Créer un nouveau projet Railway

1. Aller sur https://railway.app
2. Cliquer sur "New Project"
3. Choisir "Deploy from GitHub repo"
4. Sélectionner votre repository `travel-ai-mvp`
5. Railway détectera automatiquement le backend Node.js

### 2.2 Configurer le service backend

1. Dans Railway, cliquer sur le service créé
2. Aller dans "Settings" → "Root Directory"
3. Définir: `backend`

### 2.3 Configurer les variables d'environnement

Dans Railway → Variables, ajouter:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Clerk
CLERK_SECRET_KEY=your_clerk_secret_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Amadeus
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# Unsplash
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Affiliates (Optionnel)
SKYSCANNER_AFFILIATE_ID=your_skyscanner_id
BOOKING_AFFILIATE_ID=your_booking_id

# Configuration
PORT=3001
NODE_ENV=production
```

### 2.4 Migrer la base de données

Railway va automatiquement exécuter les migrations Prisma au déploiement grâce au script de build.

### 2.5 Noter l'URL du backend

Une fois déployé, Railway fournira une URL comme:
`https://your-app.railway.app`

Notez cette URL pour la configuration Vercel.

## 3. Déploiement Frontend - Vercel

### 3.1 Créer un nouveau projet Vercel

1. Aller sur https://vercel.com
2. Cliquer sur "Add New" → "Project"
3. Importer votre repository GitHub `travel-ai-mvp`

### 3.2 Configurer le projet

**Framework Preset**: Vite
**Root Directory**: `frontend`
**Build Command**: `npm run build`
**Output Directory**: `dist`

### 3.3 Configurer les variables d'environnement

Dans Vercel → Settings → Environment Variables:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=https://your-backend.railway.app
```

### 3.4 Déployer

Cliquer sur "Deploy" - Vercel va automatiquement:
1. Installer les dépendances
2. Builder l'application
3. Déployer sur le CDN

## 4. Configuration Clerk

### 4.1 Configurer les clés de production

**IMPORTANT**: En production, vous DEVEZ utiliser les clés de production Clerk, pas les clés de développement.

1. Aller sur https://dashboard.clerk.com
2. Sélectionner votre application
3. Aller dans "API Keys"
4. Basculer en mode **"Production"** (en haut à droite)
5. Copier les clés de production:
   - **Publishable Key** (commence par `pk_live_`)
   - **Secret Key** (commence par `sk_live_`)

6. **Mettre à jour les variables d'environnement**:
   - **Vercel**: Ajouter `VITE_CLERK_PUBLISHABLE_KEY` avec la clé `pk_live_...`
   - **Railway**: Ajouter `CLERK_SECRET_KEY` avec la clé `sk_live_...`

**Note**: Si vous voyez "Clerk has been loaded with development keys" dans la console en production, c'est que vous utilisez encore les clés de développement (`pk_test_...`).

### 4.2 Ajouter les URLs autorisées dans Clerk

1. Dans Clerk Dashboard (en mode Production)
2. Aller dans "Settings" → "Allowed origins"
3. Ajouter:
   - URL Vercel: `https://your-app.vercel.app`
   - URL Railway: `https://your-backend.railway.app`

### 4.3 Configurer les webhooks

1. Dans Clerk Dashboard → Webhooks
2. Créer un nouveau webhook
3. URL: `https://your-backend.railway.app/api/users/sync`
4. Événements à sélectionner:
   - `user.created`
   - `user.updated`
   - `user.deleted`

## 5. Configuration CORS

Le backend est déjà configuré pour accepter les requêtes CORS. Après déploiement, vous pouvez mettre à jour `backend/server.js` pour inclure votre URL Vercel:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://your-app.vercel.app'  // Ajouter votre URL Vercel
  ],
  credentials: true
}));
```

Puis commit et push les changements.

## 6. Vérification du Déploiement

### 6.1 Tester l'API

```bash
curl https://your-backend.railway.app/api/health
```

Devrait retourner:
```json
{
  "status": "ok",
  "message": "Travel AI API is running",
  "database": "connected"
}
```

### 6.2 Tester l'application frontend

1. Ouvrir `https://your-app.vercel.app`
2. Tester l'inscription/connexion
3. Compléter l'onboarding
4. Créer un voyage test

## 7. Déploiement Continu

Une fois configuré:
- Chaque push vers la branche `main` déclenchera automatiquement un nouveau déploiement sur Vercel et Railway
- Les migrations de base de données s'exécuteront automatiquement

## 8. Surveillance et Logs

### Railway
- Logs: Railway Dashboard → Service → Logs
- Métriques: Railway Dashboard → Service → Metrics

### Vercel
- Logs de déploiement: Vercel Dashboard → Deployments
- Analytics: Vercel Dashboard → Analytics

## 9. Résolution de Problèmes

### Frontend ne se connecte pas au backend
- Vérifier que `VITE_API_URL` pointe vers la bonne URL Railway
- Vérifier les règles CORS dans `backend/server.js`
- Vérifier les logs Railway pour les erreurs

### Erreurs d'authentification
- Vérifier les clés Clerk (publishable vs secret)
- Vérifier que les URLs sont ajoutées dans Clerk Dashboard
- Vérifier que les webhooks sont configurés

### Erreurs de base de données
- Vérifier que `DATABASE_URL` est correctement configurée
- Vérifier que les migrations Prisma ont réussi dans les logs Railway
- Exécuter manuellement: `npx prisma migrate deploy`

### Variables d'environnement manquantes
- Vérifier les logs Railway/Vercel au démarrage
- Le backend affiche quelles clés API sont manquantes au démarrage

## 10. Coûts Estimés

### Plan Gratuit (Développement)
- **Vercel**: Gratuit pour projets personnels
- **Railway**: $5/mois de crédit gratuit
- **Neon PostgreSQL**: Plan gratuit disponible
- **Upstash Redis**: Plan gratuit disponible
- **Clerk**: 10,000 utilisateurs actifs gratuits

### Production
Prévoir:
- Railway: ~$5-20/mois selon l'usage
- Vercel Pro: $20/mois si besoin de plus de fonctionnalités
- Neon: Gratuit jusqu'à 3GB, puis ~$20/mois
- Claude API: Pay-as-you-go selon usage
- Amadeus API: Vérifier leur pricing

## Support

Pour toute question ou problème:
1. Vérifier les logs Railway et Vercel
2. Vérifier ce guide
3. Consulter la documentation officielle de chaque service
