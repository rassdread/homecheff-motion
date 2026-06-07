# Motion Handoff Execution Prefill Reality Audit

## Welke handoff data al bestaat

| Field | Version | Content |
|-------|---------|---------|
| `renderStrategyPlan` | V47 | Strategy, `internalInstantMode`, duration/speed advice |
| `animationPlan` | V48 | Shot timing, image roles, readiness |
| `viduExecutionPlan` | V49 | Execution mode, jobs, fallback, readiness |
| `audioMixPlan` | — | Mix segments, `mixReady` |
| Per-scene images | — | `selectedSceneImageUrl`, `sceneImageReference` |

Full payload at import API time; sanitized `storedHandoff` on wizard omits planner metadata (size cap).

## Welke wizard velden al bestaan

| Field | Role |
|-------|------|
| `instantMode` | `story` \| `transition` |
| `transitionSeconds` | 3 / 5 / 8 |
| `sceneSlots[].text.durationSeconds` | Per-scene timing |
| `durationSec` | Optional total |
| `studioHandoff` | Import metadata + intelligence |

Previously: `instantMode` hardcoded to `"story"` on every Studio import.

## Welke metadata nu genegeerd werd (pre-sprint)

- `viduExecutionPlan.executionMode`
- `renderStrategyPlan.internalInstantMode`
- `animationPlan` scene durations
- Execution warnings and fallback plan
- Missing start/end image signals

## Welke prefill veilig mogelijk is

- Mode preselect (user confirms before import)
- Duration prefill from animation plan
- Warnings and missing image lists (read-only)
- Fallback display (no auto-switch)
- Execution summary on wizard after confirm

Not in this sprint: auto-start Vidu jobs, auto-generate images, breaking wizard step order.
