# Action To Shot Distribution Reality Audit

## Welke shot/planning data al bestaat

| Systeem | Data |
|---------|------|
| `buildAutoShotPlan` | Per-scene shot type, camera movement, arc phase |
| `buildSceneShotBeats` | opening / focus / detail / closing beats with shot types |
| `StoryboardShotPlan` | Camera flow, motion progression, pacing seconds |
| Render Strategy | `suggestedShotSplitting` (raw action fragments) |
| Character Capabilities | Action classification, shot hints |

## Welke action data al bestaat

| Bron | Functie |
|------|---------|
| `extractActionSteps()` | Sequential split + verb extraction |
| `buildSceneActionChain()` | **NEW** — ordered steps with labels |
| `classifySceneActions()` | supported / possible / unusual |
| `buildCharacterCapabilities()` | Expected actions per character |

## Waar distributie al impliciet gebeurt

- **Render Strategy** `buildShotSplitSuggestions` — split on comma/verb steps (no beat roles)
- **Shot Planner** — detail beat for cooking; tracking for sports (capability hints)
- **Visual Production** — actionCapabilityHints (no beat structure)

## Wat ontbrak (pre-sprint)

- Ordered action chain with semantic step IDs (ball_control, juggle, shoot, …)
- Beat roles: opening / setup / action / payoff / closing
- Duration advice on total action plan vs scene duration
- Image role mapping: start_pose / action_pose / payoff_pose / end_pose
- Missing supporting asset detection per action chain
- Unified UI section “Actie-opbouw” / “Action sequence”

## Sprint resolution

- `buildSceneActionChain()` + `buildActionShotDistribution()`
- Render Strategy consumes distributions for shot splits + warnings
- Visual Production + Consistency show distribution readiness
- AI Director proposal preview with use/keep (preview only)
