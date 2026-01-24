// backend/src/tests/workflow-test-cases.js
// Test cases for travel recommendation workflow

/**
 * Test Cases for detecting inconsistencies between user request and results
 * Each test case has:
 * - input: The user's search criteria
 * - expected: What the results SHOULD include/exclude
 * - issues: Known bugs this test case would catch
 */

export const TEST_CASES = [
  // ======================================
  // TEST CASE 1: Beach + Low Budget
  // User's actual failing case
  // ======================================
  {
    id: 'beach-low-budget-schengen',
    name: 'Romantic beach trip with €300/person',
    input: {
      basic: {
        travelVibeDescription: 'voyage en amoureux a un endroit ou on peut se baigner en europe (visa schengen)',
        budget: 600, // €300 x 2 people
        travelers: 2,
        tripType: 'couple',
      },
      availability: {
        startDate: '2025-05-08',
        endDate: '2025-05-17', // 9 days
        duration: 9,
        departureFlexibility: 'flexible',
      },
      origin: 'Paris',
    },
    expected: {
      mustHave: [
        'coastal destination (beach accessible)',
        'Schengen zone country',
        'flights under €180 total (30% of budget)',
        'hotel for 8 nights',
      ],
      mustNotHave: [
        'landlocked cities (Budapest, Vienna, Prague, Belgrade, Sofia)',
        'flights over €200/person',
        'missing hotel',
      ],
      idealDestinations: [
        'Algarve (Portugal)', 'Malaga (Spain)', 'Split (Croatia)',
        'Palermo (Sicily)', 'Cagliari (Sardinia)', 'Nice (France)',
        'Valencia (Spain)', 'Heraklion (Crete)',
      ],
    },
    issues: [
      'BUG: travelVibeDescription not parsed for keywords',
      'BUG: "baigner" not recognized as beach keyword',
      'BUG: No Schengen filter applied',
      'BUG: Budget exceeded with no fallback',
    ],
  },

  // ======================================
  // TEST CASE 2: Adventure + Mountains
  // ======================================
  {
    id: 'hiking-adventure',
    name: 'Hiking adventure trip',
    input: {
      basic: {
        travelVibeDescription: 'randonnée en montagne avec de beaux paysages',
        budget: 800,
        travelers: 1,
        tripType: 'solo',
      },
      availability: {
        startDate: '2025-06-15',
        endDate: '2025-06-22',
        duration: 7,
      },
      origin: 'Paris',
    },
    expected: {
      mustHave: [
        'mountain destination',
        'hiking trails nearby',
      ],
      mustNotHave: [
        'flat/urban only cities (Amsterdam, Brussels, Copenhagen)',
      ],
      idealDestinations: [
        'Innsbruck (Austria)', 'Chamonix (France)', 'Zermatt (Switzerland)',
        'Bled (Slovenia)', 'Tromso (Norway)', 'Funchal (Madeira)',
      ],
    },
    issues: [],
  },

  // ======================================
  // TEST CASE 3: Ultra Low Budget
  // ======================================
  {
    id: 'ultra-low-budget',
    name: 'Weekend getaway €200 total',
    input: {
      basic: {
        budget: 200,
        travelers: 1,
      },
      availability: {
        startDate: '2025-04-18',
        endDate: '2025-04-20', // 2 nights
        duration: 3,
      },
      origin: 'Paris',
    },
    expected: {
      mustHave: [
        'destinations reachable by train/bus OR very cheap flights',
        'hostels or budget hotels',
      ],
      shouldSuggest: [
        'Brussels (train 1h22, €29)', 'London (train 2h15, €50-80)',
        'Lyon (train 2h, €30)', 'Amsterdam (train 3h, €50)',
        'Lille (train 1h, €15)',
      ],
    },
    issues: [
      'BUG: No train/bus alternatives shown',
      'BUG: System shows no results instead of alternatives',
    ],
  },

  // ======================================
  // TEST CASE 4: Family with Kids
  // ======================================
  {
    id: 'family-kids',
    name: 'Family trip with young children',
    input: {
      basic: {
        travelVibeDescription: 'vacances en famille avec enfants, activités adaptées',
        budget: 2000,
        travelers: 4,
        tripType: 'family',
      },
      availability: {
        startDate: '2025-07-15',
        endDate: '2025-07-25',
        duration: 10,
      },
      origin: 'Paris',
    },
    expected: {
      mustHave: [
        'family-friendly destination',
        'kid activities (beaches, theme parks, easy hikes)',
        '4-person accommodation or 2 rooms',
      ],
      idealDestinations: [
        'Algarve (Portugal)', 'Costa Brava (Spain)', 'Crete (Greece)',
        'Sardinia (Italy)', 'Dubrovnik (Croatia)',
      ],
    },
    issues: [],
  },

  // ======================================
  // TEST CASE 5: Specific Continent Request
  // ======================================
  {
    id: 'asia-request',
    name: 'User specifically wants Asia',
    input: {
      basic: {
        travelVibeDescription: 'Je veux découvrir l\'Asie, temples et culture',
        budget: 1500,
        travelers: 2,
      },
      availability: {
        startDate: '2025-11-01',
        endDate: '2025-11-15',
        duration: 14,
      },
      origin: 'Paris',
    },
    expected: {
      mustHave: [
        'Asian destination',
        'cultural/temple activities',
      ],
      mustNotHave: [
        'European destinations',
        'American destinations',
      ],
      idealDestinations: [
        'Bangkok (Thailand)', 'Hanoi (Vietnam)', 'Bali (Indonesia)',
        'Kyoto (Japan)', 'Kathmandu (Nepal)',
      ],
    },
    issues: [
      'BUG: Continent preference in travelVibeDescription not parsed',
    ],
  },

  // ======================================
  // TEST CASE 6: Weather-specific Request
  // ======================================
  {
    id: 'winter-sun',
    name: 'Escape winter cold, want sun',
    input: {
      basic: {
        travelVibeDescription: 'fuir le froid, soleil et chaleur garantis',
        budget: 1000,
        travelers: 2,
      },
      availability: {
        startDate: '2025-01-15',
        endDate: '2025-01-25',
        duration: 10,
      },
      origin: 'Paris',
    },
    expected: {
      mustHave: [
        'destination with warm weather in January (>20°C)',
      ],
      mustNotHave: [
        'Northern Europe in winter',
        'Central Europe in winter',
      ],
      idealDestinations: [
        'Canary Islands (Spain)', 'Marrakech (Morocco)', 'Cape Verde',
        'Madeira (Portugal)', 'Sharm el-Sheikh (Egypt)',
      ],
    },
    issues: [],
  },

  // ======================================
  // TEST CASE 7: Visa-free Request
  // ======================================
  {
    id: 'visa-free',
    name: 'Only visa-free destinations',
    input: {
      basic: {
        travelVibeDescription: 'destination sans visa pour français',
        budget: 1200,
        travelers: 1,
      },
      availability: {
        startDate: '2025-05-01',
        endDate: '2025-05-10',
        duration: 9,
      },
      origin: 'Paris',
      onboardingPreferences: {
        visaPreference: 'sans-visa',
      },
    },
    expected: {
      mustHave: [
        'visa-free for French citizens',
      ],
      mustNotHave: [
        'destinations requiring visa (Russia, China, India, etc.)',
      ],
    },
    issues: [
      'BUG: visaPreference not always respected',
    ],
  },

  // ======================================
  // TEST CASE 8: Short Flight Preference
  // ======================================
  {
    id: 'short-flight',
    name: 'Max 2h flight',
    input: {
      basic: {
        travelVibeDescription: 'proche de Paris, pas de long vol',
        budget: 800,
        travelers: 2,
        maxFlightHours: 2,
      },
      availability: {
        startDate: '2025-06-01',
        endDate: '2025-06-08',
        duration: 7,
      },
      origin: 'Paris',
    },
    expected: {
      mustHave: [
        'destinations within 2h flight from Paris',
      ],
      mustNotHave: [
        'Greece (3h+)', 'Morocco (3h+)', 'Canary Islands (4h+)',
      ],
      idealDestinations: [
        'Barcelona (1h45)', 'Rome (2h)', 'Amsterdam (1h15)',
        'London (1h15)', 'Milan (1h30)', 'Nice (1h20)',
      ],
    },
    issues: [],
  },
];

