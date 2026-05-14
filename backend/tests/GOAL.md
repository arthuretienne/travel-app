# Skusku Recommendation Engine — Quality Goal

## What we're trying to achieve

Reach a state where **every realistic Skusku user profile** (solo, couple,
family, friends, business — across budget bands, durations, climates, origins)
gets **at least one usable destination recommendation** in **under 3 minutes**,
with **no silent failures** and **plausible flight/hotel prices**.

The recommendation engine is the **core of the SaaS** (Arthur's words).
The user types a few preferences, hits a button, and either:
- ✅ Gets 3+ destinations they can dream about and book, or
- ❌ Gets "Aucun résultat trouvé" → they leave and never come back

We're optimising for "✅" coverage across the realistic profile space, not
for theoretical perfection on every edge case.

## The success criteria (concrete, measurable)

A run of `npm run test:reco` (which exercises `backend/tests/reco-profiles.json`,
20 profiles spanning the realistic input space) is **successful** when:

1. **0 errored profiles** (no exceptions thrown by the engine)
2. **≥ 90% passed profiles** (rules in `backend/tests/reco-quality-rules.js`)
3. **0 profiles returning empty array** outside of `edge`-tagged ones
4. **Average latency < 90s** per profile
5. **No profile takes more than 180s**

When `npm run test:reco` exits with code 0, all three criteria are met.

## How to make progress

The harness produces:
- `report.md` — human-readable, one section per profile, lists which rules failed
- `report.json` — machine-readable, same data structured
- `raw/<profile-id>.json` — full discovery output per profile

Pick one failing profile, read its rule failures, trace through the code paths,
fix the root cause, re-run. Repeat until exit 0.

**Where to look first** when a rule fails:

| Rule that fails | Where to look |
|---|---|
| `has_destinations` (0 returned) | `backend/src/services/destinationService.js` → `discoverDestinations()`. Look at the new `Pipeline summary:` log to see which step filtered to 0. |
| `country_diversity` (all same country) | Same file, the diversity selection block around line 285-299 |
| `flight_prices_plausible` (NaN, negative, absurd) | `backend/src/services/bookingService.js` → flight parsing. RapidAPI sometimes returns malformed responses. |
| `no_null_country` (city == country, "Albania, Albania") | `backend/src/services/bookingService.js` → `getDestinationId()`. The Booking API returns city as airport name sometimes; we need to normalise. |
| `avoid_countries_respected` | Claude shortlist prompt in `claudeService.js → generateDestinationShortlist`. Probably needs to receive `constraints.avoidCountries` and respect it. |
| `latency_ok` (> 180s) | Could be Render cold start (verify health endpoint first), Booking timeout, or claudeService taking too long. |
| `no_origin_as_destination` | Claude shortlist prompt — needs to know origin and exclude it. |

## Branches and commits

This file is on branch `claude/flamboyant-wing-c385a2`. The recent commits
relevant to this work:

```
6c92312  fix(reco): stop returning 0 results on standard searches
0622f77  fix(travel): refund search quota when 0 results + validate inputs with Zod
```

Always create commits per-fix with a meaningful message. Don't bundle 10
unrelated fixes into one commit; the goal is to make it easy to bisect
regressions later.

## Pre-flight checklist (read before running)

You need a working backend `.env` file at the worktree root with at minimum:
- `ANTHROPIC_API_KEY` (working, with credit)
- `BOOKING_API_KEY` (working — RapidAPI Booking endpoint)
- `DATABASE_URL` (Neon connection string)
- `CLERK_SECRET_KEY` (only needed if anything triggers Prisma queries through
  middleware; the harness shouldn't but defensive)

The harness imports the real services directly (no HTTP), so the same
environment variables that production uses are what's needed locally.

To run:
```bash
cd backend
npm run test:reco                        # full suite
npm run test:reco -- --filter solo       # subset
npm run test:reco -- --limit 3           # quick smoke
```

## What NOT to do

- **Don't downgrade the quality rules** to make the suite pass. The rules
  encode the actual user expectations. If a rule is wrong, argue it in a
  commit message *before* changing it.
- **Don't add try/catch swallowing errors** in `destinationService.js` —
  the whole point is to surface failures, not hide them. If you need to
  catch, log the structured error and let the harness see the empty result.
- **Don't bypass Booking by hardcoding fake destinations** to make tests
  pass. The end user lives or dies on the real Booking response quality;
  faking it makes the test useless.
- **Don't touch `itineraryService.js`** as part of this work — it uses
  Sonnet 4.5 and that's intentional, the day-by-day output is the product's
  signature quality (validated against the Ohrid saved trip on 2026-05-14).

## What CAN be touched

- `backend/src/services/destinationService.js` — the pipeline
- `backend/src/services/bookingService.js` — Booking API integration (parsing,
  retry, fallback)
- `backend/src/services/claudeService.js` → `generateDestinationShortlist` —
  the prompt that generates the initial shortlist of 8 candidates. This is
  where `avoidCountries`, `originCity exclusion`, season awareness should
  be enforced.
- `backend/tests/reco-profiles.json` — adding new profiles is OK. Removing
  existing ones requires a commit message justification.
- `backend/tests/reco-quality-rules.js` — adding rules OK. Loosening
  thresholds requires justification.

## When you're done

Run `npm run test:reco` one last time, copy-paste the summary block at the
bottom of stdout into a commit message:

```
test: reco quality run 18/20 passed, latency avg 42s

Failures: solo-paris-asie-longvoyage (latency >180s), couple-amerique-longvoyage
(country_diversity failed — only Argentina returned 3x)

(...rest of context...)
```

Then merge to `main` only when failures are documented and considered
acceptable for the launch, OR when 100% pass.
