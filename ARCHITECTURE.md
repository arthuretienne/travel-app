# 🏗️ Architecture Technique Travel AI - Version Complète

## 📋 Vue d'ensemble

Application de voyage intelligente avec IA personnalisée, disponible en **app mobile native** et **site web responsive**.

### Objectifs architecturaux
- ✅ Support multi-plateforme (Web + Mobile iOS/Android)
- ✅ Architecture scalable et modulaire
- ✅ Optimisation des coûts API (Amadeus + Claude)
- ✅ Temps réel pour le chat collaboratif
- ✅ Sécurité et authentification robuste
- ✅ MCP pour automatisation (Figma → Code + Amadeus optimisé)

---

## 🎯 Stack Technique Modernisée

### Frontend Web
```
- Framework: React 19.1 + TypeScript
- Build: Vite 7
- Styling: TailwindCSS 4 + Headless UI
- State Management: Zustand + React Query
- Routing: React Router v6
- Forms: React Hook Form + Zod validation
- Calendar: React Big Calendar + date-fns
- Charts: Recharts (analytics voyage)
- Maps: Mapbox GL JS
- PWA: Vite PWA Plugin (offline-first)
```

### Frontend Mobile
```
- Framework: React Native + Expo SDK 51
- Navigation: React Navigation v6
- State: Zustand + React Query
- UI: React Native Paper + Custom Design System
- Maps: react-native-maps
- Calendar: react-native-calendars
- Notifications: Expo Notifications
- Storage: MMKV (ultra-rapide)
```

### Backend
```
- Runtime: Node.js 20 LTS
- Framework: Express.js + TypeScript
- Base de données:
  - PostgreSQL 16 (données structurées)
  - Redis 7 (cache + sessions + real-time)
  - MongoDB (logs + analytics)
- ORM: Prisma 5
- Auth: Passport.js + JWT + OAuth2
- Real-time: Socket.IO
- Queue: BullMQ (jobs asynchrones)
- File Upload: Multer + S3
- Email: Nodemailer + SendGrid
- Monitoring: Prometheus + Grafana
```

### APIs & Services
```
- Claude Sonnet 4: Recommandations IA
- Amadeus API: Vols + Hôtels
- Google Calendar API: Sync disponibilités
- Outlook Calendar API: Sync disponibilités
- Mapbox: Cartographie
- OpenWeather: Météo
- Unsplash: Photos destinations
- SendGrid: Emails transactionnels
- Stripe: Paiements (freemium)
```

### MCPs (Model Context Protocol)
```
1. MCP Figma Design → Code
   - Extraction design tokens
   - Génération composants React/RN
   - Export assets optimisés

2. MCP Amadeus Optimizer
   - Cache intelligent requêtes
   - Batch processing
   - Rate limiting
   - Fallback strategies
```

### Infrastructure & DevOps
```
- Hosting Frontend: Vercel (web) + Expo EAS (mobile)
- Hosting Backend: Railway / Render
- Database: Supabase (PostgreSQL + Auth) ou Railway
- Redis: Upstash (serverless)
- CDN: Cloudflare
- Storage: AWS S3 / Cloudflare R2
- CI/CD: GitHub Actions
- Monitoring: Sentry + LogRocket
- Analytics: PostHog (open-source)
```

---

## 🗂️ Architecture du Système

### Architecture Globale

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTS                              │
├──────────────────┬──────────────────┬───────────────────┤
│   Web App        │   iOS App        │   Android App     │
│   (React PWA)    │   (React Native) │   (React Native)  │
└──────────┬───────┴──────────┬───────┴───────────┬───────┘
           │                  │                   │
           └──────────────────┼───────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   API Gateway     │
                    │   (Load Balancer) │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│  REST API      │  │  WebSocket      │  │  GraphQL        │
│  (Express)     │  │  (Socket.IO)    │  │  (Optional)     │
└───────┬────────┘  └────────┬────────┘  └────────┬────────┘
        │                    │                     │
        └────────────────────┼─────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│  Services      │  │  Queue Workers  │  │  Cache Layer   │
