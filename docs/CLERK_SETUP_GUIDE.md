# 🔐 Guide Configuration Clerk Auth

## Étape 1 : Créer un Compte Clerk

1. **Aller sur** : https://clerk.com
2. **S'inscrire** avec votre email
3. **Confirmer** votre email

## Étape 2 : Créer une Application

1. **Cliquer** sur "Create Application"
2. **Nom** : `Travel AI` (ou le nom de votre choix)
3. **Providers d'authentification** :
   - ✅ **Email** (recommandé pour commencer)
   - ✅ **Google** (optionnel mais recommandé)
   - ⏸️ Facebook, GitHub, etc. (optionnel)

4. **Cliquer** sur "Create Application"

## Étape 3 : Récupérer les Clés

Une fois l'application créée, vous êtes redirigé vers le Dashboard.

### 📋 Clés à copier

**Dans l'onglet "API Keys"** :

1. **Publishable Key** (commence par `pk_test_...`)
   - Utilisée par le frontend
   - Pas sensible, peut être exposée au public

2. **Secret Key** (commence par `sk_test_...`)
   - Utilisée par le backend
   - ⚠️ **CONFIDENTIELLE** - Ne jamais exposer

### 📸 Screenshot

Vous devriez voir quelque chose comme :

```
Publishable Key: pk_test_dHJhdmVsLWFpLmNsZXJrLmFjY291bnRzLmRldg...
Secret Key: sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Étape 4 : Ajouter dans `.env`

Ouvrez votre fichier `.env` à la racine du projet et ajoutez :

```env
# ==================================
# 🔐 CLERK AUTH ✅ CONFIGURÉ
# ==================================
VITE_CLERK_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_ICI
CLERK_SECRET_KEY=sk_test_VOTRE_CLE_ICI
```

⚠️ **Important** : Remplacez `VOTRE_CLE_ICI` par vos vraies clés !

## Étape 5 : Configuration Webhook (Optionnel)

Pour synchroniser les utilisateurs Clerk avec votre base de données :

1. **Dashboard Clerk** → "Webhooks" → "Add Endpoint"
2. **URL** : `https://votre-backend.com/api/webhooks/clerk`
3. **Events à écouter** :
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. **Copier** le `Signing Secret` (commence par `whsec_...`)
5. **Ajouter dans `.env`** :
```env
CLERK_WEBHOOK_SECRET=whsec_xxxxx
```

## Étape 6 : URLs de Redirection

### Development (Local)

**Dans Dashboard Clerk** → "Paths" :

```
Sign-in URL: http://localhost:5173/sign-in
Sign-up URL: http://localhost:5173/sign-up
After sign-in: http://localhost:5173/
After sign-up: http://localhost:5173/
```

### Production (Quand déployé)

```
Sign-in URL: https://votre-domaine.com/sign-in
Sign-up URL: https://votre-domaine.com/sign-up
After sign-in: https://votre-domaine.com/
After sign-up: https://votre-domaine.com/
```

## Étape 7 : Apparence (Optionnel)

**Dashboard Clerk** → "Customization" :

- **Theme** : Light / Dark / Auto
- **Colors** : Assortir aux couleurs de Travel AI
  - Primary: `#667eea` (violet de l'app)
- **Logo** : Upload votre logo Travel AI

## ✅ Vérification

Une fois configuré, vous devriez avoir dans votre `.env` :

```env
# ==================================
# 🔐 CLERK AUTH ✅ CONFIGURÉ
# ==================================
VITE_CLERK_PUBLISHABLE_KEY=pk_test_dHJhdmVsLWFpLmNsZXJr...
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# CLERK_WEBHOOK_SECRET=whsec_xxxxx (optionnel)
```

## 🚀 Prochaines Étapes

Après avoir ajouté les clés :

1. ✅ Redémarrer le backend : `cd backend && npm start`
2. ✅ Redémarrer le frontend : `cd frontend && npm run dev`
3. ✅ Tester la connexion sur http://localhost:5173

Vous devriez voir :
- Un bouton "Sign In" dans le header
- Possibilité de créer un compte
- Connexion avec email ou Google

## 📊 Limites du Tier Gratuit

| Feature | Limite Gratuite |
|---------|-----------------|
| **MAU (Monthly Active Users)** | 10,000 utilisateurs |
| **Social Logins** | Google, Facebook, etc. inclus |
| **Email/SMS** | Illimité |
| **Webhooks** | Illimité |
| **Custom Domains** | ❌ Pro seulement |
| **Multi-tenancy** | ❌ Pro seulement |

**Largement suffisant pour un MVP !**

## 🆘 Troubleshooting

### Erreur : "Clerk publishable key is missing"

**Solution** :
```bash
# Vérifier que la clé est dans .env
grep VITE_CLERK .env

# Redémarrer le frontend
cd frontend
npm run dev
```

### Erreur : "Invalid Clerk Secret Key"

**Solution** :
- Vérifier que vous avez copié la bonne clé
- La clé doit commencer par `sk_test_` (development) ou `sk_live_` (production)
- Pas d'espaces avant/après

### La redirection ne fonctionne pas

**Solution** :
- Vérifier les URLs dans Dashboard Clerk → Paths
- S'assurer que les URLs correspondent exactement (http vs https, port, etc.)

### Users not syncing to database

**Solution** :
- Configurer le webhook Clerk
- Vérifier que l'endpoint `/api/webhooks/clerk` est accessible
- Vérifier les logs backend

---

## 📚 Documentation Officielle

- **Clerk Docs** : https://clerk.com/docs
- **React Quickstart** : https://clerk.com/docs/quickstarts/react
- **Node.js Backend** : https://clerk.com/docs/backend-requests/handling/nodejs

---

**Prêt à continuer ?** Retournez au guide principal une fois vos clés obtenues !
