# Motion Execution Consumption Report

## Reality Audit

See [`docs/motion-execution-consumption-reality-audit.md`](./motion-execution-consumption-reality-audit.md).

## Welke metadata Motion nu consumeert

`resolveMotionHandoffExecutionConsumption(payload)` consumes:

- **`viduExecutionPlan`** — mode, jobs, job count, fallback, readiness
- **`animationPlan`** — shot roles, durations, missing images
- **`renderStrategyPlan`** — via prefill fallback chain
- Scene still URLs on handoff scenes

Persisted on wizard as `studioHandoff.executionConsumption` summary.

## Hoe mode consumption werkt

| Studio execution mode | Wizard `instantMode` | Transition rows |
|----------------------|----------------------|-----------------|
| `story_video` | `story` | 1 (multiframe) |
| `action_chain` | `transition` | N−1 from images |
| `hybrid` | `story` | 1 + segment notes |

Applied on import, refresh, and stored on wizard state.

## Hoe image mapping werkt

- **Story:** one scene still slot per scene
- **Action chain (multi-scene):** one slot per scene with beat label
- **Action chain (multi-shot single scene):** beat slots with start/end roles; first beat uses scene still
- **Hybrid:** merges story + action slots from job kinds

No auto-generation or upload — mapping only.

## Hoe duration mapping werkt

- Per-scene: `animationPlan.scenes[].targetDuration` → wizard text durations (via prefill)
- Total: `animationPlan.totalTargetDuration` or execution estimate → `durationSec`
- Transition units: job `durationSeconds` on each planned step

## Hoe action chains worden geconsumeerd

- Jobs mapped to `transitionUnits` with beat labels and durations
- 4-scene action chain → 4 image slots, 4 planned jobs, 3 expected transition rows → mismatch warning
- Readiness shows action beat count

## Hoe hybrid wordt geconsumeerd

- Counts `hybrid_story_segment` and `hybrid_action_segment` jobs
- Opens in story mode (existing wizard behavior)
- Readiness lists both story and action segments

## Hoe refresh from Studio werkt

1. Fetch latest handoff
2. `previewExecutionRefreshDiff` compares consumption summaries
3. Modal shows diff (duration, mode, jobs, new images/shots)
4. User applies → `applyExecutionRefreshFromHandoff` updates wizard + consumption

No auto-overwrite.

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/types/motion-handoff-execution-consumption.ts` | **New** — consumption types |
| `src/lib/motion-handoff-execution-consumption.ts` | **New** — consumption resolver |
| `src/lib/motion-handoff-execution-consumption.test.ts` | **New** — tests |
| `src/lib/studio-motion-handoff-map.ts` | Persist consumption on import |
| `src/lib/refresh-motion-handoff-in-wizard.ts` | Refresh + diff |
| `src/lib/instant-premium-wizard-storage.ts` | `executionConsumption` field |
| `src/lib/apply-motion-handoff-import.ts` | Re-export consumption |
| `src/components/instant/motion/motion-execution-readiness-panel.tsx` | **New** — readiness UI |
| `src/components/instant/motion/motion-execution-refresh-diff-modal.tsx` | **New** — refresh diff |
| `src/app/animate/instant/page.tsx` | Readiness panel + refresh modal |
| `src/i18n/locales/en.ts`, `nl.ts` | `motion.handoff.executionConsumption.*` |
| `docs/motion-execution-consumption-reality-audit.md` | **New** |
| `docs/motion-execution-consumption-report.md` | **New** |

## Wat bewust niet gebouwd is

- Automatic render / Vidu job execution
- New provider or render engine
- Schema migrations
- Timeline editor / MP4 import
- Auto image generation or upload
- Full planner metadata in `studioHandoffJson` blob
- Breaking changes to wizard steps

## Wat P1/P2 blijft

**P1:** Server-side create validates consumption summary against transition rows at project create.

**P2:** Expand wizard UI to show per-beat image slots for single-scene multi-shot action chains.

**P3:** Paid checkout stores consumption snapshot for post-payment validation.

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | Pass |
| `npx prisma generate` | Pass |
| `npm run lint` | Pass (0 errors) |
| `npm run build` | Pass |
| `npm run test` | **1713/1713** pass |

Consumption tests cover: story/action/hybrid consumption, job count mismatch, wizard persistence, refresh diff, legacy fallback.
