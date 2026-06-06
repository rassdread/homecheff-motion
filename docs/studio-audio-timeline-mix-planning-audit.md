# Audio Timeline & Mix Planning Audit

**Date:** 2026-06-06  
**Scope:** Read-only audit — geen code, geen koppeling, geen migratie  
**Companion:** [`docs/studio-audio-foundation-audit-report.md`](studio-audio-foundation-audit-report.md) · [`docs/studio-audio-upload-external-narration-report.md`](studio-audio-upload-external-narration-report.md)

---

## Kernvraag

> Begrijpt Studio muziek en geluid al voldoende om later professioneel te mixen?

**Antwoord: Nee — nog niet.** Studio heeft een **sterke planningslaag** (directors V35–V38, scene metadata, handoff JSON) maar **geen uitvoeringslaag** voor muziek/SFX/mix. Professioneel mixen vereist echte audiobestanden, sample-accurate timeline-events, en FFmpeg multi-track execution — dat ontbreekt grotendeels. Voice (TTS + upload + mux) is de enige live audio-pijplijn.

---

## Wat al bestaat

### 1. Waar muziek/sound planning staat

| Laag | Versie | Engine | UI | Handoff |
|------|--------|--------|-----|---------|
| Music Director | V35 | `src/lib/studio-music-director.ts` | `studio-music-director-panel.tsx`, Director V2 `music-section.tsx` | `attach-music-handoff.ts` |
| Sound Director | V36 | `src/lib/studio-sound-director.ts` | `studio-sound-director-panel.tsx`, `sound-section.tsx` | `attach-sound-handoff.ts` |
| Audio Production Director | V37 | `src/lib/studio-audio-production-director.ts` | `studio-audio-production-director-panel.tsx` (classic editor) | `attach-audio-production-handoff.ts` |
| Audio Asset Director | V38 | `src/lib/studio-audio-asset-director.ts` | `studio-audio-asset-library.tsx` | `attach-audio-asset-handoff.ts` |
| Voice (contrast) | V31+ | `generate-storyboard-voice.ts`, upload | workspace voice tab | `attach-voice-handoff.ts` |

Orchestratie bij Motion handoff: `src/server/studio/create-motion-handoff-payload.ts` — alle plannen worden **runtime berekend** uit storyboard/scene velden, niet uit `*MetadataJson` caches.

### 2. Persistente storyboard/scene velden

**Storyboard (Prisma):**

```
musicEnabled, musicStyle, musicIntensity, musicNarrativeRole, musicNotes, musicMetadataJson
soundEnabled, soundStyle, soundDensity, soundNotes, soundMetadataJson
audioProductionEnabled, audioStyle, audioPriorityStrategy, audioNotes, audioMetadataJson
audioAssetsEnabled, audioAssetNotes, audioAssetMetadataJson
voiceEnabled, voiceProfile, voiceLanguage, voiceNarrationScript, …
```

**`*MetadataJson` kolommen:** aanwezig in schema, **nul reads/writes in `src/`** — gereserveerd voor toekomstige cached director state of gegenereerde asset URLs.

**Per scene (persisted overrides):**

| Domein | Velden |
|--------|--------|
| Music | `musicCueType`, `musicEnergyTarget`, `musicTransitionType`, `musicStartBehavior`, `musicEndBehavior` |
| Sound | `soundEnvironmentOverride`, `soundCharacterOverride`, `soundPropOverride`, `soundTransitionOverride`, `soundAmbientOverride` |
| Mix (V37) | `voicePriority`, `musicPriority`, `soundPriority`, `audioFocus`, `duckingMode` |
| Assets (V38) | `voiceAssetOverride`, `musicAssetOverride`, `ambienceAssetOverride`, `sfxAssetOverride` |
| Visueel → audio | `transitionToNext` (vrije tekst; drijft music/sound transition inference) |
| Timing | `durationSeconds` |

### 3. Computed plan data (runtime)

**Music (`MusicDirectorPlan`):**

- Scene cues: `cueType` (intro/build/transition/climax/resolution), `energyTarget`, `transitionType` (hard_cut/crossfade/riser/ambient_bridge), `startBehavior` (fade_in/hard_start/ambient_pad), `endBehavior` (fade_out/hard_end/tail)
- `duckingRecommended`, `dialoguePriority`, `durationSeconds`, arc phase
- `tempoRange: [minBpm, maxBpm]` per music profile — **planning only, geen beat grid**

**Sound (`SceneSoundCue`):**

