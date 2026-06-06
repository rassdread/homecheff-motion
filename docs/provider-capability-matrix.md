# Provider Capability Matrix

**Source of truth** for what is production-ready versus planning/registry-only in Motion/Studio.

Last audited: 2026-06-06. Scope: env schema, runtime providers, API routes, server libs, Studio/Motion UI, Prisma, tests, docs.

**Primary audio provider (now):** **ElevenLabs** — live TTS runtime. Detail: [`docs/elevenlabs-capability-audit.md`](elevenlabs-capability-audit.md).

**Music/SFX registry note:** **Suno** and **Udio** (and Freesound/Artlist for SFX) exist only as **V41 planning-registry entries** — no API adapters, no env keys, not the primary product direction. Prefer exhausting ElevenLabs music/SFX APIs before adding parallel providers.

---

## Architecture (two layers)

| Layer | Purpose | Status |
|-------|---------|--------|
| **Runtime providers** | Real API calls (Vidu, OpenAI images/vision/OCR, ElevenLabs, FFmpeg) | Mix of implemented, mock, flag-gated |
| **Studio V41 registry** | Metadata, assignment, cost/latency planning for UI | **Planning only** — every entry is `status: "planned"` in `src/lib/studio-provider-registry.ts` |

There is **no centralized Zod env schema**. Env handling is ad-hoc: `process.env` reads + throw-on-use validation in provider modules. Primary documentation: `.env.example`.

**Studio V2 workspace:** toolstrip tabs `voice`, `music`, `sound`, `text`, `subtitles`, `translate`, `export` are in `STUDIO_PLACEHOLDER_TOOL_IDS` → `StudioToolPlaceholderPanel`. Director V2 (story tab) has partial audio fields; full wiring lives in **classic editor** and **Motion** (`/animate/instant`, `/videos/[id]`).

---

## Provider Capability Matrix

