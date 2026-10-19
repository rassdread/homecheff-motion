# Remaining gaps

## Not in V13

- No timeline and no frame-accurate subtitle times. Dutch lines use scene order as a placeholder.
- No per-scene spoken dialogue column. See the schema proposal in [DIALOGUE_AND_SUBTITLES.md](DIALOGUE_AND_SUBTITLES.md). It was not migrated.
- No per-scene narrator field. Narration is the storyboard script only.
- The AI director does not execute `CREATE_SCENE`, `UPDATE_SCENE`, `ASSIGN_CHARACTER`, `REORDER_SCENE`, `ATTACH_STORYBOARD`, or `LINK_MEDIA_TO_SCENE`. Those operations exist as server functions for a later director. The panel still says planning only.
- No storyboard transfer between films.
- No new animation project, no Vidu transition, no video job.
- No copy of a scene still into `AnimationImage`. The columns `studioSceneId` and `studioSceneImageId` are the later path, documented in [ANIMATION_LINKING.md](ANIMATION_LINKING.md).
- No paid preview, dialogue audio, music, or sound effects. The V12 audio section is unchanged: lists, not tracks.
- Character picker shows at most 100 owned characters.
- Visual prompt stays on the existing scene image and is edited in the existing storyboard tools.

## MADE WITH PASSION

The project is not linked, not given a storyboard, and not given scenes by this release. The founder starts that preparation in the UI when they choose to.

## Next phase

Add the approved nullable `StudioScene.dialogueText` (and `narratorText` only if per-scene narration is required), then let the scene form save English dialogue separately from the Dutch subtitle line.

After that, a timeline can replace the placeholder subtitle times and place dialogue, narrator, music, and effects on real tracks.
