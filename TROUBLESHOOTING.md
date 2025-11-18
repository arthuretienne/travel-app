# 🔧 Guide de Dépannage Rapide

## Railway déploie trop longtemps (>5 min)

### Symptômes
- Le déploiement prend plus de 5-10 minutes
- Le statut reste sur "Building" ou "Deploying"

### Solutions

**1. Vérifier les logs Railway**
- Railway → Service → **Logs**
- Cherche des erreurs rouges

**2. Build bloqué?**
- Railway → Deployments → Clique sur le déploiement en cours
- Regarde l'onglet **Build Logs**
- Si bloqué sur "Installing dependencies", problème réseau Railway

**3. Redéployer manuellement**
- Railway → Deployments
- Clique sur **Redeploy** (bouton en haut à droite)
- Ou push un commit vide :
```bash
git commit --allow-empty -m "chore: force redeploy" && git push origin main
```

**4. Vérifier les variables d'environnement**
Si le serveur démarre mais crash immédiatement, vérifie:
- `DATABASE_URL` - Bien définie?
- `CLERK_SECRET_KEY` - Bien définie?
- `ANTHROPIC_API_KEY` - Bien définie?

---

## 404 sur toutes les routes API

### Symptômes
```
Failed to load resource: the server responded with a status of 404
/api/users/preferences → 404
/api/searches/trips/saved → 404
```

### Causes possibles

**1. Railway pas encore déployé**
- Attendre que Railway soit "Active"
- Vérifier dans Railway → Deployments

**2. CLERK_SECRET_KEY manquante**
- Railway → Variables
- Ajouter `CLERK_SECRET_KEY = sk_test_...`

**3. Mauvaise URL Railway dans Vercel**
- Vercel → Settings → Environment Variables
- Vérifier `VITE_API_URL = https://travel-app-production-9b66.up.railway.app`

**4. Routes pas montées**
- Vérifier dans les logs Railway que tu vois:
```
POST   /api/travel/recommendations
POST   /api/users/sync
GET    /api/users/me
PUT    /api/users/preferences
```

---

## Users ne se créent pas dans la DB

### Symptômes
- Nouveau compte Clerk créé
- Mais `SELECT * FROM "User"` retourne rien

### Solutions

**1. Webhook Clerk manquant**
- Clerk Dashboard → Mode Development
- Webhooks → Add Endpoint
- URL: `https://travel-app-production-9b66.up.railway.app/api/users/sync`
- Events: `user.created`, `user.updated`, `user.deleted`

**2. Tester le webhook manuellement**
Dans Railway → Logs, tu devrais voir lors de la création d'un user:
```
✅ User synced from webhook: email@example.com
```

Si tu ne vois RIEN, le webhook n'est pas configuré.

**3. Clerk en Production au lieu de Development**
- Si tu utilises Vercel *.vercel.app, tu DOIS utiliser Clerk Development
- Clerk Dashboard → Switch to Development

---

## "Clerk has been loaded with development keys"

### C'est normal!
Si tu utilises Vercel `*.vercel.app` (domaine gratuit), tu DOIS utiliser les clés Development de Clerk.

Pour enlever ce warning:
- Achète un domaine custom (10€/an)
- Configure-le dans Vercel
- Passe Clerk en Production avec les clés `pk_live_...`

Sinon, **ignore ce warning** - ton app marche parfaitement en mode Development!

---

## Cannot read properties of undefined (reading '0')

### Symptômes
```
TypeError: Cannot read properties of undefined (reading '0')
at index-WVJkXpHW.js:25:111958
```

### Cause
Une variable est `undefined` alors que le code s'attend à un array.

### Solutions

**1. Vider le cache navigateur**
- Ctrl+Shift+R (Windows/Linux)
- Cmd+Shift+R (Mac)

**2. Navigation privée**
- Tester dans une fenêtre navigation privée
- Évite les problèmes de cache

**3. Vérifier que Railway est bien déployé**
- Si Railway crash, le frontend reçoit des réponses vides
- Vérifie Railway → Deployments → Active

---

## Photos ne s'affichent pas

