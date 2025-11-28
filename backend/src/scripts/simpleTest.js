// Test exact API call from RapidAPI example
import axios from 'axios';
import 'dotenv/config';

const AIR_SCRAPER_API_KEY = process.env.AIR_SCRAPER_API_KEY;

async function testExactExample() {
  try {
    console.log('Testing exact API call from RapidAPI docs...\n');

    // Add date (30 days from now)
    const today = new Date();
    const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dateStr = future.toISOString().split('T')[0];

    console.log('Date:', dateStr);

    // Exact params from your working example + date
    const response = await axios.get('https://sky-scrapper.p.rapidapi.com/api/v2/flights/searchFlightsComplete', {
      params: {
        originSkyId: 'LOND',
        destinationSkyId: 'NYCA',
        originEntityId: '27544008',
        destinationEntityId: '27537542',
        date: dateStr, // Added required date
        cabinClass: 'economy',
        adults: '1',
        sortBy: 'best',
        currency: 'USD',
        market: 'en-US',
        countryCode: 'US'
      },
      headers: {
        'x-rapidapi-key': AIR_SCRAPER_API_KEY,
        'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com'
      }
    });

    console.log('✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('\nResponse preview:', JSON.stringify(response.data, null, 2).substring(0, 1500));

    if (response.data?.data?.itineraries) {
      console.log('\n🎉 Found', response.data.data.itineraries.length, 'flights!');
      const first = response.data.data.itineraries[0];
      console.log('\nFirst flight:');
      console.log('  Price:', first.price?.formatted);
      console.log('  Carrier:', first.legs?.[0]?.carriers?.marketing?.[0]?.name);
    }

  } catch (error) {
    console.error('❌ Error:');
    console.error('  Status:', error.response?.status);
    console.error('  Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('  Message:', error.message);
  }
}

testExactExample();
