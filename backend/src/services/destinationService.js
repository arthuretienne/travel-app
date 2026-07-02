// backend/src/services/destinationService.js
// Destination discovery and optimization logic
// MIGRATED TO BOOKING.COM API (2025-11-30)

import * as bookingService from './bookingService.js';
import { generateDestinationShortlist } from './claudeService.js';
import { getRejectedDestinations } from './recommendationEngine.js';
import * as hotelService from './hotelService.js'; // Old hotel service (not used)

const FLIGHT_DURATION_TOLERANCE_MINUTES = 30;

/**
 * Mapping of popular destinations without airports to their nearest airport
 * Includes ground transport info (type, duration, estimated cost)
 */
const NEAREST_AIRPORT_MAP = {
  // Italy
  'lake como': { airport: 'Milan', airportCode: 'MXP', transport: 'train', duration: '1h', cost: 15, distance: '50km' },
  'como': { airport: 'Milan', airportCode: 'MXP', transport: 'train', duration: '40min', cost: 12, distance: '45km' },
  'cinque terre': { airport: 'Pisa', airportCode: 'PSA', transport: 'train', duration: '1h30', cost: 15, distance: '80km' },
  'amalfi': { airport: 'Naples', airportCode: 'NAP', transport: 'bus', duration: '1h30', cost: 20, distance: '65km' },
  'positano': { airport: 'Naples', airportCode: 'NAP', transport: 'bus', duration: '1h45', cost: 20, distance: '60km' },
  'sorrento': { airport: 'Naples', airportCode: 'NAP', transport: 'train', duration: '1h', cost: 10, distance: '50km' },
  'capri': { airport: 'Naples', airportCode: 'NAP', transport: 'ferry', duration: '1h30', cost: 25, distance: '30km' },
  'siena': { airport: 'Florence', airportCode: 'FLR', transport: 'bus', duration: '1h15', cost: 12, distance: '70km' },
  'san gimignano': { airport: 'Florence', airportCode: 'FLR', transport: 'bus', duration: '1h30', cost: 15, distance: '55km' },
  'portofino': { airport: 'Genoa', airportCode: 'GOA', transport: 'bus', duration: '45min', cost: 10, distance: '35km' },

  // France
  'saint-tropez': { airport: 'Nice', airportCode: 'NCE', transport: 'bus', duration: '2h', cost: 25, distance: '100km' },
  'cannes': { airport: 'Nice', airportCode: 'NCE', transport: 'train', duration: '30min', cost: 8, distance: '30km' },
  'monaco': { airport: 'Nice', airportCode: 'NCE', transport: 'train', duration: '25min', cost: 6, distance: '20km' },
  'mont saint-michel': { airport: 'Rennes', airportCode: 'RNS', transport: 'bus', duration: '1h15', cost: 15, distance: '70km' },
  'chamonix': { airport: 'Geneva', airportCode: 'GVA', transport: 'bus', duration: '1h15', cost: 30, distance: '85km' },

  // Spain
  'costa brava': { airport: 'Barcelona', airportCode: 'BCN', transport: 'bus', duration: '1h30', cost: 15, distance: '100km' },
  'san sebastian': { airport: 'Bilbao', airportCode: 'BIO', transport: 'bus', duration: '1h15', cost: 12, distance: '100km' },
  'toledo': { airport: 'Madrid', airportCode: 'MAD', transport: 'train', duration: '30min', cost: 15, distance: '70km' },

  // Greece
  'santorini': { airport: 'Santorini', airportCode: 'JTR', transport: null, duration: null, cost: 0, distance: null }, // Has airport but small
  'meteora': { airport: 'Thessaloniki', airportCode: 'SKG', transport: 'bus', duration: '3h', cost: 20, distance: '230km' },

  // Croatia
  'plitvice': { airport: 'Zagreb', airportCode: 'ZAG', transport: 'bus', duration: '2h', cost: 15, distance: '130km' },
  'hvar': { airport: 'Split', airportCode: 'SPU', transport: 'ferry', duration: '1h', cost: 20, distance: '45km' },

  // Switzerland
  'zermatt': { airport: 'Geneva', airportCode: 'GVA', transport: 'train', duration: '3h30', cost: 80, distance: '240km' },
  'interlaken': { airport: 'Zurich', airportCode: 'ZRH', transport: 'train', duration: '2h', cost: 35, distance: '120km' },
  'lucerne': { airport: 'Zurich', airportCode: 'ZRH', transport: 'train', duration: '1h', cost: 25, distance: '55km' },

  // Austria
  'hallstatt': { airport: 'Salzburg', airportCode: 'SZG', transport: 'bus', duration: '1h30', cost: 15, distance: '75km' },

  // UK
  'cotswolds': { airport: 'London', airportCode: 'LHR', transport: 'train', duration: '1h30', cost: 30, distance: '130km' },
  'lake district': { airport: 'Manchester', airportCode: 'MAN', transport: 'train', duration: '2h', cost: 35, distance: '130km' },

  // Portugal
  'sintra': { airport: 'Lisbon', airportCode: 'LIS', transport: 'train', duration: '40min', cost: 5, distance: '30km' },
  'algarve': { airport: 'Faro', airportCode: 'FAO', transport: null, duration: null, cost: 0, distance: null }, // Has airport

  // Netherlands
  'giethoorn': { airport: 'Amsterdam', airportCode: 'AMS', transport: 'bus', duration: '2h', cost: 20, distance: '120km' },

  // Indonesia
  'ubud': { airport: 'Bali', airportCode: 'DPS', transport: 'car', duration: '1h30', cost: 20, distance: '35km' },
  'gili islands': { airport: 'Lombok', airportCode: 'LOP', transport: 'boat', duration: '30min', cost: 15, distance: '15km' },
};

/**
 * Find nearest airport for a destination that has no direct flights
 * @param {string} destinationName - The destination to search
 * @returns {Object|null} - Nearest airport info or null if destination has an airport
 */
