# Plan d'Implémentation - Voyages Collaboratifs

## 🎯 Objectif
Ajouter des voyages collaboratifs SANS remplacer les solo trips. Les deux coexistent :
- **SavedTrip** : Voyages solo/wishlist personnels (EXISTANT - ON GARDE)
- **CollaborativeTrip** : Voyages de groupe avec invitations, votes, etc. (NOUVEAU)

## 📊 Architecture Database

### Nouveaux Models Prisma

```prisma
// ========================================
// COLLABORATIVE TRIPS
// ========================================

model CollaborativeTrip {
  id        String   @id @default(cuid())
  creatorId String
  creator   User     @relation("CreatedTrips", fields: [creatorId], references: [id])

  // Trip metadata
  name           String   // "Voyage à Tokyo"
  coverImageUrl  String?  // Photo destination

  // Origin - converted from solo trip or created from scratch
  originSavedTripId String?  // If converted from SavedTrip
  convertedSavedTrips SavedTrip[] // Link back to solo trips

  // Status workflow
  status String // "draft" | "inviting" | "voting" | "destination_selected" | "booking" | "confirmed" | "cancelled"

  // Voting deadline
  voteDeadline DateTime?

  // Final validated data (après vote)
  finalDestination   Json?    // Selected destination details
  finalStartDate     DateTime?
  finalEndDate       DateTime?
  finalDuration      Int?
  finalBudgetPerPerson Float?

  // Settings
  maxMembers      Int @default(8)
  requireAllVotes Boolean @default(false) // Forcer tous les votes ?

  // Relations
  members       TripMember[]
  invitations   TripInvitation[]
  votes         TripVote[]
  messages      TripMessage[]
  proposedTrips ProposedDestination[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([creatorId])
  @@index([status])
}

model TripMember {
  id     String @id @default(cuid())
  tripId String
  trip   CollaborativeTrip @relation(fields: [tripId], references: [id], onDelete: Cascade)

  userId String?  // Null si guest
  user   User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  // Guest info (si pas de compte)
  guestEmail String?
  guestName  String?

  // Role
  role String // "organizer" | "member" | "guest"

  // Booking status
  hasBookedFlight  Boolean @default(false)
  hasBookedHotel   Boolean @default(false)
  bookingConfirmed Boolean @default(false)

  // Preferences pour matching
  availableDates   Json? // Plages de dates dispo
  budgetRange      Json? // {min, max}
  preferredActivities String[]

  joinedAt  DateTime @default(now())
  lastSeenAt DateTime @default(now())

  @@unique([tripId, userId])
  @@unique([tripId, guestEmail])
  @@index([tripId])
  @@index([userId])
}

model TripInvitation {
  id     String @id @default(cuid())
  tripId String
  trip   CollaborativeTrip @relation(fields: [tripId], references: [id], onDelete: Cascade)

  // Invité
  email      String
  invitedBy  String // userId of inviter
  inviter    User   @relation(fields: [invitedBy], references: [id])

  // Token sécurisé
  token  String @unique @default(cuid())

  // Status
  status String // "pending" | "accepted" | "declined" | "expired"

  // Metadata
  message String? // Message perso de l'inviteur
  expiresAt DateTime
  respondedAt DateTime?

  createdAt DateTime @default(now())

  @@index([tripId])
  @@index([email])
  @@index([token])
}

model ProposedDestination {
  id     String @id @default(cuid())
  tripId String
  trip   CollaborativeTrip @relation(fields: [tripId], references: [id], onDelete: Cascade)

  // Link to saved trip
  savedTripId String?
  savedTrip   SavedTrip? @relation(fields: [savedTripId], references: [id], onDelete: SetNull)

  // Proposé par
  proposedBy String
  proposer   User   @relation(fields: [proposedBy], references: [id])

  // Destination data (peut être custom ou from SavedTrip)
  city    String
  country String

  startDate DateTime
  endDate   DateTime
  duration  Int

  // Pricing
  estimatedCostPerPerson Float
  currency String @default("EUR")

  // Match score avec le groupe
  groupMatchScore Float? // 0-100

  // Full trip data
  tripData Json

  createdAt DateTime @default(now())

  @@index([tripId])
  @@index([proposedBy])
}

model TripVote {
  id     String @id @default(cuid())
  tripId String
  trip   CollaborativeTrip @relation(fields: [tripId], references: [id], onDelete: Cascade)

  userId String
  voter  User   @relation(fields: [userId], references: [id])

  // Vote ranking
  destinationId String
  destination   ProposedDestination @relation(fields: [destinationId], references: [id], onDelete: Cascade)

  rank Int // 1 = préféré, 2 = 2ème choix, etc.

  // Vote details
  comment String? // Pourquoi ce choix

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([tripId, userId, destinationId])
  @@index([tripId])
  @@index([userId])
}

model TripMessage {
  id     String @id @default(cuid())
  tripId String
  trip   CollaborativeTrip @relation(fields: [tripId], references: [id], onDelete: Cascade)

  authorId String?
  author   User?  @relation(fields: [authorId], references: [id], onDelete: SetNull)

  // Guest author
  guestName String?

  content String
  type    String @default("message") // "message" | "system" | "vote_update"

  createdAt DateTime @default(now())

  @@index([tripId, createdAt])
}

// ========================================
// FRIENDS SYSTEM
// ========================================

model Friendship {
  id String @id @default(cuid())

  userId   String
  user     User   @relation("UserFriendships", fields: [userId], references: [id], onDelete: Cascade)

  friendId String
  friend   User   @relation("FriendOf", fields: [friendId], references: [id], onDelete: Cascade)

  status String // "pending" | "accepted" | "declined" | "blocked"

  requestedBy String // userId qui a initié

  createdAt DateTime @default(now())
  acceptedAt DateTime?

  @@unique([userId, friendId])
  @@index([userId])
  @@index([friendId])
}
```

