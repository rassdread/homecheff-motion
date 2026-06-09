# Editor Phase 5 — Review Before Save + Library Persist Foundation

**Status:** Complete  
**Commit message:** Add Editor Review Before Save with Library persist foundation

## Summary

Review step appears before Library save. Shows preview, identity/placement scores, semantic layer summary, body designer summary, warnings, and save actions. Server route foundation at `POST /api/editor/save` with documented localStorage fallback.

## Flow

Generate/Edit → **Review** → Manual fix (continue editing) → Approve → Save

## Save actions

- Save as official reference
- Save as draft
- Save as new asset
- Save edited copy (preserves `sourceAssetId`, does not overwrite original)
- Save as canonical character base
- Save as animation-ready character
- Download preview
- Continue editing / Discard

## Persist

- `bodyDesignerProfile`, `compositionGraph`, `referencePlacements`, `semanticLayers` in save payload + server semantic marker
- Local fallback: `hc-editor-library-saved-v1` in localStorage

## Key files

| File | Role |
|------|------|
| `src/lib/editor-review.ts` | Review summary builder |
| `src/lib/editor-library-persist.ts` | Client persist + fallback |
| `src/app/api/editor/save/route.ts` | Server foundation |
| `src/components/editor/editor-review-panel.tsx` | Review UI |
| `src/lib/editor-review.test.ts` | Phase 5 tests |

## Gaps

- Full Studio asset registry write (uses foundation marker only)
- Server-side semantic record blob merge (future sprint)
