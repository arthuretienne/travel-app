# Claude Code Instructions for Skusku

## Project Context

Skusku is an AI travel planner that recommends personalized destinations based on user profiles, then finds flights and hotels via Booking.com API.

> **📋 Documentation algorithme de recommandations :** Voir [`algorithme.md`](./algorithme.md) pour l'analyse complète du système (bugs identifiés, stratégie par profil voyageur, métriques qualité, roadmap d'améliorations, tests de validation).

**Tech Stack:**
- Frontend: React 18 + Vite + Tailwind CSS (Vercel: skusku.life)
- Backend: Node.js + Express + Prisma (Render)
- APIs: Claude AI (Haiku for speed), Booking.com (RapidAPI), Pexels, Clerk Auth
- Database: Neon PostgreSQL

## 🎯 Current Priority Objectives (in order)

### P0 - Critical (Security Hardening)
1. ~~**Backend Migration to Render**~~ ✅ DONE
2. **Security Audit Fixes** - ✅ DONE (2025-02-01)
   - ✅ Removed hardcoded API keys from source (bookingService, roadtripService, travel.js, test scripts)
   - ✅ Added auth to `/destinations/search`, `/algorithm-stats`; removed `/test-algorithm` entirely
   - ✅ Sanitized all error responses (no more `error.message` or `error.stack` sent to client)
   - ✅ Added per-user rate limiting (`userStrictLimiter` + `userSearchLimiter` keyed by user ID)
   - ✅ Added `.env.*` to .gitignore (was missing .env.bak)
   - ⚠️ Rotate BOOKING_API_KEY on RapidAPI (old key exposed in git history)

### P1 - Core Product
1. **Algorithm Improvement** - 🔄 IN PROGRESS (voir algorithme.md pour détail complet)
   - ✅ Keyword detection for all constraint types
   - ✅ Custom travelVibeDescription field parsed and used in prompts
   - ✅ All 20 tests passing
   - 🔴 Bug: hostel proposé pour couple/amis quand budget serré
   - 🔴 Bug: budget/personne vs budget total non clarifié → mauvaise interprétation
   - 🔴 Bug: Paris Beauvais (BVA) non supporté dans IATA mapping
   - 🔴 Bug: ratio vols hardcodé 50% → trop peu pour long-courrier, trop pour court-courrier
   - 🟡 Bug: timing de vol non pris en compte (vol 6h du matin = levé 3h)
   - 🟡 Bug: destinations répétitives en mode découverte
   - Next: Sprint corrections critiques (voir algorithme.md §8)

2. **UX/Performance** - Target: <15s for 3 results
   - ✅ Switched to claude-3-5-haiku
   - ✅ SSE streaming for itinerary generation (day-by-day)
   - ✅ Better loading states with animated phrases
   - ✅ Parallel API calls: origin+dest ID lookups in optimizeDestination & discoverDestinations
   - ✅ Parallel Claude insights + Pexels photos in WITH_DESTINATION workflow

3. **Bug Fixes from Audit** - ✅ ALL DONE (2025-02-01)
   - ✅ Fixed OptimalPeriodsWidget infinite loop (removed getToken from useEffect deps)
   - ✅ Fixed division-by-zero in hotel pricing (Math.max(1, duration))
   - ✅ Dashboard NaN stats already guarded
   - ✅ Fixed /settings → /onboarding navigation
   - ✅ Guarded Promise.all in CreateTrip (.catch(() => null) per promise)
   - ✅ Fixed incrementUsage (updateMany + null guard on req.user?.id)

### P2 - Features (Done)
4. **Trip Planner Page** - ✅ REFACTORED
   - ✅ Tab-based navigation (Overview, Participants, Chat, Checklist, Settings)
   - ✅ SSE streaming itinerary with real-time day generation
   - ✅ Weather & packing tips integrated
   - ✅ Group booking status tracking
   - ✅ Fixed undefined destination in group trips (nested finalDestination structure)
