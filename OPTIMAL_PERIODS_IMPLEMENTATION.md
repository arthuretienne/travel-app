# Optimal Travel Periods - Implementation Guide

## Overview

The Optimal Travel Periods feature provides AI-powered date recommendations displayed on the Dashboard as a widget. When users create trips without specifying dates, the system silently uses these cached optimal periods to maximize savings.

## Architecture

### 1. Database Model

**OptimalPeriod** (`backend/prisma/schema.prisma`)

```prisma
model OptimalPeriod {
  id                 String   @id @default(cuid())
  userId             String
  type               String   // "short" or "long"
  startDate          DateTime
  endDate            DateTime
  duration           Int
  title              String
  reason             String
  savings            String   // e.g., "30%"
  confidence         Int      // 0-100
  priceMultiplier    Float    // e.g., 0.70
  leaveDaysRequired  Int
  canAfford          Boolean
  season             String?
  events             String[]
  tags               String[]
  weatherScore       Int?
  generatedAt        DateTime @default(now())
  expiresAt          DateTime // 24-hour expiry

  @@index([userId, type])
  @@index([userId, expiresAt])
}
```

### 2. Backend API

**Endpoint**: `GET /api/dates/intelligent`

**Location**: `backend/src/routes/dates.js`

**Caching Logic**:
1. Check for valid cached periods (not expired)
2. If found → return cached data (`fromCache: true`)
3. If not found → generate fresh periods
4. Cache new periods with 24-hour expiry
5. Return fresh data (`fromCache: false`)

**Cache Duration**: 24 hours

**Response Format**:
```json
{
  "success": true,
  "data": {
    "short": [
      {
        "id": "clx...",
        "startDate": "2025-01-24",
        "endDate": "2025-01-27",
        "duration": 3,
        "title": "🚀 Weekend prolongé",
        "reason": "Partez du vendredi au lundi...",
        "savings": "20%",
        "confidence": 90,
        "leaveDaysRequired": 1,
        "canAfford": true,
        "tags": ["court-terme", "week-end", "prix-bas"]
      }
    ],
    "long": [...],
    "leaveDaysInfo": {
      "total": 25,
      "remaining": 18
    },
    "metadata": {
      "fromCache": true,
      "generatedAt": "2025-01-18T10:00:00Z"
    }
  }
}
```

### 3. Frontend Widget

**Component**: `OptimalPeriodsWidget.jsx`

**Location**: `frontend/src/components/OptimalPeriodsWidget.jsx`

**Features**:
- Displays 2 blocks: short-term and long-term
- Shows savings, confidence, duration metrics
- Leave days calculation
- Countdown to trip ("In 5 days", "In 2 weeks")
- Events and tags
- Responsive design

**Styling**: `OptimalPeriodsWidget.css`
- Gradient backgrounds
- Hover animations
- Mobile-responsive grid

**Integration**: Dashboard.jsx
```jsx
import { OptimalPeriodsWidget } from '../components/OptimalPeriodsWidget';

// In render:
<OptimalPeriodsWidget />
```

### 4. Silent Date Integration

**Location**: `backend/src/routes/travel.js`

**Logic** (Step 1.75):

```javascript
// Check if user provided dates
const hasUserProvidedDates = userProfile.availability?.startDate && userProfile.availability?.endDate;

if (!hasUserProvidedDates) {
  // Fetch cached optimal periods
  const cachedOptimalPeriods = await prisma.optimalPeriod.findMany({
    where: {
      userId: req.user.id,
      expiresAt: { gte: new Date() }
    },
    orderBy: { confidence: 'desc' }
  });

  // Select best period based on trip duration
  const tripDuration = userProfile.availability?.duration || 7;
  const bestPeriod = tripDuration <= 4
    ? shortTermCached[0]
    : longTermCached[0];

  // Inject into userProfile
  userProfile.availability.startDate = bestPeriod.startDate;
  userProfile.availability.endDate = bestPeriod.endDate;
  userProfile.availability.duration = bestPeriod.duration;
}
```

**Decision Tree**:
- User provides dates → Use user dates
- No dates + cache exists → Use cached optimal period
- No dates + no cache → Fall back to Claude date generation

**Period Selection**:
- Trip duration ≤ 4 days → Prefer short-term period
- Trip duration > 4 days → Prefer long-term period
- Fallback to any available period if preferred type missing

## User Experience

### Dashboard View

```
┌─────────────────────────────────────────────────────┐
│  📅 Best Times to Travel                            │
│  Personalized recommendations based on preferences  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🚀 Short Term                   🎯 Long Term      │
│  ┌───────────────────┐          ┌─────────────────┐│
│  │ Weekend prolongé  │          │ Printemps opt.  ││
│  │ Jan 24 - Jan 27   │          │ Mar 15 - Mar 22 ││
│  │ In 6 days         │          │ In 2 months     ││
│  │                   │          │                 ││
│  │ 💰 20%  📅 3d  ✨90% │       │ 💰 25%  📅 7d  ✨92%││
│  │                   │          │                 ││
│  │ 💼 1 leave day    │          │ 💼 5 leave days ││
│  │                   │          │                 ││
│  │ Partez du vendredi│          │ Météo idéale... ││
│  │ au lundi...       │          │                 ││
│  │                   │          │ 🎉 Cherry blos. ││
│  │ #court-terme      │          │                 ││
│  │ #week-end #prix-bas│         │ #météo-idéale   ││
│  └───────────────────┘          └─────────────────┘│
│                                                     │
│  📊 You have 18 leave days remaining out of 25     │
└─────────────────────────────────────────────────────┘
```

