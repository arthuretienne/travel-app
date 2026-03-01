// backend/src/tests/test-weird-requests.js
// Test unusual/specific requests to see if Claude interprets them correctly

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env BEFORE importing claudeService (which initializes the client)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🔑 API Key loaded:', process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO');

// Dynamic import AFTER dotenv is configured
const { generateDestinationShortlist } = await import('../services/claudeService.js');

// Weird/specific test cases that keyword detection would NEVER handle
const WEIRD_REQUESTS = [
  {
    id: 'northern-lights',
    name: 'Voir des aurores boréales',
    customField: "Je veux absolument voir des aurores boréales, c'est mon rêve",
    budget: 1500,
    duration: 7,
    expected: ['Norway', 'Iceland', 'Finland', 'Sweden', 'Tromsø', 'Reykjavik'],
    forbidden: ['Spain', 'Italy', 'Greece', 'Portugal', 'Morocco'],
  },
  {
    id: 'divorce-party',
    name: 'Fêter mon divorce',
    customField: "Je viens de divorcer et je veux fêter ça, m'éclater et faire la fête",
    budget: 1000,
    duration: 5,
    expected: ['Ibiza', 'Berlin', 'Amsterdam', 'Barcelona', 'Prague', 'Budapest'],
    forbidden: ['Maldives', 'Bora Bora', 'romantic'], // Not romantic destinations
  },
  {
    id: 'wheelchair-accessible',
    name: 'Accessible en fauteuil roulant',
    customField: "Voyage accessible PMR, je suis en fauteuil roulant",
    budget: 1200,
    duration: 7,
    expected: ['Barcelona', 'Berlin', 'Amsterdam', 'Copenhagen', 'Singapore'],
    forbidden: [], // Hard to validate, but should avoid mountainous/difficult terrain
  },
  {
    id: 'learn-to-surf',
    name: 'Apprendre à surfer',
    customField: "Je veux apprendre à surfer, débutant total",
    budget: 800,
    duration: 7,
    expected: ['Portugal', 'Morocco', 'Bali', 'Sri Lanka', 'Canary', 'Fuerteventura', 'Ericeira', 'Taghazout'],
    forbidden: ['Paris', 'Vienna', 'Prague', 'Budapest'], // Landlocked
  },
  {
    id: 'digital-detox',
    name: 'Digital detox total',
    customField: "Je veux me déconnecter complètement, pas de wifi, nature pure",
    budget: 1000,
    duration: 10,
    expected: ['nature', 'wilderness', 'retreat', 'island', 'mountain'],
    forbidden: ['Tokyo', 'New York', 'Dubai', 'Singapore'], // Hyper-connected cities
  },
  {
    id: 'vegan-food-trip',
    name: 'Voyage gastronomique vegan',
    customField: "Je suis vegan et je veux découvrir la cuisine vegan du monde",
    budget: 1200,
    duration: 7,
    expected: ['Berlin', 'Tel Aviv', 'London', 'Los Angeles', 'Bali', 'Chiang Mai'],
    forbidden: [], // Hard to validate
  },
  {
    id: 'see-temples',
    name: 'Voir des temples anciens',
    customField: "Je veux voir des temples millénaires et de l'architecture ancienne",
    budget: 1500,
    duration: 14,
    expected: ['Thailand', 'Cambodia', 'Bali', 'Japan', 'India', 'Myanmar', 'Angkor', 'Kyoto'],
    forbidden: ['Paris', 'London', 'New York', 'Berlin'], // Modern cities
  },
  {
    id: 'escape-tourists',
    name: 'Fuir les touristes',
    customField: "Je veux un endroit vraiment local, pas touristique du tout, authentique",
    budget: 800,
    duration: 7,
    expected: [], // Hard to validate, but should avoid major tourist hubs
    forbidden: ['Paris', 'Barcelona', 'Rome', 'Venice', 'Amsterdam', 'Prague'],
  },
  {
    id: 'birthday-30',
    name: 'Anniversaire 30 ans',
    customField: "Je fête mes 30 ans avec 5 amis, on veut un truc mémorable et festif",
    budget: 1500,
    duration: 4,
    travelers: 6,
    expected: ['Barcelona', 'Lisbon', 'Marrakech', 'Budapest', 'Prague', 'Mykonos'],
    forbidden: [],
  },
  {
    id: 'wine-tasting',
    name: 'Route des vins',
    customField: "Je veux faire une route des vins, déguster dans les vignobles",
    budget: 1000,
    duration: 5,
    expected: ['Bordeaux', 'Tuscany', 'Porto', 'Rioja', 'Burgundy', 'Douro', 'Napa'],
    forbidden: ['Iceland', 'Norway', 'Finland'], // No wine regions
  },
  {
    id: 'see-wildlife',
    name: 'Safari / animaux sauvages',
    customField: "Je veux voir des animaux sauvages dans leur habitat naturel",
    budget: 2000,
    duration: 10,
    expected: ['Kenya', 'Tanzania', 'South Africa', 'Botswana', 'Costa Rica', 'Galapagos'],
    forbidden: ['Paris', 'London', 'Tokyo'],
  },
  {
    id: 'yoga-retreat',
    name: 'Retraite yoga',
    customField: "Je cherche une retraite yoga et méditation, me recentrer",
    budget: 1200,
    duration: 7,
    expected: ['Bali', 'India', 'Thailand', 'Sri Lanka', 'Portugal', 'Rishikesh'],
    forbidden: ['Las Vegas', 'Dubai', 'Ibiza'],
  },
];

