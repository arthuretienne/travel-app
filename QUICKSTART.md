# 🚀 Quick Start - Travel AI MVP

Ce guide vous permet de lancer l'application en moins de 2 minutes.

---

## ✅ Prérequis

- Node.js 18+ installé
- npm ou yarn
- Toutes les clés API déjà configurées dans `.env` (✅ fait)

---

## 🎯 Lancement Rapide

### 1. Démarrer le Backend

```bash
cd backend
npm start
```

**Output attendu**:
```
✅ .env file loaded successfully
✅ Upstash cache service initialized
✅ Amadeus client initialized successfully
✅ Unsplash client initialized successfully
✅ Prisma client initialized
🚀 Server running on http://localhost:3001
```

### 2. Démarrer le Frontend

Dans un **nouveau terminal**:

```bash
cd frontend
npm run dev
```

**Output attendu**:
```
VITE v7.2.0  ready in 503 ms
➜  Local:   http://localhost:5173/
```

### 3. Ouvrir l'Application

Ouvrez votre navigateur: **http://localhost:5173**

---

## 🎨 Utilisation

### Flow Utilisateur Standard

1. **Page d'accueil** → Voir le formulaire d'onboarding moderne
2. **Remplir le formulaire**:
   - 💰 Budget: Choisir entre Budget/Modéré/Confortable/Luxe
   - ✨ Style: Adventure/Culture/Plage/Urbain/Gastronomie
   - 📅 Mois: Sélectionner un ou plusieurs mois
   - ✈️ Vol: Durée maximale acceptable
   - 🎯 Activités: Randonnée, Musées, Plage, etc.
   - 🌍 Région: Europe, Asie, Amériques, etc.
   - 📍 Départ: Ville de départ
   - 👥 Voyageurs: Nombre de personnes

3. **Cliquer "Find My Perfect Trips"**
4. **Attendre 9-11 secondes** pendant la génération
5. **Voir les résultats**: 10 destinations avec photos, prix, liens

### Flow Utilisateur Authentifié (Optionnel)

1. **Cliquer "Sign In"** en haut à droite
2. **Créer un compte** ou se connecter
3. Suivre le même flow que ci-dessus
4. **Bonus**: Les recherches sont automatiquement sauvegardées en DB

---

## 🧪 Tester le Cache

Pour voir l'effet du cache Upstash:

1. Effectuer une première recherche → **~10 secondes**
2. Effectuer exactement la même recherche → **~2-3 secondes** 💨
3. Vérifier les logs backend pour voir `💨 Cache HIT`

---

## 📊 Vérifier la Base de Données

```bash
cd backend
npx prisma studio
```

Ouvre http://localhost:5555 avec toutes vos tables:
- User
- UserPreferences
- Search
- Recommendation
- SavedTrip

---

## 🔧 Commandes Utiles

### Redémarrer Backend
```bash
cd backend
npm start
```

### Redémarrer Frontend
```bash
cd frontend
npm run dev
```

### Nettoyer les processus bloqués
```bash
# Kill backend
lsof -ti:3001 | xargs kill -9

# Kill frontend
lsof -ti:5173 | xargs kill -9
```

### Mettre à jour la DB après modif schema
```bash
cd backend
npx prisma generate
npx prisma db push
```

---

## 📁 Structure du Projet

```
travel-ai-mvp/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── prisma.js          # Client Prisma
│   │   ├── services/
│   │   │   ├── claudeService.js   # Génération destinations
│   │   │   ├── amadeusService.js  # Recherche vols
│   │   │   ├── unsplashService.js # Photos
│   │   │   └── cacheService.js    # Upstash Redis
│   │   ├── middleware/
│   │   │   └── auth.js            # Clerk JWT verification
│   │   └── routes/
│   │       ├── travel.js          # Recommandations
│   │       ├── user.js            # Profil utilisateur
│   │       └── searches.js        # Historique/Voyages
│   ├── prisma/
│   │   └── schema.prisma          # Schéma DB
│   ├── env.js                     # Chargement .env
│   └── server.js                  # Entry point
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Onboarding/
│       │   │   ├── OnboardingNew.jsx  # Nouveau formulaire
│       │   │   └── OnboardingNew.css
│       │   └── Results/
│       │       ├── Results.jsx
│       │       └── Results.css
│       ├── App.jsx                # Clerk Provider + routing
│       └── App.css
│
├── docs/
│   ├── SETUP_COMPLETION_SUMMARY.md  # Résumé complet
│   ├── SESSION_SUMMARY.md           # Historique sessions
│   └── ... autres guides
│
├── QUESTIONS.md                     # Questions onboarding
├── QUICKSTART.md                    # Ce fichier
└── .env                             # Configuration (✅)
```

---

## ⚡ Fonctionnalités Actives

### Backend
- ✅ Génération 10 destinations personnalisées (Claude AI)
- ✅ Recherche vols réels (Amadeus API TEST)
- ✅ Photos automatiques (Unsplash)
- ✅ Cache intelligent (Upstash Redis)
- ✅ Auth utilisateur (Clerk)
- ✅ Sauvegarde recherches (Neon PostgreSQL)

### Frontend
- ✅ Formulaire onboarding moderne
- ✅ Authentification Sign In/Sign Up
- ✅ Affichage résultats avec photos
- ✅ Links Skyscanner & Booking.com
- ✅ Responsive mobile

---

## 💡 Conseils

### Pour une Démo Réussie

1. **Utilisez des paramètres variés** pour voir différentes destinations
2. **Montrez le cache** en effectuant 2 recherches identiques
3. **Créez un compte** pour montrer la sauvegarde des recherches
4. **Ouvrez Prisma Studio** pour montrer la DB en temps réel

### Pour Développer

1. **Hot reload** actif sur frontend et backend
2. **Logs détaillés** dans les consoles
3. **Prisma Studio** pour voir/modifier la DB
4. **Postman/Insomnia** pour tester les API endpoints

---

## 🆘 Problèmes Courants

| Problème | Solution |
|----------|----------|
| "Port 3001 already in use" | `lsof -ti:3001 \| xargs kill -9` |
| "Port 5173 already in use" | `lsof -ti:5173 \| xargs kill -9` |
| Backend ne démarre pas | Vérifier `.env` à la racine |
| "Missing API key" | Redémarrer backend après modif .env |
| Erreur Prisma | `npx prisma generate` puis redémarrer |
| Cache ne fonctionne pas | Vérifier UPSTASH_REDIS_REST_URL |

---

## 📞 Support

Documentation complète dans `/docs`:
- [SETUP_COMPLETION_SUMMARY.md](docs/SETUP_COMPLETION_SUMMARY.md) - Tout le setup
- [SESSION_SUMMARY.md](docs/SESSION_SUMMARY.md) - Historique développement
- [QUESTIONS.md](QUESTIONS.md) - Détails questions onboarding

---

## ✅ Checklist de Vérification

Avant de montrer l'app:

- [ ] Backend démarre sans erreur
- [ ] Frontend démarre sans erreur
- [ ] http://localhost:5173 accessible
- [ ] Formulaire onboarding s'affiche
- [ ] Recherche retourne des résultats
- [ ] Photos des destinations s'affichent
- [ ] Prix des vols affichés
- [ ] Sign In fonctionne (optionnel)

---

**C'est tout ! L'application est prête à l'emploi.** 🎉

Pour aller plus loin, consultez [SETUP_COMPLETION_SUMMARY.md](docs/SETUP_COMPLETION_SUMMARY.md)
