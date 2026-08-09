# Studio Creative Director — Adaptive Presentation (S.6H)

**Status:** LIVE  
**Layer:** Presentation only  
**Does not own:** Continuity, Prompt Matrix, Creative Director orchestration, Provider Transform, GenerationJobs, Credits, Billing

## Product law

```
Adaptive Workspace only determines presentation.
Never functionality.
Mode ≠ Presentation.
```

## Presentation modes

| Mode | Typical viewport | Globe | Orbit | Cards |
|------|------------------|-------|-------|-------|
| `IMMERSIVE_DESKTOP` | ≥1024 desktop | Yes | Yes (rich) | Yes |
| `COMPACT_TABLET` | 768–1023 | Yes (smaller) | Fewer nodes | Yes |
| `COMPACT_MOBILE` | Mobile landscape wide | **No** | No | Yes (dense) |
| `MINIMAL_MOBILE` | Mobile portrait / narrow | **No** | No | Yes (primary) |

Product modes `QUICK` / `PROFESSIONAL` / `DIRECTOR` remain unchanged on every device.

## Code map

| Module | Role |
|--------|------|
| `src/lib/studio-director-presentation.ts` | Resolver + gates |
| `src/hooks/use-studio-director-presentation.ts` | Live viewport plan |
| `src/components/studio/director-presentation/*` | Adaptive layer, globe, cards |
| Wired into | CD workspace panel + `/studio/experience` pack chooser |

## Future

All future Studio capabilities inherit this Adaptive Presentation Layer — no separate desktop/mobile product implementations.
