# Voice and audio audit

## Implemented

- Persistent ElevenLabs catalog, gender, language, accent, and characteristic filters, favorites, and character assignment fields. Related-mode filtering keeps every selected trait (V9.4).
- Cached previews and an explicit confirm before a paid preview.
- TTS, music, SFX, and STT capability ids with ElevenLabs adapter names.
- `StudioStoryboardSubtitleTrack` for storyboard captions.
- `VideoLanguageExport` for a motion project’s translated overlay. Dutch subtitles for a finished motion file are a language export, not a free-form subtitle track editor.
- User audio library: upload and generated beds listed as blob files. V10 shows them under Audio. They are not placed on a time ruler.

## Not a studio

`studio-audio-mix-contract.ts` defines a small mix: voice, one music bed, one SFX bed. It is not a multitrack editor. There is no per-clip volume curve, no ducking automation, and no frame-accurate dialogue sync.

## Narration versus character dialogue

The schema can store a character voice. It does not store a narrator as a separate character unless the user creates one. For MADE WITH PASSION, create a narrator voice selection on the project (or a fourth character that is voice-only) without an image generation.

## Speech to text

The capability is registered. It was not executed in V11. Do not treat the catalog as proof that subtitles are generated.

## Paid boundary

Catalog reads are free. Preview, TTS, music, SFX, and STT are paid. The director may suggest a voice id from the local catalog. It may not call ElevenLabs until the quote is approved.
