// Audit V3 — Phase 3 edge-case harness. Drives the real /api/travel endpoints
// as the audit user and records destinations/prices/errors/timings per case.
// DEV-ONLY: uses the Bearer dev:<id> impersonation (backend in DEV_MODE).
const API = 'http://localhost:3001';
const USER = 'cmq8ez4ow0000vqflh63c3xx6'; // Camille (WANDERER)
const AUTH = { Authorization: `Bearer dev:${USER}`, 'Content-Type': 'application/json' };

const base = (over = {}, basicOver = {}, availOver = {}) => ({
  basic: {
    budget: 1500, style: 'culture', tripType: 'solo',
    activities: ['cultural'], destinationPreference: 'any', travelers: 1,
    ...basicOver,
  },
  preferences: { climate: 'tempere', accommodation: 'hotel', pace: 'moderate', gastronomy: 'important', natureVsCity: 50, nightlife: 'optional', activitiesBudget: 20 },
  constraints: { budget: basicOver.budget ?? 1500, avoidCountries: [], ...(over.constraints || {}) },
  availability: { duration: 7, timeHorizon: '6-mois', idealDuration: '7-jours', flexibleDates: true, preferredMonths: [], originCity: 'PAR', professionalStatus: 'salaried', departureFlexibility: 'peu-importe', ...availOver },
  chatbotPreferences: { tone: 'friendly' },
  ...over,
});

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const tomorrowPlus5 = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);

const CASES = [
  ['E1-solo-150-total-5j', base({}, { budget: 150, travelVibeDescription: 'budget 150 euros TOTAL tout compris, pas plus' }, { duration: 5, idealDuration: '5-jours' })],
  ['E2-couple-30000-4j', base({}, { budget: 15000, style: 'luxe', tripType: 'couple', travelers: 2, travelVibeDescription: 'Budget total 30 000 euros pour nous deux, on veut du luxe exceptionnel' }, { duration: 4, idealDuration: '4-jours' })],
  ['E3-famille-5pax', base({}, { budget: 700, tripType: 'family', travelers: 5, travelVibeDescription: 'Nous partons avec nos 3 enfants de 4, 7 et 10 ans, il nous faut des chambres familiales et des activités pour enfants' }, {})],
  ['E4-groupe-8-serre', base({}, { budget: 350, tripType: 'friends', travelers: 8, travelVibeDescription: 'on est 8 potes, budget très serré, ambiance fun' }, { duration: 4, idealDuration: '4-jours' })],
  ['E5-pas-avion', base({}, { travelVibeDescription: "Je ne veux SURTOUT pas prendre l'avion, uniquement train ou bus", budget: 800 }, { duration: 4, idealDuration: '4-jours' })],
  ['E6-contradictoire', base({}, { travelVibeDescription: 'Je veux une plage déserte tranquille mais aussi une grande ville super animée avec plein de monde' }, {})],
  ['E7-anglais', base({}, { travelVibeDescription: 'I want somewhere sunny with great seafood and amazing hiking trails', activities: ['hiking'] }, {})],
  ['E8-cold-start', { basic: { budget: 1500, travelers: 1, activities: ['cultural', 'nature'], destinationPreference: 'any', tripType: 'solo' }, preferences: {}, constraints: { budget: 1500 }, availability: { duration: 7, flexibleDates: true, originCity: 'PAR' }, chatbotPreferences: {} }],
  ['E9-depart-demain', base({}, { travelVibeDescription: 'départ demain impératif' }, { startDate: tomorrow, endDate: tomorrowPlus5, duration: 5, idealDuration: '5-jours', flexibleDates: false, departureFlexibility: 'fixed' })],
  ['E10a-duree-1j', base({}, {}, { duration: 1, idealDuration: '1-jours' })],
  ['E10b-duree-30j', base({}, { budget: 3000 }, { duration: 30, idealDuration: '30-jours' })],
  ['E11-fauteuil-roulant', base({}, { travelVibeDescription: 'Je suis en fauteuil roulant, accessibilité PMR indispensable pour hôtel et activités' }, {})],
  ['E12-vegetarien-gastro', base({}, { travelVibeDescription: 'Je suis végétarienne stricte et la gastronomie est ma priorité absolue', activities: ['gastronomy'] }, {})],
  ['E13a-identique-1', base({}, { travelVibeDescription: 'Un city-break culturel avec de la bonne cuisine locale, ambiance détendue', activities: ['museums', 'gastronomy', 'history'] }, {})],
  ['E13b-identique-2', base({}, { travelVibeDescription: 'Un city-break culturel avec de la bonne cuisine locale, ambiance détendue', activities: ['museums', 'gastronomy', 'history'] }, {})],
  ['E13c-identique-3', base({}, { travelVibeDescription: 'Un city-break culturel avec de la bonne cuisine locale, ambiance détendue', activities: ['museums', 'gastronomy', 'history'] }, {})],
];

