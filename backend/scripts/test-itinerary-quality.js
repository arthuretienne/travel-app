// Skusku day-by-day itinerary quality harness.
//
// This is the FOURTH pillar (after test-reco-quality + test-trip-package-quality):
// validates the Sonnet-generated day-by-day itinerary that the user actually
// reads on the saved-trip detail page. We do NOT modify itineraryService.js —
// we only call its exported generatePersonalizedItinerary() and check the
// returned array against quality rules.
//
// Why this exists
// ---------------
// The reco harness only validates which destinations are proposed. The package
// harness validates flights + hotels. But the *day-by-day plan* is what makes
// or breaks the experience — Arthur's exact words: "il faut que de bout en
// bout les datas soient vérifier".
//
// To run
// ------
//   cd backend
//   npm run test:itinerary                   # all 20 profiles (~25-40 min)
//   npm run test:itinerary -- --limit 3      # quick sample
//   npm run test:itinerary -- --filter solo  # subset by tag/id
//
// The harness picks ONE destination per profile (the cheapest in budget) and
// generates an itinerary for it. We don't fan out to 3 destinations per profile
// because the Sonnet itinerary call is the expensive bit and the patterns
// repeat — one well-chosen destination tells us enough about the prompt quality.

import '../env.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { discoverDestinations, optimizeDestination } = await import('../src/services/destinationService.js');
const { generatePersonalizedItinerary } = await import('../src/services/itineraryService.js');

// ────────────────────────────────────────────────────────────────────────
// CLI

