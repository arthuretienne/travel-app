// Skusku complete package quality harness.
//
// This complements test-reco-quality.js. The reco harness validates destination
// discovery; this one validates the complete package shown to the user:
// destination + round-trip flights + real Booking.com hotel inventory + budget.

import '../env.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { discoverDestinations, optimizeDestination } = await import('../src/services/destinationService.js');

function parseArgs(argv) {
  const out = {
    filter: null,
    limit: Infinity,
    destinations: 1,
    outDir: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--filter') out.filter = argv[++i];
    else if (a === '--limit') out.limit = parseInt(argv[++i], 10);
    else if (a === '--destinations') out.destinations = parseInt(argv[++i], 10);
    else if (a === '--out') out.outDir = argv[++i];
  }

  return out;
}

function matchesFilter(profile, filter) {
  if (!filter) return true;
  const f = filter.toLowerCase();
  return profile.id.toLowerCase().includes(f) ||
    (profile.tags || []).some(t => t.toLowerCase().includes(f));
}

function getTravelersCount(profile) {
  const travelers = profile.payload?.basic?.travelers || 1;
  if (typeof travelers === 'number') return Math.max(1, travelers);

  if (typeof travelers === 'string') {
    const matches = [...travelers.matchAll(/(\d+)/g)].map(m => parseInt(m[1], 10));
    const total = matches.reduce((sum, n) => sum + n, 0);
    return Math.max(1, total || 1);
  }

  return 1;
}

function getBudgetPerPerson(profile) {
  return profile.payload?.basic?.budget ||
    profile.payload?.constraints?.budget ||
    0;
}

function getTotalBudget(profile) {
  return getBudgetPerPerson(profile) * getTravelersCount(profile);
}

function buildUserProfile(profile) {
  return {
    ...profile.payload,
    basic: {
      ...profile.payload.basic,
    },
    onboardingPreferences: {
      ...(profile.payload.onboardingPreferences || {}),
    },
  };
}

function extractDestinations(discoveryResult) {
  if (Array.isArray(discoveryResult)) return discoveryResult;
  return discoveryResult?.flightOptions || [];
}

function destinationName(destination) {
  return destination.cityName || destination.city || destination.name;
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs)) return null;
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

const HOSTEL_KEYWORDS = [
  'hostel',
  'auberge de jeunesse',
  'dormitory',
  'dorm',
  'backpacker',
  'backpackers',
  'generator',
  'selina',
  'wombats',
  'a&o ',
  'meininger',
  'st christopher',
  'student',
];
const FLIGHT_DURATION_TOLERANCE_MINUTES = 30;
const TROPICAL_OR_SUBTROPICAL_TERMS = [
  'tenerife',
  'canary',
  'gran canaria',
  'fuerteventura',
  'lanzarote',
  'madeira',
  'cape verde',
  'sal',
  'djerba',
  'hurghada',
  'agadir',
  'zanzibar',
  'phuket',
  'bali',
  'denpasar',
  'aruba',
  'cartagena',
  'cancun',
  'playa del carmen',
  'koh samui',
  'palawan',
  'maldives',
  'mauritius',
  'seychelles',
  'barbados',
  'bridgetown',
];

function minimumHotelRating(profile) {
  const tripType = profile.payload?.basic?.tripType;
  const style = profile.payload?.basic?.style;
  const budgetPerPerson = getBudgetPerPerson(profile);

  if (style === 'luxury') return 8.0;
  if (tripType === 'couple') return 7.5;
  if (tripType === 'business') return 7.3;
  if (tripType === 'family') return 7.0;
  if (budgetPerPerson <= 700) return 6.5;
  return 6.8;
}

function minimumHotelStars(profile) {
  const tripType = profile.payload?.basic?.tripType;
  const style = profile.payload?.basic?.style;
  const budgetPerPerson = getBudgetPerPerson(profile);

  if (style === 'luxury') return 4;
  if (tripType === 'couple') return 3;
  if (tripType === 'business') return 3;
  if (budgetPerPerson <= 700) return 0;
  return 2;
}

