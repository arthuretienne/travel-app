// POC: Skusku → Anthropic Managed Agents + MCP (Booking, Kiwi, TripAdvisor)
//
// Two modes
// ---------
//   - Setup mode  : creates Vault + Credentials + Environment + Agent the
//                   first time you run it, prints their IDs so you can paste
//                   them back into .env for reuse. Useful if you don't
//                   already have an agent configured via the Console UI.
//
//   - Benchmark mode (default when SKUSKU_AGENT_ID + SKUSKU_ENV_ID are set):
//                   reuses your existing agent/env, runs N sessions back to
//                   back with the same prompt, and prints aggregate stats:
//                   per-run latency, tokens, tool calls + averages and
//                   variance. This is the run you want before deciding
//                   whether to migrate production traffic.
//
// Vault is optional: if your MCP servers encode auth in the URL itself
// (Booking partner-id-in-path, TripAdvisor token-in-path) you don't need
// stored credentials, and you can run the benchmark without a vault.
//
// Reference docs: https://platform.claude.com/docs/en/managed-agents/
//   - quickstart, vaults, events-and-streaming
//
// To run
// ------
//   Add to backend/.env:
//     ANTHROPIC_API_KEY=…
//     SKUSKU_AGENT_ID=agent_…       (from the Console agent you created)
//     SKUSKU_ENV_ID=env_…           (from the Console environment)
//     # optional, only if your MCPs need stored bearer tokens:
//     SKUSKU_VAULT_ID=vault_…
//     # optional, defaults to 1:
//     POC_RUNS=5
//
//   Then: npm run poc:managed-agent

import '../env.js';

const API = 'https://api.anthropic.com/v1';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BETA = 'managed-agents-2026-04-01';
const MODEL = process.env.POC_AGENT_MODEL || 'claude-haiku-4-5-20251001';
const RUNS = Math.max(1, parseInt(process.env.POC_RUNS || '1', 10));

const USER_PROMPT = `Je suis un voyageur Skusku, voici ma demande :

Profil : solo, 1 voyageur
Départ : Paris (CDG ou ORY)
Période : flexible entre le 15 juin et le 31 juillet 2026
Durée : 7 jours
Budget : 1000€ par personne, vol + hôtel + activités inclus
Style : plage et bord de mer + gastronomie locale, j'évite les destinations
saturées de touristes
Hébergement : hôtel 3 étoiles minimum, pas d'auberge ni de hostel

Renvoie UNIQUEMENT un tableau JSON de 3 destinations (pas de markdown
autour), format strict : city, country, summary, flight {price_eur,
airline, duration, outbound_date, return_date, deeplink}, hotel {name,
stars, price_per_night_eur, total_eur, deeplink}, itinerary (array of 3
strings), estimated_total_eur, budget_remaining_eur.

Contraintes strictes : budget_remaining_eur DOIT être positif (sinon
exclus la destination), flight duration max 6h hors escales exceptionnelles,
utilise les MCPs Kiwi + Booking + TripAdvisor pour de la vraie donnée.`;

// Haiku 4.5 pricing per million tokens.
// Source: https://platform.claude.com/docs/en/about-claude/pricing
const HAIKU_PRICING = {
  input: 1.0,
  output: 5.0,
  cache_read: 0.10,
  cache_creation: 1.25,
};
const SONNET_PRICING = {
  input: 3.0,
  output: 15.0,
  cache_read: 0.30,
  cache_creation: 3.75,
};

function priceFor(modelId) {
  return /haiku/i.test(modelId) ? HAIKU_PRICING : SONNET_PRICING;
}

function costFor(usage, modelId) {
  const p = priceFor(modelId);
  return (
    (usage.input * p.input +
      usage.output * p.output +
      usage.cache_read * p.cache_read +
      usage.cache_creation * p.cache_creation) /
    1_000_000
  );
}

// ────────────────────────────────────────────────────────────────────────

