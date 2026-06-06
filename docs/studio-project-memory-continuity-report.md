# Project Memory & Continuity Report

Sprint: **Studio V2 — Project Memory & Continuity** (reuse existing universe, no new providers).

## Welke bestaande systemen zijn hergebruikt

| Systeem | Rol |
|--------|-----|
| Character / Location / Prop / World libraries | Bron voor hergebruik en matching |
| `scoreAssetMatch` / `tokenizeForAssetMatch` | Idee → bibliotheek matching |
| `buildStudioConsistencyOverview` | Basis voor continuity score (60%) |
| `buildDirectorProposal` + enrichment | AI Director voorstellen met memory boost |
| `StudioAiSuggestionCard` | Hergebruik- en memory-cards |
| Prisma join tables (`StudioSceneCharacter`, scene `locationId`, `StudioSceneProp`) | Cross-storyboard usage zonder schema migratie |
| `AnimationProject.studioSourceStoryboardId` | Render- en campagne-telling per asset |

## Hoe continuïteit wordt bepaald

**API:** `GET /api/studio/project-memory` → `buildStudioProjectMemory()`

Per asset (character, location, prop, world):

- `storyboardCount` — in hoeveel videoverhalen gebruikt
- `sceneCount` — totaal scènes
- `renderCount` — gekoppelde Motion-renders
- `campaignCount` — distinct `projectType` op die renders (informatief)

**Continuity score:** `buildProjectContinuityScore()` — 60% bestaande consistency overview + 40% reuse alignment (hergebruikte assets / gekoppelde assets in huidig verhaal).

## Hoe AI Director bestaande assets herkent

1. **Memory boost** bij asset scoring (`memoryBoostForAsset`) — vaker gebruikte assets scoren hoger.
2. **`detectRecurringCharacter` / `detectRecurringLocation`** — naam, tokens, stem, wereld, prior usage.
3. **Vóór `suggestNewAsset`** — recurring match → `characterRefs` / `locationRef` i.p.v. nieuw voorstel.
4. **`buildDirectorMemorySuggestions`** — preview cards met basis (personage/locatie/wereld) + usage stats.
5. **`applyDirectorMemorySuggestion`** — gebruiker kiest “Gebruik bestaand” (in-memory, geen auto-save).

## Hoe hergebruik wordt voorgesteld

| Surface | Gedrag |
|---------|--------|
| **Continuïteit-tab** | Bibliotheek per categorie + score + aanbevolen hergebruik + Open |
| **AI Director preview** | Memory cards + Gebruik bestaand |
| **Mobile insights rail** | Top recurring matches + link naar Continuïteit-tab |
| **Consistency execution cards** | Ongewijzigd; continuity is complementair |

## Welke bestanden zijn aangepast

**Nieuw**

- `src/types/studio-project-memory.ts`
- `src/server/studio/studio-project-memory-service.ts`
- `src/app/api/studio/project-memory/route.ts`
- `src/lib/studio-project-memory-client.ts`
- `src/lib/studio-project-memory-utils.ts`
- `src/lib/studio-recurring-asset-detection.ts`
- `src/lib/studio-project-continuity-score.ts`
- `src/lib/studio-director-proposal-memory.ts`
- `src/components/studio/studio-workspace-continuity-panel.tsx`
- `src/lib/studio-project-memory.test.ts`
- `docs/studio-project-memory-continuity-report.md`

**Gewijzigd**

- `src/lib/studio-tool-id.ts` — tool `continuity`
- `src/lib/studio-director-proposal-builder.ts` — memory-first asset assignment
- `src/types/studio-director-proposal.ts` — `memorySuggestions`
- `src/components/studio/studio-director-proposal-flow.tsx`
- `src/components/studio/studio-workspace-shell.tsx`
- `src/components/studio/studio-workspace-tool-panel.tsx`
- `src/components/studio/studio-tool-strip.tsx`
- `src/components/studio/studio-tool-placeholder-panel.tsx`
- `src/components/studio/studio-production-insights-rail.tsx`
- `src/components/studio/studio-mobile-insights-sheet.tsx`
- `src/i18n/locales/nl.ts`, `en.ts`
- `package.json`

## Wat bewust niet opnieuw gebouwd is

- Geen memory graph / continuity engine / registry
- Geen voice cloning, STT, MP4 upload, timeline editor
- Geen schema migraties
- Geen nieuwe providers
- Geen automatische storyboard-wijzigingen

## Wat nog P2 is

- **Props recurring detection** in Director flow (characters + locations vandaag)
- **“Maak nieuw”** expliciete knop naast elke memory card (nu: implicit via niet-toepassen)
- **Campaign labels** — nu `projectType`-count, geen echte campagne-entiteit
- **Cross-user / team universe** — alleen owner-scoped
- **Apply memory fix** direct op storyboard vanuit Continuïteit-tab (nu: open asset tab)

## Tests/build status

| `npm run lint` | Pass (0 errors) |
| `npm run build` | Pass |
| `npm run test` | **1541/1541** pass (+5 memory tests) |
