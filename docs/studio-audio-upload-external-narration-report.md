# Audio Upload & External Narration Report

## Welke bestaande systemen zijn hergebruikt

| Systeem | Hergebruik |
|---------|------------|
| `StudioStoryboardVoice` | Externe audio als voice-row met `provider: "upload"` en `providerMetadata.source: "upload"` — geen nieuwe tabel |
| `studio-voice-blob.ts` / Vercel Blob | Zelfde padconventie als TTS-narratie (`studio/{owner}/storyboards/{id}/voice/{lang}/…`) |
| ElevenLabs STT (`stt-provider`, `elevenlabs-speech-to-text`) | Transcript via bestaande `POST …/subtitles/transcribe` |
| `StudioStoryboardSubtitleTrack` | Ondertitels via `buildSubtitleEntriesFromTranscriptWords` + upsert per taal |
| `CharacterVoiceLanguageProfile` / `voiceProfilesJson` | Stemreferentie via `referenceAudioUrl` per taal — geen schema-migratie |
| `studio-character-voice-history` | Event `voice_reference_linked` |
| Language export / per-taal voice rows | Meerdere talen = aparte `StudioStoryboardVoice`-rijen (Flow 3-fundering) |
| Project Memory + Continuity | `narrationAudio` in memory snapshot + continuity-sectie |
| Subtitle readiness | Uitgebreid met audio/transcript/subtitle status labels — geen nieuwe score |

## Hoe audio upload werkt

1. Gebruiker kiest MP3, WAV of M4A in **Stem / Audio → Geüploade audio**.
2. `POST /api/studio/storyboards/[id]/audio-upload` (multipart, veld `audio`).
3. Validatie: leeg bestand, max 25 MB, mime/ext (mp3/wav/m4a).
4. Blob-upload via `uploadStoryboardVoiceAudio` (inclusief m4a-extensie).
5. Upsert `StudioStoryboardVoice` met `status: completed`, metadata (naam, bestandsnaam, timestamp).
6. Storyboard `voiceEnabled` wordt `true` indien nog uit — subtitles/transcript-tab blijft bruikbaar.

## Hoe transcript generatie werkt

1. Na upload: knop **Transcript genereren** (zelfde als subtitles-tab).
2. `generateStoryboardTranscript` leest elke `completed` voice-row met `audioUrl` (TTS **of** upload).
3. Gedeelde orchestratie: `transcribeAudioUrlToSubtitleTrack` → STT-provider → woorden → subtitle entries.
4. Geen apart STT-pad voor externe audio.

## Hoe subtitle tracks worden gevuld

- Zelfde `StudioStoryboardSubtitleTrack` per `storyboardId` + `language`.
- Entries uit STT-woorden (`buildSubtitleEntriesFromTranscriptWords`).
- Preview/bewerken via bestaande `StudioSubtitlePreviewPanel` en `PATCH …/subtitles`.

## Hoe audio aan personages gekoppeld kan worden

1. Na upload: kies personage → **Gebruik als stemreferentie**.
2. `POST /api/studio/characters/[id]/voice-reference` met `{ audioUrl, language, label? }`.
3. Slaat `referenceAudioUrl` (+ optioneel label) op in `voiceProfilesJson[taal]`.
4. **Geen** automatische voice clone — alleen referentie voor stemidentiteit.
5. Voice clone blijft apart via bestaande clone-flow.

## Welke bestanden zijn aangepast

**Nieuw**

- `src/lib/studio-audio-upload-validation.ts`
- `src/lib/studio-storyboard-audio.ts`
- `src/lib/studio-transcript-from-audio.ts`
- `src/server/studio/upload-storyboard-external-audio.ts`
- `src/server/studio/link-character-voice-reference.ts`
- `src/app/api/studio/storyboards/[id]/audio-upload/route.ts`
- `src/app/api/studio/characters/[id]/voice-reference/route.ts`
- `src/components/studio/studio-storyboard-external-audio-panel.tsx`
- `src/lib/studio-audio-upload-foundation.test.ts`
- `docs/studio-audio-upload-external-narration-report.md`

**Uitgebreid**

- `src/server/studio/studio-voice-blob.ts` — m4a/wav/mp3 extensie
- `src/server/studio/generate-storyboard-transcript.ts` — gedeelde STT-orchestratie
- `src/lib/studio-subtitle-readiness.ts` — audio/transcript/subtitle status
- `src/types/studio-character-voice.ts` — `referenceAudioUrl`
- `src/lib/studio-character-voice.ts` — parse reference fields
- `src/server/studio/studio-character-voice-history.ts` — `voice_reference_linked`
- `src/server/studio/studio-project-memory-service.ts` — `narrationAudio`
- `src/types/studio-project-memory.ts`, `studio-project-memory-utils.ts`
- `src/lib/studio-project-continuity-score.ts`, continuity panel
- `src/lib/studio-voice-client.ts`, `studio-workspace-tool-panel.tsx`
- `src/i18n/locales/en.ts`, `nl.ts`
- `package.json` — test entry

## Wat bewust niet gebouwd is

- Geen MP4-import, timeline editor of video-editing
- Geen nieuwe storage-provider of los mediasysteem
- Geen schema-migratie
- Geen automatische voice clone bij referentie-koppeling
- Geen volledige Flow 3-pipeline (vertalen → nieuwe TTS per taal) in deze sprint

## Wat P2 blijft

- **Flow 3 end-to-end**: vertaal transcript/script → genereer nieuwe stem per taal via bestaande language export + TTS (per-taal voice-row bestaat al)
- UI voor `referenceAudioUrl` in character voice center (afspelen/beheren)
- Exacte audioduur uit metadata (nu geschat uit bestandsgrootte)
- Consistency panel server-side check op uploaded audio zonder client fetch
- E2E smoke voor upload → transcript → subtitle preview

## Tests/build status

- **Lint**: 0 errors (148 baseline warnings)
- **Typecheck**: pre-existing failure in orphan `studio-voice-identity-sprint.test.ts` (not in test script)
- **Build**: success
- **Tests**: **1565/1565** pass (incl. `studio-audio-upload-foundation.test.ts`)
