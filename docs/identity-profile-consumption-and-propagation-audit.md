# Identity Profile Consumption & Propagation Audit (Fases 8–10)

## Identity Profile Consumption Audit

Pipeline trace for `identityProfile`, `identityImportance`, `identityAssetType`.

Legend: **S** stored · **R** read · **B** influences behavior · **M** metadata only

| Stage | identityAssetType | identityImportance | identityProfile |
|-------|-------------------|--------------------|-----------------|
| **Asset (wizard + semantic record)** | S R B | S R M/B | S R B |
| **Asset Library** | S R M | S R M | S R M |
| **Storyboard** | — (on linked asset) | — | — |
| **Director** | — | — | — |
| **Scene Generation** | — | — | — |
| **Scene Semantic Recipe** | — | S R B | S R B |
| **Motion Handoff** | — | S R B | S R B |
| **Motion Execution** | — | R B (prompt text) | R B (prompt + guidance) |
| **Final Render** | — | S R M | S R M |

### Per-stage detail

#### Asset
- **Stored:** `buildAssetSemanticRecordFromWizardDraft` → `identityAssetType`, `identityProfile`, `identityImportance` (derived).
- **Behavior:** `buildIdentityProfileRules` writes preserve/change/forbidden to draft; fidelity thresholds via `resolveVariantFidelityThresholdsForProfile`; enforcement prompt includes profile guidance (fixed: `buildSourceTransformSummaryPrompt` now passes `identityProfileLevel`).
- **Gap:** Style-DNA-only path (`derivationStyleDna` branch) does not copy identity fields from draft.

#### Asset Library
- **Read:** `buildSemanticContinuitySnapshot` → detail panel.
- **Behavior:** none — no filters or generation logic.

#### Storyboard
- Stores character/location/prop IDs only. Identity lives on linked assets until recipe build.

#### Director
- `formatDirectorSemanticAssetLabel` omits all three fields. Director readiness does not branch on profile.

#### Scene Generation
- `buildSemanticIdentityLines` uses `preserveRules` (profile-derived at asset save) but not profile labels.
- **Indirect behavior:** yes via preserve rules. **Direct profile read:** no.

#### Scene Semantic Recipe
- `toCharacterRef` / `toPropRef` copy `identityProfile` + `identityImportance`.
- `identityAssetType` **not** copied to `SceneSemanticRecipeAssetRef`.
- `collectIdentityProfileMotionGuidance` adds per-level motion text.

#### Motion Handoff
- `formatSceneSemanticRecipeForMotion` serializes profile, importance, guidance.
- Attached on `MotionHandoffScene.semanticRecipe` in handoff payload.

#### Motion Execution
- `buildStudioSceneMotionInstructions` — semantic recipe line at dropPriority 0.
- `buildStudioSceneExecutionPackage` → `semanticIdentityRules` in final Vidu prompt.

#### Final Render
- `buildStudioRenderAuditMetadata` collects `identityProfiles[]`, `identityImportanceLevels[]`.
- No render-time branching on these values.

---

## Rule Propagation Audit

| Mechanism | Stored? | Consumed? | Influences behavior? | Profile-differentiated? |
|-----------|---------|-----------|----------------------|-------------------------|
| **preserve rules** | ✓ semantic record | ✓ asset gen, scene image prompts | ✓ prompt text | ✓ all 5 levels differ |
| **change rules** | ✓ | ✓ asset gen | ✓ prompt text | ✓ |
| **forbidden rules** | ✓ | ✓ asset gen | ✓ prompt text | ✓ |
| **identity weighting** | ✓ config | ✓ rule builder (`identityWeight >= 0.75` → "source identity") | ✓ | ✓ 30%→100% |
| **fingerprint locking** | ✓ fingerprint | ✓ enforcement blocks | ✓ lock level 1/2 | indirect via auto-recovery |
| **brand locking** | ✓ brandIdentity | ✓ all enforcement paths | ✓ always on | not profile-selector |
| **family locking** | ✓ assetFamily | ✓ prompts + fidelity score | ✓ | not profile-selector |
| **semantic recipe** | ✓ | ✓ motion | ✓ preserve union + profile lines | ✓ motion guidance differs |
| **motion instructions** | — | ✓ | ✓ highest-priority line | ✓ per-level guidance string |
| **scene generation prompts** | preserve only | ✓ | partial | indirect via preserve rules |
| **render lineage** | ✓ audit arrays | ✓ audit read | metadata | ✓ distinct profiles listed |

### Profile-level differentiation (same mascot source)

| Profile | Preserve % | Creativity % | Fidelity warning | Auto-recovery @75 | Distinct forbidden |
|---------|------------|--------------|------------------|-------------------|--------------------|
| relaxed | 30 | 80 | 60 | ok | weakest |
| balanced | 50 | 50 | 70 | warning | + style/palette |
| strict | 75 | 35 | 80 | warning | + face redesign |
| brand_lock | 90 | 20 | 88 | strict_regenerate | + logo removal |
| master_character | 98 | 10 | 92 | strict_regenerate | + new character |

Verified in `studio-asset-identity-profile-effectiveness.test.ts`.

---

## Identity Profile Effectiveness Report

### End-to-end difference test (same Globe Man source)

Automated comparison in `src/lib/studio-asset-identity-profile-effectiveness.test.ts`:

| Dimension | All 5 profiles differ? |
|-----------|------------------------|
| Preserve rules | ✓ |
| Forbidden rules | ✓ |
| Identity weight % | ✓ |
| Fidelity thresholds | ✓ (strict uses shared defaults; still distinct recovery behavior vs relaxed) |
| Recovery tier @ score 75 | ✓ relaxed=ok, strict=warning |
| Recovery tier @ score 88 | ✓ brand_lock=ok, master_character=warning |
| Motion guidance text | ✓ |
| Enforcement prompts | ✓ |
| Semantic generation context | ✓ |
| Render audit profiles | ✓ |

### Known defects / metadata-only gaps

1. **Director** — profile fields never surfaced in `semanticLabel`.
2. **Scene generation** — profile/importance/type not in still-image prompt; only preserve rules (indirect).
3. **Scene recipe** — `identityAssetType` dropped at recipe ref boundary.
4. **Style-DNA path** — identity fields may be missing on saved record.
5. **identityImportance** — label/audit only; thresholds always use `identityProfile` level.
6. **Fingerprint/brand/family lock** — not profile-selectors; run independently of profile level.

### Fixes applied during audit

- `buildSourceTransformSummaryPrompt` now passes `identityProfileLevel` to enforcement blocks (profile guidance was missing at asset reference generation).
