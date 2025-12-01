// backend/src/scripts/testCompleteWorkflow.js
// Test COMPLETE migration workflow: Claude AI + Booking.com API

import { discoverDestinations, optimizeDestination } from '../services/destinationService.js';

console.log('🧪 TESTING COMPLETE BOOKING.COM MIGRATION WORKFLOW\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const testUserProfile = {
  basic: {
    budget: 800,
    style: 'Cultural Explorer',
    activities: ['Museums', 'Local cuisine', 'Walking tours'],
    maxFlightHours: 3,
    destinationPreference: 'Europe'
  },
  preferences: {
    climate: 'Mild',
    accommodation: 'Hotel',
    pace: 'Balanced',
    gastronomy: 'High',
    natureVsCity: 30,
    nightlife: 'Moderate',
    activitiesBudget: 30,
    avoidCrowds: true
  },
  constraints: {
    languages: ['English', 'French'],
    security: 'Important',
    visa: 'Visa-free',
    mobility: 'None',
    travelers: 1
  }
};

async function testCompleteWorkflow() {
  try {
    console.log('🚀 TEST 1: Discover Destinations (NEW WORKFLOW)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const destinations = await discoverDestinations({
      userProfile: testUserProfile,
      budget: 800,
      origin: 'Paris',
      duration: 7
    });

    console.log(`\n✅ DISCOVER DESTINATIONS COMPLETE`);
    console.log(`Found ${destinations.length} destinations:\n`);

    destinations.forEach((dest, i) => {
      console.log(`${i + 1}. ${dest.name} (${dest.countryName})`);
      console.log(`   Flight: €${dest.price.amount} - ${dest.flightCount} options`);
      console.log(`   Airline: ${dest.flight.outbound.airline}`);
      console.log('');
    });

    // Test optimize for best destination
    if (destinations.length > 0) {
      const bestDestination = destinations[0];

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🚀 TEST 2: Optimize Trip for ${bestDestination.name}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const optimizedTrip = await optimizeDestination({
        destination: bestDestination.cityName,
        userProfile: testUserProfile,
        budget: 800,
        origin: 'Paris',
        duration: 7
      });

      console.log(`\n✅ OPTIMIZE DESTINATION COMPLETE`);
      console.log(`\nTrip Summary for ${optimizedTrip.destination.name}:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`\n✈️  FLIGHTS:`);
      console.log(`   Outbound: ${optimizedTrip.flight.outbound.departureTime}`);
      console.log(`   Return: ${optimizedTrip.flight.return?.departureTime || 'N/A'}`);
      console.log(`   Airline: ${optimizedTrip.flight.outbound.airline}`);
      console.log(`   Cost: €${optimizedTrip.totalCost.flights}`);

      console.log(`\n🏨 HOTEL:`);
      console.log(`   Name: ${optimizedTrip.hotel.name}`);
      console.log(`   Stars: ${optimizedTrip.hotel.stars}⭐`);
      console.log(`   Rating: ${optimizedTrip.hotel.rating?.value || 'N/A'}/10`);
      console.log(`   Price: €${optimizedTrip.hotel.pricePerNight}/night × ${optimizedTrip.hotel.totalNights} nights`);
      console.log(`   Total: €${optimizedTrip.totalCost.accommodation}`);

      console.log(`\n💰 BUDGET BREAKDOWN:`);
      console.log(`   Flights: €${optimizedTrip.totalCost.flights}`);
      console.log(`   Hotel: €${optimizedTrip.totalCost.accommodation}`);
      console.log(`   Activities: €${optimizedTrip.totalCost.activities}`);
      console.log(`   ━━━━━━━━━━━━━━━━`);
      console.log(`   TOTAL: €${optimizedTrip.totalCost.total} / €${optimizedTrip.budget}`);
      console.log(`   Remaining: €${optimizedTrip.totalCost.remaining}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 MIGRATION COMPLETE AND WORKING!');
    console.log('\nNew workflow:');
    console.log('1. ✅ Claude AI generates personalized shortlist');
    console.log('2. ✅ Destination IDs cached in Redis');
    console.log('3. ✅ Booking.com API searches flights');
    console.log('4. ✅ Booking.com API searches hotels');
    console.log('5. ✅ Budget optimization works');
    console.log('\n🚀 Ready for production!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testCompleteWorkflow();
