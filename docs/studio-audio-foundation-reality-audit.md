# Audio Foundation Reality Audit

**Scope:** Voice Cloning, STT, Voice Upload, Voice Recording, Audio Upload, Music Generation, Sound Effects, Audio Libraries, Audio Assets, Audio Muxing, Subtitle Extraction.

**Date:** 2026-06-06  
**Method:** Code search across `src/components`, `src/lib`, `src/server`, `src/app/api`, `tests`, `docs`, `prisma/schema.prisma`. No builds, no wiring, no migrations.

**Related docs (partially stale — see notes below):**
- [`docs/elevenlabs-capability-audit.md`](elevenlabs-capability-audit.md)
- [`docs/provider-capability-matrix.md`](provider-capability-matrix.md)
- [`docs/voice-identity-audio-production-report.md`](voice-identity-audio-production-report.md)

**Stale doc note:** Both ElevenLabs and provider-capability docs still claim workspace voice/music/sound/subtitles tabs are placeholders. That is **outdated**. `StudioWorkspaceToolPanel` wires real panels for voice, music, sound, and subtitles. Placeholders remain only in `StudioShellEmptyView` (no storyboard open) and the unused `STUDIO_PLACEHOLDER_TOOL_IDS` constant.

---

## Wat volledig werkt

| Capability | Evidence |
|------------|----------|
| **ElevenLabs TTS (single + multi-character)** | `synthesizeElevenLabsSpeech()` → `POST /v1/text-to-speech/{voice_id}` in `src/lib/elevenlabs-voice.ts`; runtime selector `src/server/studio/voice/voice-provider.ts`; orchestration `generate-storyboard-voice.ts`, `generate-character-voice-preview.ts` |
| **Mock TTS fallback** | `STUDIO_VOICE_PROVIDER=mock` or missing `ELEVENLABS_API_KEY` |
| **Voice generation APIs** | `POST/GET /api/studio/storyboards/[id]/voice`, `POST /api/studio/characters/[id]/voice-preview` |
| **Voice blob storage** | `uploadStoryboardVoiceAudio()` → Vercel Blob; Prisma `StudioStoryboardVoice` |
| **Subtitle track from TTS timing** | `buildSubtitleEntriesFromVoiceSegments()` in `generate-storyboard-voice.ts`; persisted in `StudioStoryboardSubtitleTrack`; APIs `GET/PATCH /api/studio/storyboards/[id]/subtitles` |
| **Subtitle preview + manual edit (workspace)** | `StudioSubtitlePreviewPanel` + `studio-voice-client.ts` |
| **Voice Director (planning + script/timing)** | `studio-voice-director.ts` — feeds TTS generation |
| **Character voice (multi-speaker)** | Speaker tags, per-character profiles, segment concat in `studio-voice-audio-merge.ts` |
| **Character voice preview + history** | Preview API + `StudioCharacterVoiceHistory` + `GET .../voice-history` |
| **Voice Identity Director (lock, multi-language validation)** | `studio-voice-identity-director.ts`, workspace panels |
| **Motion voice mux + subtitle burn** | `apply-studio-voice-export.ts`, `studio-voice-ffmpeg.ts`; settings via `PATCH /api/instant-premium/projects/[id]/audio-export` |
| **Motion handoff (voice + subtitle metadata)** | `attach-*-handoff.ts` chain; `motion-voice-export.ts` |
| **Music / Sound / Audio Production / Audio Asset directors (planning)** | Full lib + tests + handoff attachment; no audio files generated |
| **Static audio asset catalog** | `STUDIO_AUDIO_ASSET_LIBRARY` (~30 metadata entries); search UI in `studio-audio-asset-library.tsx` |
| **Audio confidence summary (scene-level)** | `buildStudioAudioConfidence.ts` — planning readout for render intent |

---

## Wat gedeeltelijk werkt

