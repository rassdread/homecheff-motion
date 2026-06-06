# Music & SFX Mix Foundation Report

**Date:** 2026-06-06  
**Builds on:** [Audio Timeline & Mix Planning Audit](studio-audio-timeline-mix-planning-audit.md)

---

## Welke bestaande systemen zijn hergebruikt

| Systeem | Hergebruik |
|---------|------------|
| Music Director (V35) | Fade/transition intent → `musicFadeInSeconds`, `musicHardCut` |
| Sound Director (V36) | Sound enabled flag + ambience category hints |
| Audio Production (V37) | `duckingMode`, `SceneMixRecommendation` → volume multipliers |
| Audio Asset Director (V38) | Asset assignment flow; user library extends catalog pattern |
| Voice export (V32) | `apply-studio-voice-export.ts` orchestration slot |
| `studio-voice-ffmpeg.ts` | Video mux after mixed AAC |
| Vercel Blob | Same upload pattern as voice / external narration |
| `audioAssetMetadataJson` | Storyboard links — **no schema migration** |
| Project Memory / AI Director | `libraryAudio` usage + reuse suggestions |
| Subtitle readiness pattern | `studio-audio-mix-readiness.ts` |

---

## Hoe audio assets werken

- Owner library stored as **Blob manifest** (`studio/{ownerId}/audio-library/manifest.json`) + per-asset files.
- API: `GET /api/studio/audio-library`, `POST /api/studio/audio-library/upload`.
- Validation: MP3/WAV, max 25 MB (`studio-audio-library-validation.ts`).
- Project-wide reusable; usage counted via `audioAssetMetadataJson` on storyboards.

---

## Hoe music assets werken

- Upload with `kind: "music"`.
- Metadata: name, category, mood, energy (no BPM/AI).
- Linked to storyboard via `PATCH /api/studio/storyboards/[id]/audio-assets` → `musicAssetId` in `audioAssetMetadataJson`.

---

## Hoe sound assets werken

- Upload with `kind: "sfx"`.
- Categories: ambience, transition, impact, whoosh, crowd, city, nature, custom.
- Linked via `soundAssetId` on storyboard metadata.
- Rendered as looped bed (P1); per-scene SFX hits = P2.

---

## Hoe timeline mapping werkt

- **No visual editor.** Auto-built from scene `order` + `durationSeconds` (`buildSceneTimelineSegments`).
- Music: single bed from scene 1 through total duration (looped in FFmpeg).
- Ambience/sound: single linked asset looped full timeline.
- Scene segments stored on `audioMixPlan.sceneSegments` for handoff/future SFX placement.

---

## Hoe FFmpeg mix werkt

1. Post-merge (`apply-studio-voice-export.ts`) downloads voice / music / sound URLs.
2. `mixStudioAudioLayers` — `amix` via `filter_complex` (voice + optional music + optional sound).
3. Music: `aloop` + `atrim` + optional `afade` in/out.
4. `muxStudioVideoWithMixedAudio` — AAC onto silent merged video.
5. Subtitle burn unchanged (after mux).

Fallback: voice-only mux when no music/sound linked (existing V32 path).

---

## Hoe ducking werkt

- Static gain reduction from V37 `duckingMode` when voice is present:
  - `music_under_voice` → music × ~0.35
  - `full_under_voice` → music × ~0.2
  - `ambient_reduce` → sound × ~0.45
- No sidechain compressor (P2).
- Voice remains dominant by mix template + ducking multipliers.

---

## Hoe fades werken

- From first scene music cue: `musicStartBehavior` / `musicEndBehavior` → 2s fade or 0 (hard).
- FFmpeg `afade=t=in/out` on music loop only.
- `hard_cut` transition type skips crossfade logic (single bed model).

---

## Hoe readiness is gekoppeld

- `resolveStoryboardAudioMixReadiness` — narration / music / sound linked + `mixReady`.
- UI: `StudioWorkspaceAudioMixPanel` in Voice tab (✓ gekoppeld / ⚠ ontbreekt).
- AI Director: `libraryAudio` memory suggestions when reuse exists (never auto-upload/generate).

---

## Welke bestanden zijn aangepast

**Nieuw**

- `src/types/studio-user-audio-library.ts`
- `src/lib/studio-audio-library-validation.ts`
- `src/lib/studio-storyboard-audio-asset-links.ts`
- `src/lib/studio-audio-mix-timeline.ts`
- `src/lib/studio-audio-mix-resolve.ts`
- `src/lib/studio-audio-mix-ffmpeg.ts`
- `src/lib/studio-audio-mix-readiness.ts`
- `src/lib/attach-audio-mix-handoff.ts`
- `src/lib/studio-audio-library-client.ts`
- `src/server/studio/studio-user-audio-library-blob.ts`
- `src/server/studio/studio-user-audio-library-service.ts`
- `src/server/studio/link-storyboard-audio-assets.ts`
- `src/app/api/studio/audio-library/*`
- `src/app/api/studio/storyboards/[id]/audio-assets/route.ts`
- `src/components/studio/studio-workspace-audio-mix-panel.tsx`
- `src/lib/studio-audio-mix-foundation.test.ts`
- `docs/studio-music-sfx-mix-foundation-report.md`

**Uitgebreid**

- `motion-voice-export.ts`, `motion-voice-export` types, `apply-studio-voice-export.ts`
- `create-motion-handoff-payload.ts`, `motion-handoff-payload.ts`
- `studio-project-memory-service.ts`, project memory types
- `studio-director-proposal-memory.ts`, `studio-api.ts`, storyboard mapper
- i18n NL/EN, workspace tool panel, test fixtures

---

## Wat bewust niet gebouwd is

- Geen Suno / Udio / ElevenLabs music or SFX generation
- Geen timeline editor, MP4 import, schema migration
- Geen sidechain ducking, LUFS mastering, compressor/limiter
- Geen per-scene SFX timestamps (scene-relative hits = P2)
- Geen automatic upload/generate from AI Director

---

## Wat P2 blijft

- Sample-accurate SFX at scene boundaries (`adelay` per scene)
- Dynamic ducking (sidechaincompress) tied to voice segment times
- Crossfade between scene music stems
- Library UI in classic editor + waveform preview
- ElevenLabs or licensed catalog file ingestion (when explicitly approved)
- Language-export audio remux per locale

---

## Tests/build status

| Check | Status |
|-------|--------|
| Lint | Run before commit (baseline warnings) |
| Build | Success |
| Tests | **1573/1573** pass (incl. `studio-audio-mix-foundation.test.ts`) |

---

*Planning layers V35–V38 are now connected to executable render export for the first time.*
