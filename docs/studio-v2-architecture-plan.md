# Studio V2 Architecture Plan

> Status: planning document (P0 in progress). No schema migrations until later phases.

## Executive summary

Studio has strong foundations — workspace shell, Director V2, Prisma asset models, virtual asset registry, audio directors, and Motion post-render pipelines — but the **product structure** still feels like a CMS hub with separate tiles. Motion features (text, subtitles, translation, versions, post-render voice) live on `/videos/[id]`, `/animate/instant`, and the progress page.

**What must change:** `/studio` becomes the **central creative workspace**, not a tile hub. Everything (story, assets, audio, text, export) happens **inside one editor** via panels/drawers, not via separate apps.

**Why:** HomeCheff Motion/Studio should feel like Canva (easy start), CapCut (fast editing), AI Director Pro (smart direction), and Pixar production room (reusable characters/locations/voices) — **not** a marketplace or developer console.

**Safe path:** Editor-first routing and panel embedding (P0/P1) before schema refactors or video import (P2). Classic editor and Motion detail pages remain as fallbacks until workspace reaches feature parity.

---

## Current problems

### Hub-first instead of editor-first

| Route | Current | Problem |
|-------|---------|---------|
| `/studio` | Splash or 8-tile hub | User does not land in the editor |
| `/studio/characters` etc. | Full CRUD libraries | Feels like separate apps |
| `/studio/workspace?storyboardId=` | Real editor | Requires storyboardId; not reachable from `/studio` directly |
| `/studio/providers` | Provider registry UI | Developer-facing |

### Workspace is incomplete vs classic editor

**Workspace** has scenes + Director V2 but lacks nav tabs for Stem, Muziek, Geluid, Tekst, Ondertitels, Vertalen, Exporteren. Asset list links out to CRUD pages.

**Classic editor** has full voice/music/sound/subtitle panels — only via advanced mode.

### Motion features are scattered

Text overlays, text rerender, language export, voice post-render, and versions live on separate routes. Users lose context when jumping between them.

### Terminology is developer-facing

Workspace, Inspector, Director V2, Handoff, Provider registry, Execution framework — should become Verhaaleditor, AI-regisseur, Bibliotheek, Stem, Muziek, Geluid, Maak video.

### No “edit existing video” yet

Upload is images only. No MP4 import timeline model.

---

## Target experience

Studio = one professional creative suite:

> I make or edit a video → I choose what's in it → AI helps → I adjust → I export.

### Three project types, one editor shell

1. **New AI video** — photos + story + scenes → Motion render
2. **Story editor** — storyboard → characters/locations/audio → Motion
3. **Edit existing video** (P2) — upload → voice/music/subtitles/text → export

### Scene-first mental model

Videoverhaal → Scène → Wie / Waar / Wat / Wereld / Stem / Muziek / Geluid / Tekst → Maak video

### AI auto + manual override

Directors (`studio-voice-director`, `studio-music-director`, `studio-sound-director`) plan defaults; user always overrides per scene. Provider failures show simple messages + backup choices — never raw API errors.

---

## New user flow

### `/studio` entry

- Recent opened storyboard → Verhaaleditor (`/studio/workspace?storyboardId=…`)
- No project → start screen: Nieuw verhaal / Foto's naar video / Bestaande video (later) / Mijn videoverhalen
- Advanced tile hub → only when advanced toggle is on

### In the editor

Scenes left · Active scene center · AI-regisseur right · Tool strip/drawers for assets and audio · Maak video → Motion

---

## Editor layout

### Desktop

```
Header: title | Bibliotheek | Mijn projecten | Maak video
Left: scenes list
Center: preview + Director V2
Right: AI-regisseur / settings
Bottom: tool strip (Verhaal, Beeld, Personages, Stem, Muziek, Geluid, Tekst, …)
```

Existing grid: `studio-workspace-shell.tsx` — `220px | 1fr | 300px`.

### Mobile

