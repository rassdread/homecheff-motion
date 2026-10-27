# Prompt engineering preservation

No second prompt engine was added. Homepage text is carried as `idea` or appended after an existing preset prompt.

## What the code actually assembles

Storyboard stills, when a production context exists, use `buildProductionInstructions` in `src/lib/studio-production-prompt-orchestrator.ts`. The joined still prompt is `assembledPrompt`. Section order in that file is safety, user scene title and description, identity, product, continuity, action and emotion, camera and director, location, style, then quality polish. `negatives` is a separate array and is not concatenated into `assembledPrompt`.

Without that context, `buildSceneImageGenerationPrompt` in `src/lib/studio-scene-image-prompt.ts` uses `buildScenePromptFromInput` (`src/lib/studio-prompt-builder.ts`): identity, director, location, characters, props, action, emotion, director profile, camera, visual style, continuity, then the fixed quality line.

Asset references use `buildAssetReferenceGenerationPrompt` or `buildDerivationReferenceGenerationPrompt`.

Image edits that reach OpenAI are `buildSceneRerenderExecutionPrompt`, `buildEditorInstructionPromptV3` (precision lines can include a `NEGATIVE:` line inside the one prompt string), and `buildEditorFusionPrompt`.

AI video uses `combineAnimationPrompt` for classic animation jobs, `buildInstantVideoPrompt` plus `buildBudgetedViduPrompt` for instant clips, and `buildInstantStoryModePromptDetailed` for story mode. Vidu receives one `prompt` string. `supportsNegativePrompt` is false on the Vidu capability record. Duration and resolution are separate JSON fields in `ViduVideoProvider.createStartEndVideoJob`. Aspect ratio is on the TypeScript input and is not sent as its own field on that start-end request.

Motion action presets store `promptTemplate` and `negativePrompt` in `buildMotionActionPreset`. The prefill copies `promptTemplate` to `promptDraft`. At job time the engine snapshot block is `motionPresetCombinedPromptBlock`. The stored negative string is not read again as an API field.

Voice uses `buildVoiceRequest`: cleaned script, model `eleven_multilingual_v2`, language, speed, stability, similarity, style. Music posts `{ prompt, music_length_ms, force_instrumental }` from `generateElevenLabsMusic`. Sound effects use a `text` field on `/v1/sound-generation`.

## V27 handoff rule

`mergePresetPromptWithUserIdea` keeps the existing preset string and appends `User direction:` plus the homepage idea. `MotionHubQueryPrefillApplier` applies that to `promptDraft` and `scenePrompt` before the Instant wizard stores the prefill. The photo-intent copy in `src/lib/motion-hub-navigation.ts` still starts with the identity-preservation sentence, for example "Preserve the subject identity exactly."

The homepage does not replace those builders with a generic instruction.
