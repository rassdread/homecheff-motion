# Voice center investigation

## Failure before this change

File: `src/lib/studio-voice-center-ux.test.ts`

Test: `shows voice choices directly and keeps the shared preview panel above the tabs`

The test reads `studio-character-voice-center.tsx` and expects that file to contain the text `Beluister gratis voorbeeld`.

That string is not in the center file. It is the label of the free sample button in `studio-character-voice-shared-preview.tsx`. The center renders `<StudioCharacterVoiceSharedPreview>` above the heading `Kies een stem`.

The same preview file also contains the sentence `Beluister voorbeeld gebruikt de echte ElevenLabs-snelheid.` The test already matched that sentence, so the failure stopped on the next assertion: the parent file must contain `Beluister gratis voorbeeld`.

## What is actually wrong

The button, the catalog, favorites, and voice assignment were not broken. The assertion looked in the parent after the label moved into the child that the parent renders.

This is not a missing translation, a routing bug, or a voice-assignment bug. No ElevenLabs call was made.

## Test update

The assertion now checks that the shared preview contains `Beluister gratis voorbeeld`, and that the center still renders that preview above `Kies een stem`. The component text was not changed.

Paid preview confirmation, filters, favorites, and cached samples were not modified.