- Symbolische IDs: environment (kitchen_ambience, city…), character (footsteps…), objects/SFX (door, sizzling…), transitions (whoosh, riser, impact…), ambient layers
- `densityScore`, `duckingRecommended`, `dialoguePriority`
- Gecoördineerd met music via `musicTransition` parameter in `inferTransitionSounds()`

**Audio Production (V37):**

```typescript
AUDIO_FOCUS_TYPES = ["voice", "music", "sound", "balanced"]
AUDIO_DUCKING_MODES = ["none", "music_under_voice", "full_under_voice", "ambient_reduce"]
SceneMixRecommendation = { voice: 0–100, music: 0–100, sound: 0–100 }
```

Mix levels uit `MIX_TEMPLATES` + arc phase modifiers — **aanbevelingen, geen automation curves**.

**Audio Assets (V38):**

- 28 statische catalog entries (`STUDIO_AUDIO_ASSET_LIBRARY`) — metadata only, `provider: "system"`, **geen audio URLs**
- Scene packages: voice/music/ambience/sfx asset id arrays

### 4. Static catalogs (twee parallelle systemen)

| Catalog | Bestand | Inhoud |
|---------|---------|--------|
| Music profiles | `studio-music-profiles.ts` | 10 stijlpresets: tempoRange, energyRange, instrumentStyle, cueBehaviors |
| Sound profiles | `studio-sound-profiles.ts` | 7 presets: defaultDensity, transitionBias, ambientBias |
| Asset library | `studio-audio-asset-library.ts` | 28 track/SFX ids met mood/energy tags; `duration` is planning seconds, niet echte cliplengte |

### 5. Live audio (alleen voice)

| Capability | Status |
|------------|--------|
| TTS (ElevenLabs) | Live → `StudioStoryboardVoice.audioUrl` + Blob |
| External upload (mp3/wav/m4a) | Live → zelfde voice row (`provider: "upload"`) |
| STT → subtitles | Live → `StudioStoryboardSubtitleTrack` |
| Voice mux op final MP4 | Live → `studio-voice-ffmpeg.ts` |
| Subtitle burn-in | Live → ASS via `burnStudioNarrationSubtitles` |
| Multi-speaker TTS | Live → **sequentiële concat** (`concatVoiceSegmentBuffers`), geen simultaneous mix |

### 6. Duration & timing data

| Bron | Gebruik |
|------|---------|
| `StudioScene.durationSeconds` | Scene planning; voice timing warnings; handoff metadata |
| `StudioStoryboardVoice.durationSeconds` | Werkelijke TTS/upload lengte; subtitle scaling |
| `buildTimedVoiceSegments({ actualDurationSeconds })` | Schaal geschatte per-scene voice spans naar echte audiolengte |
| `voiceSegments[]` op handoff | Per-scene start/end/duration — **metadata only bij mux; audio wordt niet per scene gesliced** |
| `instantOutputDurationSeconds` | Verwachte totale videotimeline |
| `probeVideoSegment().durationSec` | Authoritatief bij render voor mux trim (`-t videoDuration`) |
| `transitionToNext` | Inference voor music transition type + SFX transition sounds |

**Geen:** music beat grid, downbeat markers, bar-aligned cues, of sample-accurate SFX timestamps.

### 7. Render pipeline (FFmpeg)

```
Vidu segments → concat (VIDEO ONLY, -an) → text overlays (-an) → silent final
  → applyStudioVoiceExportToMergedVideo
       1. muxStudioVoiceAudio (single narration AAC)
       2. burnStudioNarrationSubtitles (optional)
  → blob upload
```

- `FINAL_MERGE_DISABLE_AUDIO = true` — segment concat bewust stil; audio pas in post-merge voice export
- Voice mux: 2 inputs (video + 1 audio), `-map 1:a:0`, hard trim `-t {videoDurationSeconds}`
- Language export: text overlay op bestaande video; **geen audio remux**

---

## Wat alleen planning is

| Feature | Planning locatie | FFmpeg / files |
|---------|------------------|----------------|
| Music bed | V35 cues + profiles | ❌ |
| SFX / ambience | V36 symbolic IDs | ❌ |
| Ducking | V35/V36 booleans + V37 `duckingMode` | ❌ geen sidechain/volume automation |
| Fades (in/out) | `musicStartBehavior`, `musicEndBehavior` | ❌ geen `afade` |
| Cuts / crossfades | `musicTransitionType`, `transitionToNext` | ❌ |
| Mix levels | V37 `SceneMixRecommendation` 0–100 | ❌ |
| Asset assignment | V38 catalog ids | ❌ geen files |
| Volume slider (music preview) | `StudioMusicPreviewCard` local state | ❌ niet persisted |
| `StudioAudioMixProviderAdapter` | `studio-audio-mix-provider.ts` | `status: "not_implemented"` |
| Music/SFX generation (ElevenLabs) | provider types | ❌ geen API wiring |

