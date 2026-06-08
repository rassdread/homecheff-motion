# Universal Asset Wizard Step-by-Step Fix Report

## Root cause

The Universal Asset Wizard was a thin overlay: after step 1 (entry choice), `StudioAssetCreationWizard.handleEntrySelect` called `onComplete()` for non-prompt paths. `StudioAssetCreationPage` set `wizardDone=true` and unmounted the wizard, handing off to the full create/edit form.

Steps named `builder`, `readiness`, and `save` existed in types and i18n but were not wired as real wizard steps. The long builder was the default continuation instead of advanced mode.

## Wizard flow

Guided creation (`?guided=1`) now runs a true step machine until save or explicit exit:

| Step | Purpose |
|------|---------|
| 1 — Kind | Character / Prop / Location / World (skipped when route is kind-locked) |
| 2 — Entry | Vanaf nul / Alleen omschrijving / Afbeelding / Afbeelding + omschrijving / Bestaand asset |
| 3 — Input | Description and/or image upload inside the wizard |
| 4 — Proposal | Prefill / analyse / merge result with Gebruik voorstel / Aanpassen / Terug |
| 5 — Essentials | Kind-specific simple choices only (not the full builder) |
| 6 — Review | Summary: name, type, style, reference, readiness, missing steps |
| 7 — Save | Create asset; redirect to detail/edit only after successful save |

Entry-path step sequences (`wizardStepsForEntryPath`):

- **design**: entry → essentials → readiness → save
- **prompt_only / image_only / image_and_prompt**: entry → input → proposal → essentials → readiness → save
- **existing_asset**: entry → input → essentials → readiness → save

Key files:

- `src/lib/studio-asset-wizard-flow.ts` — step sequences and navigation
- `src/lib/studio-asset-wizard-draft.ts` — draft state and draft → form conversion
- `src/components/studio/studio-asset-wizard-steps.tsx` — input, proposal, essentials, review UI
- `src/components/studio/studio-asset-creation-wizard.tsx` — step machine, Back/Next/Save
- `src/components/studio/studio-asset-creation-page.tsx` — keeps wizard mounted until save or advanced/skip

## Advanced mode

The long builder appears only when the user explicitly chooses:

- **Geavanceerd bewerken** — `onAdvancedEdit` sets `advancedMode=true`, passes `wizardDraft` to the form
- **Wizard sluiten / Handmatig bouwen** — `onSkipToClassic` same as advanced
- **Remember skip** — persists preference via `writeSkipAssetCreationWizard`

Wizard → advanced handoff preserves data via `*FormValuesFromWizardDraft` helpers on all four asset forms.

## Asset-specific steps

**Character essentials**: type (role), style, personality, world, voice profile, reference image

**Prop essentials**: category, type, style, material, color, usage, reference

**Location essentials**: type, mood, architecture, period/style, lighting, reference

**World essentials**: genre (world type), mood, rules (brand rules), style, color theme

Review step uses existing readiness engines per kind (`buildCharacterReadinessView`, etc.).

## Tests/build status

- **Lint**: pass (0 errors)
- **Build**: pass
- **Full suite**: 2101/2101 pass
- **Wizard tests**: `src/lib/studio-asset-wizard-flow.test.ts` — 8/8 (step sequences, review before save, draft → form conversion)
- **Routes wired**: `/studio/characters/new?guided=1`, `/studio/props/new?guided=1`, `/studio/locations/new?guided=1`, `/studio/worlds/new?guided=1`
- No new AI provider, builder, schema migrations, or asset types
