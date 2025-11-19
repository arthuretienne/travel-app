# Solo Trips vs Collaborative Trips - Architecture

## 🎯 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
│                                                              │
│  ┌─────────────────────┐        ┌─────────────────────┐    │
│  │   SOLO TRIPS        │        │  COLLABORATIVE      │    │
│  │   (SavedTrip)       │        │  TRIPS              │    │
│  │                     │        │  (CollaborativeTrip)│    │
│  │  - Personal wishlist│        │  - Group planning   │    │
│  │  - Quick saves      │───────▶│  - Invitations      │    │
│  │  - No sharing       │Convert │  - Voting           │    │
│  │  - Individual       │        │  - Booking together │    │
│  └─────────────────────┘        └─────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Comparison Table

| Feature                    | SavedTrip (Solo)          | CollaborativeTrip (Group)    |
|----------------------------|---------------------------|------------------------------|
| **Purpose**                | Personal wishlist         | Group trip planning          |
| **Visibility**             | Private                   | Shared with members          |
| **Location in UI**         | Dashboard "Saved Trips"   | New `/trips` page            |
| **Decision Making**        | Individual                | Voting system                |
| **Invitations**            | ❌ No                     | ✅ Yes (email/friends)       |
| **Members**                | 1 (solo)                  | 2-8 people                   |
| **Status**                 | "wishlist"                | Complex workflow             |
| **Booking Links**          | Individual view           | Shared checklist             |
| **Chat**                   | ❌ No                     | ✅ Yes                       |
| **Convert to Group**       | ✅ Can convert            | ❌ Cannot revert             |
| **Database Model**         | `SavedTrip`               | `CollaborativeTrip`          |

## 🔄 Conversion Flow

```
SavedTrip (Solo)
    │
    │ User clicks "Share with Friends"
    │
    ▼
┌─────────────────────────┐
│  Conversion Modal       │
│  ┌───────────────────┐  │
│  │ Trip Name         │  │
│  │ Add Cover Image   │  │
│  │ Invite Friends    │  │
│  │ [Emails/Friends]  │  │
│  └───────────────────┘  │
│                         │
│  ⚠️  Note: This will    │
│  create a group trip.   │
│  Your solo trip stays.  │
│                         │
│  [Cancel] [Create Group]│
└─────────────────────────┘
    │
    ▼
CollaborativeTrip Created
    │
    ├─→ SavedTrip.collaborativeTripId = collabTripId
    ├─→ CollaborativeTrip.originSavedTripId = savedTripId
    └─→ Destination auto-proposed in voting
```

## 🗂️ Database Relations

```prisma
// Solo Trip (Existing - Unchanged core)
model SavedTrip {
  id     String @id
  userId String

  // Original fields (unchanged)
  city        String
  country     String
  startDate   DateTime
  endDate     DateTime
  status      String @default("wishlist")
  notes       String?
  tripData    Json

  // NEW: Optional group connection
  collaborativeTripId String?
  collaborativeTrip   CollaborativeTrip? @relation(fields: [collaborativeTripId], references: [id])

  // NEW: Can be proposed in group votes
  proposedIn ProposedDestination[]
}

// Group Trip (New)
model CollaborativeTrip {
  id        String @id
  creatorId String
  name      String
  status    String // workflow

  // Link back to origin if converted
  originSavedTripId String?
  convertedSavedTrips SavedTrip[]

  // Group features
  members       TripMember[]
  invitations   TripInvitation[]
  votes         TripVote[]
  messages      TripMessage[]
  proposedTrips ProposedDestination[]
}
```

## 📱 UI/UX Locations

### Dashboard (Existing - Enhanced)

