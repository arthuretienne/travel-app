// backend/src/services/dynamicDateService.js
// Real-time travel arbitrage engine: Booking.com prices + exchange rates + weather + Claude
import { getDestinationId, getMinPrice } from './bookingService.js';
import { getWeatherForecast } from './weatherService.js';
import { generateSmartTravelDates } from './claudeService.js';

// ─── Destination pools by activity ────────────────────────────────────────────
const DESTINATIONS_BY_ACTIVITY = {
  plage:    ['Malaga', 'Tenerife', 'Palma', 'Athens', 'Lisbon', 'Agadir', 'Phuket'],
  culture:  ['Rome', 'Lisbon', 'Prague', 'Vienna', 'Amsterdam', 'Seville', 'Krakow'],
  nature:   ['Reykjavik', 'Bergen', 'Innsbruck', 'Azores', 'Madeira'],
  montagne: ['Innsbruck', 'Geneva', 'Salzburg', 'Bern', 'Ljubljana'],
  gastro:   ['San Sebastian', 'Naples', 'Copenhagen', 'Lisbon', 'Lyon'],
  sport:    ['Tenerife', 'Malaga', 'Innsbruck', 'Palma', 'Lisbon'],
  shopping: ['London', 'Milan', 'Amsterdam', 'Barcelona', 'Dublin'],
  histoire: ['Rome', 'Athens', 'Istanbul', 'Marrakech', 'Krakow', 'Lisbon'],
  default:  ['Lisbon', 'Barcelona', 'Rome', 'Amsterdam', 'Prague', 'Porto'],
};

// Currency arbitrage thresholds (EUR base)
const CURRENCY_SIGNALS = [
  { currency: 'JPY', threshold: 150, direction: 'above', flag: '🇯🇵', message: 'Le yen est à un niveau historiquement bas — Japon très abordable pour les Européens' },
  { currency: 'TRY', threshold: 35,  direction: 'above', flag: '🇹🇷', message: 'La lire turque est faible — Istanbul exceptionnel rapport qualité/prix' },
  { currency: 'THB', threshold: 38,  direction: 'above', flag: '🇹🇭', message: 'Le baht faible — Thaïlande/Bali très accessibles' },
  { currency: 'USD', threshold: 1.15, direction: 'below', flag: '🇺🇸', message: 'Dollar proche de parité — USA attractif pour les Européens' },
  { currency: 'GBP', threshold: 0.84, direction: 'above', flag: '🇬🇧', message: 'Livre sterling haute — UK plus cher, privilégiez d\'autres destinations' },
  { currency: 'MXN', threshold: 20,  direction: 'above', flag: '🇲🇽', message: 'Peso mexicain faible — Mexique très abordable' },
];

// ─── Helper: generate next N weekends ─────────────────────────────────────────
function getNextWeekends(n) {
  const weekends = [];
  const today = new Date();
  let d = new Date(today);

  // Advance to next Friday
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);

  for (let i = 0; i < n; i++) {
    const friday = new Date(d);
    const monday = new Date(d);
    monday.setDate(monday.getDate() + 3);
    weekends.push({
      depart: friday.toISOString().split('T')[0],
      return: monday.toISOString().split('T')[0],
      label: friday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }),
    });
    d.setDate(d.getDate() + 7);
  }
  return weekends;
}

// ─── Helper: get 15th of each of next N months ────────────────────────────────
function getMonthlyDates(n) {
  const dates = [];
  const today = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 15);
    dates.push({
      date: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    });
  }
  return dates;
}

// ─── Helper: select destinations based on user activities ─────────────────────
function selectDestinations(userPreferences, maxCount = 6) {
  const activities = userPreferences.topActivities || [];
  const seen = new Set();
  const selected = [];

  // Add destinations for each activity
  for (const activity of activities) {
    const pool = DESTINATIONS_BY_ACTIVITY[activity] || [];
    for (const dest of pool) {
      if (!seen.has(dest) && selected.length < maxCount) {
        seen.add(dest);
        selected.push(dest);
      }
    }
  }

  // Fill with defaults if not enough
  if (selected.length < 4) {
    for (const dest of DESTINATIONS_BY_ACTIVITY.default) {
      if (!seen.has(dest) && selected.length < maxCount) {
        seen.add(dest);
        selected.push(dest);
      }
    }
  }

  return selected.slice(0, maxCount);
}

// ─── Helper: fetch exchange rates ─────────────────────────────────────────────
async function fetchExchangeRates() {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates || null;
  } catch {
    console.warn('⚠️  Exchange rate API unavailable');
    return null;
  }
}

