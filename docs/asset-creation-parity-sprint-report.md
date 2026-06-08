# Asset Creation Parity Sprint Report

Sprint date: 2026-06-06  
Validation: `npm run lint` (0 errors), `npm run build` (pass), `npm run test` (**2012/2012** pass)

---

## Maturity Matrix

| Asset | Before | After | Notes |
|-------|--------|-------|-------|
| **Character** | 8/10 | **8/10** | Reference implementation; wizard shell wired; prompt/image/merge/voice/canonical remain richest |
| **Prop** | 4/10 | **7/10** | Universal entry, wizard, identity fields on create, prompt prefill, readiness, reference-first |
| **Location** | 4/10 | **7/10** | Same parity layer as prop on `/studio/locations/new` |
| **World** | 5/10 | **6/10** | Identity builder fields on create, wizard, readiness; text-first (no reference image in schema) |

---

## Character Parity

**Create flow:** `/studio/characters/new` → `StudioAssetCreationPage` → optional `StudioAssetCreationWizard` → `StudioCharacterForm` with universal entry paths mapped via `mapEntryPathToCharacter()`.

**Edit flow:** `/studio/characters/[id]/edit` — full identity builder, voice library, canonical references.

**Builder:** `studio-character-identity-fields.ts` + workspace `studio-workspace-character-identity-builder.tsx`.

**Prompt prefill:** `studio-character-identity-prompt-prefill.ts` + `StudioCharacterPromptPrefillPanel`.

**Image prefill:** `studio-character-image-prefill-panel.tsx` + analyze API.

**Image + prompt merge:** Character-only merge panel with conflict resolution.

**Readiness:** `studio-character-readiness.ts` — domains: identity, visual style, references, world, voice, usage, continuity.

**Canonical references:** `studio-character-canonical-references.ts` — official reference, history, supporting refs (read UI).

**AI suggestions:** Workspace identity builder + director suggestions.

**Consumption:** `toIdentitySpec()` → Story Architect, AI Director, Scene Planner, Production Planner, asset decisions, motion handoff, project memory.

**Continuity:** Full identity spec + reference URLs flow through render/consistency pipelines.

---

## Prop Parity

**Create flow:** `/studio/props/new` — wizard shell + enhanced `StudioPropForm`.

**Edit flow:** `/studio/props/[id]/edit` — basic fields (workspace builder remains richest edit surface).

**Builder (create route):** Identity fields from `studio-prop-identity-fields.ts` — type, category, style, material, forbidden, usage, world.

**Prompt prefill:** `buildAssetPromptPrefillProposal({ kind: "prop" })` + `StudioAssetPromptPrefillStep`.

**Image prefill:** Upload supported; heuristic vision analyze **not** wired (character pattern reusable).

**Image + prompt merge:** Entry path exists; merge UI **not** implemented for prop.

**Readiness:** `studio-prop-readiness.ts` + `StudioAssetSummaryReadinessPanel`.

**Canonical references:** Reference-first layout on create; full canonical history UI **not** ported from character.

**Payload:** `studioPropFormToCreatePayload()` persists `appearanceMemory`, `brandingRules`, `continuityNotes`, `worldProfileId`.

---

## Location Parity

**Create flow:** `/studio/locations/new` — same wizard + form pattern as prop.

**Edit flow:** `/studio/locations/[id]/edit` — identity patch via `studioLocationFormToCreatePayload()`.

**Builder (create route):** `studio-location-identity-fields.ts` — type, style, architecture, mood, lighting, color, forbidden, usage, world.

**Prompt prefill:** Universal heuristic prefill for location keywords.

**Image prefill / merge:** Upload + assign message; no vision analyze or conflict merge yet.

**Readiness:** `studio-location-readiness.ts` — six domains (no voice).

**Canonical references:** Official reference card at top; no history CRUD UI.

**Payload:** `environmentKeywords`, `visualIdentity`, `worldMemory`, `continuityNotes`, `worldProfileId` on create.

---

## World Parity

**Create flow:** `/studio/worlds/new` — wizard + `StudioWorldProfileForm` with `WorldIdentityFormValues`.

**Edit flow:** `/studio/worlds/[id]/edit` — `studioWorldFormToCreatePayload()` maps to `visualStyle`, `tone`, `continuityRules`.

**Builder (create route):** Genre (`worldType`), visual style, mood, lighting, color, brand rules, forbidden, usage.

**Prompt prefill:** Heuristic cyberpunk/market/universe detection.

**Image prefill:** N/A — worlds are text-first in schema (readiness reflects this).