### Modifications User Model

```prisma
model User {
  // ... existing fields

  // New relations
  createdTrips     CollaborativeTrip[] @relation("CreatedTrips")
  tripMemberships  TripMember[]
  invitationsSent  TripInvitation[]
  proposedDestinations ProposedDestination[]
  votes            TripVote[]
  messages         TripMessage[]
  friendships      Friendship[] @relation("UserFriendships")
  friendOf         Friendship[] @relation("FriendOf")
}
```

### Modifications SavedTrip Model

```prisma
model SavedTrip {
  // ... existing fields (NO CHANGES TO EXISTING STRUCTURE)

  // New optional relation - link to collaborative trip if converted
  collaborativeTripId String?
  collaborativeTrip   CollaborativeTrip? @relation(fields: [collaborativeTripId], references: [id])

  // New relation - can be proposed in group trips
  proposedIn ProposedDestination[]
}
```

**Important**: SavedTrip reste inchangé pour les solos. On ajoute juste des relations optionnelles.

## 🎯 Flow Utilisateur

### 1A. Solo Trip (Existant - Inchangé)
```
User save un résultat de recherche →
SavedTrip créé (status: "wishlist") →
Visible dans Dashboard "My Saved Trips" →
Option: "Convert to Group Trip"
```

### 1B. Création Voyage Collaboratif (Nouveau)
```
Option 1: From scratch
  Dashboard → "Create Group Trip" →
    - Nom du voyage
    - Photo (optionnel)
    - Inviter des amis/emails
    → CollaborativeTrip créé (status: "inviting")

Option 2: From SavedTrip
  SavedTrip card → "Share with friends" →
    - Auto-rempli avec destination/dates
    - Inviter des amis
    → CollaborativeTrip créé + lien SavedTrip
```

### 2. Invitations
```
User reçoit email → Clique lien →
  Si compte: Accepte direct
  Si pas compte: Mode guest → Peut créer compte plus tard
  → Devient TripMember
```

### 3. Proposition Destinations
```
Chaque membre voit ses SavedTrips pertinents →
Peut en sélectionner (1 si >5 membres, plusieurs si moins) →
Système calcule groupMatchScore →
Toutes les destinations proposées apparaissent
```

### 4. Vote
```
Phase vote ouverte (deadline optionnelle) →
Chaque membre classe 3 destinations (1er, 2e, 3e choix) →
Algorithme pondéré calcule winner →
Organisateur peut valider ou forcer →
Status → "destination_selected"
```

### 5. Booking
```
Affichage liens affiliation (vols, hôtels, activités) →
Checklist par membre:
  ☐ Vol réservé
  ☐ Hôtel réservé
  → Bouton "Marquer comme fait"
Organisateur peut send reminders →
Quand tous validés → Status "confirmed"
```

