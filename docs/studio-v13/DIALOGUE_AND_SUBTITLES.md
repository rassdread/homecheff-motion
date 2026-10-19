# Dialogue, subtitles, and narrator

These are separate.

| Text | Where it lives in V13 | Saved |
|---|---|---|
| Scene description | `StudioScene.description` | Yes |
| Action | `StudioScene.action` | Yes, under Meer opties |
| Emotion | `StudioScene.emotion` | Yes, under Meer opties |
| Visual prompt | `StudioSceneImage.generatedPrompt` on an existing still | Not edited here |
| Spoken dialogue for one scene | No column | No |
| Dutch subtitle line for one scene | `StudioStoryboardSubtitleTrack` language `nl` | Yes |
| Narration for the whole film | `StudioStoryboard.voiceNarrationScript` | Yes |

The scene form states that per-scene spoken dialogue is not saved. It does not place that text in the description or in an image prompt.

## Dutch subtitles

`saveFilmSceneSubtitle` loads the `nl` track, replaces the entry whose `sceneId` matches, and upserts the track with status `draft`.

`parseSubtitleEntriesJson` drops rows that have no text or no finite start and end. A draft line therefore stores placeholder times: `start` is the scene order and `end` is order plus one. Those numbers are not frame times. The UI says exact timing belongs on the future timeline.

Clearing the subtitle field removes that scene's entry and leaves other scenes' lines. The track is capped at 200 entries.

This does not call speech-to-text and does not set the track to `ready`. The older subtitle PATCH that marks a track ready is not used.

## Narrator

The film-level script is `StudioStoryboard.voiceNarrationScript`, saved through `updateStudioStoryboard` with only that field. Voice profile, language, and other storyboard settings stay as they were.

There is no per-scene narrator column. V13 does not create a narrator character, a narrator image, or narrator audio, and it does not assign a paid voice.

Future relationship: keep one narration script on the storyboard, and later place it on the timeline as the narrator track. A voice-only character is not required for the text.

## Schema proposal, not applied

Per-scene spoken English dialogue needs its own column. Existing fields are the wrong place:

- `description` is the scene description.
- `action` and `emotion` are direction notes.
- `generatedPrompt` is the image-provider prompt.
- The `nl` subtitle track is the Dutch subtitle.
- `voiceNarrationScript` is one script for the whole film.

Proposed additive change, after a separate approval:

```prisma
model StudioScene {
  dialogueText String?
  narratorText String?
}
```

Both nullable. No backfill. No change to character master URLs. V13 does not apply this migration and does not ship UI that depends on it.

`dialogueText` is the spoken line. `narratorText` is only needed if a scene must have narration that is not the film-level script. Until that migration, narrator text stays on the storyboard.
