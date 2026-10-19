# Character system

## What exists

`StudioCharacter` stores:

- name, slug (unique per owner), description, personality
- `referenceImageUrl`, `referenceImageUrls`, `referenceImageSummary`
- appearance memory, personality memory, identity strength
- clothing and clothing lock
- `voiceProfile`, `voiceLanguage`, `voiceGender`, `voiceLock`, `voiceProfilesJson`
- links to scenes through `StudioSceneCharacter`

Ownership is `ownerId`. Deleting the user cascades the character. Characters are reusable across storyboards because the scene link is separate from the character row.

## MADE WITH PASSION

| Character | Id | Voice profile rows | Gender field | Language |
|---|---|---|---|---|
| Baker | `cmvdlq3wy0005k007dpq2mp8c` | empty | female | en |
| Potter | `cmvdlrtuo000fk007np7d6ft3` | empty | female | en |
| Gardener | `cmvdltib5000pk00762r013fr` | empty | male | en |

Master images already exist. The next film step is to **select** ElevenLabs voices and write `voiceProfile` / `voiceLock`. That does not call the image provider.

Library rows for these masters are draft status so the general library does not treat them as ordinary generated stills. Leave that status.

## Missing

- A scene-level dialogue line that is distinct from the image prompt, if the team does not want to overload `description`.
- Proof that every scene image request sends the master URL as a reference. The fields exist. The film workflow must require the reference, not hope the prompt mentions the name.
- No outfit variants as separate approved stills. Clothing is a text lock on the character.
- Cross-project reuse works at the data level. The UI does not yet show “used in these films” as a first-class panel.

## Rule

Never run character-master generation again for these three ids unless the founder explicitly replaces a master. The runtime that writes masters must stay gated by the existing confirmation.