│  Layer         │  │  (BullMQ)       │  │  (Redis)       │
└───────┬────────┘  └────────┬────────┘  └───────┬────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│  PostgreSQL    │  │  MongoDB        │  │  Redis         │
│  (User/Travel) │  │  (Logs)         │  │  (Sessions)    │
└────────────────┘  └─────────────────┘  └────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│  Claude API    │  │  Amadeus API    │  │  Calendar APIs │
│  (AI Reco)     │  │  (Flights/Hotels│  │  (Google/MS)   │
└────────────────┘  └─────────────────┘  └────────────────┘
```

---

## 📂 Structure du Projet

### Structure Mono-repo

```
travel-ai-mvp/
├── 📱 apps/
│   ├── web/                    # Application web React
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/     # Composants UI réutilisables
│   │   │   │   ├── auth/
│   │   │   │   ├── onboarding/
│   │   │   │   ├── recommendations/
│   │   │   │   ├── chat/
│   │   │   │   ├── profile/
│   │   │   │   └── shared/
│   │   │   ├── pages/          # Pages/Routes
│   │   │   │   ├── Home.tsx
│   │   │   │   ├── Onboarding.tsx
│   │   │   │   ├── Results.tsx
│   │   │   │   ├── TripDetails.tsx
│   │   │   │   ├── Profile.tsx
│   │   │   │   ├── GroupTrip.tsx
│   │   │   │   └── Dashboard.tsx
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── services/       # API calls
│   │   │   ├── utils/
│   │   │   ├── types/
│   │   │   ├── styles/
│   │   │   └── App.tsx
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── mobile/                 # Application mobile React Native
│       ├── src/
│       │   ├── components/
│       │   ├── screens/
│       │   ├── navigation/
│       │   ├── hooks/
│       │   ├── stores/
│       │   ├── services/
│       │   ├── utils/
│       │   └── types/
│       ├── app.json
│       └── package.json
│
├── ⚙️ backend/
│   ├── src/
│   │   ├── config/             # Configuration
│   │   │   ├── database.ts
│   │   │   ├── redis.ts
│   │   │   ├── env.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── modules/            # Modules métier
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   └── auth.types.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── users.routes.ts
│   │   │   │   └── users.types.ts
│   │   │   │
│   │   │   ├── recommendations/
│   │   │   │   ├── recommendations.controller.ts
│   │   │   │   ├── recommendations.service.ts
│   │   │   │   ├── recommendations.routes.ts
│   │   │   │   └── recommendations.types.ts
│   │   │   │
│   │   │   ├── trips/
│   │   │   │   ├── trips.controller.ts
│   │   │   │   ├── trips.service.ts
│   │   │   │   ├── trips.routes.ts
│   │   │   │   └── trips.types.ts
│   │   │   │
│   │   │   ├── chat/
│   │   │   │   ├── chat.controller.ts
│   │   │   │   ├── chat.service.ts
│   │   │   │   ├── chat.socket.ts
│   │   │   │   └── chat.types.ts
│   │   │   │
│   │   │   └── calendar/
│   │   │       ├── calendar.controller.ts
│   │   │       ├── calendar.service.ts
│   │   │       ├── calendar.routes.ts
│   │   │       └── calendar.types.ts
│   │   │
│   │   ├── services/           # Services externes
│   │   │   ├── claude/
│   │   │   │   ├── claude.service.ts
│   │   │   │   ├── claude.prompts.ts
│   │   │   │   └── claude.types.ts
│   │   │   │
│   │   │   ├── amadeus/
│   │   │   │   ├── amadeus.service.ts
│   │   │   │   ├── amadeus.cache.ts
│   │   │   │   ├── amadeus.optimizer.ts
│   │   │   │   └── amadeus.types.ts
│   │   │   │
│   │   │   ├── calendar/
│   │   │   │   ├── google-calendar.service.ts
│   │   │   │   ├── outlook-calendar.service.ts
│   │   │   │   └── calendar.types.ts
│   │   │   │
│   │   │   ├── affiliates/
│   │   │   │   ├── booking.service.ts
│   │   │   │   ├── skyscanner.service.ts
│   │   │   │   └── affiliate.types.ts
│   │   │   │
│   │   │   ├── email/
│   │   │   │   ├── email.service.ts
│   │   │   │   └── templates/
│   │   │   │
│   │   │   └── storage/
│   │   │       └── s3.service.ts
│   │   │
│   │   ├── jobs/               # Background jobs
│   │   │   ├── queue.config.ts
│   │   │   ├── price-alerts.job.ts
│   │   │   ├── email-notifications.job.ts
│   │   │   └── calendar-sync.job.ts
│   │   │
│   │   ├── websockets/         # Socket.IO handlers
│   │   │   ├── socket.config.ts
│   │   │   ├── chat.handler.ts
│   │   │   └── notifications.handler.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   ├── rate-limit.middleware.ts
│   │   │   └── logger.middleware.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── scoring.ts
│   │   │   ├── logger.ts
│   │   │   ├── validators.ts
│   │   │   └── helpers.ts
│   │   │
│   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   └── server.ts           # Point d'entrée
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
├── 🔧 packages/
│   ├── shared/                 # Code partagé web/mobile/backend
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── constants/
│   │   │   ├── utils/
│   │   │   └── validators/
│   │   └── package.json
│   │
│   └── ui/                     # Design system partagé
│       ├── src/
│       │   ├── components/
│       │   ├── theme/
│       │   └── tokens/
│       └── package.json
│
├── 🤖 mcp/                     # Model Context Protocol
│   ├── figma-to-code/
│   │   ├── src/
│   │   │   ├── extractors/
│   │   │   ├── generators/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── amadeus-optimizer/
│       ├── src/
│       │   ├── cache-strategy.ts
│       │   ├── batch-processor.ts
│       │   └── index.ts
│       └── package.json
│
├── 📚 docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── FIGMA_INTEGRATION.md
│   └── MCP_GUIDE.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── docker-compose.yml
├── package.json               # Root package.json (workspaces)
├── turbo.json                 # Turborepo config
├── .env.example
└── README.md
```

---

## 🗃️ Schéma de Base de Données (Prisma)

### Modèles principaux

```prisma
// prisma/schema.prisma

model User {
  id                String    @id @default(uuid())
  email             String    @unique
  passwordHash      String?
  name              String
  avatar            String?

  // OAuth
  googleId          String?   @unique
  facebookId        String?   @unique
  appleId           String?   @unique

  // Profile
  profile           UserProfile?

  // Relations
  trips             Trip[]
  groupMemberships  TripMember[]
  messages          Message[]
  savedTrips        SavedTrip[]

  // Metadata
  lastLoginAt       DateTime?
  emailVerified     Boolean   @default(false)
  isPremium         Boolean   @default(false)
  premiumExpiresAt  DateTime?

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([email])
}

model UserProfile {
  id                String    @id @default(uuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Étape 1: Questions basiques
  budget            Int       // en euros
  style             String    // confort/aventure/luxe/backpacker
  activities        String[]  // culture, sport, plage, nature...
  maxFlightDuration Int       // en heures
  destinationPref   String    // mainstream/mixte/insolite

  // Étape 2: Préférences détaillées
  climate           String    // chaud/tempéré/froid/peu_importe
  accommodation     String    // hotel/auberge/airbnb/camping/mixte
  travelRhythm      String    // relax/équilibré/intense/aventure
  gastronomy        String    // très_important/important/secondaire/végétarien
  natureVsCity      Int       // 0-100 (0=ville, 100=nature)
  nightlife         String    // importante/secondaire/pas_intéressé
  activitiesBudget  Int       // pourcentage du budget total
  avoidCrowds       Boolean   @default(false)

  // Étape 3: Contraintes pratiques
  languages         String[]  // francophone/anglophone/peu_importe
  security          String    // très_important/important/peu_importe
  visa              String    // éviter/simple_ok/peu_importe
  mobility          String    // une_base/mixte/multi_villes
  travelers         String    // solo/couple/famille/groupe

  // Étape 4: Disponibilités
  professionalStatus String   // salarié/freelance/étudiant/retraité/autre
  idealDuration      String   // 3-5j/1sem/2sem/flexible
  departureFlexibility String // semaine/weekend/peu_importe
  timeSlots          TimeSlot[]

  // Calendrier sync
  googleCalendarToken String?
  outlookCalendarToken String?
  calendarSyncEnabled Boolean  @default(false)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model TimeSlot {
  id          String      @id @default(uuid())
  profileId   String
  profile     UserProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  startDate   DateTime
  endDate     DateTime
  season      String      // printemps/été/automne/hiver
  isFlexible  Boolean     @default(false)

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([profileId])
}

model Trip {
  id                String       @id @default(uuid())
  userId            String
  user              User         @relation(fields: [userId], references: [id])

  // Destination
  destination       String
  country           String
  city              String?
  coordinates       Json         // { lat, lng }

  // Dates
  startDate         DateTime
  endDate           DateTime
  duration          Int          // en jours

  // Prix
  flightPrice       Float
  hotelPrice        Float
  activitiesPrice   Float
  totalPrice        Float
  currency          String       @default("EUR")

  // Détails vol
  flightDetails     Json         // compagnie, durée, escales...

  // Détails hébergement
  hotelDetails      Json         // nom, étoiles, adresse...

  // Recommandation IA
  aiReason          String       @db.Text
  matchScore        Float        // 0-100
  originalityScore  Float        // 0-100

  // Affiliation
  bookingUrl        String?
  skyscannerUrl     String?
  activitiesUrl     String?

  // Status
  status            String       @default("recommended") // recommended/saved/booked/completed
  isGroupTrip       Boolean      @default(false)
  members           TripMember[]

  // Chat
  messages          Message[]

  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  @@index([userId])
  @@index([status])
}

model TripMember {
  id        String   @id @default(uuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  role      String   @default("member") // organizer/member
  status    String   @default("invited") // invited/accepted/declined

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([tripId, userId])
  @@index([tripId])
  @@index([userId])
}

model Message {
  id        String   @id @default(uuid())
  tripId    String
  trip      Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  content   String   @db.Text
  type      String   @default("text") // text/image/location/poll
  metadata  Json?    // données supplémentaires selon le type

  readBy    String[] // IDs des users qui ont lu

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tripId, createdAt])
}

model SavedTrip {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  tripId    String

  notes     String?  @db.Text
  tags      String[]

  createdAt DateTime @default(now())

  @@unique([userId, tripId])
  @@index([userId])
}

model DestinationStats {
  id                String   @id @default(uuid())
  destination       String   @unique
  country           String

  // Tracking originalité
  timesRecommended  Int      @default(0)
  timesBooked       Int      @default(0)
  averageRating     Float?

  // Cache données
  averageFlightPrice Float?
  averageHotelPrice  Float?
  bestSeason         String[]

  lastUpdated       DateTime @updatedAt

  @@index([timesRecommended])
}

model ApiCache {
  id         String   @id @default(uuid())
  cacheKey   String   @unique
  data       Json
  expiresAt  DateTime

  createdAt  DateTime @default(now())

  @@index([cacheKey, expiresAt])
}
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/google
POST   /api/auth/facebook
POST   /api/auth/apple
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/verify-email
```

### Users & Profile
```
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/users/:id/profile
PUT    /api/users/:id/profile
POST   /api/users/:id/upload-avatar
```

### Recommendations
```
POST   /api/recommendations/generate
GET    /api/recommendations/:id
POST   /api/recommendations/:id/save
DELETE /api/recommendations/:id
GET    /api/recommendations/history
```

### Trips
```
GET    /api/trips
GET    /api/trips/:id
POST   /api/trips
PUT    /api/trips/:id
DELETE /api/trips/:id
POST   /api/trips/:id/book
POST   /api/trips/:id/invite
GET    /api/trips/:id/members
PUT    /api/trips/:id/members/:memberId
```

### Chat (REST + WebSocket)
```
GET    /api/trips/:tripId/messages
POST   /api/trips/:tripId/messages
PUT    /api/messages/:id
DELETE /api/messages/:id

WS     /socket.io (namespace: /trips)
  - join_trip
  - leave_trip
  - send_message
  - typing_start
  - typing_stop
  - message_read
```

### Calendar
```
POST   /api/calendar/google/connect
POST   /api/calendar/outlook/connect
GET    /api/calendar/sync
POST   /api/calendar/disconnect
GET    /api/calendar/availability
```

### Amadeus
```
POST   /api/flights/search
GET    /api/flights/inspiration
POST   /api/hotels/search
GET    /api/destinations/popular
```

### Affiliates
```
GET    /api/affiliates/booking-url
GET    /api/affiliates/skyscanner-url
GET    /api/affiliates/activities-url
POST   /api/affiliates/track-click
```

### Admin
```
GET    /api/admin/stats
GET    /api/admin/users
GET    /api/admin/destinations
PUT    /api/admin/destinations/:id
```

---

## 🤖 Configuration MCP

### 1. MCP Figma → Code

**Fichier**: `mcp/figma-to-code/src/index.ts`

```typescript
import { MCPServer } from '@modelcontextprotocol/sdk';
import { extractDesignTokens } from './extractors/tokens';
import { generateComponent } from './generators/react';

export const figmaMCP = new MCPServer({
  name: 'figma-to-code',
  version: '1.0.0',

  tools: [
    {
      name: 'extract-figma-design',
      description: 'Extract design from Figma URL and generate React components',
      inputSchema: {
        type: 'object',
        properties: {
          figmaUrl: { type: 'string' },
          target: { type: 'string', enum: ['react', 'react-native'] },
        },
        required: ['figmaUrl', 'target'],
      },
      handler: async (input) => {
        // 1. Extract design tokens from Figma
        const tokens = await extractDesignTokens(input.figmaUrl);

        // 2. Generate components
        const components = await generateComponent(tokens, input.target);

        return {
          tokens,
          components,
        };
      },
    },
  ],
});
```

**Configuration Claude Code**: `.claude/mcp.json`

```json
{
  "mcpServers": {
    "figma-to-code": {
      "command": "node",
      "args": ["./mcp/figma-to-code/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "${FIGMA_ACCESS_TOKEN}"
      }
    }
  }
}
```

### 2. MCP Amadeus Optimizer

**Fichier**: `mcp/amadeus-optimizer/src/index.ts`

```typescript
import { MCPServer } from '@modelcontextprotocol/sdk';
import { CacheStrategy } from './cache-strategy';
import { BatchProcessor } from './batch-processor';

export const amadeusMCP = new MCPServer({
  name: 'amadeus-optimizer',
  version: '1.0.0',

  tools: [
    {
      name: 'search-flights-optimized',
      description: 'Search flights with intelligent caching and batching',
      inputSchema: {
        type: 'object',
        properties: {
          destinations: {
            type: 'array',
            items: { type: 'string' },
          },
          dateRanges: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                start: { type: 'string' },
                end: { type: 'string' },
              },
            },
          },
          budget: { type: 'number' },
        },
        required: ['destinations', 'dateRanges', 'budget'],
      },
      handler: async (input) => {
        const cache = new CacheStrategy();
        const batch = new BatchProcessor();

        // Check cache first
        const cachedResults = await cache.get(input);
        if (cachedResults) return cachedResults;

        // Batch multiple destination searches
        const results = await batch.process(input);

        // Cache results
        await cache.set(input, results);

        return results;
      },
    },
  ],
});
```

---

## 🚀 Fonctionnalités Principales

### 1. Système d'Authentification

**Technologies**: Passport.js + JWT + OAuth2

**Flux d'authentification**:
```
1. Email/Password classique
2. Google OAuth
3. Facebook OAuth
4. Apple Sign In
5. JWT avec refresh token
6. Email verification
7. Password reset
```

**Middleware auth**: `backend/src/middleware/auth.middleware.ts`

### 2. Recommandations IA avec Claude

**Service**: `backend/src/services/claude/claude.service.ts`

**Workflow**:
```
1. Receive user profile (25+ params)
2. Generate prompt with full context
3. Call Claude Sonnet 4 API
4. Parse AI response (10 destinations)
5. Pre-screen with Amadeus Flight Inspiration
6. Detailed search on top 3-5
7. Calculate combined score
8. Return ranked recommendations
```

**Scoring formula**:
```typescript
finalScore = (
  aiMatchScore * 0.40 +      // IA match avec profil
  priceScore * 0.30 +         // Rapport qualité/prix
  originalityScore * 0.20 +   // Destinations peu proposées
  availabilityScore * 0.10    // Disponibilité temps réel
);
```

### 3. Optimisation Amadeus API

**Service**: `backend/src/services/amadeus/amadeus.optimizer.ts`

**Stratégies d'optimisation**:

```typescript
// 1. Cache Redis avec TTL adaptatif
const getCacheTTL = (searchType: string) => {
  switch(searchType) {
    case 'inspiration': return 24 * 3600; // 24h
    case 'flights': return 1 * 3600;      // 1h
    case 'hotels': return 4 * 3600;       // 4h
    default: return 3600;
  }
};

