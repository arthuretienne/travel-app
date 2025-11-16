# Quick Start Guide - Travel AI MVP

## 🚀 Démarrage Rapide (5 minutes)

### Prérequis
- ✅ Node.js v18+ installé
- ✅ npm installé
- ✅ Compte Clerk (gratuit) créé sur [clerk.com](https://clerk.com)

---

## Étape 1: Installation (2 min)

```bash
# 1. Naviguer vers le projet
cd /Users/arthur/Documents/travel-ai-mvp/frontend

# 2. Installer les dépendances
npm install
```

---

## Étape 2: Configuration Clerk (2 min)

### 2.1 Obtenir votre clé Clerk

1. Aller sur [dashboard.clerk.com](https://dashboard.clerk.com)
2. Créer une nouvelle application (si pas déjà fait)
3. Dans "API Keys", copier votre **Publishable Key** (commence par `pk_test_...`)

### 2.2 Configurer .env

```bash
# Ouvrir le fichier .env
cd /Users/arthur/Documents/travel-ai-mvp/frontend
nano .env

# OU utiliser votre éditeur préféré
code .env
```

**Remplacer dans .env:**
```env
# AVANT
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here

# APRÈS (avec votre vraie clé)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_ICI
```

**Sauvegarder et fermer.**

---

## Étape 3: Lancer l'Application (1 min)

### 3.1 Lancer le Backend (Terminal 1)

```bash
# Naviguer vers backend
cd /Users/arthur/Documents/travel-ai-mvp/backend

# Lancer le serveur
node server.js
```

**Vous devriez voir:**
```
✅ Server running on http://localhost:3001
✅ MongoDB connected
```

### 3.2 Lancer le Frontend (Terminal 2)

```bash
# Ouvrir un NOUVEAU terminal
cd /Users/arthur/Documents/travel-ai-mvp/frontend

# Lancer Vite
npm run dev
```

**Vous devriez voir:**
```
  VITE v7.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### 3.3 Ouvrir dans le Navigateur

```
http://localhost:5173
```

---

## 🎉 C'est parti !

Vous devriez maintenant voir la **Landing Page** de Travel AI.

### Test du Flow Complet

#### 1️⃣ Landing Page
- Cliquer sur **"Get Started Free"**
- Une modal Clerk s'ouvre

#### 2️⃣ Sign Up
- Créer un compte (email + mot de passe)
- OU utiliser Google/GitHub
- Confirmer l'email si demandé

#### 3️⃣ Onboarding
Vous êtes redirigé vers `/onboarding`
- **Step 1:** Choisir budget (ex: Moderate 500-1500€)
- **Step 2:** Choisir style (ex: Culture & History) + région (Europe)
- **Step 3:** Choisir mois (ex: April, May) + durée vol (Medium 3-6h)
- **Step 4:** Choisir activités (ex: Museums, Beach)
- **Step 5:** Ville départ (Paris) + voyageurs (2)
- Cliquer **"Complete Setup"**

#### 4️⃣ Dashboard
Vous êtes redirigé vers `/dashboard`
- Message de bienvenue: "Welcome back, [Votre Prénom]!"
- Stats: 0 Saved Trips
- Empty state avec bouton **"Create Your First Trip"**

#### 5️⃣ Create Trip
- Cliquer sur **"Create Your First Trip"**
- Le formulaire est pré-rempli avec vos préférences
- Vous pouvez ajuster si besoin
- Cliquer **"Find My Perfect Trips"**

#### 6️⃣ Results
Vous êtes redirigé vers `/results/:searchId`
- Liste de recommandations de voyage
- Pour chaque trip:
  - Image de destination
  - Prix total
  - Détails du vol
  - Score de matching
  - Bouton **"Save Trip"**
  - Liens **"Book Flights"** et **"Book Hotels"**

#### 7️⃣ Save & Return
- Cliquer **"Save Trip"** sur un voyage
- Alert: "Trip saved successfully!"
- Cliquer **"Back to Dashboard"**
- Voir le trip dans "My Saved Trips"
- Stats mis à jour: 1 Saved Trip, 1 Country

---

## 📱 Tester en Responsive

### Desktop
```
http://localhost:5173
```
Taille normale du navigateur

### Tablet
```
Ouvrir DevTools (F12)
Toggle Device Toolbar (Ctrl+Shift+M)
Sélectionner "iPad"
```

### Mobile
```
DevTools → Device Toolbar
Sélectionner "iPhone 14 Pro"
```

---

## 🔧 Troubleshooting

### Problème 1: "Missing Clerk Publishable Key"
**Solution:**
```bash
# Vérifier que .env existe
ls -la /Users/arthur/Documents/travel-ai-mvp/frontend/.env

# Vérifier le contenu
cat /Users/arthur/Documents/travel-ai-mvp/frontend/.env

# Doit contenir:
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3001
```

### Problème 2: "Cannot connect to backend"
**Solution:**
```bash
# Vérifier que le backend tourne
curl http://localhost:3001/api/health

# Devrait retourner:
{"status":"ok"}

# Si erreur, relancer le backend:
cd backend
node server.js
```

### Problème 3: CORS Errors dans Console
**Solution:**
Vérifier dans `/backend/server.js`:
```javascript
app.use(cors({
  origin: ['http://localhost:5173', ...],
  credentials: true
}));
```

### Problème 4: "npm install" échoue
**Solution:**
```bash
# Supprimer node_modules et package-lock
rm -rf node_modules package-lock.json

# Réinstaller
npm install
```

### Problème 5: Port 5173 déjà utilisé
**Solution:**
```bash
# Vite choisira automatiquement le port suivant (5174)
# OU tuer le processus:
lsof -ti:5173 | xargs kill -9
```

---

## 📊 Vérifier que Tout Fonctionne

### Checklist Frontend
- [ ] Landing page s'affiche (`/`)
- [ ] Bouton "Get Started" ouvre modal Clerk
- [ ] Sign Up fonctionne
- [ ] Onboarding 5 steps fonctionnent
- [ ] Redirection vers Dashboard
- [ ] Dashboard affiche "Welcome back"
- [ ] Bouton "Create Trip" fonctionne
- [ ] Formulaire Create Trip est pré-rempli
- [ ] Soumission redirige vers Results
- [ ] Results affiche des recommandations
- [ ] Bouton "Save Trip" fonctionne
- [ ] Retour Dashboard affiche le trip sauvegardé

### Checklist Backend (À Implémenter)
- [ ] `GET /api/users/preferences` fonctionne
- [ ] `POST /api/users/preferences` fonctionne
- [ ] `POST /api/travel/recommendations` retourne searchId
- [ ] `GET /api/searches/:searchId` fonctionne
- [ ] `GET /api/searches/trips/saved` fonctionne
- [ ] `POST /api/searches/trips/save` fonctionne

---

## 🎨 Architecture Visuelle

```
┌─────────────────────────────────────────────────────┐
│                   LANDING PAGE                      │
│                       (/)                           │
│  ┌───────────────────────────────────────────────┐  │
│  │  Hero: "Your AI-Powered Travel Companion"    │  │
│  │  [Get Started Free] ────────────┐            │  │
│  └──────────────────────────────────┼────────────┘  │
│                                     │               │
│  Features, Benefits, CTA            │               │
└─────────────────────────────────────┼───────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │   Clerk Sign In Modal   │
                         │   (Email + Password)    │
                         └────────────┬────────────┘
                                      │
┌─────────────────────────────────────▼───────────────┐
│                 ONBOARDING                          │
│                 (/onboarding)                       │
│  ┌───────────────────────────────────────────────┐  │
│  │  [■■■■□] Step 3 of 5                         │  │
│  │                                               │  │
│  │  When do you want to travel?                 │  │
│  │  [Jan] [Feb] [Mar] [Apr] [May] ...          │  │
│  │                                               │  │
│  │  [Previous]                [Next]            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │  POST /api/users/       │
                         │      preferences        │
                         └────────────┬────────────┘
                                      │
┌─────────────────────────────────────▼───────────────┐
│                  DASHBOARD                          │
│                  (/dashboard)                       │
│  ┌───────────────────────────────────────────────┐  │
│  │  Welcome back, Arthur!                       │  │
│  │  [+ Create a New Trip]                       │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Stats: [3 Trips] [2 Countries] [92 Avg Score]     │
│                                                     │
│  My Saved Trips:                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │Barcelona│ │  Rome   │ │ Lisbon  │              │
│  │Apr 15-22│ │May 1-8  │ │Jun 10-17│              │
│  │€1,450   │ │€1,620   │ │€890     │              │
│  │[View]   │ │[View]   │ │[View]   │              │
│  └─────────┘ └─────────┘ └─────────┘              │
└─────────────────────────────────────┬───────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │    Click "Create Trip"  │
                         └────────────┬────────────┘
                                      │
┌─────────────────────────────────────▼───────────────┐
│                 CREATE TRIP                         │
│                 (/create-trip)                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  Customize Your Trip                         │  │
│  │                                               │  │
│  │  Budget: [Moderate €500-1500]                │  │
│  │  Style: [Culture & History]                  │  │
│  │  Months: [April] [May] [September]           │  │
│  │  ...                                          │  │
│  │                                               │  │
│  │  [Cancel]  [Find My Perfect Trips]           │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │  POST /api/travel/      │
                         │    recommendations      │
                         │  → searchId             │
                         └────────────┬────────────┘
                                      │
┌─────────────────────────────────────▼───────────────┐
│                   RESULTS                           │
│              (/results/:searchId)                   │
│  ┌───────────────────────────────────────────────┐  │
│  │  Your Perfect Trips                          │  │
│  │  [Back to Dashboard]  [New Search]           │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🏆 #1 Barcelona, Spain              95 match │ │
│  │ [Image of Barcelona]                         │ │
│  │                                               │ │
│  │ 📅 Apr 15-22 • 7 days                        │ │
│  │ 💰 Total: €1,450 (€50 under budget ✓)       │ │
│  │ ✈️ PAR → BCN (2h 15m)                        │ │
│  │                                               │ │
│  │ 💡 Why? Perfect mix of culture and beach     │ │
│  │ 🌤️ Why now? Ideal weather in April          │ │
│  │                                               │ │
│  │ [💾 Save Trip] [✈️ Book Flights] [🏨 Book]   │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  [More trips...]                                   │
└─────────────────────────────────────────────────────┘
```

---

## 📚 Documentation Complète

Pour aller plus loin:

1. **Architecture détaillée**
   ```
   /frontend/README_NEW_ARCHITECTURE.md
   ```

2. **Guide de migration**
   ```
   /MIGRATION_GUIDE.md
   ```

3. **Résumé complet**
   ```
   /RESTRUCTURATION_COMPLETE.md
   ```

4. **Structure du projet**
   ```
   /STRUCTURE_PROJET.md
   ```

---

## ⚡ Commandes Utiles

### Development
```bash
# Lancer backend
cd backend && node server.js

# Lancer frontend
cd frontend && npm run dev

# Lancer les deux (si vous avez concurrently)
npm run dev:all
```

### Build
```bash
# Build frontend pour production
cd frontend && npm run build

# Preview du build
npm run preview
```

### Logs
```bash
# Voir les logs backend
cd backend && node server.js | tee logs.txt

# Voir les erreurs Vite en temps réel
cd frontend && npm run dev 2>&1 | grep ERROR
```

---

## 🎯 Prochaines Étapes

### Immédiat (Aujourd'hui)
1. ✅ Installer et configurer
2. ✅ Tester le flow complet
3. ⏳ Implémenter les endpoints backend manquants

### Court Terme (Cette Semaine)
1. Ajouter plus de validations
2. Améliorer les messages d'erreur
3. Optimiser les loading states
4. Tester sur différents navigateurs

### Moyen Terme (Ce Mois)
1. Déployer en production
2. Configurer analytics
3. Ajouter monitoring d'erreurs
4. Tests E2E

---

## 💡 Tips & Best Practices

### 1. Pendant le Développement
- Garder les 2 terminaux (backend + frontend) ouverts
- Utiliser React DevTools pour debugger
- Vérifier la console pour les erreurs
- Tester en mode responsive

### 2. Avant de Commit
- Vérifier que tout fonctionne
- Pas de console.log() dans le code
- Styles cohérents
- Pas de hardcoded values

### 3. Pour Tester les APIs
```bash
# Utiliser curl pour tester
curl -X GET http://localhost:3001/api/health

# Ou utiliser Postman/Insomnia
```

---

## 🆘 Besoin d'Aide ?

### Documentation Officielle
- Clerk: https://clerk.com/docs
- React: https://react.dev
- React Router: https://reactrouter.com
- Vite: https://vitejs.dev

### Community
- Clerk Discord: https://clerk.com/discord
- React Community: https://react.dev/community

---

**Bon développement ! 🚀**

---

_Dernière mise à jour: 2025-11-16_
_Version: 2.0.0_
