// Test hotel search
import * as bookingService from '../services/bookingService.js';

console.log('🧪 TEST: Search Hotels in Porto\n');

async function testHotels() {
  try {
    const hotels = await bookingService.searchHotels({
      destinationQuery: 'Porto',
      arrivalDate: '2025-12-31',
      departureDate: '2026-01-07',
      adults: 1,
      rooms: 1,
      currency: 'EUR'
    });

    console.log(`✅ Found ${hotels.count} hotels in Porto\n`);
    console.log('TOP 10 HOTELS:\n');

    hotels.hotels.slice(0, 10).forEach((hotel, i) => {
      console.log(`${i + 1}. ${hotel.name}`);
      console.log(`   Stars: ${hotel.stars}⭐`);
      console.log(`   Rating: ${hotel.rating?.value || 'N/A'}/10 (${hotel.rating?.count || 0} reviews)`);
      console.log(`   Total: €${hotel.price.amount} (€${Math.round(hotel.price.amount / 7)}/night × 7 nights)`);
      console.log(`   Photo: ${hotel.mainPhoto ? 'Yes ✅' : 'No ❌'}`);
      console.log(`   Location: ${hotel.location}`);
      console.log('');
    });

    // Calculate budget scenario
    const flightCost = 116;
    const totalBudget = 800;
    const remainingForHotel = totalBudget - flightCost;
    const maxNightlyRate = (remainingForHotel / 7) * 0.7; // 70% for hotel

    console.log('\n💰 BUDGET SCENARIO:');
    console.log(`   Total Budget: €${totalBudget}`);
    console.log(`   Flight Cost: €${flightCost}`);
    console.log(`   Remaining: €${remainingForHotel}`);
    console.log(`   Max Hotel/night: €${Math.round(maxNightlyRate)}`);
    console.log(`   Max Total Hotel: €${Math.round(maxNightlyRate * 7)}\n`);

    const affordable = hotels.hotels.filter(h => {
      const nightlyRate = h.price.amount / 7;
      return nightlyRate <= maxNightlyRate;
    });

    console.log(`✅ ${affordable.length} hotels within budget\n`);

    if (affordable.length > 0) {
      console.log('TOP 5 AFFORDABLE HOTELS:\n');
      affordable.slice(0, 5).forEach((hotel, i) => {
        const nightlyRate = Math.round(hotel.price.amount / 7);
        console.log(`${i + 1}. ${hotel.name}`);
        console.log(`   ${hotel.stars}⭐ - ${hotel.rating?.value || 'N/A'}/10`);
        console.log(`   €${nightlyRate}/night × 7 = €${hotel.price.amount} total`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testHotels();