Project title · Scene preview · Bottom tabs: Scènes, Assets, Stem, Geluid, Maak video

---

## Asset model

### Exists (reuse)

| Concept | Storage | Registry |
|---------|---------|----------|
| Character | `StudioCharacter` | `character` |
| Location | `StudioLocation` | `location` |
| Prop | `StudioProp` | `prop` |
| World | `StudioWorldProfile` | via FK |
| Scene image | `StudioSceneImage` | `reference_image` |
| Voice preset | Character fields + catalog | `voice` |
| Music/SFX | Static `STUDIO_AUDIO_ASSET_LIBRARY` | `music`, `ambience`, `sound_effect` |

Virtual type: `src/types/studio-media-asset.ts` + `buildStudioAssetRegistry()`.

### Scene linking (exists)

`StudioSceneCharacter`, `StudioSceneProp`, `StudioScene.locationId`.

### Gaps (no migration in P0/P1)

- Unified `StudioProject` app type (storyboard + `AnimationProject`) — P1
- Video import + timeline tracks — P2
- Voice clone/record — P2
- User music/SFX upload — P2

---

## Audio system

| Layer | Status |
|-------|--------|
| Voice directors + ElevenLabs TTS | Live |
| Music/SFX directors | Planning only |
| Post-render voice mux | Live (`studio-voice-ffmpeg.ts`) |
| Voice clone/record | Types only |
| Provider registry | Internal; hide from users |

Character voice: `StudioCharacter.voice*`, `voiceLock`, `voiceProfilesJson`. Per-scene override in Director V2.

---

## Routes

### Primary

| Route | Purpose |
|-------|---------|
| `/studio` | Editor entry |
| `/studio/workspace?storyboardId=` | Verhaaleditor |
| `/studio/projects` | Mijn videoverhalen (alias `/studio/storyboards`) |

### Secondary

| Route | Purpose |
|-------|---------|
| `/studio/assets` | Bibliotheekbeheer |
| `/studio/characters` etc. | Optional deep management |

### Hidden from normal users

| Route | Purpose |
|-------|---------|
| `/studio/providers` | Admin/debug only |
| Classic editor, production center | Legacy until migrated |

---

## Existing code map

### Entry & workspace

- `src/app/studio/page.tsx` — hub entry
- `src/components/studio/studio-entry-page.tsx` — splash vs tile hub
- `src/components/studio/studio-workspace-shell.tsx` — 3-column editor
- `src/components/studio/director-v2/studio-director-panel-v2.tsx` — center editor

### Assets

- CRUD: `src/app/studio/{characters,locations,props,worlds}/**`
- Unified: `src/components/studio/studio-asset-library.tsx`
- Registry: `src/lib/studio-media-asset-registry.ts`

### Audio & providers

- Directors: `src/lib/studio-voice-director.ts`, `studio-music-director.ts`, `studio-sound-director.ts`
- TTS: `src/server/studio/generate-storyboard-voice.ts`
- Registry: `src/lib/studio-provider-registry.ts` (internal)

### Motion handoff & post-render

- Handoff: `src/server/studio/create-motion-handoff-payload.ts`
- Text rerender: `src/components/instant/text-rerender-editor-modal.tsx`
- Language export: `src/components/instant/language-export-panel.tsx`
- Versions: `src/components/videos/version-center-page.tsx`

---

## Data model gap analysis

### Exists

`StudioWorldProfile`, `StudioCharacter`, `StudioLocation`, `StudioProp`, `StudioStoryboard`, `StudioScene`, join tables, `StudioStoryboardVoice`, `StudioStoryboardSubtitleTrack`, `AnimationProject` (studio JSON fields), `ProjectRenderVersion`, `VideoLanguageExport`.

### Overlapping

Entity CRUD vs unified assets; classic editor vs Director V2; voice in 4 layers (character, storyboard, scene, catalog).

### Missing

Unified `StudioProject`, video import model, audio timeline tracks, voice clone/record implementation.

