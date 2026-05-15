// Skusku recommendation quality harness.
//
// What it does
// ------------
// Loads N user profiles from backend/tests/reco-profiles.json, calls
// discoverDestinations() directly on each (no HTTP, no auth), runs the
// quality rules in backend/tests/reco-quality-rules.js, and writes both a
// machine-readable JSON report and a human-readable Markdown report.
//
// Why direct service calls (not HTTP)
// -----------------------------------
// - No Clerk session token to refresh.
// - No HTTP overhead, so 20 profiles run in ~5-10 min instead of 1h.
// - Same code paths as production (the route handler is a thin wrapper).
// - Reproducible: any failure points directly at the service.
//
// To run
// ------
//   cd backend
//   npm run test:reco                       # all profiles
//   npm run test:reco -- --filter solo      # only profiles whose id contains "solo"
//   npm run test:reco -- --filter edge      # only edge cases
//   npm run test:reco -- --limit 3          # only first 3 (useful while debugging)
//   npm run test:reco -- --out /tmp/run1    # custom output dir
//
// Output
// ------
//   ./reports/<timestamp>/report.json   structured per-profile + summary
//   ./reports/<timestamp>/report.md     human-readable, paste into GitHub issues
//   ./reports/<timestamp>/raw/<id>.json full discoverDestinations payload for debugging

import '../env.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use dynamic import so this script can be loaded even if a service file has
// an early syntax error — we want to surface it clearly, not get a vague
// module-resolution stack trace.
const { discoverDestinations } = await import('../src/services/destinationService.js');
const { evaluate, config } = await import('../tests/reco-quality-rules.js');

// ────────────────────────────────────────────────────────────────────────
// CLI parsing — kept tiny, no dependency.

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
// Run a single profile. Returns a structured result without throwing
// (failures are captured as { errored: true, error: ... }) so one bad
// profile doesn't kill the whole batch.

async function runProfile(profile) {
  const t0 = Date.now();
  try {
    const userProfile = {
      ...profile.payload,
      // The route handler merges onboardingPreferences from Prisma; here we
      // simulate a sparse profile (worst case for the engine).
      onboardingPreferences: {},
    };
    const budgetPerPerson = userProfile.basic.budget;
    const travelersCount = userProfile.basic.travelers || 1;
    const totalBudget = budgetPerPerson * travelersCount;

    // discoverDestinations expects total budget (route does the * travelers itself).
    const discoveryResult = await discoverDestinations({
      userProfile,
      budget: totalBudget,
      origin: userProfile.availability?.originCity || 'Paris',
      duration: userProfile.availability?.duration || 7,
      departureDate: userProfile.availability?.startDate || null,
      userId: null,
    });

    const elapsed = Date.now() - t0;

    // Normalise: discoveryResult can be either an array (happy path) or an
    // object with { budgetWarning, flightOptions, alternatives } when the
    // engine couldn't fit anything within budget. We treat the over-budget
    // options as "destinations" for the harness so the quality rules still
    // apply, but flag the warning separately.
    const destinations = Array.isArray(discoveryResult)
      ? discoveryResult
      : (discoveryResult.flightOptions || []);
    const budgetWarning = !Array.isArray(discoveryResult) ? discoveryResult.budgetWarning : null;

    return {
      profileId: profile.id,
      profileLabel: profile.label,
      tags: profile.tags,
      latencyMs: elapsed,
      destinations,
      budgetWarning,
      errored: false,
    };
  } catch (err) {
    return {
      profileId: profile.id,
      profileLabel: profile.label,
      tags: profile.tags,
      latencyMs: Date.now() - t0,
      destinations: [],
      errored: true,
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
    };
  }
}

// ────────────────────────────────────────────────────────────────────────
// Report writers.

