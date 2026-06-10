# Editor UX Cleanup Report

## Editor Visibility Audit

| Item | Visibility | Rationale |
|------|------------|-----------|
| Layer labels & selection | KEEP | Core interaction |
| Transform handles | KEEP | Live canvas update |
| Contextual actions | KEEP | Working operations only |
| Body sliders | KEEP | Live preview |
| Selection tools (human labels) | KEEP | Cutout workflows |
| Confidence / fingerprint | ADVANCED ONLY / HIDE | No direct user action |
| Polygon / mask URLs | ADVANCED ONLY | Internal geometry |
| Hierarchy tree | ADVANCED ONLY | Part debugging |
| Composition graph | ADVANCED ONLY | Developer preview |
| SAM2 provider status | ADVANCED ONLY | Diagnostics |
| Face / eyes sub-parts | HIDE | Collapsed into Personage |

## Human First Object Tree

Default object list uses: **Personage**, **Wereldbol**, **Logo**, **Tekst**, **Achtergrond**, **Object**. Technical sub-parts (Face, Round Face, Large Eyes, etc.) are filtered out. Visual mode shows chip picker; advanced sidebar uses the same human-first tree unless AI analysis is enabled.

## Hidden Technical Information

Hidden by default: confidence, fingerprint, polygon metadata, mask URLs, hierarchy nesting, semantic record, source provider, identity relevance, selection mode, estimated badges, composition graph.

## Contextual Actions

Actions are filtered per object type. Character: edit, replace, remove. Logo: replace, move, resize, remove. Background: replace, cleanup, remove. Placeholder actions (change clothing, expression, pose) are removed from default UI.

## Live Edit Rule

Only controls with `works_live` or `partially_works` readiness appear. Transform sliders and body sliders update the canvas immediately and support undo.

## Edit Readiness Audit

| Control | Readiness |
|---------|-----------|
| Transform X/Y/scale/rotation | Works Live |
| Body sliders | Works Live |
| Remove / replace | Partially Works |
| Change clothing / expression | Placeholder (hidden) |
| Confidence / polygon / fingerprint | No Effect (hidden) |

## Advanced AI Analysis Mode

Admin-only **Show AI analysis** toggle reveals confidence, masks, polygons, hierarchy, provider status, and composition graph preview.

## Properties Redesign

Properties panel shows **Name**, **Type**, **Status** — no AI terminology. Technical block appears only when AI analysis is enabled.

## UX Goal

Upload → click object → edit → see result. No metadata guessing.

## Tests / Build Status

See `src/lib/editor-ux-cleanup.test.ts`.