// 2. Batch processing
const batchSearchFlights = async (destinations: string[]) => {
  // Groupe par 5 destinations max
  const batches = chunk(destinations, 5);

  return Promise.all(
    batches.map(batch =>
      searchFlightsForBatch(batch)
    )
  );
};

// 3. Fallback strategy
const searchWithFallback = async (params) => {
  try {
    return await amadeusAPI.search(params);
  } catch (error) {
    if (error.code === 'RATE_LIMIT') {
      // Attendre et retry
      await sleep(2000);
      return await amadeusAPI.search(params);
    }

    // Utiliser cache expiré si disponible
    return await getStaleCache(params);
  }
};
```

**Estimation coûts**:
```
Approche naïve: ~0.60€/recherche (30 calls)
Approche optimisée: ~0.25€/recherche (10 calls)
Économie: 58%
```

### 4. Chat en Temps Réel

**Service**: `backend/src/websockets/chat.handler.ts`

**Technologies**: Socket.IO + Redis Adapter (multi-instance)

**Fonctionnalités**:
```
- Messages en temps réel
- Typing indicators
- Read receipts
- Online status
- Message reactions
- File sharing (images, PDFs)
- Location sharing
- Polls (vote pour activités)
```

**Architecture WebSocket**:
```typescript
// Socket namespaces
io.of('/trips').on('connection', (socket) => {
  // Join trip room
  socket.on('join_trip', async (tripId) => {
    const canJoin = await checkMembership(socket.userId, tripId);
    if (canJoin) {
      socket.join(`trip:${tripId}`);
      socket.to(`trip:${tripId}`).emit('user_joined', {
        userId: socket.userId,
      });
    }
  });

  // Send message
  socket.on('send_message', async (data) => {
    const message = await createMessage(data);
    io.of('/trips').to(`trip:${data.tripId}`).emit('new_message', message);
  });

  // Typing indicator
  socket.on('typing_start', (tripId) => {
    socket.to(`trip:${tripId}`).emit('user_typing', {
      userId: socket.userId,
    });
  });
});
```

### 5. Synchronisation Calendrier

**Service**: `backend/src/services/calendar/`

**Flux Google Calendar**:
```
1. User clicks "Connect Google Calendar"
2. OAuth2 flow → authorization code
3. Exchange code for tokens
4. Store encrypted refresh token
5. Scan calendar (6 months forward)
6. Detect free time slots (3+ consecutive days)
7. Create TimeSlots in DB
8. Background job: sync daily
```

**Détection smart des disponibilités**:
```typescript
const detectFreeSlots = (events: CalendarEvent[]) => {
  const slots = [];
  const minDuration = 3; // 3 jours minimum

  for (let date = startDate; date <= endDate; date.add(1, 'day')) {
    if (!hasEventOnDate(date, events)) {
      const slot = findConsecutiveFreeDays(date, events);

      if (slot.duration >= minDuration) {
        slots.push({
          startDate: slot.start,
          endDate: slot.end,
          season: detectSeason(slot.start),
        });
      }
    }
  }

  return slots;
};
```

### 6. Système de Notifications

**Service**: `backend/src/jobs/email-notifications.job.ts`

**Types de notifications**:
```
Email:
- Welcome email
- Email verification
- Trip recommendation ready
- Price alert (baisse de prix)
- Trip invitation
- New message in group trip
- Booking confirmation

