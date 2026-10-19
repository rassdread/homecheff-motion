# Dialogue schema proposal

## What exists today

Checked against `prisma/schema.prisma` on commit `c391e58740a5d697908a38f1bb82cfa0e3de8716` and again after this change.

`StudioScene` stores title, description, action, emotion, camera, and the later director fields. It had no dialogue column. The word `dialogue` does not appear anywhere in the schema.

`StudioStoryboard.voiceNarrationScript` is one narration script for the whole film. V13 already saves it. V14 leaves it there.

`StudioStoryboardVoice` stores generated narration audio. V14 does not write it.

`StudioStoryboardSubtitleTrack` stores timed subtitle entries per language. Dutch drafts stay on language `nl`.

`StudioSceneImage.generatedPrompt` is the prompt already sent for an existing still. V14 shows it and does not edit it.

V10 dialogue lines live in planning memory. They are not a database field.

## Proposed column

```prisma
model StudioScene {
  dialogueText String?
}
```

PostgreSQL: `TEXT`, nullable, no default. Existing rows remain `NULL`.

It holds one principal spoken line for the scene. It does not replace description, action, emotion, the image prompt, the Dutch subtitle, or `voiceNarrationScript`.

Maximum stored length is the existing scene text cap, 4000 characters. Blank input is stored as `NULL`.

## Speaker

`dialogueText` does not name a speaker. A scene can have several characters. V14 does not pick the first character, and the form does not offer a speaker control that would look saved.

A later timeline that needs several clips per scene should add a separate line table, for example `StudioSceneDialogueLine` with `sceneId`, optional `characterId`, `order`, and `text`. That table is not part of this migration. Until then, the timeline can read `StudioScene.dialogueText` as the single principal line and `StudioSceneCharacter` as the people present, without treating either as a timed speaker track.

## Narrator on the timeline

`voiceNarrationScript` stays the film-level script. A later timeline can split that script into clips. V14 does not split it and does not add `narratorText`.

## Subtitles

Dutch text stays on the `nl` subtitle track, with placeholder times from V13. Dialogue and subtitle are saved by the same scene form as two fields. Clearing one does not clear the other.
