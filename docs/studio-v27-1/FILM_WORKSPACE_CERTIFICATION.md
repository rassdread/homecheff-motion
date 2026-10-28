# Film workspace certification

## Scene handoff

`filmSceneWizardLinks` for project `film-1`, scene `scene-2`, storyboard `board-9` now includes:

- Voice: `/studio?storyboardId=board-9&tool=voice&scene=scene-2`
- Music: `tool=music`
- Sound: `tool=sound`

Each link spends nothing on open. The workspace shell selects that tool and scene after the storyboard loads. `validateStudioReturnTo` keeps `tool`, `scene`, and `idea` on `/studio` and drops unknown keys such as `token`.

Without a storyboard id, the same three links open `/studio/audio/create` and carry the project return path.

The existing image, animation, audio-library, and storyboard links remain.

## Scene result

`emptyStudioFilmProject(3)` then `updateFilmScene` on `scene-2` set character `char-chef`, music `music-kitchen`, and dialogue only on scene 2. Scene 1 and scene 3 stayed empty. Applying the same character to scene 3 left `characterIds` as `["char-chef"]`, so the document does not store a second character row.

This used the existing film document functions. It did not insert a database project, and it did not run a browser session against `/studio/projects/:id`.

## Character and media

The character reference reached `pickReferenceUrlsForStillAdapter` and `characterMasterBlocked` accepted it. Linking used the film document's character id, not a new character record.

Media selection in the unified project library was not re-tested in a browser. The audio library link remains on the create page for choosing an existing asset.