function parseArgs(argv) {
  const out = { filter: null, limit: Infinity, outDir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--filter') out.filter = argv[++i];
    else if (a === '--limit') out.limit = parseInt(argv[++i], 10);
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

// ────────────────────────────────────────────────────────────────────────
// Quality rules. Each takes (itinerary, profile, trip) and returns {ok, reason}.
// The rules encode user-facing expectations: "I as Arthur, reading the trip
// detail page, expect to see X". Rule names match the failure mode they
// surface, so a failing harness pinpoints exactly what's wrong.

const GENERIC_LOCATION_TERMS = ['city center', 'centre ville', 'various', 'multiple locations', 'tba', 'tbd'];
const MEAL_KEYWORDS = ['breakfast', 'lunch', 'dinner', 'brunch', 'petit-déj', 'déjeuner', 'dîner', 'meal', 'restaurant', 'café', 'food'];
const ARRIVAL_KEYWORDS = ['airport', 'arrival', 'check-in', 'check in', 'arrive', 'transfer', 'aéroport', 'arrivée'];
const DEPARTURE_KEYWORDS = ['checkout', 'check-out', 'departure', 'airport', 'flight', 'leave', 'départ', 'aéroport'];
const TIME_PATTERN = /\b\d{1,2}[:.]?\d{0,2}\s*(?:am|pm|h)\b|\b\d{1,2}h\d{0,2}\b/i;

function countActivityField(schedule, fieldName) {
  if (!Array.isArray(schedule)) return 0;
  return schedule.filter(a => a && typeof a[fieldName] === 'string' && a[fieldName].trim().length > 0).length;
}

function evaluateItinerary(itinerary, profile, trip) {
  const failed = [];
  const fail = (rule, reason) => failed.push({ rule, reason });

  if (!Array.isArray(itinerary)) {
    fail('itinerary_is_array', `itinerary is ${typeof itinerary}, expected Array`);
    return { passed: false, failed };
  }
  if (itinerary.length === 0) {
    fail('itinerary_not_empty', 'itinerary array is empty');
    return { passed: false, failed };
  }

  const expectedDuration = profile.payload?.availability?.duration || 7;
  if (Math.abs(itinerary.length - expectedDuration) > 1) {
    // tolerate +/- 1 day (Sonnet sometimes off-by-one on arrival/departure days)
    fail('itinerary_day_count', `expected ~${expectedDuration} days, got ${itinerary.length}`);
  }

  const userName = trip?.userName || 'Arthur';

  for (let i = 0; i < itinerary.length; i++) {
    const day = itinerary[i];
    const dayLabel = `Day ${day?.day ?? i + 1}`;

    if (!day || typeof day !== 'object') {
      fail('day_is_object', `${dayLabel}: not an object`);
      continue;
    }
    if (!Array.isArray(day.schedule)) {
      fail('day_has_schedule_array', `${dayLabel}: schedule is not an array`);
      continue;
    }
    if (day.schedule.length < 4) {
      fail('day_has_enough_activities', `${dayLabel}: only ${day.schedule.length} activities, expected ≥4`);
    }

    // Activity-level fields
    const timeCount = countActivityField(day.schedule, 'time');
    if (timeCount < day.schedule.length * 0.8) {
      fail('activities_have_timestamps', `${dayLabel}: only ${timeCount}/${day.schedule.length} activities have a time field`);
    }

    // Real-looking time strings
    const realisticTimes = day.schedule.filter(a => a?.time && TIME_PATTERN.test(a.time)).length;
    if (realisticTimes < day.schedule.length * 0.7) {
      fail('timestamps_look_realistic', `${dayLabel}: only ${realisticTimes}/${day.schedule.length} timestamps look like HH:MM`);
    }

    // Cost field
    const withCost = day.schedule.filter(a => a && typeof a.cost === 'number' && a.cost >= 0).length;
    if (withCost < day.schedule.length * 0.7) {
      fail('activities_have_cost', `${dayLabel}: only ${withCost}/${day.schedule.length} activities have a numeric cost`);
    }

    // Location field (not generic)
    const realLocations = day.schedule.filter(a => {
      const loc = (a?.location || '').toLowerCase().trim();
      return loc.length >= 3 && !GENERIC_LOCATION_TERMS.includes(loc);
    }).length;
    if (realLocations < day.schedule.length * 0.7) {
      fail('locations_are_specific', `${dayLabel}: only ${realLocations}/${day.schedule.length} locations are specific (non-generic)`);
    }

    // Transport details
    const withTransport = countActivityField(day.schedule, 'transport');
    if (withTransport < day.schedule.length * 0.5) {
      fail('activities_have_transport', `${dayLabel}: only ${withTransport}/${day.schedule.length} activities mention transport`);
    }

    // At least one meal per day
    const hasMeal = day.schedule.some(a => {
      const text = `${a?.activity || ''} ${a?.type || ''}`.toLowerCase();
      return MEAL_KEYWORDS.some(kw => text.includes(kw));
    });
    if (!hasMeal) {
      fail('day_has_meal_break', `${dayLabel}: no meal break mentioned`);
    }
  }

  // Day 1 = arrival logistics
  const day1Text = JSON.stringify(itinerary[0] || {}).toLowerCase();
  if (!ARRIVAL_KEYWORDS.some(kw => day1Text.includes(kw))) {
    fail('day_1_mentions_arrival', 'Day 1 does not mention airport / arrival / transfer / check-in');
  }

  // Last day = departure logistics
  const lastDayText = JSON.stringify(itinerary[itinerary.length - 1] || {}).toLowerCase();
  if (!DEPARTURE_KEYWORDS.some(kw => lastDayText.includes(kw))) {
    fail('last_day_mentions_departure', 'Last day does not mention checkout / airport / departure');
  }

  // Personalisation — userName should appear in at least 3 places across the
  // itinerary (forWho, tips, etc.). Sonnet is supposed to be addressing the
  // user by name per the prompt.
  const fullText = JSON.stringify(itinerary).toLowerCase();
  const namePattern = new RegExp(`\\b${userName.toLowerCase()}\\b`, 'g');
  const nameMatches = (fullText.match(namePattern) || []).length;
  if (nameMatches < 3) {
    fail('personalised_with_user_name', `User name "${userName}" appears only ${nameMatches} times across the itinerary (expected ≥3)`);
  }

  // Highlights present at least on most days (helps the dashboard widget)
  const daysWithHighlights = itinerary.filter(d => Array.isArray(d?.highlights) && d.highlights.length > 0).length;
  if (daysWithHighlights < itinerary.length * 0.7) {
    fail('most_days_have_highlights', `only ${daysWithHighlights}/${itinerary.length} days have a highlights array`);
  }

  return { passed: failed.length === 0, failed };
}

// ────────────────────────────────────────────────────────────────────────
// One-profile run

async function runProfile(profile) {
  const userProfile = { ...profile.payload, onboardingPreferences: {} };
  const budgetPerPerson = userProfile.basic.budget;
  const travelers = userProfile.basic.travelers || 1;
  const totalBudget = budgetPerPerson * travelers;
  const origin = userProfile.availability?.originCity || 'Paris';
  const duration = userProfile.availability?.duration || 7;

  const t0 = Date.now();

  try {
    // Stage 1: discover
    const discoveryResult = await discoverDestinations({
      userProfile,
      budget: totalBudget,
      origin,
      duration,
      departureDate: userProfile.availability?.startDate || null,
      userId: null,
    });
    const destinations = Array.isArray(discoveryResult) ? discoveryResult : (discoveryResult.flightOptions || []);
    if (destinations.length === 0) {
      return { profile, errored: true, error: 'discovery returned no destinations', latencyMs: Date.now() - t0 };
    }

    // Stage 2: optimize the first destination
    const target = destinations[0];
    const trip = await optimizeDestination({
      destination: target.name || target.cityName,
      userProfile,
      budget: totalBudget,
      origin,
      duration,
      departureDate: userProfile.availability?.startDate || null,
      isFixedDate: false,
    });
    if (!trip) {
      return { profile, errored: true, error: 'optimizeDestination returned null', latencyMs: Date.now() - t0 };
    }

    // Stage 3: itinerary
    const userName = 'Arthur'; // realistic stand-in for testing personalisation
    const tripData = {
      city: trip.destination.name,
      country: trip.destination.country,
      startDate: trip.dates.departure,
      endDate: trip.dates.return,
      suggestedActivities: userProfile.basic.activities || [],
      flightDetails: trip.flight,
      hotelDetails: trip.hotel,
    };
    const itinerary = await generatePersonalizedItinerary(tripData, userProfile, userName, []);

    const elapsed = Date.now() - t0;
    const evalResult = evaluateItinerary(itinerary, profile, { ...trip, userName });

    return {
      profile,
      latencyMs: elapsed,
      destination: target.name,
      itineraryLength: Array.isArray(itinerary) ? itinerary.length : 0,
      itinerary,  // store full itinerary in the per-profile raw dump
      ...evalResult,
    };
  } catch (err) {
    return {
      profile,
      errored: true,
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
      latencyMs: Date.now() - t0,
    };
  }
}

// ────────────────────────────────────────────────────────────────────────
// Output renderers

function renderMarkdown(summary, results) {
  const lines = [];
  lines.push(`# Skusku itinerary quality run — ${summary.startedAt}`);
  lines.push('');
  lines.push(`**Profiles**: ${summary.total} | **Passed**: ${summary.passed} | **Failed**: ${summary.failed} | **Errored**: ${summary.errored}`);
  lines.push(`**Total wall time**: ${(summary.totalWallMs / 1000).toFixed(1)}s | **Avg per profile**: ${(summary.avgLatencyMs / 1000).toFixed(1)}s`);
  lines.push('');

  // Group failures by rule name to see which rules trip most
  const ruleFailures = {};
  for (const r of results) {
    for (const f of r.failed || []) {
      ruleFailures[f.rule] = (ruleFailures[f.rule] || 0) + 1;
    }
  }
  if (Object.keys(ruleFailures).length) {
    lines.push('## Failures by rule (most frequent first)');
    const sorted = Object.entries(ruleFailures).sort((a, b) => b[1] - a[1]);
    for (const [rule, count] of sorted) {
      lines.push(`- \`${rule}\` — ${count}× failures`);
    }
    lines.push('');
  }

  lines.push('## Per-profile results');
  lines.push('');
  for (const r of results) {
    const status = r.errored ? '💥 ERROR' : r.passed ? '✅ PASS' : '❌ FAIL';
    lines.push(`### ${status} — \`${r.profile.id}\``);
    lines.push(`*${r.profile.label}* — tags: ${(r.profile.tags || []).join(', ')}`);
    lines.push(`- Latency: ${(r.latencyMs / 1000).toFixed(1)}s`);
    if (r.destination) lines.push(`- Destination chosen: ${r.destination}`);
    if (r.itineraryLength != null) lines.push(`- Days generated: ${r.itineraryLength}`);
    if (r.errored) lines.push(`- 💥 Error: ${r.error}`);
    if (r.failed?.length) {
      lines.push(`- Rules failed:`);
      for (const f of r.failed) {
        lines.push(`  - \`${f.rule}\`: ${f.reason}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const profilesPath = path.resolve(__dirname, '..', 'tests', 'reco-profiles.json');
  const { profiles } = JSON.parse(await fs.readFile(profilesPath, 'utf8'));
  const filtered = profiles.filter(p => matchesFilter(p, args.filter)).slice(0, args.limit);
  console.log(`Loaded ${profiles.length} profiles, running ${filtered.length} through full pipeline + Sonnet itinerary.`);

  const startedAt = new Date().toISOString();
  const safeStarted = startedAt.replace(/[:.]/g, '-');
  const outDir = args.outDir || path.resolve(__dirname, '..', 'reports', `${safeStarted}-itinerary`);
  await fs.mkdir(path.join(outDir, 'raw'), { recursive: true });

  const results = [];
  const wallT0 = Date.now();

  for (const profile of filtered) {
    process.stdout.write(`▸ ${profile.id}… `);
    const r = await runProfile(profile);
    const label = r.errored
      ? `ERROR (${r.error})`
      : r.passed
        ? `PASS ${r.itineraryLength}d in ${(r.latencyMs / 1000).toFixed(1)}s`
        : `FAIL ${(r.failed || []).map(f => f.rule).join(',')}`;
    console.log(label);
    results.push(r);
    await fs.writeFile(path.join(outDir, 'raw', `${profile.id}.json`), JSON.stringify(r, null, 2));
  }

  const wallMs = Date.now() - wallT0;
  const summary = {
    startedAt,
    total: results.length,
    passed: results.filter(r => !r.errored && r.passed).length,
    failed: results.filter(r => !r.errored && !r.passed).length,
    errored: results.filter(r => r.errored).length,
    totalWallMs: wallMs,
    avgLatencyMs: results.length ? results.reduce((s, r) => s + r.latencyMs, 0) / results.length : 0,
  };

  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify({ summary, results }, null, 2));
  await fs.writeFile(path.join(outDir, 'report.md'), renderMarkdown(summary, results));

  console.log('\n────────────────────────────────');
  console.log(`Passed:  ${summary.passed}/${summary.total}`);
  console.log(`Failed:  ${summary.failed}/${summary.total}`);
  console.log(`Errored: ${summary.errored}/${summary.total}`);
  console.log(`Wall:    ${(wallMs / 1000).toFixed(1)}s   (avg ${(summary.avgLatencyMs / 1000).toFixed(1)}s/profile)`);
  console.log(`Reports: ${outDir}`);
  console.log('────────────────────────────────');

  process.exit(summary.failed + summary.errored > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n❌ harness crashed:', err.message);
  console.error(err.stack);
  process.exit(2);
});