5. **Calendar Integration** - ✅ IMPLEMENTED
   - Verify: GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET set on Render

### P3 - Premium Features
6. **Phase 1 Monetization** - ✅ COMPLETE
   - ✅ Search counter with free tier limits (10/month)
   - ✅ Stripe Checkout + subscription tiers ready
   - ✅ Price alerts with email notifications (Results page + SavedTripDetail)
   - ⚠️ Needs Prisma migration for PriceAlert model
   - ⚠️ Set `BETA_MODE=false` on Render to activate limits

7. **SEO & i18n** - ✅ IMPLEMENTED (2025-02-01)
   - ✅ robots.txt, sitemap.xml (20+ destinations), Open Graph, Twitter Cards
   - ✅ Schema.org structured data (WebApplication + TouristDestination)
   - ✅ 20 public destination landing pages at `/destination/:slug` (SEO-indexable)
   - ✅ Destinations index page at `/destinations`
   - ✅ i18n with react-i18next (FR/EN) — language auto-detection + switcher
   - ✅ Code splitting with React.lazy — main bundle reduced 45% (759KB → 419KB)
   - ✅ Vercel config with proper cache headers

8. **Phase 2 Features** - ✅ IMPLEMENTED (2025-02-01)
   - ✅ PDF export for itineraries (@react-pdf/renderer, lazy-loaded)
   - ✅ Expense splitting (Tricount-style) for group trips
   - ✅ Push notifications for price alerts (Web Push API + VAPID)
   - ✅ Cron job for automated price checks (Render Cron Jobs + HTTP endpoint)
   - ✅ Redis cache via Upstash (replaces in-memory, with fallback)
   - Remaining: Saved trip templates, TypeScript migration

## Key Files

```
backend/
├── src/routes/travel.js          # Main /recommendations endpoint (SSE)
├── src/routes/tripEnhancements.js # Weather, itinerary, packing, events endpoints
├── src/routes/trips.js           # Collaborative trip CRUD & invitations
├── src/routes/voting.js          # Destination voting & finalization
├── src/routes/billing.js         # Stripe checkout, webhooks, usage
├── src/routes/priceAlerts.js     # Price alert CRUD & checking
├── src/routes/expenses.js       # Expense splitting (Tricount-style)
├── src/routes/push.js           # Push notification subscription management
├── scripts/check-prices.js      # Cron script for automated price checks
├── src/services/claudeService.js # Claude API - uses Haiku model
├── src/services/claudePromptsOptimized.js # Prompt templates
├── src/services/bookingService.js # Booking.com RapidAPI
├── src/services/destinationService.js # Orchestration layer
├── src/services/itineraryService.js   # Personalized itinerary generation (streaming)
├── src/services/priceAlertService.js  # Price alert checking via Booking.com
├── src/services/pushService.js        # Web Push notifications (VAPID)
├── src/services/emailService.js       # Resend email (invitations, price drops)
├── src/utils/cache.js                 # Cache layer (Upstash Redis or in-memory fallback)
├── src/middleware/checkSubscription.js # Plan limits, usage tracking, monthly reset
└── server.js                     # Express app entry

frontend/
├── src/pages/Dashboard.jsx       # Main page with saved trips
├── src/pages/Results.jsx         # Search results with trip cards
├── src/pages/TripDetail.jsx      # Group trip planner (tabs: Overview, Participants, Chat, Checklist)
├── src/pages/SavedTripDetail.jsx # Solo saved trip detail (PDF export button)
├── src/components/TripExpenses.jsx # Expense splitting UI (Tricount-style)
├── src/components/ItineraryPDF.jsx # PDF generation for itineraries
├── src/hooks/usePushNotifications.js # Web Push subscription hook
├── src/pages/CreateTrip.jsx      # Search form with destination autocomplete
├── src/pages/PriceAlerts.jsx     # Price alerts management
├── src/pages/Destinations.jsx   # SEO destinations index (public)
├── src/pages/DestinationLanding.jsx # SEO destination detail (public)
├── src/data/destinations.js     # 20 destination data (SEO content, FR+EN)
├── src/i18n/                    # i18next config + fr.json + en.json
├── src/components/SEO.jsx       # Dynamic meta tags, Open Graph, Schema.org
├── src/components/Results/       # Legacy results display
└── src/components/Onboarding/    # User profile setup
```

