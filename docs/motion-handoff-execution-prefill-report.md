# Motion Handoff Execution Prefill Report

## Reality Audit

See [`docs/motion-handoff-execution-prefill-reality-audit.md`](./motion-handoff-execution-prefill-reality-audit.md).

## Welke metadata Motion nu leest

`resolveMotionHandoffExecutionPrefill(payload)` reads:

- `viduExecutionPlan` — execution mode, readiness, fallback, job counts
- `renderStrategyPlan` — fallback `internalInstantMode`
- `animationPlan` — scene durations, missing shot images
- Scene image URLs on handoff scenes

Safe when absent — legacy import unchanged.

## Hoe mode prefill werkt

| Studio execution mode | Wizard `instantMode` |
|----------------------|----------------------|
| `story_video` | `story` |
| `action_chain` | `transition` |
| `hybrid` | `story` + hybrid warnings |

User confirms on import screen; can override via “Adjust render approach”.

## Hoe image prefill werkt

- Counts present vs missing scene images from handoff scenes
- Lists missing roles from animation plan shots (scene / start / end)
- Warnings for action sequences needing extra images
- No auto-generation; “Add images first in Studio” copy

## Hoe duration prefill werkt

- `animationPlan.scenes[].targetDuration` → per-scene wizard text duration
- Total → `durationSec` on wizard state
- `transitionSeconds` derived from average scene duration (3/5/8)

## Welke warnings zijn toegevoegd

- Missing end image
- Action sequence needs extra images
- Fallback plan active
- Hybrid uses story mode note
- Generate images first (fallback)
- Missing image count from animation plan

## Hoe confirmation step werkt

Import page (`/animate/instant/import`):

1. Fetch handoff payload
2. Show `MotionHandoffExecutionConfirm` (not auto-import)
3. User: Continue / Back to Studio / Adjust approach
4. On continue → `applyMotionHandoffImport` with selected mode
5. Redirect to Motion wizard

No render until user starts it in wizard.

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/types/motion-handoff-execution-prefill.ts` | **New** — prefill types |
| `src/lib/motion-handoff-execution-prefill.ts` | **New** — parser |
| `src/lib/motion-handoff-execution-prefill.test.ts` | **New** — tests |
| `src/lib/studio-motion-handoff-map.ts` | Mode + duration prefill |
| `src/lib/apply-motion-handoff-import.ts` | Import options |
| `src/lib/instant-premium-wizard-storage.ts` | `executionPrefill` on studioHandoff |
| `src/components/instant/motion/motion-handoff-execution-confirm.tsx` | **New** — confirmation UI |
| `src/components/instant/motion/motion-execution-prefill-banner.tsx` | **New** — wizard banner |
| `src/app/animate/instant/import/page.tsx` | Confirmation flow |
| `src/app/animate/instant/page.tsx` | Post-import banner |
| `src/i18n/locales/en.ts`, `nl.ts` | `motion.handoff.executionPrefill.*` |

## Wat bewust niet gebouwd is

- Automatic Vidu job execution
- New provider or render engine
- MP4 import / timeline editor
- Schema migrations
- Breaking changes to wizard steps
- Auto image generation
- Persisting full planner metadata in `studioHandoffJson` blob

## Wat P1/P2 blijft

**P1:** Motion project create reads execution plan to validate transition row count vs jobs.

**P2:** Auto-map execution plan jobs to wizard image slots for action beats (start/end pairs).

**P3:** Refresh-from-Studio reapplies execution prefill with diff UI.

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | Pass |
| `npx prisma generate` | Pass |
| `npm run lint` | Pass (0 errors; pre-existing warnings) |
| `npm run typecheck` | Pre-existing errors in unrelated test files (`studio-render-strategy-foundation.test.ts`, `studio-voice-identity-sprint.test.ts`) |
| `npm run build` | Pass |
| `npm run test` | **1707/1707** pass |

**Prefill unit tests** (`motion-handoff-execution-prefill.test.ts`):

- Legacy handoff without execution plan → story mode default
- `story_video` → story mode
- `action_chain` → transition mode
- `hybrid` → story mode + fallback warning
- Scene durations from `animationPlan` (clamped to wizard-allowed values 3/5/7)
- Missing scene images listed

**Confirmation step:** covered by UI component + import page flow; no dedicated e2e yet (P2).

**Duration note:** wizard normalizes per-scene durations via `normalizeStorySceneDurationSeconds` (allowed: 3, 5, 7). Prefill stores planner values; wizard clamps on import.