function allowsHostel(profile) {
  const budgetPerPerson = getBudgetPerPerson(profile);
  const pref = profile.payload?.onboardingPreferences?.accommodationPref;
  const comfort = profile.payload?.onboardingPreferences?.materialComfort;

  return ['budget', 'hostel', 'backpacker', 'routard'].includes(pref) ||
    (typeof comfort === 'number' && comfort < 35) ||
    budgetPerPerson <= 650;
}

function evaluateTrip(profile, trip) {
  const failed = [];
  const totalBudget = getTotalBudget(profile);
  const expectedDuration = profile.payload?.availability?.duration || 7;

  function fail(rule, reason) {
    failed.push({ rule, reason });
  }

  if (!trip?.destination?.name) {
    fail('destination_present', 'Missing destination name in optimized package');
  }
  if (!trip?.destination?.country || trip.destination.country === 'Unknown') {
    fail('destination_country_present', 'Missing destination country in optimized package');
  }
  const requestedClimate = profile.payload?.preferences?.climate || profile.payload?.basic?.climate || null;
  if (requestedClimate === 'tropical') {
    const destinationText = `${trip?.destination?.name || ''} ${trip?.destination?.country || ''} ${trip?.hotel?.location || ''}`.toLowerCase();
    if (!TROPICAL_OR_SUBTROPICAL_TERMS.some(term => destinationText.includes(term))) {
      fail('destination_matches_tropical_request', `${trip?.destination?.name || 'unknown destination'} does not look tropical/subtropical`);
    }
  }

  const outbound = trip?.flight?.outbound;
  const inbound = trip?.flight?.return;
  const flightCost = Number(trip?.flight?.totalCost || 0);

  if (!Number.isFinite(flightCost) || flightCost <= 0) {
    fail('flight_price_positive', `Invalid flight total cost: ${trip?.flight?.totalCost}`);
  }
  if (!outbound?.departureAirport || !outbound?.arrivalAirport) {
    fail('flight_outbound_complete', 'Missing outbound airport data');
  }
  if (!inbound?.departureAirport || !inbound?.arrivalAirport) {
    fail('flight_return_complete', 'Missing return airport data');
  }
  if (outbound?.departureAirport && outbound?.arrivalAirport && outbound.departureAirport === outbound.arrivalAirport) {
    fail('flight_route_plausible', `Outbound route has identical airports: ${outbound.departureAirport}`);
  }
  if (outbound?.duration && outbound.duration < 20) {
    fail('flight_duration_plausible', `Outbound duration is too short: ${outbound.duration} minutes`);
  }
  const maxFlightHours = profile.payload?.basic?.maxFlightHours || profile.payload?.constraints?.maxFlightHours || null;
  if (maxFlightHours) {
    const maxMinutes = (Number(maxFlightHours) * 60) + FLIGHT_DURATION_TOLERANCE_MINUTES;
    const longestLeg = Math.max(Number(outbound?.duration || 0), Number(inbound?.duration || 0));
    if (longestLeg > maxMinutes) {
      fail('flight_duration_within_profile', `Longest leg ${longestLeg}min exceeds max ${maxFlightHours}h + ${FLIGHT_DURATION_TOLERANCE_MINUTES}min`);
    }
  }

  const actualDuration = trip?.dates?.departure && trip?.dates?.return
    ? daysBetween(trip.dates.departure, trip.dates.return)
    : null;
  if (actualDuration !== expectedDuration) {
    fail('dates_match_duration', `Expected ${expectedDuration} nights, got ${actualDuration}`);
  }

  const hotel = trip?.hotel;
  if (!hotel) {
    fail('hotel_present', 'Missing hotel in optimized package');
  } else {
    if (hotel.isEstimate || hotel.provider === 'estimate' || !hotel.id) {
      fail('hotel_real_inventory', `Hotel is not real Booking.com inventory: ${hotel.name || 'unknown'}`);
    }
    if (!hotel.name || /^hotel in /i.test(hotel.name)) {
      fail('hotel_name_specific', `Hotel name is generic: ${hotel.name || 'missing'}`);
    }
    if (!Number.isFinite(Number(hotel.totalPrice)) || Number(hotel.totalPrice) <= 0) {
      fail('hotel_price_positive', `Invalid hotel total price: ${hotel.totalPrice}`);
    }
    if (!Number.isFinite(Number(hotel.pricePerNight)) || Number(hotel.pricePerNight) <= 0) {
      fail('hotel_nightly_price_positive', `Invalid hotel nightly price: ${hotel.pricePerNight}`);
    }
    if (hotel.totalNights !== expectedDuration) {
      fail('hotel_nights_match_duration', `Expected ${expectedDuration} hotel nights, got ${hotel.totalNights}`);
    }
    if (!hotel.mainPhoto) {
      fail('hotel_photo_present', `Missing hotel photo for ${hotel.name || 'unknown hotel'}`);
    }

    const rating = Number(hotel.rating?.value || 0);
    const minRating = minimumHotelRating(profile);
    if (rating > 0 && rating < minRating) {
      fail('hotel_rating_floor', `${hotel.name} rating ${rating} below ${minRating}`);
    }

    const stars = Number(hotel.stars || 0);
    const minStars = minimumHotelStars(profile);
    if (stars > 0 && stars < minStars) {
      fail('hotel_stars_fit_profile', `${hotel.name} has ${stars} stars, expected at least ${minStars}`);
    }

    const hotelName = hotel.name.toLowerCase();
    if (!allowsHostel(profile) && HOSTEL_KEYWORDS.some(kw => hotelName.includes(kw))) {
      fail('hotel_not_hostel_unless_budget', `${hotel.name} looks like a hostel for a non-hostel profile`);
    }
  }

  const budget = trip?.budget || {};
  const groundCost = Number(budget.groundTransport || 0);
  const packageCost = Number(budget.flight || 0) + Number(budget.hotel || 0) + groundCost;
  if (!Number.isFinite(packageCost) || packageCost <= 0) {
    fail('budget_package_cost_positive', `Invalid package cost: ${packageCost}`);
  }
  if (packageCost > totalBudget * 1.02) {
    fail('budget_package_within_limit', `Package costs EUR ${Math.round(packageCost)} for budget EUR ${totalBudget}`);
  }
  if (Number(budget.remaining) < 0) {
    fail('budget_remaining_non_negative', `Remaining budget is negative: ${budget.remaining}`);
  }
  if (Number(budget.activities) < 0) {
    fail('budget_activities_non_negative', `Activities budget is negative: ${budget.activities}`);
  }
  if (trip?.groundTransport && (!trip.groundTransport.from || !trip.groundTransport.to || !trip.groundTransport.duration)) {
    fail('ground_transport_complete', 'Ground transport is missing from/to/duration');
  }

  return {
    passed: failed.length === 0,
    failed,
  };
}

