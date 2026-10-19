# Animation linking

V11 recommends one animation project per export cut. The film already has optional `animationProjectId`.

V13 can attach an animation project the viewer already owns, after confirmation, and only when:

- this film's `animationProjectId` is null
- no other film already points at that animation project

The write is `updateMany` where `animationProjectId` is null.

V13 does not create an animation project. `POST /api/animations/projects` calls `requireStudioCredits` for `motion_render`. An empty create on that route can reserve HC, so it is not exposed in the scene workspace.

V13 does not create `AnimationImage` rows, transitions, or generation jobs.

## Later still-to-animation path

`AnimationImage` already has:

- `studioSceneId` — studio scene id at last sync
- `studioSceneImageId` — selected studio scene image id at last sync

Future sync, not this phase:

1. The film's `animationProjectId` is the cut.
2. The scene's `selectedSceneImageId` is the preferred still.
3. A later sync writes those two ids onto the animation image that represents that scene. It should reference the existing still URL, not copy the file into a second library record.

Until that sync exists, the workspace only shows the link and the existing stills.