## Coding Standards

- ES modules (import/export)
- Async/await, never .then() chains
- Optional chaining for API responses: `data?.results?.[0]`
- Error logging: `console.error('[ServiceName] Error:', error)`
- Keep Claude prompts SHORT - every token = latency

## 🤖 Autonomous Work Rules

### DO without asking:
- Fix bugs, add null checks, error handling
- Refactor for performance (same behavior)
- Optimize Claude prompts (shorter = faster)
- Run tests, check builds
- Commit with clear messages
- Update CLAUDE.md with learnings

### ASK before:
- Database schema changes (Prisma migrations)
- Auth flow modifications
- New npm dependencies
- API contract changes (frontend/backend)
- Major architecture decisions

## Testing Checklist

```bash
# 1. Backend health
cd backend && npm start
curl http://localhost:3001/api/health

# 2. Frontend build
cd frontend && npm run build

# 3. Full flow test (needs auth token)
# POST /api/travel/recommendations with user profile
```

## Known Issues & Fixes

| Issue | Status | Notes |
|-------|--------|-------|
| Booking.com API city recognition | 🔄 | IATA mapping incomplete (Sofia, Tallinn fail) |
| Same destinations always | ✅ | Fixed with keyword detection & constraint parsing |
| Slow recommendations (~30s) | 🟡 | Haiku + streaming helps, parallel calls next |
| Trip planner broken | ✅ | Refactored with tabs, SSE streaming |
| Cache lost on restart | 🟡 | In-memory, consider Redis |
| Itinerary not personalized | ✅ | Added tripType, travelers, travelVibeDescription context |
| Group trip destination undefined | ✅ | Fixed: finalDestination has nested structure (destination.city vs city) |
| Group itinerary generic | ✅ | Fixed: searchContext now extracted from nested finalDestination |
| Price alerts on results page | ✅ | Added alert button to Results.jsx TripCard actions |

## 🔴 Security & Reliability Audit (2025-02-01)

### CRITICAL — ✅ ALL FIXED

| # | Issue | Status |
|---|-------|--------|
| 1 | Hardcoded Booking.com API key in source | ✅ Removed from 5 files |
| 2 | Unauthenticated destination search | ✅ Added `authenticateUser` + `userSearchLimiter` |
| 3 | Unauthenticated algorithm-stats | ✅ Added `authenticateUser` |
| 4 | Test endpoint exposes internals | ✅ Removed `/test-algorithm` entirely |
| 5 | Error responses leak stack traces | ✅ Sanitized all routes |

### HIGH — ✅ ALL FIXED

| # | Issue | Status |
|---|-------|--------|
| 6 | Race condition in monthly usage reset | ✅ checkAndResetMonthlyUsage exists |
| 7 | incrementUsage fire-and-forget promise | ✅ Changed to updateMany + null guard |
| 8 | OptimalPeriodsWidget infinite loop | ✅ Removed getToken from deps |
| 9 | Division by zero in hotel pricing | ✅ Math.max(1, duration) |
| 10 | Missing /settings route | ✅ Changed to /onboarding |
| 11 | NaN in dashboard stats | ✅ Already guarded |

### MEDIUM — Reviewed

| # | Issue | Status |
|---|-------|--------|
| 12 | No per-user rate limiting | ✅ Added userStrictLimiter + userSearchLimiter |
| 13 | Promise.all cascading failures | ✅ Individual .catch(() => null) |
| 14 | No form validation on Onboarding | ✅ Already adequate (button groups with defaults, Step1 requires activities) |
| 15 | No empty state on PriceAlerts | ✅ Already has empty state UI |
| 16 | Chat loading state not shown | ✅ Already has spinner + empty state + error display |
| 17 | Modal doesn't lock background scroll | 🟡 Low priority cosmetic |
| 18 | Hardcoded French locale in dates | 🟡 Intentional for French users; i18n planned for Phase 2 |

