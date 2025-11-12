# 🔧 Corrections pour le déploiement Railway + Vercel

## ❌ Problèmes identifiés

### 1. **Port dans Railway**
- ❌ Vous avez configuré "Target port" à 3001
- ✅ Railway assigne automatiquement un port via `process.env.PORT`
- **Solution** : Ne pas forcer le port, laissez Railway le gérer automatiquement

### 2. **ALLOWED_ORIGINS dans Railway**
- ❌ Probablement mal configuré ou manquant l'URL Vercel
- ✅ Doit contenir l'URL complète de votre frontend Vercel
- **Solution** : Ajouter l'URL Vercel dans ALLOWED_ORIGINS

### 3. **VITE_API_URL dans Railway**
- ❌ Cette variable n'a pas de sens dans Railway (backend)
- ✅ Elle doit seulement être dans Vercel (frontend)
- **Solution** : Supprimer VITE_API_URL de Railway

### 4. **API_URL dans Vercel**
- ❌ Le frontend utilise `VITE_API_URL`, pas `API_URL`
- ✅ Supprimer `API_URL` de Vercel, garder seulement `VITE_API_URL`

### 5. **Healthcheck Path dans Railway**
- ⚠️ Pas configuré dans l'interface Railway
- ✅ Le fichier `railway.json` le définit déjà à `/api/health`

## ✅ Actions à faire

### Dans Railway :

1. **Supprimer la configuration "Target port"** :
   - Allez dans Settings → Networking
   - Supprimez ou laissez vide le champ "Custom port"
   - Railway assignera automatiquement un port

2. **Corriger ALLOWED_ORIGINS** :
   - Variable : `ALLOWED_ORIGINS`
   - Valeur : `https://votre-app.vercel.app` (remplacez par votre URL Vercel réelle)
   - Si vous avez plusieurs URLs, séparez par des virgules : `https://app1.vercel.app,https://app2.vercel.app`

3. **Supprimer VITE_API_URL de Railway** :
   - Cette variable ne doit pas être dans Railway (backend)
   - Elle est uniquement pour le frontend (Vercel)

4. **Configurer Healthcheck Path** :
   - Allez dans Settings → Deploy
   - Ajoutez dans "Healthcheck Path" : `/api/health`

### Dans Vercel :

1. **Vérifier VITE_API_URL** :
   - Variable : `VITE_API_URL`
   - Valeur : `https://travel-app-production-9b66.up.railway.app` (votre URL Railway)
   - ⚠️ Important : Pas de `/api` à la fin, juste l'URL de base

2. **Supprimer API_URL** :
   - Le frontend n'utilise pas cette variable
   - Supprimez-la de Vercel

## 📋 Checklist finale

### Variables Railway (Backend) :
- ✅ `ALLOWED_ORIGINS` = `https://votre-app.vercel.app`
- ✅ `AMADEUS_CLIENT_ID` = votre clé
- ✅ `AMADEUS_CLIENT_SECRET` = votre secret
- ✅ `ANTHROPIC_API_KEY` = votre clé
- ✅ `BOOKING_AFFILIATE_ID` = votre ID
- ✅ `SKYSCANNER_AFFILIATE_ID` = votre ID
- ✅ `NODE_ENV` = `production`
- ✅ `RAILWAY_STATIC_URL` = (optionnel, Railway le définit automatiquement)
- ❌ `VITE_API_URL` = **SUPPRIMER** (pas pour le backend)

### Variables Vercel (Frontend) :
- ✅ `VITE_API_URL` = `https://travel-app-production-9b66.up.railway.app`
- ❌ `API_URL` = **SUPPRIMER** (non utilisé)

## 🧪 Test

Après les corrections :

1. **Test Railway** :
   ```bash
   curl https://travel-app-production-9b66.up.railway.app/api/health
   ```
   Devrait retourner : `{"status":"ok","message":"Travel AI API is running",...}`

2. **Test CORS** :
   - Ouvrez la console du navigateur sur votre site Vercel
   - Faites une requête vers l'API
   - Vérifiez qu'il n'y a pas d'erreur CORS

3. **Test complet** :
   - Utilisez votre application Vercel
   - Vérifiez que les requêtes vers l'API fonctionnent

