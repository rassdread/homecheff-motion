# Production Memory & Learning Foundation Report

## Reality Audit

Zie [production-memory-reality-audit.md](./production-memory-reality-audit.md).

## Welke systemen al bestonden

- Project Memory (`buildStudioProjectMemory`)
- Continuity score + Continuity panel
- Recurring asset detection
- Director memory suggestions
- Production Brief, Production Planner, Scene Generation Orchestrator, Render Strategy Planner

## Welke productie-data wordt gebruikt

- **Uitgebreid:** `StudioProjectMemorySnapshot.productionRecords` — per storyboard: duur, shots, scenes, renderstrategie (uit Motion instantMode), voice/audio styles, wereld/personage-koppelingen, CTA-detectie
- **Bestaand:** asset usage, voices, styles, shotPatterns, narration/library audio

## Hoe Production Memory werkt

`buildProductionMemoryProfile({ memory, currentIdea?, libraries? })` in `src/lib/studio-production-memory-profile.ts`:

1. Leest `productionRecords` + bestaande memory-velden
2. Berekent gemiddelden (duur, shots, scenes)
3. Detecteert promo-patronen heuristisch (HomeCheff, Garden, Designer, Affiliate, Sports)
4. Groepeert terugkerende stijlen, werelden, renderstrategieën, duur/shot buckets
5. Bouwt optioneel **creation guidance** voor het huidige idee
6. Output: advies-only — **nooit mutatie of blocking**

## Hoe patronen worden herkend

- **Keyword-regex** op title + aiDirectorPrompt + directorProfile (promo types)
- **Frequency thresholds** — minimaal 2 matches voor recurring entries
- **Duration/shot bucketing** — short/medium/standard, compact/balanced/extended
- **Render strategy** — uit Motion `instantMode` (story → story, transition → action_chain)
- **Similar productions** — pattern match of token overlap (≥2 tokens)

## Hoe Production Brief wordt verbeterd

- `buildProductionBrief` voegt memory-aanbevelingen toe aan `recommendations`
- `productionMemoryGuidance` op brief object
- UI: `StudioProductionMemoryPanel` in brief flow

## Hoe AI Director wordt verbeterd

- `buildProductionMemoryContext()` naast project memory
- `productionMemoryContext` op `StudioDirectorProposal`
- `enrichIdeaWithProductionMemory()` in proposal enrichment chain

## Hoe Production Planner wordt verbeterd

- Memory-aanbevelingen gemerged in `plan.recommendations`
- `directorContextLines` uitgebreid met `memory:*` regels

## Hoe Scene Generation wordt verbeterd

- Memory-aanbevelingen voor shot counts en CTA-advies
- `directorContextLines` uitgebreid

## Hoe Voice & Audio Memory werkt

- Hergebruikt `memory.voices`, narration uploads, music/sound styles uit production records
- Toont meest gebruikte stemtypes en audiostijlen in UI — geen generatie

## Welke bestanden zijn aangepast

| Bestand | Rol |
|---------|-----|
| `src/types/studio-production-memory.ts` | Types |
| `src/types/studio-project-memory.ts` | `productionRecords` |
| `src/lib/studio-production-memory-profile.ts` | `buildProductionMemoryProfile()` |
| `src/lib/studio-production-memory-integration.ts` | Planner merge helpers |
| `src/server/studio/studio-project-memory-service.ts` | DB aggregatie production records |
| `src/lib/studio-production-brief-builder.ts` | Brief integratie |
| `src/lib/studio-director-proposal-builder.ts` | Director context |
| `src/lib/studio-production-planner.ts` | Planner advies |
| `src/lib/studio-scene-generation-orchestrator.ts` | Generation advies |
| `src/lib/studio-render-strategy-planner.ts` | Render advies |
| `src/components/studio/studio-production-memory-panel.tsx` | UI |
| `src/components/studio/studio-production-brief-flow.tsx` | Brief UI |
| `src/components/studio/studio-workspace-continuity-panel.tsx` | Continuity UI |
| `src/i18n/locales/en.ts`, `nl.ts` | Volledige NL/EN parity |
| `src/lib/studio-production-memory-foundation.test.ts` | 11 foundation tests |
| `docs/production-memory-reality-audit.md` | Audit |

## Wat bewust niet gebouwd is

- Geen machine learning / AI-training
- Geen automatische plan-wijzigingen of overrides
- Geen nieuwe providers of render engine
- Geen schema-migratie / persistent learning store
- Geen blocking via readiness scores

## Wat de volgende sprint moet zijn

1. Server-side production memory API endpoint (optioneel apart van project memory)
2. E2E: brief → memory guidance → story create
3. Link gerenderde Motion-project metadata terug voor hybrid-strategy inferentie
4. Toon `plan.recommendations` in production plan workspace panel
5. User opt-in: "Start with these defaults" (expliciet, geen auto)

## Tests/build status

Run validation:

```bash
npx prisma validate && npx prisma generate
npm run lint && npm run build && npm run test
```

Foundation tests: `src/lib/studio-production-memory-foundation.test.ts` (11 tests).
