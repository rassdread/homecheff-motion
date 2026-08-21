# Full Studio Product Certification — Scenario Prep (S2E-P1)

Prepared after S2E-P1 audio execution closeout.  
**Do not execute costly providers automatically.** This folder defines scenarios, budgets, and evidence layout for the next certification phase.

## Status

| Item | Status |
|------|--------|
| S2E-P1 ducking/SFX runtime | Closed in code/tests |
| Provider visual certification (S2B.4) | **NOT_RUN** — do not claim closed |
| Full Studio product cert | **PREPARED** — not executed in S2E-P1 |

## Evidence root

```
docs/audits/full-studio-cert/
  README.md                          ← this file
  scenarios.json                     ← machine-readable scenario defs
  scenario-a-red-carpet/
  scenario-b-commercial/
  scenario-c-8-scene-consistency/
  scenario-d-outfit/
  scenario-e-location/
  scenario-f-multi-character/
  scenario-g-homecheff/
  scenario-h-quick-video/
  scenario-i-mobile-advanced/
  scenario-j-returning-project/
  FINAL-REPORT.md                    ← fill after certification run
```

## Provider call budget principles

Derive from actual engines; abort if unexpected multipliers occur.

Typical advanced story (estimate — confirm during cert):

- OpenAI image: ~1 per scene visual (+ corrections)
- Vidu: ~1 per motion segment / story mode job
- ElevenLabs: ~1 per voice language asset
- Music/SFX: library reuse preferred (0 generation when assets exist)

Quick Video: **0 paid providers**.

## Audio scoring (future cert)

- voice audible
- music below voice during speech (ducking)
- SFX audible at intended points
- ambience not overpowering
- final duration correct
- subtitle sync acceptable

## Visual scoring (future cert)

- character identity
- outfit transfer / identity protected
- location match / identity preserved
- product/logo policy
- cross-scene continuity

Do not rely on a single opaque numeric score.