async function runTest(test) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST: ${test.name}`);
  console.log(`ID: ${test.id}`);
  console.log('='.repeat(60));
  console.log(`📝 Custom field: "${test.customField}"`);
  console.log(`💰 Budget: €${test.budget}`);
  console.log(`📅 Duration: ${test.duration} days`);

  const userProfile = {
    basic: {
      travelVibeDescription: test.customField,
      budget: test.budget,
      travelers: test.travelers || 2,
    },
    onboardingPreferences: {},
  };

  const options = {
    budget: test.budget,
    duration: test.duration,
    origin: 'Paris',
    count: 6,
  };

  try {
    const startTime = Date.now();
    const destinations = await generateDestinationShortlist(userProfile, options);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Results (${elapsed}s):`);
    destinations.forEach((dest, i) => {
      console.log(`  ${i + 1}. ${dest}`);
    });

    // Check for forbidden destinations
    const destLower = destinations.map(d => d.toLowerCase()).join(' ');
    const foundForbidden = test.forbidden.filter(f =>
      destLower.includes(f.toLowerCase())
    );

    // Check for expected destinations/keywords
    const foundExpected = test.expected.filter(e =>
      destLower.includes(e.toLowerCase())
    );

    console.log('\n📊 Analysis:');
    if (foundExpected.length > 0) {
      console.log(`  ✅ Found expected: ${foundExpected.join(', ')}`);
    } else if (test.expected.length > 0) {
      console.log(`  ⚠️  None of expected found: ${test.expected.slice(0, 5).join(', ')}...`);
    }

    if (foundForbidden.length > 0) {
      console.log(`  ❌ Found FORBIDDEN: ${foundForbidden.join(', ')}`);
      return { success: false, reason: `Forbidden: ${foundForbidden.join(', ')}`, destinations };
    } else if (test.forbidden.length > 0) {
      console.log(`  ✅ No forbidden destinations`);
    }

    return { success: true, destinations, foundExpected };

  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    return { success: false, reason: error.message, destinations: [] };
  }
}

async function runAllTests() {
  console.log('🧪 WEIRD/SPECIFIC REQUESTS TEST SUITE');
  console.log('Testing unusual requests that require Claude to interpret intent\n');

  const results = [];

  for (const test of WEIRD_REQUESTS) {
    const result = await runTest(test);
    results.push({ ...test, ...result });

    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  console.log('\n| Test | Status | Destinations |');
  console.log('|------|--------|--------------|');

  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const dests = r.destinations?.slice(0, 3).join(', ') || 'N/A';
    console.log(`| ${r.name.padEnd(30)} | ${status} | ${dests} |`);
  });

  const passed = results.filter(r => r.success).length;
  console.log(`\n✅ Passed: ${passed}/${results.length}`);

  return results;
}

// Run if executed directly
runAllTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
