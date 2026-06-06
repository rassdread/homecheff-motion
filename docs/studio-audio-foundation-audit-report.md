# Audio Foundation Audit Report

**Date:** 2026-06-06  
**Companion:** [`docs/studio-audio-foundation-reality-audit.md`](studio-audio-foundation-reality-audit.md)

---

## Capability matrix

Legend: **Live** = end-to-end in product · **Plan** = director/types/handoff only · **Type** = interface/registry only · **None** = absent

| Capability | Types | UI | Backend / API | Provider | Storage (Prisma/Blob) | Tests | Status |
|------------|-------|-----|---------------|----------|----------------------|-------|--------|
| **TTS (ElevenLabs)** | ✅ | ✅ workspace + classic | ✅ generate + preview APIs | ✅ live + mock | ✅ `StudioStoryboardVoice` + Blob | ✅ 4 test files | **Live** |
| **Multi-character TTS** | ✅ | ✅ inline character voice | ✅ segment concat | ✅ | ✅ | ✅ v33 | **Live** |
| **Voice Director** | ✅ | ✅ panels | ✅ lib | — | — | ✅ | **Live (planning)** |
| **Voice Identity** | ✅ | ✅ panels | ✅ lib + resolver | — | character fields | ✅ v39 | **Live (planning)** |
| **Voice preview (character)** | ✅ | ✅ | ✅ `voice-preview` API | ✅ | ✅ Blob | ⚠️ indirect | **Live** |
| **Voice history** | ✅ | ✅ panel | ✅ `voice-history` API | — | ✅ `StudioCharacterVoiceHistory` | ⚠️ none dedicated | **Live** |
| **Voice cloning** | ✅ `cloneVoice` | ❌ | ❌ | ⚠️ ElevenLabs API exists | ❌ | ❌ | **None** |
| **Voice upload** | ❌ | ❌ | ❌ | — | ❌ | ❌ | **None** |
| **Voice recording** | ❌ | ❌ | ❌ | — | ❌ | ❌ | **None** |
| **STT / transcription** | ❌ | ❌ | ❌ | ⚠️ ElevenLabs API exists | ❌ | ❌ | **None** |
| **Subtitles (TTS-derived)** | ✅ | ✅ workspace tab | ✅ generate + GET/PATCH | — (from TTS timing) | ✅ `StudioStoryboardSubtitleTrack` | ✅ execution test | **Live** |
| **Subtitle extraction (audio→text)** | ❌ | ❌ | ❌ | ❌ unused | ❌ | ❌ | **None** |
| **Subtitle burn-in (Motion)** | ✅ | ✅ Motion settings | ✅ FFmpeg | — | handoff JSON | ✅ v32 | **Live** |
| **OCR text detection** | — | ✅ Motion panels | ✅ Google/OpenAI vision | ✅ | — | ✅ preflight | **Live (visual, not audio)** |
| **Music Director** | ✅ | ✅ workspace + classic | ✅ lib + handoff | — | storyboard JSON flags | ✅ v35 | **Plan** |
| **Sound Director** | ✅ | ✅ workspace + classic | ✅ lib + handoff | — | storyboard JSON flags | ✅ v36 | **Plan** |
| **Audio Production Director** | ✅ | ✅ classic | ✅ lib + handoff | — | JSON metadata | ✅ v37 | **Plan** |
| **Audio Asset Director** | ✅ | ✅ library UI | ✅ static catalog + selectors | — | JSON metadata | ✅ v38 | **Plan (catalog)** |
| **Music generation** | ✅ `elevenlabs_music` | ⚠️ preview card, no audio | ❌ | ⚠️ API exists | ❌ | ❌ | **Type + UI shell** |
| **Sound effects generation** | ✅ `elevenlabs_sfx` | ⚠️ director only | ❌ | ⚠️ API exists | ❌ | ❌ | **Type + UI shell** |
| **Audio upload (user files)** | ❌ | ❌ | ❌ | — | ❌ | ❌ | **None** |
| **Audio library (system)** | ✅ | ✅ search UI | ✅ in-memory catalog | — | ❌ no files | ⚠️ v38 planning | **Metadata only** |
| **Audio library (user/project)** | ❌ | ❌ | ❌ | — | ❌ | ❌ | **None** |
| **Voice mux (narration)** | ✅ | ✅ Motion export | ✅ `apply-studio-voice-export` | FFmpeg | handoff JSON | ✅ v32 | **Live** |
| **Multi-track mix (music+SFX+voice)** | ✅ mix provider type | ❌ | ❌ | ❌ | ❌ | ❌ | **None** |
| **Provider registry** | ✅ | ✅ `/studio/providers` | ✅ metadata | planned only | — | ⚠️ | **Type + UI** |
| **Project Memory (voice reuse)** | ✅ | ✅ Continuity tab | ✅ API | — | cross-project reads | ✅ memory sprint | **Live (suggestions)** |

---

## Herbruikbare systemen

### Runtime pipeline (copy patterns)

```
Voice request → validate → provider → Blob upload → Prisma row → handoff → Motion mux
```

