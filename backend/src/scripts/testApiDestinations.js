// Test script to investigate API destination resolution
// Run: node src/scripts/testApiDestinations.js

import axios from 'axios';
import dotenv from 'dotenv';
import * as bookingService from '../services/bookingService.js';

dotenv.config();

const BASE_URL = 'https://booking-com15.p.rapidapi.com';
const BOOKING_API_KEY = process.env.BOOKING_API_KEY || 'b723f67a8cmshf49874500229ca8p12d559jsnedd1aee8f4ea';

const headers = {
  'x-rapidapi-key': BOOKING_API_KEY,
  'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
};

// Test destinations that might have issues
const testDestinations = [
  'Bali',
  'Bali, Indonesia',
  'Denpasar',  // Bali's airport city
  'Phuket',
  'Bangkok',
  'Tokyo',
  'Marrakech',
  'Cape Town',
  'Tenerife',
  'Maldives',
  'Santorini',
];

async function testFlightDestination(query) {
  console.log(`\n🛫 FLIGHT API - Searching: "${query}"`);
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/flights/searchDestination`, {
      params: { query },
      headers
    });

    if (response.data?.status && response.data?.data?.length > 0) {
      console.log(`   Found ${response.data.data.length} results:`);
      response.data.data.slice(0, 5).forEach((d, i) => {
        console.log(`   ${i+1}. ${d.name} (${d.id}) - Type: ${d.type}, Country: ${d.countryName || d.country}`);
      });
      return response.data.data[0];
    } else {
      console.log(`   ❌ No results found`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function testHotelDestination(query) {
  console.log(`\n🏨 HOTEL API - Searching: "${query}"`);
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/hotels/searchDestination`, {
      params: { query },
      headers
    });

    if (response.data?.status && response.data?.data?.length > 0) {
      console.log(`   Found ${response.data.data.length} results:`);
      response.data.data.slice(0, 5).forEach((d, i) => {
        console.log(`   ${i+1}. ${d.name || d.city_name} (${d.dest_id}) - Type: ${d.dest_type}, Country: ${d.country}`);
      });
      return response.data.data[0];
    } else {
      console.log(`   ❌ No results found`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function testBookingServiceResolution(query) {
  console.log(`\n🔧 BOOKING SERVICE - getDestinationId("${query}")`);
  try {
    const result = await bookingService.getDestinationId(query);
    console.log(`   ✅ Result: ${result.name} (${result.countryName || result.country}) [${result.id}]`);
    return result;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('DESTINATION API COMPARISON TEST');
  console.log('='.repeat(60));
  console.log(`Testing ${testDestinations.length} destinations...`);

  const results = [];

  for (const dest of testDestinations) {
    console.log('\n' + '-'.repeat(60));
    console.log(`TESTING: ${dest}`);
    console.log('-'.repeat(60));

    // Test our fixed booking service
    const serviceResult = await testBookingServiceResolution(dest);

    const flightResult = await testFlightDestination(dest);
    const hotelResult = await testHotelDestination(dest);

    const mismatch = flightResult && hotelResult &&
      !flightResult.name?.toLowerCase().includes(dest.split(',')[0].toLowerCase()) &&
      !hotelResult.name?.toLowerCase().includes(dest.split(',')[0].toLowerCase());

    results.push({
      query: dest,
      serviceId: serviceResult?.id,
      serviceName: serviceResult?.name,
      serviceCountry: serviceResult?.countryName || serviceResult?.country,
      flightId: flightResult?.id,
      flightName: flightResult?.name,
      flightCountry: flightResult?.countryName || flightResult?.country,
      hotelId: hotelResult?.dest_id,
      hotelName: hotelResult?.name || hotelResult?.city_name,
      hotelCountry: hotelResult?.country,
      mismatch
    });

    if (mismatch) {
      console.log(`\n⚠️  POTENTIAL MISMATCH DETECTED!`);
      console.log(`   Flight: ${flightResult?.name} (${flightResult?.countryName || flightResult?.country})`);
      console.log(`   Hotel: ${hotelResult?.name || hotelResult?.city_name} (${hotelResult?.country})`);
    }

    // Rate limiting - wait between requests
    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY - BOOKING SERVICE RESOLUTION');
  console.log('='.repeat(60));

  let serviceSuccess = 0;
  results.forEach(r => {
    const baseQuery = r.query.split(',')[0].toLowerCase();
    const isCorrect = r.serviceName?.toLowerCase().includes(baseQuery) ||
                      (baseQuery === 'bali' && r.serviceCountry?.toLowerCase().includes('indonesia')) ||
                      (baseQuery === 'maldives' && r.serviceCountry?.toLowerCase().includes('maldives'));

    if (isCorrect) serviceSuccess++;
    const status = isCorrect ? '✅' : '❌';
    console.log(`${status} ${r.query} → ${r.serviceName} (${r.serviceCountry})`);
  });

  console.log(`\n📊 Booking Service Success Rate: ${serviceSuccess}/${results.length}`);
}

runTests().catch(console.error);
