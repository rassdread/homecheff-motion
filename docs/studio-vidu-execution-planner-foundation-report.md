# Vidu Execution Planner Foundation Report

## Reality Audit

See [`docs/studio-vidu-execution-planner-reality-audit.md`](./studio-vidu-execution-planner-reality-audit.md).

## Welke bestaande execution paden zijn hergebruikt

| Existing path | Execution plan mapping |
|---------------|------------------------|
| Instant Premium `story` mode | `story_multiframe` job kind |
| Instant Premium `transition` mode | `action_start_end` job kind |
| `resolveStudioSceneImageHandoff` | Input image URL resolution |
| `buildStoryboardAudioMixPlan` | Audio mix metadata flags |
| `buildStudioAnimationPlan` | Shot timing, image roles, hybrid hints |
| `buildStudioRenderStrategyPlan` | Strategy → execution mode |

No new Vidu API calls. No changes to `animation-jobs/service.ts` execution.

## Hoe execution plan werkt

`buildViduExecutionPlan(input)` in `src/lib/studio-vidu-execution-planner.ts`:

**Input:** storyboard, render strategy plan, animation plan, optional audio mix plan.

**Output:** `ViduExecutionPlan` with execution mode, jobs[], missing requirements, warnings, fallback plan, readiness, audio flags.

Planning only — no render start, no DB writes.

## Hoe story mode gemapt wordt

`recommendedStrategy: story` → `executionMode: story_video`

- One `story_multiframe` job
- Input images: scene stills in scene order
- Duration: animation plan total
- Prompt intent from scene actions
- Audio mix metadata attached when storyboard has audio enabled

## Hoe action chain gemapt wordt

`recommendedStrategy: action_chain` → `executionMode: action_chain`

- One `action_start_end` job per adjacent shot beat (or single job if one shot)
- Start image: scene completed image; end image: missing unless separate asset exists
- Missing end → warning + fallback (`generate_images_first`)
- No auto-generation

## Hoe hybrid gemapt wordt

`recommendedStrategy: hybrid` → `executionMode: hybrid`

- Consecutive story scenes → `hybrid_story_segment` jobs
- Action scenes (`hybrid_action`) → `hybrid_action_segment` jobs (start/end pairs)
- Unsupported hybrid pieces flagged in readiness

## Hoe fallback werkt

| Condition | Fallback |
|-----------|----------|
| Action chain + missing end images | `generate_images_first` |
| Action chain + other missing images | `story_video` |
| Hybrid + missing end images | `preview_only` |

User sees fallback in UI — no automatic mode switch.

## Hoe UI werkt

`StudioViduExecutionPlanSummary` in:

- Productieplan tab (after animation plan)
- Renderstatus tab
- Consistency tab

Shows: approach, render steps, duration, missing images, fallback, ready to render. No provider jargon (no multiframe, start-end2video, job IDs).

## Hoe handoff metadata werkt

`MotionHandoffPayload.viduExecutionPlan` (V49) via `toMotionViduExecutionPlanHandoffPlan()`.

Slim metadata: mode, job count, readiness, fallback, per-job duration and missing image count.

**P1 (Motion):** Read `viduExecutionPlan` + `renderStrategyPlan.internalInstantMode` to pre-fill wizard `instantMode`.

**P2:** Map jobs to transition rows automatically.

**Not in persisted `studioHandoffJson`** (same as animation/render strategy plans) — full payload at import time only.

## Wat bewust niet gebouwd is

- Automatic renders without user action
- New video provider or render engine
- MP4 import
- Timeline editor
- Schema migrations
- Changes to `animation-jobs/service.ts` Vidu calls
- Motion wizard instantMode auto-switch (P1 documented only)

## Wat P1/P2 blijft

**P1:** Motion consumes `viduExecutionPlan` + `internalInstantMode` for wizard pre-fill and readiness display.

**P2:** Motion maps execution plan jobs to transition rows and image slots automatically.

**P3:** Persist planner metadata in sanitized handoff JSON within size budget.

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | ✅ Pass |
| `npx prisma generate` | ✅ Pass |
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ Pass |
| `npm run test` | ✅ **1701/1701** pass (includes 7 vidu execution planner foundation tests) |

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/types/studio-vidu-execution-plan.ts` | **New** |
| `src/lib/studio-vidu-execution-planner.ts` | **New** |
| `src/lib/studio-vidu-execution-plan-handoff.ts` | **New** |
| `src/lib/studio-vidu-execution-planner-foundation.test.ts` | **New** |
| `src/components/studio/studio-vidu-execution-plan-summary.tsx` | **New** |
| `src/types/motion-handoff-payload.ts` | V49 `viduExecutionPlan` |
| `src/server/studio/create-motion-handoff-payload.ts` | Attach execution plan |
| Production / Render / Consistency panels | UI integration |
| `src/i18n/locales/en.ts`, `nl.ts` | `studio.executionPlan.*` |
| `docs/studio-vidu-execution-planner-reality-audit.md` | **New** |
