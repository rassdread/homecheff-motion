# Asset Vision Intelligence Report

## Analysis pipeline

Upload or library selection no longer jumps straight to generation. The wizard inserts an **`asset_vision`** step that calls the existing OpenAI Vision path via `POST /api/studio/asset-derivation/analyze` → `extractAssetStyleDna()` → `analyzeAssetReferenceVisionWithOpenAi()`.

Flow:

```
Upload / select source → asset_vision (analyze) → transform choice → transform_prompt (confirm) → Generate variant → review → save
```

Key files:

- `src/server/studio/analyze-asset-reference-vision.ts` — universal JSON vision prompt (all asset types)
- `src/server/studio/extract-asset-style-dna.ts` — returns `{ styleDna, visionAnalysis }`
- `src/lib/studio-asset-vision-analysis.ts` — normalization, Style DNA mapping, prompt blocks
- `src/lib/studio-asset-vision-trigger.ts` — client trigger shared by wizard step
- `src/components/studio/studio-wizard-asset-vision-step.tsx` — “Studio heeft dit gevonden” UI

No new AI provider, image generator, or schema migration.

## Object recognition

`AssetVisionObjectType` covers character, mascot, human, animal, food_item, product, packaging, vehicle, tool, building, location, environment, logo, brand_asset, illustration, ui_asset, unknown.

The wizard shows `objectTypeLabel` from vision (e.g. “Mascot”, “Packaging”, “Logo”).

## Style recognition

`visualStyle` is extracted and displayed (flat cartoon, cinematic, corporate brand, etc.) and mapped into Style DNA for derivation.

## Shape DNA

`shapeLanguage[]` is stored on `AssetVisionAnalysis` and surfaced in the analysis step; included in generation prompts via `buildVisionAnalysisPromptBlock()`.

## Brand identity

`brandIdentity` (e.g. “HomeCheff Globe Mascot”) is extracted, shown to the user, and passed into Style DNA + prompt enrichment for derivations.

## Preserve/change recommendations

Vision analysis is automatically translated into three editable rule sets:

| Set | Source |
|-----|--------|
| **Behouden** | Object-type defaults + vision `suggestedPreserve` |
| **Wijzigen** | Object-type defaults + vision `suggestedChange` |
| **Verboden** | Object-type defaults + vision `suggestedForbidden` |

Type-specific defaults (examples):

- **Character/Mascot** — preserve face, colors, brand identity, shape language; change outfit, role, accessories, environment; forbid style/color/face breaks
- **Packaging** — preserve logo, branding, shape; change edition, format, context
- **Logo** — preserve symbol, brand colors, identity; change presentation, 3D/dark variants
- **Location** — preserve architecture, layout; change season, time, mood

Rules populate draft fields (`sourceTransformPreserve`, `sourceTransformChange`, `sourceTransformForbidden`) on analysis. The user edits them on the transform prompt step before **Genereer variant**.

## Derivation intelligence

Derivation source selection defers analysis to `asset_vision`. Style DNA and vision analysis feed `derive_preview` and generation payloads so variants preserve brand colors, shape language, and identity while changing role/outfit/context.

## Prompt enrichment

Final generation prompt combines:

1. Vision analysis (object, style, colors, shape DNA, key features, brand identity)
2. Style DNA block (`buildStyleDnaPromptBlock`)
3. User-editable **Preserve / Change / Forbidden** rules
4. User instruction

Implemented via `buildEnrichedAssetGenerationContext()` + `buildSourceTransformSummaryPrompt()`.

## Wizard UX

New step **`asset_vision`** (“Studio heeft dit gevonden” / “Studio found this”):

- Object type, visual style, brand colors (with hex), shape DNA, key features, brand identity
- Suggested preserve / change summary
- Auto-analysis on enter; retry on failure
- Next disabled until analysis is `ready`

Transform prompt step shows a compact “Studio denkt dat dit is” recap before explicit generation.

## Tests/build status

Run validation:

```bash
npx prisma validate && npx prisma generate
npm run lint && npm run build && npm run test
```

New tests: `src/lib/studio-asset-vision-analysis.test.ts` (object types, colors, style/shape/brand extraction, wizard step order, prompt enrichment).

Updated: `src/lib/studio-asset-wizard-source-flow.test.ts` (asset_vision in step sequences).

Latest validation: **2190/2190** tests pass; build pass; no schema migration.