**Readiness:** `studio-world-readiness.ts` — references domain shows informational warning.

**Canonical references:** N/A for worlds (no `referenceImageUrl` field).

---

## Universal Wizard

### New components

| Component | Role |
|-----------|------|
| `StudioAssetCreationWizard` | 4-step flow: kind → entry → proposal → builder handoff |
| `StudioAssetCreationPage` | Wizard vs classic shell, skip preference, “Begeleide aanmaak” reopen |
| `StudioAssetCreateEntryChoice` | Shared 5-option entry UX |
| `StudioAssetPromptPrefillStep` | Prompt → proposal → user confirm |
| `StudioAssetPrefillReviewCard` | “Studio stelt dit voor” review |
| `StudioAssetSummaryReadinessPanel` | Completeness score + domains |

### Supporting libs / types

- `src/types/studio-asset-creation.ts`
- `src/lib/studio-asset-creation-preference.ts` (localStorage skip)
- `src/lib/studio-asset-prompt-prefill.ts` (all 4 kinds, heuristic)

### Invocation points (wired)

| Entry | Status |
|-------|--------|
| `/studio/characters/new` | ✅ Wizard + `?guided=1` |
| `/studio/props/new` | ✅ |
| `/studio/locations/new` | ✅ |
| `/studio/worlds/new` | ✅ |
| Workspace create sheet | ⏳ Not wired |
| Production Brief build-new | ⏳ Uses legacy prefill storage only |
| Story Architect / Director proposals | ⏳ No deep-link to wizard |

Wizard is dismissible (`onSkipToClassic`); classic editor always available via skip or post-wizard handoff.

---

## Prompt Prefill

**All asset kinds** via `buildAssetPromptPrefillProposal()`:

- Heuristic keyword matching against existing preset catalogs (no new LLM provider).
- User confirms before apply (`StudioAssetPrefillReviewCard` / `StudioAssetPromptPrefillStep`).
- No auto-save.

**Character** additionally retains dedicated `studio-character-identity-prompt-prefill.ts` for richer mascot/chef detection.

---

## Image Prefill

| Kind | Status |
|------|--------|
| Character | ✅ Full analyze + confirm (`StudioCharacterImagePrefillPanel`) |
| Prop | ⏳ Upload only; no vision analyze step |
| Location | ⏳ Upload only |
| World | N/A (text-first) |

Reuse path: character image analyze route + `studio-character-image-prefill` pattern — not duplicated in this sprint.

---

## Image + Prompt Merge

| Kind | Status |
|------|--------|
| Character | ✅ Conflict UI in character form |
| Prop / Location / World | Entry path `image_and_prompt` in wizard; merge/conflict UI **not** built |

Wizard routes `image_and_prompt` to proposal step for prompt half only.

---

## Canonical References

| Kind | Reference-first UX | History / supporting | Generate & assign |
|------|-------------------|----------------------|-------------------|
| Character | ✅ | ✅ Read UI | ✅ |
| Prop | ✅ Create form | ⏳ | ✅ Auto-assign message on upload |
| Location | ✅ Create form | ⏳ | ✅ Auto-assign message |
| World | N/A | N/A | N/A |

---

## Readiness

Shared panel: `StudioAssetSummaryReadinessPanel` with i18n `studio.assetReadiness.*`.

| Module | Domains |
|--------|---------|
| `studio-character-readiness.ts` | identity, visualStyle, references, world, **voice**, usage, continuity |
| `studio-prop-readiness.ts` | identity, visualStyle, references, world, usage, continuity |
| `studio-location-readiness.ts` | same as prop |
| `studio-world-readiness.ts` | identity, visualStyle, references (info), usage, continuity |

Scoring uses field checklists (not `toIdentitySpec()` on drafts) to avoid engine crashes on incomplete forms.

---

## Consumption Verification

Identity metadata reaches downstream systems via existing `toIdentitySpec()` and memory fields:

| Consumer | Character | Prop | Location | World |
|----------|-----------|------|----------|-------|
| Story Architect | ✅ | ✅ | ✅ | ✅ |
| AI Director | ✅ | ✅ | ✅ | ✅ |
| Production Planner | ✅ | ✅ | ✅ | ✅ |
| Scene Planner | ✅ | ✅ | ✅ | ✅ |
| Asset Decisions | ✅ | ✅ | ✅ | ✅ |
| Motion Handoff | ✅ | ✅ | ✅ | ✅ |
| Project Memory | ✅ | ✅ | ✅ | ✅ |
| Consistency / render | ✅ | ✅ partial | ✅ | ✅ |

