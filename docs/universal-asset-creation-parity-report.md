# Universal Asset Creation Parity Report

Report date: 2026-06-06  
Validation: no new AI provider, no new image generator, no schema migrations, no parallel builders.  
Quality gate: lint 0 errors · build pass · **2031/2031** tests pass.

---

## Audit

| Asset | Create route | Wizard | Builder on route | Edit route identity |
|-------|--------------|--------|------------------|---------------------|
| **Character** | `/studio/characters/new` | ✅ `StudioAssetCreationWizard` | `StudioCharacterIdentityBuilder` (full) | ✅ Full |
| **Prop** | `/studio/props/new` | ✅ | Inline `PropIdentityFormValues` | ✅ **Fixed** — full identity patch |
| **Location** | `/studio/locations/new` | ✅ | Inline `LocationIdentityFormValues` | ✅ Full |
| **World** | `/studio/worlds/new` | ✅ | Inline `WorldIdentityFormValues` | ✅ Full |

**Legacy surfaces still in use:**
- Workspace asset create sheet (minimal, no wizard)
- Character form uses legacy `CharacterCreateEntryChoice` (4 paths) instead of universal 5-path component

**Create routes using old sheets:** None on `/studio/*/new` — all use `StudioAssetCreationPage`.

---

## Character Comparison (reference — 8/10)

| Capability | Status |
|------------|--------|
| Wizard | ✅ |
| Prompt prefill | ✅ Rich heuristic + dedicated panel |
| Image prefill | ✅ Vision API analyze |
| Prompt + image merge | ✅ Conflict UI |
| Readiness | ✅ 7 domains incl. voice |
| Canonical references | ✅ Full CRUD in notes |
| AI suggestions | ✅ Workspace + director |
| Voice marketplace | ✅ Character-only |

---

## Prop Comparison (7/10 → **7.5/10**)

| Capability | Before sprint | After |
|------------|---------------|-------|
| Wizard | ✅ | ✅ + flow progress |
| Prompt prefill | ✅ | ✅ via `buildAssetIdentityPrefillFromPrompt` |
| Image prefill | Upload only | ✅ Filename heuristic + `StudioAssetImagePrefillHint` |
| Merge | ❌ | ✅ `StudioAssetPrefillMergeStep` for `image_and_prompt` |
| Readiness | ✅ | ✅ + flow step label |
| Canonical refs | Reference-first | ✅ `studio-asset-canonical-references.ts` (notes bundle) |
| Edit identity | ❌ basic only | ✅ **Full patch via `studioPropFormToCreatePayload`** |
| AI suggestions | Workspace only | Workspace only (libs exist) |

---

## Location Comparison (7/10 → **7.5/10**)

Same parity layer as prop: image prefill hint, merge step, shared prefill engine, flow progress, `?guided=1` library links.

---

## World Comparison (6/10)

| Capability | Status |
|------------|--------|
| Wizard + prompt prefill | ✅ |
| Image prefill | N/A (text-first schema) |
| Readiness | ✅ Informational refs domain |
| Merge | N/A |

---

## Missing Systems (remaining gaps)

1. Vision image analyze API for prop/location (character pattern reusable)
2. AI identity suggestions on create routes (workspace libs exist)
3. Rich decision prefill for non-character kinds (stubs today)
4. `existing_asset` clone-from-library flow
5. Full canonical reference CRUD UI for prop/location (bundle lib added; UI pending)
6. Unify character entry choice with `StudioAssetCreateEntryChoice`
7. Workspace create sheet → wizard entry

---

## Reused Systems

| System | Module / component |
|--------|-------------------|
| Universal wizard shell | `studio-asset-creation-page.tsx`, `studio-asset-creation-wizard.tsx` |
| Shared prefill engine | **`studio-asset-identity-prefill.ts`** |
| Prompt adapters | `studio-asset-prompt-prefill.ts` (delegates to engine) |
| Entry choice | `studio-asset-create-entry-choice.tsx` |
| Readiness | `studio-*-readiness.ts` + `studio-asset-summary-readiness-panel.tsx` |
| Flow progress | **`studio-asset-creation-flow-progress.tsx`** |
| Image prefill hint | **`studio-asset-image-prefill-hint.tsx`** |
| Merge UI | **`studio-asset-prefill-merge-step.tsx`** |
| Canonical refs (prop/location) | **`studio-asset-canonical-references.ts`** |
| Character voice / vision | Character-only (unchanged) |

---

## Universal Wizard Architecture

```
StudioAssetCreationPage
  ├─ StudioAssetCreationWizard (optional)
  │    ├─ kind
  │    ├─ entry (5 paths)
  │    └─ proposal (prompt analyze)
  └─ Kind form (builder phase)
       ├─ StudioAssetCreationFlowProgress
       ├─ Readiness panel
       ├─ References (official image)
       ├─ Prompt / image / merge steps
       ├─ Identity fields
       └─ Save
```

**Shared prefill API:**
- `buildAssetIdentityPrefillFromPrompt()`
- `buildAssetIdentityPrefillFromImages()`
- `mergeAssetIdentityPrefills()`

---

## Readiness Integration

All four kinds expose **Needs Attention / Ready / Excellent** via domain scoring:
- Character: 7 domains (incl. voice)
- Prop / Location: 6 domains
- World: 6 domains (refs informational)

---

## Canonical Reference Integration

- **Character:** `studio-character-canonical-references.ts` (production)
- **Prop / Location:** `studio-asset-canonical-references.ts` — same bundle pattern in `continuityNotes`, UI wiring next

---

## Final Parity Matrix

| Feature | Character | Prop | Location | World |
|---------|:---------:|:----:|:--------:|:-----:|
| Wizard | ✅ | ✅ | ✅ | ✅ |
| Shared prefill engine | ✅ | ✅ | ✅ | ✅ |
| Prompt prefill | ✅✅ | ✅ | ✅ | ✅ |
| Image prefill | ✅✅ vision | ✅ heuristic | ✅ heuristic | — |
| Merge UI | ✅✅ | ✅ | ✅ | — |
| Readiness | ✅✅ | ✅ | ✅ | ✅ |
| Canonical refs | ✅✅ | ⏳ lib | ⏳ lib | — |
| Edit identity full | ✅ | ✅ | ✅ | ✅ |
| Voice | ✅ | — | — | — |
| `?guided=1` links | ✅ | ✅ | ✅ | ✅ |

**Maturity:** Character 8 · Prop 7.5 · Location 7.5 · World 6

---

## What NOT to rebuild

- ElevenLabs / image providers
- Separate prop/location/world wizards
- Parallel identity field systems
- New Prisma tables for references or readiness