| Module | Path | Reuse |
|--------|------|-------|
| ElevenLabs fetch wrapper | `src/lib/elevenlabs-voice.ts` | HTTP + error handling template |
| Provider selector | `src/server/studio/voice/voice-provider.ts` | Extend with clone/STT/music/SFX providers |
| Blob upload | `src/server/studio/studio-voice-blob.ts` | Any audio bytes |
| Voice generation job | `src/server/studio/generate-storyboard-voice.ts` | Orchestration template |
| Subtitle builder | `src/lib/studio-subtitle-track.ts` | TTS segments today; add STT parser alongside |
| FFmpeg mux/burn | `src/lib/studio-voice-ffmpeg.ts` | Add `-filter_complex` amix for multi-track |
| Motion apply | `src/server/instant-premium/apply-studio-voice-export.ts` | Extension point for music/SFX paths |
| Client API | `src/lib/studio-voice-client.ts` | Fetch/generate/patch pattern |

### Planning layer (already wired — do not rebuild)

- `studio-voice-director.ts` — script, timing, warnings
- `studio-music-director.ts` — scene cues, energy, ducking hints
- `studio-sound-director.ts` — ambient/object/transition IDs
- `studio-audio-production-director.ts` — unified mix recommendations
- `studio-audio-asset-director.ts` — scene → catalog asset packages
- `attach-*-handoff.ts` — Motion payload enrichment

### Data model anchors

| Model | Use today | Extend for |
|-------|-----------|------------|
| `StudioStoryboardVoice` | Generated narration per language | Reference pattern for music/SFX rows |
| `StudioStoryboardSubtitleTrack` | Timed entries JSON | STT output target |
| `StudioCharacter` | `voiceProfile`, `voiceLock`, language | Add `providerVoiceId` / clone metadata |
| `StudioCharacterVoiceHistory` | Profile change snapshots | Clone/create events |
| `StudioStoryboard.musicMetadataJson` etc. | Director state | Generated asset URLs when ready |

---

## Minimale route naar Voice Clone

**Goal:** Character speaks with a cloned voice in TTS, without new providers.

### Steps (smallest diff)

1. **Schema** — Add optional `providerVoiceId` (+ `cloneStatus`, `cloneSampleStorageKey`) on `StudioCharacter` or JSON field on character voice snapshot. No migration sprint unless explicitly approved.

2. **Upload sample** — Reuse `uploadStoryboardVoiceAudio()` pattern:
   - `POST /api/studio/characters/[id]/voice-sample` → Blob URL
   - Validate duration/format server-side

3. **Clone wrapper** — New function in `elevenlabs-voice.ts` (or sibling `elevenlabs-clone.ts`):
   - `POST /v1/voices/add` with sample file
   - Return `voice_id`

4. **Wire TTS** — In `resolveElevenLabsVoiceId()`: if character has `providerVoiceId`, use it; else preset map.

5. **UI** — Extend character voice inline panel: upload sample → "Clone voice" → show status → preview via existing `voice-preview` API.

6. **History** — Log clone event to `StudioCharacterVoiceHistory`.

### Dependencies

- Existing: TTS, preview, Blob, character model, ElevenLabs key
- New: upload route, clone API call, one character field, minimal UI

### Out of scope for minimal route

- Instant vs Professional clone tiers UI
- Multi-sample training workflows
- Voice design without samples

---

## Minimale route naar STT

**Goal:** Subtitle track from uploaded or recorded narration (not only TTS timing).

### Steps

1. **Wrapper** — `transcribeElevenLabsSpeech(audioBuffer | url)` → `POST /v1/speech-to-text` (verify current ElevenLabs STT schema).

2. **API** — `POST /api/studio/storyboards/[id]/subtitles/transcribe`
   - Input: existing `StudioStoryboardVoice.audioUrl` OR new upload URL
   - Output: write `StudioStoryboardSubtitleTrack.entriesJson`

3. **Segment alignment** — Map STT word/segment timestamps to `SubtitleTrackEntry[]` (new lib function parallel to `buildSubtitleEntriesFromVoiceSegments`).

4. **UI** — Button on subtitles tab: "Regenerate from audio" when voice asset exists.

5. **Motion** — No change; burn-in already reads subtitle track from handoff.

### Alternative (not minimal)

- OpenAI Whisper — would add second provider; **avoid** unless ElevenLabs STT insufficient.

### Distinction

- **TTS subtitles** — already live; keep as default when voice generated in-app
- **STT subtitles** — needed for uploaded audio, re-transcription, or alignment correction

---

## Minimale route naar Audio Upload

**Goal:** User supplies narration/music/SFX file; stored and referenced in storyboard/handoff.

### Steps

1. **Generic blob helper** — Generalize `studio-voice-blob.ts` → `studio-audio-blob.ts` with content-type validation (mp3/wav/m4a).

2. **API** — `POST /api/studio/storyboards/[id]/audio-assets`
   - Body: multipart or `{ category: "narration"|"music"|"sfx", file }`
   - Store: new Prisma model **or** JSON array on storyboard metadata (minimal = JSON first)

