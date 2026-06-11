# Personalized Editor Recommendations Report

**Date:** 2026-06-11  
**Scope:** Editor examples, suggestions, AI Director placeholders, creator presets, object/style actions, export copy, and asset intelligence summaries.

---

## Goal

No ordinary user should see HomeCheff-specific examples unless:

- they are **admin**
- the project/asset is detected as **HomeCheff-branded**
- the uploaded asset is a **Globe Man / HomeCheff mascot**
- they have **explicit HomeCheff brand assets** loaded

Recommendations should reflect:

- uploaded image analysis (asset type, mascot kind)
- detected objects
- user role/category (chef / garden / designer / generic)
- saved brand references
- current workflow (edit / combine / motion / export)

---

## Audit findings (before fix)

| Surface | HomeCheff-specific content | Risk |
|---------|---------------------------|------|
| Magic placeholders (`editor.uxV7.magic.placeholder*`) | Globe Man, chef mascot | High — shown to all users |
| Command examples (`editor.v7.command.example*`) | HomeCheff branding poster | High |
| AI Director placeholder | Generic (OK) | Low |
| AI Director suggestions | Logo on clothing (generic enough) | Medium |
| AI Director parser | Hardcoded `logo: "HomeCheff"`, style rule | High |
| Style actions | `stronger_homecheff` label + suffix | High |
| Asset intel mascot summary | "HomeCheff mascot" | High |
| Creator presets | Chef/Garden/Designer (vertical, not HomeCheff-named) | Medium — shown to all |
| Composition / prompt builders | Default brand `"HomeCheff"` | High |
| Smart next steps | Generic workflow only | None |
| Export targets | Generic | None |
| Color input placeholder | `#006D52` HomeCheff green | Low |

---

## Implementation

### New modules

| Module | Role |
|--------|------|
| `src/lib/editor-recommendation-context.ts` | Builds `EditorRecommendationContext` — admin flag, HomeCheff detection, user category, brand name, workflow |
| `src/lib/editor-personalized-recommendations.ts` | Resolves placeholders, examples, director copy, creator presets, style actions, asset summaries |

### Gating rule

```text
showHomeCheffExamples =
  isAdmin
  OR isHomeCheffBrandedDocument(document)
  OR resolveMascotExpansionKind(document) === "globe_man"
```

### User category inference

| Category | Signals |
|----------|---------|
| `homecheff` | `showHomeCheffExamples` |
| `chef` | Mascot kind chef, food asset, chef variant group |
| `garden` | Mascot kind garden, plant/garden asset |
| `designer` | Mascot kind designer, product/brand asset |
| `generic` | Default |

### i18n structure

| Key prefix | Audience |
|------------|----------|
| `editor.rec.generic.*` | All neutral users |
| `editor.rec.homecheff.*` | Admin + HomeCheff assets |
| `editor.rec.chef.*` | Food / chef vertical |
| `editor.rec.garden.*` | Garden / eco vertical |
| `editor.rec.designer.*` | Product / apparel vertical |
| `editor.rec.brand.*` | Users with uploaded brand references |

Legacy keys (`editor.uxV7.magic.placeholder*`, `editor.v7.command.example*`) remain for backward compatibility but are **no longer wired** in the command bar.

---

## Surfaces updated

| Component / lib | Change |
|-----------------|--------|
| `editor-command-bar.tsx` | Context-aware magic placeholders + examples |
| `editor-magic-edit-bar.tsx` | Passes document + isAdmin |
| `editor-instruction-ai-director-bar.tsx` | Personalized placeholder + suggestions |
| `editor-instruction-edit-panel.tsx` | Filtered style actions; generic color placeholder |
| `editor-instruction-studio-workspace.tsx` | Filtered creator presets; brand-aware prompts |
| `editor-combine-workspace.tsx` | Brand-aware composition identity |
| `editor-canvas-workspace.tsx` | Magic bar receives document context |
| `editor-instruction-request-parser.ts` | Generic logo default; optional HomeCheff brand |
| `editor-style-actions.ts` | `stronger_brand` (generic) + `stronger_homecheff` (gated) |
| `editor-asset-intelligence.ts` | Personalized mascot summary key |
| `editor-instruction-prompt-builder.ts` | Dynamic preserve-brand line |
| `editor-composition-prompt-builder.ts` | Generic default brand identity |

---

## Validation matrix

| User | Expected examples |
|------|-------------------|
| Generic user + neutral photo | `editor.rec.generic.*` placeholders; no creator presets unless asset type matches |
| Admin | `editor.rec.homecheff.*` placeholders and examples |
| Chef (food asset) | `editor.rec.chef.*`; Chef preset only |
| Garden (garden asset) | `editor.rec.garden.*`; Garden preset only |
| Designer (product asset) | `editor.rec.designer.*`; Designer preset only |
| Globe Man upload (non-admin) | HomeCheff director placeholder + mascot summary |

**Tests:** `src/lib/editor-personalized-recommendations.test.ts` (8 cases)

---

## Remaining notes

- **Product name** "HomeCheff Studio" in workflow chooser lead is intentional platform branding, not an edit example.
- **Mascot expansion** (Globe Man parts, chef apron labels) remains for **detected** mascots — object feed labels are asset-driven, not recommendation copy.
- **V7 intent** (`homecheff branding` trigger) still matches user-typed prompts; it does not surface as a default suggestion.
- **Brand kit defaults** (`defaultHomeCheffBrandKit`) are unchanged — only shown when brand kit panel is opened in advanced mode.

---

## Quality

Run before release:

```bash
npm run lint
npm run build
npm run test
```