```
┌────────────────────────────────────────────────┐
│ Dashboard                                       │
├────────────────────────────────────────────────┤
│                                                 │
│ [+ Create Trip]  [+ Create Group Trip] ← NEW   │
│                                                 │
│ My Saved Trips (Solo)                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ Paris    │ │ Tokyo    │ │ NYC      │        │
│ │ Dec 2025 │ │ Jan 2026 │ │ Mar 2026 │        │
│ │          │ │          │ │          │        │
│ │ [View]   │ │ [View]   │ │ [View]   │        │
│ │ [Share]← │ │ [Share]← │ │ [Share]← │  NEW   │
│ └──────────┘ └──────────┘ └──────────┘        │
│                                                 │
│ Group Trips (Quick View)                ← NEW  │
│ → See all in /trips                            │
│                                                 │
└────────────────────────────────────────────────┘
```

### New /trips Page (Group Trips)

```
┌────────────────────────────────────────────────┐
│ Group Trips                              [+ New]│
├────────────────────────────────────────────────┤
│                                                 │
│ 📍 Active (2)                                   │
│ ┌──────────────────────────────────────┐       │
│ │ 🌸 Tokyo Cherry Blossoms             │       │
│ │ 5 members • Voting phase             │       │
│ │ Deadline: 2 days left                │       │
│ └──────────────────────────────────────┘       │
│                                                 │
│ 📨 Invitations (1)                              │
│ ┌──────────────────────────────────────┐       │
│ │ ⛰️  Swiss Alps Ski Trip               │       │
│ │ Invited by John • 3 days ago         │       │
│ │ [Accept] [Decline]                   │       │
│ └──────────────────────────────────────┘       │
│                                                 │
│ ✅ Completed (3)                                │
│                                                 │
└────────────────────────────────────────────────┘
```

## 🔐 Key Rules

### SavedTrip (Solo)
1. ✅ Can exist independently forever
2. ✅ Can be converted to CollaborativeTrip
3. ✅ Original stays intact after conversion
4. ✅ Keeps all existing functionality
5. ✅ No breaking changes

### CollaborativeTrip (Group)
1. ✅ Can be created from scratch
2. ✅ Can be created from SavedTrip
3. ✅ Cannot revert to solo
4. ✅ Requires at least 1 member (creator)
5. ✅ Max 8 members for MVP

## 💡 Use Cases

### Use Case 1: Pure Solo Traveler
```
User → Create Trip → Save → Keep in Wishlist
(Never converts, uses only SavedTrip)
```

### Use Case 2: Solo → Group Converter
```
User → Create Trip → Save → Later: "Share with Friends"
→ Creates CollaborativeTrip
→ Both exist independently
```

### Use Case 3: Group from Scratch
```
User → "Create Group Trip" → Invite friends immediately
→ Only CollaborativeTrip exists
→ No SavedTrip involved
```

### Use Case 4: Mixed Usage
```
User has:
- 5 SavedTrips (solo wishlist)
- 2 CollaborativeTrips (group planning)
- 1 SavedTrip that became CollaborativeTrip (linked)
All coexist peacefully!
```

## ⚙️ Technical Implementation

### API Routes Separation

```javascript
// Solo trips (existing)
GET    /api/searches/trips/saved
POST   /api/searches/trips/:id/save
DELETE /api/searches/trips/:id

// Group trips (new)
GET    /api/trips                    # List collaborative
POST   /api/trips                    # Create collaborative
POST   /api/trips/from-saved/:id     # Convert from SavedTrip
GET    /api/trips/:id                # Get collaborative details
```

### Frontend Routes

```javascript
// Existing (unchanged)
/results/:searchId              // Search results
/dashboard                      // Shows SavedTrips

// New routes
/trips                          // List CollaborativeTrips
/trips/new                      // Create group trip
/trips/:id                      // Group trip detail
/trips/:id/invite/:token        // Accept invitation
```

## 📈 Migration Impact

### Database
- ✅ Zero breaking changes
- ✅ Only adds new tables
- ✅ Adds optional foreign keys to SavedTrip

### Backend
- ✅ Existing API unchanged
- ✅ New API routes for collaborative
- ✅ Backward compatible

### Frontend
- ✅ Existing pages work as-is
- ✅ New pages for collaborative
- ✅ Dashboard enhanced with "Share" button

### Users
- ✅ Existing saved trips untouched
- ✅ New features opt-in
- ✅ Can use both systems simultaneously