Push (Mobile):
- New message
- Trip invitation
- Price alert
- Reminder (départ dans X jours)
```

**Queue BullMQ**:
```typescript
import { Queue } from 'bullmq';

const emailQueue = new Queue('emails', {
  connection: redisConnection,
});

// Add job
await emailQueue.add('trip-recommendation', {
  userId: user.id,
  tripId: trip.id,
  email: user.email,
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
});

// Worker
const worker = new Worker('emails', async (job) => {
  const { userId, tripId, email } = job.data;

  await sendEmail({
    to: email,
    subject: 'Your perfect trip is ready!',
    template: 'trip-recommendation',
    data: { userId, tripId },
  });
}, { connection: redisConnection });
```

---

## 🎨 Design System & UI

### Design Tokens (depuis Figma)

**Fichier**: `packages/ui/src/theme/tokens.ts`

```typescript
export const tokens = {
  colors: {
    primary: {
      50: '#E3F2FD',
      100: '#BBDEFB',
      500: '#2196F3',
      900: '#0D47A1',
    },
    // ... autres couleurs depuis Figma
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  typography: {
    fontFamily: {
      primary: 'Inter, sans-serif',
      heading: 'Poppins, sans-serif',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 24,
      '2xl': 32,
    },
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
};
```

### Composants Partagés

**Structure**: `packages/ui/src/components/`

```
Button/
  Button.tsx
  Button.stories.tsx
  Button.test.tsx

Input/
Card/
Modal/
Dropdown/
DatePicker/
Avatar/
Badge/
Toast/
Skeleton/
```

---

## 📱 Spécificités Mobile (React Native)

### Navigation

**Fichier**: `apps/mobile/src/navigation/RootNavigator.tsx`

```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyTrips" component={MyTripsScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
    </Stack.Navigator>
  );
}
```

### Offline-First avec MMKV

```typescript
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// Sync with React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 24, // 24h
      staleTime: 1000 * 60 * 5,        // 5min
      retry: 2,
    },
  },
});

