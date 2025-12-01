// Test script for critical fixes:
// 1. Return flight display
// 2. Affiliate links (IATA codes)

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import * as airScraper from '../services/airScraperService.js';
import { optimizeDestination } from '../services/destinationService.js';
import { generateAffiliateLinks } from '../services/affiliateService.js';

console.log('\n🧪 Testing Critical Fixes\n');
console.log('=' .repeat(60));

async function testReturnFlight() {
  console.log('\n📝 Test #1: Return Flight\n');

  try {
    const result = await airScraper.searchFlights({
      originQuery: 'Paris',
      destinationQuery: 'Barcelona',
      date: '2025-12-15',
      returnDate: '2025-12-22',
      adults: 1,
      cabinClass: 'economy',
      currency: 'EUR',
      market: 'fr-FR',
    });

    console.log('✅ Flight search completed');
    console.log(`   Origin: ${result.origin.name} (${result.origin.iata || 'NO IATA'})`);
    console.log(`   Destination: ${result.destination.name} (${result.destination.iata || 'NO IATA'})`);
    console.log(`   Flights found: ${result.count}`);

    if (result.flights.length > 0) {
      const firstFlight = result.flights[0];
      console.log('\n   First flight:');
      console.log(`   - Outbound: ${firstFlight.outbound ? '✅' : '❌'}`);
      if (firstFlight.outbound) {
        console.log(`     ${firstFlight.outbound.origin} → ${firstFlight.outbound.destination}`);
        console.log(`     ${firstFlight.outbound.departure} → ${firstFlight.outbound.arrival}`);
      }
      console.log(`   - Return: ${firstFlight.return ? '✅' : '❌'}`);
      if (firstFlight.return) {
        console.log(`     ${firstFlight.return.origin} → ${firstFlight.return.destination}`);
        console.log(`     ${firstFlight.return.departure} → ${firstFlight.return.arrival}`);
      } else {
        console.log('     ⚠️  NO RETURN FLIGHT DATA');
      }
    }

    return result;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

async function testAffiliateLinks() {
  console.log('\n📝 Test #2: Affiliate Links (IATA codes)\n');

  try {
    const optimized = await optimizeDestination({
      destination: 'Amsterdam',
      userProfile: {
        basic: { activities: ['culture', 'food'], budgetLevel: 'moderate' },
        preferences: { travelPace: 'balanced' },
      },
      budget: 1500,
      origin: 'Paris',
      duration: 5,
      departureDate: '2025-12-20',
    });

    console.log('✅ Destination optimized');
    console.log(`   Destination: ${optimized.destination.name} (${optimized.destination.iata || 'NO IATA'})`);
    console.log(`   Origin: ${optimized.origin.name} (${optimized.origin.iata || 'NO IATA'})`);

    // Generate affiliate links
    const affiliateLinks = generateAffiliateLinks(
      {
        destination: {
          city: optimized.destination.name,
          iataCode: optimized.destination.iata,
        },
        slot: {
          startDate: optimized.dates.departure,
          endDate: optimized.dates.return,
        },
        flightOffer: {
          price: optimized.flight.totalCost,
        }
      },
      'Paris'
    );

    console.log('\n   Affiliate Links:');
    console.log(`   - Skyscanner: ${affiliateLinks.skyscanner}`);

    // Check if 'undefined' is in the URL
    if (affiliateLinks.skyscanner.includes('undefined')) {
      console.log('   ❌ BROKEN: Contains "undefined"');
      return false;
    } else {
      console.log('   ✅ VALID: No "undefined" in URL');
      return true;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting tests...\n');

  const flightResult = await testReturnFlight();
  const affiliateResult = await testAffiliateLinks();

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results:\n');
  console.log(`   Return Flight: ${flightResult?.flights?.[0]?.return ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Affiliate Links: ${affiliateResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log('\n' + '='.repeat(60) + '\n');
}

runTests().catch(console.error);
