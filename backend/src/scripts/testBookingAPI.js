// backend/src/scripts/testBookingAPI.js
// Test Booking.com API to see if it can replace Air Scraper API

import axios from 'axios';

const BOOKING_API_KEY = 'b723f67a8cmshf49874500229ca8p12d559jsnedd1aee8f4ea';
const BASE_URL = 'https://booking-com15.p.rapidapi.com';

const headers = {
  'x-rapidapi-key': BOOKING_API_KEY,
  'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
};

console.log('🧪 Testing Booking.com API...\n');

// Test 1: Search Flight Location (to get fromId/toId)
async function testSearchFlightLocation() {
  console.log('📍 Test 1: Search Flight Location (Paris)');
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchDestination`, {
      params: {
        query: 'Paris'
      },
      headers
    });

    console.log('✅ SUCCESS - Search Flight Location');
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    if (response.data?.data?.[0]) {
      const location = response.data.data[0];
      console.log(`\n📌 Found: ${location.name} - ID: ${location.id}`);
      return location.id; // Return ID for next test
    }
  } catch (error) {
    console.error('❌ FAILED - Search Flight Location');
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

// Test 2: Search Flights (Paris to Barcelona)
async function testSearchFlights(fromId, toId) {
  console.log('\n✈️  Test 2: Search Flights (Paris → Barcelona)');
  try {
    const departDate = '2025-12-20';
    const returnDate = '2025-12-27';

    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlights`, {
      params: {
        fromId: fromId || 'PAR.AIRPORT', // Fallback to PAR if not found
        toId: toId || 'BCN.AIRPORT',     // Fallback to BCN if not found
        departDate: departDate,
        returnDate: returnDate,
        adults: 1,
        cabinClass: 'ECONOMY',
        sort: 'BEST',
        currency_code: 'EUR'
      },
      headers,
      timeout: 30000 // 30 second timeout
    });

    console.log('✅ SUCCESS - Search Flights');
    console.log('Response status:', response.data?.status);

    if (response.data?.data?.flights) {
      const flights = response.data.data.flights;
      console.log(`\n✈️  Found ${flights.length} flights`);

      if (flights.length > 0) {
        const firstFlight = flights[0];
        console.log('\nFirst flight:');
        console.log(`  Price: ${firstFlight.price?.amount} ${firstFlight.price?.currency}`);
        console.log(`  Airline: ${firstFlight.segments?.[0]?.airline?.name || 'N/A'}`);
        console.log(`  Duration: ${firstFlight.duration || 'N/A'}`);
        console.log(`  Stops: ${firstFlight.segments?.length - 1 || 0}`);
      }
    }

    return response.data;
  } catch (error) {
    console.error('❌ FAILED - Search Flights');
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

// Test 3: Get Min Price
async function testGetMinPrice(fromId, toId) {
  console.log('\n💰 Test 3: Get Min Price (Paris → Barcelona)');
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/getMinPrice`, {
      params: {
        fromId: fromId || 'PAR.AIRPORT',
        toId: toId || 'BCN.AIRPORT',
        departDate: '2025-12-20',
        returnDate: '2025-12-27',
        cabinClass: 'ECONOMY',
        currency_code: 'EUR'
      },
      headers
    });

    console.log('✅ SUCCESS - Get Min Price');
    console.log('Min Price:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ FAILED - Get Min Price');
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

// Test 4: Search Hotel Destination (to get dest_id)
async function testSearchHotelDestination() {
  console.log('\n🏨 Test 4: Search Hotel Destination (Barcelona)');
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/hotels/searchDestination`, {
      params: {
        query: 'Barcelona'
      },
      headers
    });

    console.log('✅ SUCCESS - Search Hotel Destination');
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    if (response.data?.data?.[0]) {
      const destination = response.data.data[0];
      console.log(`\n📌 Found: ${destination.name} - dest_id: ${destination.dest_id}`);
      return destination.dest_id;
    }
  } catch (error) {
    console.error('❌ FAILED - Search Hotel Destination');
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

// Test 5: Search Hotels
async function testSearchHotels(dest_id) {
  console.log('\n🏨 Test 5: Search Hotels (Barcelona)');
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/hotels/searchHotels`, {
      params: {
        dest_id: dest_id || -372490, // Barcelona dest_id fallback
        search_type: 'CITY',
        arrival_date: '2025-12-20',
        departure_date: '2025-12-27',
        adults: 1,
        room_qty: 1,
        page_number: 1,
        units: 'metric',
        temperature_unit: 'c',
        languagecode: 'en-us',
        currency_code: 'EUR'
      },
      headers,
      timeout: 30000
    });

    console.log('✅ SUCCESS - Search Hotels');
    console.log('Response status:', response.data?.status);

    if (response.data?.data?.hotels) {
      const hotels = response.data.data.hotels;
      console.log(`\n🏨 Found ${hotels.length} hotels`);

      if (hotels.length > 0) {
        const firstHotel = hotels[0];
        console.log('\nFirst hotel:');
        console.log(`  Name: ${firstHotel.property?.name || 'N/A'}`);
        console.log(`  Price: ${firstHotel.price?.amount} ${firstHotel.price?.currency}`);
        console.log(`  Rating: ${firstHotel.property?.rating || 'N/A'}`);
        console.log(`  Stars: ${firstHotel.property?.stars || 'N/A'}`);
      }
    }

    return response.data;
  } catch (error) {
    console.error('❌ FAILED - Search Hotels');
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

// Run all tests
async function runAllTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 BOOKING.COM API TEST SUITE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = {
    searchFlightLocation: false,
    searchFlights: false,
    getMinPrice: false,
    searchHotelDestination: false,
    searchHotels: false,
    totalAPICalls: 0
  };

  // Test flights
  const parisId = await testSearchFlightLocation();
  results.totalAPICalls++;
  results.searchFlightLocation = !!parisId;

  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between calls

  const barcelonaId = await testSearchFlightLocation();
  results.totalAPICalls++;

  await new Promise(resolve => setTimeout(resolve, 2000));

  const flightResults = await testSearchFlights(parisId, barcelonaId);
  results.totalAPICalls++;
  results.searchFlights = !!flightResults;

  await new Promise(resolve => setTimeout(resolve, 2000));

  const minPrice = await testGetMinPrice(parisId, barcelonaId);
  results.totalAPICalls++;
  results.getMinPrice = !!minPrice;

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test hotels
  const dest_id = await testSearchHotelDestination();
  results.totalAPICalls++;
  results.searchHotelDestination = !!dest_id;

  await new Promise(resolve => setTimeout(resolve, 2000));

  const hotelResults = await testSearchHotels(dest_id);
  results.totalAPICalls++;
  results.searchHotels = !!hotelResults;

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Search Flight Location: ${results.searchFlightLocation ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Search Flights: ${results.searchFlights ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Get Min Price: ${results.getMinPrice ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Search Hotel Destination: ${results.searchHotelDestination ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Search Hotels: ${results.searchHotels ? '✅ PASS' : '❌ FAIL'}`);

  const passedTests = Object.values(results).filter(v => v === true).length - 1; // -1 for totalAPICalls
  const totalTests = 5;

  console.log(`\n📈 Score: ${passedTests}/${totalTests} tests passed`);
  console.log(`📞 API Calls Used: ${results.totalAPICalls}/50 (Free Tier)`);
  console.log(`📞 API Calls Remaining: ${50 - results.totalAPICalls}/50`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 RECOMMENDATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (passedTests === totalTests) {
    console.log('✅ Booking.com API fonctionne parfaitement!');
    console.log('✅ Peut remplacer Air Scraper API pour flights + hotels');
    console.log('⚠️  MAIS: Pas de "searchEverywhere" → besoin de Claude pour suggérer destinations');
    console.log('⚠️  LIMITE: 50 calls/month = ~8-10 trips max avec free tier');
    console.log('💰 SOLUTION: Upgrade to Pro ($8.99/month) pour 35k calls');
  } else if (passedTests >= 3) {
    console.log('⚠️  Booking.com API fonctionne partiellement');
    console.log('Vérifier les erreurs ci-dessus pour voir quels endpoints ont échoué');
  } else {
    console.log('❌ Booking.com API ne fonctionne pas correctement');
    console.log('Chercher une alternative API');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
