# Architecture decisions

## Unified project model

**RECOMMENDED.** `StudioCreativeProject` is the film. Fill `storyboardId` and `animationProjectId`.

**ALTERNATIVE.** A new `Film` table that points at the same children. Extra join, no new capability.

**REJECTED.** Merging storyboard rows into animation projects. That would rewrite production data for every existing film.

## Storyboard integration

**RECOMMENDED.** Keep `StudioStoryboard` as the scene document and embed its UI in the shell.

**REJECTED.** A third scene model for the director.

## Animation integration

**RECOMMENDED.** One animation project per export cut. Set `AnimationImage.studioSceneId` so a reshoot knows which scene it came from.

**ALTERNATIVE.** One animation project per scene. More jobs, harder export. Use only if a single Vidu project cannot hold the cut.

## Media asset identity

**RECOMMENDED.** `StudioLibraryAsset` stays an index. Bytes stay on the scene image and the render version.

**REJECTED.** Copying masters into a new library bucket.

## Character references

**RECOMMENDED.** Scene generation requires the character’s `referenceImageUrl` when a character is attached. The three Passion master routes refuse regeneration unless the founder starts that specific confirm.

## Generation jobs

**RECOMMENDED.** Keep `StudioGenerationJob` and the Vidu adapter.

**REJECTED.** A director-only job table.

## Timeline

**RECOMMENDED.** New clip table after scenes are linked. Until then, scene order is the timeline.

**REJECTED.** Adopting an external NLE as the source of truth. Export can later call ffmpeg. The edit decisions stay in Studio.

## Audio tracks

**RECOMMENDED.** Dialogue and narration as clips. Music remains one bed until the timeline exists. The current mix contract stays the export fallback.

## Export pipeline

**RECOMMENDED.** Current `AnimationExport` / `ProjectRenderVersion` path.

**ALTERNATIVE.** A new renderer. Only after the timeline can describe a cut the current exporter cannot.

## AI director tools

**RECOMMENDED.** Server router over existing services. Quote required when HC > 0.

**REJECTED.** Letting the model call provider URLs. **REJECTED.** A chat that only tells the user which button to press, as the end state. Planning text is allowed before the router exists.

## HC approval

**RECOMMENDED.** Quote id, then approval, then `authorizeStudioAction`.

**REJECTED.** Reserving inside the director’s first message.

## Legacy routes

**RECOMMENDED.** Keep detail URLs. Redirect only list hubs that duplicate `/projects` and `/library`.

**REJECTED.** Deleting `/videos/[id]` before the shell covers repair and versions.

## Database safety

**RECOMMENDED.** Additive nullable columns and new tables. No backfill that rewrites character image URLs. Production and preview share one database, so a migration is a production change and needs its own approval.

**REJECTED.** A down migration that drops storyboards.
