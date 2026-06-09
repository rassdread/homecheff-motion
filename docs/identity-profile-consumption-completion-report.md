# Identity Profile Consumption Completion Report

## Director Consumption

- `ProposedAssetRef` now carries `identityAssetType`, `identityProfile`, `identityImportance`.
- `formatDirectorSemanticAssetLabel` shows Type / Profile / Importance.
- `scoreIdentityProfileDirectorBoost` prioritizes `master_character` (+5) and `brand_lock` (+3) in asset selection.
- `blocksReplacementAssetSuggestion` prevents new character proposals when a `master_character` ref is linked.
- `collectIdentityProfileDirectorLines` injects profile-specific director guidance into `identityConsumption.directorContextLines`.

## Scene Generation Consumption

- `buildSemanticIdentityLines` now emits explicit `Asset type`, `Identity profile`, `Identity importance`, and profile motion guidance for characters, locations, and props via `buildIdentityProfileConsumptionLines`.

## Scene Recipe Completion

- `SceneSemanticRecipeAssetRef` includes `identityAssetType`.
- All ref builders (`toCharacterRef`, `toPropRef`, `toLocationRef`, `toWorldRef`) copy the field from semantic records.

## Motion Consumption

- `formatSceneSemanticRecipeForMotion` serializes identity profile, importance, and asset types for all ref kinds.
- Profile guidance collected from characters, props, locations, and worlds.

## Render Lineage Completion

- `buildStudioRenderAuditMetadata` collects `identityAssetTypes[]` alongside profiles and importance levels.

## Continuity Enforcement

- `auditAssetSemanticRecord` warns on missing `identityImportance`.
- `auditSceneSemanticRecipe` checks profile, importance, asset type, and motion guidance presence.
- `auditRenderIdentityLineage` validates render audit identity arrays.

## End-to-End Effectiveness

`studio-asset-identity-profile-consumption-completion.test.ts` verifies director refs, scene prompts, recipes, motion text, render audit, and continuity gaps.

## Remaining Gaps

- `buildInstantStoryModePromptDetailed` (instant premium path) does not read scene semantic recipes — Studio handoff path is fully covered.
- Fingerprint / brand / family locking remain independent of profile level (by design).

## Tests/Build Status

Run `npm run test` — consumption completion suite: 7 tests; full suite includes effectiveness + profile tests.