| Capability | What works | What does not |
|------------|------------|---------------|
| **Workspace audio UX** | Voice tab: director + identity + preview + generate + `<audio>` playback. Subtitles tab: fetch/edit entries. Music/Sound tabs: director panels with planning hints. | Music/Sound have **no `<audio>` playback**; no generation trigger |
| **ElevenLabs integration depth** | One live endpoint (TTS); 6 hardcoded preset → voice ID mappings; `language_code` **is** sent when set (contrary to older audit note) | No voice list API, no clone, no STT, no music, no SFX |
| **Subtitles** | TTS-derived timing + SRT export + burn-in at Motion merge | **Not** from recorded/uploaded audio; **not** STT; OCR path is separate (Motion video frames, not Studio) |
| **Audio muxing** | Single narration track muxed onto merged video; optional ASS subtitle burn | Music/SFX layers from directors **not** muxed; no multi-track mix execution |
| **Provider registry** | Metadata for ElevenLabs, Suno, Udio, Freesound, etc. at `/studio/providers` | All entries `status: "planned"`; no credential wiring or execution |
| **Character → provider voice ID** | `providerVoiceId` stored on generated `StudioStoryboardVoice` row | Character model has `voiceProfile` preset only — **no** persisted cloned voice ID |
| **Classic editor vs workspace** | Classic storyboard editor has full voice/music/sound/asset panels | Empty shell still shows generic placeholder for audio tools |
| **Prisma audio fields** | Storyboard flags + JSON metadata for music/sound/audioProduction/audioAssets | No models for user-uploaded audio, cloned voices, music stems, or SFX blobs |

---

## Wat alleen types zijn

| File | Surface | Status |
|------|---------|--------|
| `src/types/studio-voice-provider-identity.ts` | `StudioVoiceProviderIdentityAdapter.cloneVoice()` → always `not_implemented` | No adapter implementation |
| `src/types/studio-music-provider.ts` | `StudioMusicProviderAdapter.generate()` incl. `elevenlabs_music` | No adapter |
| `src/types/studio-sound-provider.ts` | `StudioSoundProviderAdapter.generate()` incl. `elevenlabs_sfx` | No adapter |
| `src/types/studio-audio-mix-provider.ts` | `StudioAudioMixProviderAdapter.mix()` | No adapter |
| `src/lib/studio-provider-registry.ts` | Provider metadata rows | Planning only |

No `cloneVoice`, STT, music, or SFX calls exist anywhere in `src/server` or `src/lib` beyond type definitions.

---

## Wat alleen UI is

| UI | Reality |
|----|---------|
| `StudioMusicPreviewCard` | Volume slider + mood/energy labels; **no audio element**, no generation |
| `StudioAudioAssetLibrary` | Searchable catalog of **metadata-only** system assets; no files, no URLs |
| `StudioMusicDirectorPanel` / `StudioSoundDirectorPanel` | Planning recommendations; workspace hints say "planning only" |
| `StudioAudioAssetDirectorPanel` | Maps scenes → catalog asset IDs; no real audio binding |
| Music/Sound workspace tabs | Director panels only — cues never become audio files |
| `/studio/providers` | Read-only capability table |
| `STUDIO_PLACEHOLDER_TOOL_IDS` | Declares voice/music/sound/subtitles as placeholders but **is not referenced** outside its definition; workspace embed test asserts no placeholder panel in workspace |

---

## Wat alleen provider support is

| Provider API (external) | In our code |
|-------------------------|-------------|
| ElevenLabs TTS | ✅ Live |
| ElevenLabs Speech-to-Text | ❌ API exists at ElevenLabs; zero references in repo |
| ElevenLabs Voice Cloning (`/v1/voices/add`, IVC/PVC) | ❌ Type hook only |
| ElevenLabs Voice Library search | ❌ Hardcoded 6 IDs instead |
| ElevenLabs Music (`/v1/music`) | ❌ Type id `elevenlabs_music` only |
| ElevenLabs Sound Effects | ❌ Type id `elevenlabs_sfx` only |
| ElevenLabs Voice Isolation | ❌ Not referenced |
| Suno / Udio / Freesound / Artlist | ❌ Registry metadata only |
| OpenAI / Google Vision OCR | ✅ Motion overlay pipeline (video/image text detection — **not** audio STT) |