## 📱 Pages Frontend

### A. `/trips` - Liste voyages (NOUVEAUX - Group Trips)
- Mes voyages de groupe (créateur)
- Invitations en attente
- Voyages de groupe où je suis membre
- Filtres par status

**Note**: Les SavedTrips (solo) restent dans le Dashboard actuel sous "My Saved Trips"

### B. `/trips/:id` - Détail voyage

**Onglets:**
1. **Overview**
   - Cover image
   - Membres (avatars)
   - Status badge
   - Timeline du voyage
   - Boutons actions (selon status)

2. **Destinations** (Phase vote)
   - Grid des destinations proposées
   - Système de ranking
   - Vote deadline countdown
   - Résultats votes (après)

3. **Booking** (Après validation)
   - Liens d'affiliation
   - Checklist par membre
   - Bouton reminder
   - Infos pratiques

4. **Chat**
   - Messages temps réel
   - Notifications votes/updates

5. **Members**
   - Liste membres
   - Inviter plus
   - Gérer permissions (organizer only)

### C. `/trips/:id/invite/:token` - Accepter invitation
- Preview du voyage
- Login ou guest mode
- Accepter/Décliner

### D. `/friends` - Gestion amis
- Liste amis
- Demandes en attente
- Rechercher/inviter

## 🔌 API Endpoints

### Trips
```
POST   /api/trips                    # Create trip
GET    /api/trips                    # List user trips
GET    /api/trips/:id                # Get trip details
PATCH  /api/trips/:id                # Update trip
DELETE /api/trips/:id                # Delete trip
POST   /api/trips/:id/leave          # Leave trip
```

### Invitations
```
POST   /api/trips/:id/invite         # Send invitation
GET    /api/trips/:id/invitations    # List invitations
POST   /api/invitations/:token       # Accept/decline
DELETE /api/invitations/:id          # Cancel invitation
```

### Destinations
```
GET    /api/trips/:id/suggested-destinations  # Get user's relevant saved trips
POST   /api/trips/:id/destinations            # Propose destination
DELETE /api/trips/:id/destinations/:destId    # Remove proposal
```

### Votes
```
POST   /api/trips/:id/vote           # Submit vote ranking
GET    /api/trips/:id/votes          # Get all votes
GET    /api/trips/:id/vote-results   # Calculate winner
POST   /api/trips/:id/confirm-destination # Organizer validates
```

### Booking
```
PATCH  /api/trips/:id/members/:memberId/booking # Update booking status
POST   /api/trips/:id/remind-member              # Send reminder email
GET    /api/trips/:id/affiliate-links            # Get booking links
```

### Messages
```
GET    /api/trips/:id/messages       # Get chat history
POST   /api/trips/:id/messages       # Send message
```

### Friends
```
GET    /api/friends                  # List friends
POST   /api/friends/request          # Send friend request
POST   /api/friends/:id/accept       # Accept request
POST   /api/friends/:id/decline      # Decline request
DELETE /api/friends/:id              # Remove friend
```

## 🎨 Composants UI Prioritaires

1. **TripCard** - Card pour liste voyages
2. **TripHeader** - Header page détail
3. **MemberList** - Liste avatars membres
4. **InvitationModal** - Modal inviter amis
5. **DestinationProposal** - Card destination à voter
6. **VoteRanking** - Système drag & drop ranking
7. **BookingChecklist** - Checklist réservations
8. **TripChat** - Chat component
9. **StatusBadge** - Badge status voyage
10. **AffiliateLinks** - Boutons booking avec liens

## 📧 Emails (SendGrid)

### Templates nécessaires:
1. **trip-invitation** - Invitation voyage
2. **vote-reminder** - Rappel voter
3. **destination-confirmed** - Destination validée
4. **booking-reminder** - Rappel réserver
5. **trip-update** - Update voyage
6. **friend-request** - Demande ami

## 🔒 Permissions & Sécurité

### Roles:
- **Organizer**: Créateur, tous les droits
- **Member**: Peut voter, chatter, proposer destinations
- **Guest**: Droits limités, peut devenir member

### Actions restreintes:
- Delete trip: Organizer only
- Kick member: Organizer only
- Force validation: Organizer only
- Change status: Organizer only

## 📊 Algorithmes