### CreateTrip Flow

**Visible to user**: Standard CreateTrip form (dates optional)

**Behind the scenes**:
1. User doesn't fill dates
2. System checks cached optimal periods
3. Best period selected based on trip duration
4. Dates injected into Claude + Amadeus workflow
5. Results show optimized prices automatically

**User never sees**: The fact that cached periods are being used

## Data Flow

```
User visits Dashboard
         ↓
OptimalPeriodsWidget.jsx fetches /api/dates/intelligent
         ↓
Backend checks cache
         ↓
    ┌─── Cache valid? ───┐
    │                    │
   YES                  NO
    │                    │
Return cached      Generate fresh
    │              Save to DB (24h expiry)
    │                    │
    └────────────────────┘
              ↓
     Display widget on Dashboard

---

User creates trip WITHOUT dates
         ↓
Backend /api/travel/recommendations
         ↓
Check userProfile.availability.startDate
         ↓
    ┌─── Dates provided? ───┐
    │                        │
   YES                      NO
    │                        │
Use user dates      Check cached periods
    │                        │
    │                Select best period
    │                Inject into userProfile
    │                        │
    └────────────────────────┘
              ↓
     Claude generates destinations with optimal dates
              ↓
     Amadeus searches flights for those dates
              ↓
     Return maximized savings
```

## Maintenance

### Cache Expiry

**Current**: 24 hours

**Location**: `backend/src/routes/dates.js:106`

```javascript
const expiresAt = new Date(today);
expiresAt.setHours(expiresAt.getHours() + 24);
```

**To change**: Modify the hours value (e.g., 48 for 2 days)

### Manual Cache Refresh

Delete all cached periods for a user:

```sql
DELETE FROM "OptimalPeriod" WHERE "userId" = 'user_xxx';
```

Force regeneration for all users:

```sql
DELETE FROM "OptimalPeriod";
```

### Monitoring

Check cache status:

```sql
-- Active cached periods
SELECT "userId", "type", COUNT(*) as count, MAX("expiresAt") as expires
FROM "OptimalPeriod"
WHERE "expiresAt" > NOW()
GROUP BY "userId", "type";

-- Expired periods (should be auto-cleaned)
SELECT COUNT(*) FROM "OptimalPeriod" WHERE "expiresAt" < NOW();
```

## Future Enhancements (Not Implemented)

### Cron Job for Daily Updates

**Current**: Cache refreshes on-demand when user visits Dashboard

**Future**: Daily cron job to pre-generate periods for all users

**Implementation suggestion**:
```javascript
// backend/src/jobs/updateOptimalPeriods.js
import prisma from '../db/prisma.js';

export async function updateAllOptimalPeriods() {
  const users = await prisma.user.findMany({
    include: { preferences: true }
  });

  for (const user of users) {
    // Generate and cache periods
    await generateAndCacheOptimalPeriods(user.id);
  }
}
```

**Scheduling options**:
- Node-cron
- Railway cron jobs
- GitHub Actions (scheduled workflows)

### Anthropic AI Integration

**Current**: Periods generated using temporal optimization logic

**Future**: Use Anthropic Claude API to generate personalized period recommendations

**Benefits**:
- Consider user personality (planner vs spontaneous)
- Analyze past trip patterns
- Cultural event recommendations
- Weather preferences
- More nuanced reasoning

## Testing

### Test Cached Periods

1. Visit Dashboard → Should see widget with 2 periods
2. Check browser network tab → Should see `/api/dates/intelligent` call
3. Refresh page → Should see `fromCache: true` in response
4. Wait 24+ hours → Should regenerate fresh periods

### Test Silent Integration

1. Create trip WITHOUT filling date fields
2. Check backend logs → Should see "Using cached optimal period"
3. Results should show optimal dates
4. Repeat with dates filled → Should use user dates

## Troubleshooting

### Widget shows "Unable to load"

**Check**:
1. User has completed onboarding
2. Database connection working
3. OptimalPeriod table exists
4. Browser console for errors

### No periods generated

**Check**:
1. User preferences exist
2. avgTripDuration is set
3. Backend logs for errors
4. Leave days configured

### Silent integration not working

**Check**:
1. User didn't provide dates in CreateTrip
2. Cached periods exist and not expired
3. Backend logs show "Using cached optimal period"
4. userProfile.availability being set correctly

## Deployment

### Railway (Backend)

1. Push to GitHub
2. Railway auto-deploys
3. Prisma migrations auto-run
4. New OptimalPeriod table created

### Vercel (Frontend)

1. Push to GitHub
2. Vercel auto-deploys
3. New components bundled automatically

### Database Migration

Already pushed with `prisma db push`:
```bash
✔ Database schema updated
✔ OptimalPeriod table created
✔ Indexes added
```

## Summary

✅ **Completed**:
- Database model with caching
- Backend API with 24h cache
- Dashboard widget display
- Silent date integration
- All changes deployed to production

⏳ **Future** (User requested but not implemented):
- Daily cron job for pre-generation
- Anthropic AI integration for smarter recommendations

🎯 **Key Achievement**: Users now see optimal periods on Dashboard and benefit from automatic date optimization when creating trips, all happening transparently in the background.
