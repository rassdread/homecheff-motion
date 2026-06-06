# ElevenLabs Capability Audit

**Source of truth** for ElevenLabs integration in Motion/Studio.

Last audited: 2026-06-06. Scope: SDK/endpoints, env vars, wrappers, UI, Studio workspace, vs [ElevenLabs API v1](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).

---

## Conclusie

- **ElevenLabs API is aanwezig** — live runtime via raw `fetch` naar `https://api.elevenlabs.io/v1/...` (geen official SDK in `package.json`).
- **TTS is gedeeltelijk live** — één endpoint in productie; classic editor + Motion handoff; workspace voice-tab nog placeholder.
- **STT, voice cloning, sound effects en music generation** zijn waarschijnlijk via ElevenLabs mogelijk op API-niveau, maar **nog niet** in onze code/UI geïntegreerd.
- **Geen nieuwe providers zoals Suno/Udio nodig** voordat ElevenLabs volledig is benut — zie [`docs/provider-capability-matrix.md`](provider-capability-matrix.md).
- **Studio V2** moet eerst bestaande ElevenLabs-capabilities netjes integreren (workspace embed, geen parallelle music-provider stack).

---

## Integratie-overzicht

| Onderdeel | Status |
|-----------|--------|
| **SDK** | ❌ Geen `@elevenlabs/elevenlabs-js` — **raw `fetch` only** |
| **API-versie** | **`v1`** |
| **Endpoints in gebruik** | **1:** `POST /v1/text-to-speech/{voice_id}` |
| **Env vars** | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (optional), `STUDIO_VOICE_PROVIDER=mock` — zie `.env.example` |
| **Abonnement-aannames in code** | ❌ Geen tier/plan checks; planning-only credit estimate `ceil(chars/500)` in `estimateVoiceCredits()` |
| **Hoofd-wrapper** | `src/lib/elevenlabs-voice.ts` |
| **Runtime selector** | `src/server/studio/voice/voice-provider.ts` |
| **Orchestratie** | `src/server/studio/generate-storyboard-voice.ts`, `generate-character-voice-preview.ts` |
| **API routes** | `POST/GET /api/studio/storyboards/[id]/voice`, `POST /api/studio/characters/[id]/voice-preview` |
| **Registry metadata** | `src/lib/studio-provider-registry.ts` — ElevenLabs `status: "planned"` (**tegenstrijdig** met live TTS; registry = planning layer) |

**Verouderde doc:** `docs/studio-voice-director-future.md` claimt nog “No TTS API calls” — **incorrect** sinds V31 voice execution.

---

## ElevenLabs capabilities

| Feature | API beschikbaar? | Code aanwezig? | UI aanwezig? | Studio geïntegreerd? | Status |
|---------|------------------|----------------|--------------|----------------------|--------|
| **Text to Speech** | ✅ `POST /v1/text-to-speech/{voice_id}` | ✅ `synthesizeElevenLabsSpeech()` | ⚠️ Classic: generate + preview; V2: preview only; workspace voice-tab = placeholder | ⚠️ Classic + Motion mux; **niet** workspace toolstrip | **3 — Gedeeltelijk gebouwd** |
| **Speech to Text** | ✅ `POST /v1/speech-to-text` | ❌ | ❌ | ❌ (subtitles uit TTS-timing; OCR via Google/OpenAI) | **2 — API aanwezig, niet gebruikt** |
| **Voice Cloning** | ✅ o.a. `POST /v1/voices/add` | ⚠️ Types only (`cloneVoice` → `not_implemented`) | ❌ | ❌ | **2 — API aanwezig, niet gebruikt** |
| **Voice Library** | ✅ `GET /v1/voices/search` e.d. | ⚠️ 6 hardcoded IDs in `PROFILE_VOICE_IDS`; geen list-API | ⚠️ Preset dropdown only | ⚠️ Presets → vaste IDs | **3 — Gedeeltelijk** |
| **Voice Design** | ✅ design endpoints | ❌ | ❌ | ❌ | **2 — API aanwezig, niet gebruikt** |
| **Dubbing** | ✅ `POST /v1/dubbing` | ❌ | ❌ | ❌ (vertaling via OpenAI in language export) | **4 — Niet in ElevenLabs-integratie** |
| **Translation** | ⚠️ Via dubbing/STT+TTS | ❌ ElevenLabs | ✅ OpenAI language export | ✅ Motion; **niet** via ElevenLabs | **4 — Niet via ElevenLabs** |
| **Audio Cleanup** | ⚠️ Geen apart endpoint; deels via isolation | ❌ | ❌ | ❌ | **4 — Niet beschikbaar in integratie** |
| **Voice Isolation** | ✅ audio isolation API | ❌ | ❌ | ❌ | **2 — API aanwezig, niet gebruikt** |
| **Sound Effects** | ✅ sound generation API | ⚠️ Type `elevenlabs_sfx` only | ⚠️ Sound director panels (planning) | ❌ Niet in merge | **2 — API aanwezig, niet gebruikt** |
| **Music generation** | ✅ `POST /v1/music` (+ `/v1/music/plan`) | ⚠️ Type `elevenlabs_music` only | ⚠️ Music preview card (geen audio) | ❌ Niet in merge | **2 — API aanwezig, niet gebruikt** |
| **Conversational AI** | ✅ Agents platform API | ❌ | ❌ | ❌ | **2 — API aanwezig, niet gebruikt** |