### Symptômes
- Page Results s'affiche
- Mais les photos des destinations sont cassées/manquantes

### Solutions

**1. Ajouter UNSPLASH_ACCESS_KEY**
- Railway → Variables
- Ajouter `UNSPLASH_ACCESS_KEY = ton_access_key`
- Obtenir clé: https://unsplash.com/developers

**2. Les fallbacks devraient marcher**
Même sans clé Unsplash, des photos devraient s'afficher pour:
- Paris, Tokyo, New York, London, Barcelona, Rome, etc.

Si AUCUNE photo ne s'affiche, vérifie les logs Railway pour:
```
📸 Step 3: Fetching destination photos...
✅ Fetched X photos
```

---

## Railway logs: "ENOENT: no such file or directory, open '/.env'"

### C'est normal!
```
❌ Failed to load .env file: Error: ENOENT: no such file or directory, open '/.env'
```

Ce n'est **qu'un warning**. Railway utilise les variables d'environnement de l'interface, pas de fichier `.env`.

Si le serveur continue après ce message (heartbeats ✓), **tout va bien**.

Si le serveur **crash** après ce message, c'est qu'il y a un autre problème:
- Vérifie que toutes les variables d'environnement critiques sont définies
- `DATABASE_URL`, `CLERK_SECRET_KEY`, etc.

---

## Amadeus API errors

### Symptômes
```
❌ Amadeus pre-screening error
❌ Flight search error
```

### Solutions

**1. Vérifier les clés Amadeus**
- Railway → Variables
- `AMADEUS_CLIENT_ID` - Définie?
- `AMADEUS_CLIENT_SECRET` - Définie?

**2. Amadeus en mode Test**
Dans le code, on utilise `hostname: 'test'` pour Amadeus.
C'est normal! Les clés Test sont gratuites.

**3. Quota dépassé?**
Le mode Test d'Amadeus a des limites:
- Vérifier sur https://developers.amadeus.com
- Regarde ton quota restant

---

## Commandes Utiles

### Forcer un redéploiement Railway
```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main
```

### Vérifier la DB PostgreSQL
```bash
# Dans Railway → Postgres → Connect
SELECT * FROM "User";
SELECT * FROM "UserPreferences";
SELECT * FROM "SavedTrip";
```

### Vider le cache Vercel
1. Vercel → Deployments
2. Clique sur le dernier deploy
3. "..." → **Redeploy**
4. Décoche "Use existing Build Cache"

### Logs Railway en temps réel
Railway → Service → Logs → Active le "Live" en haut

---

## Checklist Complète

Avant de dire "ça marche pas", vérifie:

### Vercel
- [ ] `VITE_CLERK_PUBLISHABLE_KEY` défini (pk_test_...)
- [ ] `VITE_API_URL` défini (https://...railway.app)
- [ ] Dernier déploiement est "Ready" (vert)
- [ ] Cache vidé (Ctrl+Shift+R)

### Railway
- [ ] Dernier déploiement est "Active" (vert)
- [ ] `CLERK_SECRET_KEY` défini (sk_test_...)
- [ ] `DATABASE_URL` défini
- [ ] `AMADEUS_CLIENT_ID` défini
- [ ] `AMADEUS_CLIENT_SECRET` défini
- [ ] `ANTHROPIC_API_KEY` défini
- [ ] Logs montrent "Server running on http://localhost:3001"

### Clerk (Development mode)
- [ ] Mode "Development" activé (toggle en haut)
- [ ] Webhook configuré vers Railway
- [ ] Events `user.created`, `user.updated`, `user.deleted` cochés
- [ ] Webhook URL = `https://...railway.app/api/users/sync`

### Test
- [ ] Fenêtre navigation privée
- [ ] Créer nouveau compte test
- [ ] Vérifier que user apparaît dans DB PostgreSQL
- [ ] Compléter onboarding
- [ ] Créer un voyage test

---

## Contacts Support

- **Railway**: https://railway.app/help
- **Vercel**: https://vercel.com/support
- **Clerk**: https://clerk.com/support
- **Amadeus**: https://developers.amadeus.com/support

---

**Dernière mise à jour**: Session de déploiement - Novembre 2024
