# Asset Identity Preservation Report

Sprint goal: derived assets stay within the same brand family and identity (e.g. Globe Man → Chef variant), not become new characters.

## Brand identity detection

- Vision prompt extended with `assetFamily`, `characterLineage`, `brandRecognitionConfidence`, and identity structure fields.
- `inferBrandIdentityFromContext()` fallback when vision returns unknown — uses source name and object type.
- `mapVisionJsonToAnalysis()` accepts optional `sourceName` context.

## Asset family detection

- Semantic record fields: `assetFamily`, `parentAssetId`, `derivedFromAssetId` (no schema migration).
- `inferAssetFamily()` groups variants (e.g. HomeCheff Mascots).
- Library derivations set lineage from `derivationSource.assetId`.

## Identity fingerprint

- `AssetIdentityFingerprint` from face, outline, proportions, colors, shape, brand, silhouette, accessories.
- Persisted on semantic record with `fingerprintHash`.

## Preserve/change/forbidden enforcement

- Preserve Priority Engine (P1 identity, P2 pose/accessories, P3 outfit/role).
- Auto forbidden rules for flat/vector/logo mascots.
- Variant Transformation Mode in all source-based prompts.
- Source Image Fidelity Boost with explicit priority order.

## Variant fidelity scoring

- Post-generation vision comparison via existing analysis pipeline.
- Low fidelity warning + stricter preserve on regenerate.

## Motion semantic integration

- Scene semantic recipe includes `assetFamily` and `identityFingerprintSummary`.

## Audit findings

Vision, reference generation, derivation, review UI, and Motion handoff now share brand family + fingerprint semantics end-to-end.

## Tests/build status

| Check | Status |
|-------|--------|
| prisma validate/generate | pass |
| lint | pass |
| build | pass |
| tests | **2201/2201 pass** |

New tests: `src/lib/studio-asset-identity-preservation.test.ts` (10 cases).
