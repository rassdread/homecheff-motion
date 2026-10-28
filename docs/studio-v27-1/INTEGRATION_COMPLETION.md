# V27.1 integration completion

Worktree: `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-unified`  
Branch: `integrate/studio-unified-film-production`  
Base HEAD: `33725f4c3ea880c06c3529586c4f21963e9fedaf`

This pass connects existing generators. It does not add a second voice, music, image, or video engine.

## What now opens

| Request | Screen |
| --- | --- |
| Maak een stem | `/studio/audio/create?mode=voice` |
| Maak achtergrondmuziek | `/studio/audio/create?mode=music` |
| Maak een geluidseffect | `/studio/audio/create?mode=sfx` |
| Film scene with a storyboard | `/studio?storyboardId=…&tool=voice\|music\|sound&scene=…` |
| Film scene without a storyboard | `/studio/audio/create` with the project return path |
| Homepage local image | Staged in this browser, then read by the photo-video composer |

Music and sound effects on the create page are `StudioV9MusicPanel` and `StudioV9SoundEffectsPanel`. Those panels already call `generateStudioMusicApi` and `generateStudioSfxApi`. The buttons stay on those clients. The server still requires `confirmed === true` before it spends HC. This certification did not click them.

Voice on the create page collects the script, language, profile, and narration mode, then calls the existing `buildVoiceRequest`. Paid synthesis remains `generateStoryboardVoice` inside the storyboard voice tool. There is no second text-to-speech route.

## What was not rebuilt

Prompt builders, the still-image reference picker, the credit policy, the timeline renderer, and the film scene document were left in place and covered by `src/lib/studio-v27-1-integration.test.ts`.

## Verdict limit

Authenticated browser, database writes, blob upload, and a paid provider call were not run. The completion record is therefore a local integration, not a production certification.
