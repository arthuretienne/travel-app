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

