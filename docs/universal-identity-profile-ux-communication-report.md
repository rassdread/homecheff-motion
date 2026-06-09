# Universal Identity Profile UX & Communication Report

## Profile Information UI

- Added `StudioIdentityProfileInfoButton` (`src/components/studio/studio-identity-profile-info.tsx`).
- Each profile level shows an ⓘ control:
  - **Desktop:** hover/focus tooltip with name, description, preserve %, creativity %, recommended use.
  - **Mobile:** bottom sheet via existing `MotionBottomSheet`.
- Wizard identity step (`studio-wizard-identity-profile-step.tsx`) attaches info buttons beside every profile chip.

## Recommendation Explanations

- `buildIdentityProfileRecommendation()` and `resolveIdentityProfileRecommendationReason()` drive auto-suggestions from vision analysis.
- Wizard shows a green recommendation banner with localized reason text (e.g. master character for brand mascots, brand lock for logos/packaging).
- Override hint appears when the user picks a different profile than suggested.

## Asset Type vs Identity Profile Communication

- Wizard includes a dedicated “type ≠ profile” callout card.
- Live summary panel shows **Asset type** and **Identity profile** side by side with preserve/creativity weights.
- Changing asset type no longer overwrites a user-selected profile (`buildIdentityProfileDraftPatch` preserves `identityProfileLevel`).

## Semantic Contract Audit

| Layer | `identityAssetType` | `identityProfile` | `identityImportance` |
|-------|---------------------|-------------------|----------------------|
| Asset Semantic Record | ✓ | ✓ | ✓ |
| Wizard draft | ✓ (`identityAssetType`) | ✓ (`identityProfileLevel`) | derived on save |
| Asset Library detail | ✓ | ✓ | ✓ |
| Scene Semantic Recipe refs | via record | ✓ | ✓ |
| Motion handoff format | — | ✓ + guidance | ✓ |
| Render audit metadata | — | ✓ (`identityProfiles`) | ✓ (`identityImportanceLevels`) |
| Generation context prompts | ✓ | ✓ | ✓ |

Fields remain separate; type describes *what*, profile describes *how strict*.

## Profile Effect Validation

All five profiles (`relaxed` → `master_character`) produce distinct:

- preserve / change / forbidden rule sets (`buildIdentityProfileRules`)
- identity weighting (`identityWeight` / `creativityWeight`)
- fidelity thresholds (`resolveVariantFidelityThresholdsForProfile`)
- auto-recovery tiers (`resolveVariantFidelityRecoveryTier` accepts profile level)
- prompt blocks (`resolveIdentityProfileMotionGuidance` in enforcement + semantic context)
- stricter recovery patch uses profile rules when draft has confirmed type + profile

## Library Integration

`StudioAssetDetailView` shows when available:

- Type (`identityAssetType`)
- Identity Profile
- Identity Importance
- Brand Identity
- Asset Family
- Identity Score

## Motion Integration

- `formatSceneSemanticRecipeForMotion` emits identity profile, importance, and per-profile motion guidance.
- `studio-identity-continuity` audits missing `identityProfile` / `identityAssetType` and scores motion continuity using profile fields.
- Render audit (`buildStudioRenderAuditMetadata`) collects `identityProfiles` and `identityImportanceLevels` from handoff scenes.

## Tests/Build Status

Run validation after merge:

```bash
npx prisma validate && npx prisma generate
npm run lint && npm run build && npm run test
```

New/updated tests:

- `studio-asset-identity-profile.test.ts` — profile differentiation, thresholds, recommendations, type≠profile
- `studio-identity-continuity.test.ts` — motion text includes profile guidance
- `studio-asset-identity-preservation.test.ts` — profile-aware fidelity recovery tiers
