# Studio Prompt Matrix (S.6E)

**Status:** Architecture + initial wiring (scene stills MATRIX_WRAPPED) — Preview certified 2026-08-09  
**Version:** `matrixVersion = 6e.1`  
**Law:** Continuity owns identity → Prompt Matrix assembles → Directors orchestrate → Provider Transform last → Generation executes. Nothing bypasses ContinuityBundle.  
**Compliance honesty:** 0 MATRIX_NATIVE / 9 MATRIX_WRAPPED / 10 MATRIX_PARTIAL / 4 LEGACY / 1 EXPERIMENTAL (24 canonical IDs). Scene T2I pixel conditioning remains PARTIAL.

## Pipeline

```
User Experience → Creative Experience ID → User Selections → Creative Intent
→ ContinuityBundle → Prompt Matrix → CreativeSpecification
→ Existing Directors / Planning Policies → Provider Transform
→ GenerationJob → Runtime Provider → Result → Asset Library / Project
```

## What Matrix does / does not do

| Does | Does not |
|------|----------|
| Assemble ContinuityBundle + selections into CreativeSpecification | Own Character/Location/Prop/World identity |
| Map options to canonical fields | Flatten entities into anonymous strings |
| Require continuity modules when entities are linked | Replace Fusion pixel preservation |
| Feed provider transforms | Put “Vidu requires…” inside modules |
| Track compliance per experience | Claim full migration of ~200 experiences |

## Code

| Concern | Path |
|---------|------|
| Types / versions / capabilities | `src/lib/studio-prompt-matrix/types.ts` |
| Experience IDs | `experience-ids.ts` |
| Registry | `experience-registry.ts` |
| ContinuityBundle | `continuity-bundle.ts` |
| CreativeSpecification | `creative-specification.ts` |
| Assembler | `assemble.ts` |
| Scene still wrap | `scene-still.ts` (+ `studio-prompt-builder-service`) |
| Transforms | `transforms/*` |
| Duration / aspect | `duration-resolution.ts`, `aspect-resolution.ts` |
| Option maps | `option-maps.ts` |
| Brand / Preset overlays | `overlays.ts` |

## Compliance levels

`MATRIX_NATIVE` · `MATRIX_WRAPPED` · `MATRIX_PARTIAL` · `LEGACY_UNMIGRATED` · `EXPERIMENTAL`

Scene stills are **MATRIX_WRAPPED** (builder remains; Matrix wraps). Pixel conditioning for scene T2I remains **PARTIAL** (text + QA).

## Detail levels

`QUICK` | `PROFESSIONAL` | `DIRECTOR` — same CreativeSpecification type; Quick uses more defaults. Identity/continuity identical across modes.

## Related docs

- `studio-creative-specification.md`
- `studio-provider-transforms.md`
- `studio-experience-registry.md`
- `studio-non-negotiables.md` (NN-01…NN-15)
- `docs/audits/studio-s6e-prompt-matrix.md`