## Render Deployment (LIVE)

Backend deployed to Render:
- Build command: `cd backend && npm install && npx prisma db push`
- Start command: `cd backend && npm start`
- Health check: `/api/health`

⚠️ **Prisma schema changes** (PushSubscription, TripExpense models) need to be applied on Render:
Run `npx prisma db push` in the Render shell, or add it to the build command above.

## Recent Improvements

### 2025-02-01 — Phase 2 Features
- ✅ **PDF export**: @react-pdf/renderer with cover page, travel details, day-by-day itinerary, packing list. Lazy-loaded (1.5MB only on demand)
- ✅ **Expense splitting**: Tricount-style for group trips. Add/delete expenses, auto-split, balance calculation, optimal settlement plan. New "Expenses" tab in TripDetail
- ✅ **Push notifications**: Web Push API with VAPID. Service worker, subscription management, price drop alerts. Toggle on PriceAlerts page
- ✅ **Automated price checks**: Cron endpoint (`POST /api/cron/check-prices`) + standalone script (`npm run cron:check-prices`). Batched processing with rate limit awareness
- ✅ **Redis cache**: Upstash Redis via `@upstash/redis` REST client. Transparent fallback to in-memory when env vars not set. All cache callers updated to async
- ✅ **Prisma schema**: Added `PushSubscription` and `TripExpense` models

### 2025-02-01 — SEO & i18n
- ✅ **SEO foundations**: robots.txt, sitemap.xml (20+ URLs), Open Graph, Twitter Cards, Schema.org
- ✅ **20 destination landing pages**: Public, indexable pages with bilingual content (FR/EN), price estimates, highlights, tips
- ✅ **i18n**: react-i18next with FR/EN translations, auto-detect browser language, language switcher on Landing
- ✅ **Code splitting**: React.lazy for all pages — main bundle 759KB → 419KB (45% reduction)
- ✅ **Vercel config**: Cache headers for static assets, sitemap, robots.txt

### 2025-02-01 — Security Hardening & Full Bug Fix Sprint
- ✅ **P0 Security fixes**: Removed hardcoded API keys (5 files), added auth to public endpoints, removed /test-algorithm, sanitized all error responses, added per-user rate limiting
- ✅ **P1 Bug fixes**: OptimalPeriodsWidget infinite loop, hotel pricing division-by-zero, /settings route, Promise.all cascading failure in CreateTrip, incrementUsage robustness
- ✅ **Group trip undefined destination fix**: `finalDestination` nested structure handled in tripEnhancements.js, voting.js, TripDetail.jsx, trips.js
- ✅ **Price alert button on Results page**: Users can set price alerts directly from search results
- ✅ **Full security & reliability audit** — 18 issues identified, 16 fixed, 2 deferred (cosmetic)

### 2025-01-26 — Phase 1 Monetization
- ✅ Search counter with plan-based limits
- ✅ Stripe integration ready
- ✅ Price alerts with Booking.com API + email notifications

### 2025-01-25 — Algorithm & UX
- ✅ Keyword detection: beach, hiking, mountains, Asia, family, budget, flight duration, gastronomy
- ✅ Custom request parsing (`travelVibeDescription`)
- ✅ All 20 tests passing (8 workflow + 12 weird requests)
- ✅ Trip type context (couple → romantic, family → kid-friendly, friends → social)
- ✅ SSE streaming for day-by-day itinerary generation
- ✅ Tab-based trip detail page

## Premium Features (Phase 1) - 2025-01-26

