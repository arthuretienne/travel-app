# 🚀 Migration Railway → Render.com

**Temps estimé:** 10 minutes
**Coût:** $0 (750h gratuites/mois)
**Downtime:** 0 (garde Railway actif pendant la migration)

---

## 📋 Checklist de Migration

### Étape 1: Créer un Compte Render (2 min)

1. Va sur [render.com](https://render.com)
2. Sign up avec GitHub
3. Autorise l'accès à ton repo `travel-app`

---

### Étape 2: Créer la Base de Données PostgreSQL (3 min)

1. Dashboard Render → **New** → **PostgreSQL**
2. Configure:
   - **Name:** `travel-db`
   - **Database:** `traveldb`
   - **User:** `traveluser`
   - **Region:** `Frankfurt` (EU) ou `Oregon` (US)
   - **Plan:** **Free** ✅
3. Clique **Create Database**
4. ⚠️ **IMPORTANT:** Copie l'URL de connexion:
   ```
   Internal Database URL: postgresql://user:pass@host/db
   ```
   (Tu l'utiliseras dans les variables d'environnement)

---

### Étape 3: Créer le Web Service (5 min)

1. Dashboard → **New** → **Web Service**
2. Connecte ton repo GitHub `travel-app`
3. Configure:

```yaml
Name: travel-ai-backend
Region: Frankfurt (same as DB)
Branch: main
Root Directory: backend
Runtime: Node

Build Command: npm install
Start Command: npm start

Plan: Free (512MB RAM, 750h/month)
```

4. **Environment Variables** → Ajoute toutes tes variables Railway:

```bash
# Database
DATABASE_URL=[Colle l'Internal Database URL de l'étape 2]

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Booking.com API
RAPIDAPI_KEY=...

# Clerk Auth
CLERK_SECRET_KEY=sk_live_...

# Google Calendar
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://travel-ai-backend.onrender.com/api/calendar/oauth/callback

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Weather API
WEATHER_API_KEY=...

# Frontend URL (Vercel)
FRONTEND_URL=https://travel-app-ten-rho.vercel.app

# Node env
NODE_ENV=production
PORT=3001
```

5. Clique **Create Web Service**

---

### Étape 4: Attendre le Premier Deploy (2-3 min)

Render va automatiquement:
1. Clone ton repo
2. Run `npm install`
3. Run `npm start`
4. Te donner une URL: `https://travel-ai-backend.onrender.com`

Vérifie les logs pour voir si tout démarre bien.

---

### Étape 5: Tester l'API (1 min)

Visite:
```
https://travel-ai-backend.onrender.com/api/health
```

Tu devrais voir:
```json
{
  "status": "ok",
  "message": "Travel AI API is running",
  "database": "connected",
  "timestamp": "2025-12-03T..."
}
```

---

### Étape 6: Mettre à Jour Vercel Frontend (2 min)

1. Va sur [vercel.com](https://vercel.com)
2. Ton projet `travel-app`
3. **Settings** → **Environment Variables**
4. Modifie `VITE_API_URL`:

```bash
# AVANT (Railway):
VITE_API_URL=https://travel-app-production-xxx.up.railway.app

# APRÈS (Render):
VITE_API_URL=https://travel-ai-backend.onrender.com
```

5. **Save**
6. **Deployments** → **Redeploy** (pour appliquer la nouvelle variable)

---

### Étape 7: Migrer la Base de Données (10 min)

#### Option A: Export/Import Manuel

**Sur Railway (export):**
```bash
# Dans ton terminal local
railway login
railway link  # Sélectionne ton projet
railway run pg_dump $DATABASE_URL > backup.sql
```

**Sur Render (import):**
```bash
# Copie l'External Database URL de Render
psql "postgresql://user:pass@host/db" < backup.sql
```

#### Option B: Prisma Migrate (Plus Simple)

**Sur ton Mac:**
```bash
cd backend

# Pointe vers Render DB
export DATABASE_URL="[Render Internal Database URL]"

# Run migrations
npx prisma migrate deploy

# Optionnel: seed initial data
npx prisma db seed
```

---

### Étape 8: Vérification Complète (5 min)

Teste tous les endpoints:

```bash
# Health check
curl https://travel-ai-backend.onrender.com/api/health

# User endpoint (avec auth)
curl https://travel-ai-backend.onrender.com/api/users/me \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Travel recommendations (test Claude API)
curl -X POST https://travel-ai-backend.onrender.com/api/travel/recommendations \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"budget": 1000, "duration": 7}'
```

✅ Si tout fonctionne → Migration réussie !

---

## ⚠️ Points d'Attention Render

### 1. Cold Start (Sleep après 15min)

Le serveur gratuit "s'endort" après 15min d'inactivité.
**Premier appel après sleep:** ~30 secondes de latence.

**Solutions:**
- ✅ Ajouter un cron job pour ping toutes les 10min (gratuit)
- ✅ Accepter la latence occasionnelle (acceptable pour MVP)
- ✅ Upgrade vers plan payant ($7/mois) pour keep-alive

**Cron job gratuit (UptimeRobot):**
1. [uptimerobot.com](https://uptimerobot.com) (gratuit)
2. Add Monitor → HTTP(s)
3. URL: `https://travel-ai-backend.onrender.com/api/health`
4. Interval: 5 minutes
5. ✅ Ton serveur ne dormira jamais !

### 2. Variables d'Environnement

**Google Redirect URI:**
```bash
# Railway:
GOOGLE_REDIRECT_URI=https://xxx.up.railway.app/api/calendar/oauth/callback

# Render:
GOOGLE_REDIRECT_URI=https://travel-ai-backend.onrender.com/api/calendar/oauth/callback
```

**N'oublie pas de mettre à jour dans Google Cloud Console !**

### 3. Stripe Webhooks

Si tu utilises Stripe webhooks, mets à jour:
```
https://travel-ai-backend.onrender.com/api/billing/webhook
```

Dans le Stripe Dashboard → Webhooks.

---

## 📊 Comparaison

| Feature | Railway (Essai) | Render (Free) |
|---------|----------------|---------------|
| Coût | $5 crédit (10j) | 750h/mois (∞) |
| RAM | 512MB | 512MB |
| Cold Start | ❌ Non | ⚠️ Oui (15min) |
| Database | PostgreSQL ✅ | PostgreSQL ✅ (90j) |
| Auto-deploy | ✅ GitHub | ✅ GitHub |
| Logs | ✅ Illimités | ✅ 7 jours |
| Support | Email | Community |

---

## 🚨 Rollback Plan

Si problème sur Render, reviens à Railway:

1. Vercel: Change `VITE_API_URL` back to Railway
2. Redeploy Vercel
3. Railway continue de tourner (aucun changement)

---

## 💡 Tips

### Astuce 1: Keep-Alive Gratuit
```bash
# Ajoute cette route dans backend/server.js (déjà présente):
app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

# Puis ping avec UptimeRobot toutes les 5min
```

### Astuce 2: Logs en Temps Réel
```bash
# Install Render CLI
npm install -g render

# Login
render login

# Stream logs
render logs travel-ai-backend --tail
```

### Astuce 3: Database Backup
```bash
# Backup automatique dans Render dashboard
Settings → Backups → Enable Daily Backups (Free!)
```

---

## 🎯 Timeline Recommandée

**Aujourd'hui:**
- [ ] Créer compte Render
- [ ] Setup PostgreSQL
- [ ] Deploy backend

**Demain:**
- [ ] Tester tous les endpoints
- [ ] Migrer les données
- [ ] Mettre à jour Vercel

**Dans 2 jours:**
- [ ] Setup UptimeRobot (keep-alive)
- [ ] Vérifier que tout marche 24h

**Railway:**
- [ ] Garder actif jusqu'à ce que Render soit 100% validé
- [ ] Puis supprimer le projet Railway

---

## ✅ Checklist Finale

Avant de supprimer Railway:

- [ ] API Health check fonctionne sur Render
- [ ] Frontend Vercel connecté à Render
- [ ] Claude API appels fonctionnent
- [ ] Booking.com API fonctionne
- [ ] Database queries fonctionnent
- [ ] Auth Clerk fonctionne
- [ ] Google Calendar OAuth fonctionne
- [ ] Stripe webhooks mis à jour (si applicable)
- [ ] UptimeRobot configuré (keep-alive)
- [ ] Testé pendant 48h sans erreur

---

**Prêt à migrer ? Dis-moi et je te guide étape par étape ! 🚀**
