// backend/src/scripts/testBookingAPIRetry.js
// Retry test avec exactement les paramètres de l'exemple qui marche

import axios from 'axios';

const BOOKING_API_KEY = 'b723f67a8cmshf49874500229ca8p12d559jsnedd1aee8f4ea';
const BASE_URL = 'https://booking-com15.p.rapidapi.com';

const headers = {
  'x-rapidapi-key': BOOKING_API_KEY,
  'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
};

console.log('🧪 RETRY TEST - Booking.com Flight API\n');
console.log('Using exact example parameters that work for you...\n');

// Test with EXACT parameters from your example
async function testFlightsBOMtoDEL() {
  console.log('✈️  Test: BOM.AIRPORT → DEL.AIRPORT (Your working example)');
  console.log('Date: 2025-12-30');
  console.log('Params: stops=none, pageNo=1, adults=1, sort=BEST, cabinClass=ECONOMY, currency_code=AED\n');

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlights`, {
      params: {
        fromId: 'BOM.AIRPORT',
        toId: 'DEL.AIRPORT',
        departDate: '2025-12-30',
        stops: 'none',
        pageNo: 1,
        adults: 1,
        children: '0,17',
        sort: 'BEST',
        cabinClass: 'ECONOMY',
        currency_code: 'AED'
      },
      headers,
      timeout: 30000
    });

    console.log('✅ SUCCESS!');
    console.log('Status:', response.data?.status);
    console.log('Message:', response.data?.message);

    if (response.data?.data?.flights) {
      const flights = response.data.data.flights;
      console.log(`\n🎉 Found ${flights.length} flights!\n`);

      if (flights.length > 0) {
        const firstFlight = flights[0];
        console.log('First flight details:');
        console.log('  Price:', firstFlight.priceBreakdown?.total?.units || 'N/A');
        console.log('  Currency:', firstFlight.priceBreakdown?.total?.currencyCode || 'N/A');
        console.log('  Airline:', firstFlight.segments?.[0]?.legs?.[0]?.carriersData?.[0]?.name || 'N/A');
        console.log('  Duration:', firstFlight.totalDuration || 'N/A');
        console.log('  Stops:', firstFlight.segments?.[0]?.legs?.length - 1 || 0);
        console.log('\nFull response sample:');
        console.log(JSON.stringify(firstFlight, null, 2).substring(0, 500) + '...');
      }

      return flights;
    } else {
      console.log('⚠️  No flights in response');
      console.log('Full response:', JSON.stringify(response.data, null, 2));
      return null;
    }

  } catch (error) {
    console.error('❌ FAILED');
    console.error('Error message:', error.message);
    console.error('Response data:', error.response?.data);
    console.error('Response status:', error.response?.status);
    return null;
  }
}

// Test with Paris → Barcelona after (to compare)
async function testFlightsPARtoBCN() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✈️  Test: PAR.CITY → BCN.CITY (Previous test that failed)');
  console.log('Date: 2025-12-30 (same date)\n');

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchFlights`, {
      params: {
        fromId: 'PAR.CITY',
        toId: 'BCN.CITY',
        departDate: '2025-12-30',
        returnDate: '2026-01-06',
        stops: 'none',
        pageNo: 1,
        adults: 1,
        sort: 'BEST',
        cabinClass: 'ECONOMY',
        currency_code: 'EUR'
      },
      headers,
      timeout: 30000
    });

    console.log('✅ SUCCESS!');
    console.log('Status:', response.data?.status);
    console.log('Message:', response.data?.message);

    if (response.data?.data?.flights) {
      const flights = response.data.data.flights;
      console.log(`\n🎉 Found ${flights.length} flights!\n`);

      if (flights.length > 0) {
        const firstFlight = flights[0];
        console.log('First flight details:');
        console.log('  Price:', firstFlight.priceBreakdown?.total?.units || 'N/A');
        console.log('  Currency:', firstFlight.priceBreakdown?.total?.currencyCode || 'N/A');
      }

      return flights;
    } else {
      console.log('⚠️  No flights in response');
      console.log('Status:', response.data?.status);
      console.log('Message:', response.data?.message);
      return null;
    }

  } catch (error) {
    console.error('❌ FAILED');
    console.error('Error message:', error.message);
    console.error('Response status:', error.response?.status);
    return null;
  }
}

// Run tests
async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 BOOKING.COM FLIGHT API RETRY TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: BOM → DEL (your working example)
  const bomToDel = await testFlightsBOMtoDEL();

  await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s

  // Test 2: PAR → BCN (our previous failing test)
  const parToBcn = await testFlightsPARtoBCN();

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`BOM → DEL: ${bomToDel ? '✅ WORKS' : '❌ FAILED'}`);
  console.log(`PAR → BCN: ${parToBcn ? '✅ WORKS' : '❌ FAILED'}`);

  if (bomToDel && !parToBcn) {
    console.log('\n💡 CONCLUSION:');
    console.log('API fonctionne MAIS certaines routes (PAR → BCN) ne retournent pas de données');
    console.log('Possible que l\'API n\'ait pas de données pour toutes les routes européennes');
  } else if (bomToDel && parToBcn) {
    console.log('\n💡 CONCLUSION:');
    console.log('✅ API fonctionne parfaitement! Le premier test avait peut-être un problème');
  } else if (!bomToDel && !parToBcn) {
    console.log('\n💡 CONCLUSION:');
    console.log('❌ API ne fonctionne pas du tout');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

runTests().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
