// backend/scripts/seed_group_test.js
// DEV-ONLY: seed fake personas + two collaborative trips so the redesigned
// group-trip page (/trips/:id) can be reviewed without a real Clerk login.
//
// Run against the LOCAL Prisma Postgres only (never the cloud DB). The local
// `prisma dev` server exposes a raw Postgres URL on :51214. When the backend is
// also running, append `pgbouncer=true&connection_limit=1` to avoid the
// "prepared statement s0 already exists" (42P05) collision on the shared proxy:
//   DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&pgbouncer=true&connection_limit=1" \
//   NODE_ENV=development node scripts/seed_group_test.js
//
// Idempotent: re-running upserts the users and fully rebuilds their trips.
// All seeded users have an @skusku-test.dev email so cleanup can target them.

import prisma from '../src/db/prisma.js';

const TEST_DOMAIN = '@skusku-test.dev';

const avatar = (name, bg) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=128&bold=true`;

// ---- Personas -------------------------------------------------------------
const PERSONAS = [
  { key: 'lea', firstName: 'Léa', lastName: 'Moreau', bg: 'B85C38' },
  { key: 'tom', firstName: 'Tom', lastName: 'Bernard', bg: '5C7148' },
  { key: 'ines', firstName: 'Inès', lastName: 'Khelifi', bg: 'C9A227' },
  { key: 'hugo', firstName: 'Hugo', lastName: 'Lambert', bg: '7A3A25' },
  { key: 'sofia', firstName: 'Sofia', lastName: 'Rossi', bg: '4E6E5D' },
];

async function upsertPersonas() {
  const users = {};
  for (const p of PERSONAS) {
    const email = `${p.key}${TEST_DOMAIN}`;
    const fullName = `${p.firstName} ${p.lastName}`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        firstName: p.firstName,
        lastName: p.lastName,
        imageUrl: avatar(fullName, p.bg),
      },
      create: {
        clerkId: `dev_test_${p.key}`,
        email,
        firstName: p.firstName,
        lastName: p.lastName,
        imageUrl: avatar(fullName, p.bg),
      },
    });
    users[p.key] = user;
  }
  return users;
}

async function wipePriorTrips(userIds) {
  // Deleting the trips cascades to members, messages, votes, proposals,
  // invitations and expenses (see schema onDelete: Cascade).
  await prisma.collaborativeTrip.deleteMany({
    where: { creatorId: { in: userIds } },
  });
}

// ---- Trip A: confirmed group trip to Lisbon -------------------------------
async function seedConfirmedTrip(u) {
  const start = new Date('2026-09-12T00:00:00.000Z');
  const end = new Date('2026-09-19T00:00:00.000Z');

  const finalDestination = {
    // top-level (normalized) + nested (legacy) for maximum compatibility
    city: 'Lisbonne',
    country: 'Portugal',
    destination: {
      city: 'Lisbonne',
      country: 'Portugal',
      iataCode: 'LIS',
      photo: {
        url: 'https://images.pexels.com/photos/2549018/pexels-photo-2549018.jpeg?auto=compress&cs=tinysrgb&w=800',
      },
    },
    slot: { startDate: '2026-09-12', endDate: '2026-09-19', duration: 7 },
    // NOTE: GroupTripOverview computes perPerson = pricing.total / members, while
    // flight/hotel rows are shown raw as per-person figures. So `total` must be
    // the GROUP grand total (720/pers × 6 = 4320) for the numbers to be coherent.
    pricing: { total: 4320, flight: 180, hotel: 540, perPerson: 720 },
    flightDetails: {
      outbound: {
        airline: 'TAP Air Portugal',
        date: '12 sept',
        departureAirport: 'CDG',
        arrivalAirport: 'LIS',
        departureTime: '10:25',
        arrivalTime: '12:05',
        duration: '2h40',
      },
      return: {
        airline: 'TAP Air Portugal',
        date: '19 sept',
        departureAirport: 'LIS',
        arrivalAirport: 'CDG',
        departureTime: '18:30',
        arrivalTime: '22:05',
        duration: '2h35',
      },
    },
    hotelOptions: {
      hotels: [
        {
          name: 'Lisbon Story Guesthouse',
          stars: 4,
          location: 'Baixa, Lisbonne',
          rating: { word: 'Excellent', score: 9.1 },
          boardType: 'Petit-déj inclus',
          amenities: ['Wifi', 'Terrasse', 'Climatisation'],
          totalPrice: 540,
          mainPhoto:
            'https://images.pexels.com/photos/2549018/pexels-photo-2549018.jpeg?auto=compress&cs=tinysrgb&w=800',
          bookingUrl: 'https://www.booking.com',
        },
      ],
    },
    searchContext: {
      tripType: 'friends',
      travelers: 6,
      activities: [
        'Tramway 28',
        'Tour de Belém',
        'Fado à Alfama',
        'Surf à Cascais',
        'Time Out Market',
      ],
      travelVibeDescription: 'City break détente entre amis',
    },
  };

  const trip = await prisma.collaborativeTrip.create({
    data: {
      creatorId: u.lea.id,
      name: 'Lisbonne entre amis',
      coverImageUrl:
        'https://images.pexels.com/photos/2549018/pexels-photo-2549018.jpeg?auto=compress&cs=tinysrgb&w=1200',
      status: 'confirmed',
      finalDestination,
      finalStartDate: start,
      finalEndDate: end,
      finalDuration: 7,
      finalBudgetPerPerson: 720,
      maxMembers: 8,
    },
  });

  // Members (5 real + 1 guest), with varied booking statuses
  const memberData = [
    { user: u.lea, role: 'creator', flight: true, hotel: true, confirmed: true },
    { user: u.tom, role: 'member', flight: true, hotel: false, confirmed: false },
    { user: u.ines, role: 'member', flight: true, hotel: true, confirmed: true },
    { user: u.hugo, role: 'member', flight: false, hotel: false, confirmed: false },
    { user: u.sofia, role: 'member', flight: true, hotel: false, confirmed: false },
  ];
  for (const m of memberData) {
    await prisma.tripMember.create({
      data: {
        tripId: trip.id,
        userId: m.user.id,
        role: m.role,
        hasBookedFlight: m.flight,
        hasBookedHotel: m.hotel,
        bookingConfirmed: m.confirmed,
      },
    });
  }
  // A guest member (no account) to exercise the guest path
  await prisma.tripMember.create({
    data: {
      tripId: trip.id,
      role: 'guest',
      guestName: 'Marco',
      guestEmail: 'marco.guest@example.com',
      hasBookedFlight: false,
      hasBookedHotel: false,
    },
  });

  // Chat history (mix of system, member and @assistant messages)
  const messages = [
    { authorId: null, guestName: null, type: 'system', content: 'Léa a créé le voyage 🎒' },
    { authorId: u.lea.id, type: 'message', content: "Lisbonne c'est validé les amis 🇵🇹" },
    { authorId: u.tom.id, type: 'message', content: "Trop hâte ! J'ai pris mon vol ✈️" },
    { authorId: u.ines.id, type: 'message', content: 'Pareil, vol + hôtel réservés ✅' },
    { authorId: u.hugo.id, type: 'message', content: '@assistant tu peux nous proposer un resto pour le premier soir ?' },
    {
      authorId: null,
      guestName: 'Assistant',
      type: 'message',
      content:
        "Pour le premier soir à Alfama, tentez « A Baiuca » : fado en live et cuisine maison. C'est petit, pensez à réserver ! 🎶",
    },
    { authorId: u.sofia.id, type: 'message', content: 'Validé pour A Baiuca 🙌' },
    { authorId: u.lea.id, type: 'message', content: "J'ai réservé pour 6 à 20h le 12 ✅" },
    { authorId: null, guestName: null, type: 'system', content: 'Inès a réservé son hôtel 🏨' },
    { authorId: u.tom.id, type: 'message', content: "Il me manque encore l'hôtel, je m'en occupe ce soir" },
    { authorId: u.hugo.id, type: 'message', content: 'Quelqu\'un pour partager un taxi depuis l\'aéroport ?' },
    { authorId: u.lea.id, type: 'message', content: "On se cale tous sur le vol de 10h25, donc taxi groupé 🚕" },
  ];
  let t = Date.now() - messages.length * 3600 * 1000;
  for (const m of messages) {
    await prisma.tripMessage.create({
      data: {
        tripId: trip.id,
        authorId: m.authorId ?? null,
        guestName: m.guestName ?? null,
        type: m.type,
        content: m.content,
        createdAt: new Date(t),
      },
    });
    t += 3600 * 1000;
  }

  // Expenses split equally among the 5 real members (guest has no userId).
  const realIds = [u.lea.id, u.tom.id, u.ines.id, u.hugo.id, u.sofia.id];
  const splitEqual = (amount) => {
    const each = Math.round((amount / realIds.length) * 100) / 100;
    return realIds.map((userId) => ({ userId, amount: each }));
  };
  const expenses = [
    { paidBy: u.lea, description: 'Acompte guesthouse', amount: 540, category: 'accommodation' },
    { paidBy: u.tom, description: 'Courses apéro', amount: 65, category: 'food' },
    { paidBy: u.ines, description: 'Pass tramway + funiculaires', amount: 48, category: 'transport' },
    { paidBy: u.hugo, description: 'Dîner A Baiuca', amount: 210, category: 'food' },
    { paidBy: u.sofia, description: 'Excursion Sintra (van)', amount: 180, category: 'activity' },
    { paidBy: u.lea, description: 'Pastéis & cafés', amount: 36, category: 'food' },
  ];
  for (const e of expenses) {
    await prisma.tripExpense.create({
      data: {
        tripId: trip.id,
        paidById: e.paidBy.id,
        description: e.description,
        amount: e.amount,
        category: e.category,
        splitType: 'equal',
        splitAmong: splitEqual(e.amount),
      },
    });
  }

  return trip;
}

// ---- Trip B: voting in progress -------------------------------------------
async function seedVotingTrip(u) {
  const trip = await prisma.collaborativeTrip.create({
    data: {
      creatorId: u.lea.id,
      name: 'City-break surprise',
      coverImageUrl:
        'https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=1200',
      status: 'voting',
      voteDeadline: new Date('2026-06-22T20:00:00.000Z'),
      maxMembers: 8,
    },
  });

  for (const [user, role] of [
    [u.lea, 'creator'],
    [u.tom, 'member'],
    [u.ines, 'member'],
    [u.hugo, 'member'],
    [u.sofia, 'member'],
  ]) {
    await prisma.tripMember.create({
      data: { tripId: trip.id, userId: user.id, role },
    });
  }

  const proposalDefs = [
    {
      proposer: u.lea,
      city: 'Barcelone',
      country: 'Espagne',
      iata: 'BCN',
      cost: 420,
      flight: 120,
      hotel: 300,
      photo: 'https://images.pexels.com/photos/819764/pexels-photo-819764.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      proposer: u.tom,
      city: 'Athènes',
      country: 'Grèce',
      iata: 'ATH',
      cost: 510,
      flight: 190,
      hotel: 320,
      photo: 'https://images.pexels.com/photos/164336/pexels-photo-164336.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      proposer: u.ines,
      city: 'Porto',
      country: 'Portugal',
      iata: 'OPO',
      cost: 360,
      flight: 110,
      hotel: 250,
      photo: 'https://images.pexels.com/photos/1534560/pexels-photo-1534560.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
  ];

  const start = new Date('2026-07-03T00:00:00.000Z');
  const end = new Date('2026-07-06T00:00:00.000Z');
  const proposals = {};
  for (const d of proposalDefs) {
    const tripData = {
      // getDestinationImage() checks destination.photo.url FIRST, so set it
      // explicitly. Otherwise it falls back to STATIC_DESTINATION_PHOTOS which
      // is keyed by ENGLISH names ('Barcelona'≠'Barcelone', 'Athens'≠'Athènes')
      // and would render the "PHOTO · CITY" placeholder.
      destination: { city: d.city, country: d.country, iataCode: d.iata, photo: { url: d.photo } },
      pricing: { total: d.cost, flight: d.flight, hotel: d.hotel },
      flightDetails: {
        outbound: { airline: 'Vueling', departureAirport: 'CDG', arrivalAirport: d.iata, departureTime: '07:40', arrivalTime: '09:30', duration: '1h50' },
        return: { airline: 'Vueling', departureAirport: d.iata, arrivalAirport: 'CDG', departureTime: '20:10', arrivalTime: '22:05', duration: '1h55' },
      },
      hotelOptions: {
        hotels: [
          {
            name: `${d.city} Central Hotel`,
            stars: 4,
            location: `Centre, ${d.city}`,
            rating: { word: 'Très bien', score: 8.6 },
            totalPrice: d.hotel,
            mainPhoto: d.photo,
            bookingUrl: 'https://www.booking.com',
          },
        ],
      },
    };
    const proposal = await prisma.proposedDestination.create({
      data: {
        tripId: trip.id,
        proposedBy: d.proposer.id,
        city: d.city,
        country: d.country,
        startDate: start,
        endDate: end,
        duration: 3,
        estimatedCostPerPerson: d.cost,
        currency: 'EUR',
        tripData,
      },
    });
    proposals[d.city] = proposal;
  }

  // Votes (rank 1 = preferred, 2 = second choice)
  const voteDefs = [
    { user: u.lea, city: 'Barcelone', rank: 1 },
    { user: u.lea, city: 'Porto', rank: 2 },
    { user: u.tom, city: 'Athènes', rank: 1 },
    { user: u.tom, city: 'Barcelone', rank: 2 },
    { user: u.ines, city: 'Porto', rank: 1 },
    { user: u.ines, city: 'Barcelone', rank: 2 },
    { user: u.hugo, city: 'Barcelone', rank: 1 },
    { user: u.hugo, city: 'Athènes', rank: 2 },
    { user: u.sofia, city: 'Porto', rank: 1 },
    { user: u.sofia, city: 'Barcelone', rank: 2 },
  ];
  for (const v of voteDefs) {
    await prisma.tripVote.create({
      data: {
        tripId: trip.id,
        userId: v.user.id,
        destinationId: proposals[v.city].id,
        rank: v.rank,
      },
    });
  }

  const messages = [
    { authorId: null, type: 'system', content: 'Léa a lancé le vote 🗳️' },
    { authorId: u.lea.id, type: 'message', content: "J'ai mis 3 options, votez avant le 22 !" },
    { authorId: u.tom.id, type: 'message', content: 'Team Athènes ☀️ les ruines + la mer' },
    { authorId: u.ines.id, type: 'message', content: 'Porto c\'est parfait pour 3 jours, et tellement moins cher' },
    { authorId: u.hugo.id, type: 'message', content: 'Barcelone reste imbattable niveau ambiance perso' },
  ];
  let t = Date.now() - messages.length * 3600 * 1000;
  for (const m of messages) {
    await prisma.tripMessage.create({
      data: {
        tripId: trip.id,
        authorId: m.authorId ?? null,
        type: m.type,
        content: m.content,
        createdAt: new Date(t),
      },
    });
    t += 3600 * 1000;
  }

  return trip;
}

async function main() {
  console.log('🌱 Seeding DEV group-trip test data…\n');
  const users = await upsertPersonas();
  const userIds = Object.values(users).map((u) => u.id);
  await wipePriorTrips(userIds);

  const confirmed = await seedConfirmedTrip(users);
  const voting = await seedVotingTrip(users);

  const FRONT = process.env.FRONTEND_URL || 'http://localhost:5173';
  console.log('✅ Personas:');
  for (const p of PERSONAS) {
    const u = users[p.key];
    console.log(`   • ${u.firstName} ${u.lastName}  →  ${FRONT}/dashboard?devUser=${u.id}`);
  }
  console.log('\n✅ Voyage CONFIRMÉ (Lisbonne entre amis):');
  console.log(`   ${FRONT}/trips/${confirmed.id}?devUser=${users.lea.id}`);
  console.log('\n✅ Voyage EN VOTE (City-break surprise):');
  console.log(`   ${FRONT}/trips/${voting.id}?devUser=${users.lea.id}`);
  console.log('\nAstuce: ouvre n\'importe quelle URL, puis utilise la barre 🧪 Dev en bas à gauche pour changer de persona.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
