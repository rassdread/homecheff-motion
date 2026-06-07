# Character Voice Draft Preview & Clone Experience Report

**Date:** 2026-06-07  
**Scope:** Draft voice preview before save, preview text, unsaved form overrides, clone UX.

---

## Root cause (from prior audit)

Preview required `characterId`. New characters passed `characterId={null}` → button disabled → no network, no feedback.

---

## Hergebruikte systemen

| Systeem | Rol |
|---------|-----|
| `synthesizeCharacterVoicePreview()` | Shared ElevenLabs/mock synthesis + blob upload |
| `generateCharacterVoicePreview()` | Saved character + form overrides |
| `selectVoiceProvider()` | Existing provider selector |
| `uploadStoryboardVoiceAudio()` | Blob storage |
| `defaultCharacterVoicePreviewLine()` | Default preview script |
| `StudioAudioPreviewPlayer` | All audio playback |
| `cloneCharacterVoice()` | Unchanged clone engine |

---

## Draft preview

**Endpoint:** `POST /api/studio/characters/voice-preview-draft`

**Input:** `characterName`, `voiceProfile`, `voiceLanguage`, `sampleLine?`

**Output:** `audioUrl`, `durationSeconds`, `provider`, `metadata`

No DB record. Blob path: `character-draft-{ownerId}`.

---

## Preview text

- UI field: **Voorbeeldtekst** / **Preview text**
- Default: `Hallo, ik ben {name}.` / `Hello, I am {name}.`
- User override sent as `sampleLine`
- Server: `resolveCharacterVoicePreviewScript()`

---

## Unsaved preview (saved character)

Existing endpoint accepts overrides:

- `voiceProfile`, `characterName`, `sampleLine`, `language`

Client always sends current form values via `requestCharacterVoicePreview()`.

---

## Clone sample preview

Upload → **Play sample** section with `StudioAudioPreviewPlayer` → Clone button (disabled until sample uploaded).

---

## Clone result preview

After clone: result card with name, provider status, **Preview cloned voice** button + auto preview from clone response.

---

## UX

**Conceptvoorbeeld** / **Draft preview** badge when preview runs without saved character.

---

## Bewust niet gebouwd

- Auto-save characters
- New voice providers / engines
- Schema migrations
- Clone before save (still requires characterId)

---

## Volgende sprint

1. Draft voice clone (sample-only, no characterId)
2. Director V2 preview with shared client + sample text
3. Persist preview text on character record (optional)

---

## Validatie

| `npm run test` | ✅ **1836/1836** (+8 draft preview tests) |
