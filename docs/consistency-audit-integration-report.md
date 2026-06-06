# Consistency Audit & Integration Report

## Gevonden bestaande systemen

Zie volledige audit: [`docs/studio-consistency-reality-audit.md`](studio-consistency-reality-audit.md)

Kernbevinding: Studio heeft **15+ readiness/quality helpers** verdeeld over workspace insights rail, visual tab, director cards, classic production center, movie builder en Motion QA. Geen monolith — wel genoeg om te hergebruiken.

Belangrijkste orchestrator: `buildStudioProductionInsights` (story health + render readiness + character metadata consistency + motion quality).

## Wat is hergebruikt

| Helper | Domein |
|--------|--------|
| `buildStudioProductionInsights` | Verhaal, render, personage-metadata, motion quality input |
| `buildSceneImageReadiness` | Beeld |
| `enrichVisualProductionSummary` | Beeld consistency score |
| `analyzeSceneImagePlanner` warnings | Locaties, props, personage-continuity |
| `buildCharacterConsistencySummary` | Personages |
| `analyzeVoiceDirector` + `buildVoiceIdentityPlan` | Stem |
| `buildMusicDirectorPlan` + `buildSoundDirectorPlan` | Audio |
| `buildRenderReadinessSummary` | “Klaar om video te maken?” |

## Wat is gekoppeld

Nieuwe **Consistentie / Consistency** tab in Studio workspace:

- `buildStudioConsistencyOverview` — dunne adapter, geen nieuwe scoring engine
- `StudioWorkspaceConsistencyPanel` — overall score, render readiness kaart, 8 domeinkaarten met “Open tab” navigatie
- Tool id `consistency` in strip na Visueel

## Wat bewust niet opnieuw gebouwd is

- Geen nieuwe consistency engine
- Geen schema migratie
- Geen nieuwe providers
- Geen vision-based consistency in workspace (blijft classic + Motion)
- Production center (16 lanes) niet gemigreerd
- Insights rail niet verwijderd (complementair: scène-context + suggestions)

## Welke bestanden zijn aangepast

| Bestand | Rol |
|---------|-----|
| `src/lib/studio-consistency-overview.ts` | **Nieuw** — adapter |
| `src/lib/studio-consistency-overview.test.ts` | **Nieuw** — tests |
| `src/components/studio/studio-workspace-consistency-panel.tsx` | **Nieuw** — UI tab |
| `src/lib/studio-tool-id.ts` | `consistency` tool |
| `src/components/studio/studio-tool-strip.tsx` | Tab label |
| `src/components/studio/studio-tool-placeholder-panel.tsx` | Title key |
| `src/components/studio/studio-workspace-tool-panel.tsx` | Panel branch |
| `src/i18n/locales/nl.ts` | NL copy |
| `src/i18n/locales/en.ts` | EN copy |
| `package.json` | Test script registration |
| `docs/studio-consistency-reality-audit.md` | Audit |
| `docs/studio-consistency-integration-plan.md` | Plan |
| `docs/consistency-audit-integration-report.md` | Dit rapport |

## Wat nog P2 is

- Vision-based character consistency in workspace tab
- Eén gedeelde readiness threshold across render/visual/proposal stacks
- Production page retirement
- Insights rail render readiness deduplicatie (nu bewust parallel)
- E2E smoke voor Consistency tab
- Inline “fix” acties vanuit domeinkaarten (nu alleen navigatie)

## Tests/build status

- **Lint:** passed (0 errors)
- **Build:** passed
- **Tests:** 1531/1531 passed

Nieuwe tests: `src/lib/studio-consistency-overview.test.ts` (3 tests). Ook geregistreerd: `src/lib/studio-visual-production.test.ts` (6 tests).