| Functie | Provider aanwezig? | Env key aanwezig? | Backend geïmplementeerd? | UI geïmplementeerd? | Studio-workspace geïntegreerd? | Productie-ready? | Wat ontbreekt? | P0/P1/P2 |
|---------|-------------------|-------------------|--------------------------|----------------------|-------------------------------|------------------|----------------|----------|
| **Vidu video generation** | ✅ Vidu (`ViduVideoProvider`) + mock | ✅ `ANIMATION_PROVIDER`, `VIDU_API_KEY`, `VIDU_ENABLE_REAL_CALLS`, `VIDU_MODEL`, `VIDU_RESOLUTION`, `VIDU_DURATION_SECONDS`, `VIDU_BASE_URL` | ✅ Job create + poll via `animation-jobs/service.ts` → `/ent/v2/start-end2video` & `/ent/v2/multiframe` | ✅ Motion wizard + progress; not in workspace export tab | ❌ Handoff via “Maak video” only | ⚠️ **Yes if** `ANIMATION_PROVIDER=vidu` + `VIDU_ENABLE_REAL_CALLS=true` + key; else mock | Double gating; no Vidu UI in workspace; registry Vidu = planning only | **P0** (document/env) |
| **Image-to-video** | ✅ Vidu start-end2video | ✅ Same Vidu env | ✅ Pairwise transitions (`instantMode: "transition"`) + classic animation | ✅ `/animate/instant` wizard | ❌ Handoff only | ⚠️ Same as Vidu | Classic `/animate` redundant; no inline preview in workspace | **P1** |
| **Story-to-video** | ✅ Vidu multiframe | ✅ + `VIDU_MULTIFRAME_MODEL` | ✅ 2–9 images, `story-mode-transitions.ts`, segment duration 2–7s | ✅ Instant story mode UI | ❌ Handoff only | ⚠️ Same Vidu gating | Post-Vidu overlays via FFmpeg; multiframe env now in `.env.example` | **P1** |
| **Text overlays** | ✅ FFmpeg ASS + typography (not generative) | ✅ `FFMPEG_PATH`, `FFMPEG_FONT_PATH`, worker env | ✅ `story-text-overlay.ts`, `locked-text-overlay.ts`, hybrid OCR patches | ✅ Instant storyboard editor, full-rerender, text rerender on `/videos/[id]` | ⚠️ Director V2 text = read-only beats; tool tab = placeholder | ✅ In Instant/Motion pipeline | Workspace text tab not wired; drawtext + font required in prod | **P0** (workspace embed) |
| **Subtitles** | ✅ TTS timing + manual edit (no STT) | ✅ Part of voice/export flow | ✅ `generate-storyboard-voice.ts`, `burnStudioNarrationSubtitles`; APIs `/subtitles`, `/audio-export` | ✅ Classic + Motion panels | ❌ Subtitles tab = placeholder; not in Director V2 | ⚠️ **Partial** — burn-in works in merge | No speech-to-text; workspace tab; no subtitle edit in V2 | **P0** (V2 embed) / **P2** (STT) |
| **Translations / language exports** | ✅ OpenAI translate + FFmpeg re-render | ✅ `OPENAI_API_KEY` + worker/render env | ✅ `language-export-service.ts`, `VideoLanguageExport` model | ✅ `language-export-panel.tsx` on `/videos/[id]` | ❌ Translate tab = placeholder | ✅ With OpenAI key + FFmpeg worker | Post-render Motion only; not from workspace | **P1** |
| **Voice-over / TTS** | ✅ **ElevenLabs** runtime + mock | ✅ `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `STUDIO_VOICE_PROVIDER` | ✅ `elevenlabs-voice.ts`, `generate-storyboard-voice.ts`, mux in merge | ✅ Classic voice panels; V2 preview button; Motion audio wizard | ⚠️ Voice tab placeholder; V2 = preview only | ⚠️ **Yes if** `ELEVENLABS_API_KEY`; else mock WAV | Workspace voice tab; TTS partial — see [ElevenLabs audit](elevenlabs-capability-audit.md) | **P0** |
| **Voice cloning** | ⚠️ ElevenLabs API (`/v1/voices/add`); types only in code | ❌ `cloneVoice` → `not_implemented` | ❌ | ❌ | ❌ | ElevenLabs wiring + UI; no new provider | **P2** |
| **Voice recording/upload** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Upload API, MediaRecorder UI, storage model | **P2** |
| **Music generation/selection** | ⚠️ **ElevenLabs** music API (not wired); Suno/Udio = registry only | ❌ No music provider env | ⚠️ Director plans only; **not in merge pipeline** | ✅ Classic + V2 plan cards (no `<audio>`) | ❌ Music tab = placeholder | ❌ | ElevenLabs music adapter first; Suno/Udio not primary | **P1** |
| **Sound effects** | ⚠️ **ElevenLabs** SFX API (not wired); Freesound/Artlist = registry only | ❌ | ⚠️ `studio-sound-director.ts` — planning only | ✅ Classic + V2 env overrides | ❌ Sound tab = placeholder | ❌ | ElevenLabs SFX adapter; static catalog interim | **P2** |
| **Audio muxing** | ✅ FFmpeg (`studio-voice-ffmpeg.ts`) | ✅ FFmpeg + worker env | ⚠️ **Voice + subtitle burn only** | ✅ Motion audio export settings | ❌ | ⚠️ Voice path prod-ready; music/SFX mix not | Multi-track mix from directors not executed | **P1** |
| **Existing video upload/edit** | N/A (images + project re-edit) | ✅ Blob/upload env | ⚠️ Image upload, full-rerender, repair; **no MP4 import** | ⚠️ `/maak` “edit existing video” = coming soon | ❌ | ❌ For raw video import | MP4 upload pipeline | **P2** |
| **Automatic subtitle extraction** | ✅ OCR: Google Vision + OpenAI Vision; ElevenLabs STT API unused | ✅ `GOOGLE_VISION_API_KEY`, `OPENAI_API_KEY` | ⚠️ **OCR only** (image + video-frame); **no STT** | ✅ Baked-text panels, auto-scan | ❌ | ⚠️ OCR prod-ready; no audio→text | ElevenLabs STT optional — see [ElevenLabs audit](elevenlabs-capability-audit.md) | **P1** (OCR) / **P2** (STT) |
| **FFmpeg post-processing** | ✅ Infrastructure | ✅ `FFMPEG_PATH`, `VIDEO_RENDER_MODE`, `VIDEO_WORKER_*`, etc. | ✅ Concat, overlays, voice mux, poster motion, language export | ✅ Admin health; render progress | ❌ Via Motion only | ✅ With worker + drawtext-capable FFmpeg | Env complexity; `ALLOW_UNSAFE_VIDEO_RENDERING` bypass | **P0** (keep infra stable) |

---

## Runtime providers (real integrations)

| Provider | Registry / file | Selection | Status |
|----------|-----------------|-----------|--------|
| **Vidu** | `src/server/video-providers/vidu.ts` | `ANIMATION_PROVIDER=vidu` | Implemented, flag-gated |
| **Mock video** | `src/server/video-providers/mock-provider.ts` | Default without Vidu flags | Dev stub |
| **OpenAI images** | `src/server/scene-image-providers/openai-provider.ts` | `STUDIO_SCENE_IMAGE_*` | Implemented |
| **OpenAI vision/OCR** | `src/server/image-text-detection/`, `studio-vision-providers/` | Auto / key-based | Implemented |
| **ElevenLabs TTS** | `src/server/studio/voice/voice-provider.ts` | `ELEVENLABS_API_KEY` | Implemented + mock |
| **FFmpeg** | `src/lib/ffmpeg/`, `video-ffmpeg-capability.ts` | Binary paths + worker | Implemented |

**Video provider registry:** `src/server/video-providers/index.ts` — `vidu` | `mock`.

---

## Planning-only registry

**File:** `src/lib/studio-provider-registry.ts`  
**UI:** `/studio/providers` — metadata table only, no credential wiring.

All registered IDs (ElevenLabs, OpenAI Voice, Azure Voice, Suno, Udio, Freesound, Artlist, OpenAI Images, Vidu, Kling, Runway, mock) have **`status: "planned"`**.

**Important:** ElevenLabs **TTS is live** at runtime despite registry `planned` status. Suno/Udio/Freesound/Artlist are **not** alternate runtime paths — registry placeholders only until ElevenLabs audio capabilities are integrated. See [`docs/elevenlabs-capability-audit.md`](elevenlabs-capability-audit.md).

Related planning-only modules:

- `src/lib/studio-provider-capabilities.ts` — static capability matrix
- `src/lib/studio-provider-execution-director.ts` — execution plan with `planning_only` warnings
- `src/types/studio-music-provider.ts`, `studio-sound-provider.ts`, `studio-audio-mix-provider.ts` — adapter interfaces, `not_implemented`

Music/sound directors explicitly state **no audio generation** (`studio-music-director.ts`, `studio-sound-director.ts`).

---

## Studio V2 integration status

```
Workspace toolstrip
├── story          → Director V2 (wired: scene save, partial audio)
├── characters…    → asset links (partial)
├── voice…export   → PLACEHOLDER (studio-tool-placeholder-panel)
Classic editor       → full voice/subtitles/music/sound (advanced only)
Motion               → render + post-render voice/subtitles/translate/export
```

**Placeholder tool IDs:** `src/lib/studio-tool-id.ts` — `voice`, `music`, `sound`, `text`, `subtitles`, `translate`, `export`.

**Flags:** `NEXT_PUBLIC_STUDIO_DIRECTOR_V2`, `NEXT_PUBLIC_PRODUCTION_MODE`, `STUDIO_VOICE_PROVIDER=mock`, `hc-studio-advanced-features` (localStorage).

---

## Production readiness summary

| Tier | Capabilities |
|------|-------------|
| **Prod-ready (with env)** | Vidu video (gated), image-to-video, story-to-video, OpenAI scene images, ElevenLabs TTS, text overlays, voice mux + subtitle burn, language exports, FFmpeg merge (worker) |
| **Partial** | Subtitles (TTS-derived), audio mux (voice only), OCR text extraction, project re-edit/repair |
| **Planning only** | Music/SFX generation (ElevenLabs APIs not wired), voice clone, voice upload, provider registry execution, multi-track audio mix; Suno/Udio registry entries |
| **Not started** | Raw MP4 upload/edit, speech-to-text |

---

## Flag-gated behavior

| Env | Effect |
|-----|--------|
| `ANIMATION_PROVIDER=vidu` | Select Vidu provider class |
| `VIDU_ENABLE_REAL_CALLS=true` | Allow real Vidu HTTP (required for prod video) |
| `STUDIO_VOICE_PROVIDER=mock` | Force mock TTS (silent WAV) |
| `STUDIO_SCENE_IMAGE_PROVIDER=mock` | Force mock scene images |
| `VIDEO_RENDER_MODE=worker` | FFmpeg delegated to Railway worker |
| `ALLOW_UNSAFE_VIDEO_RENDERING=true` | Skip drawtext preflight (test/dev only) |

---

## Merge pipeline order (Instant Premium)

**Orchestrator:** `src/server/instant-premium/merge-instant-project.ts`

Rough order: Vidu segments → FFmpeg concat → story/locked text overlay → poster motion → **voice mux + subtitle burn** → character performance overlay → blob upload.

**Not applied in merge:** music plan, sound plan, audio production/asset director outputs (metadata in handoff only).

---

## Recommended order before AI Director / Studio tools integration

1. **P0** — This matrix + env docs (`.env.example`) + [ElevenLabs audit](elevenlabs-capability-audit.md)
2. **P0** — Workspace embed — replace placeholder tool panels with classic-equivalent wiring (voice → subtitles → text)
3. **P0** — Voice path end-to-end in V2 (generate + preview; ElevenLabs TTS APIs exist)
4. **P1** — ElevenLabs music/SFX adapters + handoff (before Suno/Udio)
5. **P1** — Translate/export tabs — embed or link to Motion panels
6. **P2** — MP4 import, ElevenLabs voice clone/STT

---

## Key reference files

| Domain | Path |
|--------|------|
| Video providers | `src/server/video-providers/index.ts`, `vidu.ts` |
| Voice / ElevenLabs | `src/server/studio/voice/voice-provider.ts`, `src/lib/elevenlabs-voice.ts`, `generate-storyboard-voice.ts` |
| Merge | `src/server/instant-premium/merge-instant-project.ts` |
| Planning registry | `src/lib/studio-provider-registry.ts` |
| Production env checks | `src/lib/studio-production-providers.ts` |
| Workspace placeholders | `src/lib/studio-tool-id.ts`, `studio-workspace-shell.tsx` |
| Classic wired panels | `src/components/studio/studio-storyboard-editor.tsx` |
| Tests | `studio-voice-execution.test.ts`, `motion-v32-voice-export.test.ts`, `video-ffmpeg-capability.test.ts`, `motion-v41-provider-execution.test.ts` |

---

## Related docs

- [`docs/elevenlabs-capability-audit.md`](elevenlabs-capability-audit.md) — **ElevenLabs source of truth** (TTS partial; STT/SFX/music/clone not wired)
- `docs/motion-studio-production-reality-audit.md` — Motion pipeline reality
- `docs/studio-v2-architecture-plan.md` — P1 workspace embed plan
- `docs/director-v2-status.md` — Director V2 section status (partially stale)
- `docs/deep-i18n-audit-report.md` — Copy/i18n cleanup (separate track)

**Rule:** Treat **runtime provider files** and **this matrix** as truth for “can we ship it?” Treat **V41 registry** as roadmap metadata only. For ElevenLabs specifically → **elevenlabs-capability-audit.md**. **Primary audio provider = ElevenLabs**; Suno/Udio are not the primary direction.