### 1. Group Match Score
```javascript
function calculateGroupMatchScore(destination, members) {
  const scores = {
    dateMatch: 0,      // 30%
    budgetMatch: 0,    // 25%
    activityMatch: 0,  // 20%
    durationMatch: 0,  // 15%
    securityMatch: 0   // 10%
  };

  // Pour chaque membre, calculer compatibilité
  members.forEach(member => {
    // Date overlap
    if (isDateInRange(destination.dates, member.availableDates)) {
      scores.dateMatch += 1;
    }

    // Budget fit
    if (destination.cost <= member.budgetRange.max) {
      scores.budgetMatch += 1;
    }

    // Activities overlap
    const commonActivities = intersection(
      destination.activities,
      member.preferredActivities
    );
    scores.activityMatch += commonActivities.length / destination.activities.length;

    // Duration match
    if (destination.duration === member.preferredDuration) {
      scores.durationMatch += 1;
    }

    // Security requirements (éliminatoire)
    if (member.avoidCountries.includes(destination.country)) {
      return 0; // Éliminatoire
    }
  });

  // Normaliser et pondérer
  const total = (
    (scores.dateMatch / members.length) * 30 +
    (scores.budgetMatch / members.length) * 25 +
    (scores.activityMatch / members.length) * 20 +
    (scores.durationMatch / members.length) * 15 +
    10 // Base security score
  );

  return Math.round(total);
}
```

### 2. Vote Winner Algorithm
```javascript
function calculateVoteWinner(votes, destinations) {
  const scores = {};

  destinations.forEach(dest => {
    scores[dest.id] = 0;
  });

  // Points pondérés: 1er choix = 3pts, 2e = 2pts, 3e = 1pt
  votes.forEach(vote => {
    const points = 4 - vote.rank; // rank 1 = 3pts, rank 2 = 2pts, rank 3 = 1pt
    scores[vote.destinationId] += points;
  });

  // Ajouter bonus group match score
  destinations.forEach(dest => {
    scores[dest.id] += dest.groupMatchScore * 0.1;
  });

  // Trouver winner
  const winner = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)[0];

  return {
    winnerId: winner[0],
    score: winner[1],
    allScores: scores
  };
}
```

## ⏱️ Estimation Implémentation

### Phase 1: Database & Backend (4-6h)
- [ ] Prisma models + migration (1h)
- [ ] API endpoints trips (1.5h)
- [ ] API invitations (1h)
- [ ] API votes (1h)
- [ ] API messages (0.5h)
- [ ] SendGrid setup (1h)

### Phase 2: Page Détail Voyage (3-4h)
- [ ] Trip detail page structure (1h)
- [ ] Members section (0.5h)
- [ ] Status workflow UI (1h)
- [ ] Invitation modal (0.5h)
- [ ] Basic styling (1h)

### Phase 3: Système Vote (2-3h)
- [ ] Destination proposal UI (1h)
- [ ] Vote ranking interface (1h)
- [ ] Results display (0.5h)
- [ ] Vote algorithms (0.5h)

### Phase 4: Booking & Affiliation (2h)
- [ ] Checklist UI (0.5h)
- [ ] Affiliate links integration (1h)
- [ ] Reminder system (0.5h)

### Phase 5: Chat (2h)
- [ ] Chat UI (1h)
- [ ] Real-time messages (1h)

### Phase 6: Friends System (2h)
- [ ] Friend list page (0.5h)
- [ ] Friend requests (0.5h)
- [ ] Integration in invites (1h)

**TOTAL ESTIMATED: 15-17 heures**

## 🚀 Ordre d'Implémentation

1. ✅ Database schema → Migration
2. ✅ Backend API (trips, invitations, votes basiques)
3. ✅ Page détail voyage + invitations
4. ✅ Système de vote
5. ✅ Booking checklist + liens
6. ✅ Chat
7. ✅ Friends system
8. ✅ Email notifications
9. ✅ Polish & testing

## 📝 Notes Additionnelles

### Features Secondaires (Post-MVP):
- Bloc météo destination
- "Que prendre dans sa valise"
- Événements/concerts destination
- Upload photos voyage
- Review après voyage
- Budget partagé/split costs
- Itinéraire jour par jour

### Optimisations futures:
- WebSocket pour chat temps réel
- Redis cache pour votes
- Push notifications mobile
- Export PDF itinéraire
- Intégration calendriers (Google/Outlook)
