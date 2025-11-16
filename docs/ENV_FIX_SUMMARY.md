# ✅ Résolution du Problème d'Environnement

## 🐛 Problème Initial

Le backend affichait :
```
Checking Claude API Key: API key is missing
Amadeus credentials: { clientId: undefined, clientSecret: undefined }
❌ Failed to initialize Amadeus client: Missing required argument: clientId
```

Malgré que le fichier `.env` (racine) contenait bien toutes les clés.

---

## 🔍 Cause Racine

### Problème #1 : Imports ES Modules Hoisting

En Node.js avec ES modules (`type: "module"`), **tous les imports sont "hoistés"** au début du fichier AVANT l'exécution du code.

**Configuration problématique** :
```javascript
// backend/server.js
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' }); // ⚠️ S'exécute APRÈS les imports!

import express from 'express';
import travelRoutes from './routes/travel.js'; // ❌ Charge claudeService.js et amadeusService.js
```

**Ordre d'exécution réel** :
1. ✅ `import dotenv` (hoisting)
2. ✅ `import express` (hoisting)
3. ❌ `import travelRoutes` → charge `claudeService.js` et `amadeusService.js` (hoisting)
4. ❌ `dotenv.config()` s'exécute EN DERNIER
5. 💥 Les services tentent d'utiliser `process.env.ANTHROPIC_API_KEY` mais il vaut `undefined`

### Problème #2 : Duplications de `dotenv.config()` dans les services

Les fichiers `claudeService.js` et `amadeusService.js` appelaient eux-mêmes `dotenv.config()` avec leur propre chemin :

```javascript
// backend/src/services/claudeService.js (AVANT)
import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../../.env' });
```

Ces appels :
- Chargeaient le `.env` avec un chemin incorrect
- Écrasaient les valeurs correctes chargées par `server.js`
- Résultaient en `undefined` pour toutes les variables

---

## ✅ Solution Appliquée

### Fix #1 : Création d'un module d'environnement dédié

**Fichier créé** : [`/backend/env.js`](../backend/env.js)

```javascript
// backend/env.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
const envPath = path.resolve(__dirname, '../.env');
console.log('📁 Loading .env from:', envPath);

const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error('❌ Failed to load .env file:', envResult.error);
  process.exit(1);
}

console.log('✅ .env file loaded successfully');
console.log('🔑 Environment variables:');
console.log('  - ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅ SET' : '❌ MISSING');
console.log('  - AMADEUS_CLIENT_ID:', process.env.AMADEUS_CLIENT_ID ? '✅ SET' : '❌ MISSING');
console.log('  - AMADEUS_CLIENT_SECRET:', process.env.AMADEUS_CLIENT_SECRET ? '✅ SET' : '❌ MISSING');
```

**Modification** : [`/backend/server.js`](../backend/server.js)

```javascript
// backend/server.js
// CRITICAL: Import env.js FIRST to load environment variables before anything else
import './env.js';

import express from 'express';
import cors from 'cors';
import travelRoutes from './src/routes/travel.js';
// ... reste du code
```

**Pourquoi ça marche** :
- Grâce au hoisting, `import './env.js'` est **garanti** d'être exécuté avant tous les autres imports
- Le `.env` est chargé AVANT que `travelRoutes` (et donc `claudeService.js`, `amadeusService.js`) ne soient importés
- Les services voient maintenant les variables d'environnement correctement chargées

### Fix #2 : Suppression des `dotenv.config()` dupliqués

**Modifié** : [`/backend/src/services/claudeService.js`](../backend/src/services/claudeService.js)

```javascript
// AVANT
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: __dirname + '/../../.env' });

// APRÈS
import Anthropic from '@anthropic-ai/sdk';

// NOTE: dotenv est déjà chargé dans server.js via env.js
// Les variables d'environnement sont disponibles via process.env
```

**Modifié** : [`/backend/src/services/amadeusService.js`](../backend/src/services/amadeusService.js)

```javascript
// AVANT
import Amadeus from 'amadeus';
import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../../.env' });

// APRÈS
import Amadeus from 'amadeus';

// NOTE: dotenv est déjà chargé dans server.js via env.js
// Les variables d'environnement sont disponibles via process.env
```

---

## 🧪 Résultat

Après ces modifications, le backend démarre correctement :

```bash
cd backend
npm start
```

**Output** :
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

## 📁 Fichiers Modifiés

1. ✅ **Créé** : `/backend/env.js` - Module d'initialisation des variables d'environnement
2. ✅ **Modifié** : `/backend/server.js` - Import de `env.js` en premier
3. ✅ **Modifié** : `/backend/src/services/claudeService.js` - Suppression dotenv dupliqué
4. ✅ **Modifié** : `/backend/src/services/amadeusService.js` - Suppression dotenv dupliqué
5. ✅ **Mis à jour** : `/docs/ENV_SETUP_COMPLETE.md` - Documentation technique

---

## 📚 Leçons Apprises

### ES Modules et Import Hoisting

En ES modules :
- ❌ **Ne PAS** faire : `dotenv.config()` puis `import` d'autres modules
- ✅ **Faire** : Créer un module dédié (`env.js`) importé en premier

### Single Source of Truth

- ❌ **Ne PAS** dupliquer `dotenv.config()` dans plusieurs fichiers
- ✅ **Faire** : Un seul point d'entrée qui charge les variables pour toute l'application

### Structure Recommandée

```
backend/
├── env.js                 ← Charge le .env EN PREMIER
├── server.js              ← import './env.js' en premier
└── src/
    └── services/
        ├── claudeService.js    ← Utilise process.env directement
        └── amadeusService.js   ← Utilise process.env directement
```

---

## ✅ Checklist Finale

- [x] `.env` unique à la racine du projet
- [x] `/backend/env.js` créé et chargé en premier
- [x] `server.js` importe `env.js` en premier
- [x] Services n'appellent plus `dotenv.config()`
- [x] Backend démarre avec toutes les clés chargées
- [x] Claude API initialisée correctement
- [x] Amadeus API initialisée correctement
- [x] Documentation mise à jour

---

**Status** : ✅ **Problème résolu ! Backend fonctionnel avec toutes les variables d'environnement.**
