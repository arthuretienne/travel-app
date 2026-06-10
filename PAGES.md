# Skusku — Page & Feature Inventory

Exhaustive, per-page feature list with page-type classification. Use this to review pages one by one.

**Source of truth:** `frontend/src/App.jsx` (route map) + each page component.

---

## Page-Type Taxonomy

| Type | Auth gate | Layout | Meaning |
|------|-----------|--------|---------|
| **Public** | None | None / own | Reachable signed-out. SEO-indexable or invite/landing flows. |
| **Semi-protected** | `<SignedIn>` only | No `AppLayout` | Requires login but renders standalone (no nav chrome). |
| **Protected** | `ProtectedRoute` = `<SignedIn>` + `AppLayout` | App chrome | Core app; signed-out users redirected to `/`. |

**Routing facts (App.jsx):**
- `Landing` is eager-loaded; every other page is `lazy()` + `<Suspense>`.
- Catch-all `*` → `<Navigate to="/" />`.
- ClerkProvider redirects: sign-in → `/dashboard`, sign-up → `/onboarding`, sign-out → `/`.
- ⚠️ **No Privacy/Terms page components exist** — footer links to `/privacy` and `/terms` are hardcoded `href`s that hit the catch-all and redirect to `/`.

**API base:** `import.meta.env.VITE_API_URL || 'http://localhost:3001'`.

---

## 1. Landing — `/`

- **Type:** Public (eager-loaded)
- **File:** `frontend/src/pages/Landing.jsx` (~568 lines)

**Features:**
- Marketing hero with inline `COPY` object (FR/EN) — not `t()`.
- Language switcher (FR/EN).
- Clerk `SignInButton` / `SignUpButton` entry points.
- "How it works" / value-prop sections.
- Feature highlights, social proof / testimonial blocks.
- Footer with links (incl. dead `/privacy`, `/terms` → catch-all redirect).
- CTAs route signed-in users into the app; signed-out into Clerk auth.

---

## 2. Destinations index — `/destinations`

- **Type:** Public (SEO)
- **File:** `frontend/src/pages/Destinations.jsx` (~184 lines)

**Features:**
- Grid of all 20 SEO destinations from `src/data/destinations.js`.
- Bilingual content (FR/EN).
- Each card links to `/destination/:slug`.
- SEO meta via `SEO.jsx` (Open Graph, Schema.org).
- Public, indexable index page.

---

## 3. Destination landing — `/destination/:slug`

- **Type:** Public (SEO)
- **File:** `frontend/src/pages/DestinationLanding.jsx` (~371 lines)

**Features:**
- Per-destination editorial page (data keyed by `:slug`).
- Bilingual via `t()`.
- Price estimates, highlights, travel tips.
- Schema.org `TouristDestination` structured data.
- CTA into app (create-trip / sign-up).
- 404-style fallback if slug not found.

---

## 4. Accept invitation — `/accept-invitation/:token`

- **Type:** Public (invite flow)
- **File:** `frontend/src/pages/AcceptInvitation.jsx` (~274 lines)

**Features:**
- Resolves invitation `:token` (group trip invite).
- Works signed-out: guest path vs signed-in path.
- Accept/decline invitation actions.
- On accept → joins collaborative trip, routes to `/trips/:id`.
- Loading / invalid-token / expired states.

---

## 5. Onboarding — `/onboarding`

- **Type:** Semi-protected (`<SignedIn>`, **no** AppLayout)
- **File:** `frontend/src/pages/Onboarding.jsx` (~1244 lines)

**Features:**
- Multi-step profile setup wizard.
- Step 1 requires activity selection (validation gate).
- Captures: whyTravel, mainGoal, globalStyle, topActivities, idealRhythm, availability prefs.
- Button-group inputs with defaults.
- Persists profile → user preferences API.
- Sign-up redirect target (new users land here).
- On complete → `/dashboard`.

---

## 6. Dashboard — `/dashboard`

- **Type:** Protected
- **File:** `frontend/src/pages/Dashboard.jsx` (~161 lines) — orchestrator over 6 sub-components.
- **Data hook:** `useDashboardData()` → loading, error, needsOnboarding, savedTrips, collaborativeTrips, priceAlerts, nextTrip, actionItems, heroContext, insights, refetch, helpers.

**Page-level behavior:**
- Redirects to `/onboarding` if `needsOnboarding`.
- Global hard-error state (EmptyState + Réessayer).
- Initial blocking loader when nothing to show yet.
- `hasAnyTrip` = saved + collaborative > 0.

**Sub-components:**

### 6a. HeroGreeting (`components/dashboard/HeroGreeting.jsx`, ~116 lines)
- Time-of-day greeting with first name.
- Variants: `countdown` / `decisions` / `priceDrop` / `empty` driving headline + primary/secondary CTAs.
- Primary CTA routes by variant (scroll to actions, open next trip, open price alert deeplink, or create trip).

