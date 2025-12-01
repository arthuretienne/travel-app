// Test both fixes
import * as bookingService from '../services/bookingService.js';

console.log('🧪 TEST: Critical Fixes\n');
console.log('='.repeat(80));
console.log('\n');

async function testFix1_AirportToCityMapping() {
  console.log('📋 FIX #1: Airport → City Name Mapping\n');

  try {
    // Test with cities that return airport names
    const barcelona = await bookingService.getDestinationId('Barcelona');
    console.log(`Barcelona:`);
    console.log(`   API Name: ${barcelona.name}`);
    console.log(`   City Name: ${barcelona.cityName} ✅`);
    console.log(`   Flight Code: ${barcelona.flightCode}`);
    console.log('');

    const porto = await bookingService.getDestinationId('Porto');
    console.log(`Porto:`);
    console.log(`   API Name: ${porto.name}`);
    console.log(`   City Name: ${porto.cityName} ✅`);
    console.log(`   Flight Code: ${porto.flightCode}`);
    console.log('');

    // Now test hotel search with cityName
    console.log('Testing hotel search with cityName...\n');

    const hotels = await bookingService.searchHotels({
      destinationQuery: barcelona.cityName, // Use cityName instead of name
      arrivalDate: '2026-02-15',
      departureDate: '2026-02-22',
      adults: 1,
      rooms: 1,
      currency: 'EUR'
    });

    if (hotels.count > 0) {
      console.log(`✅ FIX #1 WORKS! Found ${hotels.count} hotels using cityName "${barcelona.cityName}"`);
    } else {
      console.log(`❌ FIX #1 FAILED: 0 hotels found`);
    }

  } catch (error) {
    console.error('❌ FIX #1 TEST FAILED:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n');
}

async function testFix2_RoundTripFallback() {
  console.log('📋 FIX #2: Round-Trip Fallback\n');

  try {
    console.log('Testing round-trip search...\n');

    const flights = await bookingService.searchFlights({
      fromId: 'PAR.CITY',
      toId: 'BCN.CITY',
      departDate: '2026-02-15',
      returnDate: '2026-02-22', // Round-trip
      adults: 1,
      cabinClass: 'ECONOMY',
      currency: 'EUR'
    });

    if (flights.count > 0) {
      console.log(`✅ FIX #2 WORKS! Found ${flights.count} round-trip flight(s)`);

      if (flights.isCombinedOneWay) {
        console.log(`   ℹ️  Used fallback (2× one-way combined)`);
      } else {
        console.log(`   ℹ️  Used direct round-trip API`);
      }

      const cheapest = flights.flights[0];
      console.log(`   Price: €${cheapest.price.amount}`);
      console.log(`   Outbound: ${cheapest.outbound.airline} (${cheapest.outbound.departureTime})`);
      console.log(`   Return: ${cheapest.return.airline} (${cheapest.return.departureTime})`);
    } else {
      console.log(`❌ FIX #2 FAILED: No flights found`);
    }

  } catch (error) {
    console.error('❌ FIX #2 TEST FAILED:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n');
}

async function runTests() {
  await testFix1_AirportToCityMapping();
  await testFix2_RoundTripFallback();

  console.log('✅ ALL FIXES TESTED!\n');
}

runTests();
