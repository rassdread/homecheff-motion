# Animation Planner Foundation Report

## Reality Audit

See [`docs/studio-animation-planner-reality-audit.md`](./studio-animation-planner-reality-audit.md).

Timing, motion hints, and image requirements existed in separate planners. Animation Planner consolidates them into one seconds-level animation plan before any Motion/Vidu execution.

## Welke bestaande systemen zijn hergebruikt

| Systeem | Rol |
|---------|-----|
| `buildStudioProductionPlan` | Production context + optional input |
| `buildStudioRenderStrategyPlan` | Strategy, speed advice, scene assignments, image requirements |
| `buildStoryboardActionShotDistribution` | Action beats, image roles per beat |
| `buildCurrentStoryboardShotPlan` | Camera movement + scene energy |
| `buildStoryboardIdentityConsumption` | World/identity context (no new AI) |
| `sceneHasCompletedImage` | Missing image detection |
| `toMotionAnimationPlanHandoffPlan` | Slim V48 handoff metadata |

## Hoe Animation Plan werkt

`buildStudioAnimationPlan(input)` in `src/lib/studio-animation-planner.ts`:

**Input:** storyboard, optional production/render/action plans, asset libraries.

**Output:** `StudioAnimationPlan` with total duration, provider/final estimates, per-scene shots (timing, motion, images), speed advice, readiness, director context lines.

No DB writes. No render calls.

## Hoe shot timing werkt

- Scene duration from `durationSeconds` (default 5s).
- **Story/hybrid-story scenes:** one shot spanning full scene duration.
- **Action/hybrid-action scenes:** beats from action distribution; duration split by role weights (opening/setup shorter, action longer, payoff/closing shorter).
- Cumulative `startTime`/`endTime` across storyboard (seconds-level, not frame-accurate).

## Hoe motion intent werkt

Derived from shot role, camera movement, scene energy, and action complexity:

| Intent | Typical trigger |
|--------|-----------------|
| `slow_push` | push_in / pull_out camera |
| `tracking` | tracking / follow camera |
| `handheld_energy` | dynamic/intense energy |
| `action_follow` | action/payoff beats |
| `reveal` | opening/setup |
| `quick_cut` | payoff/closing |
| `hold` | static camera |

No provider prompt changes — plan metadata only.

## Hoe image requirements werken

- **Story:** `scene_still` per scene.
- **Action chain:** per-beat roles from action distribution (`start_pose`, `action_pose`, `payoff_pose`, `end_pose`).
- **Hybrid:** story scenes → scene still; action scenes → multi-beat requirements.
- `missingImage` from beat `imageStatus` and `sceneHasCompletedImage`.

Visual Production panel link when images missing.

## Hoe speed advice werkt

Copied from Render Strategy Planner:

- Provider render duration estimate
- Recommended final edit duration
- `suggestedSpeedAdjustment` ratio (advice-only, `speedAdviceOnly: true`)
- UI: “Provider render: 40s · Recommended edit: 30s · 1.33× faster”

No FFmpeg or speed execution.

## Hoe UI werkt

`StudioAnimationPlanSummary` component:

- **Productieplan tab** — full animation section after render planning
- **Consistency tab** — animation readiness checklist

Shows duration, shots, missing images, per-scene timing/motion, speed advice. No provider jargon.

## Hoe AI Director aansluit

1. Production plan enriches idea first (existing).
2. Animation plan enriches idea second (`enrichIdeaWithAnimationPlan`).
3. Proposal built on mock storyboard includes `animationPlan` + `animationPlanPreview`.
4. Director preview shows shot timing, motion, missing images — preview only, no auto-save.

## Hoe Consistency aansluit

Consistency tab embeds `StudioAnimationPlanSummary` with readiness checks:

- Animation plan present
- Timing logical (no scenes needing split)
- Images complete
- Action structure complete

Reuses existing signals — no new score engine.

## Hoe handoff metadata werkt

`MotionHandoffPayload.animationPlan` (V48) via `toMotionAnimationPlanHandoffPlan()`:

- Slim scene/shot timing + motion intent + image flags
- Speed advice metadata
- Readiness booleans

**Motion may ignore until P1/P2** — documented, no execution required.

Attached in `create-motion-handoff-payload.ts` alongside render strategy plan.

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/types/studio-animation-plan.ts` | **New** — animation plan types |
| `src/lib/studio-animation-planner.ts` | **New** — `buildStudioAnimationPlan` |
| `src/lib/studio-animation-plan-handoff.ts` | **New** — Motion handoff mapper |
| `src/lib/studio-animation-planner-foundation.test.ts` | **New** — 10 foundation tests |
| `src/components/studio/studio-animation-plan-summary.tsx` | **New** — UI component |
| `src/types/motion-handoff-payload.ts` | V48 `animationPlan` field |
| `src/server/studio/create-motion-handoff-payload.ts` | Attach animation plan |
| `src/types/studio-director-proposal.ts` | `animationPlan`, preview entries |
| `src/lib/studio-director-proposal-builder.ts` | Build + enrich animation plan |
| `src/components/studio/studio-director-proposal-flow.tsx` | Animation preview section |
| `src/components/studio/studio-workspace-production-plan-panel.tsx` | Animation section |
| `src/components/studio/studio-workspace-consistency-panel.tsx` | Animation readiness |
| `src/i18n/locales/en.ts` | `studio.animationPlan.*` |
| `src/i18n/locales/nl.ts` | Animatieplan NL parity |
| `docs/studio-animation-planner-reality-audit.md` | **New** |
| `package.json` | Test script entry |

## Wat bewust niet gebouwd is

- Vidu Execution Planner
- New render engine / video provider
- MP4 import
- Timeline editor
- Automatic renders
- Schema / Prisma migrations
- Frame-accurate timeline
- Provider prompt changes

## Wat de volgende sprint moet zijn

1. **Vidu Execution Planner** — map animation plan shots to provider jobs (still no new provider).
2. **Timeline Editor** — visual timeline from animation plan timing.
3. **Motion P1 consumption** — Motion wizard reads `animationPlan` for pre-fill.
4. **Per-shot image creation UX** — link missing start/end poses to Visual Production workflows.
5. **Transition timing** — wire `transitionToNext` into inter-scene animation gaps.

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | ✅ Pass |
| `npx prisma generate` | ✅ Pass |
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ Pass |
| `npm run test` | ✅ **1694/1694** pass (includes 10 animation planner foundation tests) |

Foundation tests cover: story timing, action start/end images, hybrid mixed requirements, football 4+ shots, cooking setup/action/payoff, speed advice, handoff metadata, AI director integration, readiness, i18n hardening parity.
