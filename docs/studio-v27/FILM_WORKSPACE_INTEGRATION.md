# Film workspace integration

Explicit film text still creates a project with `POST /api/studio/films` and opens `/studio/projects/:id?section=overview&workflow=film`. That page is `StudioUnifiedProjectWorkspace`.

The workspace already has overview, scenes, characters, media, audio, timeline, and export. `StudioProjectScenePanel` edits title, description, characters, dialogue, and subtitles. `StudioProjectFilmEditor` and `StudioProjectTimeline` remain mounted. Audio lists dialogue, voice-over, music, and sound effects that the workspace loader already returns.

V27 adds `filmSceneWizardLinks` on each scene:

- Image wizard: `/editor/start` with the scene idea, HTTP scene image, and `returnTo`.
- Animation wizard: `/motion/start?photoIntent=photo_to_video` with the same context. Motion start redirects that query to Instant.
- Audio: the same project's `section=audio` query. This does not start a provider.
- Storyboard production: `/studio/storyboards/:storyboardId/production` when the project has a storyboard id.

These links do not copy media files and do not rewrite project ids.

## Not claimed

A full 30-second film with three scenes, voice, music, and a rendered ending was not executed. There is no `.env` in this worktree, so no disposable database was available. Quote functions exist (`quoteFilmSceneVideo`, `quoteFilmSceneDialogue`, `quoteFilmProduction`) and their unit coverage in `src/lib/studio-v23.test.ts` still expects provider calls to stay at zero for quote actions. That is mock-level coverage, not a rendered film.

The legacy full shell `StudioWorkspaceShell` is still only mounted for `/studio?legacy=1` with a storyboard id. Opening history uses the unified project workspace.

Export in the unified workspace lists download records already stored on the project. It was not driven in a browser in this pass.
