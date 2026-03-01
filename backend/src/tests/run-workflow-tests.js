// backend/src/tests/run-workflow-tests.js
// Script to test the destination discovery workflow with different user profiles
// Run with: node --experimental-modules src/tests/run-workflow-tests.js

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

// Test scenarios
const TEST_SCENARIOS = [
  {
    id: 'beach-romantic-schengen',
    name: 'Romantic beach trip in Schengen zone',
    userProfile: {
      basic: {
        travelVibeDescription: 'voyage en amoureux a un endroit ou on peut se baigner en europe (visa schengen)',
        budget: 600,
        travelers: 2,
        tripType: 'couple',
      },
      onboardingPreferences: {
        personality: 'confort',
        topActivities: ['plage', 'gastronomie'],
      },
    },
    options: {
      budget: 600,
      duration: 9,
      origin: 'Paris',
      count: 5,
    },
    expectedKeywords: ['beach', 'coastal', 'sea'],
    forbiddenDestinations: ['Budapest', 'Vienna', 'Prague', 'Belgrade', 'Sofia', 'Munich', 'Zurich'],
  },
  {
    id: 'hiking-mountains',
    name: 'Mountain hiking adventure',
    userProfile: {
      basic: {
        travelVibeDescription: 'randonnée en montagne avec de beaux paysages naturels',
        budget: 800,
        travelers: 1,
      },
      onboardingPreferences: {
        personality: 'explorateur',
        topActivities: ['randonnée', 'nature'],
      },
    },
    options: {
      budget: 800,
      duration: 7,
      origin: 'Paris',
      count: 5,
    },
    expectedKeywords: ['mountain', 'hiking', 'alps', 'nature'],
    forbiddenDestinations: ['Amsterdam', 'Brussels', 'Copenhagen'],
  },
  {
    id: 'asia-culture',
    name: 'Cultural trip to Asia',
    userProfile: {
      basic: {
        travelVibeDescription: 'découvrir l\'Asie, temples et culture ancestrale',
        budget: 1500,
        travelers: 2,
      },
      onboardingPreferences: {
        personality: 'explorateur',
        topActivities: ['culture', 'histoire'],
      },
    },
    options: {
      budget: 1500,
      duration: 14,
      origin: 'Paris',
      count: 5,
    },
    expectedKeywords: ['asia', 'temple', 'culture'],
    forbiddenDestinations: ['Barcelona', 'Rome', 'Lisbon', 'Prague'],
  },
  {
    id: 'winter-sun-escape',
    name: 'Escape winter cold, want sun',
    userProfile: {
      basic: {
        travelVibeDescription: 'fuir le froid de janvier, soleil et chaleur garantis',
        budget: 1000,
        travelers: 2,
      },
      onboardingPreferences: {
        personality: 'confort',
        topActivities: ['plage', 'détente'],
      },
    },
    options: {
      budget: 1000,
      duration: 10,
      origin: 'Paris',
      count: 5,
    },
    expectedKeywords: ['warm', 'sun', 'canary', 'morocco', 'tropical'],
    forbiddenDestinations: ['Stockholm', 'Helsinki', 'Oslo', 'Copenhagen', 'Berlin'],
  },
  {
    id: 'family-kids',
    name: 'Family trip with children',
    userProfile: {
      basic: {
        travelVibeDescription: 'vacances en famille avec 2 enfants (5 et 8 ans), activités adaptées',
        budget: 2000,
        travelers: 4,
        tripType: 'family',
      },
      onboardingPreferences: {
        personality: 'confort',
        topActivities: ['plage', 'nature'],
      },
    },
    options: {
      budget: 2000,
      duration: 10,
      origin: 'Paris',
      count: 5,
    },
    expectedKeywords: ['family', 'beach', 'safe'],
    forbiddenDestinations: ['Ibiza', 'Mykonos', 'Amsterdam'], // Party destinations
  },
  {
    id: 'ultra-low-budget',
    name: 'Ultra low budget weekend',
    userProfile: {
      basic: {
        travelVibeDescription: 'weekend pas cher proche de Paris',
        budget: 200,
        travelers: 1,
      },
      onboardingPreferences: {
        personality: 'routard',
        topActivities: ['culture', 'gastronomie'],
      },
    },
    options: {
      budget: 200,
      duration: 3,
      origin: 'Paris',
      count: 5,
    },
    expectedKeywords: ['nearby', 'cheap', 'budget'],
    forbiddenDestinations: ['Maldives', 'Bali', 'Tokyo', 'New York'],
  },
  {
    id: 'gastronomy-wine',
    name: 'Food and wine trip',
    userProfile: {
      basic: {
        travelVibeDescription: 'voyage gastronomique, bons restaurants et vins',
        budget: 1200,
        travelers: 2,
      },
      onboardingPreferences: {
        personality: 'confort',
        topActivities: ['gastronomie', 'vin'],
      },
    },
    options: {
      budget: 1200,
      duration: 7,
      origin: 'Paris',
      count: 5,
    },
    expectedKeywords: ['food', 'wine', 'culinary', 'gastronomy'],
    forbiddenDestinations: [],
  },
  {
    id: 'short-flight-only',
    name: 'Short flight max 2h',
    userProfile: {
      basic: {
        travelVibeDescription: 'proche de Paris, pas de long vol, max 2h',
        budget: 800,
        travelers: 2,
        maxFlightHours: 2,
      },
      onboardingPreferences: {
        personality: 'confort',
        topActivities: ['culture', 'gastronomie'],
      },
    },
    options: {
      budget: 800,
      duration: 7,
      origin: 'Paris',
      count: 5,
      maxFlightHours: 2,
    },
    expectedKeywords: ['nearby', 'short flight'],
    forbiddenDestinations: ['Marrakech', 'Reykjavik', 'Athens', 'Canary Islands'],
  },
];