/**
 * Keywords that should trigger specific destination types
 * Used to parse travelVibeDescription
 */
export const KEYWORD_MAPPINGS = {
  beach: {
    keywords: ['plage', 'beach', 'baigner', 'nager', 'mer', 'océan', 'sea', 'swimming', 'sunbathing', 'coastal', 'bord de mer', 'farniente'],
    constraint: 'ONLY coastal cities or islands with beaches',
    exclude: ['landlocked cities'],
  },
  mountains: {
    keywords: ['montagne', 'mountain', 'randonnée', 'hiking', 'trek', 'altitude', 'alpes', 'alps', 'ski'],
    constraint: 'ONLY destinations near mountains with trails',
    exclude: ['flat coastal cities'],
  },
  culture: {
    keywords: ['culture', 'musée', 'museum', 'histoire', 'history', 'patrimoine', 'heritage', 'temples', 'architecture'],
    constraint: 'Prioritize cities with rich cultural heritage',
  },
  adventure: {
    keywords: ['aventure', 'adventure', 'sport', 'extreme', 'adrénaline', 'adrenaline'],
    constraint: 'Destinations with adventure activities available',
  },
  relaxation: {
    keywords: ['détente', 'relaxation', 'spa', 'wellness', 'calme', 'tranquille', 'repos', 'farniente'],
    constraint: 'Peaceful destinations, not busy tourist hubs',
  },
  romantic: {
    keywords: ['amoureux', 'romantic', 'couple', 'honeymoon', 'lune de miel', 'romantique'],
    constraint: 'Romantic destinations with couples activities',
  },
  gastronomy: {
    keywords: ['gastronomie', 'food', 'cuisine', 'wine', 'vin', 'culinaire', 'gourmet'],
    constraint: 'Destinations known for food and wine',
  },
  nightlife: {
    keywords: ['fête', 'party', 'nightlife', 'clubbing', 'sortir', 'bars'],
    constraint: 'Destinations with active nightlife',
  },
};

