# Asset Wizard Generation Bugfix & Dynamic Transformation Report

## Response Format Fix

OpenAI `gpt-image-*` models reject `response_format` on `/v1/images/generations`. A model-aware helper (`src/lib/openai-image-generation.ts`) gates the parameter to DALL-E 2/3 only. `OpenAiSceneImageProvider` and asset reference generation share this helper, eliminating the 502 `Unknown parameter: 'response_format'` on “Studio genereert”.

## Uploaded Image Continuity

Wizard drafts now persist `sourceReferenceImageUrl`, `sourceReferenceStorageKey`, and `sourceReferenceName` via `recordWizardSourceReference()`. Uploads in the input step, derivation source step, and reference step all record the source. Step transitions clear generated output only (`clearWizardGeneratedReferenceOutput`) — never the source. The reference step shows a “Gebaseerd op jouw upload” banner with preview.

## Source Reference Generation

When a source exists, `buildAssetReferenceGenerationPrompt()` adds a preservation block: keep shape, colors, and brand style; change only role/outfit/context. Derivation flows pass `transformLabel` (e.g. Chef variant of Globe Man). Style DNA is auto-extracted before generate when missing.

## Dynamic Transformation Options

`src/lib/studio-asset-transformation-options.ts` builds character/prop/location options from:

1. Asset kind
2. User library roles (Chef/Garden/Designer when detected)
3. Generic presets (Host, Mascot, Product variant, Day/Night, etc.)
4. Custom fallback

The creation wizard and derivation transform step fetch library sources and resolve options at runtime — no global HomeCheff-only list.

## User-specific Recommendations

`detectRecommendedRoleIds()` scans canonical roles and asset names. HomeCheff users with Chef/Garden/Designer assets see those first with a “recommended” hint. Users without library roles get generic options only.

## UI Error Handling

Provider failures map through `presentAssetReferenceGenerationError()` to `studio.assetCreation.reference.generateFailedUser` for users. Admins see raw `providerMessage` in debug UI. Copy clarifies upload-as-basis, variant generation, style preservation, and official reference acceptance.

## Tests/build status

New tests:

- `openai-image-generation.test.ts` — no `response_format` for gpt-image models
- `studio-asset-transformation-options.test.ts` — HomeCheff vs generic options
- `studio-asset-wizard-generation.test.ts` — source persistence, prompt preservation, error mapping
- Extended `studio-asset-reference-prompt.test.ts`

Run validation: `npx prisma validate`, `npx prisma generate`, `npm run lint`, `npm run build`, `npm run test`.
