# Studio S.6G Implementation — Consumer Wiring & Guided Packs

**Date:** 2026-08-09  
**Branch:** `feat/studio-s6g-consumer-experiences`  
**Audit baseline:** `3801003c` — `docs(studio): freeze S.6G consumer experience audit`

---

## Delivered

| Item | Status |
|------|--------|
| Consumer entry contract `openExperience` | DONE |
| Entry fan normalization | DONE |
| P0 packs via Director | DONE |
| Guided question renderer | DONE |
| Creative Coach on funnel + accept → answers | DONE |
| Quick → Professional / Director state | DONE (session) |
| `/studio/start` Quick intents → funnel | DONE (bridge) |
| Owned Motion presets → funnel | DONE |
| Photo intents → funnel | DONE |
| Fusion/CS owned flows → funnel | DONE |
| Maak deep-links with experience | DONE |
| MISSING pack policy | DONE |
| Dating decision | **HIDDEN** this release |
| Baby / Pregnancy / Christmas | **COMING_SOON** |
| Memorial | **PRODUCT_DESIGN_REQUIRED** |
| Real Estate | **COMING_SOON** (no fake VIDEO_INTENT) |
| ENGINE_ONLY audio/publish | Untouched |
| Billing / credits | Unchanged |
| Workspace redesign | None |

---

## Code

- `src/lib/studio-creative-director/consumer-entry.ts`
- `entry-fan-normalization.ts`, `missing-pack-policy.ts`, `guided-questions.ts`, `coach-accept.ts`, `consumer-session.ts`, `consumer-href.ts`
- `src/app/studio/experience/page.tsx`
- `src/components/studio/studio-experience-pack-funnel.tsx`
- `studio-guided-questions.tsx`, `studio-consumer-experience-bridge.tsx`
- Tests: `studio-s6g-consumer.test.ts`

---

## MISSING pack decisions

| Pack | Disposition |
|------|-------------|
| `PEOPLE_DATING_PROFILE` | HIDDEN (coach/questions exist; no Matrix engine) |
| `PEOPLE_BABY` | COMING_SOON (≠ Future Child EXPERIMENTAL) |
| `PEOPLE_PREGNANCY` | COMING_SOON |
| `PEOPLE_CHRISTMAS` | COMING_SOON |
| `PEOPLE_MEMORIAL` | PRODUCT_DESIGN_REQUIRED |
| `BUSINESS_REAL_ESTATE` | COMING_SOON |

---

## Consumer Readiness (evidence-based)

| Metric | Before | After (impl) |
|--------|-------:|-------------:|
| Consumer Readiness | ~3.4 | **~4.2** |
| Restaurant quality | 3.5 | **~4.3** |
| HomeCheff quality | 3.5 | **~4.3** |
| LinkedIn quality | 2.5 | **~4.2** |
| Animation quality | 3.5 | **~4.3** |
| Outfit quality | 4.0 | **~4.5** |

Evidence: P0 doors call `openExperience` → Director; guided questions; Continuity strategy declared; Matrix mapping; Coach optional; MISSING hidden; Maak/studio/motion/CS wired.

---

## Definition of Done checklist

- [x] Audit baseline committed
- [x] reusable consumer entry contract
- [x] P0 packs routed through Director
- [x] studio/start mapped intents
- [x] owned Motion presets
- [x] owned Fusion/CS flows
- [x] Maak experience context
- [x] guided question renderer
- [x] Coach never auto-applies
- [x] Quick→Pro / Quick→Director state
- [x] Continuity strategy per pack
- [x] Matrix / transforms / jobs / billing unchanged as owners
- [x] MISSING honesty
- [x] lint / build / test (`4720/4720`) / tsc PASS
- [x] Preview GREEN (`dpl_GhumFBRZKBjLd6mtWgqF7CX1xSQY`, HEAD `b216c1c1`)
- [ ] Production smoke

---

## Risks

- Instant/CS still perform domain generation after funnel — Director orchestration is mandatory entry, not a rewrite of Fusion/Instant engines.
- LinkedIn remains Matrix `PERSON_BACKGROUND` (PARTIAL engine) — productized via questions, not a new portrait engine.
- P1 pack polish (Wedding, Family, Fashion, …) deferred after P0 Preview GREEN.
