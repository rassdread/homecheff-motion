# Workspace architecture

`StudioCreativeProject` stays the film record. The page at `/studio/projects/[id]` loads `GET /api/studio/projects/[id]/workspace`.

The loader `loadStudioProjectWorkspace`:

- requires the signed-in user;
- returns 404 when that user does not own the project;
- does not update `lastOpenedAt`;
- does not create or attach a storyboard or animation project;
- reads a linked storyboard or animation project only when `ownerId` matches;
- reads character rows only for library assets on this project whose `characterId` belongs to the same owner;
- reads the wallet with `findUnique` and does not create one;
- does not call `authorizeStudioAction` or a provider.

The view model is `assembleProjectWorkspace` in `src/lib/studio-project-workspace.ts`. `timeline` is always `null`. `director.executable` is always `false`.

Sections are Overzicht, Scènes, Personages, Media, Audio, and Export. They are one page. The query `section` keeps the tab.

Legacy detail routes are unchanged: `/videos/[id]`, `/studio/storyboards/[id]` (still redirects into the existing storyboard workspace), `/animate/instant/*`, `/library`, `/editor`.
