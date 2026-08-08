# Studio S.3 — Creative Workflow Audit & Certification

**Branch:** `refactor/studio-s3-creative-workflow`  
**Base commit:** `d6e7e6fc`  
**Implementation commit:** `e08a5561`  
**PR:** https://github.com/rassdread/homecheff-motion/pull/4  
**Scope:** Workflow **inside** Adaptive Workspace — no shell redesign, no auth/credits/billing semantic changes.  
**Local gates:** lint PASS · build PASS · tsc PASS · tests **4623/4623**  
**Preview / Production:** NOT YET CERTIFIED → **NO-GO for S.4** until green.

---

## Journey map (audit findings → actions)

| Journey | Friction found | S.3 action |
|---------|----------------|------------|
| A New project | Long brief; hub split `/studio` vs start | Home → `/studio/start`; New story in quick links |
| B Existing | Scene/tool not resumable | session place restore (once) |
| C Image | Credit opacity on generate | Display credits + hint |
| D Video | Render/export empty without Motion | Terminology: Render / Export (no pipeline rewrite) |
| E Voice | TTS generate without cost cue | Display credits + events |
| F Subtitles | Soft-gated on voice; unclear why | Title + scope hint |
| G Render/export | Scattered settings | Stage chip; tool labels |
| H Resume | Tool reset on scene switch | selectScene keeps tool |

Additional:

- Scene reorder only in classic → workspace up/down  
- Save state unused → header Saved / Unsaved / Saving…  
- Vocabulary drift → `STUDIO_VOCABULARY` + docs  

---

## Canonical terminology

| Prefer | Avoid / internal |
|--------|------------------|
| Project | Motion Studio “story” overload in user chrome |
| Scene | Clip / beat (unless product copy needs it) |
| Generate | “Run AI” |
| Render | “Make MP4” as sole term |
| Export | Download-only label when both exist |
| Advanced editor | Classic (user-facing) |
| Storyboard | OK as entity/list label; header says project |

Source: `src/lib/studio-creative-workflow.ts` + i18n.

---

## Implementation slices shipped (this branch)

| Slice | Status |
|-------|--------|
| S.3A Journey + terminology + docs | DONE |
| S.3B Scene select / create / reorder / place / save | DONE |
| S.3C Image credit transparency | PARTIAL (scene image + constants) |
| S.3D Voice credit + subtitle scope | PARTIAL |
| S.3E Preview/render/export labeling | PARTIAL (labels + stages) |
| S.3F Mobile workflow | Relies on S.2; no dedicated E2E yet |
| S.3G Polish + regression tests | IN PROGRESS |

---

## Regression matrix (minimum)

| Case | Automated / manual |
|------|--------------------|
| Scene select keeps tool | Source contract test |
| Scene reorder controls | Source contract test |
| Stage inference | Unit |
| Image credit hint | Source contract test |
| New / existing / resume | Manual Preview |
| Voice / subtitle soft gate | Manual |
| Paid action charge | Preview harness (do not skip) |
| Adaptive postures | S.2 certified — smoke |

---

## Absolute rules check

- [x] No Adaptive Workspace redesign  
- [x] No Central Identity  
- [x] No auth / `studio_session` change  
- [x] No credit **price** changes (display only mirrors registry)  
- [x] Classic retained advanced-gated  

---

## Definition of Done (honest status)

Many UX checklist items are **documented + partially implemented**. Full Preview E2E + Production smoke required before **GO FOR S.4**.

See final report in PR / release notes when certification completes.
