# Studio S.6G — Consumer Experiences & Experience Packs (Audit)

**Date:** 2026-08-09  
**Mode:** READ-ONLY forensic (audit first — no architecture rewrite)  
**Depends on:** S.6C Continuity ✅ · S.6E Prompt Matrix ✅ · S.6F Creative Director ✅  

---

## Artifacts

| Doc | Role |
|-----|------|
| `docs/audits/studio-s6g-consumer-experience-inventory.md` | Every route / door / fan / SEO surface |
| `docs/audits/studio-s6g-experience-pack-registry.md` | Canonical Experience Pack → Director → Matrix map |
| `docs/audits/studio-s6g-missing-experience-report.md` | Honest MISSING / NO_SURFACE / ENGINE_ONLY |
| `docs/audits/studio-s6g-question-flow-audit.md` | Quick questions vs UI reality |
| `docs/audits/studio-s6g-prompt-coverage-audit.md` | Pack → Prompt Matrix coverage |
| `docs/audits/studio-s6g-continuity-coverage-audit.md` | ContinuityBundle by pack / surface |
| `docs/audits/studio-s6g-director-matrix-transform-coverage.md` | Director / Matrix / Provider Transform |
| `docs/audits/studio-s6g-workspace-integration-audit.md` | Modes + Adaptive Workspace (no redesign) |
| `docs/audits/studio-s6g-quality-readiness-scores.md` | Quality + Consumer Readiness scores |
| `docs/architecture/studio-experience-packs.md` | Pack architecture (curated workflows, not engines) |

---

## Law (unchanged)

```
Continuity owns identity
  → Prompt Matrix assembles
  → Creative Director orchestrates
  → Provider Transform is last
  → Generation executes
```

Experience Packs are **curated consumer workflows** on this chain.  
They are **not** new AI engines.

---

## Absolute rules (audit compliance)

| Rule | Status |
|------|--------|
| Do not redesign Studio / Workspace / Director / Matrix / Continuity / Jobs / Billing | ✓ (docs only) |
| Discover, do not assume | ✓ (routes + registries + fans audited) |
| One experience · many doors · one canonical owner | ✓ enforced in S.6F `assertUniqueProductExperienceOwnership` |
| Do not invent engines | ✓ missing packs classified, not faked LIVE |
| SEO ≠ product/Matrix ID | ✓ |

---

## Executive findings

### What exists

- **51** S.6F product experiences (Experience Pack skeletons) across PEOPLE / BUSINESS / SOCIAL / CREATIVE / IDENTITY
- **24** S.6E Matrix engines
- Broad surface inventory: Create/Maak, Studio, Instant, Motion Hub (65 presets), Fusion (27 intents), Character Studio (11 flows), Movie Builder, Production, Publish (8 modes), Assistant, SEO hubs
- Creative Coach packs for Restaurant, HomeCheff, LinkedIn, CV, Business Portrait, Dating, Wedding (+ family fallbacks)

### Critical gap (blocks “feels like one platform”)

**Creative Director is not the production entry point for most consumer paths.**

| Surface | Calls `orchestrateCreativeDirector`? | Uses ContinuityBundle → Matrix? |
|---------|--------------------------------------|----------------------------------|
| Workspace Creative Director panel | YES | Handoff requires Continuity; assemble when wired |
| Unit tests | YES | YES (selected) |
| Instant Premium `/animate/instant` | NO | Matrix path for Instant/Motion when used; not via Director |
| Fusion / Character Studio | NO | Domain Fusion; Matrix wrap selective |
| `/studio/start` video intents | NO | Partial Matrix via videoIntent |
| Maak `/create` | NO | Fan-out to routes only |
| SEO CTAs | NO | Usually `/studio/storyboards/new` |

Architecture is complete. **Consumer wiring is incomplete.**

### Honest pack honesty

| Band | Count | Examples |
|------|------:|----------|
| LIVE product packs | ~27 | Restaurant, HomeCheff, Fashion, Outfit, TikTok, Storyboard, … |
| PARTIAL | ~14 | LinkedIn, Wedding, Family, Automotive, Facebook, YouTube, … |
| MISSING | 6 | Dating, Baby, Pregnancy, Christmas, Memorial, Real Estate |
| EXPERIMENTAL | 2 | Celebrity, Future Child |
| ADVANCED | 1 | Film / Movie Builder |
| ENGINE_ONLY (Matrix, no product pack) | 8 | Voice TTS/Clone, Music, SFX, Subtitles, Translate, Publish, Asset ref |
| NO_SURFACE families | several | Beauty, Pets, Education, Lifestyle, Entertainment, Rendering |

---

## Definition of Done — Audit vs Implementation

### S.6G Audit DoD

| Item | Status |
|------|--------|
| Every consumer experience inventoried | ✓ |
| Every experience maps to one canonical Experience Pack (or honestly unmapped) | ✓ |
| Every pack maps to Director workflow (architecturally) | ✓ |
| Every pack maps to Prompt Matrix (or LEGACY_UNMAPPED) | ✓ |
| Continuity requirements declared per pack | ✓ |
| Missing packs honestly classified | ✓ |
| No duplicate ownership in product registry | ✓ |
| No architecture rewritten | ✓ |
| Workspace unchanged | ✓ |
| Billing unchanged | ✓ |

**Audit verdict: COMPLETE**

### S.6G Implementation DoD (not this phase)

| Item | Status |
|------|--------|
| Instant / Maak / Fusion / Motion / Studio start enter via Director orchestration | NOT DONE |
| Experience Packs behave as polished guided products (questions → generate) | NOT DONE |
| MISSING packs implemented or deliberately deferred with UI honesty | NOT DONE |
| Coach recommendations exposed on every pack surface | PARTIAL (panel only) |

---

## Final GO / NO-GO

| Gate | Verdict |
|------|---------|
| S.6G Audit | **COMPLETE** |
| GO FOR S.6G IMPLEMENTATION | **GO** |
| Claim S.6G product COMPLETE | **NO-GO** until consumer doors wire through Director → Continuity → Matrix |

### Blocking for product COMPLETE

1. Production consumer surfaces bypass Creative Director.
2. Six MISSING packs still `unimplemented_pack` / `LEGACY_UNMAPPED`.
3. Voice / Music / SFX / Publish remain ENGINE_ONLY (no Experience Pack productization).

### Non-blocking risks

- Many PARTIAL packs share generic Matrix engines (`PERSON_BACKGROUND`, `VIDEO_INTENT`, `MOTION_PRESET`) — acceptable if questions/coach differentiate.
- SEO / Motion presets / morph IDs create many doors; ownership must stay on product packs.
- Scene T2I pixel continuity remains PARTIAL (unchanged law).

---

## Recommended next step (implementation, after this audit)

1. **Wire entry doors** (Instant photoIntent, Studio videoIntent, key Fusion/CS flows, Maak cards) through `resolveCreativeExperience` → `orchestrateCreativeDirector` → Continuity → Matrix — without UI redesign.
2. **Ship first Experience Packs as guided Quick flows:** LinkedIn Studio, Restaurant Studio, HomeCheff Studio, Wedding Studio (PARTIAL→LIVE quality), Dating Studio (implement or hide).
3. **Keep Coach advisory** on pack surfaces; never auto-mutate Continuity.
4. Defer Beauty / Pets / Education packs until registry rows + Matrix mapping exist — do not invent engines.
