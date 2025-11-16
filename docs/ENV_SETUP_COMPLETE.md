# ✅ Configuration Environnement - Complète

## 📁 Structure des fichiers `.env`

### Avant (Ancien)
```
travel-ai-mvp/
├── .env                    ❌ (vide ou différent)
└── backend/
    └── .env                ✅ (utilisé)
```

### Après (Nouveau) ✅
```
travel-ai-mvp/
├── .env                    ✅ UNIQUE SOURCE DE VÉRITÉ
└── backend/
    └── .env                ⚠️  (obsolète, peut être supprimé)
```

---

## 🔧 Changements Effectués

### 1. Consolidation du `.env`
✅ Toutes les variables sont maintenant dans **`/.env` (racine)**
✅ Le backend lit ce fichier via un module dédié `env.js` pour garantir le chargement avant tous les imports
✅ Création de `/backend/env.js` qui charge les variables d'environnement en premier

### 2. Variables Configurées

```env
✅ ANTHROPIC_API_KEY        (Claude AI)
✅ AMADEUS_API_KEY          (Vols & Hôtels TEST)
✅ AMADEUS_API_SECRET       (Vols & Hôtels TEST)
✅ PORT                     (3001)
✅ NODE_ENV                 (development)
✅ CORS_ORIGIN              (localhost:5173 + Vercel)
✅ AFFILIATES               (Skyscanner, Booking)
```

### 3. Variables À Configurer (Optionnelles)

```env
⏸️  CLERK_*                 (Auth - à configurer si besoin)
⏸️  DATABASE_URL            (Neon - à configurer si besoin)
⏸️  REDIS_URL               (Upstash - à configurer si besoin)
⏸️  FIGMA_ACCESS_TOKEN      (MCP Figma - à configurer si besoin)
```

---

## 🧪 Tests de Vérification

### Test 1: Variables chargées
```bash
cd /Users/arthur/Documents/travel-ai-mvp
node -e "
import dotenv from 'dotenv';
dotenv.config();
console.log('Claude:', process.env.ANTHROPIC_API_KEY ? '✅' : '❌');
console.log('Amadeus:', process.env.AMADEUS_API_KEY ? '✅' : '❌');
"
```

Résultat attendu :
```
Claude: ✅
Amadeus: ✅
```

### Test 2: Backend démarre
```bash
cd backend
npm start
```

Résultat attendu :
```
📁 Loading .env from: /Users/arthur/Documents/travel-ai-mvp/.env
✅ .env file loaded successfully
🔑 Environment variables:
  - ANTHROPIC_API_KEY: ✅ SET
  - AMADEUS_CLIENT_ID: ✅ SET
  - AMADEUS_CLIENT_SECRET: ✅ SET

Checking Claude API Key: API key is set
Amadeus credentials: {
  clientId: '6uySKmHp0S9ux6Tsco3TwNRmzZwJ24Hv',
  clientSecret: 'QEY0VVhwui3F5zsx'
}
✅ Amadeus client initialized successfully
🚀 Server running on http://localhost:3001
📡 API endpoints available at http://localhost:3001/api
```

---

## 📊 Résumé Configuration

| Service | Status | Environnement | Limite |
|---------|--------|---------------|--------|
| **Claude** | ✅ Configuré | Production | 5$ gratuits |
| **Amadeus** | ✅ Configuré | **TEST** | Illimité gratuit |
| **Backend** | ✅ Fonctionne | Development | - |
| **CORS** | ✅ Configuré | Dev + Prod URLs | - |
| Clerk | ⏸️ À configurer | - | 10k users gratuits |
| Neon DB | ⏸️ À configurer | - | 0.5GB gratuit |
| Upstash Redis | ⏸️ À configurer | - | 10k cmd/jour |
| Figma MCP | ⏸️ À configurer | - | Gratuit |

---

## 🚀 Prochaines Étapes

### Maintenant (Fonctionnel)
Vous pouvez déjà :
1. ✅ Lancer le backend : `cd backend && npm start`
2. ✅ Lancer le frontend : `cd frontend && npm run dev`
3. ✅ Tester les recommandations IA (avec Claude)
4. ✅ Simuler recherches vols (avec Amadeus TEST)

### Optionnel (Quand besoin)

