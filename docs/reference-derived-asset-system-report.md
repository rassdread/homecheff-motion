# Reference-Derived Asset System Report

Built on existing Universal Asset Wizard, Asset Reference Generation, Vision Analysis, and Studio Profitability — no new AI provider, image generator, schema migrations, or parallel builders.

## Existing Reference Audit

| Source | Safe as derivation base today | Notes |
|--------|------------------------------|-------|
| Character `referenceImageUrl` | **Yes** | Primary library reference |
| Character canonical supporting refs | **Yes** | `[identity:refs]` bundle in `referenceNotes` |
| Prop / location primary refs | **Yes** | `referenceImageUrl` on list items |
| Prop / location canonical refs | **Yes** | `[asset:refs]` in `continuityNotes` |
| Wizard uploads | **Yes** | Via Motion upload API |
| Generated wizard references | **Yes** | Can be picked from library after save |
| Worlds | **No** | No reference images |

**Gap before this sprint:** `existing_asset` entry was upload-only with no style DNA or transform flow.

## Style DNA Extraction

- **API:** `POST /api/studio/asset-derivation/analyze`
- **Service:** `extract-asset-style-dna.ts` — reuses `analyzeCharacterReferenceImagesWithOpenAi`
- **Output:** `AssetStyleDna` — visual style, colors, shape, outfit hints, brand identity, mascot traits
- **Metering:** `asset_derivation` / `derivationPhase: vision`

## Derived Asset Flow

**Entry paths:**

1. Classic wizard → **Derive from existing reference**
2. Guided wizard (`?guided=1`) → choice between chip flow or derive flow

**Steps:** source → target kind → transform → live preview → generate reference → save

**Transform options:**

- Character: Chef, Garden, Designer, Community, Mascot, Custom
- Prop: Variant, Seasonal, Premium, Branded
- Location: Variant, Region, Time of day, Mood

Example: Globe Man → Garden mascot — preserves colors/shape/brand, changes outfit/role.

## Generated References

- Reuses `POST /api/studio/asset-references/generate` with `derivation.styleDna`
- Prompt: `buildDerivationReferenceGenerationPrompt` extends existing asset reference prompt
- UI: same reference step — accept / regenerate / back to choices
- Accept metering: `POST /api/studio/asset-derivation/accept`

## Profitability Impact

| Tag | Phase | Cost action |
|-----|-------|-------------|
| `asset_derivation` | `vision` | OpenAI character analysis |
| `asset_derivation` | `generate` | OpenAI scene image (DALL-E) |
| `asset_derivation` | `accept` | Internal marker (acceptance tracking) |

Rollup key: `asset_derivation` in `studio-profitability.ts`

## User Insights

`GET /api/me/studio-insights` adds:

- `assetsDerived` — accepted derivations this month
- `estimatedTimeSavedMinutes` — 10 min × accepted derivations (heuristic)

No internal margins exposed.

## Admin Insights

Render analytics → **Asset derivation ROI**:

- Derived asset count, acceptance %, avg cost, est. time saved
- Top source assets (from cost event metadata)
- Feature row in profitability breakdown

## ROI Analysis

`buildAssetDerivationRoiSummary()` aggregates `ProviderCostEvent` where `metadata.feature = asset_derivation`.

## What Should NOT Be Rebuilt

Extend only:

- Universal Asset Wizard (`studio-asset-creation-wizard.tsx`)
- Asset Reference Generation (`studio-asset-reference-service.ts`)
- Character vision (`analyze-character-reference-images.ts`)
- Canonical reference libs
- Studio Profitability + User Insights
- `ProviderCostEvent` metering

**New (additive):**

- `src/types/studio-asset-derivation.ts`
- `src/lib/studio-asset-derivation-*.ts`
- `src/server/studio/extract-asset-style-dna.ts`
- `src/server/studio/list-asset-derivation-sources.ts`
- `src/server/studio/studio-asset-derivation-roi.ts`
- `src/app/api/studio/asset-derivation/*`
- `src/components/studio/studio-asset-derivation-*-step.tsx`

## Tests

`src/lib/studio-asset-derivation.test.ts` — style DNA, preview, transforms, prompt, wizard advance, profitability tag.
