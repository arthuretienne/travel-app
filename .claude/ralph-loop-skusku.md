# Ralph-style autonomous loop for Skusku reco quality

This document tells any LLM-with-tools (Claude, Codex, an Agent SDK script,
etc.) how to make autonomous progress on `backend/tests/GOAL.md` without
human intervention. It's idempotent: running it again on a fresher branch
picks up exactly where the previous run stopped, because state lives in the
test reports and commits, not in the LLM's memory.

## The loop in one sentence

> Run the test harness, find the single most impactful failure, fix only
> that, commit, and repeat — never touch more than one root cause per
> iteration.

## How to launch (Claude Code)

Inside the worktree:

```
/loop 20m Make backend/tests/GOAL.md pass. Each iteration: run npm run test:reco from backend/, read the report, pick ONE failing profile, find the root cause in destinationService.js / bookingService.js / claudeService.js, fix it, commit with a clear message, stop when the harness exits 0 or you've reached 90% pass rate.
```

`/loop` will keep firing the same prompt at fresh model sessions until you
stop it. Each iteration has the full repo state (the previous commit) and
the previous report on disk — that's the persistence layer, not chat memory.

## How to launch (any other agent)

For Codex, Aider, Cursor, or a manual /goal session:

1. Read `backend/tests/GOAL.md` start to end.
2. Run `cd backend && npm run test:reco` from the repo root.
3. Read the latest `backend/reports/<timestamp>/report.md`.
4. Pick the **single failing profile** with the largest tag overlap with
   other failures (i.e. fixing it most likely fixes others too).
5. Trace its failure: open the `raw/<profile-id>.json` to see what
   `discoverDestinations` actually returned; cross-reference with the
   `Pipeline summary:` log line from the harness console output.
6. Identify the **single line or function** to change in
   `destinationService.js`, `bookingService.js`, or
   `claudeService.js → generateDestinationShortlist`.
7. Make the smallest change that addresses the root cause.
8. Re-run **just that profile** to confirm the fix:
   `npm run test:reco -- --filter <profile-id>`
9. Re-run the full suite: `npm run test:reco`
10. If overall failures decreased, commit with a message describing the
    root cause and the affected profile(s). If overall failures increased,
    revert the change (`git checkout -- backend/`) and pick a different
    failure.
11. Repeat from step 2 until exit 0 or 90% pass rate.

## What to commit and when

- One commit per fix. Subject line ≤ 70 chars, body 2-5 lines of context.
- Always include the harness output stats in the body:
  `before: X/20 passed (Y failed), after: Z/20 passed (W failed)`
- If you add a new profile to `reco-profiles.json`, commit that separately
  from any engine fix.
- If you loosen a rule in `reco-quality-rules.js`, the commit must explain
  why (cite the user expectation that justifies the loosening).

## Stop conditions

- `npm run test:reco` exits 0 → you're done, commit final report and stop.
- 90% pass rate reached and the remaining failures are documented as
  acceptable in a commit message → stop.
- Three consecutive iterations don't reduce the failure count → stop and
  surface to Arthur: you're stuck on something subtle that needs human input.

## Anti-patterns to avoid

- **Don't make changes outside of `backend/src/services/` or `backend/tests/`.**
  If you think the route handler needs to change, you're probably wrong:
  the route is a thin wrapper, the bugs live in the services.
- **Don't run the harness more than 6 times per hour.** Each run hits the
  real Anthropic API and the real Booking RapidAPI. Costs add up fast.
  If you need to iterate quickly, use `--filter` + `--limit` to test only
  the profile you're working on.
- **Don't change `itineraryService.js`.** That's Sonnet-generated day-by-day
  content and it's intentionally Sonnet. Out of scope.
- **Don't modify the Anthropic model used in `claudeService.js`** as part
  of this work. Model selection is a separate sprint with separate
  trade-offs.
- **Don't commit broken `node --check`.** Always sanity check syntax
  before committing.

## State that persists across runs

- Git commits on the branch (this is the source of truth)
- `backend/reports/*` directories (newest = freshest signal)
- `backend/.env` (do not commit; the harness will fail loudly if missing)

There is no in-memory state. Each iteration starts from the working tree
and the test report, period.

## How Arthur reviews progress

He looks at:
1. `git log` since the last "ralph loop session start" commit
2. The newest `backend/reports/*/report.md`
3. The harness exit code

If those three agree (commits since X say "fixed Y", report shows Y is
passing, exit code dropped) → progress is real. If not → something is off,
investigate.
