// POC: Skusku → Anthropic Managed Agents + MCP (Booking, Kiwi, TripAdvisor)
//
// Why
// ---
// Validate end-to-end that we can replace destinationService + claudeService
// + bookingService with a thin wrapper around Anthropic's Managed Agents API.
// The script measures latency, token usage and recommendation quality on a
// realistic Skusku prompt.
//
// Reference docs (all under https://platform.claude.com/docs/en/managed-agents/):
//   - Quickstart:          /quickstart
//   - Vaults & credentials: /vaults
//   - Events & streaming:   /events-and-streaming
//
// Object model (one-time setup, then reuse the IDs forever):
//   1. Vault         — stores credentials. Create once per service account.
//   2. Credential    — one per MCP server (Booking, Kiwi, TripAdvisor).
//                      static_bearer → uses Skusku's shared API tokens so
//                      end users never authenticate with the providers.
//   3. Environment   — runtime/container for the agent. Create once.
//   4. Agent         — model + system prompt + MCP refs. Create once.
//   5. Session       — live run = agent + environment + vault_ids. Per-user
//                      per-request in production. Billed by session-hour
//                      while status is "running".
//
// To run
// ------
//   ANTHROPIC_API_KEY + at least one MCP URL/token in backend/.env, then:
//     npm run poc:managed-agent
//
// The script bootstraps everything (vault, env, agent) if the corresponding
// *_ID env var is missing, prints the IDs so you can reuse them next time,
// and tears the session down at the end. Vaults / agents / environments
// persist — that's intentional, you don't want to recreate them on every run.

import '../env.js';

const API = 'https://api.anthropic.com/v1';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BETA = 'managed-agents-2026-04-01';
const MODEL = process.env.POC_AGENT_MODEL || 'claude-sonnet-4-5-20250929';

const MCP_CONFIGS = [
  {
    name: 'kiwi',
    url: process.env.KIWI_MCP_URL,
    token: process.env.KIWI_API_TOKEN,
    displayName: 'Kiwi.com flight search',
  },
  {
    name: 'booking',
    url: process.env.BOOKING_MCP_URL,
    token: process.env.BOOKING_API_TOKEN,
    displayName: 'Booking.com hotel search',
  },
  {
    name: 'tripadvisor',
    url: process.env.TRIPADVISOR_MCP_URL,
    token: process.env.TRIPADVISOR_API_TOKEN,
    displayName: 'TripAdvisor reviews & POIs',
  },
];

const SYSTEM_PROMPT = `You are Skusku, an AI travel concierge. Given a user's
preferences, return at most 3 destination recommendations as a JSON array.
Each recommendation must include: city, country, summary (1-2 sentences),
flight (price in EUR, airline, duration), hotel (name, price/night, stars),
and a 3-bullet itinerary highlight. Use the available tools (kiwi, booking,
tripadvisor) to look up real data — do not invent prices. Keep the JSON
compact; no markdown.`;

const USER_PROMPT = `I'm leaving from Paris in late June for a 7-day solo
trip. Budget €1000 per person, flexible dates. I love beaches and great
food, hate touristy traps. Suggest 3 destinations.`;

// ────────────────────────────────────────────────────────────────────────
// HTTP helper

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

// ────────────────────────────────────────────────────────────────────────
// Preflight

function activeMcps() {
  return MCP_CONFIGS.filter(m => m.url && m.token);
}

