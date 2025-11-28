// Full workflow: searchAirport → searchFlights
import axios from 'axios';
import 'dotenv/config';

const AIR_SCRAPER_API_KEY = process.env.AIR_SCRAPER_API_KEY;
const BASE_URL = 'https://sky-scrapper.p.rapidapi.com';

async function searchAirport(query) {
  console.log(`\n🔍 Searching airport for "${query}"...`);

  const response = await axios.get(`${BASE_URL}/api/v1/flights/searchAirport`, {
    params: {
      query: query,
      locale: 'en-US'
    },
    headers: {
      'x-rapidapi-key': AIR_SCRAPER_API_KEY,
      'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com'
    }
  });

  console.log('Response status:', response.data?.status);

  if (response.data?.data && response.data.data.length > 0) {
    const results = response.data.data.slice(0, 5);
    console.log(`\nFound ${results.length} airports:`);

    results.forEach((airport, idx) => {
      console.log(`  ${idx + 1}. ${airport.presentation?.title || airport.name}`);
      console.log(`     skyId: ${airport.skyId}, entityId: ${airport.entityId}`);
      console.log(`     Type: ${airport.navigation?.entityType}`);
    });

    return results[0]; // Return first match
  }

  return null;
}

async function searchFlights(origin, destination, date) {
  console.log(`\n✈️  Searching flights ${origin.skyId} → ${destination.skyId} on ${date}...`);

  try {
    // Try v1 API
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlights`, {
      params: {
        originSkyId: origin.skyId,
        destinationSkyId: destination.skyId,
        originEntityId: origin.entityId,
        destinationEntityId: destination.entityId,
        date: date,
        cabinClass: 'economy',
        adults: '1',
        sortBy: 'best',
        currency: 'EUR',
        market: 'fr-FR',
        countryCode: 'FR'
      },
      headers: {
        'x-rapidapi-key': AIR_SCRAPER_API_KEY,
        'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com'
      }
    });

    console.log('\n📊 Response status:', response.data?.status);
    console.log('Message:', response.data?.message);

    if (response.data?.data?.itineraries) {
      const flights = response.data.data.itineraries.slice(0, 3);
      console.log(`\n🎉 Found ${flights.length} flights!\n`);

      flights.forEach((flight, idx) => {
        console.log(`${idx + 1}. ${flight.price?.formatted || 'N/A'}`);
        console.log(`   Carrier: ${flight.legs?.[0]?.carriers?.marketing?.[0]?.name || 'Unknown'}`);
        console.log(`   Departure: ${flight.legs?.[0]?.departure || 'N/A'}`);
        console.log(`   Arrival: ${flight.legs?.[0]?.arrival || 'N/A'}`);
        console.log('');
      });

      return flights;
    } else {
      console.log('\n⚠️  No flights found');
      console.log('Full response:', JSON.stringify(response.data, null, 2).substring(0, 1000));
    }

  } catch (error) {
    console.error('\n❌ Error searching flights:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
  }

  return null;
}

async function main() {
  try {
    console.log('🚀 Starting full workflow test...\n');
    console.log('='.repeat(60));

    // Step 1: Find airports
    const paris = await searchAirport('Paris');
    const barcelona = await searchAirport('Barcelona');

    if (!paris || !barcelona) {
      console.error('\n❌ Could not find airports');
      return;
    }

    // Step 2: Calculate date (30 days from now)
    const today = new Date();
    const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dateStr = future.toISOString().split('T')[0];

    console.log(`\n📅 Travel date: ${dateStr}`);

    // Step 3: Search flights
    await searchFlights(paris, barcelona, dateStr);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Workflow complete!');

  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    console.error(error);
  }
}

main();
