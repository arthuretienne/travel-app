// Test attractions with Barcelona
import * as roadtripService from '../services/roadtripService.js';

console.log('🧪 TEST: Barcelona Attractions\n');

async function test() {
  try {
    const result = await roadtripService.searchAttractions('Barcelona', {
      limit: 5,
      currency: 'EUR'
    });

    console.log(`Location ID: ${result.locationId}`);
    console.log(`Found: ${result.count} attractions\n`);

    if (result.count > 0) {
      result.attractions.forEach((attr, i) => {
        console.log(`${i + 1}. ${attr.name}`);
        console.log(`   Price: €${attr.price?.amount}`);
        console.log(`   Rating: ${attr.rating?.value}/5`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