function renderMarkdown(summary, results) {
  const lines = [];
  lines.push(`# Skusku reco quality run — ${summary.startedAt}`);
  lines.push('');
  lines.push(`**Profiles**: ${summary.total} | **Passed**: ${summary.passed} | **Failed**: ${summary.failed} | **Errored**: ${summary.errored}`);
  lines.push(`**Total wall time**: ${(summary.totalWallMs / 1000).toFixed(1)}s | **Avg per profile**: ${(summary.avgLatencyMs / 1000).toFixed(1)}s`);
  lines.push('');
  lines.push('## Pass rate by tag');
  const byTag = {};
  for (const r of results) {
    for (const t of (r.profile.tags || [])) {
      byTag[t] ||= { total: 0, passed: 0 };
      byTag[t].total++;
      if (r.eval.passed) byTag[t].passed++;
    }
  }
  for (const [tag, stat] of Object.entries(byTag).sort()) {
    const rate = ((stat.passed / stat.total) * 100).toFixed(0);
    lines.push(`- \`${tag}\` — ${stat.passed}/${stat.total} (${rate}%)`);
  }
  lines.push('');
  lines.push('## Per-profile results');
  lines.push('');
  for (const r of results) {
    const status = r.run.errored ? '💥 ERROR' : r.eval.passed ? '✅ PASS' : '❌ FAIL';
    lines.push(`### ${status} — \`${r.profile.id}\``);
    lines.push(`*${r.profile.label}* — tags: ${(r.profile.tags || []).join(', ')}`);
    lines.push(`- Latency: ${(r.run.latencyMs / 1000).toFixed(1)}s`);
    lines.push(`- Destinations returned: ${r.run.destinations.length}`);
    if (r.run.destinations.length) {
      lines.push('  ' + r.run.destinations.map(d => `${d.name} (${d.countryName || d.country || '?'}) €${d.price?.amount || '?'}`).join(' · '));
    }
    if (r.run.budgetWarning) {
      lines.push(`- ⚠️  Budget warning: ${r.run.budgetWarning.message}`);
    }
    if (r.run.errored) {
      lines.push(`- 💥 Error: ${r.run.error}`);
    }
    if (r.eval.failed.length) {
      lines.push(`- Rules failed:`);
      for (const f of r.eval.failed) {
        lines.push(`  - \`${f.rule}\`: ${f.reason}`);
      }
    }
    lines.push('');
  }
  lines.push('---');
  lines.push(`Config: ${JSON.stringify(config)}`);
  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const profilesPath = path.resolve(__dirname, '..', 'tests', 'reco-profiles.json');
  const { profiles } = JSON.parse(await fs.readFile(profilesPath, 'utf8'));

  const filtered = profiles.filter(p => matchesFilter(p, args.filter)).slice(0, args.limit);
  console.log(`Loaded ${profiles.length} profiles, running ${filtered.length} after filter/limit.`);

  const startedAt = new Date().toISOString();
  const safeStarted = startedAt.replace(/[:.]/g, '-');
  const outDir = args.outDir || path.resolve(__dirname, '..', 'reports', safeStarted);
  await fs.mkdir(path.join(outDir, 'raw'), { recursive: true });

  const results = [];
  const wallT0 = Date.now();

  for (const profile of filtered) {
    process.stdout.write(`▸ ${profile.id}… `);
    const run = await runProfile(profile);
    const evalResult = evaluate({ ...run, profile });
    const label = run.errored ? `ERROR (${run.error})` : evalResult.passed ? `PASS ${run.destinations.length} dest in ${(run.latencyMs / 1000).toFixed(1)}s` : `FAIL ${evalResult.failed.map(f => f.rule).join(',')}`;
    console.log(label);

    results.push({ profile, run, eval: evalResult });
    await fs.writeFile(path.join(outDir, 'raw', `${profile.id}.json`), JSON.stringify(run, null, 2));
  }

  const wallMs = Date.now() - wallT0;
  const summary = {
    startedAt,
    total: results.length,
    passed: results.filter(r => !r.run.errored && r.eval.passed).length,
    failed: results.filter(r => !r.run.errored && !r.eval.passed).length,
    errored: results.filter(r => r.run.errored).length,
    totalWallMs: wallMs,
    avgLatencyMs: results.length ? results.reduce((s, r) => s + r.run.latencyMs, 0) / results.length : 0,
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

  // Non-zero exit code if anything is not passing → /loop can use this as the
  // signal to keep iterating until everything is green.
  process.exit(summary.failed + summary.errored > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n❌ harness crashed:', err.message);
  console.error(err.stack);
  process.exit(2);
});