---

## Wat ontbreekt werkelijk

| Capability | Gap |
|------------|-----|
| **Voice cloning** | No upload of samples, no ElevenLabs clone API, no `providerVoiceId` on character, no UI |
| **Speech-to-text** | No endpoint, no wrapper, no UI; subtitles cannot be derived from arbitrary audio |
| **Voice upload** | No multipart upload route, no blob model for user voice samples |
| **Voice recording** | No `MediaRecorder`, no `getUserMedia`, no browser capture flow |
| **Audio upload (music/SFX/narration replacement)** | No generic audio upload API or Prisma model |
| **Music generation** | No provider call, no stored music files, no merge |
| **Sound effects generation** | Same as music |
| **Multi-track audio mix execution** | Directors produce mix **plans** only; FFmpeg path handles narration mono track |
| **Voice isolation / audio cleanup** | Not implemented |
| **Subtitle extraction from video audio** | STT absent; OCR is visual-only |
| **User audio library** | Static system catalog only; no per-user/per-project audio assets in DB |
| **ElevenLabs voice list / picker** | Preset dropdown maps to fixed IDs |

---

## Welke bestaande systemen kunnen worden hergebruikt

| System | Reuse for |
|--------|-----------|
| `elevenlabs-voice.ts` + `voice-provider.ts` | Pattern for new ElevenLabs endpoints (STT, clone, music, SFX) |
| `uploadStoryboardVoiceAudio()` / `studio-voice-blob.ts` | Blob upload pattern for any generated or uploaded audio |
| `StudioStoryboardVoice` + `StudioStoryboardSubtitleTrack` | Extend or mirror for music/SFX tracks per storyboard |
| `generate-storyboard-voice.ts` | Job orchestration template (validate → provider → blob → prisma) |
| `buildSubtitleEntriesFromVoiceSegments()` | Keep for TTS path; parallel STT builder needed for upload path |
| `studio-voice-ffmpeg.ts` | Extend for multi-input mux (narration + music + SFX) |
| `apply-studio-voice-export.ts` | Hook point for additional audio layers at Motion merge |
| `attach-music-handoff.ts`, `attach-sound-handoff.ts`, `attach-audio-production-handoff.ts` | Handoff already carries cues — add `audioUrl` fields when generation exists |
| `studio-voice-director.ts` + character voice libs | Script source for STT validation / alignment |
| `StudioCharacterVoiceHistory` | Audit trail pattern for clone events |
| `studio-audio-asset-library.ts` | Interim catalog until real assets exist; selectors already map profiles → asset IDs |
| `studio-voice-client.ts` | Client fetch/generate pattern for new audio APIs |
| Motion `audio-export` PATCH route | User-facing export settings already persisted in `studioHandoffJson` |
| Project Memory / Continuity | Cross-project voice profile reuse suggestions (already live) |

---

## Wat geen nieuwe provider vereist

These can use existing **`ELEVENLABS_API_KEY`** (same key, new endpoints):

- Voice cloning (Instant/PVC via ElevenLabs)
- Speech-to-text (ElevenLabs STT)
- Music generation (ElevenLabs Music API)
- Sound effects (ElevenLabs SFX API)
- Voice isolation (ElevenLabs audio isolation)

These need **no external provider** (infrastructure only):

- Voice/audio upload → Vercel Blob (same as TTS output)
- Voice recording → browser MediaRecorder → upload pipeline
- Multi-track mux → FFmpeg (already in stack)
- TTS-derived subtitles (already built)
- Manual subtitle edit (already built)
- Director planning layers (already built)

**Do not add Suno/Udio/Freesound** until ElevenLabs music/SFX paths are evaluated — aligns with [`docs/provider-capability-matrix.md`](provider-capability-matrix.md).

---

## Wat mogelijk extra ElevenLabs plan vereist

Code performs **no tier/plan checks**. Product assumptions to validate against ElevenLabs billing:

| Feature | Plan sensitivity (typical) |
|---------|---------------------------|
| TTS (`eleven_multilingual_v2`) | Character credits — already in use |
| Voice cloning (IVC/PVC) | Often higher tier or add-on; sample length limits |
| STT | May be separate quota or beta access |
| Music generation | Newer API — may require specific subscription |
| Sound effects | May share SFX quota with plan tier |
| Voice isolation | Often creator/pro tier |

`estimateVoiceCredits()` uses `ceil(chars/500)` — no equivalent exists for clone/STT/music/SFX.

---

## Wat eerst gebouwd moet worden

Priority order for **minimum viable audio foundation** (audit recommendation — not a sprint commitment):

1. **Reconcile docs + dead constants** — Update stale "placeholder tab" claims; remove or wire `STUDIO_PLACEHOLDER_TOOL_IDS`.
2. **Persist provider voice ID on character** — Prisma field or JSON on `StudioCharacter` so clones/presets survive across generations (today only on `StudioStoryboardVoice` row).
3. **ElevenLabs voice list** — `GET /v1/voices` for picker; reduces hardcoded ID drift.
4. **Voice sample upload + clone** — Blob upload → ElevenLabs clone → store `providerVoiceId` on character → use in TTS instead of preset mapping.
5. **STT wrapper + subtitle from upload** — For replacing TTS-only subtitle path when user supplies audio.
6. **ElevenLabs music/SFX adapters** — Single-scene proof → blob storage → handoff `audioUrl` on cues.
7. **FFmpeg multi-track mux** — Execute audio production director mix plan (voice ducking under music).

---

## Wat later gebouwd moet worden

| Item | Rationale |
|------|-----------|
| Browser voice recording UI | Depends on upload + clone pipeline |
| User audio asset library (DB-backed) | Needs storage model + lifecycle (see asset lifecycle audit) |
| Auto-balance / loudness mastering providers | `studio-audio-mix-provider.ts` is type-only |
| ElevenLabs dubbing / conversational AI | Out of current Studio scope |
| Parallel Suno/Udio integration | Explicitly deprioritized vs ElevenLabs |
| STT for Motion post-render re-subtitling | Separate from Studio TTS flow |
| Real-time streaming TTS | Not in current architecture |
| Voice design (synthetic voice creation without clone) | API exists at ElevenLabs; no product need yet |
| Full timeline audio editor | Explicitly out of scope per project conventions |

---

## Search index (keywords → finding)

| Keyword | Hits |
|---------|------|
| `cloneVoice` | 1 file — type definition only |
| `speech to text` / `stt` / `transcription` | Docs only; no runtime |
| `MediaRecorder` / `getUserMedia` / `recording` | Docs only |
| `audio upload` / `voice upload` | TTS output upload only (`uploadStoryboardVoiceAudio`) |
| `music generation` / `elevenlabs music` | Types + static catalog |
| `elevenlabs sfx` / `sound generation` | Types + sound director planning |
| `voice isolation` | Not in codebase |
| `audio mux` / `audio export` | Voice mono mux live; multi-track not |
| `subtitle extraction` | TTS timing yes; STT no; OCR visual-only in Motion |
| `audio library` / `audio assets` | Static `STUDIO_AUDIO_ASSET_LIBRARY` + UI |
| `audio production` | Planning director + handoff; no generation |

---

## Tests coverage (audio-related)

Included in `npm run test` (9 files):

- `studio-voice-director.test.ts`
- `studio-voice-execution.test.ts`
- `motion-v32-voice-export.test.ts`
- `motion-v33-character-voice.test.ts`
- `motion-v35-music-director.test.ts`
- `motion-v36-sound-director.test.ts`
- `motion-v37-audio-production-director.test.ts`
- `motion-v38-audio-asset-director.test.ts`
- `motion-v39-voice-identity.test.ts`

**Not in test script:** `src/lib/studio-voice-identity-sprint.test.ts` (orphan file).

**No tests for:** ElevenLabs live API, clone, STT, upload, recording, music/SFX generation, multi-track mux.
