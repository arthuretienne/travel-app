// Pre-cache Booking destination IDs for Skusku's hot path.
//
// Why this exists
// ---------------
// Every recommendation call hits `bookingService.getDestinationId()` for the
// user's origin city plus the 6-8 candidates Claude proposes. Most of those
// lookups return the same Booking IDs across users — the IDs themselves
// never change, only flight prices do. But because the cache starts cold
// for each new destination, early users pay the full N×lookup cost in API
// quota AND latency.
//
// This script primes the cache once (run weekly via cron or after any
// cache flush) so the destinations Claude typically suggests, and the
// origin cities Skusku users typically depart from, are already resolved
// in Redis. Net effect:
//   - 1 reco previously: 1 origin + 8 destination lookups + 8 flight searches
//     = ~17 calls/reco
//   - 1 reco after precache: 0 origin + 1-3 destination lookups (only
//     Claude-proposed exotic ones miss) + 8 flight searches = ~9 calls/reco
//
// Cost of running this script: ~56 calls, once a month.
// Cost saved per reco: ~8 calls.
// Break-even: 7 recos. After that it's pure savings.
//
// Usage
// -----
//   cd backend && npm run precache:destinations
//   cd backend && npm run precache:destinations -- --dry-run

import '../env.js';
import * as bookingService from '../src/services/bookingService.js';
import * as cache from '../src/utils/cache.js';

// ────────────────────────────────────────────────────────────────────────
// The hot path. Origins are the most common departure cities for the FR
// market; destinations are Skusku's 20 SEO landing pages plus the most
// frequent picks the Claude shortlist generator tends to return.

const ORIGIN_CITIES = [
  'Paris',
  'Lyon',
  'Marseille',
  'Toulouse',
  'Nice',
  'Bordeaux',
  'Nantes',
  'Lille',
];

const HOT_DESTINATIONS = [
  // Skusku's existing SEO destinations
  'Lisbon', 'Barcelona', 'Rome', 'Porto', 'Amsterdam', 'Prague', 'Marrakech',
  'Dubrovnik', 'Bali', 'Tokyo', 'New York', 'Bangkok', 'London', 'Paris',
  'Istanbul', 'Athens', 'Budapest', 'Copenhagen', 'Dubai', 'Malaga',

  // Most frequent Claude shortlist picks (Mediterranean + low-cost European)
  'Naples', 'Palermo', 'Catania', 'Sevilla', 'Valencia', 'Granada',
  'Florence', 'Venice', 'Milan', 'Madrid', 'Bilbao', 'Faro',
  'Split', 'Hvar', 'Zagreb', 'Ljubljana', 'Sarajevo',
  'Reykjavik', 'Oslo', 'Stockholm', 'Helsinki', 'Tallinn',
  'Berlin', 'Munich', 'Vienna', 'Krakow', 'Warsaw',
  'Mykonos', 'Santorini', 'Rhodes', 'Crete', 'Heraklion',

  // North Africa + Middle East
  'Essaouira', 'Fez', 'Tunis', 'Cairo', 'Petra',

  // Asia hot picks
  'Hanoi', 'Hoi An', 'Kyoto', 'Singapore', 'Bangkok', 'Phuket', 'Bali',
  'Colombo', 'Mumbai', 'Delhi',

  // Americas
  'Mexico City', 'Cancun', 'Buenos Aires', 'Rio de Janeiro', 'Lima',
  'Havana', 'San Francisco', 'Miami', 'Los Angeles',
];

// ────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

function shouldSkip(name) {
  return cache.get(`booking:destination:${name.toLowerCase()}`)
    .then(v => !!v)
    .catch(() => false);
}

async function preload(name, category) {
  const cacheHit = await shouldSkip(name);
  if (cacheHit) {
    return { name, category, status: 'cached', cost: 0 };
  }
  if (DRY_RUN) {
    return { name, category, status: 'would-fetch', cost: 1 };
  }
  try {
    const dest = await bookingService.getDestinationId(name);
    return { name, category, status: 'fetched', id: dest.id, country: dest.countryName, cost: 1 };
  } catch (err) {
    return { name, category, status: 'failed', error: err.message, cost: 1 };
  }
}

async function main() {
  const all = [
    ...ORIGIN_CITIES.map(n => ({ name: n, category: 'origin' })),
    ...[...new Set(HOT_DESTINATIONS)].map(n => ({ name: n, category: 'destination' })),
  ];

  console.log(`Preloading ${all.length} destinations (DRY_RUN=${DRY_RUN})`);
  if (DRY_RUN) console.log('No API calls will be made. Use --dry-run=false to actually fetch.');

  const results = [];
  // Sequential, not parallel: we don't want to burn rate limit just to
  // pre-cache. 56 calls at ~300ms each = ~17s total, plenty fast enough.
  for (const { name, category } of all) {
    process.stdout.write(`  ${name.padEnd(20)} `);
    const r = await preload(name, category);
    results.push(r);
    const tag = r.status === 'cached' ? '⏭  cached' : r.status === 'fetched' ? `✅ ${r.id} (${r.country})` : r.status === 'would-fetch' ? '  (would fetch)' : `❌ ${r.error}`;
    console.log(tag);
  }

  const stats = {
    total: results.length,
    cached: results.filter(r => r.status === 'cached').length,
    fetched: results.filter(r => r.status === 'fetched').length,
    failed: results.filter(r => r.status === 'failed').length,
    api_calls_consumed: results.reduce((s, r) => s + r.cost, 0),
  };

  console.log('\n──── Summary ────');
  console.log(stats);

  if (stats.failed > 0) {
    console.log('\nFailed lookups (left for next run):');
    for (const r of results.filter(x => x.status === 'failed')) {
      console.log(`  - ${r.name}: ${r.error}`);
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('precache crashed:', err.message);
  process.exit(2);
});
