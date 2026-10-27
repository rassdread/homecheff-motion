# V24 project and media inventory

Evidence is from `prisma/schema.prisma` and the routes that already read these records. Owner checks use `ownerId` unless noted. This task adds a pointer in `StudioCreativeProject`. It does not copy media or change the source row.

| Project type | Database model | API | Editor route | Storage | Editable | Unified target |
| --- | --- | --- | --- | --- | --- | --- |
| Film / storyboard | `StudioStoryboard`, `StudioScene`, `StudioSceneImage` | `/api/studio/projects/:id/scenes` | `/studio/projects/:id?workflow=film`; classic remains `/studio/storyboards/:id/classic` | Scene image URLs on the scene image rows | Scene text, order, subtitles. Image generation stays quote-only | `/studio/open/storyboard/:id` |
| Creative container | `StudioCreativeProject` | `/api/studio/projects/:id/workspace` | `/studio/projects/:id` | Links only: `storyboardId`, `animationProjectId`, `editorCanvasProjectId` | Existing workspace saves | Same route |
| Animation / motion | `AnimationProject` | Existing `/videos` APIs | Specialized editor remains `/videos/:id` | Exports and render versions on the animation row | Existing motion editor. No second renderer | `/studio/open/animation/:id` then the workspace, with a link to `/videos/:id` |
| Image canvas | `EditorCanvasProject.payload` | `/api/editor/projects/:id` | `/editor/start?session=:id&restoreServer=1` | JSON payload. Flattened images have an empty `objects` array | Existing canvas editor. No invented layers | `/studio/open/image/:id` |
| Character | `StudioCharacter` | Existing character APIs | `/studio/characters/:id` | `referenceImageUrl`, `referenceStorageKey` | Existing character editor | `/studio/open/character/:id` redirects there |
| Library image, video, voice, music, sfx | `StudioLibraryAsset` | Existing library APIs | `/studio/assets` | `previewUrl`, `downloadUrl`, `storageKey` | Read-only output. Play or view. Not an editor | `/studio/open/asset/:id` |
| Timeline | `StudioTimeline`, tracks, clips | `/api/studio/projects/:id/timeline` | Workspace timeline section | Clip timing on the creative project | Existing timeline edits. A rendered file is not a timeline | Workspace timeline section |
| Voice and audio libraries | Library families `voice`, `music`, `sfx` | `/studio/assets/media/voices`, `/studio/assets/media/audio` | Those library routes | Same asset fields | Playback and reuse. No cloning and no music generation | History action `play` |

`/studio?storyboardId=` remains a valid bookmark. Without `legacy=1` it now opens the unified workspace. `legacy=1` still opens the previous Studio shell.

Opening a storyboard, animation, or canvas creates at most one `StudioCreativeProject` pointer for that owner and source. A second open reuses it. Source ids, names, media URLs, and ownership stay on the original rows.

Unsupported as a separate historical database: there is no distinct saved voice-project or music-project model beyond `StudioLibraryAsset` and the storyboard voice fields. Those assets are certified as library outputs, not as generation projects.
