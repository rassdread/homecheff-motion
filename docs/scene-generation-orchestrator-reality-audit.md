# Scene Generation Orchestrator — Reality Audit

## Welke beeldvereisten al bestaan

| Systeem | Granulariteit | Rollen |
|---------|---------------|--------|
| Render Strategy Planner | Per scène | `scene_still`, `start_frame`, `end_frame` |
| Action To Shot Distribution | Per beat | `start_pose`, `action_pose`, `payoff_pose`, `end_pose` |
| Animation Planner | Per shot | Zelfde rollen + `missingImage` |
| Vidu Execution Planner | Per job input | Frame/pose rollen (planning) |
| Scene image DB | Per scène | Eén gallery — alleen `scene_still` vandaag |

## Welke systemen ontbrekende beelden detecteren

- `sceneHasCompletedImage` — scène-niveau
- Render strategy `imageRequirements` — present/missing/recommended
- Action distribution `imageStatus` per beat
- Animation plan `missingImageCount`
- Visual production readiness checklist
- Motion execution prefill/consumption

## Overlap

- Vier parallelle vocabularies (still/frame/pose/slot)
- Production `imagePlanning` vs animation `missingImageCount` kunnen divergeren
- `recommended` beats tellen niet als missing in action distribution
- Asset evolution vs visual production gaps — zelfde boodschap, andere helpers

## Gaten vóór orchestrator

- Geen geordende generatie-queue
- Geen required/recommended/optional classificatie op één model
- Geen asset-dependencies per beeld-item
- Geen render-klaar op basis van alle shot-rollen

## Wat de orchestrator samenbrengt

`buildSceneGenerationPlan()` normaliseert animation shots → geclassificeerde items → volgorde → steps → readiness → missing assets.
