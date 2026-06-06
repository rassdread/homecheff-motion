# Studio Consistency Execution Report

Sprint: **Studio V2 — Consistency Execution** (suggestion-first wiring, no new engines).

## Welke bestaande systemen zijn hergebruikt

| Systeem | Rol in sprint |
|--------|----------------|
| `buildRenderReadinessSummary` | Render-checks (scenes, images, voice, text beats, emotion) |
| `buildSceneImageReadiness` | Visual-checks (characters, location, world, camera, images) |
| `buildStudioConsistencyOverview` | Domain cards op Consistency-tab |
| `buildStoryHealthAdvisorReport` | Story Health advisories in AI Director preview |
| `buildStudioProductionInsights` | Inspector rail + mobile insights (nu met `unifiedReadiness`) |
| `buildDirectorProposal` + enrichment | AI Director voorstellen verrijkt met library gaps |
| `analyzeVoiceDirector` / voice presets | Stem-aanbevelingen |
| `scoreAssetMatch` / `tokenizeForAssetMatch` | Bibliotheek-matching voor locaties/personages |
| `StudioAiSuggestionCard` | Huidig vs AI-voorstel UI (Consistency, Visual, Director, mobile) |

## Welke readiness-systemen zijn samengebracht

**Centrale adapter:** `buildStudioUnifiedReadiness()` in `src/lib/studio-unified-readiness.ts`

| Bron | Checks |
|------|--------|
| Render readiness (5) | scenes, images, voice, text_beats, emotion |
| Visual production (6) | characters, location, world, camera, emotion, images |
| **Unified (9)** | scenes, characters, location, world, camera, images (AND), voice, text_beats, emotion |

**Soft gates (één waarheid):** score ≥85 ready, ≥55 almost_ready, anders needs_work — zelfde drempels als consistency overview.

**Consumers:** Consistency-tab, Visual-tab, Render-panel, Production Insights rail, AI Director proposal readiness (`unifiedToProposalRenderReadiness`).

## Hoe AI Director consistency gebruikt

1. `buildDirectorProposal` roept `enrichDirectorProposalWithConsistency()` aan na het bestaande voorstel.
2. **Story Health:** top-5 `advisories.messageKey` → preview sectie “Aanbevolen controle”.
3. **Field changes:** from/to preview voor locatie, personages, camera, emotie, stem.
4. **Consistency suggestions:** library-backed gaps (locatie/personage) + unified fix actions.
5. **Gebruiker kiest:** `applyProposalConsistencySuggestion()` vult proposal in-memory; geen auto-save tot “Toepassen”.

## Hoe Visual Production consistency gebruikt

- `buildStudioUnifiedReadiness` fixes gefilterd op visual-gerelateerde checks.
- Sectie “Aanbevolen verbeteringen” vóór bulk-generatie.
- Open-knop naar bestaande toolstrip (`onSwitchTool`).

## Hoe Render consistency gebruikt

- `renderWarnings` uit unified readiness op Render-panel.
- Kop “Mogelijke afwijking” + soft gate copy; render blijft mogelijk.
- Hint: gebruiker kan renderen maar wordt gewezen op risico’s.

## Welke open-fix acties zijn toegevoegd

Via `buildReadinessFixActions()` + `StudioAiSuggestionCard`:

| Probleem | Actie |
|----------|-------|
| Geen locatie | Bibliotheek-voorstel + Open Locaties |
| Geen personage | Bibliotheek-voorstel + Open Personages |
| Geen wereld | Wereld-voorstel + Open Wereld |
| Geen afbeeldingen | Open Visueel |
| Geen stem | Stem-voorstel + Open Stem |
| Camera/emotie/scènes | Open Verhaal / Tekst |

Consistency-tab domain cards: 1-klik “Openen” naar toolstrip.

Mobile: zelfde fix cards in `StudioProductionInsightsRail` (compact) met `onSwitchTool`.

## Welke bestanden zijn aangepast

**Nieuw**

- `src/lib/studio-unified-readiness.ts`
- `src/lib/studio-consistency-fix-suggestions.ts`
- `src/lib/studio-director-proposal-enrichment.ts`
- `src/components/studio/studio-ai-suggestion-card.tsx`
- `src/lib/studio-unified-readiness.test.ts`
- `docs/studio-consistency-execution-report.md`

**Gewijzigd**

- `src/lib/studio-director-proposal-readiness.ts`
- `src/lib/studio-director-proposal-builder.ts`
- `src/lib/studio-production-insights.ts`
- `src/types/studio-director-proposal.ts`
- `src/components/studio/studio-workspace-consistency-panel.tsx`
- `src/components/studio/studio-workspace-visual-production-panel.tsx`
- `src/components/studio/studio-workspace-tool-panel.tsx`
- `src/components/studio/studio-workspace-shell.tsx`
- `src/components/studio/studio-workspace-production-panels.tsx`
- `src/components/studio/studio-director-proposal-flow.tsx`
- `src/components/studio/studio-production-insights-rail.tsx`
- `src/components/studio/studio-mobile-insights-sheet.tsx`
- `src/i18n/locales/nl.ts`, `src/i18n/locales/en.ts`
- `src/lib/studio-production-insights.test.ts`
- `package.json`

## Wat bewust niet opnieuw gebouwd is

- Geen nieuwe consistency/scoring engine
- Geen schema migraties of providers
- Geen auto-save / auto-create / harde render-blokkades
- Geen nieuwe AI Director of render pipeline
- Geen text-diff engine voor lange teksten (P2)

## Wat nog P2 is

- **Text diffs** voor beschrijving, narratie, text beats (side-by-side diff UI)
- **Direct toepassen** van fix actions op storyboard (nu: open tab of apply in Director proposal)
- **Visual/camera AI voorstel cards** met “Gebruik voorstel” op scene-niveau
- **Voice apply** vanuit Consistency-tab (nu open + Director proposal apply)
- **Props/world enrichment** in Director scene gaps (alleen locatie + personage vandaag)
- **E2E** voor suggestion apply flow

## Tests/build status

| Check | Status |
|-------|--------|
| `npm run lint` | Pass (0 errors, pre-existing warnings) |
| `npm run build` | Pass |
| `npm run test` | **1536/1536** pass (+5 unified readiness tests) |

Pre-existing `tsc` issues in unrelated sprint test files remain outside this diff scope.
