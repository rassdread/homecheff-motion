# Scene Generation Orchestrator Foundation Report

## Reality Audit

See [`docs/scene-generation-orchestrator-reality-audit.md`](./scene-generation-orchestrator-reality-audit.md).

## Welke bestaande systemen zijn hergebruikt

- `buildStudioAnimationPlan` — shot list + `requiredImageRole` + `missingImage`
- `buildStudioRenderStrategyPlan` — strategy (story/action/hybrid)
- `buildStoryboardActionShotDistribution` — beat roles + image status
- `buildStoryboardAssetEvolution` + `buildVisualProductionAssetGaps` — missing assets
- `sceneHasCompletedImage` — present detection
- Production / Visual / Director / Motion handoff patterns

## Hoe het generation plan werkt

`buildSceneGenerationPlan(input)` composes planners (no DB writes, no generation):

**Output:** `requiredImages`, `recommendedImages`, `optionalImages`, `generationSteps`, `missingAssets`, `recommendations`, `readiness`, `directorContextLines`.

## Hoe image classification werkt

| Rol | Story | Action chain | Hybrid |
|-----|-------|--------------|--------|
| `scene_still` / start | Required | Required | Required |
| `end_frame` / `end_pose` | Recommended | Required | Recommended |
| `action_pose` / `payoff_pose` | — | Recommended | Recommended |

Status: `present` | `missing` | `blocked` (missing character/location).

## Hoe generation order werkt

1. Required missing → step 1  
2. Recommended missing → step 2  
3. Per item `orderIndex` by priority → scene order → shot index  

## Hoe asset dependencies werken

Per image item: linked characters, location, props from scene + action chain `missingSupportingAssets`. Blocked when character/location missing.

## Hoe action image requirements werken

Action distribution beats → animation shots → orchestrator items with pose roles and beat labels.

## Hoe Visual Production aansluit

`StudioSceneGenerationPlanSummary` on Visual tab — required/recommended/order/missing assets + Open Visual / Open library actions.

## Hoe Production Planner aansluit

`generationPlanning` summary on production plan + compact generation summary panel + “before render” copy.

## Hoe AI Director aansluit

Proposal includes `generationPlan` + `generationPlanPreview` (ordered missing images). Preview section in director flow.

## Hoe Motion Readiness aansluit

Handoff V50 `sceneGenerationPlan` slim metadata; execution prefill uses `readyToRender` + required missing warnings.

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/types/studio-scene-generation-plan.ts` | **New** |
| `src/lib/studio-scene-generation-orchestrator.ts` | **New** — `buildSceneGenerationPlan()` |
| `src/lib/studio-scene-generation-plan-handoff.ts` | **New** |
| `src/lib/studio-scene-generation-orchestrator-foundation.test.ts` | **New** |
| `src/components/studio/studio-scene-generation-plan-summary.tsx` | **New** UI |
| `src/types/studio-production-plan.ts` | `generationPlanning` |
| `src/lib/studio-production-planner.ts` | Consumes orchestrator |
| `src/lib/studio-animation-planner.ts` | Optional production plan (break cycle) |
| `src/types/motion-handoff-payload.ts` | V50 `sceneGenerationPlan` |
| `src/server/studio/create-motion-handoff-payload.ts` | Attach plan |
| `src/lib/motion-handoff-execution-prefill.ts` | Generation readiness |
| `src/types/studio-director-proposal.ts` | `generationPlan` |
| `src/lib/studio-director-proposal-builder.ts` | Attach plan |
| `src/components/studio/studio-workspace-production-plan-panel.tsx` | UI |
| `src/components/studio/studio-workspace-visual-production-panel.tsx` | UI |
| `src/components/studio/studio-director-proposal-flow.tsx` | Preview |
| `src/i18n/locales/en.ts`, `nl.ts` | `studio.generationPlan.*` |

## Wat bewust niet gebouwd is

- Image generation / auto-create
- Automatic renders / Motion execution
- Schema migrations / multi-image DB model
- Timeline editor / new providers
- Persisting full plan in DB

## Wat de volgende sprint moet zijn

**P1:** Role-aware scene image generation API (`imageRole`, beat index on `StudioSceneImage`).  
**P2:** Expand wizard/Motion slots for per-beat images.  
**P3:** Unified readiness — single missing count across production/animation/orchestrator.

## Tests/build status

| Check | Status |
|-------|--------|
| `npm run build` | Pass |
| `npm run test` | **1720/1720** pass |

Orchestrator tests: story/action ordering, asset deps, production planner, director proposal, legacy empty storyboard.
