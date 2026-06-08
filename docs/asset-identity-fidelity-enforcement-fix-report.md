# Asset Identity Fidelity Enforcement Fix Report

Audit date: 2026-06-08

## Root cause

1. **Text-only generation** — `POST /api/studio/asset-references/generate` sent only a text prompt to OpenAI. The source image URL was included in the client payload but **never used** by `generateImageBuffersFromPrompt`, so the model could not see the mascot.
2. **Weak / conflicting prompt framing** — `buildAssetReferenceGenerationPrompt` appended generic lines like “Professional brand-safe illustration” and could say “Create a new official reference variant”, overriding transform intent.
3. **Brand identity fallback gap** — Vision often returned `Unknown Brand Asset`. Fallback only triggered when `HomeCheff` appeared in the source name; **`Globe Man` alone** did not resolve to HomeCheff Globe Mascot.
4. **No hard identity lock** — Preserve/forbidden rules existed but were not prepended as mandatory, uppercase identity-lock blocks before role/outfit instructions.

## Final prompt before/after

**Before (typical):**

```
SOURCE IMAGE FIDELITY…
Transform the existing Globe Man into a Chef version…
Brand identity: Unknown Brand Asset.
…
Character reference portrait. Professional brand-safe illustration.
```

**After:**

```
TRANSFORM THE EXISTING SOURCE CHARACTER.
DO NOT CREATE A NEW CHARACTER.
KEEP THE SAME FACE STRUCTURE, HEAD SHAPE, BODY PROPORTIONS…
KEEP 2D FLAT VECTOR LOGO-MASCOT STYLE.
DO NOT CONVERT TO 3D, PIXAR, DISNEY…
Make a Chef version of this exact mascot "Globe Man" (HomeCheff Globe Mascot) — NOT a new Chef mascot…
SOURCE IMAGE FIDELITY (highest priority)…
…
Forbidden:
- new character
- redesigned face
- different head shape
- 3D cartoon style
- Pixar/Disney style
…
Character reference portrait. Same mascot identity as source — outfit/role variant only.
```

## Brand identity fallback fix

`resolveHomeCheffGlobeBrandProfile()` matches source name/id/prompt containing:

- Globe Man
- HomeCheff / HomeCheff Globe / HomeCheff Mascot

→ `brandIdentity = HomeCheff Globe Mascot`, `assetFamily = HomeCheff Mascots`, `lineage = Primary Mascot`

Applied in `mapVisionJsonToAnalysis()` via `applyKnownBrandDefaults()`.

## Identity lock prompt

`HARD_IDENTITY_LOCK_INTRO` + `FLAT_MASCOT_STYLE_LOCK` prepended in `buildIdentityEnforcementPromptBlocks()` for all source-based transforms.

## Forbidden rules

`MANDATORY_FORBIDDEN_RULES` merged in `buildMandatoryForbiddenBlock()` — always includes face redesign, 3D/Pixar, new character, etc.

## Source image priority

- Prompt lead: **“Make a {role} version of this exact mascot”** (not “create a chef mascot”).
- `SOURCE IMAGE FIDELITY (highest priority)` block retained with explicit priority order.
- Server logs `hasSourceImage` + `sourceImageUrl` on every generate request (image still text-only until multimodal provider wiring).

## Fidelity warning

- Low fidelity score shows **“Low identity match”** warning in reference review.
- Regenerate sets `variantRegenerationStrict` and prepends: *“The previous result changed the character identity. Retry with stricter identity preservation.”*

## UI debug

`StudioWizardIdentityDebugPanel` on transform + reference review shows:

- brandIdentity, assetFamily, fingerprint hash, forbidden rules
- Admin: full prompt excerpt / server `referenceGenerationPrompt`

## Logging

`[asset-references/generate:identity-audit]` logs:

- source image presence/URL
- brandIdentity, assetFamily, fingerprint hash
- preserve/change/forbidden rules
- **full final prompt** sent to OpenAI

## Tests/build status

- `src/lib/studio-asset-identity-preservation.test.ts` — Globe Man → Chef identity lock + brand fallback
- Run: `npm run lint`, `npm run build`, `npm run test`

## Follow-up (not in this fix)

Wire source image into OpenAI image edit / gpt-image reference input when provider supports it — prompt-only enforcement reduces but cannot eliminate identity drift without multimodal input.
