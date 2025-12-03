// Check raw hotel API response to see all available data
import axios from 'axios';
import 'dotenv/config';

const BOOKING_API_KEY = process.env.BOOKING_API_KEY;
const BASE_URL = 'https://booking-com15.p.rapidapi.com';

async function test() {
  try {
    // Step 1: Get destination
    const destResponse = await axios.get(`${BASE_URL}/api/v1/hotels/searchDestination`, {
      params: { query: 'Barcelona' },
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      }
    });

    const dest_id = destResponse.data.data[0].dest_id;
    console.log(`Destination ID: ${dest_id}\n`);

    // Step 2: Search hotels
    const hotelsResponse = await axios.get(`${BASE_URL}/api/v1/hotels/searchHotels`, {
      params: {
        dest_id,
        search_type: 'CITY',
        arrival_date: '2026-02-15',
        departure_date: '2026-02-22',
        adults: 1,
        room_qty: 1,
        page_number: 1,
        units: 'metric',
        temperature_unit: 'c',
        languagecode: 'en-us',
        currency_code: 'EUR'
      },
      headers: {
        'x-rapidapi-key': BOOKING_API_KEY,
        'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
      },
      timeout: 30000
    });

    console.log('RAW HOTEL DATA (first hotel):');
    console.log(JSON.stringify(hotelsResponse.data.data.hotels[0], null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
