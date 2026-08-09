# S.6G — Prompt Coverage Audit (Experience Packs)

Builds on S.6E (`docs/audits/studio-s6e-prompt-matrix.md`). Prompt Matrix remains authoritative.

---

## Coverage model

```
Experience Pack (S.6F)
  → matrixExperienceId
  → assembleCreativeSpecification (selections from Director)
  → Provider Transform
```

Packs must never assemble provider prompts themselves.

---

## Pack → Matrix mapping quality

| Mapping quality | Packs | Risk |
|-----------------|------:|------|
| Dedicated Matrix engine | Restaurant, Cooking, HomeCheff/Food, Fashion, Outfit, Character fusion, Person background, Product branding, Instant I2V, Motion handoff, Motion preset | Best |
| Shared generic engine | Many PEOPLE → `PERSON_BACKGROUND`; many CREATIVE/SOCIAL video → `VIDEO_INTENT` / `SOCIAL_CAMPAIGN` | Differentiation depends on selections + coach |
| LEGACY_UNMAPPED | Dating, Pregnancy, Christmas, Memorial, Real Estate | No Matrix coverage |
| EXPERIMENTAL | Celebrity, Baby (via fusion experimental), Future Child | Honest experimental |

---

## Matrix compliance reminder (S.6E)

| Compliance | Count |
|------------|------:|
| MATRIX_NATIVE | 0 |
| MATRIX_WRAPPED | 9 |
| MATRIX_PARTIAL | 10 |
| LEGACY_UNMIGRATED | 4 |
| EXPERIMENTAL | 1 |

S.6G must not claim MATRIX_NATIVE for packs that only share PARTIAL/WRAPPED engines.

---

## Prompt coverage by family (score 0–5)

| Family | Score | Notes |
|--------|------:|-------|
| BUSINESS food/restaurant | 4 | Dedicated Matrix IDs |
| IDENTITY fusion/outfit | 4 | WRAPPED Matrix paths |
| SOCIAL | 3 | Mostly `SOCIAL_CAMPAIGN` |
| CREATIVE video intents | 3 | `VIDEO_INTENT` PARTIAL |
| PEOPLE portraits | 2 | Share `PERSON_BACKGROUND`; LinkedIn not a portrait engine |
| MISSING packs | 0 | Unmapped |
| Voice/Audio/Publish | 1 | ENGINE_ONLY / LEGACY |

**Weighted pack prompt coverage (51 packs): ~2.7 / 5** — architecture OK; consumer differentiation incomplete.

---

## Non-goals

- Do not rewrite Prompt Matrix in S.6G.
- Do not add per-pack prompt templates outside Matrix.
- Improve coverage via better `MatrixUserSelections` from Director answers + Continuity links.