// ─── Helper: detect currency arbitrage opportunities ──────────────────────────
function detectCurrencyOpportunities(rates) {
  if (!rates) return [];
  return CURRENCY_SIGNALS.filter(signal => {
    const rate = rates[signal.currency];
    if (!rate) return false;
    return signal.direction === 'above' ? rate > signal.threshold : rate < signal.threshold;
  }).map(signal => ({
    currency: signal.currency,
    flag: signal.flag,
    message: signal.message,
    rate: rates[signal.currency],
  }));
}

// ─── Helper: extract fulfilled results with valid prices ──────────────────────
function extractValid(allSettledResults) {
  return allSettledResults
    .filter(r => r.status === 'fulfilled' && r.value?.price != null && r.value.price > 0)
    .map(r => r.value)
    .sort((a, b) => a.price - b.price);
}

// ─── Main export ───────────────────────────────────────────────────────────────
export async function generateDynamicRecommendations(userPreferences) {
  const origin = userPreferences.preferredAirports?.[0] || 'CDG';
  const destinations = selectDestinations(userPreferences);

  console.log(`🔍 Dynamic dates: origin=${origin}, destinations=${destinations.join(', ')}`);

  // Run exchange rates + destination ID lookups in parallel
  const [rates, originDestResult, ...destResults] = await Promise.allSettled([
    fetchExchangeRates(),
    getDestinationId(origin),
    ...destinations.map(d => getDestinationId(d)),
  ]);

  if (originDestResult.status === 'rejected') {
    console.warn('⚠️  Could not resolve origin airport, falling back to static');
    return null; // triggers fallback in dates.js
  }

  const originId = originDestResult.value;
  const resolvedDests = destResults
    .map((r, i) => r.status === 'fulfilled' ? { name: destinations[i], id: r.value } : null)
    .filter(Boolean);

  if (resolvedDests.length === 0) {
    console.warn('⚠️  No destinations resolved, falling back to static');
    return null;
  }

  const weekends = getNextWeekends(4);
  const monthDates = getMonthlyDates(6);

  // Fetch flight prices: short term (weekends) + long term (monthly) in parallel
  const [shortPriceResults, longPriceResults] = await Promise.all([
    Promise.allSettled(
      resolvedDests.flatMap(dest =>
        weekends.map(w =>
          getMinPrice(originId.id, dest.id.id, w.depart, w.return)
            .then(price => ({ destination: dest.name, depart: w.depart, return: w.return, label: w.label, price }))
            .catch(() => null)
        )
      )
    ),
    Promise.allSettled(
      resolvedDests.flatMap(dest =>
        monthDates.map(m =>
          getMinPrice(originId.id, dest.id.id, m.date, null)
            .then(price => ({ destination: dest.name, date: m.date, label: m.label, price }))
            .catch(() => null)
        )
      )
    ),
  ]);

  const validShort = extractValid(shortPriceResults);
  const validLong = extractValid(longPriceResults);

  console.log(`✈️  Prices found: ${validShort.length} short-term, ${validLong.length} long-term`);

  // Weather for top 3 cheapest short-term destinations
  const topShortDests = [...new Set(validShort.slice(0, 3).map(p => p.destination))];
  const weatherData = {};
  await Promise.allSettled(
    topShortDests.map(async dest => {
      const weather = await getWeatherForecast(dest, '');
      if (weather) weatherData[dest] = weather;
    })
  );

  const exchangeRates = rates.status === 'fulfilled' ? rates.value : null;
  const currencyOpportunities = detectCurrencyOpportunities(exchangeRates);

  if (currencyOpportunities.length > 0) {
    console.log(`💱 Currency opportunities: ${currencyOpportunities.map(c => c.currency).join(', ')}`);
  }

  // Claude strategist: analyze all data and generate justified recommendations
  try {
    const result = await generateSmartTravelDates({
      userPreferences,
      origin,
      shortTermPrices: validShort.slice(0, 12), // top 12 cheapest short options
      longTermPrices: validLong.slice(0, 12),   // top 12 cheapest long options
      weatherData,
      currencyOpportunities,
      exchangeRates: exchangeRates ? {
        JPY: exchangeRates.JPY,
        USD: exchangeRates.USD,
        GBP: exchangeRates.GBP,
        TRY: exchangeRates.TRY,
        THB: exchangeRates.THB,
        MAD: exchangeRates.MAD,
      } : null,
    });
    return result;
  } catch (err) {
    console.error('❌ Claude strategist failed:', err.message);
    return null; // triggers fallback
  }
}
