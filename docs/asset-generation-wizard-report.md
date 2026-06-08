# Asset Generation Wizard Report

## Root cause

The prior wizard was **A. a guided form** — technically step-by-step, but each step used `<select>`/text inputs (essentials), optional legacy entry paths (prompt/image), and no live creation summary. It did not feel like “help me make something” through **concrete choices**.

Asset **reference image generation does not exist** in the codebase (only scene image generation via `generateStudioSceneImage`). Upload + heuristic/vision prefill exists; no safe asset-reference generation route.

## Difference from previous wizard

| Before | Now (`?guided=1` choice-based flow) |
|--------|-------------------------------------|
| Entry path cards → form essentials | Kind-locked routes skip entry; chip choices per asset |
| Dropdowns + free text | Large touch-friendly **chip grids** |
| No live summary | **Live summary prompt** updates after each choice |
| Reference only in input step | Dedicated **reference step**: upload / generate (disabled) / skip |
| Review = minimal fields | Review = name edit, summary, reference preview, readiness |
| Builder after step 1 possible | Builder only via **Geavanceerd bewerken** / skip |

Legacy entry-path flow (prompt/image merge) remains for non-guided wizard preference.

## Character flow

7 choice steps → reference → review → save:

1. Type (Chef, Garden, Designer, Mascot, …)
2. Style (Cartoon, 3D, Cinematic, …)
3. Shape & energy
4. Personality
5. Outfit
6. World preset
7. Voice (recommended / persona / my voice [advanced] / skip)

## Prop flow

5 choices → reference → review → save:

Category → Style → Material → Color → Usage

## Location flow

4 choices → reference → review → save:

Type → Mood → Architecture → Time & light

## World flow

4 choices → review → save (no reference step):

Genre → Rules → Colors → Mood

## Generate image path

**Disabled (“Binnenkort”)** — no existing asset-reference generation API. Chip is visible but not selectable; hint explains upload is available now. Scene image generation is unrelated (downstream consumption only).

## Upload path

`StudioWizardReferenceStep` → preprocess → `postWizardImageUpload` → sets `referenceImageUrl` + `referenceStorageKey` on draft. Preview + “official reference assigned” message.

## Reference assignment

On upload accept: draft fields updated; `canSaveWizardDraft` requires URL + storage key for character/prop/location. Skip allowed through wizard but **save blocked** with message (API validation requires reference). World saves without reference.

## Review step

Editable name, live summary, reference status/preview, readiness panels (character vs prop/location/world). Back navigates to any prior step via `navIndex`.

## Mobile UX

- `min-h-[48px]` / `min-h-[56px]` buttons
- 2-column chip grid (3 on `sm+`)
- Full-width primary actions on small screens
- No dropdowns in choice flow

## Tests/build status

- **Lint**: pass (0 errors)
- **Build**: pass
- **Full suite**: 2102/2102 pass
- **Wizard tests**: `studio-asset-wizard-flow.test.ts` — 9/9 (choice sequences, summary, reference guards, field mapping)
- **Key files**: `studio-asset-wizard-choices.ts`, `studio-asset-wizard-summary-prompt.ts`, `studio-wizard-choice-grid.tsx`, `studio-wizard-reference-step.tsx`, `studio-asset-wizard-choice-step.tsx`
