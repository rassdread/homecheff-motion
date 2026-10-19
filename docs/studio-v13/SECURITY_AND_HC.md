# Security and HC

Every new route calls `requireActiveUser` first.

Ownership checks:

- The film must belong to the session user.
- A storyboard or animation project must belong to the session user before it can be linked.
- Scene create, edit, reorder, subtitle, narrator, and still selection go through the film's linked storyboard and the existing storyboard modify check.
- Character ids are checked by `assertSceneAssetsOwned`. A character from another account is rejected.
- Storyboard and character lists never query another user's rows.

Conflict behavior:

- An existing `storyboardId` or `animationProjectId` is not replaced.
- A target already linked to another film is not attached and is not transferred.
- Attach requires `confirmed: true`.
- Create is idempotent: a film that already has a storyboard gets that id back.
- Concurrent creates serialize on `updateMany` where the foreign key is null. The losing insert is removed inside the same transaction.

Client-supplied ids are looked up with `ownerId`. A guessed id from another account is `not_found`.

## What this phase does not do

- No `reserveStudioCredits`, `authorizeStudioAction`, or `requireStudioCredits`.
- No image, video, voice, music, sound-effect, subtitle-generation, or render provider call.
- No wallet read that mutates a balance. The workspace balance read from V12 is unchanged.
- No write to `referenceImageUrl`, `referenceStorageKey`, or `primaryReferenceImageId`.
- No delete of an existing project, storyboard, character, or media file. The only storyboard delete is the unlinked row created moments earlier in the same transaction when the link race is lost.
- No automatic change to MADE WITH PASSION (`cmvcbmxdp00032jryohiw8a84`) or to Baker, Potter, and Gardener.

Storyboard create, storyboard attach, scene create, scene edit, ordering, character assignment, dialogue-text attempt (not persisted), subtitle text, and narrator text do not reserve HC.

## Legacy routes

These still exist:

- `/studio/storyboards/[id]`
- `/studio/storyboards/[id]/edit`
- `/studio/storyboards/[id]/classic`
- `/videos/[id]`
- `/editor`

The classic editor adds a return link only when the signed-in user owns both the storyboard and a film that points at it.