### 6b. ActionCenter (`components/dashboard/ActionCenter.jsx`, ~185 lines)
- "À faire maintenant" — urgency-sorted action items.
- Types: `group-invite`, `vote-pending`, `price-drop`, `upcoming-trip-incomplete`, `ai-window-suggestion` (each with icon + tone).
- Swipeable rows (`useSwipe`): swipe-left = dismiss, swipe-right = act (mobile).
- Per-row CTA button (desktop).
- ⚠️ Dismiss is **client-side only** (session) — `/api/action-center/dismiss` not yet implemented.
- Loading skeleton, error retry, empty states.
- Hidden entirely if `hasAnyTrip` && no items; new-user empty state (Explorer CTA) if no trips.

### 6c. NextTripSpotlight (`components/dashboard/NextTripSpotlight.jsx`, ~193 lines)
- "Ton prochain départ".
- No-trip suggestion variant vs trip variant.
- PhotoBlock hero, countdown (daysUntil), weather, airport route.
- Readiness checklist: flight / hotel / itinerary / packing (via helpers).
- Step-aware primary CTA + PDF + Share actions.

### 6d. TripsSection (`components/dashboard/TripsSection.jsx`, ~475 lines)
- "Mes trips" — merges solo + group trips.
- Filters: temporal / type / sort / search (search input appears when >6 trips).
- TripCard: badges (J−n / Action requise / Passé), AvatarStack, hover action tray + mobile action sheet (alert / pdf / share / duplicate).
- Pagination (PAGE_SIZE = 12).
- `normalizeGroupDest` helper for nested finalDestination.
- Empty states; per-card open routes to `/saved-trips/:id` or `/trips/:id`.

### 6e. InsightsRow (`components/dashboard/InsightsRow.jsx`, ~51 lines)
- "Tes habitudes, en pistes".
- Link cards with keyword-highlighted headlines.
- Renders null if no insights.

### 6f. PriceAlertsPreview (`components/dashboard/PriceAlertsPreview.jsx`, ~116 lines)
- "Alertes de prix".
- `computeTrend` down/up/flat (±5% thresholds).
- Sort: triggered-first, then closest-to-target; top 3.
- Rows link to `/price-alerts`; "Tout voir →".
- Empty state (create from a saved trip).

---

## 7. Create trip — `/create-trip`

- **Type:** Protected
- **File:** `frontend/src/pages/CreateTrip.jsx` (~1194 lines)

**Features:**
- Search form: destination autocomplete, dates, travelers, budget, trip type.
- Custom free-text request (`travelVibeDescription`).
- `SearchUsageWidget` (plan limits, monthly usage).
- Bilingual via `t()`.
- Submit → POST `/api/travel/recommendations` (SSE streaming) → navigate to results.
- Blocks search when plan limit reached (upgrade prompt).
- `Promise.all` guarded per-promise (`.catch(() => null)`).

---

## 8. Results — `/results` and `/results/:searchId`

- **Type:** Protected
- **File:** `frontend/src/pages/Results.jsx` (~1399 lines)

**Features:**
- Renders recommendation results (from SSE stream or `location.state`).
- Group-trip mode: when `location.state.forGroupTrip` set, results feed a collaborative trip proposal flow.
- TripCard list with flight/hotel/pricing, affiliate links (Skyscanner/Booking via `wrapAffiliate`).
- Save trip action.
- **Price alert button** directly on result cards.
- Animated loading states (streaming phrases) while SSE arrives.
- Day-by-day itinerary preview where available.

---

## 9. Saved trip detail — `/saved-trips/:id`

- **Type:** Protected (solo trip)
- **File:** `frontend/src/pages/SavedTripDetail.jsx` (~1517 lines)

**Features:**
- Editorial layout for a saved solo trip.
- Data: GET `/api/searches/trips/saved` (find by id) + parallel `/api/trips/:id/weather|packing|itinerary|events`.
- Sticky summary bar on scroll > 460px.
- Hero + price card (price-drop ping, "Tout réserver" master CTA).
- `buildReasons` band (why this trip fits).
- FlightTicket (Kayak-style), HotelCard (gallery / amenities / booking link).
- Itinerary: DayStrip + MagazineDay + ProgramStep.
- PackingCard, WeatherCard, EventsCard.
- Actions:
  - **Invite to group** → POST `/api/trips/from-saved/:id` (+ `/invitations`) → navigate `/trips/:id`.
  - **Export PDF** (lazy-loaded ItineraryPDF).
  - **Delete** → DELETE `/api/searches/trips/:id`.
  - **Create price alert** → POST `/api/price-alerts`.
- Uses `t()` + `useFormat`.

---

## 10. Trip detail (group) — `/trips/:id`

- **Type:** Protected (collaborative trip)
- **File:** `frontend/src/pages/TripDetail.jsx` (~2620 lines)

**Page-level:**
- GET `/api/trips/:id`. Guest session from `localStorage`.
- Lifecycle states: `isPlanning` / `isVoting` / `isConfirmed`.
- 6 tabs: **Overview / Participants / Chat / Expenses / Checklist / Settings**.
- Imports `JourneyRibbon` (new, untracked) + `GroupTripOverview` (modified) from `components/group/`.

