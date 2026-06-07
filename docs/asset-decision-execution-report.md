# Asset Decision Execution Report

## Reality Audit

See [asset-decision-execution-reality-audit.md](./asset-decision-execution-reality-audit.md).

## Welke keuzes al bestonden

UI buttons in Production Brief for use existing / build new / skip — state-only, not executed downstream.

## Welke keuzes nu worden toegepast

| Mode | Execution |
|------|-----------|
| **use_existing** | Linked in Director proposal; forced on first scene; persisted in registry |
| **build_new** | Marked in registry; Identity Builder prefill via sessionStorage; not auto-created |
| **skip** | Filtered from brief, planner missing items, generation plan gaps |

## Hoe use existing werkt

1. User clicks **Gebruik bestaand**
2. `applyAssetDecision({ mode: "use_existing", existingId })`
3. Registry saved to localStorage
4. `applyDecisionsToDirectorProposal()` adds `characterRefs` / `locationRef` / `propRefs`
5. `applyDirectorProposal(mode: "all")` links existing library IDs to scenes

## Hoe build new werkt

1. User clicks **Bouw nieuw**
2. Decision recorded as `build_new`
3. `storeIdentityBuilderPrefill()` → sessionStorage
4. Navigate to `/studio/characters/new` (or location/prop/world)
5. Form prefilled with name, role, description, personality from brief context
6. User saves manually — no auto-create

## Hoe skip werkt

1. User clicks **Overslaan**
2. Decision recorded as `skip`
3. Asset filtered from:
   - `enrichBriefWithAssetDecisions`
   - Production Planner missing items / asset planning
   - Scene Generation Orchestrator missingAssets
4. Not re-recommended in same session after reload

## Hoe Production Brief aansluit

- `StudioProductionBriefFlow` uses `applyAssetDecision` on each click
- Registry auto-saved via `saveAssetDecisionRegistry`
- `createStoryboardFromProductionBrief` receives `assetDecisionRegistry`
- Migrated to storyboard key on create

## Hoe AI Director aansluit

- `buildDirectorProposal({ assetDecisionRegistry })`
- `buildStudioProductionPlan({ assetDecisionRegistry })`
- Workspace `StudioDirectorProposalFlow` loads registry by storyboard ID

## Hoe Project Memory aansluit

- `use_existing` links real library assets → usage increases after scene apply
- Recurring detection unchanged; skipped assets no longer pushed as missing gaps

## Hoe Scene Generation Orchestrator aansluit

- `buildSceneGenerationPlan({ assetDecisionRegistry })`
- `filterSceneGenerationPlanByDecisions()` removes skipped missing assets

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/types/studio-asset-decision.ts` | Decision types |
| `src/lib/studio-asset-decision-execution.ts` | `applyAssetDecision()` + filters |
| `src/lib/studio-asset-decision-storage.ts` | localStorage persistence |
| `src/lib/studio-identity-builder-prefill-storage.ts` | Build-new prefill |
| `src/lib/studio-asset-decision-execution-foundation.test.ts` | Tests |
| `src/components/studio/studio-production-brief-flow.tsx` | Execution + status badges |
| `src/lib/studio-create-story-from-brief-client.ts` | Registry on create |
| `src/lib/studio-director-proposal-builder.ts` | Registry consumption |
| `src/lib/studio-production-planner.ts` | Filter missing/assets |
| `src/lib/studio-scene-generation-orchestrator.ts` | Filter gaps |
| `src/components/studio/studio-director-proposal-flow.tsx` | Load registry |
| `src/app/studio/characters/new/page.tsx` | Prefill from build_new |
| `src/types/studio-production-brief.ts` | `assetDecisions` field |
| `src/i18n/locales/en.ts`, `nl.ts` | Status labels |

## Wat bewust niet gebouwd is

- No schema migration (localStorage only)
- No auto-create on build_new
- Location/prop/world new pages prefill (character only this sprint)
- Asset Evolution panel UI for decisions (filtered via planner path)
- Cross-device sync of decisions

## Wat de volgende sprint moet zijn

1. Server-side decision snapshot (optional JSON column)
2. Location/prop/world Identity Builder prefill pages
3. Asset Evolution panel decision UI
4. Honor build_new → link new asset back to storyboard after save
5. E2E test for full brief → decision → create flow

## Tests/build status

| Check | Status |
|-------|--------|
| `npm run build` | ✅ |
| `npm run test` | ✅ **1736/1736** |
| Asset decision foundation tests | ✅ 9/9 |
