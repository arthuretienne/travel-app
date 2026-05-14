// Quality validation rules for /api/travel/recommendations style responses.
//
// Each rule returns either { ok: true } or { ok: false, reason: string }.
// Rules are intentionally permissive on edge cases (very low/high budget,
// niche profiles) — what we really want to catch is the SILENT BUG class:
// "the engine returned 0 destinations", "all prices are NaN", "every
// destination is the same country", etc.

const BUDGET_OVERRUN_TOLERANCE = 0.10;     // 10% over budget is OK
const MIN_DESTINATIONS_DEFAULT = 1;        // We always want at least 1
const MIN_DESTINATIONS_RICH = 3;           // Non-edge profiles should get >= 3
const MAX_DESTINATIONS = 5;
const MAX_LATENCY_WARM_MS = 180_000;       // 3 min — generous, includes Booking
const FLIGHT_PRICE_FLOOR_EUR = 20;
const FLIGHT_PRICE_CEILING_EUR = 5_000;
const HOTEL_PER_NIGHT_FLOOR_EUR = 15;
const HOTEL_PER_NIGHT_CEILING_EUR = 2_000;
const VALID_CITY_STATE_NAMES = new Set(['singapore', 'monaco', 'san marino', 'vatican city']);
const FLIGHT_DURATION_TOLERANCE_MINUTES = 30;

