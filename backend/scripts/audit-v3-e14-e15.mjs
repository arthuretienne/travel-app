// Audit V3 — E14 (signaux reject → relance) + E15 (origine Lyon/Bruxelles, Sofia/Tallinn).
const API = 'http://localhost:3001';
const USER = 'cmq8ez4ow0000vqflh63c3xx6';
const AUTH = { Authorization: `Bearer dev:${USER}`, 'Content-Type': 'application/json' };

const identique = {
  basic: { budget: 1500, style: 'culture', tripType: 'solo', activities: ['museums', 'gastronomy', 'history'], destinationPreference: 'any', travelers: 1, travelVibeDescription: 'Un city-break culturel avec de la bonne cuisine locale, ambiance détendue' },
  preferences: { climate: 'tempere', accommodation: 'hotel', pace: 'moderate', gastronomy: 'important', natureVsCity: 50, nightlife: 'optional', activitiesBudget: 20 },
  constraints: { budget: 1500, avoidCountries: [] },
  availability: { duration: 7, timeHorizon: '6-mois', idealDuration: '7-jours', flexibleDates: true, preferredMonths: [], originCity: 'PAR', professionalStatus: 'salaried', departureFlexibility: 'peu-importe' },
  chatbotPreferences: { tone: 'friendly' },
};

async function stream(payload) {
  const t0 = Date.now();
  const out = { destinations: [], warnings: [], errors: [], totalSec: 0 };
  const res = await fetch(`${API}/api/travel/recommendations/stream`, { method: 'POST', headers: AUTH, body: JSON.stringify(payload) });
  if (!res.ok) { out.errors.push(`HTTP ${res.status} ${(await res.text()).slice(0, 150)}`); return out; }
  const reader = res.body.getReader(); const dec = new TextDecoder();
  let buf = '', ev = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop();
    for (const line of lines) {
      if (line.startsWith('event:')) ev = line.slice(6).trim();
      if (line.startsWith('data:')) {
        let d; try { d = JSON.parse(line.slice(5)); } catch { continue; }
        if (ev === 'recommendation') out.destinations.push({ city: d.data?.destination?.city, total: d.data?.pricing?.total });
        if (ev === 'warning' || ev === 'no_destinations' || ev === 'budget_warning') out.warnings.push(ev + ':' + JSON.stringify(d).slice(0, 150));
        if (ev === 'error') out.errors.push(JSON.stringify(d).slice(0, 150));
      }
    }
  }
  out.totalSec = Math.round((Date.now() - t0) / 1000);
  return out;
}

async function plain(payload) {
  const t0 = Date.now();
  const res = await fetch(`${API}/api/travel/recommendations`, { method: 'POST', headers: AUTH, body: JSON.stringify(payload) });
  const sec = Math.round((Date.now() - t0) / 1000);
  let body; try { body = await res.json(); } catch { body = { raw: 'unparseable' }; }
  const recos = (body.recommendations || body.data?.recommendations || []).map(r => ({ city: r.destination?.city, total: r.pricing?.total, error: r.error }));
  return { status: res.status, sec, recos, message: body.message || body.error || null, keys: Object.keys(body) };
}

const out = {};

// E14 — reject Ljubljana + Palermo, then re-run the identical search
for (const city of ['Ljubljana', 'Palermo']) {
  const r = await fetch(`${API}/api/travel/signal`, { method: 'POST', headers: AUTH, body: JSON.stringify({ destinationCity: city, signalType: 'reject' }) });
  out['signal_' + city] = r.status;
}
out.E14_after_rejects = await stream(identique);

// E15a — Lyon → Sofia (destination imposée, endpoint non-stream)
out.E15a_lyon_sofia = await plain({
  ...identique,
  basic: { ...identique.basic, destination: 'Sofia', destinationCountry: 'Bulgaria' },
  availability: { ...identique.availability, originCity: 'LYS' },
});

// E15b — Bruxelles → Tallinn
out.E15b_bru_tallinn = await plain({
  ...identique,
  basic: { ...identique.basic, destination: 'Tallinn', destinationCountry: 'Estonia' },
  availability: { ...identique.availability, originCity: 'BRU' },
});

console.log(JSON.stringify(out, null, 1));
