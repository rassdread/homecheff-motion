# Production Pattern Intelligence Report

**Date:** 2026-06-06  
**Scope:** Recognize, group, summarize recurring production patterns — no ML, no predictions.

---

## Samenvatting

Studio consolideert terugkerende productiepatronen via **`buildProductionPatternProfile()`** en toont ze in een nieuwe **Patronen / Patterns**-sectie in Production Memory. AI Director krijgt `productionPatternContext`; Production History milestones tonen “Veel gebruikt patroon”.

---

## Hergebruikte systemen

| Systeem | Rol |
|---------|-----|
| `buildProductionMemoryProfile()` | Bron voor types, structures, render, timing |
| `detectProductionTypeFromIdea()` | Huidig productietype uit idee |
| `buildProductionTimeline()` | Basis voor timeline + pattern hints |
| `buildDirectorProposal()` enrichment chain | Pattern context na timeline |
| `StudioProductionMemoryPanel` | Patronen UI-sectie |
| `StudioWorkspaceProductionHistoryPanel` | Milestone pattern hints |

---

## Hoe pattern detection werkt

**Builder:** `src/lib/studio-production-pattern-profile.ts`

**Input:** Production Memory records, Project Memory aggregates, optional current idea

**Output:** `ProductionPatternProfile` met:
- `recurringProductionTypes`
- `recurringStructures`
- `recurringRenderStrategies`
- `recurringWorlds`
- `recurringAssetCombinations`
- `recurringDurations` / `recurringShotCounts`
- `structureSummary`
- `directorContextLines`

Minimum 2 matches voor recurring entries (zelfde drempel als Production Memory).

---

## Production types

Bestaande regex-heuristieken in `PATTERN_SIGNALS` — uitgebreid met Tutorial en Community. `detectProductionTypeFromIdea()` exporteert detectie voor huidig idee.

Types: HomeCheff, Garden, Designer, Affiliate, Sports, Tutorial, Community.

---

## Structure / asset / render patterns

- **Structure:** arc labels + gemiddelde scènes/shots/duur bij ≥2 producties
- **Assets:** character+world pairs uit `productionRecords`, props uit `projectMemory.props`
- **Render:** frequentie story / hybrid / action_chain uit records

---

## Production Memory verbetering

Nieuwe **Patronen**-sectie (niet geschiedenis): productietypes, structuren, timing, render, asset-combinaties, personages, werelden, props. Styles en voices blijven apart.

---

## AI Director verbetering

`buildProductionPatternContext()` → `enrichIdeaWithProductionPattern()` na timeline enrichment. Proposal bevat `productionPatternContext`.

---

## Aangepaste bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/lib/studio-production-pattern-profile.ts` | **Nieuw** — pattern builder + timeline hints |
| `src/types/studio-production-pattern.ts` | **Nieuw** — types |
| `src/types/studio-production-timeline.ts` | `patternHintKey` op milestones |
| `src/types/studio-production-memory.ts` | tutorial/community pattern ids |
| `src/types/studio-director-proposal.ts` | `productionPatternContext` |
| `src/lib/studio-production-memory-profile.ts` | tutorial/community signals + export detect |
| `src/lib/studio-director-proposal-builder.ts` | pattern enrichment |
| `src/components/studio/studio-production-memory-panel.tsx` | Patronen sectie |
| `src/components/studio/studio-workspace-production-history-panel.tsx` | pattern hints |
| `src/components/studio/studio-workspace-continuity-panel.tsx` | props doorgeven |
| `src/i18n/locales/en.ts` / `nl.ts` | pattern keys |
| `src/lib/studio-production-pattern-foundation.test.ts` | **Nieuw** — 12 tests |
| `package.json` | test script entry |

---

## Bewust niet gebouwd

- Machine learning / training
- Voorspellings- of recommendation engines
- Nieuwe AI providers
- Schema migraties
- Nieuwe timeline events
- Nieuwe hoofdtab (Patterns zit in Production Memory)

---

## Volgende sprint

1. Pattern-aware Production Planner defaults (duration/shot from top pattern)
2. Brief pre-fill from proven structure patterns
3. Cross-project pattern aggregation (account level)
4. Pattern confidence UI (high/medium/low badges)

---

## Validatie

Run: `npx prisma validate`, `npx prisma generate`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test`