function evaluateRun(profile, run) {
  const failed = [];

  function fail(rule, reason) {
    failed.push({ rule, reason });
  }

  if (run.errored) {
    fail('profile_runtime_error', run.error);
  }
  if (!run.discoveryDestinations?.length) {
    fail('discovery_has_candidates', 'No destination candidates returned');
  }
  if (!run.packages?.length) {
    fail('packages_attempted', 'No package optimization attempted');
  }

  const passingPackages = (run.packages || []).filter(p => p.eval?.passed);
  if (!passingPackages.length) {
    const packageReasons = (run.packages || [])
      .map(p => {
        if (p.error) return `${p.destination}: ${p.error}`;
        return `${p.destination}: ${(p.eval?.failed || []).map(f => f.rule).join(', ')}`;
      })
      .filter(Boolean)
      .join(' | ');
    fail('complete_package_available', packageReasons || 'No passing complete package');
  }

  return {
    passed: failed.length === 0,
    failed,
    passingPackages: passingPackages.length,
  };
}

async function runProfile(profile, args) {
  const t0 = Date.now();
  const userProfile = buildUserProfile(profile);
  const budgetPerPerson = getBudgetPerPerson(profile);
  const travelersCount = getTravelersCount(profile);
  const totalBudget = budgetPerPerson * travelersCount;

  userProfile.basic.budgetPerPerson = budgetPerPerson;
  userProfile.basic.budget = totalBudget;

  try {
    const duration = userProfile.availability?.duration || 7;
    const origin = userProfile.availability?.originCity || 'Paris';
    const departureDate = userProfile.availability?.startDate || null;
    const tripContext = userProfile.basic?.travelVibeDescription || null;
    const isFixedDate = userProfile.availability?.departureFlexibility === 'fixed' ||
      userProfile.availability?.flexibleDates === false;

    const discoveryResult = await discoverDestinations({
      userProfile,
      budget: totalBudget,
      origin,
      duration,
      departureDate,
      userId: null,
    });

    const discoveryDestinations = extractDestinations(discoveryResult);
    const candidates = discoveryDestinations
      .filter(d => destinationName(d))
      .slice(0, args.destinations);

    const packages = [];
    for (const candidate of candidates) {
      const destName = destinationName(candidate);
      const packageT0 = Date.now();
      try {
        const trip = await optimizeDestination({
          destination: destName,
          userProfile,
          budget: totalBudget,
          origin,
          duration,
          departureDate,
          tripContext,
          isFixedDate,
        });
        const evalResult = evaluateTrip(profile, trip);
        packages.push({
          destination: destName,
          latencyMs: Date.now() - packageT0,
          trip,
          eval: evalResult,
        });
      } catch (err) {
        packages.push({
          destination: destName,
          latencyMs: Date.now() - packageT0,
          error: err.message,
          stack: err.stack?.split('\n').slice(0, 5).join('\n'),
          eval: {
            passed: false,
            failed: [{ rule: 'package_runtime_error', reason: err.message }],
          },
        });
      }
    }

    return {
      profileId: profile.id,
      profileLabel: profile.label,
      tags: profile.tags,
      latencyMs: Date.now() - t0,
      discoveryDestinations,
      budgetWarning: !Array.isArray(discoveryResult) ? discoveryResult?.budgetWarning : null,
      packages,
      errored: false,
    };
  } catch (err) {
    return {
      profileId: profile.id,
      profileLabel: profile.label,
      tags: profile.tags,
      latencyMs: Date.now() - t0,
      discoveryDestinations: [],
      packages: [],
      errored: true,
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
    };
  }
}

