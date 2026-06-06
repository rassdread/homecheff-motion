# Shot Planner Reality Audit

## Wat bestaat al

| Systeem | Bestand | Rol |
|---------|---------|-----|
| Auto shot plan | `src/lib/studio-auto-shot-planner.ts` | Arc-fase → shotType, cameraMovement, sceneEnergy per scène |
| AI Director direction | `src/lib/studio-ai-director-direction.ts` | Prompt interpretatie + strength + quality scores |
| Story arc | `src/lib/studio-story-arc.ts` | opening → outro fase per scène-index |
| Story flow | `src/lib/studio-story-flow-analyzer.ts` | Shot diversity, streak warnings, camera timeline |
| Story intelligence | `src/lib/studio-story-intelligence.ts` | Arc + plan + flow + energy curve |
| Scene director | `src/lib/studio-scene-director.ts` | Canonieke shot/movement/energy enums + prompts |
| Director proposal | `src/lib/studio-director-proposal-builder.ts` | Volledig voorstel incl. shot plan |
| Visual production | `src/lib/studio-visual-production-summary.ts`, `studio-scene-image-planner.ts` | Image readiness, camera framing |
| Motion instructions | `src/lib/build-studio-scene-motion-instructions.ts` | Vidu motion uit shot + blocking |
| Production readiness | `src/lib/studio-production-center.ts`, `studio-unified-readiness.ts` | Checklist + render soft warnings |
| Classic UI | `studio-ai-director-panel.tsx`, `studio-shot-plan-modal.tsx`, `studio-story-intelligence-panel.tsx` | Compare + apply shot plan |
| Director V2 | `director-v2/sections/director-section.tsx`, `studio-director-v2-story-purpose.ts` | Per-scène suggest + story purpose patches |
| DB velden | `StudioScene.shotType`, `cameraMovement`, `sceneEnergy`, `camera`, `durationSeconds` | Geen aparte shot-tabel |

## Wat wordt niet gebruikt

- `energyFromArcPhase` (`studio-energy-curve.ts`) — geëxporteerd, nergens aangeroepen
- `planForArcPhase` — alleen intern in auto-shot planner
- Story health score past shot plan **niet** automatisch aan na berekening
- Director proposal roept `analyzeSceneImagePlanner` niet aan tijdens generatie
- `transition` arc-fase heeft geen dedicated transition-planner (alleen `transitionToNext` string)

## Wat dubbel is

1. **`storyboardToFlowInput`** — canoniek in `studio-movie-director-quality.ts`; kopieën in AI Director / intelligence panels
2. **`PURPOSE_PATCHES`** (Director V2) vs **`BASE_PHASE_PLANS`** (auto-shot) — zelfde intentie, andere taxonomie
3. **Legacy `camera` + `shotType`** — dual storage overal
4. **`buildAutoShotPlan`** — meerdere keren apart aangeroepen i.p.v. één gedeelde laag (opgelost in deze sprint)
5. **Classic vs workspace panels** — AI Director compare bestond al; workspace miste beat-niveau shot plan

## Wat ontbreekt (vóór sprint)

- Geen **opening / focus / detail / closing** beats per scène als first-class model
- Geen **gedeelde Shot Planner API** voor Director, Visual, Consistency, Memory
- Workspace Visual-tab toonde geen camera/shot/motion flow samenvatting
- Project Memory trackte geen terugkerende shot/camera patronen
- Geen expliciet shot-plan advies in Consistency overview (alleen flow warnings indirect)

## Aanbeveling (uitgevoerd in foundation sprint)

Eén laag `studio-shot-planner.ts` als bron van waarheid; bestaande DB-velden behouden; beats computed; apply via bestaande scene PATCH APIs.