### Safe without schema

Route redirects, i18n copy, panel embedding, asset picker modal, hide provider registry.

---

## P0 implementation plan

| Step | Task | Status |
|------|------|--------|
| 1 | `/studio` editor-first routing + start screen | Done |
| 2 | Start actions → Verhaaleditor (inline create, library copy) | Done |
| 3 | `/studio/projects` alias | Pending |
| 4 | i18n user copy (workspace panels) | Pending |
| 5 | Workspace nav: Stem, Muziek, Geluid tabs | Pending |
| 6 | Asset picker modal | Pending |
| 7 | Hide provider registry from user nav | Partial |
| 8 | Maak video CTA copy | Partial |

**Backlog (P1):** Embed photo-to-video (`/animate/instant`) inside Studio Workspace — TODO in `StudioStartPage`.

---

## P1 implementation plan

- `StudioProject` union (storyboard + AnimationProject)
- Workspace `?projectId=` mode
- Embed text/subtitle/voice/export panels
- Voice generate in workspace
- Bi-directional render status
- Deprecate classic editor gradually

---

## P2 implementation plan

- Video upload + timeline
- Voice record/clone
- Music/SFX FFmpeg mux
- AI auto-fill scene
- Optional DB index for asset registry performance

---

# Studio Unified Creative Workspace Plan

## 1. Scattered functions today

Story/scenes (workspace + classic + Motion wizard); assets (separate CRUD pages); voice (classic + Director V2 + `/videos/[id]`); music/SFX (classic only); text/subtitles/translation (Motion + Version Center); versions (Version Center + progress page); render (`/animate/instant`).

## 2. What converges in Studio

One workspace shell with context-aware tools: Verhaal, Beeld, Personages, Locaties, Props, Werelden, Stem, Muziek, Geluid, Tekst, Ondertitels, Vertalen, Exporteren, Bibliotheek, Maak video.

## 3–5. Workflows

**New AI video:** Start → workspace → Maak video → Motion → post-render in workspace drawers.

**Story editor:** Scenes + assets + AI directors → Maak video.

**Edit existing video (P2):** Upload → timeline tracks → export (reuse `cleanVideoUrl`, `VideoLanguageExport`, FFmpeg pipelines).

## 6. Reusable assets

Create entity → Prisma → registry indexes → link to scene → picker reuses in other projects.

## 7–8. Audio & text integration

Embed existing panels as workspace drawers/tabs; reuse APIs unchanged.

## 9. Routes

See Routes section above.

## 10–13. Database, APIs, P0/P1/P2

See Data model gap analysis and implementation plans above.

---

# Studio Workspace Integration Plan

| Function | Current location | P0 | P1 |
|----------|------------------|----|----|
| Story/scenes | Workspace | — | — |
| Characters/locations/props | CRUD pages | Asset picker | Inline attach |
| Voice planning | Director V2 + classic | Nav tab | Generate in workspace |
| Voice post-render | `/videos/[id]` | — | Embed drawer |
| Music/SFX | Classic editor | Nav tab | — |
| Text overlays | Motion wizard | — | Embed drawer |
| Subtitles | Classic preview | — | Embed drawer |
| Text rerender | Video detail modal | — | Embed modal |
| Language export | Version Center | — | Vertalen tab |
| Versions | Version Center | — | Exporteren tab |
| Motion handoff | Redirect to import | Copy → Maak video | Inline progress |
| Provider registry | `/studio/providers` | Hide | Admin only |
| Video upload | — | — | P2 |

### Integration architecture

```
Studio Verhaaleditor
  ├── Scenes sidebar
  ├── Director V2 / Preview
  ├── AI-regisseur rail
  └── Tool drawers → existing APIs (unchanged)
```

---

## Recommended order

```
P0: /studio routing, start screen, i18n, nav tabs, asset picker, hide providers
P1: StudioProject union, projectId workspace, embed Motion panels
P2: video import, timeline, voice record/clone, music mux
```
