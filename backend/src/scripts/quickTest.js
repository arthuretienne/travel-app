// Quick test to debug Air Scraper API responses
import axios from 'axios';
import 'dotenv/config';

const AIR_SCRAPER_API_KEY = process.env.AIR_SCRAPER_API_KEY;
const BASE_URL = 'https://sky-scrapper.p.rapidapi.com';

async function testSearchEverywhere() {
  try {
    console.log('Testing searchFlightEverywhere...\n');

    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlightEverywhere`, {
      params: {
        originSkyId: 'CDG',
        currency: 'EUR',
        anytime: 'true',
      },
      headers: {
        'X-RapidAPI-Key': AIR_SCRAPER_API_KEY,
        'X-RapidAPI-Host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    console.log('Status:', response.status);
    console.log('Data structure:', JSON.stringify(response.data, null, 2).substring(0, 1000));

    if (response.data?.data?.results) {
      console.log('\nFound', response.data.data.results.length, 'destinations');
      console.log('First 3:', response.data.data.results.slice(0, 3).map(d => ({
        name: d.content?.location?.name,
        price: d.price?.amount
      })));
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testSearchFlights() {
  try {
    console.log('\n\nTesting searchFlightsComplete with near date...\n');

    // Date plus proche (1 mois)
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dateStr = nextMonth.toISOString().split('T')[0];

    console.log('Date:', dateStr);

    // Test 1: With IATA codes (like your example: LOND, NYCA)
    console.log('Try 1: Using city codes PARI → BCN');
    let response = await axios.get(`${BASE_URL}/api/v2/flights/searchFlightsComplete`, {
      params: {
        originSkyId: 'PARI',
        destinationSkyId: 'BCN',
        originEntityId: '27539733',
        destinationEntityId: '27544008',
        date: dateStr,
        cabinClass: 'economy',
        adults: '1',
        sortBy: 'best',
        currency: 'USD',
        market: 'en-US',
        countryCode: 'US',
      },
      headers: {
        'X-RapidAPI-Key': AIR_SCRAPER_API_KEY,
        'X-RapidAPI-Host': 'sky-scrapper.p.rapidapi.com',
      },
    });

    console.log('Status:', response.status);
    console.log('Data structure:', JSON.stringify(response.data, null, 2).substring(0, 2000));

    if (response.data?.data?.itineraries) {
      console.log('\nFound', response.data.data.itineraries.length, 'flights');
      const flight = response.data.data.itineraries[0];
      console.log('First flight:', {
        price: flight.price?.formatted,
        legs: flight.legs?.length,
        departure: flight.legs?.[0]?.departure,
      });
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run tests
testSearchEverywhere()
  .then(() => testSearchFlights())
  .catch(console.error);