// Persist cache
persistQueryClient({
  queryClient,
  persister: createMMKVPersister(storage),
});
```

---

## 🔒 Sécurité

### Checklist Sécurité

```
✅ HTTPS obligatoire
✅ JWT avec refresh tokens (httpOnly cookies)
✅ Rate limiting (express-rate-limit)
✅ Helmet.js (headers HTTP sécurisés)
✅ CORS configuré strictement
✅ Validation entrées (Zod schemas)
✅ SQL injection protection (Prisma ORM)
✅ XSS protection (sanitization)
✅ CSRF tokens pour forms
✅ Secrets dans variables d'env (jamais commit)
✅ Encryption mots de passe (bcrypt)
✅ 2FA optionnel (TOTP)
✅ Logs sécurisés (pas de données sensibles)
✅ Dependencies scanning (Snyk)
```

### Middleware Sécurité

**Fichier**: `backend/src/middleware/security.ts`

```typescript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { z } from 'zod';

// Rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests par window
  message: 'Too many requests from this IP',
});

// Validation middleware
export const validate = (schema: z.ZodSchema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({ error: error.errors });
    }
  };
};

// Security headers
export const securityMiddleware = [
  helmet(),
  mongoSanitize(),
  apiLimiter,
];
```

---

## 📊 Monitoring & Analytics

### Logging (Winston)

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

### Metrics (Prometheus)

```typescript
import promClient from 'prom-client';