async function api(path, { method = 'GET', body, stream = false } = {}) {
  const headers = {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': BETA,
    'content-type': 'application/json',
    accept: stream ? 'text/event-stream' : 'application/json',
  };
  const url = `${API}${path}${stream && !path.includes('?') ? '?beta=true' : ''}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return stream ? res : res.json();
}

function preflight() {
  const missing = [];
  if (!ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (!process.env.SKUSKU_AGENT_ID) missing.push('SKUSKU_AGENT_ID');
  if (!process.env.SKUSKU_ENV_ID) missing.push('SKUSKU_ENV_ID');
  if (missing.length) {
    console.error('❌ Cannot run — missing env vars:');
    missing.forEach(m => console.error('   -', m));
    console.error('\nCreate the agent + environment in the Anthropic Console first,');
    console.error('copy their IDs here, then re-run.');
    process.exit(1);
  }
}

// ────────────────────────────────────────────────────────────────────────

async function runOnce({ agentId, environmentId, vaultId, label }) {
  const session = await api('/sessions', {
    method: 'POST',
    body: {
      agent: agentId,
      environment_id: environmentId,
      ...(vaultId ? { vault_ids: [vaultId] } : {}),
      title: `Skusku POC ${label}`,
    },
  });

  // Open stream BEFORE sending the message — early events are buffered until
  // a stream attaches, but you can still miss frames on slow networks if
  // you send first.
  const streamRes = await api(`/sessions/${session.id}/stream`, { stream: true });

  await api(`/sessions/${session.id}/events`, {
    method: 'POST',
    body: {
      events: [
        { type: 'user.message', content: [{ type: 'text', text: USER_PROMPT }] },
      ],
    },
  });

  const t0 = Date.now();
  const usage = { input: 0, output: 0, cache_read: 0, cache_creation: 0 };
  const toolCalls = [];
  let assistantText = '';
  let errored = null;

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = frame.split('\n').find(l => l.startsWith('data:'));
      if (!dataLine) continue;
      let payload;
      try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
      switch (payload.type) {
        case 'span.model_request_end':
          if (payload.model_usage) {
            usage.input += payload.model_usage.input_tokens || 0;
            usage.output += payload.model_usage.output_tokens || 0;
            usage.cache_read += payload.model_usage.cache_read_input_tokens || 0;
            usage.cache_creation += payload.model_usage.cache_creation_input_tokens || 0;
          }
          break;
        case 'agent.message':
          if (Array.isArray(payload.content)) {
            for (const block of payload.content) {
              if (block.type === 'text' && block.text) assistantText += block.text;
            }
          }
          break;
        case 'agent.mcp_tool_use':
          toolCalls.push({ server: payload.mcp_server_name, name: payload.name });
          break;
        case 'session.status_idle':
          break outer;
        case 'session.error':
          errored = payload.error?.message || 'unknown';
          break outer;
      }
    }
  }

  const elapsedSec = (Date.now() - t0) / 1000;
  await api(`/sessions/${session.id}`, { method: 'DELETE' }).catch(() => {});

  return { sessionId: session.id, elapsedSec, usage, toolCalls, assistantText, errored };
}

function summarise(label, runs, modelId) {
  const n = runs.length;
  const totals = runs.reduce(
    (acc, r) => ({
      sec: acc.sec + r.elapsedSec,
      input: acc.input + r.usage.input,
      output: acc.output + r.usage.output,
      cache_read: acc.cache_read + r.usage.cache_read,
      cache_creation: acc.cache_creation + r.usage.cache_creation,
      toolCalls: acc.toolCalls + r.toolCalls.length,
      cost: acc.cost + costFor(r.usage, modelId),
    }),
    { sec: 0, input: 0, output: 0, cache_read: 0, cache_creation: 0, toolCalls: 0, cost: 0 },
  );
  const avg = {
    sec: totals.sec / n,
    cost: totals.cost / n,
    toolCalls: totals.toolCalls / n,
  };
  const stddev = (xs, m) => Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
  const sdSec = stddev(runs.map(r => r.elapsedSec), avg.sec);
  const sdCost = stddev(runs.map(r => costFor(r.usage, modelId)), avg.cost);

  console.log(`\n──── ${label} (n=${n}, model=${modelId}) ────`);
  console.log(`avg latency: ${avg.sec.toFixed(1)}s  (σ ${sdSec.toFixed(1)})`);
  console.log(`avg cost:    $${avg.cost.toFixed(4)}  (σ $${sdCost.toFixed(4)})`);
  console.log(`avg tools:   ${avg.toolCalls.toFixed(1)}`);
  console.log('tokens (sum):', totals);

  for (const [i, r] of runs.entries()) {
    const c = costFor(r.usage, modelId);
    const status = r.errored ? `ERROR: ${r.errored}` : 'ok';
    console.log(`  #${i + 1}  ${r.elapsedSec.toFixed(1)}s  $${c.toFixed(4)}  ${r.toolCalls.length} tools  ${status}`);
  }
}

async function main() {
  preflight();
  const agentId = process.env.SKUSKU_AGENT_ID;
  const environmentId = process.env.SKUSKU_ENV_ID;
  const vaultId = process.env.SKUSKU_VAULT_ID || null;

  console.log(`Running ${RUNS} session(s) on agent ${agentId} (${MODEL})`);
  if (!vaultId) console.log('(no vault — MCPs auth via URL)');

  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    process.stdout.write(`▸ run ${i + 1}/${RUNS}… `);
    try {
      const r = await runOnce({ agentId, environmentId, vaultId, label: `run ${i + 1}` });
      const c = costFor(r.usage, MODEL);
      console.log(`${r.elapsedSec.toFixed(1)}s, $${c.toFixed(4)}, ${r.toolCalls.length} tools${r.errored ? ` — ERROR: ${r.errored}` : ''}`);
      runs.push(r);
    } catch (e) {
      console.log(`failed: ${e.message}`);
      runs.push({ elapsedSec: 0, usage: { input: 0, output: 0, cache_read: 0, cache_creation: 0 }, toolCalls: [], assistantText: '', errored: e.message });
    }
  }

  summarise('Benchmark', runs, MODEL);

  // Print the assistant text of the LAST run so you can eyeball the quality.
  const last = runs[runs.length - 1];
  if (last?.assistantText) {
    console.log('\n──── Last run assistant text (truncated) ────');
    console.log(last.assistantText.slice(0, 2000));
    if (last.assistantText.length > 2000) console.log(`… (${last.assistantText.length - 2000} more chars)`);
  }
}

main().catch(err => {
  console.error('\n❌ POC failed:', err.message);
  process.exit(1);
});