**Create-route improvement:** Prop and location create now persist structured identity fields (`environmentKeywords`, `appearanceMemory`, `continuityNotes`, etc.) that were previously only set in workspace builders.

---

## Continuity Verification

- **World link:** Prop/location create forms expose `worldProfileId` selector.
- **Forbidden elements:** Stored in continuity notes (location/prop) or brand rules (world).
- **Usage context:** Captured on all create forms.
- **Continuity strength:** World create retains `StudioContinuityStrengthSelect`.

Workspace identity builders remain the authoritative edit surface for advanced continuity (shots, render strategies, linked characters).

---

## Remaining Gaps

1. Image prefill analyze for prop/location (reuse character pipeline).
2. Image + prompt merge conflict UI for non-character kinds.
3. Canonical reference history CRUD for prop/location.
4. Wizard entry from workspace create sheet, library “+” buttons with `?guided=1`, director deep-links.
5. `existing_asset` entry path — stub (no clone-from-asset flow).
6. Full builder parity on **edit** routes (workspace builders still richer than `/new` forms).
7. Location/world preset i18n keys for type/style options (workspace uses same pattern; keys may show raw ids where missing).

---

## Wat NIET opnieuw gebouwd moest worden

- ✅ No new AI providers or image generators
- ✅ No schema migrations
- ✅ No parallel asset systems or new asset types
- ✅ Reused: `studio-*-identity-fields.ts`, identity spec engine, workspace builders, character prefill/analyze patterns, `studio-identity-builder-prefill-storage.ts`, existing create APIs
- ✅ Reused: `postWizardImageUpload`, memory validation, continuity strength, world/location/prop categories

---

## Implementation Inventory

### New files

```
src/types/studio-asset-creation.ts
src/lib/studio-asset-creation-preference.ts
src/lib/studio-asset-prompt-prefill.ts
src/lib/studio-prop-readiness.ts
src/lib/studio-location-readiness.ts
src/lib/studio-world-readiness.ts
src/lib/studio-asset-creation-parity.test.ts
src/components/studio/studio-asset-create-entry-choice.tsx
src/components/studio/studio-asset-prefill-review-card.tsx
src/components/studio/studio-asset-summary-readiness-panel.tsx
src/components/studio/studio-asset-prompt-prefill-step.tsx
src/components/studio/studio-asset-creation-wizard.tsx
src/components/studio/studio-asset-creation-page.tsx
docs/asset-creation-parity-sprint-report.md
```

### Modified files (high signal)

```
src/components/studio/studio-character-form.tsx
src/components/studio/studio-prop-form.tsx
src/components/studio/studio-location-form.tsx
src/components/studio/studio-world-profile-form.tsx
src/app/studio/characters/new/page.tsx
src/app/studio/props/new/page.tsx
src/app/studio/locations/new/page.tsx
src/app/studio/worlds/new/page.tsx
src/app/studio/locations/[id]/edit/page.tsx
src/app/studio/worlds/[id]/edit/page.tsx
src/i18n/locales/en.ts
src/i18n/locales/nl.ts
package.json (test script entry)
```

### Reused components (not duplicated)

- `StudioCharacterForm`, `StudioCharacterPromptPrefillPanel`, `StudioCharacterImagePrefillPanel`
- `studio-workspace-*-identity-builder.tsx` (workspace)
- `studio-identity-builder-prefill-storage.ts` / `prefill-detail.ts`
- `StudioContinuityStrengthSelect`, `AppCard`, `StudioAuthGate`
- Category badges, image preprocess + upload clients

### Routes

| Route | Change |
|-------|--------|
| `/studio/characters/new` | Wizard shell |
| `/studio/props/new` | Wizard + parity form |
| `/studio/locations/new` | Wizard + parity form |
| `/studio/worlds/new` | Wizard + parity form |
| `/studio/*/new?guided=1` | Force wizard |

### Builders

| Surface | Scope |
|---------|-------|
| Create forms | Prop, location, world identity fields + readiness |
| Workspace builders | Unchanged — still full builder UX |
| Wizard | Thin orchestration only |

### Consumption paths (unchanged architecture)

`toIdentitySpec()` → director, scene composition, production planner, asset decisions, memory snapshots, render readiness checks.

Create forms now populate the same memory fields workspace builders use, closing the create-route gap.

---

## Validation Summary

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ 0 errors (180 pre-existing warnings) |
| `npm run build` | ✅ Pass |
| `npm run test` | ✅ **2012/2012** |
