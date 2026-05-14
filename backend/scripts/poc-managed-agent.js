// POC: Skusku → Anthropic Managed Agents + MCP (Booking, Kiwi, TripAdvisor)
//
// Goal of this script
// -------------------
// Validate end-to-end that we can:
//   1. create a Managed Agent on Anthropic configured with the three travel
//      MCP connectors,
//   2. open a session,
//   3. send a user prompt,
//   4. stream events back and capture the structured recommendations.
//
// Once this runs reliably the path to migration is clear: replace
// destinationService + claudeService + bookingService with a thin wrapper
// around these endpoints.
//
// What you need before running
// ----------------------------
// 1. ANTHROPIC_API_KEY in .env (already present for the rest of the backend).
// 2. Connector credentials in Anthropic's vault. For each of the three
//    connectors create one credential via `POST /managed-agents/credentials`
//    (or via the Anthropic Console UI) and copy its `id` into .env as:
//      BOOKING_MCP_CREDENTIAL_ID=cred_…
//      KIWI_MCP_CREDENTIAL_ID=cred_…
//      TRIPADVISOR_MCP_CREDENTIAL_ID=cred_…
//    Use auth.type="static_bearer" with the API key of each provider — that
//    keeps the bookings under the Skusku account so users don't have to log
//    in to Booking/Kiwi/TripAdvisor themselves.
// 3. The three MCP server URLs (published in the Anthropic connector
//    directory). Put them in .env as:
//      BOOKING_MCP_URL=https://…
//      KIWI_MCP_URL=https://…
//      TRIPADVISOR_MCP_URL=https://…
//
// Once those are set:
//   node backend/scripts/poc-managed-agent.js
//
// The script exits early with a clear message listing which env vars are
// missing, so you can iterate without losing work.

import '../env.js';

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BETA_HEADER = 'managed-agents-2026-04-01';
const MODEL = process.env.POC_AGENT_MODEL || 'claude-sonnet-4-5-20250929';

// Helper: format an MCP server definition. If the corresponding credential id
// is missing we just omit it so you can run a partial POC (e.g. Kiwi only).
function mcpServer({ name, url, credentialId }) {
  if (!url) return null;
  return {
    type: 'url',
    name,
    url,
    // The credential id tells Anthropic which stored secret to use when
    // calling this MCP. Omit to use the server's anonymous endpoint (rare).
    ...(credentialId ? { credential_id: credentialId } : {}),
  };
}

function buildMcpServers() {
  return [
    mcpServer({
      name: 'booking',
      url: process.env.BOOKING_MCP_URL,
      credentialId: process.env.BOOKING_MCP_CREDENTIAL_ID,
    }),
    mcpServer({
      name: 'kiwi',
      url: process.env.KIWI_MCP_URL,
      credentialId: process.env.KIWI_MCP_CREDENTIAL_ID,
    }),
    mcpServer({
      name: 'tripadvisor',
      url: process.env.TRIPADVISOR_MCP_URL,
      credentialId: process.env.TRIPADVISOR_MCP_CREDENTIAL_ID,
    }),
  ].filter(Boolean);
}

function preflightCheck() {
  const missing = [];
  if (!ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  const mcp = buildMcpServers();
  if (mcp.length === 0) {
    missing.push('at least one of BOOKING_MCP_URL / KIWI_MCP_URL / TRIPADVISOR_MCP_URL');
  }
  if (missing.length) {
    console.error('❌ POC cannot run — missing environment variables:');
    missing.forEach(m => console.error('   -', m));
    console.error('\nSee the top of this file for setup instructions.');
    process.exit(1);
  }
  return mcp;
}

async function api(path, { method = 'GET', body, stream = false } = {}) {
  const headers = {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': BETA_HEADER,
    'content-type': 'application/json',
    accept: stream ? 'text/event-stream' : 'application/json',
  };
  const res = await fetch(`${ANTHROPIC_API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return stream ? res : res.json();
}

const SYSTEM_PROMPT = `You are Skusku, an AI travel concierge. Given a user's
preferences, return at most 3 destination recommendations as a JSON array.
Each recommendation must include: city, country, summary (1–2 sentences),
flight (price in EUR, airline, duration), hotel (name, price/night, stars),
and a 3-bullet itinerary highlight. Use the booking, kiwi and tripadvisor
tools to look up real data — do not invent prices. Keep the JSON compact;
no markdown.`;

const USER_PROMPT = `I'm leaving from Paris in late June for a 7-day solo
trip. Budget €1000 per person, flexible dates. I love beaches and great
food, hate touristy traps. Suggest 3 destinations.`;

async function run() {
  const mcpServers = preflightCheck();

  console.log('▸ creating managed agent…');
  const agent = await api('/agents', {
    method: 'POST',
    body: {
      name: 'Skusku POC concierge',
      model: MODEL,
      system: SYSTEM_PROMPT,
      mcp_servers: mcpServers,
      tools: [
        { type: 'agent_toolset_20260401' },
        ...mcpServers.map(s => ({ type: 'mcp_toolset', mcp_server_name: s.name })),
      ],
    },
  });
  console.log('  agent id:', agent.id);

  console.log('▸ opening session…');
  const session = await api('/sessions', {
    method: 'POST',
    body: { agent_id: agent.id },
  });
  console.log('  session id:', session.id);

  console.log('▸ sending user message…');
  await api(`/sessions/${session.id}/messages`, {
    method: 'POST',
    body: {
      content: [{ type: 'text', text: USER_PROMPT }],
    },
  });

  console.log('▸ streaming events:');
  const stream = await api(`/sessions/${session.id}/events/stream`, { stream: true });

  const reader = stream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const startedAt = Date.now();
  let modelInputTokens = 0;
  let modelOutputTokens = 0;
  let lastAssistantText = '';

  // SSE frames are separated by a blank line; each frame has `event: …` and
  // `data: …`. We process them as they arrive.
  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const lines = frame.split('\n');
      const event = lines.find(l => l.startsWith('event:'))?.slice(6).trim();
      const data = lines.find(l => l.startsWith('data:'))?.slice(5).trim();
      if (!event || !data) continue;
      try {
        const parsed = JSON.parse(data);
        if (event.endsWith('span.model_request_end') && parsed.model_usage) {
          modelInputTokens += parsed.model_usage.input_tokens || 0;
          modelOutputTokens += parsed.model_usage.output_tokens || 0;
        }
        if (event.endsWith('agent.text') && parsed.text) {
          lastAssistantText += parsed.text;
        }
        if (event.endsWith('session.status_idle')) {
          console.log(`  ✓ idle reached in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
          break outer;
        }
        // Lightweight log — full events are noisy, just show key types.
        if (/(tool_use|tool_result|status|error)/.test(event)) {
          console.log(`    [${event}]`, summarise(parsed));
        }
      } catch (e) {
        console.warn('    (failed to parse frame:', e.message, ')');
      }
    }
  }

  console.log('\n──── RESULT ────');
  console.log('Tokens in/out:', modelInputTokens, '/', modelOutputTokens);
  console.log('Assistant text (last):');
  console.log(lastAssistantText || '(no text emitted)');

  console.log('\n▸ cleaning up session…');
  await api(`/sessions/${session.id}`, { method: 'DELETE' }).catch(() => {});
  console.log('done.');
}

function summarise(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const copy = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.length > 120) copy[k] = v.slice(0, 117) + '…';
    else if (Array.isArray(v)) copy[k] = `[${v.length}]`;
    else copy[k] = v;
  }
  return copy;
}

run().catch(err => {
  console.error('\n❌ POC failed:', err.message);
  process.exit(1);
});
