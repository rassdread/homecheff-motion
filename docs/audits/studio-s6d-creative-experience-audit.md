# Studio S.6D — Creative Experience Audit (Final)

**Date:** 2026-08-09  
**Mode:** READ-ONLY forensic  
**Code / prompts / providers / production / commits / push / PRs:** **ZERO**

## Artifacts

| Doc |
|-----|
| `docs/architecture/studio-creative-experiences.md` |
| `docs/architecture/studio-creative-experience-families.md` |
| `docs/audits/studio-creative-experience-registry.md` |
| `docs/audits/studio-prompt-coverage-audit.md` |
| `docs/audits/studio-continuity-by-experience.md` |
| `docs/audits/studio-provider-transform-audit.md` |
| This file |

---

## Definition of Done

| Item | Status |
|------|--------|
| Every creative experience inventoried | ✓ (registry + explore) |
| Canonical registry completed | ✓ |
| Prompt coverage mapped | ✓ |
| Continuity coverage mapped | ✓ |
| Provider transforms documented | ✓ |
| Duplicate experiences identified | ✓ below |
| Missing experiences identified | ✓ below |
| Experience families documented | ✓ |
| Prompt Matrix readiness documented | ✓ |
| Adaptive Workspace / mode placement documented | ✓ |
| Zero code/prompt/provider/prod/commits | ✓ |

---

## Duplicate experiences (report only)

| Canonical | Also exposed as |
|-----------|-----------------|
| Outfit change | Fusion outfit, CS outfit, morph outfit_change, assistant prepare_outfit, recs |
| Character fusion | Fusion intent, CS flow, assistant create_fusion |
| Motion I2V | Instant, Motion hub, Maak, Studio handoff, assistant motion_* |
| Mascot transform | CS flows, fusion human↔mascot, morphs, assistant |
| Motion-ready character | CS full_body/motion_ready, assistant, library recs |
| Video production brief | 15 intents, /studio/start, assistant, SEO CTAs |
| Publish/export | /publish modes, Studio export/translate, assistant publish_* |
| Voice/music/subs | Studio tools, Publish, assistant audio_*, Instant overlays |

---

## Missing vs common creator expectations

| Expectation | Status |
|-------------|--------|
| Fashion studio | **Partial** — fashion_reel + runway preset + outfit fusion |
| Luxury lifestyle | **Partial** — luxury_entrance preset; no luxury product line |
| Real estate | **Missing** as product experience (SEO may mention) |
| Automotive | **Partial** — sports_car_arrival preset only |
| Education / podcast | **Partial** — intents podcast_video, presentation; educational director |
| Corporate | **Partial** — company_video, clean_business style |
| Fitness | **Partial** — sports presets |
| Cooking / restaurant / HomeCheff | **Exists** — intents + food_promo + lifestyle cooking |
| Events / travel / entertainment | **Partial** — intents + presets |
| Dating / LinkedIn / wedding / baby / Christmas photo packs | **Missing** as dedicated Studio experiences (may appear only as generic stills/Fusion) |
| Dedicated thumbnail/banner/poster studio | **Partial** — Fusion poster/social ADVANCED; Publish poster |
| Virtual try-on productized | **Partial** — outfit Fusion LIVE |

---

## Prompt Matrix readiness (rollup)

| Ready | Needs Mapping | Needs Continuity | Needs Provider Transform | Needs Prompt Improvement | Needs Product Decision |
|-------|---------------|------------------|--------------------------|--------------------------|------------------------|
| Scene stills core | Instant, Fusion, presets, intents | Instant/Motion/Publish/Brand | Vidu, Fusion archetypes | Music/SFX thin; placeholders | Sims, legacy, Brand wire, dead routes |

---

## Mode coverage (document only)

| Mode | Coverage today |
|------|----------------|
| Quick | Strong Instant/Motion/intent entry; weak ContinuityBundle |
| Professional | Strong workspace + Fusion CS; Continuity Partial |
| Director | Movie Builder / Production / director tools ADVANCED; Continuity Partial |

---

## Critical S.6D findings for S.6E

1. **Many experiences ≠ one prompt builder** — Studio / Instant / Fusion / Asset / Motion presets are parallel.  
2. **Formal ContinuityBundle is not on Instant/Motion/Publish** — Matrix cannot assume compliance.  
3. **SEO ≠ engines** — do not create Matrix modules per marketing slug.  
4. **Duplicates are entry fans**, not separate SoTs — map once, many doors.  
5. **Fusion is often stronger at pixel identity** than scene T2I — Matrix must not ignore Fusion path.

---

## Final decision

# GO FOR STUDIO S.6E — PROMPT MATRIX IMPLEMENTATION

**Rationale:** Every major creative experience family has been inventoried, registered, and mapped for prompt coverage, continuity, provider transforms, duplicates, gaps, families, Matrix readiness, and workspace modes. Absolute rules held (docs only, no commits).

**Blockers for GO:** None for audit completeness.  
**Non-blocking risks:** Parallel stacks; ContinuityBundle gaps on Instant; Brand unwired; simulation intents; duration/aspect drift (known).

**Recommended next step:** S.6E implement Prompt Matrix as **assembler over ContinuityBundle**, wrapping scene stills first, then mapping Fusion + Vidu transforms — without rewriting Continuity ownership (S.6C).
