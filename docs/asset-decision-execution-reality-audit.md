# Asset Decision Execution Reality Audit

## Welke keuzes al bestaan

Production Brief UI (`StudioProductionBriefFlow`) toont per asset:
- **Gebruik bestaand** — voor library matches en recurring assets
- **Bouw nieuw** — link naar Identity Builder routes
- **Overslaan** — expliciete skip

Keuzes worden vastgelegd in component state (`assetChoices` → nu `StudioAssetDecisionRegistry`).

## Welke keuzes alleen UI zijn (vóór deze sprint)

| Keuze | Vóór sprint | Probleem |
|-------|-------------|----------|
| use_existing | UI highlight only | Niet doorgegeven aan Director apply |
| build_new | Link + UI state | Geen prefill, geen registry |
| skip | UI highlight only | Asset bleef in recommendations |

Keuzes gingen **verloren** bij:
- Storyboard create (niet mee in API call)
- Page refresh (geen persistence)
- AI Director regenerate (geen registry input)
- Production Planner / Orchestrator (geen filter)

## Welke keuzes al persistent zijn

- **Project Memory** — usage stats van bestaande assets (niet user decisions)
- **Production Insights ignored suggestions** — apart localStorage patroon per storyboard
- **aiDirectorPrompt** — free-text brief, geen structured decisions

## Welke keuzes niet werden toegepast

1. `createStoryboardFromProductionBrief` — ignoreerde asset choices
2. `applyDirectorProposal` — linkte assets via proposal, niet via user choice
3. `buildStudioProductionPlan` — toonde missing/recommended ongeacht skip
4. `buildSceneGenerationPlan` — zelfde asset gaps na skip
5. Asset Evolution — recommendeerde opnieuw na skip

## Welke systemen de keuzes nodig hebben

| Systeem | Nodig voor |
|---------|------------|
| Production Brief Flow | Record + persist decisions |
| createStoryboardFromProductionBrief | Apply bij create |
| buildDirectorProposal | Enforce refs, filter proposed |
| buildStudioProductionPlan | Filter missing/recommended |
| buildSceneGenerationPlan | Filter missingAssets |
| buildStoryboardAssetEvolution | Filter skipped (via planner path) |
| AI Director preview | Toon decision status |
| Identity Builder | Prefill bij build_new |

## Welke systemen overlappen

- **Production Brief asset proposals** vs **Director proposedCharacters** — zelfde entities, verschillende lifecycle
- **Asset Evolution missing** vs **Generation plan missingAssets** — zelfde filter via registry
- **Insights ignored** vs **Asset decision skip** — verschillende scopes (scene suggestion vs project asset)

## Wat de execution-laag moet verbinden

```
User click → applyAssetDecision() → localStorage registry
  → enrichBriefWithAssetDecisions()
  → applyDecisionsToDirectorProposal()
  → buildStudioProductionPlan({ assetDecisionRegistry })
  → buildSceneGenerationPlan({ assetDecisionRegistry })
  → Identity Builder prefill (build_new)
```

Persistence: `localStorage` key `hc-studio-asset-decisions-{storyboardId}` (geen schema migratie).
