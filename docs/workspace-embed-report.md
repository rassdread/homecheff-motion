# Workspace Embed Report

**Sprint:** Studio V2 — Workspace Embed (P1)  
**Date:** 2026-06-06  
**Status:** ✅ Implemented — lint, typecheck, build, tests green

---

## Welke placeholders verwijderd zijn

In **`StudioWorkspaceShell`** (when a storyboard is loaded), these tool tabs no longer render `StudioToolPlaceholderPanel`:

| Tab | Before | After |
|-----|--------|-------|
| Stem / Voice | Placeholder | Full `StudioVoiceDirectorPanel` + voice identity + character links |
| Tekst / Text | Placeholder | Active scene text beats + `StudioTextBeatsPreviewPanel` |
| Ondertitels / Subtitles | Placeholder | `StudioSubtitlePreviewPanel` (with voice-enable guidance) |
| Vertalen / Translate | Placeholder | `LanguageExportPanel` for linked Motion videos |
| Exporteren / Export | Placeholder | Linked video list → `/videos/[id]` version center |
| Muziek / Music | Placeholder | `StudioMusicDirectorPanel` (planning only) |
| Geluid / Sound | Placeholder | `StudioSoundDirectorPanel` (planning only) |

**Note:** `StudioShellEmptyView` (no storyboard selected) still uses placeholders for production tabs — intentional.

---

## Welke bestaande componenten zijn hergebruikt

| Component | Used in tab |
|-----------|-------------|
| `StudioVoiceDirectorPanel` | Voice |
| `StudioVoicePreviewPanel` | Voice (via director panel) |
| `StudioStoryboardVoiceIdentityPanel` | Voice |
| `StudioSubtitlePreviewPanel` | Subtitles |
| `StudioDirectorSectionText` | Text (active scene) |
| `StudioTextBeatsPreviewPanel` | Text (full story) |
| `StudioMusicDirectorPanel` | Music |
| `StudioSoundDirectorPanel` | Sound |
| `LanguageExportPanel` | Translate |
| Motion project list (links) | Export / Translate |

**New glue (no duplicate UI logic):** `StudioWorkspaceToolPanel` routes tabs to the above.

---

## Welke Motion-functionaliteit nu in Studio beschikbaar is

- **Voice:** ElevenLabs TTS settings, narration script, preview, save — same APIs as classic editor
- **Subtitles:** Storyboard subtitle track load/edit via existing voice bundle API
- **Text:** Motion text beats preview from studio scenes
- **Translate:** Language export pipeline (`LanguageExportPanel`) when a completed video exists for this storyboard
- **Export:** Links to Motion `/videos/[id]` for versions, downloads, render history
- **Music / Sound:** Planning metadata and director recommendations (no fake audio generation)

Discovery uses **`GET /api/studio/storyboards/[id]/motion-projects`** — reads existing `studioSourceStoryboardId` on `AnimationProject` (no schema change).

---

## Welke bestanden zijn aangepast

### New
- `src/components/studio/studio-workspace-tool-panel.tsx`
- `src/server/studio/list-storyboard-motion-projects.ts`
- `src/app/api/studio/storyboards/[id]/motion-projects/route.ts`
- `src/lib/studio-workspace-embed.test.ts`
- `docs/workspace-embed-report.md`

### Updated
- `src/components/studio/studio-workspace-shell.tsx` — embed tool panel
- `src/components/studio/studio-workspace-assets-list.tsx` — “Maak nieuw” / “Create new”
- `src/components/studio/studio-workspace-assets-drawer.tsx` — create-new link
- `src/lib/studio-storyboards-client.ts` — `fetchStoryboardMotionProjects`
- `src/types/studio-api.ts` — motion project summary types
- `src/i18n/locales/nl.ts`, `en.ts` — workspace embed copy
- `package.json` — test script

---

## Welke redirects verwijderd zijn

None removed. Existing flows preserved:

- **Maak video** header → `/animate/instant/import?storyboardId=`
- Character edit → `/studio/characters/[id]/edit` (from voice tab)
- Export → `/videos/[id]` (version center)
- Empty translate/export → CTA to make video first

**Reduced need to leave editor:** production tools now inline; classic editor link remains for advanced-only panels (jobs, corrections, etc.).

---

## Welke asset-flows verbeterd zijn

- **Characters / Locations / Props / Worlds** tabs: **“Maak nieuw”** button in list header and mobile drawer
- Existing asset rows still link to detail pages (choose existing)
- Full library link retained at drawer footer

**P2:** In-editor asset picker modal (select asset into scene without navigation) — not in this sprint.

---

## Wat nog P2 is

1. **In-scene asset picker** — assign character/location/prop to active scene from drawer without CRUD redirect
2. **Full export embed** — inline `VideoVersionsPanel` instead of link-out to `/videos/[id]`
3. **Text overlay visual preview** — `StoryboardOverlayPreview` wired from studio scene → instant draft conversion
4. **Character voice inline edit** — embed `StudioCharacterVoiceCenter` in workspace without `/edit` navigation
5. **Worlds tab** — still links to worlds library; no inline world profile editor
6. **EN copy:** “Story tab” label in text tool (minor)

---

## Eventuele regressierisico's

1. **Translate tab** requires at least one Motion project with `studioSourceStoryboardId` matching the story — projects created outside Studio import won't appear
2. **Subtitles** depend on voice being enabled and bundle generated — same as classic editor
3. **Mobile layout** — long voice/export panels may need scroll tuning on small screens
4. **Performance** — translate tab loads language exports for primary project on tab open (existing Motion API cost)

---

## Quality gate

| Check | Result |
|-------|--------|
| lint | ✅ 0 errors |
| typecheck | ✅ |
| build | ✅ |
| tests | ✅ (includes `studio-workspace-embed.test.ts`) |

---

*No new providers, schema migrations, voice clone, STT, upload, or timeline editor were added.*
