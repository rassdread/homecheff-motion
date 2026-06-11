# Editor Pivot — Image Instruction Studio Report

## New Editor Product Definition

**Image Instruction Studio** replaces the Photoshop/Canva-style live canvas editor.

**Core flow:** Analyze → Guide → Generate Variant

1. Upload or choose an image (Library picker unchanged)
2. AI analyzes the image (existing vision/detection bootstrap)
3. UI shows what AI sees: people/mascots/objects, background, text/logo, style
4. User chooses change via dropdowns, sliders, prompt, suggested actions
5. System builds a clean generation prompt (`editor-instruction-prompt-builder.ts`)
6. AI generates a new image variant (`/api/editor/instruction/variant`)
7. Save variant to Library / hand off to Studio / Motion

**Principle:** instruction-first edits; original `backgroundUrl` is never mutated in-place.

---

## Keep Remove Archive Matrix

| Area | KEEP | ARCHIVE | REMOVE | ADMIN |
|------|------|---------|--------|-------|
| Upload / library picker | ✓ | | | |
| Vision / asset intelligence | ✓ | | | |
| Instruction prompt + variant API | ✓ (new) | | | |
| Version history (variants on document) | ✓ (new) | | | |
| Export / save draft | ✓ | | | |
| Studio/Motion handoff buttons | ✓ | | | |
| Live hit-testing / SAM2 / lasso | | ✓ | | |
| Transform handles / move-resize | | ✓ | | |
| Click-segment / mask gate | | ✓ | | |
| Compositor / placement / poster kits | | ✓ | | |
| Motion preview / GIF export panels | | | ✓ | |
| Click trace / selection QA | | | | ✓ |

---

## New UI Structure

**Route:** `/editor` (unchanged)

**Visual mode (default):** `instruction_studio` workspace

- **Left/main:** original preview + active variant compare
- **Right:** `EditorInstructionStudioPanel` — Wat zie ik? / Wat wil je aanpassen? / sliders / prompt / Maak variant
- **Bottom actions:** Opslaan, Naar Studio, Naar Motion

**Advanced mode (legacy):** photo_edit / compose / quick_motion / export tabs for admin/power users.

---

## Selection Replacement Flow

**Before:** Click globe → segment mask → green contour → masked edit

**After:**

1. AI lists: Character, Globe, Background, …
2. User selects Object: Globe, Action: Replace, Replacement: cooking pan
3. Prompt builder composes constrained instruction
4. **Maak variant** → OpenAI image edit with reference (no pixel click)

---

## Prompt Builder

Module: `src/lib/editor-instruction-prompt-builder.ts`

Inputs: object, action, replacement, sliders (style/brand/strength/creativity), custom prompt, preserve character.

Example output for globe → cooking pan replace with high brand preservation.

---

## Variant Generation

- **API:** `POST /api/editor/instruction/variant`
- **Server:** `editor-instruction-variant-service.ts` (OpenAI edits, blob storage)
- **Client:** `editor-instruction-variant-client.ts`
- Returns: `resultUrl`, `storageKey`, `provider`, `model`, `costEstimateUsd`, `versionNote`

---

## Version Model

Type: `EditorInstructionVariant` on `EditorCanvasDocument.instructionVariants`

Stores: source image, result URL, instruction, prompt, provider, status, timestamps, optional user note.

Helpers: `editor-instruction-version.ts` — append, patch, set active, original-not-mutated guard.

---

## UI Honesty Cleanup

- Hidden UX actions: move, resize, refine_selection, cutout, animate (`editor-broken-features.ts`)
- Instruction studio uses `previewOnly` canvas — no click-to-segment
- Live selection tools only in legacy `photo_edit` / `compose` advanced modes
- Start screen copy updated to instruction studio (NL + EN)

---

## Repo Cleanup Plan

### Kept (pivot spine)

- `editor-instruction-*.ts`, `editor-instruction-studio-panel.tsx`
- `editor-canvas-session`, projects API, detect API, save/export
- Vision summary, asset intelligence, library upload

### Safe to archive later (not deleted in this pass)

- `editor-precise-select-overlay.tsx`, `editor-refine-lasso-overlay.tsx`
- `editor-segment-click-*`, SAM2/rembg provider chain
- Compositor/placement/motion-prep panels
- ~35 audit/e2e sentinel tests

### Docs marked obsolete

- Prior segmentation-platform audits (see `docs/segmentation-platform-audit.md`) — superseded by instruction flow

---

## I18N

New namespace: `editor.instructionStudio.*` — full NL/EN parity in `nl.ts` and `en.ts`.

Updated: `editor.start.title`, `editor.start.lead`, `editor.modeAlreadyActive.instructionStudio`.

---

## Routing And Migration

- `/editor` unchanged; default `workspaceMode` → `instruction_studio`
- Legacy sessions (placements, compose, photo_edit mode) → read-only banner in instruction studio
- Advanced mode retains legacy canvas tools for existing projects
- Library / Studio / Motion entry points unchanged

---

## Tests / Build Status

See CI output after `npm run lint`, `npm run build`, `npm run test`.

New: `src/lib/editor-instruction-studio.test.ts` — objects, prompt builder, variant immutability, legacy detection, hidden live tools.