const register = new promClient.Registry();

// Metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const amadeusApiCalls = new promClient.Counter({
  name: 'amadeus_api_calls_total',
  help: 'Total Amadeus API calls',
  labelNames: ['endpoint', 'status'],
  registers: [register],
});

// Expose /metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Error Tracking (Sentry)

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Error middleware
app.use(Sentry.Handlers.errorHandler());
```

---

## 🚀 Déploiement

### Docker Compose (Dev)

**Fichier**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: travelai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/travelai
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  web:
    build: ./apps/web
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

### CI/CD (GitHub Actions)

**Fichier**: `.github/workflows/ci.yml`

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test

      - name: Build
        run: npm run build

  deploy-backend:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend

  deploy-web:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## 📈 Roadmap Technique

### Phase 1: Foundation (Mois 1-2) ✅
- [x] Migration TypeScript
- [x] Setup Prisma + PostgreSQL
- [x] Architecture modulaire backend
- [x] Authentication système
- [x] Base design system

### Phase 2: Core Features (Mois 3-4)
- [ ] MCP Figma integration
- [ ] MCP Amadeus optimizer
- [ ] Calendar sync (Google + Outlook)
- [ ] Chat real-time complet
- [ ] Mobile app (React Native)

### Phase 3: Advanced Features (Mois 5-6)
- [ ] Price alerts system
- [ ] Premium features (freemium)
- [ ] Multi-language support (i18n)
- [ ] Advanced analytics dashboard
- [ ] Push notifications

### Phase 4: Scale & Optimize (Mois 7-12)
- [ ] Microservices architecture
- [ ] GraphQL API
- [ ] ML model (amélioration recommandations)
- [ ] B2B API white-label
- [ ] Mobile app publication (App Store + Play Store)

---

## 💰 Estimation Coûts Mensuels (Production)

### Infrastructure
```
- Vercel Pro: $20/mois (web hosting)
- Railway: $20-50/mois (backend + DB)
- Upstash Redis: $10/mois (serverless)
- AWS S3: $5/mois (storage)
- Sentry: $26/mois (error tracking)
- SendGrid: $15/mois (emails)
Total infrastructure: ~$100/mois
```

### APIs (pour 10,000 recherches/mois)
```
- Claude API: $100/mois
- Amadeus API: $2,500/mois (pay-as-you-go)
- Google Calendar: Gratuit
- Mapbox: $5/mois
Total APIs: ~$2,600/mois
```

### Total: ~$2,700/mois pour 10,000 utilisateurs actifs

**Revenus estimés** (10% conversion, 20€ commission moyenne):
- 10,000 recherches × 10% × 20€ = **20,000€/mois**
- **Marge brute: ~86%**

---

## 🎯 Métriques de Succès

### KPIs Techniques
```
- Uptime: >99.9%
- Response time API: <500ms (p95)
- Time to recommendation: <20s
- Error rate: <0.1%
- Cache hit rate: >70%
```

### KPIs Business
```
- Conversion rate: >10%
- User retention (D30): >40%
- NPS score: >60
- Average revenue per user: >5€
```

---

## 📚 Documentation

### Pour Développeurs
- [API Documentation](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [MCP Integration Guide](docs/MCP_GUIDE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

### Pour Product
- [User Flows](docs/USER_FLOWS.md)
- [Feature Specs](docs/FEATURES.md)
- [Analytics Events](docs/ANALYTICS.md)

---

## 🤝 Contribution Guidelines

### Git Workflow
```
main         (production)
  ↑
develop      (staging)
  ↑
feature/*    (nouvelles features)
bugfix/*     (corrections)
hotfix/*     (urgent prod fixes)
```

### Commit Convention
```
feat: Add calendar sync feature
fix: Fix Amadeus API rate limiting
docs: Update architecture documentation
refactor: Improve scoring algorithm
test: Add tests for auth middleware
chore: Update dependencies
```

---

## 📞 Support & Contact

Pour toute question sur l'architecture:
- Documentation: `/docs`
- Issues: GitHub Issues
- Email: dev@travelai.com

---

*Document version 2.0 - Novembre 2024*
*Architecture conçue pour scale de 0 à 100k utilisateurs*
