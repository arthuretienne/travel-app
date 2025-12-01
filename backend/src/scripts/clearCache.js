// Clear the in-memory cache
import 'dotenv/config';
import * as cache from '../utils/cache.js';

console.log('🧹 Clearing cache...');
cache.cleanup();
console.log('✅ Cache cleared!');

// Show stats
const stats = cache.getStats();
console.log('\nCache stats:', stats);
