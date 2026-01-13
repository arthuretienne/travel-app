// Test script for hotel search functionality
// Run: node src/scripts/testHotelSearch.js

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://booking-com15.p.rapidapi.com';
const BOOKING_API_KEY = process.env.BOOKING_API_KEY || 'b723f67a8cmshf49874500229ca8p12d559jsnedd1aee8f4ea';

const headers = {
  'x-rapidapi-key': BOOKING_API_KEY,
  'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
};

// Test scenarios
const testScenarios = [
  {
    name: 'Budget traveler in Bangkok',
    destination: 'Bangkok',
    adults: 1,
    rooms: 1,
    // What filters should apply: 2-3 star, low price
  },
  {
    name: 'Luxury couple in Bali',
    destination: 'Bali',
    adults: 2,
    rooms: 1,
    // What filters should apply: 4-5 star, pool, spa
  },
  {
    name: 'Family of 4 in Barcelona',
    destination: 'Barcelona',
    adults: 2,
    children: 2,
    rooms: 2,
    // What filters should apply: family-friendly, 2 rooms
  },
  {
    name: 'Backpacker in Tokyo',
    destination: 'Tokyo',
    adults: 1,
    rooms: 1,
    // What filters should apply: hostel, budget
  }
];

async function getHotelDestinationId(query) {
  console.log(`\n🔍 Getting hotel destination ID for: "${query}"`);
  try {
    const response = await axios.get(`${BASE_URL}/api/v1/hotels/searchDestination`, {
      params: { query },
      headers
    });

    if (response.data?.status && response.data?.data?.length > 0) {
      const dest = response.data.data.find(d => d.dest_type === 'city') || response.data.data[0];
      console.log(`   Found: ${dest.name || dest.city_name} (${dest.dest_id}), type: ${dest.dest_type}`);
      return dest;
    }
    return null;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function searchHotels(destId, searchType, params) {
  const arrivalDate = new Date();
  arrivalDate.setDate(arrivalDate.getDate() + 30); // 30 days from now
  const departureDate = new Date(arrivalDate);
  departureDate.setDate(departureDate.getDate() + 5); // 5 nights

  const searchParams = {
    dest_id: destId,
    search_type: searchType.toUpperCase(),
    arrival_date: arrivalDate.toISOString().split('T')[0],
    departure_date: departureDate.toISOString().split('T')[0],
    adults: params.adults || 1,
    room_qty: params.rooms || 1,
    page_number: 1,
    units: 'metric',
    currency_code: 'EUR',
    languagecode: 'en-us',
    // Optional filters we can test:
    // sort_by: 'price', // popularity, class_ascending, class_descending, distance, upsort_bh
    // price_min: 50,
    // price_max: 200,
    // categories_filter: '5,4,3', // star ratings
  };

  // Add children if provided
  if (params.children) {
    searchParams.children_qty = params.children;
    searchParams.children_age = '10,8'; // Example ages
  }

  console.log(`\n🏨 Searching hotels with params:`, JSON.stringify(searchParams, null, 2));

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/hotels/searchHotels`, {
      params: searchParams,
      headers,
      timeout: 30000
    });

    if (response.data?.status && response.data?.data?.hotels) {
      return response.data.data.hotels;
    }
    return [];
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return [];
  }
}

function analyzeHotelResults(hotels, scenarioName) {
  console.log(`\n📊 ANALYSIS: ${scenarioName}`);
  console.log(`   Total hotels: ${hotels.length}`);

  if (hotels.length === 0) {
    console.log('   No hotels found!');
    return;
  }

  // Extract data for analysis
  const prices = hotels.map(h => h.property?.priceBreakdown?.grossPrice?.value || 0).filter(p => p > 0);
  const stars = hotels.map(h => h.property?.propertyClass || 0).filter(s => s > 0);
  const ratings = hotels.map(h => h.property?.reviewScore || 0).filter(r => r > 0);

  if (prices.length > 0) {
    console.log(`   Price range: €${Math.min(...prices).toFixed(0)} - €${Math.max(...prices).toFixed(0)}`);
    console.log(`   Avg price: €${(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(0)}`);
  }

  if (stars.length > 0) {
    const starCounts = {};
    stars.forEach(s => { starCounts[s] = (starCounts[s] || 0) + 1; });
    console.log(`   Star distribution:`, starCounts);
  }

  if (ratings.length > 0) {
    console.log(`   Rating range: ${Math.min(...ratings).toFixed(1)} - ${Math.max(...ratings).toFixed(1)}`);
    console.log(`   Avg rating: ${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)}`);
  }

  // Sample hotels
  console.log('\n   📋 Top 5 hotels:');
  hotels.slice(0, 5).forEach((hotel, i) => {
    const name = hotel.property?.name || 'Unknown';
    const stars = hotel.property?.propertyClass || 0;
    const price = hotel.property?.priceBreakdown?.grossPrice?.value || 0;
    const rating = hotel.property?.reviewScore || 0;
    const reviewCount = hotel.property?.reviewCount || 0;

    console.log(`   ${i + 1}. ${name}`);
    console.log(`      ⭐ ${stars} stars | 💰 €${price.toFixed(0)} | 📊 ${rating}/10 (${reviewCount} reviews)`);
  });

  // Check available filter options in first hotel response
  const firstHotel = hotels[0];
  if (firstHotel) {
    console.log('\n   🔍 Available hotel data fields:');
    console.log(`      - propertyClass (stars): ${firstHotel.property?.propertyClass}`);
    console.log(`      - reviewScore: ${firstHotel.property?.reviewScore}`);
    console.log(`      - checkin: ${JSON.stringify(firstHotel.property?.checkin)}`);
    console.log(`      - checkout: ${JSON.stringify(firstHotel.property?.checkout)}`);

    // Check for amenities/facilities
    if (firstHotel.property?.wishlistName) {
      console.log(`      - wishlistName: ${firstHotel.property.wishlistName}`);
    }
  }
}

async function testFilteredSearch(destId, searchType, filterName, additionalParams) {
  console.log(`\n🧪 Testing filter: ${filterName}`);

  const arrivalDate = new Date();
  arrivalDate.setDate(arrivalDate.getDate() + 30);
  const departureDate = new Date(arrivalDate);
  departureDate.setDate(departureDate.getDate() + 5);

  const params = {
    dest_id: destId,
    search_type: searchType.toUpperCase(),
    arrival_date: arrivalDate.toISOString().split('T')[0],
    departure_date: departureDate.toISOString().split('T')[0],
    adults: 1,
    room_qty: 1,
    page_number: 1,
    currency_code: 'EUR',
    ...additionalParams
  };

  console.log(`   Params: ${JSON.stringify(additionalParams)}`);

  try {
    const response = await axios.get(`${BASE_URL}/api/v1/hotels/searchHotels`, {
      params,
      headers,
      timeout: 30000
    });

    if (response.data?.status && response.data?.data?.hotels) {
      const hotels = response.data.data.hotels;
      console.log(`   ✅ Found ${hotels.length} hotels`);

      if (hotels.length > 0) {
        const prices = hotels.map(h => h.property?.priceBreakdown?.grossPrice?.value || 0);
        const stars = hotels.map(h => h.property?.propertyClass || 0);
        console.log(`   Price: €${Math.min(...prices).toFixed(0)} - €${Math.max(...prices).toFixed(0)}`);
        console.log(`   Stars: ${[...new Set(stars)].sort().join(', ')}`);
      }
      return hotels;
    }
    console.log('   ❌ No hotels found');
    return [];
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
    return [];
  }
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('HOTEL SEARCH API ANALYSIS');
  console.log('='.repeat(70));

  // Test 1: Basic search for Bangkok
  const bangkokDest = await getHotelDestinationId('Bangkok');
  if (bangkokDest) {
    const hotels = await searchHotels(bangkokDest.dest_id, bangkokDest.dest_type, { adults: 1, rooms: 1 });
    analyzeHotelResults(hotels, 'Bangkok (default search)');

    // Test filters
    console.log('\n' + '='.repeat(70));
    console.log('TESTING AVAILABLE FILTERS');
    console.log('='.repeat(70));

    // Test sort by price
    await testFilteredSearch(bangkokDest.dest_id, bangkokDest.dest_type,
      'Sort by price', { sort_by: 'price' });

    await new Promise(r => setTimeout(r, 500));

    // Test sort by rating
    await testFilteredSearch(bangkokDest.dest_id, bangkokDest.dest_type,
      'Sort by rating', { sort_by: 'review_score' });

    await new Promise(r => setTimeout(r, 500));

    // Test price filter
    await testFilteredSearch(bangkokDest.dest_id, bangkokDest.dest_type,
      'Budget (max €50)', { price_max: 50 });

    await new Promise(r => setTimeout(r, 500));

    // Test star rating filter
    await testFilteredSearch(bangkokDest.dest_id, bangkokDest.dest_type,
      '4-5 stars only', { categories_filter: '5,4' });

    await new Promise(r => setTimeout(r, 500));

    // Test minimum rating
    await testFilteredSearch(bangkokDest.dest_id, bangkokDest.dest_type,
      'Min rating 8.0', { min_review_score: 80 }); // API uses 0-100 scale
  }

  // Test 2: Bali with 2 adults
  console.log('\n' + '='.repeat(70));
  const baliDest = await getHotelDestinationId('Bali');
  if (baliDest) {
    const hotels = await searchHotels(baliDest.dest_id, baliDest.dest_type, { adults: 2, rooms: 1 });
    analyzeHotelResults(hotels, 'Bali (2 adults)');
  }

  console.log('\n' + '='.repeat(70));
  console.log('TEST COMPLETE');
  console.log('='.repeat(70));
}

runTests().catch(console.error);
