# Audio integration

The audio section has five blocks. They are not timeline tracks.

| Block | What it shows | What it does not do |
|---|---|---|
| Stemmen en dialogen | Whether each project character has `voiceProfile` | No TTS, no preview charge |
| Voice-over | Completed `StudioStoryboardVoice` rows on an owned, linked storyboard | Hidden when the link is null, as on MADE WITH PASSION |
| Muziek | Account library items with `kind: music` | No music generation button |
| Geluidseffecten | Account library items with `kind: sfx` | No SFX generation button |
| Mijn audio | Explains the library is account-level | Does not place files on a clock |

Playback uses the existing file URL and `<audio controls>`. Upload and mix stay in the advanced storyboard workspace, linked only when a storyboard is already attached.

## Future timeline

Do not add a new audio table for V12. The later clip model should point at:

- character id + line text for dialogue;
- `StudioStoryboardVoice.id` for narration;
- user audio library id for music and SFX;
- `StudioStoryboardSubtitleTrack.id` for subtitles.

Those sources already exist. A clip row should store start, duration, and trim, not a second copy of the file.
