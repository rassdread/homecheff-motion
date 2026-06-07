# Vidu Execution Reality Audit

## Welke execution paden al bestaan

| Pad | Motion instantMode | Vidu API (internal) | Job unit |
|-----|-------------------|---------------------|----------|
| Story / multiframe | `story` | `/ent/v2/multiframe` | 1 transition row, N images |
| Transition / start-end | `transition` | `/ent/v2/start-end2video` | N−1 transition rows |

**Key files:** `animation-jobs/service.ts`, `instant-premium/story-mode-transitions.ts`, `video-providers/vidu.ts`, `instant-premium-mode-types.ts`

## Welke data Motion nu verwacht

- `PersistedWizardState.instantMode` (today hardcoded `"story"` on Studio import)
- `AnimationTransition` rows with image URLs (`previewUrl` / `viduInputUrl`)
- `studioHandoffJson` with execution prompts (`resolveExecutionPromptsBySceneIndex`)
- Scene images mapped via `mapHandoffSceneToPersistedImage`
- Optional `audioMixPlan` on handoff payload

## Welke animationPlan data al past

| Animation plan | Execution mapping |
|----------------|-------------------|
| `recommendedStrategy: story` | → `story_video` → one multiframe job |
| `recommendedStrategy: action_chain` | → `action_chain` → start/end jobs per beat |
| `recommendedStrategy: hybrid` | → `hybrid` → story segments + action segments |
| Per-shot timing | Job `durationSeconds` |
| `requiredImageRole` | Input image role (start/end/scene still) |
| `missingImage` | Missing requirement + fallback |
| `renderModeHint` | Hybrid segment classification |

## Welke gaps bestaan (pre-sprint)

- No `buildViduExecutionPlan()` orchestrator
- Motion import ignores `renderStrategyPlan.internalInstantMode` and `animationPlan`
- `sanitizeMotionHandoffForStorage` omits planner metadata from persisted JSON
- No user-facing execution plan UI
- No fallback guidance when end images missing for action chain

## Wat Vidu Execution Planner moet samenbrengen

One `buildViduExecutionPlan()` that maps animation + render strategy → job list, missing requirements, warnings, fallback, readiness — **planning only**, no render start.
