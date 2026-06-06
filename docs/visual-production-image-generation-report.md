# Visual Production & Image Generation Report

## Welke systemen zijn hergebruikt

- **`analyzeSceneImagePlanner`** (`studio-scene-image-planner.ts`) — visual concept, prompt exports, continuity warnings en consistency score.
- **`StudioSceneImagePanel`** — enkele scène genereren, huidige afbeelding, geschiedenis en opnieuw genereren.
- **`bulkGenerateStudioSceneImagesApi`** → POST `/generate-scene-images` — bulk generatie zonder nieuw jobsysteem.
- **`sceneHasCompletedImage`** / **`resolveSceneDisplayImage`** — beeldstatus per scène.
- **Bestaande scene metadata** — personages, locatie, props, camera, emotie, wereldprofielen via asset registry in de planner.
- **Style/director profiles** — `normalizeStudioPromptStyleProfile` en `normalizeStudioDirectorProfile` voor consistente prompt-opbouw.

Geen nieuwe providers, schema-migraties of render pipeline.

## Hoe visual concepts werken

De **Visueel**-tab in Studio workspace toont per actieve scène een **Beeldvoorstel** (NL) / **Visual concept** (EN):

| Veld | Bron |
|------|------|
| Personages | `scenePlan.requirements.characterNames` |
| Locatie | `scenePlan.requirements.locationName` |
| Camera | `scenePlan.requirements.cameraFraming` |
| Sfeer | `scenePlan.requirements.visualMood` |
| Belichting | `scenePlan.requirements.timeOfDay` |
| Stijl | `scenePlan.aiSceneDescription` |
| Props | `scenePlan.requirements.objectNames` |

Data komt uit `findSceneVisualPlan`, dat `analyzeSceneImagePlanner` aanroept op basis van opgeslagen scène-data — geen extra AI-call.

## Hoe prompts worden opgebouwd

De beeldprompt wordt getoond via `scenePlan.exports.imageGenerationPrompt` (zelfde builder als classic editor).

Opbouw (bestaand):

- Personages + kleding/continuity keywords
- Locatie + wereldcontext
- Props en objecten
- Camera framing en shot type
- Emotie en arc-fase
- Style/director profile

De textarea in de Visueel-tab is **preview + lokale draft**; generatie gebruikt server-side de opgeslagen scènevelden. Gebruiker past prompts aan via de **Verhaal**-tab (scene-velden) — geen provider-, template- of model-id in de UI.

## Hoe image readiness werkt

Kaart **Klaar om beelden te maken?** (`buildSceneImageReadiness`):

| Check | Criterium |
|-------|-----------|
| Personages | Minstens één scène met gekoppelde personages |
| Locatie | Minstens één scène met locatie |
| Wereld | Wereld via locatie/personage, of locatie als fallback |
| Camera | Shot type of camera op minstens één scène |
| Emotie | Emotie op ≥50% van de scènes |
| Beelden | Alle scènes hebben completed image |

Score = percentage geslaagde checks. Level:

- **Groen (ready)** — score ≥85 én planner readiness `ready`
- **Geel (almost_ready)** — score ≥50 of planner `needs_attention`
- **Rood (needs_work)** — anders

Aanbevelingen komen uit mislukte checks + planner continuity warnings (mascot, locatie-sprong, props, personages).

## Hoe bulk generation werkt

Knop **Beelden genereren voor alle scènes** roept `bulkGenerateStudioSceneImagesApi(storyboardId)` aan.

- Gebruikt bestaande image providers en `/generate-scene-images` endpoint.
- Toont `{ok} van {total} scènes gegenereerd` na afloop.
- Ververs storyboard via `onRefreshStoryboard` zodat review-panel actuele beelden toont.
- Actieve scène wordt apart gegenereerd via embedded `StudioSceneImagePanel`.

## Hoe scene image review werkt

Onder het beeldvoorstel staat **`StudioSceneImagePanel`** (ongewijzigd):

- Huidige geselecteerde afbeelding
- Eerdere generaties (`StudioSceneImage` records)
- Regenereren per scène
- Consistency feedback waar beschikbaar

Opslag blijft `StudioSceneImage`; geen duplicatie.

## Character consistency

Via bestaande planner-logica:

- World profile op locatie/personage
- Visual keywords en style metadata in prompt exports
- Continuity warnings: mascot verdwijnt, kleding-shift, locatie-sprong, props vallen weg
- Consistency score in **Visuele productie**-overzicht

Geen model training of nieuwe consistency engine.

## Welke bestanden zijn aangepast

| Bestand | Rol |
|---------|-----|
| `src/lib/studio-visual-production-summary.ts` | **Nieuw** — summary, readiness, scene plan lookup |
| `src/lib/studio-visual-production.test.ts` | **Nieuw** — unit tests |
| `src/components/studio/studio-workspace-visual-production-panel.tsx` | **Nieuw** — Visueel-tab UI |
| `src/lib/studio-tool-id.ts` | `visual` tool id |
| `src/components/studio/studio-tool-strip.tsx` | Visueel in tool strip |
| `src/components/studio/studio-workspace-tool-panel.tsx` | Visual branch + props |
| `src/components/studio/studio-workspace-shell.tsx` | style/director profiles + refresh doorgeven |
| `src/i18n/locales/nl.ts` | NL copy (Visueel, Beeldvoorstel, …) |
| `src/i18n/locales/en.ts` | EN copy parity |
| `docs/visual-production-image-generation-report.md` | Dit rapport |

## Wat nog P2 is

- **Inline prompt opslaan** — textarea draft wordt niet naar API geschreven; wijzigingen via Verhaal-tab scene-velden.
- **Referentie-afbeeldingen panel** — planner levert referenties; dedicated UI voor moodboards/references nog niet in workspace tab.
- **Per-scène bulk selectie** — bulk genereert alle scènes; geen subset-selectie.
- **E2E smoke voor Visueel-tab** — handmatig getest; geen dedicated Playwright spec.
- **Mobile polish** — responsive grid werkt; geen aparte compact layout.

## Tests/build status

- **Lint:** passed (0 errors, pre-existing warnings only)
- **Build:** passed
- **Tests:** 1522/1522 passed

Nieuwe tests: `src/lib/studio-visual-production.test.ts` (6 tests).