function preflight() {
  const missing = [];
  if (!ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (activeMcps().length === 0) {
    missing.push('at least one of {KIWI,BOOKING,TRIPADVISOR}_{MCP_URL,API_TOKEN}');
  }
  if (missing.length) {
    console.error('❌ POC cannot run — missing env vars:');
    missing.forEach(m => console.error('   -', m));
    console.error('\nSee top of this file for the full setup checklist.');
    process.exit(1);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Steps 1–4: ensure vault, credentials, environment, agent exist. If their
// IDs are already in env vars we reuse them (cheaper, faster). Otherwise we
// create them and print the IDs so you can paste them back into .env.

async function ensureVault() {
  if (process.env.SKUSKU_VAULT_ID) {
    console.log('▸ reusing vault', process.env.SKUSKU_VAULT_ID);
    return process.env.SKUSKU_VAULT_ID;
  }
  console.log('▸ creating vault…');
  const vault = await api('/vaults', {
    method: 'POST',
    body: { display_name: 'Skusku travel MCPs' },
  });
  console.log('  → SKUSKU_VAULT_ID=' + vault.id);
  return vault.id;
}

async function ensureCredentials(vaultId) {
  const mcps = activeMcps();
  const credentialIds = [];
  for (const mcp of mcps) {
    const envKey = `${mcp.name.toUpperCase()}_CREDENTIAL_ID`;
    if (process.env[envKey]) {
      console.log(`▸ reusing ${mcp.name} credential ${process.env[envKey]}`);
      credentialIds.push({ name: mcp.name, id: process.env[envKey], url: mcp.url });
      continue;
    }
    console.log(`▸ creating ${mcp.name} credential…`);
    const cred = await api(`/vaults/${vaultId}/credentials`, {
      method: 'POST',
      body: {
        display_name: mcp.displayName,
        auth: {
          type: 'static_bearer',
          token: mcp.token,
          mcp_server_url: mcp.url,
        },
      },
    });
    console.log(`  → ${envKey}=${cred.id}`);
    credentialIds.push({ name: mcp.name, id: cred.id, url: mcp.url });
  }
  return credentialIds;
}

async function ensureEnvironment() {
  if (process.env.SKUSKU_ENV_ID) {
    console.log('▸ reusing environment', process.env.SKUSKU_ENV_ID);
    return process.env.SKUSKU_ENV_ID;
  }
  console.log('▸ creating environment…');
  const env = await api('/environments', {
    method: 'POST',
    body: { name: 'Skusku POC' },
  });
  console.log('  → SKUSKU_ENV_ID=' + env.id);
  return env.id;
}

async function ensureAgent(mcps) {
  if (process.env.SKUSKU_AGENT_ID) {
    console.log('▸ reusing agent', process.env.SKUSKU_AGENT_ID);
    return process.env.SKUSKU_AGENT_ID;
  }
  console.log('▸ creating agent…');
  const agent = await api('/agents', {
    method: 'POST',
    body: {
      name: 'Skusku travel concierge',
      model: MODEL,
      system: SYSTEM_PROMPT,
      mcp_servers: mcps.map(m => ({
        type: 'url',
        name: m.name,
        url: m.url,
      })),
      tools: [
        { type: 'agent_toolset_20260401' },
        ...mcps.map(m => ({ type: 'mcp_toolset', mcp_server_name: m.name })),
      ],
    },
  });
  console.log('  → SKUSKU_AGENT_ID=' + agent.id);
  return agent.id;
}

// ────────────────────────────────────────────────────────────────────────
// Step 5–7: live session

async function runSession({ agentId, environmentId, vaultId }) {
  console.log('▸ opening session…');
  const session = await api('/sessions', {
    method: 'POST',
    body: {
      agent: agentId,
      environment_id: environmentId,
      vault_ids: [vaultId],
      title: 'Skusku POC run',
    },
  });
  console.log('  session id:', session.id);

  // Important: open the stream FIRST so we don't miss early events that the
  // API buffers. Then send the user message.
  console.log('▸ attaching to event stream…');
  const streamRes = await api(`/sessions/${session.id}/stream`, { stream: true });

  console.log('▸ sending user message…');
  await api(`/sessions/${session.id}/events`, {
    method: 'POST',
    body: {
      events: [
        {
          type: 'user.message',
          content: [{ type: 'text', text: USER_PROMPT }],
        },
      ],
    },
  });

  const startedAt = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let assistantText = '';
  const toolCalls = [];

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
      try {
        payload = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      switch (payload.type) {
        case 'span.model_request_end':
          if (payload.model_usage) {
            inputTokens += payload.model_usage.input_tokens || 0;
            outputTokens += payload.model_usage.output_tokens || 0;
            cacheReadTokens += payload.model_usage.cache_read_input_tokens || 0;
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
        case 'agent.tool_use':
          toolCalls.push({
            tool: payload.name || payload.tool_name,
            server: payload.mcp_server_name,
            input: payload.input,
          });
          console.log(`    [tool] ${payload.mcp_server_name || 'builtin'}/${payload.name || payload.tool_name}`);
          break;
        case 'session.status_idle':
          console.log(`  ✓ idle in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
          break outer;
        case 'session.error':
          console.error(`  ✗ session error: ${payload.error?.message || 'unknown'}`);
          break outer;
        default:
          // ignore the noisy ones
          break;
      }
    }
  }

  console.log('\n──── RESULT ────');
  console.log('Tokens:', { input: inputTokens, output: outputTokens, cache_read: cacheReadTokens });
  console.log('Tool calls:', toolCalls.length);
  console.log('Assistant text:');
  console.log(assistantText || '(empty)');

  console.log('\n▸ closing session…');
  await api(`/sessions/${session.id}`, { method: 'DELETE' }).catch(() => {});
}

// ────────────────────────────────────────────────────────────────────────

async function main() {
  preflight();
  const mcps = activeMcps();
  console.log(`POC will use ${mcps.length} MCP(s): ${mcps.map(m => m.name).join(', ')}`);

  const vaultId = await ensureVault();
  await ensureCredentials(vaultId);
  const environmentId = await ensureEnvironment();
  const agentId = await ensureAgent(mcps);

  console.log('\n--- setup done ---');
  if (!process.env.SKUSKU_VAULT_ID || !process.env.SKUSKU_ENV_ID || !process.env.SKUSKU_AGENT_ID) {
    console.log('Copy the IDs above into backend/.env to skip re-creation next time.\n');
  }

  await runSession({ agentId, environmentId, vaultId });
}

main().catch(err => {
  console.error('\n❌ POC failed:', err.message);
  process.exit(1);
});
