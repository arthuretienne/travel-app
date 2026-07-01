// Runtime relevance guard — deterministic, synchronous, ~0ms, zero cost.
//
// This is the live counterpart of backend/tests/reco-quality-rules.js.
// Arthur's ask: "before display, a guard that checks results are relevant"
// — but explicitly NOT an LLM agent (latency + cost + the model already
// was the thing that proposed). So: a pure-function gate applied to each
// recommendation right before it streams to the user.
//
// Philosophy: catch the embarrassing/absurd, never blank the page. We drop
// a result only when it's individually broken; the stream route already
// falls back to a curated list + emits a no_destinations event if
// everything is dropped, so dropping is safe.

// A result whose flight alone exceeds this multiple of the user's total
// budget, with no cheaper ground option attached, is not a real proposal.
const FLIGHT_OVER_BUDGET_HARD_MULTIPLE = 1.0;   // flight > 100% of budget
const REALISTIC_OVER_BUDGET_HARD_MULTIPLE = 1.6; // all-in > 160% of budget
const FLIGHT_PRICE_FLOOR_EUR = 15;               // per the group/adult-aware harness
const FLIGHT_PRICE_CEILING_EUR = 6000;           // anything above is a parse artefact

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {object} result  the assembled recommendation about to be streamed
 * @param {object} ctx     { budget: total trip budget for the group }
 * @returns {{ keep: boolean, reason?: string }}
 */
export function guardRecommendation(result, ctx = {}) {
  const budget = num(ctx.budget) || 0;

  const city = (result?.destination?.city || '').trim();
  const country = (result?.destination?.country || '').trim();

  // 1. Missing core identity → broken card, never show it.
  if (!city) return { keep: false, reason: 'missing city' };
  if (!country || /^(null|undefined|unknown)$/i.test(country)) {
    return { keep: false, reason: `missing/invalid country ("${country}")` };
  }

  // 2. city === country corruption ("Maldives, Maldives"). City-states are
  //    legitimate exceptions.
  const cityStates = new Set(['singapore', 'monaco', 'san marino', 'vatican city', 'andorra la vella', 'luxembourg city']);
  if (city.toLowerCase() === country.toLowerCase() && !cityStates.has(city.toLowerCase())) {
    return { keep: false, reason: `city === country ("${city}")` };
  }

  // Voyage sans avion (contrainte no-fly, audit E5) : flightDetails est null
  // par design et le transport principal est un train/bus estimé. Les règles
  // de sanité du prix de vol ne s'appliquent pas.
  const isGroundTrip = result?.flightDetails === null &&
    result?.recommendedTransport?.reason === 'no_fly';

  // 3. Flight price sanity.
  const flight = num(result?.pricing?.flight) ?? num(result?.flightDetails?.totalPrice);
  if (!isGroundTrip) {
    if (flight === null || flight <= 0) {
      return { keep: false, reason: `flight price missing/invalid (${flight})` };
    }
    if (flight < FLIGHT_PRICE_FLOOR_EUR || flight > FLIGHT_PRICE_CEILING_EUR) {
      return { keep: false, reason: `flight price implausible (€${flight})` };
    }
  }

  // 4. Economic absurdity. If the flight alone blows the whole budget and
  //    there is NO ground substitution attached, this is the Paris→Nice
  //    772€ class of result — drop it. (When recommendedTransport is set,
  //    the route is sane: a train was substituted, keep it.)
  const hasGroundSubstitute = !!result?.recommendedTransport;
  if (budget > 0 && !hasGroundSubstitute) {
    if (flight > budget * FLIGHT_OVER_BUDGET_HARD_MULTIPLE) {
      return { keep: false, reason: `flight €${flight} > 100% of €${budget} budget, no ground option` };
    }
    const realistic = num(result?.pricing?.realisticTotal);
    if (realistic !== null && realistic > budget * REALISTIC_OVER_BUDGET_HARD_MULTIPLE) {
      return { keep: false, reason: `all-in €${Math.round(realistic)} > 160% of €${budget} budget` };
    }
  }

  return { keep: true };
}
