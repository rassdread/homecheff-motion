# Asset Proposal & Evolution Report

## Welke bestaande systemen zijn hergebruikt

- **`buildDirectorProposal`** / **`assignAssetsToScene`** — AI asset matching
- **`findRecurringMatchesForIdea`** — hergebruik uit project memory
- **`buildReadinessFixActions`** — library-backed aanbevelingen
- **`collectProposalSceneAssets`** — proposal asset aggregatie
- **`applyDirectorProposal` (`mode: assets`)** — bestaande koppeling, geen auto-create
- **`buildStudioUnifiedReadiness`** — consistency (geen nieuwe score)
- **`buildVisualProductionAssetGaps`** — visual production redenen
- **`buildShotPlannerAssetAdvice`** — shot → asset advies
- **`analyzeAssetEvolutionContinuity`** — continuity advies-only

## Welke dubbele systemen zijn samengebracht

- **`studio-asset-evolution.ts`** centraliseert present/recommended/missing per kind
- Continuity, consistency, visual, shot planner consumeren **dezelfde helpers**
- Asset proposal compare deelt **`buildDirectorProposal`** met director flow (geen parallelle matcher)

Niet samengevoegd (bewust): proposal enrichment, recurring detection internals, asset picker/create sheet.

## Hoe asset voorstellen werken

1. Heuristic matching + memory boost (bestaand)
2. **`buildStoryboardAssetEvolution`** — huidige storyboard → ✓ ⚠ ✚ per kind
3. **`buildAssetEvolutionFromProposal`** — AI proposal → linked + new suggestions
4. **`buildAssetEvolutionCompare`** — huidig vs AI
5. Apply: gebruiker klikt **Gebruik voorstel** → `applyDirectorProposal` assets mode
6. New assets (`ProposedNewAsset`) blijven **missing** — gebruiker opent bibliotheek of maakt nieuw

## Hoe AI Director dit gebruikt

- **`StudioWorkspaceAssetEvolutionPanel`** op Story-tab
- Genereert proposal via `buildDirectorProposal`
- Compare modal: huidig vs AI per personages/locaties/props/wereld
- Knoppen: Gebruik voorstel, Open bibliotheek, Maak nieuw

## Hoe Continuity dit gebruikt

- **`analyzeAssetEvolutionContinuity`** — ontbrekende recurring assets, scènes zonder character/location
- Advies-only sectie in continuity panel

## Hoe Project Memory dit gebruikt

- Usage stats (`storyboardCount`, `renderCount`) op recommended entries
- Recurring detection threshold (≥2 storyboards voor continuity recurring advice)
- Bestaande `StudioProjectMemorySnapshot` — geen migratie

## Hoe Visual Production dit gebruikt

- Sectie **Missing images — asset gaps** wanneer beeld ontbreekt door missing character/location

## Welke bestanden zijn aangepast

**Nieuw:**

- `src/types/studio-asset-evolution.ts`
- `src/lib/studio-asset-evolution.ts`
- `src/lib/studio-asset-evolution-foundation.test.ts`
- `src/components/studio/studio-workspace-asset-evolution-panel.tsx`
- `docs/studio-asset-evolution-reality-audit.md`
- `docs/studio-asset-proposal-evolution-report.md`

**Gewijzigd:**

- `src/components/studio/studio-workspace-shell.tsx`
- `src/components/studio/studio-workspace-visual-production-panel.tsx`
- `src/components/studio/studio-workspace-shot-planner-panel.tsx`
- `src/components/studio/studio-workspace-continuity-panel.tsx`
- `src/components/studio/studio-workspace-consistency-panel.tsx`
- `src/lib/studio-consistency-overview.ts`
- `src/i18n/locales/en.ts`, `nl.ts`
- `package.json`

## Wat bewust niet gebouwd is

- Automatische asset-creatie
- Automatische asset-koppeling zonder gebruikersactie
- Nieuwe AI provider
- Schema migratie
- Props recurring detection (P2)
- Bridge ProposedNewAsset → create sheet prefill (P2)

## Wat P2 blijft

- Props als first-class in recurring + continuity library
- Unified usage boost formule
- Create sheet prefill vanuit proposal missing entries
- Asset evolution timeline (versiegeschiedenis)

## Tests/build status

| Check | Status |
|-------|--------|
| `npm run lint` | Pass (0 errors, 150 warnings — pre-existing) |
| `npm run typecheck` | Fail — pre-existing orphans in `studio-voice-identity-sprint.test.ts` (niet door deze sprint) |
| `npm run build` | Pass |
| `npm run test` | **1588/1588 pass** (incl. 8 asset evolution foundation tests) |