// Run a single test
async function runTest(scenario) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST: ${scenario.name}`);
  console.log(`ID: ${scenario.id}`);
  console.log('='.repeat(60));

  console.log('\n📝 Custom field:', scenario.userProfile.basic.travelVibeDescription);
  console.log(`💰 Budget: €${scenario.options.budget}`);
  console.log(`📅 Duration: ${scenario.options.duration} days`);
  console.log(`✈️  Origin: ${scenario.options.origin}`);

  const startTime = Date.now();

  try {
    const destinations = await generateDestinationShortlist(
      scenario.userProfile,
      scenario.options
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Results (${elapsed}s):`);
    destinations.forEach((dest, i) => {
      console.log(`  ${i + 1}. ${dest}`);
    });

    // Check for forbidden destinations
    const forbidden = destinations.filter(dest =>
      scenario.forbiddenDestinations.some(f =>
        dest.toLowerCase().includes(f.toLowerCase())
      )
    );

    if (forbidden.length > 0) {
      console.log(`\n❌ FAIL: Found forbidden destinations: ${forbidden.join(', ')}`);
      return { success: false, reason: `Forbidden destinations: ${forbidden.join(', ')}`, destinations };
    }

    console.log('\n✅ PASS: No forbidden destinations found');
    return { success: true, destinations };

  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    return { success: false, reason: error.message, destinations: [] };
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 WORKFLOW TEST SUITE');
  console.log('Testing destination discovery with different user profiles\n');

  const results = [];

  for (const scenario of TEST_SCENARIOS) {
    const result = await runTest(scenario);
    results.push({
      ...scenario,
      ...result,
    });

    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nTotal: ${results.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.reason}`);
    });
  }

  // Detailed results table
  console.log('\n\n📋 DETAILED RESULTS:');
  console.log('-'.repeat(100));
  console.log('| Test ID                  | Status | Destinations                                          |');
  console.log('-'.repeat(100));

  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const dests = r.destinations?.slice(0, 3).join(', ') || 'N/A';
    console.log(`| ${r.id.padEnd(24)} | ${status}     | ${dests.padEnd(53)} |`);
  });

  console.log('-'.repeat(100));

  return results;
}

// Export for use in other scripts
export { runTest, runAllTests, TEST_SCENARIOS };

// Run if executed directly
if (process.argv[1].includes('run-workflow-tests')) {
  runAllTests()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}