#### Pour l'authentification (Clerk)
```bash
# 1. Créez un compte sur https://clerk.com
# 2. Récupérez vos clés
# 3. Ajoutez dans .env:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

#### Pour la base de données (Neon)
```bash
# 1. Créez un compte sur https://neon.tech
# 2. Créez un projet
# 3. Copiez la connection string
# 4. Ajoutez dans .env:
DATABASE_URL=postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb
```

#### Pour le cache (Upstash Redis)
```bash
# 1. Créez un compte sur https://console.upstash.com
# 2. Créez une DB Redis
# 3. Copiez l'URL
# 4. Ajoutez dans .env:
REDIS_URL=rediss://default:xxxxx@xxx.upstash.io:6379
```

#### Pour les MCPs Figma
```bash
# 1. Allez sur https://www.figma.com/developers/api
# 2. Générez un Personal Access Token
# 3. Ajoutez dans .env:
FIGMA_ACCESS_TOKEN=figd_xxxxx
```

---

## 🔐 Sécurité

### ⚠️ Important
- ❌ **Ne JAMAIS commit** le fichier `.env` dans Git
- ✅ Le `.env` est déjà dans `.gitignore`
- ✅ Utilisez `.env.example` comme template

### Vérification
```bash
# Vérifiez que .env est ignoré
git status
# Vous ne devriez PAS voir .env dans la liste
```

---

## 📝 Nettoyage (Optionnel)

Si vous voulez supprimer l'ancien fichier :

```bash
# Sauvegarde de sécurité
cp backend/.env backend/.env.backup

# Suppression (le backend utilise maintenant /.env)
rm backend/.env
```

⚠️ **Attention** : Faites ça seulement quand vous êtes sûr que tout fonctionne !

---

## 🔧 Solution Technique: Import ES Modules

### Pourquoi un fichier `env.js` séparé ?

En ES modules (Node.js avec `type: "module"`), **tous les imports sont "hoistés"** (déplacés au début du fichier) AVANT l'exécution du code.

**Problème initial** :
```javascript
// server.js
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' }); // ⚠️ S'exécute APRÈS les imports ci-dessous!

import express from 'express';
import travelRoutes from './routes/travel.js'; // ❌ Importe claudeService.js et amadeusService.js AVANT le .env
```

Résultat : Les services tentent d'utiliser `process.env.ANTHROPIC_API_KEY` mais il n'est pas encore chargé → `undefined`

**Solution** :
Créer un module dédié `env.js` qui est importé EN PREMIER :
```javascript
// backend/env.js
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
// Les variables sont maintenant dans process.env

// backend/server.js
import './env.js'; // ✅ S'exécute EN PREMIER grâce au hoisting
import express from 'express'; // ✅ Voit les variables d'environnement
import travelRoutes from './routes/travel.js'; // ✅ Les services voient aussi les variables
```

Grâce au hoisting, `import './env.js'` est garanti d'être exécuté avant tous les autres imports, même s'il y a d'autres imports après.

---

## 🆘 Troubleshooting

### Problème: "API key is missing"
**Cause**: Le fichier `.env` n'est pas chargé correctement ou chargé trop tard

**Solution**:
```bash
# Vérifiez que le fichier existe
ls -la .env

# Vérifiez le contenu (sensible!)
grep ANTHROPIC_API_KEY .env

# Vérifiez que env.js est importé EN PREMIER dans server.js
head -5 backend/server.js
# Devrait afficher: import './env.js';
```

### Problème: "Amadeus client failed"
**Cause**: Mauvaises clés ou nom de variable incorrect

**Solution**:
```bash
# Vérifiez les clés
grep AMADEUS .env

# Devrait afficher:
# AMADEUS_API_KEY=6uySKmHp0S9ux6Tsco3TwNRmzZwJ24Hv
# AMADEUS_API_SECRET=QEY0VVhwui3F5zsx
```

### Problème: Backend ne démarre pas
**Solution**:
```bash
# Testez les variables
cd backend
node -e "
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Amadeus:', process.env.AMADEUS_API_KEY);
"
```

---

## ✅ Checklist Finale

- [x] `.env` racine créé et rempli
- [x] Backend configuré pour lire `.env` racine
- [x] Claude API configurée
- [x] Amadeus API (TEST) configurée
- [x] CORS configuré
- [x] Test de démarrage backend réussi
- [ ] Clerk configuré (optionnel)
- [ ] Neon DB configurée (optionnel)
- [ ] Upstash Redis configuré (optionnel)
- [ ] Figma MCP configuré (optionnel)

---

**Status**: ✅ **Configuration fonctionnelle pour le développement !**

Vous pouvez maintenant coder sans problème. Les services optionnels (DB, Auth, Redis) peuvent être ajoutés quand vous en aurez besoin.