### Search Counter & Limits - ✅ IMPLEMENTED
- ✅ Usage tracking via `Subscription.searchesThisMonth`
- ✅ `checkLimit` middleware enforces plan limits
- ✅ Monthly auto-reset on first request of new month
- ✅ `/api/billing/usage` endpoint for frontend stats
- ✅ `SearchUsageWidget` component on Dashboard & CreateTrip
- ✅ Blocks search when limit reached, prompts upgrade
- Plans: FREE (5/mo), EXPLORER "Starter" (40/mo), WANDERER (unlimited) — aligned on the public pricing page (decision 2026-06-11: the pricing page is the source of truth)

### Stripe Integration - ✅ READY
- ✅ Checkout session creation (`/api/billing/checkout`)
- ✅ Billing portal for subscription management
- ✅ Webhooks for subscription events
- ⚠️ Set env vars: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_EXPLORER`, `STRIPE_PRICE_ID_WANDERER`, `STRIPE_WEBHOOK_SECRET`
- ⚠️ Set `BETA_MODE=false` on Render to activate limits

### Price Alerts - ✅ IMPLEMENTED
- ✅ `PriceAlert` model in Prisma schema
- ✅ Price alert service (`priceAlertService.js`) using Booking.com API
- ✅ API routes: `/api/price-alerts` (CRUD + manual check)
- ✅ Email notifications via Resend (`sendPriceDropEmail`)
- ✅ Frontend page at `/price-alerts`
- Alert limits: FREE (0), EXPLORER "Starter" (3), WANDERER (unlimited) — aligned on the pricing page comparison table; push notifications gated to WANDERER (requireFeature('pushNotifications'))
- Features:
  - Create alerts with target price (default -10% from current)
  - Daily/weekly price checking
  - Price history tracking (last 30 checks)
  - Email notification when price drops below target
  - Manual price check button
  - Pause/resume alerts
- ⚠️ Needs Prisma migration: `npx prisma migrate dev`

### Configuration
```bash
# To enable limits in production, set on Render:
BETA_MODE=false

# Stripe setup (required for paid plans):
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID_EXPLORER=price_...
STRIPE_PRICE_ID_WANDERER=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis cache (optional, falls back to in-memory):
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Push notifications (generate with: npx web-push generate-vapid-keys):
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:hello@skusku.life

