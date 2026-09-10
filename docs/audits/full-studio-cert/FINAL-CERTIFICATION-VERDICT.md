# Full Studio Product Certification — Final Verdict (Repair Slice)

**Date:** 2026-08-23  
**Verdict:** `STUDIO_FULL_PRODUCT_CERTIFICATION_BLOCKED`

---

## Entering blockers (3)

1. Audio mixer fix local-only → **CLOSED** (deployed `90926699`)
2. Merge stall at 70% → **CLOSED** (root cause + fix deployed; rebuild verified)
3. Physical iPhone → **OPEN** (`DEVICE_UNAVAILABLE`)

## Additional partial

- Rode loper **automatic** first-time finalization not re-run with new Vidu (budget); rebuild path certified provider-free.

## Executive summary

Pushed **90926699**: voice `apad` + `amix duration=longest`; `orchestrateFinalMerge` polls `runFinalExportToCompletion` after worker dispatch. Production rebuild on existing Rode loper clips completes in ~23s with 0 provider calls. Audio module produces 10s output with ducking (−7.8 dB) and late SFX at deploy SHA. **No physical iPhone connected** — certification gate remains open.

## Files changed (this slice)

- `src/lib/studio-audio-mix-ffmpeg.ts`
- `src/lib/studio-audio-mix-duration.test.ts`
- `src/server/instant-premium/finalize-repair.ts`
- `src/server/instant-premium/reconcile-video-repair.ts`
- `src/server/instant-premium/repair-worker-dispatch.test.ts`

## Regression

| Gate | Result |
|------|--------|
| Targeted audio/merge tests | Pass |
| Full suite | 5236/5241 pass (5 failures unrelated to this slice) |
| Build | Pass |
| Lint | Pre-existing warnings/errors in repo |

## Scorecard (carried + updated)

| Area | Score |
|------|-------|
| Overall | 7.6 |
| Character | 8.0 |
| Audio export | 8.0 (module) |
| Mobile | N/A |
| Finish / Projects / HomeCheff | 8.0 (prior) |

## Core promise answers

| Promise | Answer |
|---------|--------|
| Character / outfit / location / product | YES (prior C) |
| Preset → Studio / rerender / Vidu | YES |
| Audio final mix | YES (deployed module) |
| Ducking / SFX | YES |
| Finish / Projects / HomeCheff | YES |
| Physical iPhone | **NO** (not tested) |

## Remaining blocker

**P0 — Physical iPhone advanced Studio smoke** — connect device + Web Inspector + CDP; rerun portrait/landscape flow on Production.

## Recommended next phase

**Physical iPhone certification closeout only** — no PX.5, no new features.

## Production recommendation

Audio + merge fixes are on Production. Ship iPhone cert when device available. Optional: one bounded Rode loper automatic-merge re-run (0 extra Vidu if reuse clips) to upgrade RODE_LOPER_FINALIZATION from PARTIAL to CERTIFIED.
