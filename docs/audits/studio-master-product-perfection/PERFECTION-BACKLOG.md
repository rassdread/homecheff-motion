# Perfection Backlog

## A. MUST FIX BEFORE COMMERCIAL FREEZE

0. ~~**`POST /api/test-blob`**~~ — **CLOSED** (`P0-TEST-BLOB-CLOSEOUT.md`)  
1. ~~**Unify commercial pricing/HC story**~~ — **CLOSED** sprint (`PERFECTION-SPRINT-FINAL-REPORT.md`)  
2. ~~**Hide `/studio/providers` from normal users**~~ — **CLOSED** admin gate  
3. ~~**Resolve Create/Maak vs Studio home intent dual map**~~ — **CLOSED** `/create` → `/studio`  
4. ~~**Projects vs Videos nav story**~~ — **CLOSED** legacy nav + `/videos` redirect  
5. ~~**De-emphasize language features that overpromise**~~ — **CLOSED** beta wrapper + honest copy  
6. ~~**Reduce Story/audio control duplication visible by default**~~ — **CLOSED** advanced-gated Director panels  

## B. HIGH-VALUE PRODUCT POLISH

1. Soften/hide legacy `/animate`, Classic, Production, Movie Builder from default paths — P2 · M  
2. Quick Video mobile transition density (Orbit prominence) — P2 · S  
3. Scenario G mobile duration chip visibility — P2 · S  
4. Pre-generation cost clarity on AI Video/Animation — P2 · S  
5. Finish hub as only promoted completion path — P2 · M  
6. Targeted NL English leaks — P2 · S  
7. Contextual Studio→Growth CTA only after output — P2 · M  
8. Version UI humanization (Current / Previous) — P2 · M  

## C. OPTIONAL FUTURE

- Full a11y WCAG program  
- Bundle performance campaign (after MEASURE)  
- Experience-pack first-class IA (Social/Promo as top-level) only if commercially needed  
- Deep translation architecture — **out unless commercial case**

## D. DO NOT DO / OUT OF SCOPE

- Rebuild Free Music / S2A–S2E / FREE_LOCAL / merge worker  
- New providers/sources/CC BY  
- New S2 phase numbering  
- Broad i18n rewrite of entire Studio  
- Schema/billing engine redesign unless pricing strategy requires it  

## Proposed Product Perfection Sprint (bounded)

**Goal:** Make Studio feel like one product without touching certified engines.

**In scope:** Close `/api/test-blob` (and sibling test upload routes), nav/IA simplification, hide providers, align pricing copy to official config, Create→Studio alignment, default-hide advanced duplicates, QV mobile transition polish, language honesty, targeted i18n, cost clarity microcopy.

**Out of scope:** Architecture, Free Music rebuild, new features, provider expansion.

**Risk:** Medium (nav redirects) — mitigate with redirects + deep-link keep.  
**Tests:** Nav/routing tests, pricing copy tests, QV regression, Story smoke, no provider/billing regressions.  
**Prod deploy:** Yes for copy/nav.  
**Physical iPhone:** Re-test only if mobile QV transition UI or Story chrome changes materially.