**Tab features:**

### Overview
- `GroupTripOverview` + `JourneyRibbon`.
- **PlanningSection:** GET `/api/trips/:id/group-preferences`; AI or custom search → POST `/api/travel/recommendations` → navigate `/results` with `{recommendations, forGroupTrip: trip.id}`.
- **VotingSection:** ranked vote (rank1=5, rank2=3, rank3=1 pts); POST `/api/trips/:id/vote`; real-time `trip-update` window events; creator finalize → POST `/api/trips/:id/finalize-vote`; ProposalDetailModal; FlightLeg.
- Confirmed: TripEnhancementsSection (below).

### Participants
- Members list + booking badges.
- Pending invitations.
- FriendsManager.

### Chat
- `TripChat` (embedded + floating).
- `@assistant` mention support.

### Expenses
- `TripExpenses` (Tricount-style splitting, balances, settlement).

### Checklist
- MyBookingCard → PATCH `/api/trips/:id/booking-status`.
- Group booking status overview.
- BookingChecklistSection → POST `/api/trips/:id/reminders`.
- BookingChecklistCard.

### Settings
- `TripSettingsTab` → PATCH `/api/trips/:id` (name / maxMembers / voteDeadline / requireAllVotes); creator-only.
- Danger zone: delete trip.

**TripEnhancementsSection (confirmed trips):**
- Weather + events fetch.
- SSE itinerary stream `/api/trips/:id/itinerary/stream` (events: status/day/packing/complete/error).
- WeatherForecastCard, PackingTipsCard, PersonalizedItineraryCard, LocalEventsCard.

---

## 11. Price alerts — `/price-alerts`

- **Type:** Protected
- **File:** `frontend/src/pages/PriceAlerts.jsx` (~432 lines)

**Features:**
- CRUD list of price alerts (CRUD via `/api/price-alerts`).
- Target price, current price, trend, threshold.
- Pause / resume alerts.
- Manual "check price now" button.
- Price history (last 30 checks).
- Push-notification toggle (`usePushNotifications`).
- Empty state.
- Plan limits: FREE 3 / EXPLORER 10 / WANDERER unlimited.

---

## 12. Account — `/account`

- **Type:** Protected
- **File:** `frontend/src/pages/Account.jsx` (~1013 lines)

**Features (4 tabs):**

### Profile
- Clerk avatar / name / email.
- Weekly digest toggle (POST `/api/users/digest-optin|digest-optout`).

### Preferences
- whyTravel / mainGoal / globalStyle / topActivities / idealRhythm.
- GET/PUT `/api/users/preferences`.

### Availability
- tripsPerYear, departureFlexibility, preferredAirports.
- annualLeaveDays / takenLeaveDays (+ remaining-days calc).
- avgTripDuration.
- Google Calendar connect/disconnect (`/api/calendar/status|oauth/authorize|disconnect`).

### Subscription
- Plan, usage (searchesThisMonth / groupTripsCreated), billing period, features list.
- Manage billing (POST `/api/billing/portal`) or upgrade.
- GET `/api/billing/subscription`.

---

## 13. Pricing — `/pricing`

- **Type:** Protected
- **File:** `frontend/src/pages/Pricing.jsx` (~916 lines)

**Features:**
- Plan comparison (FREE / EXPLORER / WANDERER).
- Feature matrix per tier.
- Stripe Checkout (POST `/api/billing/checkout`).
- Current-plan highlight.
- Upgrade / manage CTAs.

---

## 14. Trip proposal — `/trip-proposal`

- **Type:** Protected
- **File:** `frontend/src/pages/TripProposal.jsx` (~296 lines)

**Features:**
- Standalone proposal view (shareable trip proposal).
- Renders trip data (destination, dates, pricing, flight/hotel).
- CTA to convert into a saved/group trip.

---

## Summary Table

| # | Route | Page | Type |
|---|-------|------|------|
| 1 | `/` | Landing | Public |
| 2 | `/destinations` | Destinations | Public (SEO) |
| 3 | `/destination/:slug` | DestinationLanding | Public (SEO) |
| 4 | `/accept-invitation/:token` | AcceptInvitation | Public (invite) |
| 5 | `/onboarding` | Onboarding | Semi-protected |
| 6 | `/dashboard` | Dashboard (6 sub-components) | Protected |
| 7 | `/create-trip` | CreateTrip | Protected |
| 8 | `/results`, `/results/:searchId` | Results | Protected |
| 9 | `/saved-trips/:id` | SavedTripDetail | Protected |
| 10 | `/trips/:id` | TripDetail (6 tabs) | Protected |
| 11 | `/price-alerts` | PriceAlerts | Protected |
| 12 | `/account` | Account (4 tabs) | Protected |
| 13 | `/pricing` | Pricing | Protected |
| 14 | `/trip-proposal` | TripProposal | Protected |

**Gaps noted:**
- `/privacy` and `/terms` are linked but have no page components (catch-all → `/`).
- ActionCenter dismiss is client-side only (no backend endpoint yet).