async function runStream(name, payload) {
  const t0 = Date.now();
  const out = { name, events: [], destinations: [], errors: [], warnings: [], firstDestSec: null, totalSec: null };
  try {
    const res = await fetch(`${API}/api/travel/recommendations/stream`, { method: 'POST', headers: AUTH, body: JSON.stringify(payload) });
    if (!res.ok) { out.errors.push(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`); return out; }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', ev = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (line.startsWith('event:')) ev = line.slice(6).trim();
        if (line.startsWith('data:')) {
          let d;
          try { d = JSON.parse(line.slice(5)); } catch { continue; }
          const s = Math.round((Date.now() - t0) / 1000);
          if (ev === 'status') out.events.push(`${s}s status:${d.stage || ''} ${d.message || ''}`);
          if (ev === 'budget_warning') out.warnings.push(`${s}s budget_warning: ${JSON.stringify(d).slice(0, 250)}`);
          if (ev === 'no_destinations') out.warnings.push(`${s}s no_destinations: ${JSON.stringify(d).slice(0, 250)}`);
          if (ev === 'warning') out.warnings.push(`${s}s warning: ${JSON.stringify(d).slice(0, 200)}`);
          if (ev === 'recommendation') {
            if (!out.firstDestSec) out.firstDestSec = s;
            const r = d.data || {};
            const city = r.destination?.city || '?';
            const total = r.pricing?.total ?? '?';
            const flight = r.pricing?.flight ?? '?';
            const hotel = r.pricing?.hotel ?? '?';
            const dates = r.slot ? `${r.slot.startDate}→${r.slot.endDate}` : '';
            const hotelName = r.hotelOptions?.hotels?.[0]?.name || '';
            const why = (r.insights?.whyThisDestination || r.insights?.description || r.description || '').slice(0, 180);
            out.destinations.push({ city, total, flight, hotel, dates, hotelName, why });
          }
          if (ev === 'error') out.errors.push(`${s}s ${JSON.stringify(d).slice(0, 250)}`);
          if (ev === 'complete') out.events.push(`${s}s complete ${JSON.stringify(d).slice(0, 120)}`);
        }
      }
    }
  } catch (e) { out.errors.push(String(e).slice(0, 200)); }
  out.totalSec = Math.round((Date.now() - t0) / 1000);
  return out;
}

const results = [];
for (const [name, payload] of CASES) {
  process.stderr.write(`\n▶ ${name}...\n`);
  const r = await runStream(name, payload);
  results.push(r);
  process.stderr.write(`  → ${r.destinations.length} dest in ${r.totalSec}s: ${r.destinations.map(d => `${d.city} €${d.total}`).join(', ')} ${r.errors.length ? 'ERRORS:' + r.errors.join(' | ') : ''}\n`);
  await new Promise(r2 => setTimeout(r2, 3000));
}
console.log(JSON.stringify(results, null, 1));