**Conclusie:** Directors produceren **rijke JSON plannen** voor Motion import en UI — geen audiobestanden, geen timeline editor, geen mix engine.

---

## Wat ontbreekt voor professionele audio

1. **Echte music/SFX bestanden** — upload, generatie, of licensed library met URLs
2. **Multi-track timeline model** — lanes (voice, music bed, ambience, SFX) met start/end offsets in seconden (of samples)
3. **FFmpeg multi-input mix** — `amix`, `afade`, `volume`, `sidechaincompress` / ducking filters
4. **Per-scene audio slicing** — music/SFX aligned to `durationSeconds` boundaries
5. **Automation curves** — niet alleen 0–100 static levels maar fade envelopes over time
6. **Beat sync** — tempoRange is geen timeline; geen bar/beat alignment
7. **Storage model voor music/SFX assets** — geen `StudioStoryboardMusic` row pattern (voice row is het enige voorbeeld)
8. **Render executor** — niets leest `musicPlan` / `soundPlan` / `audioProductionPlan` tijdens merge
9. **User project audio library** — alleen system metadata catalog
10. **Preview playback** — music card volume is UI mock

---

## Welke data nodig is voor fades / cuts / ducking

### Al aanwezig (herbruikbaar als **intent**, niet als automation)

| Behoefte | Bestaande Studio data | Gap |
|----------|----------------------|-----|
| **Fade in/out** | `musicStartBehavior`, `musicEndBehavior` | Geen `fadeInSeconds` / `fadeOutSeconds`; geen filter graph |
| **Cuts / crossfades** | `musicTransitionType`, `transitionToNext` | Geen `crossfadeDurationMs`; geen overlap tussen scene stems |
| **Ducking** | `duckingMode`, `duckingRecommended`, `SceneMixRecommendation` | Geen threshold/ratio/attack/release; geen voice-sidechain trigger times |
| **Volume** | Mix template percentages per scene | Geen keyframes; geen LUFS targets (mix provider type heeft optioneel `targetLoudnessLufs` maar unused) |
| **Ambience bed** | `soundAmbientOverride`, ambient asset ids | Geen loop points, geen bed file, geen continuous timeline |
| **SFX timing** | Symbolic SFX ids per scene | Geen `offsetSeconds` binnen scene; geen hit points |
| **Scene duration** | `durationSeconds` | Niet gebruikt om audio stems te trimmen/splicen at render |
| **Voice dominance** | V37 `audioFocus: "voice"`, ducking modes | Alleen planning; mux heeft geen tweede track om onder te ducken |

### Minimale extra data voor P1 mix foundation

```typescript
// Conceptueel — nog niet in schema
type SceneAudioTimelineEvent = {
  sceneId: string;
  lane: "music" | "ambience" | "sfx" | "voice";
  assetUrl: string;           // Blob URL
  startSeconds: number;       // timeline offset (project or scene-relative)
  durationSeconds: number;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
  volume?: number;            // 0–1
  duckUnderVoice?: boolean;
};

type ProjectAudioMixPlan = {
  totalDurationSeconds: number;
  ducking: { mode: AudioDuckingMode; musicGainDb: number; sfxGainDb: number };
  events: SceneAudioTimelineEvent[];
};
```

Dit kan initieel in bestaande `audioMetadataJson` / handoff JSON zonder migratie — maar vereist wel **render executor** + **asset URLs**.

---

## Welke bestaande FFmpeg functies herbruikbaar zijn

| Module | Hergebruik | Notities |
|--------|------------|----------|
| `studio-voice-ffmpeg.ts` | **Hoog** | Natuurlijk extension point voor `filter_complex` multi-input; docs noemen `muxStudioAudioLayers` als toekomst |
| `apply-studio-voice-export.ts` | **Hoog** | Post-merge orchestrator; chain mix vóór subtitle burn |
| `burnStoryTextOverlay` / ASS burn | **Medium** | Re-encodeert video; mixed audio moet vóór burn klaar zijn of via `-c:a copy` |
| `concatVoiceSegmentBuffers` | **Laag** | Sequential concat — ander probleem dan simultaneous bed+voice |
| `segment-transition.ts` | **Laag voor audio** | Video concat + transitions; altijd `-an` |
| `probeVideoSegment` | **Hoog** | Duration authority voor trim/mix alignment |
| `resolveFfmpegForTextOverlay` / `runFfmpegCapture` | **Hoog** | Shared FFmpeg runner |

