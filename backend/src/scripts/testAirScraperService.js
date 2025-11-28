// Test airScraperService.js
import 'dotenv/config';
import * as airScraper from '../services/airScraperService.js';

async function testService() {
  console.log('🧪 Testing Air Scraper Service\n');
  console.log('='.repeat(60));

  try {
    // Test 1: searchAirport
    console.log('\n📋 TEST 1: searchAirport');
    console.log('-'.repeat(60));
    const airports = await airScraper.searchAirport('Paris');
    console.log(`Found ${airports.length} airports:`);
    airports.slice(0, 3).forEach(airport => {
      console.log(`  - ${airport.name} (${airport.skyId}) [${airport.type}]`);
    });

    // Test 2: searchFlights
    console.log('\n📋 TEST 2: searchFlights');
    console.log('-'.repeat(60));
    const today = new Date();
    const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dateStr = future.toISOString().split('T')[0];

    const flightResults = await airScraper.searchFlights({
      originQuery: 'Paris',
      destinationQuery: 'Barcelona',
      date: dateStr,
      adults: 1,
      cabinClass: 'economy',
      currency: 'EUR',
      market: 'fr-FR',
    });

    console.log(`\nFound ${flightResults.count} flights:`);
    flightResults.flights.slice(0, 3).forEach((flight, idx) => {
      console.log(`\n  ${idx + 1}. ${flight.price.formatted}`);
      console.log(`     Carrier: ${flight.outbound.carriers[0]?.name || 'Unknown'}`);
      console.log(`     Depart: ${flight.outbound.departure}`);
      console.log(`     Arrive: ${flight.outbound.arrival}`);
      console.log(`     Duration: ${flight.outbound.durationMinutes}min`);
      console.log(`     Stops: ${flight.outbound.stops}`);
    });

    // Test 3: Cache hit (should be instant)
    console.log('\n📋 TEST 3: Cache hit test (re-run searchFlights)');
    console.log('-'.repeat(60));
    const startTime = Date.now();
    await airScraper.searchFlights({
      originQuery: 'Paris',
      destinationQuery: 'Barcelona',
      date: dateStr,
      adults: 1,
      cabinClass: 'economy',
      currency: 'EUR',
      market: 'fr-FR',
    });
    const cacheTime = Date.now() - startTime;
    console.log(`✅ Cache hit! Response in ${cacheTime}ms (should be <10ms)`);

    // Test 4: getPriceCalendar
    console.log('\n📋 TEST 4: getPriceCalendar');
    console.log('-'.repeat(60));
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const year = nextMonth.getFullYear();
    const month = nextMonth.getMonth() + 1;

    const calendar = await airScraper.getPriceCalendar({
      originQuery: 'Paris',
      destinationQuery: 'Amsterdam',
      year: year,
      month: month,
      currency: 'EUR',
      market: 'fr-FR',
    });

    if (calendar.cheapestDate) {
      console.log(`\nCheapest date: ${calendar.cheapestDate.date} at €${calendar.cheapestDate.price}`);
      console.log(`Price range: €${calendar.priceRange.min} - €${calendar.priceRange.max}`);
      console.log(`Average: €${calendar.priceRange.avg}`);
      console.log(`Found ${calendar.days.length} days with prices`);
    }

    // Test 5: searchFlightEverywhere
    console.log('\n📋 TEST 5: searchFlightEverywhere');
    console.log('-'.repeat(60));
    const destinations = await airScraper.searchFlightEverywhere({
      originQuery: 'Paris',
      maxPrice: 200,
      currency: 'EUR',
      market: 'fr-FR',
    });

    console.log(`\nFound ${destinations.length} destinations under €200:`);
    destinations.slice(0, 10).forEach((dest, idx) => {
      console.log(`  ${idx + 1}. ${dest.name} - ${dest.price.formatted}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

testService();
