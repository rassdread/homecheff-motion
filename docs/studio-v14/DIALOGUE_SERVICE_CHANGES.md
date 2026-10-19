# Dialogue service changes

The scene form on `/studio/projects/[id]` sends `dialogueText` with the existing scene patch.

`PATCH /api/studio/projects/[projectId]/scenes/[sceneId]` still requires an authenticated user. It passes `dialogueText` only when the body value is a string or `null`. Subtitle text still goes to `saveFilmSceneSubtitle`. Narration still goes to `voiceNarrationScript`.

`updateFilmScene` still checks that the film and its storyboard belong to that user, then calls `updateStudioScene`. Validation:

- omitted field: leave the stored line alone
- blank field: store `NULL`
- text: trim and cap at 4000 characters

`createStudioScene` stores `dialogueText` when a caller sends it. The film workspace creates a scene with a title only, so a new scene starts with `NULL`.

The workspace loader selects `dialogueText` and the existing image `generatedPrompt`. The prompt is shown under Meer opties and is not written back.

The form label is "Gesproken tekst (Engels)" / "Spoken dialogue (English)". The field is optional. Characters assigned to the scene are listed beside it. There is no speaker dropdown.

The director proposal preview copies `dialogueText` from the existing scene when it recognizes that scene. Applying a proposal still sends title, description, action, and characters. It does not send `dialogueText`, so an apply does not clear the spoken line.

No provider, credit reservation, or character image field is written on this path.

This code queries `dialogueText`. It must not run against the database until the migration in [MIGRATION_SQL.md](MIGRATION_SQL.md) has been applied.
