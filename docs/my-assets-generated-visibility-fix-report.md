# My Assets Generated Visibility Fix Report

## Root cause

Generated wizard references were **only** discoverable via `ProviderCostEvent` + live blob URL resolution (`resolvePublicBlobUrlByPathname`). When blob head lookup failed or cost-event metadata lacked direct URLs, `listUserGeneratedReferences` returned **empty** — so `assembleUserStudioAssetRegistry` only showed uploads and saved entities.

Additionally, registry assets from `generatedReferenceToRegistryAsset` did not always set explicit `visibility: "user_owned"`, relying on inference.

## Missing generated sources

| Source | Before | After |
|--------|--------|-------|
| `studio/{userId}/wizard-references/manifest.json` | Missing | **Registered on every upload** |
| Cost event `metadataJson.referenceImageUrl` | Not read | **Fallback when blob head fails** |
| `generatedReferenceToRegistryAsset` | No visibility / draft status | `user_owned`, `referenceAcceptance: draft` |
| Character accepted references | Shown but unlabeled | `referenceAcceptance: accepted`, `visibility: user_owned` |
| `stampUserOwnedRegistryAssets` | N/A | Applied in `assembleUserStudioAssetRegistry` |

Still excluded (by design): system audio catalog, voice presets, brand catalog.

## Visibility fix

- `generatedReferenceToRegistryAsset`: `visibility: "user_owned"`, `status: draft` for blob refs
- `characterReferenceImageAsset`: `visibility: "user_owned"`, `referenceAcceptance: accepted`
- `stampUserOwnedRegistryAssets()` ensures all `owner === userId` assets are `user_owned`
- `filterUserLibraryAssets` unchanged — system assets still hidden unless admin toggle

## Counts fix

`computeStudioAssetLibraryCounts`:

- `generatedOnly` / `byTab.generated` — `origin === "generated"`
- `derivedOnly` / `byTab.derived` — `origin === "derived"` or `semanticContinuity.derivedFromAssetId`
- `acceptedReferences` — entity-bound reference images (not blob `gen_*`)

## Generated tab

Shows all assets with `origin: "generated"`:

- Wizard blob drafts (`reference_image:gen_*`) with status draft
- Accepted entity references when semantic record indicates generation

Detail panel shows **Reference status** (draft / accepted / rejected).

## Derived tab

Shows:

- Blob variants with `origin: "derived"`
- Assets with `semanticContinuity.derivedFromAssetId` (lineage from source entity)

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | pass |
| `npx prisma generate` | pass |
| `npm run lint` | pass (0 errors) |
| `npm run build` | pass |
| `npm run test` | **2287/2287** pass |

New: `src/lib/studio-asset-generated-visibility.test.ts` (6 tests) covering upload visibility, generated draft refs, accepted refs, derived lineage, system placeholder exclusion, and count inclusion.

**Note:** Generations created before the manifest rollout are only recoverable via cost-event metadata + blob fallback; new generations register in `studio/{userId}/wizard-references/manifest.json` immediately.
