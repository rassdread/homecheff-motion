# Studio Audio Capability & Surface Inventory (S.7A)

---

## 1. Capabilities discovered

| Capability | Status | Runtime | Notes |
|------------|--------|---------|-------|
| Voice TTS (storyboard narration) | LIVE | ElevenLabs / mock | GenerationJob `VOICE_TTS` |
| Character voice preview | LIVE | ElevenLabs | Billed `voice_generation` |
| Draft voice preview | LIVE | ElevenLabs | Cache hit can skip charge |
| Voice clone (character + user library) | LIVE | ElevenLabs IVC | Consent required; bare route |
| Voice reference link | LIVE | Blob/URL | Free link |
| Voice library / shared catalog | LIVE | ElevenLabs catalog | Free |
| Voice history | LIVE | Prisma | Free |
| Voice lock | LIVE (soft) | Character field | Warnings + resolver |
| Music generation | LIVE | ElevenLabs music | Bare route → library |
| Music Director | LIVE planning | — | No generation |
| Music upload / library | LIVE | Blob | Free upload |
| SFX generation | LIVE | ElevenLabs SFX | Bare route |
| Sound Director | LIVE planning | — | No generation |
| Ambient / environment sound (IDs) | LIVE planning | — | Not timed render hits |
| STT / transcription | LIVE | ElevenLabs scribe_v2 | Bare route |
| Subtitle edit / save | LIVE | Prisma track | Free CRUD |
| Subtitle burn-in | LIVE | FFmpeg ASS | Motion export |
| Translation (overlays / language export) | LIVE | OpenAI | Not VO dub |
| Audio mix (voice+music+SFX beds) | LIVE | FFmpeg | Static duck + music fades |
| Audio Production Director | LIVE planning | — | Mix priorities |
| Audio Asset Director | LIVE planning | — | Assignment plan |
| Voice Identity Director | LIVE planning | — | Lock / mismatch warnings |
| Motion audio export settings | LIVE | Metadata | Instant project |
| Publish voice message | LIVE | Publish product | Separate surface |
| Publish subtitle STT | PARTIAL / unfinished | — | Manual SRT/VTT |
| True dubbing | ABSENT | — | |
| AI lip-sync / phoneme / viseme | ABSENT | Amplitude mouth only | |
| OpenAI TTS / Whisper | ABSENT | — | |

---

## 2. Routes & surfaces

| Surface | Purpose | Reachable | Mode | Canonical / Legacy | GenerationJob? | Credit? |
|---------|---------|-----------|------|--------------------|----------------|---------|
| Workspace tool `voice` | Voice Director + external audio + character inline | Yes | Pro/Director | Canonical | Via storyboard voice API | Yes TTS |
| Workspace `music` | V9 generate + Music Director | Yes | Pro/Director | Canonical | No | Yes generate |
| Workspace `sound` | V9 SFX + Sound Director | Yes | Pro/Director | Canonical | No | Yes generate |
| Workspace `subtitles` | Preview/edit/transcribe | Yes | Pro/Director | Canonical | No | STT billed |
| Workspace `translate` | Language export embed | Yes | Pro/Director | Canonical | No | translation_export |
| Classic storyboard editor panels | Voice/Music/Sound/Audio Production/Assets | Yes | Director/Classic | Canonical | Same APIs | Same |
| Character form Voice Center | Preview/clone/library/history | Yes | All | Canonical | No clone job | Yes |
| `/studio/providers` | Provider assignment UI | Yes | Admin/Pro | Planning | No | No |
| Instant `/animate/instant` | Consumes audio handoff; export settings | Yes | Quick/Pro | Canonical | Motion jobs separate | Voice on storyboard |
| `/videos/[id]` | Post-render voice/subtitle panel | Yes | Pro | Canonical | — | — |
| Publish voice panels | Voice message intake | Yes | Publish | Product | — | Publish billing |
| Dedicated `/studio/voice` page | — | **No page** | — | Dead expectation | — | — |
| Assistant `prepare_music` / `prepare_sfx` | Prefill Instant | Yes | Assist | registry_only | No | No |

### Key APIs

| API | Credit action | Job? |
|-----|---------------|------|
| `POST …/storyboards/[id]/voice` | `voice_generation` | YES `VOICE_TTS` |
| `POST …/characters/[id]/voice-preview` | `voice_generation` | No |
| `POST …/characters/voice-preview-draft` | `voice_generation` | No |
| `POST …/characters/[id]/voice-clone` | `voice_clone` (400 cr) | No |
| `POST …/voice-clones` | `voice_clone` | No |
| `POST …/audio-library/generate-music` | `music_generation` | No |
| `POST …/audio-library/generate-sfx` | `sfx_generation` | No |
| `POST …/subtitles/transcribe` | `subtitle_transcription` | No |
| `POST …/language-exports` | `translation_export` | No |
| Audio library upload / link / GET catalogs | Free | No |
| `POST …/orchestrator/analyze-audio` | Free analysis | No |

---

## 3. Data models (Prisma reality)

- `StudioCharacter` — voice* fields, performance/mouth (not AI lipsync)
- `StudioCharacterVoiceHistory`
- `StudioStoryboard` — voice/music/sound/audioProduction/audioAsset* fields
- `StudioStoryboardVoice`
- `StudioStoryboardSubtitleTrack`
- `StudioScene` — music/sound/audio priority + asset overrides
- `StudioLibraryAsset` — families voice|music|sfx|subtitle
- `StudioBrandKit.kitJson` — optional voiceAssetId/musicAssetId
- `AnimationProject.studioHandoffJson` — plans + export metadata
- `VideoLanguageExport` — overlay localization
- User blob manifests — audio library / voice clones

---

## 4. Directors classification

| Director | WRITE | RECOMMEND | PLAN | HANDOFF | EXECUTE gen | LEGACY? |
|----------|-------|-----------|------|---------|-------------|---------|
| Voice Director | Yes | Yes | Yes | Yes | Via TTS route | No |
| Music Director | Yes (fields) | Yes | Yes | Yes | No | Split from generate |
| Sound Director | Yes | Yes | Yes | Yes | No | Split |
| Audio Production | Yes | Yes | Yes | Yes | No | — |
| Audio Asset | Yes | Yes | Yes | Yes | No | — |
| Voice Identity | Yes | Warnings | Yes | Yes | No | — |
| Creative Director (S.6F) | Orchestrates experiences | Coach | Mode | Handoff | No audio execute | Audio ENGINE_ONLY packs |

---

## 5. Terminology conflicts (UX)

Users may confuse:

| Term | Actual meaning today |
|------|----------------------|
| Voice | Narration TTS and/or Character identity |
| Clone | ElevenLabs IVC → profile ref |
| Music | Planning cues vs generated bed |
| SFX / Sound / Ambience | Often one looped bed |
| Lip sync | Marketing / amplitude mouth — not AI |
| Translate | Overlay language export — not dub |
| Dub | Not a product |

Do not redesign in S.7A.
