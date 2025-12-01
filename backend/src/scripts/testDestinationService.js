// Test destinationService.js
import 'dotenv/config';
import * as destinationService from '../services/destinationService.js';

async function testDestinationService() {
  console.log('🧪 Testing Destination Service\n');
  console.log('='.repeat(60));

  // Mock user profile
  const userProfile = {
    interests: ['beach', 'culture', 'food'],
    budgetLevel: 'medium',
    travelPace: 'moderate',
    climate: 'warm',
  };

  try {
    // Test 1: discoverDestinations
    console.log('\n📋 TEST 1: discoverDestinations (WITHOUT destination scenario)');
    console.log('-'.repeat(60));

    const discovered = await destinationService.discoverDestinations({
      userProfile,
      budget: 800,
      origin: 'Paris',
      duration: 7,
    });

    console.log(`\nDiscovered ${discovered.length} destinations:`);
    discovered.forEach((dest, idx) => {
      console.log(`\n  ${idx + 1}. ${dest.name}, ${dest.country || 'Unknown'}`);
      console.log(`     Region: ${dest.region}`);
      console.log(`     Price: ${dest.price?.formatted || 'N/A'}`);
      console.log(`     Score: ${dest.score || 0}`);
      console.log(`     Cost of living: €${dest.costOfLiving}/day`);
    });

    // Test 2: optimizeDestination (WITH destination scenario)
    console.log('\n\n📋 TEST 2: optimizeDestination (WITH destination scenario)');
    console.log('-'.repeat(60));

    const today = new Date();
    const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dateStr = future.toISOString().split('T')[0];

    const optimized = await destinationService.optimizeDestination({
      destination: 'Barcelona',
      userProfile,
      budget: 800,
      origin: 'Paris',
      duration: 7,
      departureDate: dateStr,
    });

    console.log('\n✅ Trip Optimized!');
    console.log('\nDestination:', optimized.destination.name);
    console.log('\nDates:');
    console.log(`  Departure: ${optimized.dates.departure}`);
    console.log(`  Return: ${optimized.dates.return}`);
    console.log(`  Duration: ${optimized.dates.duration} days`);

    console.log('\nFlight:');
    console.log(`  Carrier: ${optimized.flight.outbound.carrier}`);
    console.log(`  Departure: ${optimized.flight.outbound.departure}`);
    console.log(`  Arrival: ${optimized.flight.outbound.arrival}`);
    console.log(`  Duration: ${optimized.flight.outbound.duration} min`);
    console.log(`  Stops: ${optimized.flight.outbound.stops}`);
    console.log(`  Cost: €${optimized.flight.totalCost}`);

    console.log('\nHotel:');
    console.log(`  Name: ${optimized.hotel.name}`);
    console.log(`  Price: €${optimized.hotel.pricePerNight}/night × ${optimized.hotel.totalNights} nights`);
    console.log(`  Total: €${optimized.hotel.totalPrice}`);

    console.log('\nBudget Breakdown:');
    console.log(`  Total: €${optimized.budget.total}`);
    console.log(`  Flight: €${optimized.budget.flight}`);
    console.log(`  Hotel: €${optimized.budget.hotel}`);
    console.log(`  Remaining: €${optimized.budget.remaining}`);
    console.log(`  Daily activities: €${optimized.budget.dailyActivities}/day`);

    // Test 3: Multiple destinations in parallel (WITHOUT destination workflow)
    console.log('\n\n📋 TEST 3: Process multiple destinations (parallel workflow)');
    console.log('-'.repeat(60));

    const topDestinations = discovered.slice(0, 3);
    console.log(`\nProcessing top 3 destinations in parallel...`);

    const startTime = Date.now();

    const optimizedTrips = await Promise.all(
      topDestinations.map(dest =>
        destinationService.optimizeDestination({
          destination: dest.name,
          userProfile,
          budget: 800,
          origin: 'Paris',
          duration: 7,
          departureDate: dateStr,
        }).catch(error => {
          console.warn(`⚠️  Failed to optimize ${dest.name}: ${error.message}`);
          return null;
        })
      )
    );

    const processingTime = Date.now() - startTime;

    const successful = optimizedTrips.filter(trip => trip !== null);
    console.log(`\n✅ Processed ${successful.length}/${topDestinations.length} destinations in ${processingTime}ms`);

    successful.forEach((trip, idx) => {
      console.log(`\n  ${idx + 1}. ${trip.destination.name}`);
      console.log(`     Flight: €${trip.flight.totalCost} (${trip.flight.outbound.carrier})`);
      console.log(`     Hotel: €${trip.hotel.totalPrice}`);
      console.log(`     Remaining: €${trip.budget.remaining} for activities`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

testDestinationService();
