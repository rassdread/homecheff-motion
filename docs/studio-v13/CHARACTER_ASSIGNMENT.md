# Character assignment

Assignment reuses `StudioSceneCharacter`. The scene form sends `characterIds` to `updateStudioScene`, which already checks that every id belongs to the storyboard owner (`INVALID_CHARACTERS` when one does not).

Removing a checkbox and saving removes that join row. The character record, master file, and voice lock stay.

`GET /api/studio/projects/[projectId]/film-characters` returns up to 100 characters owned by the signed-in user, and only after the film itself is owned by that user. It selects `id`, `name`, and `referenceImageUrl`. It does not write those fields.

The scene list shows the master image next to the name and links to the existing character editor with a return URL back to this film's Scènes section.

Characters on a loaded scene are filtered to `ownerId` before they reach the client.

## Masters

Baker, Potter, and Gardener are ordinary character rows. Scene assignment references their ids. The live master column is `referenceImageUrl`, with `referenceStorageKey` and `primaryReferenceImageId`. Nothing in this phase writes those fields, the name, or the voice lock.

## Later image generation

When a future still is generated for a scene, the service must receive the character's current `referenceImageUrl` as the reference image input. Putting the character name in the prompt is not identity. V13 does not call that service. It only keeps the assignment and displays the URL that already exists.
