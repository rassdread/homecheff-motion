# HomeCheff Asset Intelligence Report

Sprint date: 2026-06-10

## Asset Intelligence Model

- `EditorAssetProfile` on `EditorCanvasDocument` stores asset understanding after upload and on every save refresh.
- Detection pipeline: vision `objectType` (when available) → document name hints → `sourceKind` → layer semantics.
- Supported types: character, mascot, logo, product, food, plant, garden_asset, poster, flyer, photo, scene, background, object_collection, text_design, motion_asset, brand_asset.
- Profile fields: `assetType`, `confidence`, `humanSummaryKey`, `recommendedActions`, `recommendedExports`, `recommendedStudioUse`, `recommendedMotionUse`, `recommendedDestination`, `libraryIntelligence`, `variantGroup`, `studioIntent`, `analyzedAt`.
- Built in `editor-asset-intelligence.ts`; refreshed via `enrichEditorDocument` and after vision in `runEditorVisionAndObjectDetection`.

## Smart Recommendations

- Per-type templates in `editor-asset-recommendations.ts` map to human-first actions (motion-ready, transparent, Studio, Brand Kit, print/social, marketplace, etc.).
- `EditorAssetRecommendationsPanel` shows **Aanbevolen voor dit asset** with action buttons and plain-language reasons.
- Workspace wires `handleAssetRecommendation` to motion bootstrap, background removal, cutout, brand kit, Studio/Motion links, export, and library save.
- Magic Edit Bar and v7 contextual suggestions prefer `document.assetProfile` over generic layer-kind heuristics.

## Ecosystem Routing

- `resolveEcosystemDestination` maps each asset type to HomeCheff destinations: Brand Kit, Library Characters, Motion Assets, Print Assets, Marketplace Assets, Studio Assets, Garden, Design, etc.
- Panel shows **Het beste opgeslagen in** with localized section labels — no taxonomy exposed to users.

## Motion Intelligence

- `buildMotionReadinessReport` evaluates background removal, object isolation, transparent PNG, resolution, mask quality, multiple objects, baked text.
- Returns Motion Readiness Score (0–100) with label keys (`ready` / `almost` / `needsWork`) and plain-language explanations.
- Mascot/character recommendations prioritize motion-ready and transparent workflows.

## Studio Intelligence

- `buildStudioReadinessReport` scores fit for character, prop, scene, location, world, brand element, storyboard reference.
- `buildStudioAssetIntent` produces `StudioAssetIntent` for future Studio Auto Builder (character, location, scene, world, prop, brand_element).
- **Use In Studio** handoff seeds storyboard flow with compositor URLs and intent kind.

## Library Intelligence

- `resolveLibraryIntelligence` auto-categorizes into Library sections (characters, logos, food, garden, design, motion, posters, print, brand).
- `libraryIntelligence.autoCategory` aligns with existing `EditorLibraryExportCategory` for export/save flows.

## Asset Variants

- `resolveAssetVariantGroup` links mascot-style assets to variant presets (Business, Chef, Garden, Designer, Winter, Summer, Event, Motion).
- Panel shows **Gerelateerde looks** when a variant group is detected; relationship stored on profile for browse-by-variant foundation.

## Studio Auto Builder Foundation

- `StudioAssetIntent` on profile: `kind`, `labelKey`, `referenceUrls`, `sessionId`, `suggestedRole`.
- Intent kinds: character, location, scene, world, prop, brand_element — ready for automatic storyboard generation in a future sprint.

## Context Aware Assistant

- `resolveEditorAiSuggestions` and `resolveContextualCommandSuggestions` call `profileToV7Suggestions` when `assetProfile` exists.
- Upload mascot → motion-ready, variant, mascottebibliotheek suggestions instead of generic edit prompts.
- Upload poster → print export, social formaten, duplicate campagne.

## Human First Asset Intelligence

- UI never shows classification, confidence, taxonomy, or AI terminology.
- Users see only: **Aanbevolen voor dit asset**, **Waarom?** (reason per action), **Wat kun je nu doen?** (action buttons).
- Summaries use localized human phrases (`Dit lijkt op een HomeCheff-mascotte…`).

## Asset Intelligence User Test

| Upload | Categorization | Recommendations | Library destination | Studio | Motion |
|--------|----------------|-----------------|---------------------|--------|--------|
| Mascot | mascot | motion-ready, transparent, Studio, save mascot | library_characters | character intent | readiness score |
| Logo | logo | Brand Kit, transparent, Motion | brand_kit | brand element | partial |
| Food image | food | marketplace, restaurant poster, social | marketplace_assets | prop | needs cutout |
| Poster | poster | print, social, duplicate format | print_assets | storyboard | N/A |
| Scene image | scene | Studio, Motion, library | studio_assets | scene/location | scene motion |

Automated coverage: `editor-asset-intelligence.test.ts`, `editor-asset-intelligence-audit.test.ts`.

## Final Score

| Area | Score |
|------|-------|
| Asset Understanding | 8 |
| Recommendations | 8 |
| Library Intelligence | 7 |
| Studio Intelligence | 7 |
| Motion Intelligence | 7 |
| Variant System | 6 |
| User Guidance | 8 |
| **Overall** | **7** |

## Validation

- `npm run lint` — required before commit
- `npm run build` — required before commit
- `npm run test` — required before commit (includes new asset intelligence tests)

## Key Files

| File | Role |
|------|------|
| `src/types/editor-asset-profile.ts` | Profile types |
| `src/lib/editor-asset-intelligence.ts` | Detection + profile build |
| `src/lib/editor-asset-recommendations.ts` | Action templates + v7 bridge |
| `src/lib/editor-asset-ecosystem-routing.ts` | Destination + library auto-category |
| `src/lib/editor-asset-motion-intelligence.ts` | Motion readiness |
| `src/lib/editor-asset-studio-intelligence.ts` | Studio readiness + intent |
| `src/lib/editor-asset-variants.ts` | Variant groups |
| `src/components/editor/editor-asset-recommendations-panel.tsx` | Human-first panel |
| `src/components/editor/editor-canvas-workspace.tsx` | Panel + action wiring |