/**
 * Geographic constraints
 */
export const GEO_CONSTRAINTS = {
  schengen: {
    keywords: ['schengen', 'europe', 'ue', 'eu', 'european union'],
    countries: [
      'Austria', 'Belgium', 'Croatia', 'Czech Republic', 'Denmark', 'Estonia',
      'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Italy',
      'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
      'Norway', 'Poland', 'Portugal', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
    ],
  },
  asia: {
    keywords: ['asie', 'asia', 'asian', 'orient'],
    regions: ['Southeast Asia', 'East Asia', 'South Asia'],
  },
  americas: {
    keywords: ['amérique', 'america', 'usa', 'états-unis', 'canada', 'mexique', 'caribbean'],
    regions: ['North America', 'South America', 'Central America', 'Caribbean'],
  },
};

/**
 * Alternative transport suggestions when flights exceed budget
 */
export const TRANSPORT_ALTERNATIVES = {
  fromParis: {
    train: [
      { destination: 'Brussels', duration: '1h22', price: 29, operator: 'Thalys/Eurostar' },
      { destination: 'London', duration: '2h15', price: 50, operator: 'Eurostar' },
      { destination: 'Amsterdam', duration: '3h15', price: 35, operator: 'Thalys' },
      { destination: 'Lyon', duration: '2h00', price: 30, operator: 'TGV' },
      { destination: 'Marseille', duration: '3h20', price: 45, operator: 'TGV' },
      { destination: 'Nice', duration: '5h45', price: 60, operator: 'TGV' },
      { destination: 'Barcelona', duration: '6h30', price: 39, operator: 'AVE/TGV' },
      { destination: 'Milan', duration: '7h00', price: 29, operator: 'TGV' },
      { destination: 'Cologne', duration: '3h50', price: 35, operator: 'Thalys' },
      { destination: 'Stuttgart', duration: '3h10', price: 39, operator: 'TGV/ICE' },
    ],
    bus: [
      { destination: 'Brussels', duration: '4h00', price: 9, operator: 'FlixBus' },
      { destination: 'Amsterdam', duration: '6h30', price: 15, operator: 'FlixBus' },
      { destination: 'Lyon', duration: '5h30', price: 15, operator: 'FlixBus' },
      { destination: 'Barcelona', duration: '14h00', price: 35, operator: 'FlixBus' },
      { destination: 'Milan', duration: '11h00', price: 29, operator: 'FlixBus' },
    ],
  },
};

export default TEST_CASES;
