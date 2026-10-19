# Scene workspace

The Scènes section of `/studio/projects/[id]` is the film preparation surface.

When no storyboard is linked, the section offers:

- Maak een storyboard
- Bestaand storyboard koppelen, then an explicit confirmation

It does not open `/studio/storyboards/new` and it does not attach anything on page load.

When a storyboard is linked, the user can:

- Add a scene. The title starts as "Nieuwe scène" / "New scene". Order is the existing max-plus-one from `createStudioScene`.
- Select a scene and edit title, description, assigned characters, and Dutch subtitle text.
- Open action and emotion under Meer opties.
- Move a scene up or down. The client swaps neighbors with `moveSceneId`. The server persists the full id list through `reorderStudioScenes`, which vacates orders and writes the final sequence in one transaction. Refresh reads `order` back.
- Open the existing advanced storyboard editor and the classic editor. Those links are optional. Saving a scene stays on the project page.

## Fields that already exist

`StudioScene` already stores title, description, action, emotion, camera, shot type, camera movement, energy, duration, location, and `selectedSceneImageId`.

V13 writes title, description, action, emotion, and character ids through `updateStudioScene`. Omitted technical fields stay as they are, because the existing validator only patches fields that were sent.

Camera, shot, duration, location, music, and sound overrides stay in the classic editor. They are not copied into a second form.

## Visual prompt

There is no visual-prompt column on `StudioScene`. The prompt that was sent to an image provider lives on `StudioSceneImage.generatedPrompt`. V13 shows existing stills and their status. It does not edit that prompt and does not generate a new one.

## Preferred still

`POST /api/studio/projects/[projectId]/scenes/[sceneId]/select-image` calls the existing `setPreferredStudioSceneImage`. The button is shown for a completed still that is not already selected. Failed and archived rows keep their real status and are not offered as the preferred still.

## Services the future director can call

These functions in `src/server/studio/studio-film-preparation.ts` are the manual path. A later director should call them, not the database:

- `createFilmStoryboard` / `attachFilmStoryboard`
- `createFilmScene`
- `updateFilmScene`
- `reorderFilmScenes`
- character assignment through `updateFilmScene` `characterIds`
- `selectFilmSceneImage`

Authorization stays inside those functions and the existing storyboard service.