3. **Replace narration path** — If uploaded narration exists, skip TTS generate; set `StudioStoryboardVoice.audioUrl` from upload.

4. **Handoff** — Extend `MotionStudioAudioExportJson` with optional `musicAudioUrl`, `sfxTracks[]`.

5. **UI** — Upload button on voice tab (narration) and music/sound tabs.

### Dependencies

- Blob infra (exists)
- Prisma decision (JSON vs table)
- No new provider for upload itself

---

## Minimale route naar Music/SFX

**Goal:** One generated music bed + optional SFX per storyboard scene package, muxed at render.

### Phase A — Generation (ElevenLabs only)

1. **Adapters** — Implement `StudioMusicProviderAdapter` / `StudioSoundProviderAdapter` for `elevenlabs_music` / `elevenlabs_sfx` only.

2. **Orchestration** — `generate-storyboard-music.ts` mirroring voice:
   - Input: `buildMusicDirectorPlan()` cues + duration from voice timing
   - Output: Blob URL + metadata on storyboard

3. **API** — `POST /api/studio/storyboards/[id]/music/generate` (and `/sound/generate` or combined)

4. **UI** — Wire `StudioMusicPreviewCard` to real `<audio src={url}>` when asset exists.

### Phase B — Merge

5. **FFmpeg** — Extend `muxStudioVoiceAudio` → `muxStudioAudioLayers` with amix + ducking from `AudioProductionPlan`.

6. **Handoff** — Add URLs to `attach-audio-production-handoff` output.

### Interim (no generation)

- Map `STUDIO_AUDIO_ASSET_LIBRARY` entries to **royalty-free static files** in Blob (manual seed) — catalog IDs become real URLs without ElevenLabs music API. Useful for demos; not a substitute for generation.

---

## Wat bewust niet gebouwd moet worden

Per project conventions and audit findings — **do not build yet**:

| Item | Reason |
|------|--------|
| Suno / Udio / Freesound runtime adapters | ElevenLabs not exhausted; registry is planning-only |
| Parallel music provider stack | Same |
| Full DAW / timeline audio editor | Explicitly out of scope |
| MP4 audio extraction import | Separate from Studio audio foundation |
| ElevenLabs dubbing API | Translation already via OpenAI language export |
| Conversational AI / Agents API | Unrelated to Studio storyboard audio |
| Auto-save AI audio proposals | Project UX rule: suggest-first |
| Real-time streaming TTS | Architecture is generate-then-mux |
| Voice recording before upload pipeline exists | Recording is useless without storage + optional clone |
| New Prisma models in audit sprint | Audit-only; schema changes need explicit sprint |
| Replacing OCR with STT for baked text | Different problem (visual text in video frames) |

---

## Tests/build status

**Run:** 2026-06-06 (post Project Memory sprint, pre audio implementation)

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ 0 errors, 147 warnings (pre-existing) |
| `npm run build` | ✅ Success |
| `npm run test` | ✅ **1541/1541 pass** |

### Audio-specific test files (in CI script)

| File | Covers |
|------|--------|
| `studio-voice-director.test.ts` | Script/timing analysis |
| `studio-voice-execution.test.ts` | Subtitle segments, execution helpers |
| `motion-v32-voice-export.test.ts` | Mux settings, handoff export |
| `motion-v33-character-voice.test.ts` | Multi-character assignments |
| `motion-v35-music-director.test.ts` | Music planning |
| `motion-v36-sound-director.test.ts` | Sound planning |
| `motion-v37-audio-production-director.test.ts` | Mix planning |
| `motion-v38-audio-asset-director.test.ts` | Asset catalog selection |
| `motion-v39-voice-identity.test.ts` | Identity locks, handoff |

### Gaps

- `studio-voice-identity-sprint.test.ts` — exists on disk, **not** in `package.json` test script
- No integration tests for ElevenLabs HTTP (mock-only in dev)
- No tests for clone, STT, upload, recording, music/SFX generation, multi-track mux

### Doc drift to fix (separate doc PR)

- [`docs/elevenlabs-capability-audit.md`](elevenlabs-capability-audit.md) — workspace voice tab marked placeholder; `language_code` claim outdated
- [`docs/provider-capability-matrix.md`](provider-capability-matrix.md) — same placeholder claims for workspace tabs
- `STUDIO_PLACEHOLDER_TOOL_IDS` in `studio-tool-id.ts` — unused dead constant

---

## Executive summary

**The audio foundation is strong on planning and weak on generation breadth.**

What actually ships today: **ElevenLabs TTS → Blob → Prisma → TTS-timed subtitles → Motion voice mux + subtitle burn.** Everything else in the audio stack—music, SFX, cloning, STT, upload, recording, multi-track mix—is either director planning, static catalog metadata, or type-only provider hooks.

**Recommended sequence:** character `providerVoiceId` + voice clone → STT for subtitle fallback → ElevenLabs music/SFX adapters → FFmpeg multi-track mux. All can reuse existing ElevenLabs key and Blob/FFmpeg infra without new providers.
