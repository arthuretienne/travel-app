# 🚨 URGENT: Fixes à Faire Maintenant

## Problèmes Actuels

1. ❌ **Clerk en mode développement** → Users ne se créent pas dans la DB
2. ❌ **Frontend appelle localhost** → CORS errors et 404s
3. ❌ **Webhook Clerk manquant** → Nouveaux users pas synchronisés
4. ✅ **Code fixé** → Dernière version pushée sur GitHub

---

## ✅ Étape 1: Configurer Vercel (CRITIQUE)

### 1.1 Variables d'environnement Vercel

1. Va sur **https://vercel.com**
2. Clique sur ton projet **travel-app-ten-rho**
3. Va dans **Settings** → **Environment Variables**
4. Ajoute ces **2 variables** pour **Production** :

```env
VITE_CLERK_PUBLISHABLE_KEY
Valeur: pk_live_XXXXX
```

```env
VITE_API_URL
Valeur: https://travel-app-production-9b66.up.railway.app
```

⚠️ **IMPORTANT**:
- Utilise `pk_live_...` et **PAS** `pk_test_...`
- Pour obtenir `pk_live_...` : Va sur Clerk Dashboard → Passe en mode **Production** (toggle en haut à droite) → API Keys → Copie "Publishable key"

### 1.2 Redéployer Vercel

1. Dans Vercel → **Deployments** (onglet)
2. Clique sur le dernier déploiement (en haut)
3. Bouton **"..."** → **Redeploy**
4. Coche **"Use existing Build Cache"**
5. Clique **Redeploy**

⏱️ Attends 2-3 minutes que le déploiement se termine.

---

## ✅ Étape 2: Configurer Clerk Production

### 2.1 Passer en mode Production

1. Va sur **https://dashboard.clerk.com**
2. En haut à droite, assure-toi d'être en mode **"Production"** (pas "Development")
3. Si c'est écrit "Development", clique dessus et choisis **Production**

### 2.2 Récupérer les clés Production

1. Sidebar gauche → **API Keys**
2. Tu vas voir 2 clés :
   - **Publishable key** : `pk_live_...`
   - **Secret key** : `sk_live_...` (clique sur "Show" pour voir)
3. Copie ces 2 clés quelque part (Notepad)

### 2.3 Ajouter les URLs autorisées

1. Sidebar gauche → **Domains**
2. Section **"Production"** → **Add domain**
3. Ajoute : `https://travel-app-ten-rho.vercel.app`
4. Ajoute aussi : `https://travel-app-production-9b66.up.railway.app`

### 2.4 Configurer le Webhook (CRITIQUE!)

C'est ce qui va créer les users dans ta database PostgreSQL.

1. Sidebar gauche → **Webhooks**
2. Clique **"Add Endpoint"**
3. Remplis :
   - **Endpoint URL** : `https://travel-app-production-9b66.up.railway.app/api/users/sync`
   - **Subscribe to events** : Coche ces 3 :
     - ☑️ `user.created`
     - ☑️ `user.updated`
     - ☑️ `user.deleted`
4. Clique **Create**

---

## ✅ Étape 3: Vérifier Railway

### 3.1 Variables Railway

1. Va sur **https://railway.app**
2. Ouvre ton projet backend
3. Onglet **Variables**
4. Vérifie que tu as au minimum :

```env
CLERK_SECRET_KEY=sk_live_XXXXX  ← Clé PRODUCTION de Clerk
DATABASE_URL=postgresql://...
AMADEUS_CLIENT_ID=...
AMADEUS_CLIENT_SECRET=...
ANTHROPIC_API_KEY=...
NODE_ENV=production
```

⚠️ **IMPORTANT**: `CLERK_SECRET_KEY` doit être `sk_live_...` (PAS `sk_test_...`)

Si tu dois changer `CLERK_SECRET_KEY` :
1. Clique sur la variable
2. Change la valeur pour `sk_live_...` (copiée depuis Clerk Dashboard)
3. Railway va redéployer automatiquement

### 3.2 Variables Optionnelles (Recommandées)

Si tu veux les photos et les hotels qui marchent mieux :

```env
UNSPLASH_ACCESS_KEY=...  ← Pour de vraies photos HD
```

Pour obtenir la clé Unsplash :
1. Va sur https://unsplash.com/developers
2. Crée un compte
3. **Register your application**
4. Copie ton **Access Key**

---

## ✅ Étape 4: Tester que tout marche

### 4.1 Teste la création de compte

