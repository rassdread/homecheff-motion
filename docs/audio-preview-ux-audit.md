# Audio Preview UX Audit

> Read-only pre-sprint audit — consolidated into implementation sprint.

## Bestaande spelers (vóór consolidatie)

| Component | `<audio>` | Bron |
|-----------|-----------|------|
| `StudioVoicePreviewPanel` | ✅ inline | TTS blob |
| `StudioStoryboardExternalAudioPanel` | ✅ inline | Upload blob |
| `StudioCharacterVoiceCenter` | ✅ inline | voice-preview API |
| `StudioCharacterVoiceClonePanel` | ✅ post-clone only | clone preview API |
| `StudioSubtitlePreviewPanel` | ❌ | — |
| `StudioWorkspaceAudioMixPanel` | ❌ | metadata only |
| `StudioMusicPreviewCard` | ❌ fake volume slider | — |
| `MotionVoiceSubtitlePanel` | ✅ inline | post-render URL |

## audioUrl bronnen

| Bron | URL type |
|------|----------|
| `StudioStoryboardVoice.audioUrl` | Vercel Blob (TTS / upload) |
| `POST …/voice-preview` | Blob |
| `cloneCharacterVoiceApi` → `previewAudioUrl` | Blob |
| `UserAudioLibraryAsset.audioUrl` | Blob manifest |
| Local clone sample | `blob:` object URL |
| Motion `voiceAudioUrl` | Blob after mux |

## Overlap

8 losse `<audio controls>` implementaties — zelfde styling inconsistent, geen gedeelde source labels.

## Consolidatie

→ `StudioAudioPreviewPlayer` + `StudioAudioPreviewSource` types.

## Bewust niet in deze sprint

- Mix preview (combined lanes)
- Music/SFX AI generation
- Browser recording
- Karaoke subtitle sync