**Status legenda:** 1 = volledig gebouwd · 2 = API wel, code niet · 3 = gedeeltelijk · 4 = niet in huidige integratie

---

## TTS — wat live is vs gaps

### Gebouwd

- Single-narrator + **multi-character** (per speaker line → TTS → segment concat)
- Model hardcoded: **`eleven_multilingual_v2`**
- Voice settings: `stability`, `similarity_boost`, `style`, `use_speaker_boost`
- MP3 → Vercel Blob → Motion voice mux + subtitle burn
- Mock fallback zonder key of met `STUDIO_VOICE_PROVIDER=mock`

### Niet naar API gestuurd (wel deels in `buildVoiceRequest`)

- `language_code` — in request-type, **niet** in POST body
- Presets suggereren `eleven_turbo_v2` — code gebruikt altijd `eleven_multilingual_v2`
- Geen `output_format`, streaming, pronunciation dictionaries, forced alignment, text-to-dialogue

### Voice ID-resolutie

1. `ELEVENLABS_VOICE_ID` env (global override)
2. Preset → 6 vaste voice IDs in `PROFILE_VOICE_IDS`
3. Geen per-character cloned voice ID uit DB (character heeft `voiceProfile`, geen `providerVoiceId` op character model)

---

## Wrappers & ongebruikte helpers

| Module | Rol | Gebruik |
|--------|-----|---------|
| `src/lib/elevenlabs-voice.ts` | Build request, validate, synthesize, credits | ✅ Actief |
| `src/server/studio/voice/voice-provider.ts` | ElevenLabs vs mock | ✅ Actief |
| `src/lib/studio-voice-profiles.ts` | 6 presets + voice settings | ✅ Actief |
| `src/lib/studio-voice-director.ts` | Script/timing analyse | ✅ Input voor generate |
| `src/lib/studio-production-providers.ts` | Key presence check | ✅ Actief |
| `src/types/studio-voice-provider-identity.ts` | `StudioVoiceProviderIdentityAdapter` | ❌ Geen implementatie |
| `src/types/studio-music-provider.ts` | `elevenlabs_music` | ❌ Type only |
| `src/types/studio-sound-provider.ts` | `elevenlabs_sfx` | ❌ Type only |

---

## Activerings-analyse

### Waarschijnlijk via bestaande `ELEVENLABS_API_KEY` (geen nieuwe provider)

| Functie | Inspanning |
|---------|------------|
| TTS verbeteren (`language_code`, model per preset, `output_format`) | Klein |
| Voice library browse (`GET /v1/voices`) | Medium |
| Forced alignment (betere subtitles) | Medium |
| Text-to-dialogue (multi-character) | Medium |
| Speech-to-text | Medium (plan/credits afhankelijk) |
| Sound effects + music generation | Medium–groot (backend + merge mux) |
| Voice isolation | Klein–medium |

### Alleen UI + API wiring

- Workspace voice-tab (embed classic `StudioVoiceDirectorPanel`)
- Voice library picker in character voice center
- STT → subtitle import
- SFX/music knoppen aan director plans
- Voice clone flow (sample upload → `voices/add` → store voice ID)

### Waarschijnlijk extra plan/credits/scoped key

- Professional voice cloning (PVC) slots
- Dubbing product
- Music API (scoped keys mogelijk)
- Hogere audio formats (Creator/Pro per ElevenLabs docs)
- Agents / Conversational AI platform

---

## Aanbevolen volgorde (Studio V2)

1. **P0** — Workspace embed bestaande TTS (classic panel → voice tool tab)
2. **P0** — TTS quick wins: `language_code`, preset→model mapping
3. **P1** — ElevenLabs STT vs OpenAI translate: bewuste keuze, geen dubbel pad
4. **P1** — ElevenLabs music/SFX **vóór** Suno/Udio registry wiring
5. **P2** — Voice clone + library browse

---

## Related docs

- [`docs/provider-capability-matrix.md`](provider-capability-matrix.md) — cross-provider overview; **primary audio provider = ElevenLabs**
- [`docs/studio-v2-architecture-plan.md`](studio-v2-architecture-plan.md) — workspace embed plan
- `.env.example` — `ELEVENLABS_*`, `STUDIO_VOICE_PROVIDER`

**Rule:** Voor “wat kan ElevenLabs?” → **this document**. Voor “wat draait in prod?” → runtime files + provider matrix.