1. **En navigation privée**, va sur https://travel-app-ten-rho.vercel.app
2. Clique **Sign Up**
3. Crée un nouveau compte test
4. Complète l'onboarding

**Vérifications** :
- ✅ Pas de message "Clerk has been loaded with development keys" dans la console
- ✅ Pas d'erreurs CORS "localhost:3001"
- ✅ Pas d'erreur "fetchSavedTrips is not defined"
- ✅ L'onboarding se sauvegarde sans erreur

### 4.2 Vérifie que l'user est dans ta DB

1. Va sur **Railway** → Ton projet → **Postgres**
2. Clique **Connect** (ou **psql**)
3. Dans le terminal, tape :

```sql
SELECT email, "firstName", "lastName" FROM "User";
```

Tu devrais voir ton nouvel utilisateur !

Si tu ne le vois PAS :
- ❌ Le webhook Clerk n'est pas bien configuré
- Retourne à l'Étape 2.4 et vérifie l'URL du webhook

### 4.3 Teste la création de voyage

1. Dashboard → **Create Trip**
2. Remplis le formulaire
3. Clique **Find My Perfect Trip**

**Vérifications** :
- ✅ Modal de chargement apparaît avec l'avion qui vole
- ✅ Après 10-15 secondes, tu arrives sur la page Results
- ✅ Tu vois 3 destinations avec :
  - Photos des destinations
  - Horaires de vols (départ + retour)
  - Liste d'hotels avec prix

---

## 🐛 Résolution de Problèmes

### Problème: "Clerk has been loaded with development keys"

**Cause** : Tu utilises encore `pk_test_...` dans Vercel

**Solution** :
1. Vercel → Settings → Environment Variables
2. Change `VITE_CLERK_PUBLISHABLE_KEY` pour `pk_live_...`
3. Redeploy

---

### Problème: CORS errors "localhost:3001"

**Cause** : Vercel n'a pas la variable `VITE_API_URL`

**Solution** :
1. Vercel → Settings → Environment Variables
2. Ajoute `VITE_API_URL` = `https://travel-app-production-9b66.up.railway.app`
3. Redeploy

---

### Problème: 404 sur Railway

**Cause** : Mauvaise URL Railway ou Railway pas déployé

**Solution** :
1. Va sur Railway → Ton service
2. Vérifie l'URL dans **Settings** → **Domains**
3. Copie exactement cette URL
4. Mets-la dans Vercel comme `VITE_API_URL`

---

### Problème: Nouveaux users ne se créent pas dans la DB

**Cause** : Webhook Clerk manquant ou mal configuré

**Solution** :
1. Clerk Dashboard → Webhooks
2. Vérifie que l'URL est exactement : `https://travel-app-production-9b66.up.railway.app/api/users/sync`
3. Vérifie que les events `user.created`, `user.updated`, `user.deleted` sont cochés
4. Supprime et recrée le webhook si nécessaire

---

### Problème: Photos ne s'affichent pas

**Cause** : `UNSPLASH_ACCESS_KEY` manquante dans Railway

**Solution** :
1. Obtiens une clé sur https://unsplash.com/developers
2. Railway → Variables → Ajoute `UNSPLASH_ACCESS_KEY`

**Note** : Des photos de fallback devraient quand même s'afficher pour les villes populaires (Paris, Tokyo, etc.)

---

## 📋 Checklist Finale

Avant de dire "c'est bon" :

- [ ] Vercel a `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...`
- [ ] Vercel a `VITE_API_URL=https://travel-app-production-9b66.up.railway.app`
- [ ] Vercel est redéployé
- [ ] Clerk est en mode Production (pas Development)
- [ ] Clerk Webhook créé avec URL Railway
- [ ] Railway a `CLERK_SECRET_KEY=sk_live_...`
- [ ] Railway a toutes les autres API keys
- [ ] Test création compte → User apparaît dans DB
- [ ] Test création voyage → Results page fonctionne
- [ ] Pas d'erreurs CORS dans la console
- [ ] Pas d'erreurs "development keys" dans la console

---

## 🎯 Résumé Ultra-Rapide

1. **Vercel** : Ajoute `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...` et `VITE_API_URL=https://...railway.app` → Redeploy
2. **Clerk** : Passe en Production → Crée Webhook vers Railway
3. **Railway** : Change `CLERK_SECRET_KEY` pour `sk_live_...`
4. **Test** : Crée un compte, vérifie qu'il apparaît dans la DB

---

**Une fois tout fait, ton app sera 100% fonctionnelle en production! 🚀**
