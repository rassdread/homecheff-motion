# Timeline gap analysis

## Present

- Scene `order` on a storyboard.
- Animation image order and transitions between consecutive stills.
- Export of those segments into one MP4.
- A comment in the creative workflow that the “timeline” is the ordered scene list, and that an NLE belongs to an advanced mode that is not built.

## Absent

- Shared timeline across video, dialogue, music, and subtitles.
- Trim, split, ripple, transitions between arbitrary clips.
- Volume per clip.
- Preview of a mixed timeline before export.
- A `StudioTimeline` model.

## Reuse

| Piece | Use |
|---|---|
| `StudioScene.order` | Initial clip order |
| `AnimationTransition.outputVideoUrl` | Video clip source |
| `StudioSceneCharacter` + voice profile | Dialogue clip source once TTS exists |
| `StudioStoryboardSubtitleTrack` | Subtitle clip source |
| User audio blob | Music and SFX clip source |
| `AnimationExport` | Render target |

## Proposed model (do not migrate yet)

`StudioTimeline` belongs to `StudioCreativeProject`.

`StudioTimelineClip`: track (`video` | `dialogue` | `narration` | `music` | `sfx` | `subtitle`), start and duration in milliseconds, source kind and source id, volume, trim in/out. No media bytes on the clip.

Render reads the clip list and calls the existing export service for the video track, then a mix step for audio. Until that mix exists, the export remains the current animation MP4 plus an optional language overlay.

## Dependencies

A timeline UI before scene-to-animation linking will show empty video clips. Link scenes to `AnimationImage.studioSceneId` first.
