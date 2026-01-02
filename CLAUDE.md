# Claude Code Instructions for Skusku

## Project Context

Skusku is an AI travel planner that recommends personalized destinations based on user profiles, then finds flights and hotels via Booking.com API.

**Tech Stack:**
- Frontend: React 18 + Vite + Tailwind CSS (Vercel: skusku.life)
- Backend: Node.js + Express + Prisma (TO MIGRATE: Railway expired → Render)
- APIs: Claude AI (Haiku for speed), Booking.com (RapidAPI), Pexels, Clerk Auth
- Database: Neon PostgreSQL

## 🎯 Current Priority Objectives (in order)

### P0 - Critical
1. **Backend Migration to Render** - Railway free tier expired, need to deploy ASAP

### P1 - Core Product
2. **Algorithm Improvement** - Destinations are repetitive (always Paris, Barcelona, Rome)
   - User preferences not weighted enough
   - Need destination diversity based on personality
   - Explore: category pools, weighted randomization, history exclusion

3. **UX/Performance** - Currently ~30s for 3 results, target: <15s
   - Already optimized: switched to claude-3-5-haiku, reduced max_tokens
   - Next: parallel API calls, better loading states, skeleton UI

### P2 - Features
4. **Calendar Integration** - Verify Google Calendar dates are used correctly
5. **Trip Planner Page** - Fix non-functional planner layout

### P3 - Future
6. **Design System Refonte** - After backend works well

## Key Files

```
backend/
├── src/routes/travel.js          # Main /recommendations endpoint (SSE)
├── src/services/claudeService.js # Claude API - uses Haiku model
├── src/services/claudePromptsOptimized.js # Prompt templates
├── src/services/bookingService.js # Booking.com RapidAPI
├── src/services/destinationService.js # Orchestration layer
└── server.js                     # Express app entry

frontend/
├── src/pages/Dashboard.jsx       # Main page with search
├── src/pages/TripDetail.jsx      # Trip planner (broken)
├── src/components/Results/       # Results display
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
| Same destinations always | 🔴 | Need algorithm diversity |
| Slow recommendations (~30s) | 🟡 | Haiku helped, need more optimization |
| Trip planner broken | 🔴 | Layout/functionality issues |
| Cache lost on restart | 🟡 | In-memory, consider Redis |

## Render Migration Notes

When migrating to Render:
1. Create Web Service, connect GitHub repo
2. Build command: `cd backend && npm install`
3. Start command: `cd backend && npm start`
4. Add all env vars from Railway
5. Update frontend VITE_API_URL to new Render URL
6. Test /api/health endpoint

## Algorithm Improvement Ideas

1. **Destination Pools**: Group by category (beach, mountain, city, adventure)
2. **Personality Matching**: Map MBTI/preferences to destination attributes
3. **Exclusion List**: Track user's past destinations, exclude from recommendations
4. **Temperature Tuning**: Increase Claude temperature for variety (0.8-0.9)
5. **Booking API Pre-filter**: Only suggest cities Booking.com supports