**Niet aanwezig:** `amix`, `afade`, `sidechaincompress`, `loudnorm`, multi-map audio inputs.

**Architecturale fit:** `FINAL_MERGE_DISABLE_AUDIO` design is **compatible** — music/SFX horen in final post-process (voice export stage), niet in segment concat.

---

## Welke Studio metadata herbruikbaar is

| Metadata | Hergebruik voor mix |
|----------|---------------------|
| V35 scene music cues | Map naar music stem segments per scene; transition types → fade/crossfade params |
| V36 sound cues | Map SFX hits to scene start + keyword offsets (heuristic until precise timing) |
| V37 ducking modes + mix % | Default gains/ducking filter params |
| V38 asset ids | Lookup table once real files exist |
| Scene `durationSeconds` | Scene boundary trim points |
| `transitionToNext` | Crossfade duration heuristic between scenes |
| Voice `durationSeconds` + segments | Sidechain trigger regions; narration dominance windows |
| Handoff `motionAudioExport` | Extend with `musicEnabled`, `mixPlan`, `lastMix` (pattern exists for voice) |

**Niet herbruikbaar zonder interpretatie:** symbolic SFX ids (need files), tempoRange (need beat engine), static catalog durations.

---

## Audit-antwoorden (9 specifieke vragen)

| # | Vraag | Antwoord |
|---|-------|----------|
| 1 | Waar staat planning? | V35–V38 libs + scene/storyboard fields + Motion handoff JSON |
| 2 | Welke data bestaat? | Scene duration ✅; fade/cut **intent** ✅; volume **percentages** ✅; ducking **modes** ✅; ambience/SFX **ids** ✅; beat timing ❌; transitions **inferred from text** ⚠️ |
| 3 | Wat ontbreekt? | Audio files, timeline events, FFmpeg mix, automation curves, beat sync, storage rows |
| 4 | FFmpeg multi-track? | **Nee** — single narration track only |
| 5 | Opslag uploaded music/SFX? | **Nee** — voice upload pattern exists but not extended to music/SFX |
| 6 | Music/SFX herbruikbaar? | Catalog ids + planning reusable; **no binary assets to reuse** |
| 7 | Weet Studio wanneer muziek moet opbouwen/zakken? | **Planning only** — arc phase + energy curve + cue types; not executed |
| 8 | Voice-over dominant over muziek? | **Planning only** (`duckingMode`, mix templates); mux has no music track to duck |
| 9 | MP4 import hergebruik? | **Partial** — duration probe, FFmpeg runner, voice mux hook, subtitle burn; would need audio extraction + timeline mapping (not built) |

---

# Audio Timeline & Mix Planning Report

## Bestaande systemen

- **Planning stack (V35–V38):** music cues, sound taxonomy, mix recommendations, static asset catalog — volledig getest, volledig in handoff
- **Voice stack (V31–V32 + upload sprint):** enige end-to-end audio — TTS/upload → Blob → single-track mux → optional subtitle burn
- **Timing helpers:** scene duration, voice segment scaling, subtitle word timing
- **Production readiness:** `studio-production-center.ts` flags voor music/sound/mix/asset plans
- **Future hooks:** `StudioAudioMixProviderAdapter`, `StudioAudioAssetProviderAdapter` — interfaces only

## Ontbrekende systemen

- Multi-track audio timeline (data model + UI)
- Music/SFX file storage (Blob + Prisma pattern)
- FFmpeg mix executor (reads handoff plan → produces mixed AAC)
- Fade/duck automation (filter graphs, not booleans)
- Beat-aligned music editing
- Audio preview playback in Studio
- Render-time consumer of V35–V38 plans
- User/project audio asset library

## Herbruikbare FFmpeg onderdelen

1. `buildStudioVoiceMuxFfmpegArgs` → extend to N inputs + `filter_complex`
2. `applyStudioVoiceExportToMergedVideo` → orchestration slot for mix step
3. `probeVideoSegment` → timeline length authority
4. `runFfmpegCapture` / capability layer → shared runner
5. Post-merge-only audio design (`FINAL_MERGE_DISABLE_AUDIO`) → correct insertion point

## Herbruikbare Studio metadata

- All V35–V38 computed plans on Motion handoff payload v25
- Per-scene override columns (already persisted)
- `duckingMode`, `audioFocus`, mix level recommendations
- `durationSeconds` per scene + total video probe
- Voice segment timing for sidechain windows
- Asset id → future URL mapping via V38 selectors

## Risico's

