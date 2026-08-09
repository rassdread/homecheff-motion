# Studio Consumer Journey (S.6G)

**Status:** Implemented for P0 Experience Packs  
**Funnel route:** `/studio/experience`

---

## Journey

```
Choose what I want
  → Answer simple questions
  → Studio understands creative goal (Creative Director)
  → ContinuityBundle
  → Prompt Matrix
  → Provider Transform
  → GenerationJob
  → Result
```

Hidden from the user: ContinuityBundle, Prompt Matrix, Fusion internals, providers, GenerationJobs, transforms.

---

## P0 packs

| Pack | Entry examples | After questions |
|------|----------------|-----------------|
| Restaurant | `intent=restaurant_promo` | `/studio/start?fromExperience=1` |
| HomeCheff | `food_promo` / Instant style | `/animate/instant?fromExperience=1` |
| LinkedIn | experience chooser | Instant `clean_business` |
| Animation | Maak photos, photoIntent | Instant |
| Outfit | CS `flow=outfit`, Fusion | CS prepare `fromExperience=1` |

---

## Upgrades

| From → To | Behavior |
|-----------|----------|
| Quick → Professional | Same funnel, `mode=professional`, answers preserved in session |
| Quick → Director | `/studio?experience=…&tool=creativeDirector` — Adaptive Workspace |

Session key: `hc.studio.s6g.experience.v1` (answers + matrix id + continuity strategy — no private URLs).

---

## Related

- `docs/architecture/studio-experience-packs.md`
- `docs/architecture/studio-guided-questions.md`
- `src/lib/studio-creative-director/consumer-entry.ts`
