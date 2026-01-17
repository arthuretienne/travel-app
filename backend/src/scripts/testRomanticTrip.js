// Test script for romantic trip workflow
// Simulates: "voyage romantique avec ma femme pour ses 50 ans" à Rome, 2 voyageurs, 1500€, 3 jours

import * as bookingService from '../services/bookingService.js';
import * as destinationService from '../services/destinationService.js';

async function testRomanticTripWorkflow() {
  console.log('='.repeat(80));
  console.log('🧪 TEST: Romantic Trip Workflow');
  console.log('='.repeat(80));
  console.log('\n📋 Test Case:');
  console.log('   - Destination: Rome');
  console.log('   - Travelers: 2 (couple)');
  console.log('   - Budget: 1500€');
  console.log('   - Duration: 3 days');
  console.log('   - Brief: "voyage romantique avec ma femme pour ses 50 ans"');
  console.log('\n');

  const userProfile = {
    basic: {
      destination: 'Rome',
      budget: 1500,
      travelers: 2, // <-- THIS IS WHERE FRONTEND SENDS IT
      travelVibeDescription: 'voyage romantique avec ma femme pour ses 50 ans',
      style: 'confort',
      activities: ['culture', 'gastronomie'],
    },
    constraints: {
      // travelers is NOT here in real frontend payload
      languages: 'any',
      security: 'moderate',
      visa: 'no-visa',
      mobility: 'none',
    },
    preferences: {
      climate: 'warm',
      accommodation: 'hotel',
      pace: 'moderate',
    },
    availability: {
      startDate: '2026-02-14', // Valentine's Day - future date
      duration: 3,
    },
    onboardingPreferences: {
      accommodationPref: 'confort',
      materialComfort: 70,
    }
  };

  try {
    // Test 1: Check travelers extraction
    console.log('─'.repeat(80));
    console.log('📍 TEST 1: Travelers Extraction');
    console.log('─'.repeat(80));

    const travelers = userProfile.basic?.travelers || userProfile.constraints?.travelers || 1;
    console.log(`   userProfile.basic.travelers = ${userProfile.basic?.travelers}`);
    console.log(`   userProfile.constraints.travelers = ${userProfile.constraints?.travelers}`);
    console.log(`   ✅ Extracted travelers = ${travelers}`);

    if (travelers !== 2) {
      console.log('   ❌ FAIL: Expected 2 travelers, got', travelers);
      return;
    }
    console.log('   ✅ PASS: Correctly extracted 2 travelers\n');

    // Test 2: Trip context extraction
    console.log('─'.repeat(80));
    console.log('📍 TEST 2: Trip Context Extraction');
    console.log('─'.repeat(80));

    const tripContext = userProfile.basic?.travelVibeDescription;
    console.log(`   Trip context: "${tripContext}"`);

    // Simulate extractTripContext logic
    const text = tripContext.toLowerCase();
    const isRomantic = ['romantic', 'romantique', 'couple', 'femme', 'wife', 'anniversary', 'anniversaire'].some(kw => text.includes(kw));
    const isLuxury = ['birthday', 'anniversaire', '50 ans', '40 ans', '30 ans'].some(kw => text.includes(kw));

    console.log(`   isRomantic = ${isRomantic} (expected: true)`);
    console.log(`   isLuxury = ${isLuxury} (expected: true)`);

    if (!isRomantic || !isLuxury) {
      console.log('   ❌ FAIL: Context not properly detected');
      return;
    }
    console.log('   ✅ PASS: Romantic + Luxury context detected\n');

    // Test 3: Hotel search with context
    console.log('─'.repeat(80));
    console.log('📍 TEST 3: Hotel Search with Context');
    console.log('─'.repeat(80));

    const hotelResults = await bookingService.searchHotels({
      destinationQuery: 'Rome',
      arrivalDate: '2026-02-14',
      departureDate: '2026-02-17',
      adults: 2,  // Should be 2, not 1!
      children: 0,
      rooms: 1,
      currency: 'EUR',
      accommodationPref: 'confort',
      materialComfort: 70,
      maxPrice: 800, // Rough budget for hotel
      tripContext: tripContext,
    });

    console.log(`\n   📊 Hotel Search Results:`);
    console.log(`   - Total hotels found: ${hotelResults.count}`);
    console.log(`   - Trip context applied: ${JSON.stringify(hotelResults.tripContextApplied)}`);

    if (hotelResults.hotels.length > 0) {
      console.log(`\n   🏨 Top 5 Hotels (sorted by context score):`);
      hotelResults.hotels.slice(0, 5).forEach((hotel, i) => {
        console.log(`      ${i + 1}. ${hotel.name}`);
        console.log(`         ⭐ ${hotel.stars} stars | Rating: ${hotel.rating?.value || 'N/A'}/10`);
        console.log(`         💰 €${Math.round(hotel.price.amount)} total (€${Math.round(hotel.price.amount / 3)}/night)`);
        console.log(`         🎯 Context score: ${hotel.contextScore}`);
        console.log(`         📝 ${hotel.description?.substring(0, 100)}...`);
        console.log('');
      });

      // Check if first hotel is appropriate (not a hostel)
      const firstHotel = hotelResults.hotels[0];
      const isHostel = firstHotel.name.toLowerCase().includes('hostel') ||
                       firstHotel.name.toLowerCase().includes('auberge') ||
                       firstHotel.stars < 3;

      if (isHostel) {
        console.log('   ❌ FAIL: First hotel is a hostel/budget - not appropriate for romantic trip');
      } else {
        console.log('   ✅ PASS: First hotel appears appropriate for romantic trip');
      }
    }

    // Test 4: Full optimization
    console.log('\n');
    console.log('─'.repeat(80));
    console.log('📍 TEST 4: Full Trip Optimization');
    console.log('─'.repeat(80));

    const optimizedTrip = await destinationService.optimizeDestination({
      destination: 'Rome',
      userProfile,
      budget: 1500,
      origin: 'Paris',
      duration: 3,
      departureDate: '2026-02-14',
      tripContext: tripContext,
    });

    console.log(`\n   ✈️  Flight:`);
    console.log(`      - Price: €${optimizedTrip.flight.totalCost} for ${optimizedTrip.flight.travelers || 'N/A'} travelers`);
    console.log(`      - Route: ${optimizedTrip.flight.outbound?.departureAirport} → ${optimizedTrip.flight.outbound?.arrivalAirport}`);

    console.log(`\n   🏨 Hotel:`);
    console.log(`      - Name: ${optimizedTrip.hotel.name}`);
    console.log(`      - Stars: ${optimizedTrip.hotel.stars}`);
    console.log(`      - Rating: ${optimizedTrip.hotel.rating?.value || 'N/A'}/10`);
    console.log(`      - Total: €${optimizedTrip.hotel.totalPrice} (${optimizedTrip.hotel.totalNights} nights)`);

    console.log(`\n   💰 Budget Breakdown:`);
    console.log(`      - Flight: €${optimizedTrip.budget.flight}`);
    console.log(`      - Hotel: €${optimizedTrip.budget.hotel}`);
    console.log(`      - Activities: €${optimizedTrip.budget.activities}`);
    console.log(`      - Total: €${optimizedTrip.budget.total}`);
    console.log(`      - Remaining: €${optimizedTrip.budget.remaining}`);

    // Final verdict
    console.log('\n');
    console.log('='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    const hotelIsAppropriate = optimizedTrip.hotel.stars >= 3 &&
                               !optimizedTrip.hotel.name.toLowerCase().includes('hostel');
    const budgetIsReasonable = optimizedTrip.budget.total <= 1500;

    console.log(`   ✅ Travelers correctly set to 2: ${travelers === 2 ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Romantic context detected: ${isRomantic ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Luxury context detected: ${isLuxury ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Hotel appropriate for couples: ${hotelIsAppropriate ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Budget respected: ${budgetIsReasonable ? 'PASS' : 'FAIL'}`);

    const allPassed = travelers === 2 && isRomantic && isLuxury && hotelIsAppropriate && budgetIsReasonable;
    console.log(`\n   ${allPassed ? '🎉 ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'}`);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testRomanticTripWorkflow();
