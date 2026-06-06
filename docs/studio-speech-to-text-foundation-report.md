# Speech To Text Foundation Report

**Date:** 2026-06-06  
**Scope:** Minimal STT foundation — ElevenLabs only, no schema migrations, no MP4 import, voice clone, or music generation.

---

## Welke systemen zijn hergebruikt

| System | Reuse |
|--------|-------|
| `ELEVENLABS_API_KEY` | Same key as TTS |
| `StudioStoryboardSubtitleTrack` | STT output stored in existing table |
| `StudioStoryboardVoice.audioUrl` | Audio source for STT (Vercel Blob from TTS) |
| `buildSrtFromSubtitleEntries` / `parseSubtitleEntriesJson` | SRT + JSON parsing unchanged |
| `attach-voice-handoff.ts` / Motion merge | Subtitle burn-in reads same track |
| `create-motion-handoff-payload.ts` | Loads subtitle track for handoff |
| `studio-voice-client.ts` | Extended with transcript API client |
| `StudioSubtitlePreviewPanel` | Extended (not replaced) |
| `selectVoiceProvider` pattern | Mirrored in `selectSttProvider` |

---

## Hoe ElevenLabs STT is geïntegreerd

- **Wrapper:** `src/lib/elevenlabs-speech-to-text.ts`
- **Endpoint:** `POST https://api.elevenlabs.io/v1/speech-to-text`
- **Model:** `scribe_v2`
- **Input:** `source_url` pointing to existing narration `audioUrl` (HTTPS Blob URL)
- **Output:** `text` + word-level `words[]` with `start` / `end` timestamps
- **Provider selector:** `src/server/studio/speech/stt-provider.ts`
  - Live when `ELEVENLABS_API_KEY` set
  - Mock when `STUDIO_STT_PROVIDER=mock` or no key
- **API route:** `POST /api/studio/storyboards/[id]/subtitles/transcribe`
- **Orchestration:** `src/server/studio/generate-storyboard-transcript.ts`

---

## Hoe subtitle tracks worden gevuld

1. User generates narration (existing TTS) → `StudioStoryboardVoice` with `audioUrl`
2. User clicks **Transcript genereren** in Ondertitels tab
3. Server calls ElevenLabs STT on `audioUrl`
4. `buildSubtitleEntriesFromTranscriptWords()` groups words into lines (~42 chars / ~5.5s)
5. `StudioStoryboardSubtitleTrack` upserted with `entriesJson` + `status: ready`
6. Existing subtitle editor, preview, Motion handoff, and subtitle burn-in consume the same entries

TTS-timing subtitles from `generate-storyboard-voice.ts` still work; STT **replaces** entries when user explicitly generates a transcript.

---

## Welke UI is toegevoegd

| Surface | Change |
|---------|--------|
| **Ondertitels tab** | Transcript panel: generate button, status, duration, line count, preview + edit |
| **AI Director (story tab)** | Subtitle status line when voice enabled |
| **Consistency tab** | Transcript section (present / missing) |
| **Audio production panel** | Live transcript status instead of static hint |

---

## Welke bestanden zijn aangepast

**New:**
- `src/types/studio-speech-to-text.ts`
- `src/lib/elevenlabs-speech-to-text.ts`
- `src/lib/studio-subtitle-readiness.ts`
- `src/server/studio/speech/stt-provider.ts`
- `src/server/studio/generate-storyboard-transcript.ts`
- `src/app/api/studio/storyboards/[id]/subtitles/transcribe/route.ts`
- `src/components/studio/studio-transcript-status-line.tsx`
- `src/lib/elevenlabs-speech-to-text.test.ts`
- `src/lib/studio-subtitle-transcript.test.ts`
- `src/lib/studio-subtitle-readiness.test.ts`
- `src/lib/studio-speech-to-text-foundation.test.ts`

**Modified:**
- `src/lib/studio-subtitle-track.ts` — `buildSubtitleEntriesFromTranscriptWords`
- `src/lib/studio-voice-client.ts` — `generateStoryboardTranscriptApi`
- `src/components/studio/studio-subtitle-preview-panel.tsx`
- `src/components/studio/studio-director-proposal-flow.tsx`
- `src/components/studio/studio-workspace-consistency-panel.tsx`
- `src/components/studio/studio-workspace-audio-production-panel.tsx`
- `src/i18n/locales/en.ts`, `nl.ts`
- `.env.example`, `package.json`

---

## Wat bewust niet gebouwd is

- MP4 / video import for STT
- Voice cloning
- Music / SFX generation
- User audio upload (only existing voice blob URL)
- Browser recording (`MediaRecorder`)
- Prisma schema migrations
- New subtitle table or parallel subtitle system
- STT for language export overlay text (still uses existing scene text translation)
- Dubbing / multi-language STT batch
- Auto-generate transcript on TTS (explicit user action only)

---

## Wat nog P2 is

- Translate narration subtitle entries for language exports (separate from overlay text)
- Auto-suggest transcript when voice completes
- STT from uploaded audio (non-TTS source)
- Word-level subtitle editor / speaker diarization UI
- Credit estimation for STT hours
- Retry / async webhook for long audio (> direct sync limit)
- E2E test for workspace transcript button

---

## Tests/build status

Run after implementation:

| Check | Status |
|-------|--------|
| `npm run lint` | ✅ 0 errors, 146 warnings (pre-existing) |
| `npm run typecheck` | ⚠️ Pre-existing failure in `studio-voice-identity-sprint.test.ts` (not in test script) |
| `npm run build` | ✅ Success |
| `npm run test` | ✅ **1551/1551 pass** (+10 tests) |

**New tests:** adapter parse/mock, transcript word grouping, readiness helpers, end-to-end lib flow (audio → words → entries).