function renderMarkdown(summary, results) {
  const lines = [];
  lines.push(`# Skusku complete package quality run - ${summary.startedAt}`);
  lines.push('');
  lines.push(`**Profiles**: ${summary.total} | **Passed**: ${summary.passed} | **Failed**: ${summary.failed} | **Errored**: ${summary.errored}`);
  lines.push(`**Total wall time**: ${(summary.totalWallMs / 1000).toFixed(1)}s | **Avg per profile**: ${(summary.avgLatencyMs / 1000).toFixed(1)}s`);
  lines.push(`**Destinations attempted per profile**: ${summary.destinationsPerProfile}`);
  lines.push('');
  lines.push('## Per-profile results');
  lines.push('');

  for (const r of results) {
    const status = r.run.errored ? 'ERROR' : r.eval.passed ? 'PASS' : 'FAIL';
    lines.push(`### ${status} - \`${r.profile.id}\``);
    lines.push(`*${r.profile.label}* - tags: ${(r.profile.tags || []).join(', ')}`);
    lines.push(`- Latency: ${(r.run.latencyMs / 1000).toFixed(1)}s`);
    lines.push(`- Discovery candidates: ${r.run.discoveryDestinations.length}`);
    lines.push(`- Passing packages: ${r.eval.passingPackages}/${r.run.packages.length}`);
    if (r.run.budgetWarning) {
      lines.push(`- Budget warning: ${r.run.budgetWarning.message}`);
    }
    if (r.run.errored) {
      lines.push(`- Error: ${r.run.error}`);
    }
    if (r.eval.failed.length) {
      lines.push('- Profile rules failed:');
      for (const f of r.eval.failed) {
        lines.push(`  - \`${f.rule}\`: ${f.reason}`);
      }
    }

    for (const p of r.run.packages) {
      const packageStatus = p.eval?.passed ? 'PASS' : 'FAIL';
      lines.push(`- ${packageStatus} package \`${p.destination}\` (${(p.latencyMs / 1000).toFixed(1)}s)`);
      if (p.error) {
        lines.push(`  - Error: ${p.error}`);
      } else {
        const trip = p.trip;
        lines.push(`  - Flight: EUR ${trip.flight.totalCost} ${trip.flight.outbound.departureAirport}->${trip.flight.outbound.arrivalAirport}`);
        lines.push(`  - Hotel: ${trip.hotel.name} | EUR ${Math.round(trip.hotel.totalPrice)} | ${trip.hotel.stars || '?'} stars | rating ${trip.hotel.rating?.value || '?'}`);
        lines.push(`  - Budget: EUR ${Math.round(trip.budget.flight + trip.budget.hotel + trip.budget.groundTransport)} / EUR ${trip.budget.total}, remaining EUR ${Math.round(trip.budget.remaining)}`);
      }
      if (p.eval?.failed?.length) {
        for (const f of p.eval.failed) {
          lines.push(`  - \`${f.rule}\`: ${f.reason}`);
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const profilesPath = path.resolve(__dirname, '..', 'tests', 'reco-profiles.json');
  const { profiles } = JSON.parse(await fs.readFile(profilesPath, 'utf8'));
  const filtered = profiles.filter(p => matchesFilter(p, args.filter)).slice(0, args.limit);

  console.log(`Loaded ${profiles.length} profiles, running ${filtered.length} after filter/limit.`);
  console.log(`Attempting ${args.destinations} destination package(s) per profile.`);

  const startedAt = new Date().toISOString();
  const safeStarted = startedAt.replace(/[:.]/g, '-');
  const outDir = args.outDir || path.resolve(__dirname, '..', 'reports', `${safeStarted}-packages`);
  await fs.mkdir(path.join(outDir, 'raw'), { recursive: true });

  const wallT0 = Date.now();
  const results = [];

  for (const profile of filtered) {
    process.stdout.write(`> ${profile.id}... `);
    const run = await runProfile(profile, args);
    const evalResult = evaluateRun(profile, run);
    const label = run.errored
      ? `ERROR (${run.error})`
      : evalResult.passed
        ? `PASS ${evalResult.passingPackages}/${run.packages.length} package(s) in ${(run.latencyMs / 1000).toFixed(1)}s`
        : `FAIL ${evalResult.failed.map(f => f.rule).join(',')}`;
    console.log(label);

    results.push({ profile, run, eval: evalResult });
    await fs.writeFile(path.join(outDir, 'raw', `${profile.id}.json`), JSON.stringify(run, null, 2));
  }

  const wallMs = Date.now() - wallT0;
  const summary = {
    startedAt,
    total: results.length,
    passed: results.filter(r => !r.run.errored && r.eval.passed).length,
    failed: results.filter(r => !r.run.errored && !r.eval.passed).length,
    errored: results.filter(r => r.run.errored).length,
    totalWallMs: wallMs,
    avgLatencyMs: results.length ? results.reduce((s, r) => s + r.run.latencyMs, 0) / results.length : 0,
    destinationsPerProfile: args.destinations,
  };

  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify({ summary, results }, null, 2));
  await fs.writeFile(path.join(outDir, 'report.md'), renderMarkdown(summary, results));

  console.log('\n--------------------------------');
  console.log(`Passed:  ${summary.passed}/${summary.total}`);
  console.log(`Failed:  ${summary.failed}/${summary.total}`);
  console.log(`Errored: ${summary.errored}/${summary.total}`);
  console.log(`Wall:    ${(wallMs / 1000).toFixed(1)}s (avg ${(summary.avgLatencyMs / 1000).toFixed(1)}s/profile)`);
  console.log(`Reports: ${outDir}`);
  console.log('--------------------------------');

  process.exit(summary.failed + summary.errored > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\nHarness crashed:', err.message);
  console.error(err.stack);
  process.exit(2);
});
