# Asset Evolution Reality Audit

## Wat bestaat al

| Systeem | Bestand | Rol |
|---------|---------|-----|
| Director proposal builder | `studio-director-proposal-builder.ts` | `assignAssetsToScene`, token matching, memory boost |
| Proposal memory | `studio-director-proposal-memory.ts` | Recurring reuse suggestions, `memoryBoostForAsset` |
| Recurring detection | `studio-recurring-asset-detection.ts` | Character/location/world matches + usage stats |
| Project memory | `studio-project-memory-service.ts` | Cross-storyboard usage per asset kind |
| Continuity score | `studio-project-continuity-score.ts` | Library sections, `inCurrentProject` |
| Readiness fixes | `studio-consistency-fix-suggestions.ts` | Library-backed character/location/world picks |
| Proposal enrichment | `studio-director-proposal-enrichment.ts` | Gap suggestions on proposal |
| Proposal apply | `studio-director-proposal-apply.ts` | Links existing IDs only (`mode: assets`) |
| Asset picker / create | `studio-workspace-asset-picker.tsx`, `studio-workspace-asset-create-sheet.tsx` | Manual link/create |
| Director proposal UI | `studio-director-proposal-flow.tsx` | Full story proposal + memory cards |

Types: `ProposedAssetRef`, `ProposedNewAsset`, `DirectorProposalMemorySuggestion` in `studio-director-proposal.ts`.

## Wat overlapt

1. **Token scoring** — `scoreAssetMatch` in builder vs fix-suggestions vs enrichment
2. **Reuse suggestions** — continuity panel, proposal memory, production insights rail (partial)
3. **Gap detection** — visual summary counts, unified readiness, proposal enrichment
4. **Usage boost** — `memoryBoostForAsset` (+15 cap) vs recurring `usageBoost` (+20 cap)
5. **Flow mappers** — multiple scene→input converters

## Wat ontbreekt (vóór sprint)

- Geen **tri-state overview** (present / recommended / missing) per kind
- Geen **centrale Asset Evolution API**
- Props **second-class** (geen recurring prop, geen continuity library section)
- Proposal vs storyboard vs memory **drie silo's** zonder merge
- Visual production: "beeld ontbreekt" zonder **waarom** (welk asset ontbreekt)
- Shot planner: geen koppeling shot → vereist asset
- Geen compare UI voor **assets alleen** (wel full director proposal)

## Welke systemen ongebruikt zijn

- `DirectorProposalMemorySuggestion.kind` prop/voice/style — type bestaat, wordt niet geproduceerd
- `detectRecurringWorld` — alleen via bulk `findRecurringMatchesForIdea`
- Props in `buildContinuityLibrarySections` — geen props-sectie
- `memoryBoostForAsset` voor props/worlds — signature wel, builder gebruikt alleen characters/locations
- Production insights rail — lege locations/props/worlds bij recurring call

## Aanbeveling (uitgevoerd)

Eén laag `studio-asset-evolution.ts` die present/recommended/missing aggregeert zonder auto-create.
