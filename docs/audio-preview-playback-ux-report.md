# Audio Preview & Playback UX Report

**Date:** 2026-06-06  
**Scope:** Playback consolidation — no new providers, generation, or schema migrations.

---

## Samenvatting

Studio gebruikt nu **`StudioAudioPreviewPlayer`** als enige gedeelde speler voor alle bestaande `audioUrl` bronnen. Gebruikers kunnen TTS, uploads, clone samples, library music/SFX, mix-bronnen en subtitle-narratie horen zonder nieuwe audio-generatie.

---

## Geconsolideerde spelers

| Was | Nu |
|-----|-----|
| Inline `<audio>` in 8 componenten | `StudioAudioPreviewPlayer` |
| Fake music volume slider | Echte playback of “Planning only” |
| Geen subtitle audio | Player op Ondertitels-tab |
| Geen library preview | Mix + Music + Sound tabs |

---

## Centrale audio player

**Bestand:** `src/components/studio/studio-audio-preview-player.tsx`

**Input:** `title`, `audioUrl`, `durationSeconds`, `source`, `variant`, `showDownload`

**Gedrag:** Rendert source label (i18n), titel, duur, native `<audio controls>` (play/pause/scrub). Retourneert `null` zonder URL.

**Bron labels:** `src/lib/studio-audio-preview-source.ts`

---

## Voice preview

- `StudioVoicePreviewPanel` → `voice_tts` + download
- `StudioCharacterVoiceCenter` → `voice_character`
- `director-v2/voice-section` → `voice_character` inline
- `StudioStoryboardExternalAudioPanel` → `narration_upload`

---

## Clone sample preview

- Bij file select: `URL.createObjectURL` → `voice_clone_sample`
- Na clone: `voice_clone` via API preview URL
- Revoke blob URL on cleanup / successful clone

---

## Music preview

- `StudioMusicPreviewCard`: fetch user library → linked `musicAssetId` → playback of planning-only badge
- `StudioMusicDirectorPanel`: linked upload preview

---

## SFX preview

- `StudioSoundDirectorPanel`: linked `soundAssetId` upload preview
- Mix panel: selected/linked SFX asset

---

## Subtitle audio preview

- `StudioSubtitlePreviewPanel` toont gekoppelde narratie (`subtitle_narration`) tijdens transcript/entry edit

---

## Audio library playback

- `StudioWorkspaceAudioMixPanel`: preview sectie voor narratie + geselecteerde/gekoppelde music/sfx
- Geen metadata-only catalog playback (bewust)

---

## Motion

- `MotionVoiceSubtitlePanel` → `motion_voice`

---

## Bestanden

**Nieuw:** `studio-audio-preview-player.tsx`, `studio-audio-preview-source.ts`, `studio-audio-preview-object-url.ts`, `types/studio-audio-preview.ts`, tests, audit doc

**Gewijzigd:** voice/clone/subtitle/external/mix/music/sound/motion panels, `en.ts`, `nl.ts`, `package.json`

---

## Bewust niet gebouwd

- Pre-render mix preview (combined amix)
- Music/SFX AI generation
- Browser recording
- Karaoke / timeline subtitle sync
- Static catalog audio files playback

---

## Volgende sprint

1. **Mix preview** — optional combined audition before Motion render  
2. **Central audio strip** — pinned player across tabs  
3. **Library browser** — dedicated list with play for all uploads  
4. **Voice tab IA** — reorder so primary preview is above fold

---

## Validatie

| Check | Status |
|-------|--------|
| `npx prisma validate` | ✅ |
| `npx prisma generate` | ✅ (schema unchanged) |
| `npm run lint` | ✅ 0 errors (162 pre-existing warnings) |
| `npm run build` | ✅ |
| `npm run test` | ✅ **1778/1778** (+9 `studio-audio-preview-foundation.test.ts`) |
