# Animation Planner Reality Audit

## Welke timing data al bestaat

| Bron | Data |
|------|------|
| `StudioSceneDetail.durationSeconds` | Per-scene target (default 5s) |
| `buildDurationAdvice()` | Min/max seconds per action step count (4–6s per step) |
| `buildCurrentStoryboardShotPlan()` | `pacingSeconds[]`, per-scene `durationSeconds` |
| `StudioRenderStrategyPlan` | Provider/final duration, speed adjustment |
| `StoryboardActionShotDistribution` | Total min/max seconds, scenes needing split |
| `StudioProductionPlan` | Estimated duration, shot/scene counts |
| Scene `transitionToNext` | Transition text for Motion handoff |
| Audio mix timeline | `musicTransitionType` crossfade/hard_cut |

**Gap (pre-sprint):** No seconds-level shot timing within scenes; no cumulative timeline.

## Welke motion intent data al bestaat

| Bron | Data |
|------|------|
| Shot Planner | `cameraMovement`, `sceneEnergy`, shot beats |
| Action Distribution | Beat roles, step IDs |
| Render Strategy | `actionComplexity`, strategy mode |
| Character Capabilities | Action classification |
| Identity Consumption | World rules, shot bias |
| Scene motion instructions | Execution-oriented handoff text |

**Gap:** No user-facing animation motion intent layer.

## Welke image requirements al bestaan

| Bron | Requirements |
|------|--------------|
| Render Strategy | `scene_still`, `start_frame`, `end_frame` |
| Action Distribution | Pose roles per beat |
| Visual Production | Scene image completion |

**Gap:** No per-shot image requirement tied to animation timing.

## Welke data ontbreekt (pre-sprint)

- Shot-level start/end times within scenes
- Consolidated animation plan
- Motion intent vocabulary for UI
- Animation readiness on Consistency tab
- Animation metadata on Motion handoff
- AI Director animation preview

## Wat Animation Planner moet samenbrengen

One `buildStudioAnimationPlan()` reading production, render strategy, action distribution, shot planner, identity consumption, and scene images — outputting seconds-level timing, motion intent, image requirements, and speed advice (planning only).
