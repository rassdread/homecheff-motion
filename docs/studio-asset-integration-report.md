# Studio Asset Integration Report

**Sprint:** Studio V2 — Asset Integration (P1.5)  
**Date:** 2026-06-06  
**Status:** ✅ Implemented

---

## Wat is gebouwd

1. **Centrale asset picker** (`StudioWorkspaceAssetPicker`) — zoeken, bestaand asset selecteren, gekoppelde items markeren
2. **Inline create sheet** (`StudioWorkspaceAssetCreateSheet`) — personage, locatie, prop, wereld aanmaken met bestaande upload + create APIs
3. **Scène-asset panel** (`StudioWorkspaceSceneAssetsPanel`) — vervangt redirect-lijst in Personages / Locaties / Props / Wereld tabs
4. **Shell-integratie** — laadt werelden, refresht bibliotheek na create, patcht scène via `updateStudioSceneApi`

---

## Welke asset-tabs nu werken

| Tab | Scène-context | Kies bestaand | Maak nieuw | Loskoppelen |
|-----|---------------|---------------|------------|-------------|
| Personages | Gekoppelde personages + steminfo | ✅ Picker | ✅ Sheet + auto-link | ✅ |
| Locaties | Huidige locatie | ✅ Picker | ✅ Sheet + auto-link | ✅ |
| Props | Gekoppelde props | ✅ Picker | ✅ Sheet + auto-link | ✅ |
| Wereld | Afgeleide wereldcontext uit assets | ✅ Picker → locatie worldProfile | ✅ Sheet (bibliotheek) | N.v.t. (geen scène-FK) |

**Geen actieve scène:** empty state met “Kies eerst een scène…” — geen errors.

---

## Welke bestaande APIs zijn hergebruikt

| API | Gebruik |
|-----|---------|
| `PATCH /api/studio/storyboards/[id]/scenes/[sceneId]` | Koppel/ontkoppel personages, props, locatie |
| `POST /api/studio/characters` | Nieuw personage |
| `POST /api/studio/locations` | Nieuwe locatie |
| `POST /api/studio/props` | Nieuwe prop |
| `POST /api/studio/worlds` | Nieuwe wereld |
| `PATCH /api/studio/locations/[id]` | Wereld toepassen op locatie (`worldProfileId`) |
| `postWizardImageUpload` | Referentiebeeld voor create |
| `GET /api/studio/worlds` | Wereldlijst |

Geen schema migraties. Geen nieuwe modellen.

---

## Welke redirects zijn verwijderd

**Primair flow (middenpaneel asset-tabs):** geen redirects meer naar `/studio/characters/new`, `/locations/new`, `/props/new`, detail-pagina’s voor koppelen.

**Fallback blijft:**
- Mobile assets drawer footer → volledige bibliotheek
- Classic editor routes (`/studio/storyboards/[id]/classic`)
- Advanced/deeplink CRUD pagina’s bestaan ongewijzigd

**Stem:** personage-stem → **Stem-tab** (geen `/characters/[id]/edit` meer als primaire actie).

---

## Hoe nieuwe assets worden opgeslagen en gekoppeld

1. **Create sheet** → bestaande `createStudio*Api` → asset in gebruikersbibliotheek
2. **Direct daarna** → `updateStudioSceneApi` met uitgebreide `characterIds` / `propIds` of `locationId`
3. **Picker** → zelfde scene patch zonder create
4. **Bibliotheek refresh** → `refreshAssetLibraries()` in shell na create

Nieuwe assets zijn herbruikbaar in andere videoverhalen (owner-scoped Studio assets).

---

## Welke bestanden zijn aangepast

### New
- `src/components/studio/studio-workspace-asset-picker.tsx`
- `src/components/studio/studio-workspace-asset-create-sheet.tsx`
- `src/components/studio/studio-workspace-scene-assets-panel.tsx`
- `docs/studio-asset-integration-report.md`

### Updated
- `src/components/studio/studio-workspace-shell.tsx`
- `src/i18n/locales/nl.ts`, `en.ts`
- `src/lib/studio-workspace-embed.test.ts`

### Unchanged (fallback)
- `studio-workspace-assets-list.tsx` — niet meer gebruikt in shell
- Losse CRUD pages onder `/studio/characters/*`, etc.

---

## Wat bewust fallback/advanced blijft

- Volledige character edit form (voice center, performance) op `/studio/characters/[id]/edit`
- `StudioAssetLibrary` browse-only view op `/studio/assets`
- Wereld **niet** direct op scène-FK — context via gekoppelde assets; picker past `worldProfileId` toe op **locatie** wanneer aanwezig
- Inline character voice editor (P2)

---

## Wat nog P2 is

1. **Inline voice editor** per personage in workspace (zonder `/edit`)
2. **In-scene asset picker** vanuit Verhaal-tab / director panel (nu via asset-tabs)
3. **Wereld toepassen** op alle scène-personages in één actie
4. **Props/characters picker** in mobile assets drawer (nog link-based)
5. **StoryboardOverlayPreview** in Tekst-tab

---

## Tests/build status

| Check | Result |
|-------|--------|
| lint | ✅ 0 errors |
| typecheck | ✅ |
| build | ✅ |
| tests | ✅ (incl. extended `studio-workspace-embed.test.ts`) |

---

*Geen nieuwe providers, schema migraties, of AI-systemen toegevoegd.*
