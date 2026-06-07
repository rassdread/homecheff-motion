# Identity Consumption Consolidation Report

## Welke rapportgaten zijn opgelost

| Gap (Identity Consumption Layer Report) | Status |
| --- | --- |
| Prompt body consolidation | **Opgelost** — prompt builders gebruiken `sourceEntities`, world identity via `buildWorldIdentityPromptContext`, character/location/prop via visual-hints prompt context |
| Consistency analyzers op visual-hints phrases | **Opgelost** — `studio-identity-consistency-phrases.ts` voedt alle vier analyzers |
| Client-side world memory stub fix | **Opgelost** — `resolveWorldProfilePick` haalt volledige world data uit `worlds` library |
| Per-scene identity in Scene Director UI | **Opgelost** — `StudioSceneIdentityConsumptionSummary` in Director V2 panel |

Extra consolidatie (prioriteit 5–6):

- AI suggestion rationales gebruiken gedeelde `identityConsumptionRationaleKeyForKind` keys
- Volledige NL/EN i18n voor scene identity UI en rationale copy

## Hoe prompt body consolidation werkt

1. `PromptBuilderInput` accepteert optioneel `sourceEntities` (characters, locations, props, worlds) en `sceneDetail`.
2. `buildPromptSections`:
   - **World** → `buildScenePromptIdentitySection` → `buildWorldIdentityPromptContext` per linked world
   - **Characters** → `buildCharactersPrompt` met `buildCharacterIdentityPromptContext`
   - **Location / props** → bestaande builders met source entities (nu wired in `buildPromptSections`)
3. `buildScenePromptFromInput` body bevat nu `identity`, entity sections, **continuity**, en quality — geen parallelle world prompt context meer buiten visual-hints.

Client preview: `studioSceneDetailToPromptInput(scene, style, director, { sourceEntities })` geeft dezelfde identity-regels als server wanneer libraries beschikbaar zijn.

## Hoe consistency analyzers visual hints gebruiken

`studio-identity-consistency-phrases.ts`:

- Converteert memory snapshots → identity specs → `build*IdentityVisualProductionLines`
- Extraheert phrases via `identityPhrasesFromVisualLines` + `memoryPhrases`
- `mergeConsistencyPhrases` combineert legacy memory strings met visual-hints phrases (geen breaking change)

Geüpdatet: `analyze-character-consistency`, `analyze-location-consistency`, `analyze-prop-consistency`, `analyze-world-consistency`.

## Hoe client/server world memory is gelijkgetrokken

**Voorheen:** `sceneDetailToMemoryBundle` stubde `worldProfile` met lege `description`, `visualStyle`, `tone`, `continuityRules`.

**Nu:** `resolveWorldProfilePick(worldProfileId, summary, worlds)` zoekt volledige `StudioWorldProfileListItem` in de library. Geen stub met lege velden — `null` als library entry ontbreekt.

Server pad (`buildSceneMemoryBundleFromSceneRow`) ongewijzigd; client preview matcht server wanneer worlds geladen zijn (workspace shell, storyboard editor).

## Hoe per-scene identity context zichtbaar is

`StudioSceneIdentityConsumptionSummary` in `StudioDirectorPanelV2` (Story-tab / Director V2):

- Titel: **Gebruikt in deze scène** / **Used in this scene**
- Compacte blokken: Wereld, Personages, Locatie, Props
- Belangrijkste identity-regels (visual lines)
- **Aanbevolen omdat** rationales per asset

Niet als debug/metadata — user-facing copy via i18n.

## Welke bestanden zijn aangepast

**Nieuw:**

- `src/lib/studio-identity-prompt-context.ts`
- `src/lib/studio-identity-consistency-phrases.ts`
- `src/lib/studio-identity-consumption-consolidation.test.ts`
- `src/components/studio/studio-scene-identity-consumption-summary.tsx`
- `docs/studio-identity-consumption-consolidation-report.md`

**Gewijzigd:**

- `src/types/studio-prompt-builder.ts`
- `src/lib/studio-prompt-builder.ts`
- `src/lib/studio-prompt-character-builder.ts`
- `src/lib/studio-scene-to-prompt-input.ts`
- `src/lib/studio-identity-consumption.ts`
- `src/lib/analyze-*-consistency.ts` (4 bestanden)
- `src/lib/studio-asset-evolution.ts`
- `src/components/studio/director-v2/studio-director-panel-v2.tsx`
- `src/components/studio/studio-scene-composer.tsx`
- `src/components/studio/studio-scene-prompt-preview.tsx`
- `src/components/studio/studio-workspace-shell.tsx`
- `src/components/studio/studio-sortable-scene-card.tsx`
- `src/components/studio/studio-storyboard-editor.tsx`
- `src/i18n/locales/en.ts`, `src/i18n/locales/nl.ts`

## Wat bewust niet gebouwd is

- Geen nieuwe identity engine, builders, schema migraties, providers
- Geen image generation, render strategy planner, timeline editor
- Geen nieuwe AI-systemen of consistency score engine
- Geen wijziging aan server Prisma prompt service (gebruikt al volledige scene rows)

## Wat de volgende sprint moet zijn

**Render Strategy Planner** — kan nu veilig bouwen op:

- Geconsolideerde prompt identity context
- Consistency analyzers aligned met visual production phrases
- Client/server world memory parity
- Per-scene identity zichtbaar voor directors

Aanbevolen focus: render strategy inputs lezen van `buildSceneIdentityConsumption` + prompt sections zonder nieuwe identity laag.

## Tests/build status

- `npx prisma validate` — OK
- `npx prisma generate` — OK
- `npm run lint` — OK (0 errors)
- `npm run build` — OK
- `npm run test` — **1644/1644 pass** (incl. `studio-identity-consumption-consolidation.test.ts`)
