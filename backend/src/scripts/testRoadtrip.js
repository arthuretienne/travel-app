// Test roadtrip generation workflow
import * as roadtripService from '../services/roadtripService.js';
import { generateRoadtripNarrative } from '../services/claudeService.js';
import * as bookingService from '../services/bookingService.js';

console.log('🧪 TEST: Roadtrip Generation Workflow\n');
console.log('='.repeat(80));
console.log('\n');

// Mock user preferences for roadtrip enthusiast
const mockUserPreferences = {
  // PRIMARY INDICATOR: Roadtrip preference
  stayOrMove: 'roadtrip',

  // Transport preferences
  transportModes: ['plane', 'train', 'car'],
  refusedTransports: [],
  maxTransportHours: 8,

  // Travel style
  riskTolerance: 75,
  originalityAppetite: 85,
  departureFlexibility: 'flexible',

  // Activities
  topActivities: ['culture', 'nature', 'gastronomy', 'adventure'],

  // Preferences
  whyTravel: 'Découvrir de nouvelles cultures et paysages',
  mainGoal: 'Explorer plusieurs destinations',
  globalStyle: 'Aventurier curieux',
  idealRhythm: 'Equilibré entre visites et détente',
  preferredAirports: ['Paris']
};

async function testRoadtripDetection() {
  console.log('📋 TEST 1: Roadtrip Detection Logic\n');

  const testCases = [
    {
      name: 'Roadtrip Enthusiast (stayOrMove=roadtrip)',
      prefs: { ...mockUserPreferences },
      params: { budget: 1200, duration: 10 },
      expected: true
    },
    {
      name: 'Multi-transport Traveler',
      prefs: { ...mockUserPreferences, stayOrMove: 'itinerant', transportModes: ['plane', 'car', 'train'] },
      params: { budget: 1000, duration: 7 },
      expected: true
    },
    {
      name: 'Low Budget (should reject)',
      prefs: { ...mockUserPreferences },
      params: { budget: 500, duration: 10 },
      expected: false
    },
    {
      name: 'Short Duration (should reject)',
      prefs: { ...mockUserPreferences },
      params: { budget: 1200, duration: 3 },
      expected: false
    },
    {
      name: 'Single-city Preference',
      prefs: { ...mockUserPreferences, stayOrMove: 'same_place', transportModes: ['plane'] },
      params: { budget: 800, duration: 7 },
      expected: false
    }
  ];

  for (const testCase of testCases) {
    const result = roadtripService.shouldProposeRoadtrip(testCase.prefs, testCase.params);
    const status = result === testCase.expected ? '✅' : '❌';
    console.log(`${status} ${testCase.name}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
    if (result !== testCase.expected) {
      console.log(`   ⚠️  MISMATCH!`);
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log('\n');
}

async function testMultiStopFlights() {
  console.log('📋 TEST 2: Multi-Stop Flight Search\n');

  try {
    // Test: Paris → Barcelona → Lisbon → Paris
    const legs = [
      {
        fromId: 'PAR.CITY',
        toId: 'BCN.AIRPORT',
        departDate: '2026-01-15'
      },
      {
        fromId: 'BCN.AIRPORT',
        toId: 'LIS.CITY',
        departDate: '2026-01-18'
      },
      {
        fromId: 'LIS.CITY',
        toId: 'PAR.CITY',
        departDate: '2026-01-22'
      }
    ];

    console.log('🔍 Searching multi-stop flights...');
    console.log(`   Route: Paris → Barcelona → Lisbon → Paris\n`);

    const result = await roadtripService.searchMultiStopFlights(legs, {
      adults: 1,
      cabinClass: 'ECONOMY',
      currency: 'EUR'
    });

    if (result.count > 0 && !result.isFallback) {
      console.log(`✅ Found ${result.count} multi-stop flight options\n`);

      // Show cheapest option
      const cheapest = result.flights[0];
      console.log('CHEAPEST OPTION:');
      console.log(`   Total Price: €${cheapest.price.amount}`);
      console.log(`   Segments: ${cheapest.segments.length}`);
      cheapest.segments.forEach((seg, i) => {
        console.log(`   ${i + 1}. ${seg.departureAirport} → ${seg.arrivalAirport}`);
        console.log(`      ${seg.airline} - ${seg.departureTime} → ${seg.arrivalTime}`);
      });
    } else if (result.isFallback) {
      console.log('⚠️  Multi-stop API unavailable - used fallback (individual legs)\n');
      console.log(`   Total Cost: €${result.totalPrice}`);
      result.legResults.forEach((leg, i) => {
        console.log(`   ${i + 1}. ${leg.from} → ${leg.to}: €${leg.cheapestFlight?.price?.amount || 'N/A'}`);
      });
    } else {
      console.log('❌ No multi-stop flights found');
    }

  } catch (error) {
    console.error('❌ Multi-stop flight test failed:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n');
}

async function testCarRentals() {
  console.log('📋 TEST 3: Car Rental Search\n');

  try {
    console.log('🔍 Searching car rentals: Barcelona → Lisbon (one-way)\n');

    const result = await roadtripService.searchCarRentals({
      pickUpLocation: 'Barcelona',
      pickUpDate: '2026-01-15',
      dropOffLocation: 'Lisbon',
      dropOffDate: '2026-01-22',
      currency: 'EUR'
    });

    if (result.count > 0) {
      console.log(`✅ Found ${result.count} car rental options\n`);

      // Show top 3
      console.log('TOP 3 CARS:\n');
      result.cars.slice(0, 3).forEach((car, i) => {
        console.log(`${i + 1}. ${car.name}`);
        console.log(`   Category: ${car.category || 'N/A'}`);
        console.log(`   Transmission: ${car.transmission || 'N/A'}`);
        console.log(`   Passengers: ${car.passengers || 'N/A'} | Bags: ${car.bags || 'N/A'}`);
        console.log(`   Price: €${car.price.amount} (7 days)`);
        console.log(`   Supplier: ${car.supplier || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No car rentals found');
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

  } catch (error) {
    console.error('❌ Car rental test failed:', error.message);
  }

  console.log('='.repeat(80));
  console.log('\n');
}

async function testAttractions() {
  console.log('📋 TEST 4: Attractions Search\n');

  try {
    console.log('🔍 Searching top attractions in Barcelona\n');

    const result = await roadtripService.searchAttractions('Barcelona', {
      limit: 5,
      currency: 'EUR'
    });

    if (result.count > 0) {
      console.log(`✅ Found ${result.count} attractions\n`);

      result.attractions.forEach((attraction, i) => {
        console.log(`${i + 1}. ${attraction.name}`);
        console.log(`   ${attraction.description?.substring(0, 100)}...`);
        console.log(`   Rating: ${attraction.rating?.value || 'N/A'}/5 (${attraction.rating?.count || 0} reviews)`);
        console.log(`   Price: €${attraction.price?.amount || 'N/A'}`);
        console.log(`   Category: ${attraction.category || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No attractions found');
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

  } catch (error) {
    console.error('❌ Attractions test failed:', error.message);
  }

  console.log('='.repeat(80));
  console.log('\n');
}

async function testCompleteRoadtrip() {
  console.log('📋 TEST 5: Complete Roadtrip Generation\n');

  try {
    console.log('🗺️  Generating complete roadtrip...');
    console.log('   Origin: Paris');
    console.log('   Budget: €1200');
    console.log('   Duration: 10 days\n');

    const roadtrip = await roadtripService.generateRoadtrip({
      userProfile: mockUserPreferences,
      origin: 'Paris',
      budget: 1200,
      duration: 10,
      departureDate: '2026-01-15'
    });

    console.log('✅ Roadtrip Generated!\n');
    console.log('━'.repeat(80));
    console.log(`🎯 TITLE: ${roadtrip.title}`);
    console.log('━'.repeat(80));
    console.log('');

    console.log('📍 CITIES:\n');
    roadtrip.cities.forEach((city, i) => {
      console.log(`${i + 1}. ${city.name}, ${city.country}`);
      console.log(`   Dates: ${city.arrivalDate} → ${city.departureDate} (${city.nights} nights)`);
      if (city.hotel) {
        console.log(`   Hotel: ${city.hotel.name} (${city.hotel.stars}⭐) - €${city.hotel.price.amount}`);
      }
      console.log(`   Attractions: ${city.attractions.length} found`);
      console.log('');
    });

    console.log('🚗 TRANSPORT:\n');
    roadtrip.transport.forEach(t => {
      console.log(`   ${t.type.toUpperCase()}: €${t.totalCost}`);
    });
    console.log('');

    console.log('💰 BUDGET:\n');
    console.log(`   Total Budget: €${roadtrip.budget.total}`);
    console.log(`   Transport: €${Math.round(roadtrip.budget.transport)}`);
    console.log(`   Hotels: €${Math.round(roadtrip.budget.hotels)}`);
    console.log(`   Activities: €${Math.round(roadtrip.budget.activities)}`);
    console.log(`   ─────────────`);
    console.log(`   Total Cost: €${Math.round(roadtrip.budget.totalCost)}`);
    console.log(`   Affordable: ${roadtrip.isAffordable ? '✅ YES' : '❌ NO'}`);
    console.log('');

    console.log('🤖 Generating narrative with Claude AI...\n');

    const enriched = await generateRoadtripNarrative(roadtrip, mockUserPreferences);

    console.log('✅ Narrative Generated!\n');
    console.log('━'.repeat(80));
    console.log(enriched.narrative.tagline);
    console.log('━'.repeat(80));
    console.log('');
    console.log('OVERVIEW:');
    console.log(enriched.narrative.overview);
    console.log('');
    console.log('PERFECT FOR:');
    console.log(enriched.narrative.perfectFor);
    console.log('');
    console.log('PRACTICAL TIPS:');
    enriched.narrative.practicalTips.forEach((tip, i) => {
      console.log(`${i + 1}. ${tip}`);
    });
    console.log('');
    console.log('HIDDEN GEMS:');
    enriched.narrative.hiddenGems.forEach((gem, i) => {
      console.log(`${i + 1}. ${gem}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Complete roadtrip test failed:', error.message);
    console.error(error.stack);
  }

  console.log('='.repeat(80));
  console.log('\n');
}

async function runAllTests() {
  console.log('🚀 STARTING ROADTRIP TESTS\n');
  console.log('='.repeat(80));
  console.log('\n');

  try {
    // Test 1: Detection logic (no API calls)
    await testRoadtripDetection();

    // Test 2: Multi-stop flights
    await testMultiStopFlights();

    // Test 3: Car rentals
    await testCarRentals();

    // Test 4: Attractions
    await testAttractions();

    // Test 5: Complete workflow
    await testCompleteRoadtrip();

    console.log('✅ ALL TESTS COMPLETE!\n');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error(error.stack);
  }
}

// Run all tests
runAllTests();