| Risico | Impact |
|--------|--------|
| Planning/reality gap | Users see mix recommendations but hear voice-only export — trust erosion |
| `*MetadataJson` unused | Risk of duplicate state if mix plan stored ad hoc without convention |
| Subtitle burn order | Mix must complete before burn or audio re-encoded incorrectly |
| Symbolic SFX ids | Heuristic placement until precise timestamps or waveform alignment |
| No beat engine | Music beds cannot sync to cuts without manual timeline or MP4 audio extraction |
| Extending voice row pattern | Tempting to overload `StudioStoryboardVoice` for music — prefer parallel asset type |
| MP4 import before mix foundation | Imported audio tracks need timeline model; building editor first duplicates voice upload work |

## Aanbevolen volgende sprint

**Beslispunt na deze audit — ranked recommendation:**

### Optie A — Music/SFX mix foundation (aanbevolen vóór timeline editor)

**Waarom eerst:** Planning layer is rijp; FFmpeg hook exists; voice path proves Blob+mux pattern. Lowest risk path to audible music/SFX without DAW UI.

**P1 minimale scope (veilig):**

1. **Music/SFX asset type** — mirror voice row or extend catalog with Blob URLs (upload + optional ElevenLabs gen later)
2. **Scene-relative timeline JSON** in handoff (start, duration, fade, volume) — no schema migration if stored in existing `*MetadataJson`
3. **FFmpeg mix executor** — extend `studio-voice-ffmpeg.ts`: voice + 1 music bed + optional ambience; read V37 ducking mode as static gain reduction (not full sidechain yet)
4. **Wire handoff → merge** — `apply-studio-voice-export.ts` reads `audioProductionPlan` for gains
5. **NL/EN status in audio production panel** — linked/missing per lane

**P2:**

- Full sidechain ducking, per-SFX offsets, crossfade between scene stems
- Beat grid / tempo sync
- Timeline editor UI
- ElevenLabs music/SFX generation wiring

### Optie B — MP4 import

Reuse: probe, FFmpeg extract, duration alignment, subtitle STT.  
Blocker: without timeline model, imported audio cannot mix with generated voice/music. **Better after A.1–A.3.**

### Optie C — Timeline editor

High UX cost; depends on timeline data model from A. **Not first.**

### Optie D — Music/SFX generation

Provider APIs exist as types; needs asset storage (A.1) before meaningful output.

---

## Minimale P1 implementatie (veilig)

| Step | Deliverable | Reuses |
|------|-------------|--------|
| 1 | `StudioStoryboardMusic` / `StudioStoryboardSfx` OR voice-row convention with `provider: "music"` | Voice Blob upload pattern |
| 2 | Build `ProjectAudioMixTimeline` from V35+V36+V37+scene durations | Existing directors |
| 3 | `muxStudioAudioLayers()` in voice-ffmpeg | Current mux args |
| 4 | Handoff field `mixTimeline` + merge consumer | `motionAudioExport` pattern |
| 5 | Tests: mix args snapshot, handoff round-trip | v32 voice export tests |

**Explicitly out of P1:** DAW UI, beat sync, MP4 import, provider generation, schema migration (unless asset rows prove insufficient).

## Wat P2 blijft

- Full timeline editor with waveform
- MP4 import + multi-track extraction
- Sidechain ducking automation
- Music generation (ElevenLabs)
- SFX generation + precise hit timing
- LUFS mastering chain (`loudness_normalize` provider id)
- Cross-scene continuous music bed (no hard cuts per scene)
- Real-time preview mix in Studio workspace

---

## Besluitmatrix (A / B / C / D)

| Criterium | A Mix foundation | B MP4 import | C Timeline editor | D Music/SFX gen |
|-----------|------------------|--------------|-------------------|-----------------|
| Builds on existing planning | ✅✅✅ | ✅ | ⚠️ needs data model | ✅ |
| FFmpeg reuse | ✅✅✅ | ✅✅ | ⚠️ | ✅ |
| User-visible audio improvement | ✅✅ | ✅✅ (if narration in MP4) | ⚠️ later | ✅✅ |
| Risk | Low–medium | Medium | High | Medium |
| Depends on | Asset storage | Timeline model | Mix model | Asset storage |

**Recommendation:** **A (Music/SFX mix foundation)** as next sprint — specifically asset storage + FFmpeg 2–3 track mix + handoff consumer. Defer B/C until timeline JSON exists. D can parallel once A.1 ships.

---

## Validatie

Geen codewijzigingen in deze audit. Bestaande suite op `main` (post audio-upload sprint):

- Lint: 0 errors
- Build: success
- Tests: 1565/1565 pass
- Typecheck: pre-existing orphan test failure (`studio-voice-identity-sprint.test.ts`)

---

*Audit only. Geen implementatie, geen koppeling, geen migratie.*
