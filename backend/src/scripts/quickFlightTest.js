// Quick flight test with specific date
import 'dotenv/config';
import * as airScraper from '../services/airScraperService.js';

async function test() {
  // Use a different date to avoid cache
  const testDate = '2026-01-15';

  console.log(`\n🧪 Testing searchFlights for ${testDate}\n`);

  const result = await airScraper.searchFlights({
    originQuery: 'Paris',
    destinationQuery: 'Barcelona',
    date: testDate,
    adults: 1,
    cabinClass: 'economy',
    currency: 'EUR',
    market: 'fr-FR',
  });

  console.log(`\n✅ Result:`);
  console.log(`Origin: ${result.origin.name} (${result.origin.iata})`);
  console.log(`Destination: ${result.destination.name} (${result.destination.iata})`);
  console.log(`Flights found: ${result.count}`);

  if (result.count > 0) {
    console.log(`\nTop 3 flights:`);
    result.flights.slice(0, 3).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.price.formatted} - ${f.outbound.carriers[0]?.name}`);
      console.log(`     ${f.outbound.departure} → ${f.outbound.arrival}`);
    });
  }
}

test().catch(console.error);
