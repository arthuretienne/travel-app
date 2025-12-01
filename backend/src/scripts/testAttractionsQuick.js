// Quick test for attractions endpoint
import * as roadtripService from '../services/roadtripService.js';

console.log('🧪 QUICK TEST: Attractions API\n');

async function test() {
  try {
    console.log('🎭 Testing Porto attractions...\n');

    const result = await roadtripService.searchAttractions('Porto', {
      limit: 5,
      currency: 'EUR'
    });

    if (result.count > 0) {
      console.log(`✅ SUCCESS! Found ${result.count} attractions\n`);

      result.attractions.forEach((attraction, i) => {
        console.log(`${i + 1}. ${attraction.name}`);
        console.log(`   ${attraction.description?.substring(0, 80)}...`);
        console.log(`   Rating: ${attraction.rating?.value}/5 (${attraction.rating?.count} reviews)`);
        console.log(`   Price: €${attraction.price?.amount}`);
        console.log(`   Category: ${attraction.category}`);
        console.log('');
      });
    } else {
      console.log('❌ No attractions found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