# Cron job secret (any random string, set in Render Cron Job config):
CRON_SECRET=...
```

## Architecture Notes

### finalDestination Data Structure (Group Trips)
When a destination is finalized via voting, `CollaborativeTrip.finalDestination` (JSON) contains the full recommendation `tripData`:
```json
{
  "destination": { "city": "Lisbon", "country": "Portugal", "iataCode": "LIS" },
  "slot": { "startDate": "...", "endDate": "...", "duration": 7 },
  "pricing": { "total": 850, "flight": 300, "hotel": 450 },
  "flightDetails": { "outbound": {...}, "return": {...} },
  "hotelOptions": { "hotels": [...] },
  "searchContext": { "tripType": "friends", "travelers": 4, "travelVibeDescription": "..." }
}
```
**Important**: Always access city as `fd.city || fd.destination?.city` — `voting.js` now normalizes to top-level, but old trips may have nested-only.

### SSE Streaming Pattern
Itinerary generation uses Server-Sent Events:
- Backend: `tripEnhancements.js` → `GET /:id/itinerary/stream`
- Events: `status`, `day` (per day), `packing`, `complete`, `error`
- Frontend: `TripDetail.jsx` TripEnhancementsSection uses EventSource
- Itineraries cached in `tripData.cachedItinerary` (SavedTrip) or `finalDestination.cachedItinerary` (CollaborativeTrip)

---

# Global Design System — AI Travel Planner SaaS

## Product Intent
This product reduces cognitive load and human friction in travel planning.
Design must prioritize clarity, trust, and decision-making over inspiration or exploration.

The UI should feel calm, structured, and efficient, while remaining warm and human.

---

## Visual Philosophy
- Premium functional
- Calm and airy
- Warm minimalism
- No visual noise
- No decorative elements without purpose

The interface should feel like a highly competent assistant, not a travel magazine.

---

## Color System

### Core Rules
- One signature color only
- Neutrals dominate the interface
- Color guides decisions, not emotions
- No aggressive or saturated colors

### Roles
- Primary (Signature color — blue-green / teal tone)
  - Primary CTAs
  - Key highlights
  - AI suggestions
  - Active states

- Neutral Backgrounds
  - Off-white or very light gray for main backgrounds
  - Light gray for cards and containers

- Text
  - Dark gray for primary text
  - Medium gray for secondary text
  - Light gray for hints and metadata

- Status Colors
  - Positive: soft green (used sparingly)
  - Neutral: gray
  - Negative: muted neutral (never red unless critical)

No gradients, no decorative color usage.

---

## Typography

### Font Strategy
- Modern sans-serif only
- High readability at small sizes
- International-friendly
- No decorative or display fonts

### Hierarchy
- Clear visual separation between:
  - Page titles
  - Section headers
  - Body text
  - Metadata

Font weight and spacing are preferred over color for hierarchy.

---

## Spacing & Layout

### Layout Rules
- Generous spacing between sections
- Clear content grouping
- Avoid dense layouts
- Prefer vertical scrolling over complex grids

### Containers
- Cards are the primary structural element
- Rounded corners (subtle)
- Soft shadows or borders only
- No heavy outlines

---

## Interaction Principles

### Primary Action Rule
- One primary action per screen
- Secondary actions are visually subdued
- No competing CTAs

### Feedback
- Immediate and calm
- Subtle transitions (fade, scale)
- No flashy animations

---

## Core UI Components

### Cards
Used for:
- Destination proposals
- Preference summaries
- Booking progress
- AI recommendations

Card content priority:
1. Key decision information
2. Supporting context
3. Secondary details (collapsed or subtle)

---

### Destination Proposal Card
Must always include:
- Destination name
- Date compatibility
- Budget alignment
- Activity fit
- Group compatibility indicator

CTA:
- Single, clear action (e.g. “View this proposal”)

---

### Group Compatibility Summary
Purpose:
- Make consensus visible
- Reduce emotional friction

Rules:
- Highlight what works first
- Differences are shown neutrally
- No blame or negative language

Visuals:
- Bars, chips, or simple indicators
- No charts or complex visuals

---

### Availability Timeline
Purpose:
- Show common dates clearly
- Enable quick validation

Rules:
- Clear visual confirmation when dates align
- Neutral presentation when they do not
- No calendar overload

---

### AI Assistant Blocks
Purpose:
- Explain reasoning
- Suggest next actions

Rules:
- Discrete container
- Calm tone
- Concise explanations
- Always optional

AI never interrupts the user flow.

---

### Group Chat
Purpose:
- Coordination, not conversation

Features:
- Booking status indicators
- Soft reminders
- Clear progress visibility

Tone:
- Warm but structured
- No pressure language

---

## States & Feedback

### Success States
- Calm positive reinforcement
- Minimal visual emphasis
- Optional subtle microcopy (max one emoji)

Examples:
- “Everyone is available 🎉”
- “This option fits the group”

---

### Conflict or No-Match States
Rules:
- Neutral language
- Solution-oriented
- Never emotional

Examples:
- “Some preferences differ. These options are the closest matches.”
- “No common dates found yet. Here are alternatives.”

---

## Motion & Animation
- Subtle and purposeful
- Used only for:
  - State changes
  - Success confirmation
  - Flow continuity

No decorative or looping animations.

---

## Accessibility & Usability
- Strong contrast ratios
- Clear tap targets
- Predictable navigation
- No hidden critical actions

The UI should feel obvious without explanation.

---

## Design North Star
If a design decision is unclear, choose:
- Clarity over creativity
- Calm over excitement
- Structure over exploration
- Decision over inspiration

The interface should remove mental effort, not add to it.

