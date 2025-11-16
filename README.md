# 🌍 Travel AI - Your AI-Powered Travel Companion

> *"An AI that suggests destinations you didn't know you'd love, when you can actually travel, within your budget."*

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/react-19.1.1-61dafb.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/vite-7.1.7-646cff.svg)](https://vitejs.dev)
[![Clerk](https://img.shields.io/badge/clerk-5.55.0-6c47ff.svg)](https://clerk.com)

---

## ✨ Qu'est-ce que Travel AI ?

Travel AI révolutionne la planification de voyage en utilisant l'IA pour **découvrir** vos destinations idéales plutôt que de simplement comparer des vols.

### Le Problème
- 😕 "Je ne sais pas où aller" - Manque d'inspiration personnalisée
- 🤯 Surcharge d'information - Trop de choix, paralysie décisionnelle
- ⏰ Recherche chronophage - Comparer vols + hôtels + dates = heures perdues
- 🏖️ Destinations saturées - Tout le monde va aux mêmes endroits

### Notre Solution
1. **Profil ultra-complet** (25+ paramètres) - L'IA comprend vraiment qui vous êtes
2. **Disponibilités réelles** - Connexion calendrier, pas de "quand veux-tu partir ?"
3. **Scoring originalité** - On boost les destinations sous-cotées
4. **Prix en temps réel** - Vols A/R + Hôtels + Activités (API Amadeus)

---

## 🎯 Fonctionnalités

### ✅ Actuellement Disponibles (MVP)
- 🎨 **Onboarding 4 étapes** avec 25+ paramètres de personnalisation
- 🤖 **IA Claude Sonnet 4** pour générer des recommandations pertinentes
- ✈️ **Prix vols simulés** (API Amadeus en test)
- 🏨 **Prix hôtels estimés**
- 💰 **Liens affiliés** vers Booking.com et Skyscanner
- 📊 **Scoring combiné** : Match IA (40%) + Prix (30%) + Originalité (20%) + Dispo (10%)

### 🚧 En Développement
- 🎨 **MCP Figma → Code** : Génération automatique de composants depuis le design
- ⚡ **MCP Amadeus Optimizer** : Cache intelligent, batch processing, économie 60% des coûts API
- 🔐 **Authentification** : Google, Email, profils persistants
- 📱 **App mobile** React Native
- 📅 **Sync calendrier** Google & Outlook

### 🔮 Roadmap Futur
- 💬 **Chat temps réel** pour voyages en groupe (Socket.IO)
- 🔔 **Alertes prix** (baisse tarifaire sur vos destinations favorites)
- 💎 **Premium** : Recherches illimitées, comparaison multi-créneaux
- 🏢 **B2B** : API white-label pour agences de voyage

---

## 🚀 Quick Start

### Prérequis
\`\`\`bash
node >= 20.0.0
npm >= 10.0.0
docker (pour PostgreSQL + Redis)
\`\`\`

### Installation

\`\`\`bash
# 1. Clone le repo
git clone https://github.com/votre-username/travel-ai-mvp.git
cd travel-ai-mvp

# 2. Install dependencies
npm install

# 3. Setup environnement
cp .env.example .env
# Éditer .env et remplir vos API keys

# 4. Start database & Redis
docker-compose up -d

# 5. Setup database
cd backend
npx prisma migrate dev
npx prisma generate
cd ..

# 6. Build MCPs (optionnel mais recommandé)
cd mcp/figma-to-code
npm install && npm run build
cd ../amadeus-optimizer
npm install && npm run build
cd ../..

# 7. Start dev servers
npm run dev
\`\`\`

### Accès
- **Web App** : http://localhost:5173
- **API** : http://localhost:3001
- **Prisma Studio** : \`npx prisma studio\` (dans /backend)

---

## 🤖 MCPs (Model Context Protocol)

Travel AI utilise 2 MCPs custom pour automatiser le développement :

### 1. Figma to Code
Convertit vos designs Figma en composants React/React Native

### 2. Amadeus Optimizer
Optimise les appels API Amadeus avec cache intelligent → **Économie : 66% des coûts API**

📖 **[Guide complet MCPs](docs/MCP_GUIDE.md)**

---

## 📝 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture technique détaillée |
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | Vue d'ensemble du projet |
| [docs/MCP_GUIDE.md](docs/MCP_GUIDE.md) | Guide d'utilisation des MCPs |

---

<div align="center">

**Fait avec ❤️ et Claude Code**

</div>
