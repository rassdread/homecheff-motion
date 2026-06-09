# Identity Shape Marker Enforcement Report

## New Identity Marker Rules

**MASTER CHARACTER RULE** (universal, `studio-asset-identity-shape-markers.ts`):

- Upper-head color regions, silhouette markers, brand-specific shape markers, and visual identity shapes are **character identity** — not hair.
- Role-specific headwear is allowed (chef hat, garden hat, cap, helmet, crown, safety gear, cultural headwear) when the original head silhouette stays recognizable.

**P1 LOCKED** preserve category: `identity shape markers` — same tier as face structure, head shape, body proportions, and silhouette.

## Vision Classification Changes

Post-processing in `mapVisionJsonToAnalysis()` via `applyVisionIdentityShapeMarkerNormalization()`:

1. Detect `hair`, `hairstyle`, `hair color` in `keyFeatures`, `shapeLanguage`, `suggestedPreserve`, fingerprint fields.
2. For mascots, brand characters, flat/vector styles, and HomeCheff Globe context → reclassify to `identityShapeMarker` text (e.g. "blue upper-head region").
3. Realistic human photographs keep hair terms unchanged.
4. OpenAI vision prompt updated (`analyze-asset-reference-vision.ts`) to avoid mislabeling mascot head regions as hair.

## Fingerprint Updates

`AssetIdentityFingerprint` extended with:

```typescript
identityShapeMarkers?: string[];
```

Populated from reclassified features + Globe Man defaults (`blue upper-head region`, `globe head silhouette`, `signature mascot head form`).

`formatIdentityFingerprintSummary()` includes `Shape markers: …` in summaries consumed by scene recipes, motion, and render audit.

## Prompt Enforcement Updates

For `master_character` and `brand_lock`:

- `buildIdentityShapeMarkerEnforcementBlock()` injected in `buildIdentityEnforcementPromptBlocks()`.
- Forbidden boosts: realistic hair, new hairstyle, human hair rendering, character redesign.
- Preserve boosts: identity shape markers + per-marker entries from fingerprint.
- Semantic generation context includes `buildIdentityShapeMarkersPromptLine()`.

## UI Updates

`StudioIdentityProfileInfoButton` shows **Identity shape markers** section for `master_character` and `brand_lock` with examples (mascot heads, crowns, antennae, horns, branded forms).

Asset vision step displays shape markers in the fingerprint summary row.

i18n: EN + NL keys under `studio.assetCreation.identityProfile.info.identityShapeMarkers*`.

## Validation Results

Globe Man → Chef / Garden / Designer / Host (`studio-asset-identity-shape-markers.test.ts`):

| Check | Result |
|-------|--------|
| Head shape recognizable | ✓ enforcement prompts |
| Blue upper-head region | ✓ reclassified from "hair" |
| Chef / garden / role headwear allowed | ✓ in change rules |
| No realistic hair / hairstyle | ✓ forbidden rules + prompts |
| No character redesign | ✓ forbidden + MASTER CHARACTER RULE |

## Tests/Build Status

| Check | Status |
|-------|--------|
| `npm run test` | **2281/2281** pass |
| `npm run lint` | pass |
| `npm run build` | pass |

New test file: `src/lib/studio-asset-identity-shape-markers.test.ts` (7 tests).
