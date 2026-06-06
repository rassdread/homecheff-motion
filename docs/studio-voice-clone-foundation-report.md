# Voice Clone Foundation Report

**Date:** 2026-06-06  
**Scope:** Sample upload → ElevenLabs IVC → character voice → existing TTS. No schema migration, no marketplace, no recording.

---

## Welke bestaande systemen zijn hergebruikt

| System | Reuse |
|--------|-------|
| `ELEVENLABS_API_KEY` | Same key as TTS/STT |
| `uploadPublicBlob` / Vercel Blob | Sample storage pattern from voice audio |
| `StudioCharacter` voice fields | `voiceProvider`, `voiceProfile`, `voiceDescription`, `voiceLock` |
| `resolveElevenLabsVoiceId()` | Extended for cloned voice IDs |
| `generateCharacterVoicePreview()` | Post-clone preview |
| `selectVoiceProvider()` / TTS pipeline | Unchanged entry; uses clone ref at synthesis |
| `appendCharacterVoiceHistoryIfChanged()` | New event `voice_clone_applied` |
| `StudioWorkspaceCharacterVoiceInline` | Clone panel in Voice + Characters tabs |
| `updateStudioCharacterApi` | Character validation preserves clone refs |

---

## Hoe ElevenLabs clone is geïntegreerd

- **Wrapper:** `src/lib/elevenlabs-voice-clone.ts`
- **Endpoint:** `POST https://api.elevenlabs.io/v1/voices/add` (Instant Voice Clone)
- **Input:** multipart `name`, `files` (audio sample), optional `description`, `labels`
- **Output:** `voice_id` → stored as `voiceProfile` ref `clone:<voice_id>`
- **Provider:** `src/server/studio/speech/voice-clone-provider.ts` (ElevenLabs / mock)
- **Orchestration:** `src/server/studio/clone-character-voice.ts`
- **API:** `POST /api/studio/characters/[id]/voice-clone` (multipart)

---

## Hoe upload werkt

- Client sends `sample` file via `FormData`
- Server validates: MP3/WAV/M4A, max 15 MB (`studio-voice-sample-validation.ts`)
- Sample stored at `studio/{ownerId}/characters/{id}/voice-samples/{uuid}.{ext}`
- Same blob helper pattern as storyboard voice audio
- No MediaRecorder — file upload only

---

## Hoe clone aan personage wordt gekoppeld

**No Prisma migration.** Cloned ElevenLabs voice ID stored via convention:

```
voiceProvider = "elevenlabs"
voiceProfile  = "clone:<providerVoiceId>"
voiceDescription = user-facing clone name
voiceEnabled  = true
```

- `parseVoiceProfileRef()` / `resolveElevenLabsVoiceId()` route TTS to cloned ID
- `getVoiceProfilePreset()` uses warm narrator settings for clone synthesis
- Character updated atomically after successful clone + optional `voiceLock`

---

## Hoe voice history wordt bijgewerkt

- `appendCharacterVoiceHistoryIfChanged(..., "voice_clone_applied")` on character update
- History panel shows human labels (voice name / preset), **not** provider IDs
- Clone events labeled “Cloned voice” / “Gekloonde stem”

---

## Welke veiligheidsmeldingen zijn toegevoegd

- Required consent checkbox before clone (NL/EN)
- Server rejects clone when `consentConfirmed` is false (`CONSENT_REQUIRED`)
- User-facing errors sanitized (no raw ElevenLabs stack traces in UI)
- Copy: “Only upload a voice you have permission to use.”

---

## Welke bestanden zijn aangepast

**New:**
- `src/lib/studio-voice-profile-ref.ts`
- `src/lib/studio-voice-sample-validation.ts`
- `src/lib/elevenlabs-voice-clone.ts`
- `src/types/studio-voice-clone.ts`
- `src/server/studio/studio-voice-sample-blob.ts`
- `src/server/studio/speech/voice-clone-provider.ts`
- `src/server/studio/clone-character-voice.ts`
- `src/app/api/studio/characters/[id]/voice-clone/route.ts`
- `src/components/studio/studio-character-voice-clone-panel.tsx`
- `src/lib/studio-voice-clone-foundation.test.ts`

**Modified:**
- `src/lib/elevenlabs-voice.ts`, `studio-voice-profiles.ts`
- `src/lib/studio-character-voice.ts`, `studio-character-validation.ts`
- `src/lib/studio-voice-identity-resolver.ts`
- `src/lib/studio-characters-client.ts`
- `src/server/studio/studio-character-voice-history.ts`
- `src/components/studio/studio-workspace-character-voice-inline.tsx`
- `src/components/studio/studio-character-voice-history-panel.tsx`
- `src/i18n/locales/en.ts`, `nl.ts`
- `.env.example`, `package.json`

---

## Wat bewust niet gebouwd is

- Voice marketplace / library browser
- Browser recording (`MediaRecorder`)
- Dubbing / multi-language clone batch
- MP4 / video import
- Music / SFX generation
- Professional Voice Cloning (PVC) workflow
- Per-plan ElevenLabs tier checks
- Separate `providerVoiceId` DB column (uses `clone:` ref instead)

---

## Wat P2 blijft

- Multiple samples per clone (IVC supports multiple files; UI sends one)
- Clone management (delete/replace ElevenLabs voice)
- Sample duration validation via ffprobe
- Credit estimation for clone + storage lifecycle for samples
- E2E workspace test for full clone flow
- Auto-lock voice after clone (optional UX)

---

## Tests/build status

| Check | Status |
|-------|--------|
| `npm run typecheck` | ⚠️ Pre-existing failure in `studio-voice-identity-sprint.test.ts` (orphan) |
| `npm run build` | ✅ |
| `npm run test` | ✅ **1558/1558** (+7 tests) |