function isFinitePositive(n) {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function getBudget(profile) {
  return profile.payload?.basic?.budget ?? profile.payload?.constraints?.budget ?? 0;
}

// The profile.budget is per-person (matches the UI: "Budget par personne").
// Flight prices returned by Booking are for the whole group (we pass
// adults=travelers in the search). So when comparing flight cost against
// budget we have to multiply the per-person budget by traveler count, or we
// reject perfectly reasonable trips for couples/families.
function getTotalBudget(profile) {
  const perPerson = getBudget(profile);
  const travelers = profile.payload?.basic?.travelers || 1;
  return perPerson * travelers;
}

function getDuration(profile) {
  return profile.payload?.availability?.duration ?? 7;
}

function isEdgeProfile(profile) {
  return Array.isArray(profile.tags) && profile.tags.includes('edge');
}

// ────────────────────────────────────────────────────────────────────────
// Individual rules. Each takes the harness result and returns {ok, reason?}.

export const rules = {
  has_destinations: ({ destinations, profile }) => {
    if (!Array.isArray(destinations)) return { ok: false, reason: 'destinations is not an array' };
    const min = isEdgeProfile(profile) ? MIN_DESTINATIONS_DEFAULT : MIN_DESTINATIONS_RICH;
    if (destinations.length < min) return { ok: false, reason: `expected >= ${min} destinations, got ${destinations.length}` };
    return { ok: true };
  },

  not_too_many_destinations: ({ destinations }) => {
    if (destinations.length > MAX_DESTINATIONS) return { ok: false, reason: `got ${destinations.length} > max ${MAX_DESTINATIONS}` };
    return { ok: true };
  },

  unique_cities: ({ destinations }) => {
    const cities = destinations.map(d => (d.name || d.cityName || '').toLowerCase().trim()).filter(Boolean);
    const dupes = cities.filter((c, i) => cities.indexOf(c) !== i);
    if (dupes.length) return { ok: false, reason: `duplicate cities: ${[...new Set(dupes)].join(', ')}` };
    return { ok: true };
  },

  country_diversity: ({ destinations, profile }) => {
    if (destinations.length < 3) return { ok: true }; // n/a
    const countries = destinations.map(d => (d.countryName || d.country || '').toLowerCase().trim()).filter(Boolean);
    const unique = new Set(countries);
    // For 3+ destinations expect at least 2 distinct countries (1 country dominating is suspicious).
    if (unique.size < 2 && !isEdgeProfile(profile)) {
      return { ok: false, reason: `all destinations in same country: ${[...unique].join(',')}` };
    }
    return { ok: true };
  },

  flight_prices_plausible: ({ destinations, profile }) => {
    const travelers = profile.payload?.basic?.travelers || 1;
    const floor = FLIGHT_PRICE_FLOOR_EUR * travelers;
    const ceiling = FLIGHT_PRICE_CEILING_EUR * travelers;
    for (const d of destinations) {
      const p = d.price?.amount ?? d.flight?.price ?? d.flight?.totalCost;
      if (!isFinitePositive(p)) return { ok: false, reason: `${d.name}: flight price missing/invalid (${p})` };
      if (p < floor) return { ok: false, reason: `${d.name}: flight price suspiciously low €${p}` };
      if (p > ceiling) return { ok: false, reason: `${d.name}: flight price unreasonable €${p}` };
    }
    return { ok: true };
  },

  flight_duration_within_profile: ({ destinations, profile }) => {
    const maxHours = profile.payload?.basic?.maxFlightHours || profile.payload?.constraints?.maxFlightHours || null;
    if (!maxHours) return { ok: true };

    const maxMinutes = (Number(maxHours) * 60) + FLIGHT_DURATION_TOLERANCE_MINUTES;
    for (const d of destinations) {
      const outboundDuration = d.flight?.outbound?.duration || 0;
      const returnDuration = d.flight?.return?.duration || 0;
      const longestLeg = Math.max(outboundDuration, returnDuration);
      if (longestLeg > maxMinutes) {
        return { ok: false, reason: `${d.name}: longest flight leg ${longestLeg}min exceeds max ${maxHours}h + ${FLIGHT_DURATION_TOLERANCE_MINUTES}min` };
      }
    }
    return { ok: true };
  },

  no_null_country: ({ destinations }) => {
    for (const d of destinations) {
      const country = d.countryName || d.country;
      if (!country || /^null$|^undefined$/i.test(country)) {
        return { ok: false, reason: `${d.name}: country is null/undefined ("${country}")` };
      }
      // Catch the "Albania, Albania" / "France, France" bug.
      const name = (d.name || '').toLowerCase();
      const ctry = (country || '').toLowerCase();
      if (name && ctry && name === ctry && !VALID_CITY_STATE_NAMES.has(ctry)) {
        return { ok: false, reason: `${d.name}: city name == country name (data corruption)` };
      }
    }
    return { ok: true };
  },

  no_origin_as_destination: ({ destinations, profile }) => {
    const origin = (profile.payload.availability?.originCity || '').toLowerCase().trim();
    if (!origin) return { ok: true };
    for (const d of destinations) {
      const name = (d.name || d.cityName || '').toLowerCase().trim();
      if (name && origin.includes(name)) {
        return { ok: false, reason: `${d.name} is the same as origin (${origin})` };
      }
    }
    return { ok: true };
  },

  avoid_countries_respected: ({ destinations, profile }) => {
    const avoid = (profile.payload.constraints?.avoidCountries || []).map(c => c.toLowerCase());
    if (avoid.length === 0) return { ok: true };
    for (const d of destinations) {
      const country = (d.countryName || d.country || '').toLowerCase();
      if (avoid.some(a => country.includes(a))) {
        return { ok: false, reason: `${d.name} (${country}) violates avoidCountries=${avoid.join(',')}` };
      }
    }
    return { ok: true };
  },

  latency_ok: ({ latencyMs }) => {
    if (latencyMs > MAX_LATENCY_WARM_MS) return { ok: false, reason: `latency ${(latencyMs / 1000).toFixed(1)}s > ${MAX_LATENCY_WARM_MS / 1000}s` };
    return { ok: true };
  },

  budget_per_destination_within_limit: ({ destinations, profile }) => {
    const budget = getTotalBudget(profile);
    if (!budget) return { ok: true };
    const ceiling = budget * (1 + BUDGET_OVERRUN_TOLERANCE);
    for (const d of destinations) {
      // Skip if the destination explicitly flagged as over-budget alternative.
      if (d.budgetExceeded) continue;
      const flight = d.price?.amount ?? d.flight?.price ?? d.flight?.totalCost ?? 0;
      // Hotel may not be present in discoverDestinations output (only after optimizeDestination).
      // So we only enforce flight <= budget (looser check).
      if (flight > ceiling) {
        return { ok: false, reason: `${d.name}: flight €${flight} alone > budget+tol €${Math.round(ceiling)}` };
      }
    }
    return { ok: true };
  },
};

export function evaluate(result) {
  const failed = [];
  for (const [name, rule] of Object.entries(rules)) {
    try {
      const r = rule(result);
      if (!r.ok) failed.push({ rule: name, reason: r.reason });
    } catch (err) {
      failed.push({ rule: name, reason: `threw: ${err.message}` });
    }
  }
  return {
    passed: failed.length === 0,
    failed,
    totalRules: Object.keys(rules).length,
  };
}

export const config = {
  BUDGET_OVERRUN_TOLERANCE,
  MIN_DESTINATIONS_DEFAULT,
  MIN_DESTINATIONS_RICH,
  MAX_DESTINATIONS,
  MAX_LATENCY_WARM_MS,
};