function findNearestAirport(destinationName) {
  const normalized = destinationName.toLowerCase()
    .replace(/,\s*(italy|france|spain|greece|croatia|switzerland|austria|uk|portugal|netherlands|indonesia)$/i, '')
    .trim();

  // Check exact match first
  if (NEAREST_AIRPORT_MAP[normalized]) {
    return NEAREST_AIRPORT_MAP[normalized];
  }

  // Check partial match (e.g., "Lake Como, Italy" -> "lake como")
  for (const [key, value] of Object.entries(NEAREST_AIRPORT_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return null;
}

/**
 * Estimate flight budget ratio based on actual flight prices found.
 * Uses the median flight price to infer whether destinations are short/medium/long-haul.
 *
 * Ratios were widened in May 2026 because the old 30/40/55 thresholds filtered
 * everything out for users with realistic budgets — a €1000 trip filtered to
 * "€300 max for flights" was rejecting destinations like Lisbon, Barcelona,
 * Naples that the user would have gladly taken at €350-400 flights.
 *
 * - Short-haul (Europe/Maghreb): flights ~€80-250 → 40% of budget for flights
 * - Medium-haul (Turkey, Canaries, Egypt): flights ~€200-400 → 50%
 * - Long-haul (Asia, Americas, Sub-Saharan Africa): flights ~€400+ → 65%
 */
function getFlightBudgetRatio(destinationsWithFlights) {
  if (!destinationsWithFlights || destinationsWithFlights.length === 0) return 0.50;

  const prices = destinationsWithFlights.map(d => d.price?.amount || 0).filter(p => p > 0);
  if (prices.length === 0) return 0.50;

  const median = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];

  if (median <= 250) {
    console.log(`   ✈️  Short-haul detected (median €${Math.round(median)}) → 40% flight budget ratio`);
    return 0.40;
  } else if (median <= 450) {
    console.log(`   ✈️  Medium-haul detected (median €${Math.round(median)}) → 50% flight budget ratio`);
    return 0.50;
  } else {
    console.log(`   ✈️  Long-haul detected (median €${Math.round(median)}) → 65% flight budget ratio`);
    return 0.65;
  }
}

// Garde-fou très courts séjours (audit V3/V4, E10a) : pour 1-2 jours,
// personne ne vole 7 h — on borne au court-courrier même si l'utilisateur
// n'a rien précisé (sa préférence explicite plus stricte reste prioritaire).
const SHORT_TRIP_MAX_FLIGHT_HOURS = 3.5;

function getMaxFlightMinutes(userProfile, duration = null) {
  const hours = userProfile?.basic?.maxFlightHours || userProfile?.constraints?.maxFlightHours || null;
  const shortTripCap = duration != null && duration <= 2 ? SHORT_TRIP_MAX_FLIGHT_HOURS : null;
  const effective = shortTripCap != null
    ? Math.min(Number(hours) || shortTripCap, shortTripCap)
    : (hours ? Number(hours) : null);
  if (!effective) return null;
  return (effective * 60) + FLIGHT_DURATION_TOLERANCE_MINUTES;
}

function flightFitsMaxDuration(flight, maxFlightMinutes) {
  if (!maxFlightMinutes) return true;
  const outboundDuration = flight?.outbound?.duration || 0;
  const returnDuration = flight?.return?.duration || 0;
  const longestLeg = Math.max(outboundDuration, returnDuration);
  return !longestLeg || longestLeg <= maxFlightMinutes;
}

function getProfileTravelSignals(userProfile) {
  const basic = userProfile?.basic || {};
  const preferences = userProfile?.preferences || {};
  const onboarding = userProfile?.onboardingPreferences || {};
  const activities = [
    ...(basic.activities || []),
    ...(preferences.activities || []),
    ...(onboarding.topActivities || []),
  ].map(a => String(a).toLowerCase());
  const style = String(basic.style || '').toLowerCase();
  const climate = preferences.climate || basic.climate || onboarding.climate || 'any';

  return {
    activities,
    style,
    climate,
    wantsNature: style.includes('nature') ||
      style.includes('adventure') ||
      activities.some(a => ['nature', 'hiking', 'mountain', 'ski', 'outdoor', 'family-friendly'].includes(a)),
    wantsBeach: activities.some(a => ['beach', 'plage', 'diving', 'surf', 'snorkeling'].includes(a)),
    wantsCulture: style.includes('culture') ||
      activities.some(a => ['culture', 'art', 'gastronomy', 'wine', 'festival'].includes(a)),
    wantsTropical: climate === 'tropical',
  };
}

function destinationFitScore(destination, userProfile) {
  const signals = getProfileTravelSignals(userProfile);
  const haystack = `${destination.name || ''} ${destination.cityName || ''} ${destination.countryName || ''} ${destination.country || ''}`.toLowerCase();
  let score = 0;

  const tropicalOrSubtropical = [
    'tenerife', 'canary', 'gran canaria', 'fuerteventura', 'lanzarote',
    'cape verde', 'sal', 'madeira', 'djerba', 'hurghada', 'agadir',
    'zanzibar', 'phuket', 'bali', 'denpasar', 'aruba', 'cartagena',
    'caribbean', 'cancun', 'playa del carmen', 'koh samui', 'palawan',
    'maldives', 'mauritius', 'seychelles',
  ];
  const warmCoastal = ['essaouira', 'marrakech', 'malaga', 'valencia', 'palma', 'faro', 'athens', 'split'];
  const nature = ['nice', 'ajaccio', 'bastia', 'geneva', 'zurich', 'innsbruck', 'split', 'madeira', 'tenerife'];
  const culture = ['rome', 'florence', 'vienna', 'lisbon', 'barcelona', 'istanbul', 'marrakech', 'prague'];

  if (signals.wantsTropical) {
    if (tropicalOrSubtropical.some(term => haystack.includes(term))) score += 80;
    else if (warmCoastal.some(term => haystack.includes(term))) score += 25;
    else score -= 25;
  }
  if (signals.wantsBeach && [...tropicalOrSubtropical, ...warmCoastal].some(term => haystack.includes(term))) score += 25;
  if (signals.wantsNature && nature.some(term => haystack.includes(term))) score += 25;
  if (signals.wantsCulture && culture.some(term => haystack.includes(term))) score += 15;

  return score;
}

/**
 * Discover destinations when user doesn't specify one
 * NEW WORKFLOW: Uses Claude AI + Booking.com API
 * Returns top 3-5 destinations with flights and prices
 */
export async function discoverDestinations({
  userProfile,
  budget,
  origin,
  duration = 7,
  departureDate = null,
  userId = null, // For diversity tracking
}) {
  console.log(`🔍 NEW WORKFLOW: Discovering destinations from ${origin} with budget €${budget}`);

  try {
    // STEP 1: Claude AI generates personalized shortlist (4 destinations - faster)
    console.log('🤖 Step 1: Generating personalized shortlist with Claude AI...');

    const avoidCountries = (userProfile?.constraints?.avoidCountries || [])
      .map(c => String(c).trim())
      .filter(Boolean);

    // Villes rejetées par l'utilisateur (signal 'rejected') : le moteur
    // vectoriel les filtre déjà, mais CE chemin est le fallback quand il est
    // down — sans cette lecture, un rejet réapparaissait immédiatement
    // (audit V4, E14). Best-effort : [] si Supabase ne répond pas.
    const rejectedCities = await getRejectedDestinations(userId);
    if (rejectedCities.length > 0) {
      console.log(`🚫 User-rejected destinations excluded: ${rejectedCities.join(', ')}`);
    }

    const shortlist = await generateDestinationShortlist(userProfile, {
      budget,
      duration,
      origin,
      count: 8, // More candidates → better country diversity after filtering
      userId, // Pass userId for diversity (avoids recently recommended destinations)
      // Très court séjour (≤ 2 j) : borne court-courrier, même sans
      // préférence explicite (E10a : Montréal proposé pour 24 h).
      maxFlightHours: duration <= 2
        ? Math.min(Number(userProfile?.basic?.maxFlightHours || userProfile?.constraints?.maxFlightHours) || SHORT_TRIP_MAX_FLIGHT_HOURS, SHORT_TRIP_MAX_FLIGHT_HOURS)
        : (userProfile?.basic?.maxFlightHours || userProfile?.constraints?.maxFlightHours || null),
      avoidCountries, // hard-exclusion list passed straight to the prompt
      excludeDestinations: rejectedCities, // rejoint le « DO NOT SUGGEST » du prompt
    });

    console.log(`✅ Claude suggested: ${shortlist.join(', ')}`);

    // STEP 2: Get destination IDs in parallel (origin + all shortlist destinations at once)
    console.log('📍 Step 2: Getting destination IDs in parallel...');

    const [originDest, ...destinationResults] = await Promise.all([
      bookingService.getDestinationId(origin),
      ...shortlist.map(async (cityName) => {
        try {
          const dest = await bookingService.getDestinationId(cityName);
          return { cityName, dest };
        } catch (error) {
          console.warn(`⚠️  Could not find destination ID for ${cityName}:`, error.message);
          return null;
        }
      }),
    ]);

    const validDestinations = destinationResults.filter(d => d !== null);

    console.log(`✅ Found ${validDestinations.length}/${shortlist.length} destination IDs`);

    // STEP 3: Search flights for all destinations
    console.log('✈️  Step 3: Searching flights for all destinations...');

    // Calculate dates
    if (!departureDate) {
      const today = new Date();
      const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      departureDate = future.toISOString().split('T')[0];
    }

    const returnDate = new Date(departureDate);
    returnDate.setDate(returnDate.getDate() + duration);
    const returnDateStr = returnDate.toISOString().split('T')[0];

    // Extract actual traveler count for flight search (affects price and availability)
    const groupTravelers = userProfile?.basic?.travelers || 1;
    const groupAdults = typeof groupTravelers === 'number' ? groupTravelers : 1;
    console.log(`   👥 Shortlist flight search: ${groupAdults} adult(s)`);

    const flightPromises = validDestinations.map(async ({ cityName, dest }) => {
      try {
        const flights = await bookingService.searchFlights({
          fromId: originDest.id,
          toId: dest.id,
          departDate: departureDate,
          returnDate: returnDateStr,
          adults: groupAdults, // Use actual group size for accurate pricing
          cabinClass: 'ECONOMY',
          currency: 'EUR'
        });

        if (flights.count === 0) {
          console.warn(`⚠️  No flights found for ${cityName}`);
          return null;
        }

        const cheapestFlight = flights.flights[0];
        const displayName = dest.cityName || cityName;

        return {
          name: displayName, // Use normalized city/destination name instead of airport name
          cityName: displayName,
          code: dest.code,
          country: dest.country,
          countryName: dest.countryName,
          destinationId: dest.id,
          airportName: dest.name, // Keep original airport name for reference
          price: {
            amount: cheapestFlight.price.amount,
            currency: cheapestFlight.price.currency,
            formatted: cheapestFlight.price.formatted
          },
          flight: cheapestFlight,
          flightCount: flights.count
        };
      } catch (error) {
        console.warn(`⚠️  Flight search failed for ${cityName}:`, error.message);
        return null;
      }
    });

    const flightResults = await Promise.all(flightPromises);
    const maxFlightMinutes = getMaxFlightMinutes(userProfile, duration);
    let destinationsWithFlights = flightResults.filter(d => d !== null);

    if (maxFlightMinutes) {
      const beforeCount = destinationsWithFlights.length;
      destinationsWithFlights = destinationsWithFlights.filter(d => flightFitsMaxDuration(d.flight, maxFlightMinutes));
      const removedCount = beforeCount - destinationsWithFlights.length;
      if (removedCount > 0) {
        const maxHours = Math.round((maxFlightMinutes - FLIGHT_DURATION_TOLERANCE_MINUTES) / 60);
        console.log(`⏱️  Filtered out ${removedCount} destination(s) exceeding max flight duration (${maxHours}h + ${FLIGHT_DURATION_TOLERANCE_MINUTES}min tolerance)`);
      }
    }

    // Defense in depth on avoidCountries: Claude is supposed to honour the
    // hard exclusion in the shortlist prompt, but Sonnet occasionally slips
    // a forbidden country through ("Florence" instead of obeying "no Italy").
    // We re-filter here so the route never ships a destination that violates
    // an explicit user exclusion.
    if (avoidCountries.length > 0) {
      const lcAvoid = avoidCountries.map(c => c.toLowerCase());
      const beforeAvoid = destinationsWithFlights.length;
      destinationsWithFlights = destinationsWithFlights.filter(d => {
        const country = (d.countryName || d.country || '').toLowerCase();
        return !lcAvoid.some(forbid => country.includes(forbid));
      });
      const dropped = beforeAvoid - destinationsWithFlights.length;
      if (dropped > 0) {
        console.log(`🚫 Filtered out ${dropped} destination(s) in user-excluded countries: ${avoidCountries.join(', ')}`);
      }
    }

    // Défense en profondeur sur les rejets : même logique que avoidCountries —
    // le prompt est censé les exclure, on garantit qu'aucune ville rejetée ne
    // sort quand même (E14).
    if (rejectedCities.length > 0) {
      const lcRejected = rejectedCities.map(c => String(c).toLowerCase());
      const beforeRejected = destinationsWithFlights.length;
      destinationsWithFlights = destinationsWithFlights.filter(d => {
        const city = (d.cityName || d.name || '').toLowerCase();
        return !lcRejected.some(r => city.includes(r) || r.includes(city));
      });
      const droppedRejected = beforeRejected - destinationsWithFlights.length;
      if (droppedRejected > 0) {
        console.log(`🚫 Filtered out ${droppedRejected} user-rejected destination(s)`);
      }
    }

    console.log(`✅ Found flights for ${destinationsWithFlights.length} destinations`);

    // BAILOUT: Booking found zero flights for any destination Claude suggested.
    // Previously this fell through silently and returned an empty array, which
    // the stream route would relay as "Aucun résultat trouvé" — the bug Arthur
    // hit live on 2026-05-14. Instead, fall back to the curated list so the
    // user gets *something*. The route handler still runs optimizeDestination
    // on each, which does its own flight search and may succeed where the
    // bulk search didn't.
    if (destinationsWithFlights.length === 0) {
      console.warn('[discoverDestinations] ⚠️  Booking returned 0 flights for all candidates — falling back to curated list');
      console.log('[discoverDestinations] Pipeline summary:', {
        origin, budget, duration,
        shortlist_size: shortlist.length,
        destination_ids_found: validDestinations.length,
        flights_found: 0,
        outcome: 'fallback_curated',
      });
      return await fallbackDestinations(origin, budget, userProfile);
    }

    // STEP 4: Filter by budget and select best matches
    const flightBudgetRatio = getFlightBudgetRatio(destinationsWithFlights);
    const maxFlightBudget = budget * flightBudgetRatio;

    const affordable = destinationsWithFlights.filter(d => d.price.amount <= maxFlightBudget);

    console.log(`✅ ${affordable.length} destinations within flight budget (€${maxFlightBudget})`);

    // NEW: If no affordable flights, show best options anyway with alternatives
    if (affordable.length === 0 && destinationsWithFlights.length > 0) {
      console.warn('⚠️  No destinations within budget - showing best options with alternatives');

      // Sort all destinations by price
      destinationsWithFlights.sort((a, b) => a.price.amount - b.price.amount);

      // Get cheapest options (even if over budget)
      const overBudgetOptions = destinationsWithFlights.slice(0, 3).map(d => ({
        ...d,
        budgetExceeded: true,
        priceDifference: d.price.amount - maxFlightBudget,
        budgetAdvice: `Flights €${Math.round(d.price.amount - maxFlightBudget)} over budget. Consider: train/bus, flexible dates, or increase budget.`
      }));

      // Add train/bus alternatives for nearby destinations
      const trainAlternatives = getTrainAlternatives(origin, budget);
      const contextualFallbacks = await fallbackDestinations(origin, budget, userProfile);
      const fallbackOptions = contextualFallbacks.slice(0, 3).map(d => ({
        ...d,
        fallbackReason: 'No affordable live flight candidate survived budget/time filters; recheck this contextual alternative during optimization.',
      }));

      console.log(`🚂 Adding ${trainAlternatives.length} train/bus alternatives`);
      console.log(`🧭 Adding ${fallbackOptions.length} contextual fallback flight option(s)`);

      return {
        flightOptions: fallbackOptions.length ? fallbackOptions : overBudgetOptions,
        alternatives: trainAlternatives,
        overBudgetOptions,
        // Message utilisateur : toujours en français (Annexe A #8 audit V3 —
        // ce warning arrivait en anglais sur un produit français).
        budgetWarning: {
          message: `Les vols dépassent votre budget de ${budget} €. Pour rester dedans, voici vos meilleures options :`,
          suggestions: [
            'Partir en train ou en bus vers une destination proche (souvent moins cher)',
            'Élargir vos dates de ±3 jours (jusqu’à 30-50 % d’économie)',
            'Réserver 2-3 mois à l’avance',
            `Augmenter le budget d’environ ${Math.round(overBudgetOptions[0]?.priceDifference || 100)} € pour débloquer plus d’options`
          ]
        }
      };
    }

    let selectionCandidates = [...affordable];
    if (selectionCandidates.length > 0 && selectionCandidates.length < 3) {
      const supplemental = await fallbackDestinations(origin, budget, userProfile);
      const existingNames = new Set(selectionCandidates.map(d => (d.name || d.cityName || '').toLowerCase()));
      const additions = supplemental.filter(d => !existingNames.has((d.name || '').toLowerCase()));
      selectionCandidates = [...selectionCandidates, ...additions].slice(0, 5);
      console.log(`🧭 Added ${additions.length} contextual fallback candidate(s) because only ${affordable.length} affordable flight option(s) survived filters`);
    }

    // Sort by profile fit first, then by price.
    selectionCandidates.sort((a, b) => {
      const fitDiff = destinationFitScore(b, userProfile) - destinationFitScore(a, userProfile);
      if (fitDiff !== 0) return fitDiff;
      return (a.price?.amount || 9999) - (b.price?.amount || 9999);
    });

    // Apply country diversity: prioritize destinations from different countries
    // First pass: one destination per country (cheapest)
    const usedCountries = new Set();
    const diverseFirst = [];
    const countryDuplicates = [];
    for (const dest of selectionCandidates) {
      const country = dest.countryName || dest.country || dest.name;
      if (!usedCountries.has(country)) {
        usedCountries.add(country);
        diverseFirst.push(dest);
      } else {
        countryDuplicates.push(dest);
      }
    }
    // Diverse countries first, then fill with duplicates if needed
    const selected = [...diverseFirst, ...countryDuplicates].slice(0, Math.min(5, selectionCandidates.length));

    console.log(`🎯 Selected ${selected.length} best destinations (${usedCountries.size} countries):`);
    selected.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.name} (${d.countryName || d.country}) - €${d.price.amount} (${d.flightCount} flights)`);
    });

    // Single-line pipeline summary, grep-friendly for Render log queries.
    console.log('[discoverDestinations] Pipeline summary:', {
      origin, budget, duration,
      shortlist_size: shortlist.length,
      destination_ids_found: validDestinations.length,
      flights_found: destinationsWithFlights.length,
      flight_budget_ratio: flightBudgetRatio,
      max_flight_budget: Math.round(maxFlightBudget),
      affordable_after_filter: affordable.length,
      selected_returned: selected.length,
      countries: usedCountries.size,
      outcome: 'ok',
    });

    // Last-mile safety net: somehow we got here with nothing selected (e.g.
    // diversity selection bug, off-by-one). Better to fall back to a curated
    // list than return empty silently — the calling stream route would relay
    // [] as "no results found" with no explanation.
    if (selected.length === 0) {
      console.warn('[discoverDestinations] ⚠️  Selected is empty after diversity pass — falling back');
      return await fallbackDestinations(origin, budget, userProfile);
    }

    return selected;

  } catch (error) {
    console.error('❌ discoverDestinations failed:', error.message);
    console.error(error.stack);
    // Fallback to curated list
    return await fallbackDestinations(origin, budget, userProfile);
  }
}

/**
 * Generate date candidates for multi-date search
 * OPTIMIZED: Reduced from 7 to 3 candidates for faster response (saves ~5-8s per destination)
 * Returns array of departure dates to check
 * @param {string} userDepartureDate - User's requested departure date (YYYY-MM-DD)
 * @param {number} duration - Trip duration in days
 * @param {boolean} isFixedDate - If true, use ONLY the exact date (no flexibility)
 */
function generateDateCandidates(userDepartureDate, duration, isFixedDate = false) {
  const candidates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (userDepartureDate) {
    const baseDate = new Date(userDepartureDate);

    // FIXED DATES: Use EXACTLY the user's date, no flexibility
    if (isFixedDate) {
      if (baseDate >= today) {
        candidates.push(baseDate.toISOString().split('T')[0]);
      }
      return candidates; // Return immediately with only the exact date
    }

    // FLEXIBLE DATES: Check ±1 day around it for best price
    for (let offset = -1; offset <= 1; offset++) {
      const candidate = new Date(baseDate);
      candidate.setDate(candidate.getDate() + offset);
      // Don't search dates in the past
      if (candidate >= today) {
        candidates.push(candidate.toISOString().split('T')[0]);
      }
    }
  } else {
    // No date specified - search 3 strategic dates (was 8 weeks, now just 3 key dates)
    const startSearch = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000); // Start in 3 weeks

    // 1. First Friday (weekend trip option)
    const friday = new Date(startSearch);
    friday.setDate(friday.getDate() + (5 - friday.getDay() + 7) % 7);
    if (friday > today) {
      candidates.push(friday.toISOString().split('T')[0]);
    }

    // 2. Wednesday 2 weeks later (often cheapest)
    const wednesday = new Date(friday);
    wednesday.setDate(wednesday.getDate() + 12); // ~2 weeks after Friday
    if (wednesday > today) {
      candidates.push(wednesday.toISOString().split('T')[0]);
    }

    // 3. Friday 4 weeks out (more availability)
    const laterFriday = new Date(friday);
    laterFriday.setDate(laterFriday.getDate() + 28);
    if (laterFriday > today) {
      candidates.push(laterFriday.toISOString().split('T')[0]);
    }
  }

  // Sort by date - max 3 candidates for speed
  candidates.sort();
  return candidates.slice(0, 3);
}

/**
 * Optimize trip for a specific destination
 * NEW WORKFLOW: Uses Booking.com API with multi-date search
 * Returns complete trip package with flights, hotel, and budget breakdown
 */
export async function optimizeDestination({
  destination,
  destinationId = null, // Hotel destination ID (for hotel search, not flights)
  userProfile,
  budget,
  origin,
  duration = 7,
  departureDate = null,
  tripContext = null, // NEW: User's free text description for context-aware hotel selection
  isFixedDate = false, // If true, use exact dates without flexibility
  allowEstimatedHotel = false, // Real inventory is required by default for precise recommendations
}) {
  console.log(`🎯 NEW WORKFLOW: Optimizing ${destination} trip for €${budget} budget`);

  // Extract number of travelers from userProfile EARLY (needed for flights AND hotels)
  // IMPORTANT: Frontend sends travelers in basic.travelers, NOT constraints.travelers!
  const travelers = userProfile?.basic?.travelers || userProfile?.constraints?.travelers || 1;
  let numAdults = 1;
  let numChildren = 0;

  if (typeof travelers === 'number') {
    numAdults = travelers;
  } else if (typeof travelers === 'string') {
    const adultMatch = travelers.match(/(\d+)\s*adult/i);
    const childMatch = travelers.match(/(\d+)\s*child/i);
    if (adultMatch) numAdults = parseInt(adultMatch[1]);
    if (childMatch) numChildren = parseInt(childMatch[1]);
  }

  console.log(`   👥 Trip for ${numAdults} adult(s)${numChildren ? ` + ${numChildren} child(ren)` : ''} (source: basic.travelers=${userProfile?.basic?.travelers})`);

  // Extract trip context once, before hotel budget and room logic.
  const effectiveTripContext = tripContext || userProfile?.basic?.travelVibeDescription || null;
  const effectiveTripType = userProfile?.basic?.tripType || null;

  try {
    // STEP 1: Get flight destination IDs in parallel (origin + destination)
    console.log('📍 Step 1: Getting flight destination IDs in parallel...');

    // Check if this destination is known to need a nearby airport (synchronous)
    const nearestAirportInfo = findNearestAirport(destination);

    // Run origin and destination ID lookups simultaneously
    const [originDestResult, destDestResult] = await Promise.allSettled([
      bookingService.getDestinationId(origin),
      bookingService.getDestinationId(destination),
    ]);

    if (originDestResult.status === 'rejected') {
      throw new Error(`Could not resolve origin airport for: ${origin}`);
    }
    const originDest = originDestResult.value;

    // Try to find flights to the destination
    // If no flights found, check if we need to use a nearby airport
    let destDest = null;
    let groundTransport = null;
    let actualFlightDestination = destination;

    if (destDestResult.status === 'fulfilled') {
      destDest = destDestResult.value;
      console.log(`✅ Found airports: ${originDest.name} → ${destDest.name} (${destDest.id})`);
    } else {
      console.warn(`⚠️ No airport found for ${destination}: ${destDestResult.reason?.message}`);

      // If we have a known nearby airport, use it
      if (nearestAirportInfo) {
        console.log(`🚂 Using nearest airport: ${nearestAirportInfo.airport}`);
        destDest = await bookingService.getDestinationId(nearestAirportInfo.airport);
        actualFlightDestination = nearestAirportInfo.airport;
        groundTransport = {
          from: nearestAirportInfo.airport,
          to: destination,
          type: nearestAirportInfo.transport,
          duration: nearestAirportInfo.duration,
          estimatedCost: nearestAirportInfo.cost,
          distance: nearestAirportInfo.distance,
        };
        console.log(`✅ Will fly to ${nearestAirportInfo.airport}, then ${nearestAirportInfo.transport} to ${destination} (${nearestAirportInfo.duration}, ~€${nearestAirportInfo.cost})`);
      } else {
        throw new Error(`No flights available to ${destination} and no nearby airport found`);
      }
    }

    // STEP 2: Generate date candidates and search flights in parallel
    // For fixed dates, only search the exact date requested
    const dateCandidates = generateDateCandidates(departureDate, duration, isFixedDate);
    console.log(`📅 Step 2: Checking ${dateCandidates.length} date option(s) ${isFixedDate ? '(FIXED DATE)' : 'for best price'}...`);
    console.log(`   Dates: ${dateCandidates.join(', ')}`);

    // Contrainte dure « sans avion » (audit V3 E5) : l'utilisateur qui écrit
    // « surtout pas d'avion » recevait quand même un vol dans le package.
    // Ici : zéro recherche de vol, transport = route terrestre CONNUE
    // (GROUND_ALTERNATIVES, prix estimés) ou échec typé si aucune route.
    const noFly = userProfile?.constraints?.noFly === true;
    let bestFlight = null;
    let flightCost = 0;
    let selectedDepartureDate = null;
    let selectedReturnDate = null;
    let noFlyTransport = null;
    let noFlyGroundCost = 0;

    if (noFly) {
      const groundRoute = findGroundRoute(origin, destination);
      if (!groundRoute) {
        const err = new Error(`No known train/bus route from ${origin} to ${destination} (no-fly constraint)`);
        err.code = 'NO_GROUND_ROUTE';
        err.userReason = `pas d'itinéraire train/bus connu vers ${destination}`;
        throw err;
      }
      const paxCount = numAdults + numChildren;
      noFlyGroundCost = groundRoute.price * 2 * paxCount;
      noFlyTransport = {
        mode: groundRoute.transport,
        operator: groundRoute.operator,
        durationOneWay: groundRoute.duration,
        priceRoundTrip: noFlyGroundCost,
        estimated: true,
        reason: 'no_fly',
        note: `${groundRoute.transport === 'train' ? '🚄' : '🚌'} ${groundRoute.operator} ~${groundRoute.price * 2} € A/R par personne (estimé) — sans avion, comme demandé`,
      };
      selectedDepartureDate = dateCandidates[0];
      const noFlyReturn = new Date(selectedDepartureDate);
      noFlyReturn.setDate(noFlyReturn.getDate() + duration);
      selectedReturnDate = noFlyReturn.toISOString().split('T')[0];
      console.log(`🚄 No-fly trip: ${groundRoute.operator} ${groundRoute.duration}, ~€${noFlyGroundCost} A/R total (${paxCount} pax)`);
    } else {

    // Search flights for all date candidates in parallel (max 5 concurrent for speed)
    let flightSearches = [];
    const batchSize = 5; // Increased from 3 to 5 for faster response

    for (let i = 0; i < dateCandidates.length; i += batchSize) {
      const batch = dateCandidates.slice(i, i + batchSize);
      const batchPromises = batch.map(async (depDate) => {
        const returnDate = new Date(depDate);
        returnDate.setDate(returnDate.getDate() + duration);
        const returnDateStr = returnDate.toISOString().split('T')[0];

        try {
          const result = await bookingService.searchFlights({
            fromId: originDest.id,
            toId: destDest.id,
            departDate: depDate,
            returnDate: returnDateStr,
            adults: numAdults, // Use actual number of travelers
            cabinClass: 'ECONOMY',
            currency: 'EUR'
          });

          if (result.flights && result.flights.length > 0) {
            const bestFlight = result.flights[0];
            return {
              departureDate: depDate,
              returnDate: returnDateStr,
              flight: bestFlight,
              price: bestFlight.price.amount
            };
          }
          return null;
        } catch (error) {
          console.warn(`   ⚠️ Failed to search ${depDate}: ${error.message}`);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      flightSearches.push(...batchResults.filter(r => r !== null));
    }

    // If no flights found and we haven't tried the nearest airport yet, try it now
    if (flightSearches.length === 0 && !groundTransport && nearestAirportInfo) {
      console.log(`⚠️ No direct flights found. Trying nearest airport: ${nearestAirportInfo.airport}`);

      destDest = await bookingService.getDestinationId(nearestAirportInfo.airport);
      actualFlightDestination = nearestAirportInfo.airport;
      groundTransport = {
        from: nearestAirportInfo.airport,
        to: destination,
        type: nearestAirportInfo.transport,
        duration: nearestAirportInfo.duration,
        estimatedCost: nearestAirportInfo.cost,
        distance: nearestAirportInfo.distance,
      };

      // Retry flight search with nearest airport
      for (let i = 0; i < dateCandidates.length; i += batchSize) {
        const batch = dateCandidates.slice(i, i + batchSize);
        const batchPromises = batch.map(async (depDate) => {
          const returnDate = new Date(depDate);
          returnDate.setDate(returnDate.getDate() + duration);
          const returnDateStr = returnDate.toISOString().split('T')[0];

          try {
            const result = await bookingService.searchFlights({
              fromId: originDest.id,
              toId: destDest.id,
              departDate: depDate,
              returnDate: returnDateStr,
              adults: numAdults,
              cabinClass: 'ECONOMY',
              currency: 'EUR'
            });

            if (result.flights && result.flights.length > 0) {
              const bestFlight = result.flights[0];
              return {
                departureDate: depDate,
                returnDate: returnDateStr,
                flight: bestFlight,
                price: bestFlight.price.amount
              };
            }
            return null;
          } catch (error) {
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        flightSearches.push(...batchResults.filter(r => r !== null));
      }
    }

    if (flightSearches.length === 0) {
      throw new Error(`No flights found from ${origin} to ${actualFlightDestination} for any date`);
    }

    const maxFlightMinutes = getMaxFlightMinutes(userProfile);
    if (maxFlightMinutes) {
      const beforeCount = flightSearches.length;
      flightSearches = flightSearches.filter(r => flightFitsMaxDuration(r.flight, maxFlightMinutes));
      if (flightSearches.length === 0) {
        const maxHours = Math.round((maxFlightMinutes - FLIGHT_DURATION_TOLERANCE_MINUTES) / 60);
        throw new Error(`No flights found within max flight duration (${maxHours}h + ${FLIGHT_DURATION_TOLERANCE_MINUTES}min tolerance)`);
      }
      if (flightSearches.length < beforeCount) {
        const removedCount = beforeCount - flightSearches.length;
        console.log(`⏱️  Removed ${removedCount} date option(s) exceeding user's max flight duration`);
      }
    }

    // Find the best date option: price + comfort (penalize very early departures)
    // A 6am flight means waking up at 3am — treat it as €25 more expensive for ranking
    function adjustedPrice(r) {
      const depTime = r.flight?.outbound?.departureTime;
      if (!depTime) return r.price;
      const hour = new Date(depTime).getHours();
      if (hour < 5) return r.price + 40;  // Before 5am: brutal (wake up 2am)
      if (hour < 7) return r.price + 20;  // Before 7am: uncomfortable (wake up 4am)
      return r.price;
    }
    flightSearches.sort((a, b) => adjustedPrice(a) - adjustedPrice(b));
    const bestOption = flightSearches[0];

    console.log(`✅ Best price found: €${bestOption.price} on ${bestOption.departureDate}`);
    if (flightSearches.length > 1) {
      const savings = flightSearches[flightSearches.length - 1].price - bestOption.price;
      if (savings > 0) {
        console.log(`   💰 Savings vs worst date: €${savings}`);
      }
    }

    bestFlight = bestOption.flight;
    flightCost = bestOption.price;
    selectedDepartureDate = bestOption.departureDate;
    selectedReturnDate = bestOption.returnDate;

    console.log(`✅ Best flight: ${bestFlight.outbound.airline} - €${flightCost}`);

    } // fin du bloc vol (sauté en mode sans-avion)

    // STEP 3: Calculate remaining budget for hotel
    // Use tripType selector (explicit choice) + tripContext (free text) to determine hotel budget ratio
    const tripTypeFromProfile = effectiveTripType;
    const tripContextForBudget = effectiveTripContext || '';
    const tripContextLower = tripContextForBudget.toLowerCase();

    // Detect if this is a special occasion / luxury / romantic trip
    // First check explicit tripType, then fall back to keyword detection
    let isRomanticTrip = tripTypeFromProfile === 'couple';
    let isFamilyTrip = tripTypeFromProfile === 'family';
    let isBusinessTrip = tripTypeFromProfile === 'business';

    // Enhance with keyword detection from free text (can override or add to selector)
    if (['romantic', 'romantique', 'couple', 'honeymoon', 'lune de miel', 'wife', 'femme', 'husband', 'mari', 'anniversary', 'anniversaire'].some(kw => tripContextLower.includes(kw))) {
      isRomanticTrip = true;
    }
    const isLuxuryTrip = ['luxury', 'luxe', 'premium', '5 star', 'birthday', 'anniversaire', '50 ans', '40 ans', '30 ans', 'special'].some(kw => tripContextLower.includes(kw));
    // Note: 'budget' intentionally excluded — it shouldn't reduce hotel ratio for families/couples
    const isAdventureTrip = ['adventure', 'aventure', 'hiking', 'randonnée', 'backpack', 'bivouac', 'trek'].some(kw => tripContextLower.includes(kw));
    const isDigitalNomad = ['nomade digital', 'digital nomad', 'télétravail', 'remote', 'coworking', 'nomad'].some(kw => tripContextLower.includes(kw));

    // Adjust hotel budget ratio based on trip type:
    // Priority order: Romantic/Luxury > Business > Family > Adventure/Nomad > Default
    let hotelBudgetRatio = 0.70;
    if (isRomanticTrip || isLuxuryTrip) {
      hotelBudgetRatio = 0.85;
      console.log(`   💕 Romantic/Luxury trip → 85% hotel budget`);
    } else if (isBusinessTrip) {
      hotelBudgetRatio = 0.80;
      console.log(`   💼 Business trip → 80% hotel budget`);
    } else if (isFamilyTrip) {
      hotelBudgetRatio = 0.75;
      console.log(`   👨‍👩‍👧‍👦 Family trip → 75% hotel budget`);
    } else if (isDigitalNomad) {
      // Nomads want decent quality (good wifi, desk) but value for money
      hotelBudgetRatio = 0.65;
      console.log(`   💻 Digital nomad → 65% hotel budget (prefer apartments with workspace)`);
    } else if (isAdventureTrip) {
      hotelBudgetRatio = 0.50;
      console.log(`   🏔️ Adventure trip → 50% hotel budget (activities priority)`);
    }

    // Garde-fou audit V3 (chaîne T9) : le cap budget vol n'existait que sur les
    // prix teaser de la shortlist — ici le vol réel repartait sans plafond
    // (vol €752 retenu sur budget total €1000 → reliquat hôtel €30/nuit → zéro
    // hôtel partout → échec silencieux). On plafonne et on échoue de façon
    // TYPÉE pour que le stream puisse agréger en budget_warning honnête.
    const MAX_FLIGHT_BUDGET_SHARE = 0.75;
    if (flightCost > budget * MAX_FLIGHT_BUDGET_SHARE) {
      const err = new Error(`Flight €${flightCost} exceeds ${Math.round(MAX_FLIGHT_BUDGET_SHARE * 100)}% of total budget €${budget}`);
      err.code = 'BUDGET_TIGHT';
      err.userReason = `vol à ${Math.round(flightCost)} € pour ${budget} € de budget total`;
      throw err;
    }

    const remainingForAccommodation = budget - flightCost - noFlyGroundCost;
    if (remainingForAccommodation <= 0) {
      const err = new Error(`Transport cost (€${flightCost + noFlyGroundCost}) leaves no hotel budget from total budget (€${budget})`);
      err.code = 'BUDGET_TIGHT';
      err.userReason = `le transport consomme tout le budget (${Math.round(flightCost + noFlyGroundCost)} € sur ${budget} €)`;
      throw err;
    }

    const totalNights = duration;
    const maxNightlyRate = (remainingForAccommodation / totalNights) * hotelBudgetRatio;

    // Plancher de viabilité : sous ~€30/nuit il n'existe pas d'inventaire hôtel
    // réel — chercher quand même produit des « No hotels found » silencieux.
    const MIN_VIABLE_NIGHTLY_RATE = 30;
    if (maxNightlyRate < MIN_VIABLE_NIGHTLY_RATE) {
      const err = new Error(`Hotel budget €${Math.round(maxNightlyRate)}/night is below viable floor (€${MIN_VIABLE_NIGHTLY_RATE}) after €${flightCost} flight`);
      err.code = 'BUDGET_TIGHT';
      err.userReason = `après le vol (${Math.round(flightCost)} €), il reste ${Math.round(maxNightlyRate)} €/nuit pour l'hôtel`;
      throw err;
    }

    console.log(`🏨 Budget for hotel: €${Math.round(maxNightlyRate)}/night × ${totalNights} nights (${Math.round(hotelBudgetRatio * 100)}% ratio)`);

    // STEP 4: Search hotels using Booking.com API
    console.log(`🏨 Step 3: Searching hotels for ${selectedDepartureDate} to ${selectedReturnDate}...`);
    let suggestedHotel;
    let hotelSearchResults = null;

    // Extract user preferences for hotel search
    const accommodationPref = userProfile?.onboardingPreferences?.accommodationPref || null;
    const materialComfort = userProfile?.onboardingPreferences?.materialComfort || 50;

    // Use numAdults/numChildren already parsed at the beginning of the function
    // Calculate rooms based on trip type
    let rooms;
    if (effectiveTripType === 'family') {
      // Family trips: if no explicit children count, infer from total travelers
      // Assume max 2 adults, rest are children → need 1-2 family rooms
      const inferredChildren = numChildren > 0 ? numChildren : Math.max(0, numAdults - 2);
      const effectiveAdults = numChildren > 0 ? numAdults : Math.min(2, numAdults);
      const totalPeople = effectiveAdults + inferredChildren;
      rooms = totalPeople <= 4 ? 1 : totalPeople <= 7 ? 2 : 3; // Family rooms fit more people
      if (inferredChildren > 0 && numChildren === 0) {
        console.log(`   👨‍👩‍👧‍👦 Family: inferred ${inferredChildren} children from ${numAdults} travelers → searching ${rooms} family room(s)`);
      }
    } else {
      // Standard: 1 room per 2 adults
      rooms = Math.ceil(numAdults / 2);
      if (numChildren > 0 && rooms === 1) rooms = 1; // Family already in same room
    }
    // Cap at 3 rooms: Booking.com API has practical limits for large group searches
    // (4+ rooms returns very few results, only large resorts)
    if (rooms > 3) {
      console.log(`   👥 Large group (${numAdults} adults, ${rooms} rooms needed) → capping at 3 rooms for better availability`);
      rooms = 3;
    }

    console.log(`   👥 Hotel search: ${numAdults} adults${numChildren ? `, ${numChildren} children` : ''} → ${rooms} room(s)`);
    console.log(`   🏨 Preference: ${accommodationPref || 'default'}, Comfort: ${materialComfort}/100`);

    if (effectiveTripContext || effectiveTripType) {
      const contextDesc = effectiveTripContext ? `"${effectiveTripContext.substring(0, 50)}..."` : '';
      const typeDesc = effectiveTripType ? `type=${effectiveTripType}` : '';
      console.log(`   🎯 Using trip context for hotel selection: ${[typeDesc, contextDesc].filter(Boolean).join(', ')}`);
    }

    try {
      hotelSearchResults = await bookingService.searchHotels({
        destinationQuery: destination,
        arrivalDate: selectedDepartureDate,
        departureDate: selectedReturnDate,
        adults: numAdults,
        children: numChildren,
        rooms,
        currency: 'EUR',
        accommodationPref,
        materialComfort,
        maxPrice: remainingForAccommodation, // Use remaining budget as max price
        tripContext: effectiveTripContext, // Pass trip context for context-aware hotel selection
        tripType: effectiveTripType, // NEW: Pass trip type for context-aware hotel selection
      });

      if (hotelSearchResults.count === 0) {
        throw new Error('No hotels found');
      }

      // Hostel/budget accommodation logic:
      // Accept hostels if user explicitly wants budget OR materialComfort < 35 (comfort not a priority)
      const isBudgetPref = ['budget', 'hostel', 'backpacker', 'routard'].includes(accommodationPref);
      const isLowComfort = materialComfort < 35;
      const acceptsHostels = isBudgetPref || isLowComfort;

      // Minimum nightly rate to exclude dorm beds for non-budget users
      const minNightlyRate = acceptsHostels ? 0 : 15;
      let affordableHotels = hotelSearchResults.hotels.filter(h => {
        const nightlyRate = h.price.amount / totalNights;
        return nightlyRate >= minNightlyRate && nightlyRate <= maxNightlyRate;
      });

      // Graceful degradation: if the strict budget filter rejected everything
      // (every hotel in this destination is above the computed nightly rate
      // ceiling), fall back to the cheapest options available. The user gets
      // a destination with a flagged over-budget hotel rather than the dreaded
      // "no hotel available" cascade that took out Split / Lisbon / Valletta
      // on €1000 solo profiles. We still respect the hostel floor and we
      // sort by price ascending so the cheapest options surface first. The
      // package quality rule (budget_package_within_limit) will still surface
      // the overrun, but at least the destination is reachable from the UI.
      if (affordableHotels.length === 0 && hotelSearchResults.hotels.length > 0) {
        const sortedByPrice = hotelSearchResults.hotels
          .filter(h => (h.price.amount / totalNights) >= minNightlyRate)
          .sort((a, b) => a.price.amount - b.price.amount);
        if (sortedByPrice.length > 0) {
          affordableHotels = sortedByPrice.slice(0, 5);
          const cheapestNightly = Math.round(sortedByPrice[0].price.amount / totalNights);
          console.log(`   ⬆️  No hotels under €${Math.round(maxNightlyRate)}/night — falling back to cheapest available (from €${cheapestNightly}/night)`);
        }
      }

      // Filter out hostel-type properties for users who care about comfort
      if (!acceptsHostels) {
        const hostelKeywords = [
          'hostel', 'auberge de jeunesse', 'dormitory', 'dorm',
          'backpacker', 'backpackers', 'generator', 'selina',
          'wombats', 'a&o ', 'meininger', 'st christopher',
          'smartplace', 'smart place', 'clink', 'the student'
        ];
        const nonHostelHotels = affordableHotels.filter(h => {
          const nameLower = h.name?.toLowerCase() || '';
          if (h.stars === 0 && nameLower.length > 0) return false;
          return !hostelKeywords.some(kw => nameLower.includes(kw));
        });
        if (nonHostelHotels.length > 0) {
          affordableHotels = nonHostelHotels;
          console.log(`   🏨 Filtered to non-hostel options: ${nonHostelHotels.length} hotels`);
        }
      } else {
        console.log(`   🎒 Budget/low-comfort profile → hostels accepted (comfort: ${materialComfort}, pref: ${accommodationPref})`);
      }

      if (affordableHotels.length > 0) {
        // Sort by: 1) contextScore (if trip context was applied), 2) rating
        // This ensures romantic trips get romantic hotels, etc.
        affordableHotels.sort((a, b) => {
          // Primary: context score (higher = better match for trip type)
          const contextDiff = (b.contextScore || 0) - (a.contextScore || 0);
          if (contextDiff !== 0) return contextDiff;

          // Secondary: rating (higher = better)
          return (b.rating?.value || 0) - (a.rating?.value || 0);
        });

        const bestHotel = affordableHotels[0];
        console.log(`   🎯 Selected hotel based on context score: ${bestHotel.contextScore || 0}, rating: ${bestHotel.rating?.value || 'N/A'}`);
        const nightlyRate = bestHotel.price.amount / totalNights;

        suggestedHotel = {
          id: bestHotel.id,
          name: bestHotel.name,
          stars: bestHotel.stars,
          pricePerNight: Math.round(nightlyRate),
          totalNights: totalNights,
          totalPrice: bestHotel.price.amount,
          location: bestHotel.location,
          amenities: bestHotel.amenities,
          rating: bestHotel.rating,
          mainPhoto: bestHotel.mainPhoto,
          checkInTime: bestHotel.checkInTime,
          checkOutTime: bestHotel.checkOutTime,
          provider: 'booking.com',
          isEstimate: false,
          bookingUrl: bestHotel.bookingUrl,
          coordinates: bestHotel.coordinates,
          roomDetails: bestHotel.roomDetails,
          contextScore: bestHotel.contextScore || 0,
        };

        console.log(`✅ Found hotel: ${suggestedHotel.name} (${suggestedHotel.stars}★) - €${suggestedHotel.pricePerNight}/night`);
      } else {
        throw new Error('No hotels within budget');
      }
    } catch (error) {
      console.warn('⚠️  Hotel search failed:', error.message);

      if (!allowEstimatedHotel) {
        throw new Error(`No real hotel inventory available for ${destination}: ${error.message}`);
      }

      // Fallback: Create estimated hotel
      suggestedHotel = {
        id: null,
        name: `Hotel in ${destination}`,
        stars: 3,
        pricePerNight: Math.round(maxNightlyRate),
        totalNights: totalNights,
        totalPrice: Math.round(maxNightlyRate * totalNights),
        location: 'City Center',
        amenities: ['WiFi', 'Breakfast'],
        distanceToCenter: '0.5 km',
        provider: 'estimate',
        isEstimate: true,
        fallbackReason: error.message,
        rating: {
          value: 0,
          count: 0,
          word: 'Estimate',
        },
        mainPhoto: null,
        bookingUrl: null,
      };
    }

    // STEP 5: Calculate budget breakdown
    const hotelCost = suggestedHotel.totalPrice;
    const remainingBudget = budget - flightCost - hotelCost;

    // ── Ground-transport substitution ──────────────────────────────────
    // Arthur's red flag: Paris→Nice proposed as a 772€ flight when the TGV
    // is ~120€ round trip. Skusku's whole promise is cheap travel, so when
    // a destination has a known cheap train/bus route from the origin and
    // the flight is disproportionate, we recommend the ground option
    // instead of the flight. Price is an estimate (flagged) until the
    // FlixBus API is wired. We do NOT drop the destination here — the
    // runtime guard (next commit) decides drop-vs-keep with full context;
    // here we just attach the smarter transport so realisticTotal is sane.
    const groundRoute = findGroundRoute(origin, destination);
    let recommendedTransport = null;
    if (noFlyTransport) {
      // Mode sans-avion : le transport terrestre EST le transport principal.
      recommendedTransport = noFlyTransport;
    } else if (groundRoute) {
      const groundRoundTrip = groundRoute.price * 2;
      // "absurd" = flying costs more than 2× the ground round trip
      if (flightCost > groundRoundTrip * 2) {
        recommendedTransport = {
          mode: groundRoute.transport,            // 'train' | 'bus'
          operator: groundRoute.operator,
          durationOneWay: groundRoute.duration,
          priceRoundTrip: groundRoundTrip,
          estimated: true,                        // approx fare, not live API
          vsFlight: flightCost - groundRoundTrip, // €X saved vs the flight
          note: `${groundRoute.transport === 'train' ? '🚄' : '🚌'} ${groundRoute.operator} ~€${groundRoundTrip} A/R (estimé) — ${Math.round(flightCost - groundRoundTrip)}€ moins cher que l'avion`,
        };
        console.log(`🚆 Ground substitution for ${destination}: ${groundRoute.transport} €${groundRoundTrip} R/T vs €${flightCost} flight`);
      }
    }
    // Effective main-transport cost feeding realisticTotal: the ground
    // option when we substituted, otherwise the flight.
    const mainTransportCost = recommendedTransport ? recommendedTransport.priceRoundTrip : flightCost;

    // Extract city name from airport name (e.g., "Amsterdam Schiphol" → "Amsterdam")
    const extractCityName = (airportName) => {
      // Remove common airport suffixes
      return airportName
        .replace(/\s+(Airport|International|Intl|Municipal|Regional)$/i, '')
        .replace(/\s+(Charles de Gaulle|Orly|CDG|ORY)$/i, '')
        .replace(/\s+(Schiphol|Fiumicino|El Prat|Barajas)$/i, '')
        .trim();
    };

    // Estimate activity budget based on destination cost of living
    const dailyCostIndex = estimateCostOfLiving(destDest.countryName || destDest.country || 'Unknown');
    const estimatedDailyActivities = Math.round(dailyCostIndex * 1.2); // Daily activity budget
    const estimatedActivitiesBudget = estimatedDailyActivities * duration;

    // Log destination data for debugging
    console.log(`📍 Destination data: city=${destDest.cityName || destDest.name}, country=${destDest.countryName || destDest.country || 'Unknown'}`);
    if (groundTransport) {
      console.log(`🚂 Ground transport: ${groundTransport.type} from ${groundTransport.from} to ${groundTransport.to} (${groundTransport.duration}, ~€${groundTransport.estimatedCost})`);
    }

    // Extract actual destination name (remove country suffix if present)
    const actualDestinationName = destination.split(',')[0].trim();

    const result = {
      destination: {
        // If we're using a nearby airport, show the actual destination (e.g., "Lake Como"), not the airport city
        name: groundTransport ? actualDestinationName : (destDest.cityName || destDest.name),
        country: destDest.countryName || destDest.country || 'Unknown',
        code: destDest.code,
        id: destDest.id,
        iata: destDest.code,
        // If using nearby airport, include that info
        nearestAirport: groundTransport ? {
          city: groundTransport.from,
          code: destDest.code,
        } : null,
      },
      origin: {
        name: originDest.cityName || originDest.name,  // Use cityName for clean display
        code: originDest.code,
        id: originDest.id,
      },
      dates: {
        departure: selectedDepartureDate,
        return: selectedReturnDate,
        duration: duration,
        userRequestedDate: departureDate, // Original user request (if any)
        datesChecked: dateCandidates.length, // How many dates we checked
      },
      flight: bestFlight === null ? null : {
        outbound: {
          departureTime: bestFlight.outbound.departureTime,
          arrivalTime: bestFlight.outbound.arrivalTime,
          departureAirport: bestFlight.outbound.departureAirport,
          arrivalAirport: bestFlight.outbound.arrivalAirport,
          duration: bestFlight.outbound.duration,
          stops: bestFlight.outbound.stops || 0,
          airline: bestFlight.outbound.airline,
          airlineCode: bestFlight.outbound.airlineCode,
          airlineLogo: bestFlight.outbound.airlineLogo,
          segments: bestFlight.outbound.segments || [],
        },
        return: bestFlight.return ? {
          departureTime: bestFlight.return.departureTime,
          arrivalTime: bestFlight.return.arrivalTime,
          departureAirport: bestFlight.return.departureAirport,
          arrivalAirport: bestFlight.return.arrivalAirport,
          duration: bestFlight.return.duration,
          stops: bestFlight.return.stops || 0,
          airline: bestFlight.return.airline,
          airlineCode: bestFlight.return.airlineCode,
          airlineLogo: bestFlight.return.airlineLogo,
          segments: bestFlight.return.segments || [],
        } : null,
        totalCost: flightCost,
      },
      hotel: suggestedHotel,
      // Ground transport info (if flying to nearby airport)
      groundTransport: groundTransport ? {
        type: groundTransport.type, // 'train', 'bus', 'ferry', 'car'
        from: groundTransport.from, // Airport city
        to: groundTransport.to, // Final destination
        duration: groundTransport.duration, // e.g., "1h30"
        estimatedCost: groundTransport.estimatedCost, // Per person, one way
        estimatedCostRoundTrip: groundTransport.estimatedCost * 2, // Round trip
        distance: groundTransport.distance,
      } : null,
      budget: (() => {
        const groundCost = groundTransport ? groundTransport.estimatedCost * 2 : 0;
        const onGround = estimateOnGroundBudget(
          destDest.countryName || destDest.country || 'Unknown',
          userProfile,
          duration
        );
        // realisticTotal = the number the user should actually EXPECT to
        // spend end to end: main transport (ground option when we
        // substituted an absurd flight, else the flight) + hotel +
        // airport-to-city transfer + the all-in on-the-ground budget
        // (food + local transport + extras). This is purely INFORMATIONAL
        // — Arthur wants it shown, but it must NOT redefine `remaining`.
        //
        // `remaining` keeps its classic meaning (budget minus the booked
        // costs: transport + hotel + transfer) because it feeds the
        // activities allowance and the quality rules. Folding the
        // discretionary on-ground spend into `remaining` made it go
        // negative on perfectly fine trips and cascaded false failures
        // through budget_remaining_non_negative / _activities_non_negative.
        const bookedCost = mainTransportCost + hotelCost + groundCost;
        const remaining = budget - bookedCost;
        const realisticTotal = bookedCost + onGround.total;
        return {
          total: budget,
          flight: flightCost,
          hotel: hotelCost,
          groundTransport: groundCost, // airport→city transfer, round trip
          remaining,                   // budget − booked (transport+hotel+transfer)
          // Kept for backward compatibility with existing UI bindings:
          activities: Math.min(estimatedActivitiesBudget, Math.max(0, remaining)),
          dailyActivities: estimatedDailyActivities,
          // New all-in estimate, profile-aware (informational overlay):
          onGround,                 // { dailyFood, dailyLocalTransport, dailyExtras, dailyTotal, total, multiplier }
          mainTransportCost,        // ground RT when substituted, else flight
          realisticTotal,           // booked + onGround.total — what to truly expect
          realisticPerPerson: realisticTotal, // (per-person; group math applied upstream)
          overBudget: realisticTotal > budget, // flag for UI, not a hard gate
        };
      })(),
      // Smarter transport recommendation (train/bus) when flying is absurd
      // for this origin→destination. null = fly (no cheap ground route or
      // the flight is reasonable). Estimated price until FlixBus API.
      recommendedTransport,
    };

    const transportCost = groundTransport ? groundTransport.estimatedCost * 2 : 0;
    console.log(`✅ Trip optimized: €${flightCost} flight + €${hotelCost} hotel${transportCost > 0 ? ` + €${transportCost} transport` : ''} = €${flightCost + hotelCost + transportCost} (€${remainingBudget - transportCost} for activities)`);

    return result;

  } catch (error) {
    console.error(`❌ optimizeDestination failed for ${destination}:`, error.message);
    throw error;
  }
}

/**
 * Fallback destinations when searchFlightEverywhere fails
 * Returns curated list based on origin and user preferences
 */
async function fallbackDestinations(origin, budget, userProfile) {
  console.log('📋 Using fallback destination list');

  const basic = userProfile?.basic || {};
  const constraints = userProfile?.constraints || {};
  const signals = getProfileTravelSignals(userProfile);
  const tripType = basic.tripType;
  const maxFlightHours = basic.maxFlightHours || constraints.maxFlightHours || null;
  const avoidCountries = (constraints.avoidCountries || []).map(c => String(c).toLowerCase());

  // Curated destinations by region/theme. These are only candidates; the route
  // still runs optimizeDestination with real Booking flights/hotels afterwards.
  const europeanDestinations = [
    { name: 'Barcelona', country: 'Spain', region: 'Europe', themes: ['culture', 'food', 'family', 'beach'] },
    { name: 'Lisbon', country: 'Portugal', region: 'Europe', themes: ['culture', 'food', 'beach'] },
    { name: 'Rome', country: 'Italy', region: 'Europe', themes: ['culture', 'food', 'family'] },
    { name: 'Amsterdam', country: 'Netherlands', region: 'Europe', themes: ['culture', 'family'] },
    { name: 'Prague', country: 'Czech Republic', region: 'Europe', themes: ['culture'] },
  ];

  const natureDestinations = [
    { name: 'Ajaccio', country: 'France', region: 'Europe', themes: ['nature', 'family', 'beach', 'hiking'] },
    { name: 'Bastia', country: 'France', region: 'Europe', themes: ['nature', 'family', 'beach', 'hiking'] },
    { name: 'Nice', country: 'France', region: 'Europe', themes: ['nature', 'family', 'beach'] },
    { name: 'Geneva', country: 'Switzerland', region: 'Europe', themes: ['nature', 'family', 'mountain'] },
    { name: 'Zurich', country: 'Switzerland', region: 'Europe', themes: ['nature', 'family', 'mountain'] },
    { name: 'Palma de Mallorca', country: 'Spain', region: 'Europe', themes: ['nature', 'family', 'beach'] },
    { name: 'Innsbruck', country: 'Austria', region: 'Europe', themes: ['nature', 'family', 'mountain', 'hiking'] },
    { name: 'Split', country: 'Croatia', region: 'Europe', themes: ['nature', 'family', 'beach'] },
  ];

  const beachDestinations = [
    { name: 'Malaga', country: 'Spain', region: 'Europe', themes: ['beach', 'family', 'food'] },
    { name: 'Valencia', country: 'Spain', region: 'Europe', themes: ['beach', 'family', 'food'] },
    { name: 'Palma de Mallorca', country: 'Spain', region: 'Europe', themes: ['beach', 'family', 'nature'] },
    { name: 'Faro', country: 'Portugal', region: 'Europe', themes: ['beach', 'family', 'nature'] },
    { name: 'Athens', country: 'Greece', region: 'Europe', themes: ['beach', 'culture', 'family'] },
  ];

  const tropicalDestinations = [
    { name: 'Tenerife', country: 'Spain', region: 'Europe', themes: ['tropical', 'beach', 'family', 'nature', 'nightlife'] },
    { name: 'Gran Canaria', country: 'Spain', region: 'Europe', themes: ['tropical', 'beach', 'family', 'nature', 'nightlife'] },
    { name: 'Madeira', country: 'Portugal', region: 'Europe', themes: ['tropical', 'beach', 'nature', 'hiking'] },
    { name: 'Praia', country: 'Cape Verde', region: 'Africa', themes: ['tropical', 'beach', 'nightlife'] },
    { name: 'Djerba', country: 'Tunisia', region: 'Africa', themes: ['tropical', 'beach', 'family'] },
    { name: 'Hurghada', country: 'Egypt', region: 'Africa', themes: ['tropical', 'beach', 'diving', 'nightlife'] },
    { name: 'Agadir', country: 'Morocco', region: 'Africa', themes: ['tropical', 'beach', 'nightlife'] },
    { name: 'Essaouira', country: 'Morocco', region: 'Africa', themes: ['beach', 'nightlife'] },
  ];

  const globalDestinations = [
    { name: 'Marrakech', country: 'Morocco', region: 'Africa', themes: ['culture', 'food'] },
    { name: 'Istanbul', country: 'Turkey', region: 'Asia', themes: ['culture', 'food'] },
    { name: 'Dubai', country: 'UAE', region: 'Asia', themes: ['beach', 'family'] },
    { name: 'Bangkok', country: 'Thailand', region: 'Asia', themes: ['culture', 'food'] },
    { name: 'New York', country: 'USA', region: 'Americas', themes: ['culture'] },
  ];

  // For European origins, include global destinations
  const isEuropeanOrigin = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'London', 'Berlin', 'Madrid', 'Amsterdam'].some(
    city => origin.toLowerCase().includes(city.toLowerCase())
  );

  let candidateList = [
    ...(signals.wantsTropical ? tropicalDestinations : []),
    ...(signals.wantsNature ? natureDestinations : []),
    ...(signals.wantsBeach ? beachDestinations : []),
    ...europeanDestinations,
    ...(isEuropeanOrigin && (!maxFlightHours || maxFlightHours > 6) ? globalDestinations : []),
  ];

  candidateList = candidateList
    .filter((dest, index, arr) => arr.findIndex(d => d.name === dest.name) === index)
    .filter(dest => !avoidCountries.some(country => dest.country.toLowerCase().includes(country)));

  if (candidateList.length === 0) {
    candidateList = europeanDestinations.filter(dest => !avoidCountries.some(country => dest.country.toLowerCase().includes(country)));
  }

  // Score fallback destinations
  const scored = candidateList.map(dest => {
    let score = Math.random() * 20; // Random variance
    const themes = dest.themes || [];

    if (signals.wantsTropical && themes.includes('tropical')) score += 55;
    if (signals.wantsNature && themes.some(t => ['nature', 'mountain', 'hiking'].includes(t))) score += 40;
    if (signals.wantsBeach && themes.includes('beach')) score += 35;
    if (signals.wantsCulture && themes.some(t => ['culture', 'food'].includes(t))) score += 25;
    if (tripType === 'family' && themes.includes('family')) score += 20;
    if (maxFlightHours && maxFlightHours <= 4 && dest.region === 'Europe') score += 15;
    if (maxFlightHours && maxFlightHours <= 4 && dest.region !== 'Europe') score -= 40;

    const costOfLiving = estimateCostOfLiving(dest.country);
    if (budget < 1200 && costOfLiving < 60) score += 10;
    if (budget >= 1200 && budget < 3000 && costOfLiving >= 60 && costOfLiving <= 120) score += 10;

    return {
      ...dest,
      score,
      costOfLiving,
      price: { amount: 150, formatted: '€150' }, // Placeholder
    };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  return sorted.slice(0, 5);
}

/**
 * Estimate cost of living for a country (daily budget index)
 */
function estimateCostOfLiving(country) {
  const costIndex = {
    // Budget-friendly (<€60/day)
    'Thailand': 40,
    'Morocco': 45,
    'Portugal': 55,
    'Czech Republic': 50,
    'Spain': 65,

    // Medium (€60-120/day)
    'Italy': 80,
    'Netherlands': 95,
    'France': 100,
    'Germany': 90,

    // Expensive (>€120/day)
    'Switzerland': 150,
    'Norway': 140,
    'UAE': 130,
    'USA': 120,
  };

  return costIndex[country] || 80; // Default to medium
}

/**
 * Spend multiplier derived from the traveller's profile. The same country
 * costs very different amounts depending on whether you're a backpacker
 * eating street food or staying comfortable. Drives the all-in estimate so
 * "budget réaliste sur place" reflects who the user actually is.
 *
 * Sources, in priority order: explicit accommodationPref, personality,
 * then the 0-100 materialComfort slider.
 */
function spendProfileMultiplier(userProfile) {
  const ob = userProfile?.onboardingPreferences || {};
  const pref = (ob.accommodationPref || '').toLowerCase();
  const personality = (ob.personality || '').toLowerCase();
  const comfort = typeof ob.materialComfort === 'number' ? ob.materialComfort : 50;

  if (['budget', 'hostel', 'backpacker', 'routard'].includes(pref) || personality === 'routard') {
    return 0.6;  // street food, public transport, free activities
  }
  if (personality === 'luxe' || pref === 'luxury' || comfort >= 75) {
    return 1.7;  // restaurants, taxis, paid experiences
  }
  if (comfort < 35) return 0.7;
  if (comfort >= 60) return 1.25;
  return 1.0;     // "confort" / explorateur — balanced default
}

/**
 * Realistic on-the-ground daily budget per person: food + local transport +
 * extras (the "faux frais" Arthur flagged — souvenirs, tips, the museum you
 * didn't plan, the unexpected). Country cost-of-living × profile multiplier,
 * split into a breakdown the UI can show transparently.
 */
function estimateOnGroundBudget(country, userProfile, duration) {
  const base = estimateCostOfLiving(country);          // €/day baseline
  const mult = spendProfileMultiplier(userProfile);
  const daily = Math.round(base * mult);

  // Split: food ~45%, local transport ~20%, extras/faux-frais ~35%
  const dailyFood = Math.round(daily * 0.45);
  const dailyLocalTransport = Math.round(daily * 0.20);
  const dailyExtras = daily - dailyFood - dailyLocalTransport;
  const days = Math.max(1, duration || 7);

  return {
    multiplier: mult,
    dailyFood,
    dailyLocalTransport,
    dailyExtras,
    dailyTotal: daily,
    total: daily * days,
  };
}

// Module-scoped so both getTrainAlternatives (budget-warning path) and
// findGroundRoute (transport substitution) share one source of truth.
// Prices are per-person ONE WAY estimates of typical fares. When we wire
// the FlixBus API (later, per Arthur), these become the fallback for routes
// the API doesn't cover. Until then they are flagged `estimated: true`
// everywhere they surface so the UI can show "~120€ estimé".
const GROUND_ALTERNATIVES = {
  'Paris': [
    { name: 'Brussels', country: 'Belgium', transport: 'train', duration: '1h22', price: 29, operator: 'Thalys', hasBeach: false },
    { name: 'London', country: 'UK', transport: 'train', duration: '2h15', price: 50, operator: 'Eurostar', hasBeach: false },
    { name: 'Amsterdam', country: 'Netherlands', transport: 'train', duration: '3h15', price: 35, operator: 'Thalys', hasBeach: false },
    { name: 'Lyon', country: 'France', transport: 'train', duration: '2h00', price: 30, operator: 'TGV', hasBeach: false },
    { name: 'Marseille', country: 'France', transport: 'train', duration: '3h20', price: 45, operator: 'TGV', hasBeach: true },
    { name: 'Nice', country: 'France', transport: 'train', duration: '5h45', price: 60, operator: 'TGV', hasBeach: true },
    { name: 'Barcelona', country: 'Spain', transport: 'train', duration: '6h30', price: 39, operator: 'AVE', hasBeach: true },
    { name: 'Milan', country: 'Italy', transport: 'train', duration: '7h00', price: 29, operator: 'TGV', hasBeach: false },
    { name: 'Bordeaux', country: 'France', transport: 'train', duration: '2h05', price: 35, operator: 'TGV', hasBeach: true },
    { name: 'Brussels', country: 'Belgium', transport: 'bus', duration: '4h00', price: 9, operator: 'FlixBus', hasBeach: false },
    { name: 'Amsterdam', country: 'Netherlands', transport: 'bus', duration: '6h30', price: 15, operator: 'FlixBus', hasBeach: false },
    { name: 'Lyon', country: 'France', transport: 'bus', duration: '5h30', price: 12, operator: 'FlixBus', hasBeach: false },
    { name: 'Barcelona', country: 'Spain', transport: 'bus', duration: '14h00', price: 35, operator: 'FlixBus', hasBeach: true },
  ],
  'Lyon': [
    { name: 'Paris', country: 'France', transport: 'train', duration: '2h00', price: 30, operator: 'TGV', hasBeach: false },
    { name: 'Marseille', country: 'France', transport: 'train', duration: '1h40', price: 25, operator: 'TGV', hasBeach: true },
    { name: 'Nice', country: 'France', transport: 'train', duration: '4h30', price: 45, operator: 'TGV', hasBeach: true },
    { name: 'Geneva', country: 'Switzerland', transport: 'train', duration: '2h00', price: 28, operator: 'TGV Lyria', hasBeach: false },
    { name: 'Turin', country: 'Italy', transport: 'train', duration: '4h00', price: 35, operator: 'TGV', hasBeach: false },
    { name: 'Barcelona', country: 'Spain', transport: 'train', duration: '5h00', price: 39, operator: 'AVE', hasBeach: true },
  ],
  'Marseille': [
    { name: 'Nice', country: 'France', transport: 'train', duration: '2h30', price: 25, operator: 'TER', hasBeach: true },
    { name: 'Lyon', country: 'France', transport: 'train', duration: '1h40', price: 25, operator: 'TGV', hasBeach: false },
    { name: 'Paris', country: 'France', transport: 'train', duration: '3h20', price: 45, operator: 'TGV', hasBeach: false },
    { name: 'Barcelona', country: 'Spain', transport: 'bus', duration: '7h00', price: 25, operator: 'FlixBus', hasBeach: true },
  ],
};

/**
 * Candidats pour une recherche « sans avion » (audit V3 E5) : les destinations
 * de la table terrestre, dédupliquées. Zéro LLM, zéro invention — on ne
 * propose que des routes train/bus dont on connaît opérateur et prix estimé.
 */
export function getGroundReachableDestinations(origin) {
  const key = resolveGroundOrigin(origin);
  if (!key) return [];
  const seen = new Set();
  const out = [];
  for (const alt of GROUND_ALTERNATIVES[key] || []) {
    if (seen.has(alt.name)) continue;
    seen.add(alt.name);
    out.push({ name: alt.name, country: alt.country, groundOnly: true, hasBeach: alt.hasBeach });
  }
  return out;
}

function resolveGroundOrigin(origin) {
  if (!origin) return 'Paris';
  const o = origin.toLowerCase();
  if (o.includes('paris') || o === 'par' || o === 'cdg' || o === 'ory' || o === 'bva') return 'Paris';
  if (o.includes('lyon') || o === 'lys') return 'Lyon';
  if (o.includes('marseille') || o === 'mrs') return 'Marseille';
  return null; // no known ground network for this origin → flight only
}

/**
 * Is there a known cheap train/bus route from `origin` to `destinationName`?
 * Returns the cheapest matching option (one-way price) or null. Used to
 * substitute an absurd flight (Paris→Nice 772€) with the obvious ground
 * option (TGV ~60€/way). City-name match, accent/diacritic tolerant.
 */
function findGroundRoute(origin, destinationName) {
  const key = resolveGroundOrigin(origin);
  if (!key) return null;
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(',')[0].trim();
  const target = norm(destinationName);
  if (!target) return null;
  const matches = (GROUND_ALTERNATIVES[key] || [])
    .filter(a => norm(a.name) === target || target.includes(norm(a.name)) || norm(a.name).includes(target));
  if (matches.length === 0) return null;
  // cheapest option wins (usually bus over train)
  return matches.sort((a, b) => a.price - b.price)[0];
}

/**
 * Get train/bus alternatives for budget travelers
 * Returns alternative transport options from major cities
 * Prices are estimates based on typical fares
 */
function getTrainAlternatives(origin, budget) {
  const normalizedOrigin = resolveGroundOrigin(origin) || 'Paris';
  const alternatives = GROUND_ALTERNATIVES[normalizedOrigin] || GROUND_ALTERNATIVES['Paris'];

  // Filter by budget (transport should be max 30% of total budget for alternatives)
  const maxTransportBudget = budget * 0.3;

  const affordable = alternatives
    .filter(a => a.price <= maxTransportBudget)
    .map(a => ({
      ...a,
      totalTransportCost: a.price * 2, // Round trip
      isAlternative: true,
      transportType: a.transport,
      message: `${a.transport === 'train' ? '🚂' : '🚌'} ${a.operator}: ${a.duration}, €${a.price * 2} round trip`
    }));

  // Sort by price
  affordable.sort((a, b) => a.price - b.price);

  return affordable.slice(0, 5);
}

/**
 * Determine region from country
 */
function getRegion(country) {
  const regions = {
    'Europe': ['Spain', 'Portugal', 'Italy', 'France', 'Germany', 'Netherlands', 'Czech Republic', 'Switzerland', 'Norway', 'Iceland'],
    'Asia': ['Thailand', 'UAE', 'Turkey', 'Japan', 'China', 'Vietnam', 'Indonesia'],
    'Africa': ['Morocco', 'Egypt', 'South Africa', 'Kenya'],
    'Americas': ['USA', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Costa Rica'],
    'Oceania': ['Australia', 'New Zealand'],
  };

  for (const [region, countries] of Object.entries(regions)) {
    if (countries.includes(country)) return region;
  }

  return 'Europe'; // Default
}

export default {
  discoverDestinations,
  optimizeDestination,
};
