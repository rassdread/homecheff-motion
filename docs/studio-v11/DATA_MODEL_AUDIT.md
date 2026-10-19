# Data model audit

Production and preview share one Neon database. This audit does not migrate it.

## What a “film” is today

There is no single film aggregate. A production is split across:

| Record | Role | Owner |
|---|---|---|
| `StudioCreativeProject` | Named container. Optional `storyboardId`, `animationProjectId`, `editorCanvasProjectId` | `ownerId` cascade |
| `StudioStoryboard` | Scenes, prompts, voice, subtitles | `ownerId` |
| `StudioScene` | Ordered scene | storyboard cascade |
| `StudioSceneImage` | Generated stills | scene cascade |
| `StudioSceneCharacter` | Character used in a scene | scene + character |
| `AnimationProject` | Motion job: images, transitions, exports | `ownerId` |
| `AnimationImage` | Source stills for Vidu | project cascade |
| `AnimationTransition` | Segment, `outputVideoUrl` | project |
| `AnimationExport` / `ProjectRenderVersion` | Final MP4 | project |
| `StudioCharacter` | Identity, master image, voice profile | `ownerId`, unique slug per owner |
| `StudioLibraryAsset` | Index. Unique `(ownerId, sourceKind, sourceId)`. Status includes draft | optional creative project |
| `StudioGenerationJob` | Capability, reservation id, charge flag | `ownerId` |
| `StudioWallet` / `StudioLedgerEntry` | HC | account |

MADE WITH PASSION is a `StudioCreativeProject` with `storyboardId` and `animationProjectId` null. Its three characters are `StudioCharacter` rows owned by the same user. Their library assets were created as draft and must stay attached to this project.

## Safe connection

`StudioCreativeProject` already has nullable foreign keys. The next phase should **fill those links**, not replace the tables.

Recommended shape:

- One creative project is the film.
- One storyboard holds the scene list and dialogue text.
- One or more animation projects hang off scenes (today the link is project-level only).
- Characters stay account-owned and are linked per scene. That allows reuse across films without copying the master image.
- Library rows index scene images and final videos. V10 already reads the source tables. Do not create a third store.

## Gap

`animationProjectId` is a single optional id. A 55-second film with several shots needs either:

1. several animation projects and a new join `StudioScene.animationProjectId`, or
2. one animation project whose images are the selected scene stills, which is how Vidu projects already work.

Option 2 matches the current renderer. Option 1 is clearer for reshoots. Recommendation: keep one animation project per export cut, and add an optional `sourceSceneId` on `AnimationImage` (the column `studioSceneId` already exists on `AnimationImage`). Use that before adding a timeline table.

## Migration stance

No migration in V11. The first implementation migration, when authorized, should be additive:

- nullable `StudioScene.lineText`, `subtitleText` if dialogue is not already in scene description (description, action, and emotion already exist);
- no drop of storyboard or animation tables;
- no change to character master URLs.

Rollback of a later migration must be a forward fix, not a destructive down migration on production.
