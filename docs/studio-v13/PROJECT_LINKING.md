# Project linking

## Storyboard

`StudioCreativeProject.storyboardId` is the only film-to-storyboard link.

Create and attach live at `POST /api/studio/projects/[projectId]/storyboard`.

- `mode` omitted or anything other than `attach` creates a storyboard when the film has none.
- `mode: "attach"` with `storyboardId` and `confirmed: true` links an owned storyboard.

Eligible boards come from `GET` on the same route: title, creation date, scene count, and whether one of the viewer's films already points at it. The list is limited to 40 boards owned by the signed-in user.

## Rules

`decideLink` in `src/lib/studio-project-linking.ts`:

| Situation | Result |
|---|---|
| Target is not owned by the viewer | 404 `not_found` |
| This film already points at a different storyboard | 409 `already_linked_other` |
| This film already points at this storyboard | success, no write |
| Another film already points at this storyboard | 409 `linked_elsewhere` |
| `confirmed` is not true | 400 `confirmation_required` |
| Film has no storyboard and the target is free | attach |

There is no transfer. A conflict stays a conflict.

The attach write is `updateMany` where `storyboardId` is null, so a second request cannot overwrite a link that appeared between the read and the write.

## Create

`createFilmStoryboard` runs in one transaction:

1. If `storyboardId` is already set, return it and create nothing.
2. Otherwise create one `StudioStoryboard` with the film title and description.
3. `updateMany` the film only where `storyboardId` is null.
4. If that update does not change one row, delete the storyboard created in this same transaction and return the winner.

That delete removes only the unlinked row this request just inserted. It does not delete a storyboard the user already had.

Creation uses the existing `StudioStoryboard` model. It does not call `createStudioStoryboard` in a second request, because a crash between create and link could leave an extra board.

## Animation project

`GET` and `POST /api/studio/projects/[projectId]/animation` use the same decision helper for `animationProjectId`.

V13 does not create animation projects. The existing create route reserves HC for `motion_render`. Exposing it would charge the wallet.

## Return path

`GET /api/studio/storyboards/[id]/film` returns the viewer's film that points at that storyboard, or `film: null`.

The classic editor at `/studio/storyboards/[id]/classic` shows a link back to `/studio/projects/[id]?section=scenes` when that film exists.

`/studio/storyboards/[id]` still redirects into the existing studio workspace. `/videos/[id]` and `/editor` are unchanged.
