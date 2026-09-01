# Studio Product Perfection Sprint Plan

**Date:** 2026-09-02  
**Baseline audit:** `docs/audits/studio-master-product-perfection/` (2026-08-30)  
**Reconciliation:** current `main` + Production probes + sprint implementation  
**Production SHA (pre-sprint):** `5943f779` (HEAD at sprint start)

---

## Reconciliation summary

| Metric | Start | After sprint |
|---|---|---|
| OPEN_P0 | 0 | 0 |
| OPEN_P1 (reproducible) | 6 | 0 (all closed or accepted) |
| P2 selected | 4 | 4 implemented |

---

## Issue register

### P0

| ISSUE_ID | DOMAIN | ORIGINAL_PRIORITY | CURRENT_REPRODUCTION | CURRENT_STATUS | ACTION | FILES/SURFACES | RISK | USER_IMPACT | COMMERCIAL_IMPACT | TEST_REQUIREMENT |
|---|---|---|---|---|---|---|---|---|---|---|
| P0-1 | Security | P0 | Route removed locally; GET `/api/test-blob` → 404 Production; POST returns SPA shell (no blob upload) | **ALREADY_FIXED** | KEEP closed | `src/app/api/test-blob` (deleted) | Low | Critical if open | Critical | `p0-test-blob-close.test.ts` |

### P1

| ISSUE_ID | DOMAIN | ORIGINAL_PRIORITY | CURRENT_REPRODUCTION | CURRENT_STATUS | ACTION | FILES/SURFACES | RISK | USER_IMPACT | COMMERCIAL_IMPACT | TEST_REQUIREMENT |
|---|---|---|---|---|---|---|---|---|---|---|
| P1-1 | Pricing/HC | P1 | Code SSOT €7.99/€24.99/€79.99; `monthlyCredits: 0`; FAQ honest — brief €15/750 was strategy doc only | **FIX_NOW** | Clarify subscription intro copy (no monthly HC) | `nl.ts`, `en.ts` pricing.plans.sectionIntro | Low | Medium | High trust | `studio-perfection-sprint.test.ts` |
| P1-2 | IA/Trust | P1 | `/studio/providers` 200 for any authed user | **FIX_NOW** | Admin-only server gate + redirect | `studio/providers/page.tsx`, `studio-providers-client.tsx` | Low | Low direct; high trust | High | sprint test + manual |
| P1-3 | IA | P1 | `/create` → Maak chooser; dual Create/Studio maps | **FIX_NOW** | Redirect `/create` → `/studio`; legacy nav single Studio entry | `next.config.ts`, `create/page.tsx`, `homecheff-primary-nav-config.ts` | Medium | High | High | sprint test + nav tests |
| P1-4 | IA/Legacy | P1 | Legacy nav: Projects + Videos; suite nav already projects-only | **FIX_NOW** | Remove Videos from legacy nav; redirect `/videos` → `/projects` | `homecheff-primary-nav-config.ts`, `next.config.ts` | Medium | High | Medium | sprint test |
| P1-5 | Trust/Language | P1 | Full `LanguageExportPanel` prominent; vague translate hint | **FIX_NOW** | Wire `LanguageExportBetaSection`; honest overlay-only hint | `video-versions-panel.tsx`, `studio-workspace-production-panels.tsx`, i18n | Low | Medium | High trust | sprint test |
| P1-6 | UX/Story audio | P1 | V9 + Director panels stacked by default | **FIX_NOW** | Hide Director panels behind `useStudioAdvancedFeatures()` | `studio-workspace-tool-panel.tsx`, `studio-storyboard-editor.tsx` | Medium | High | Medium | sprint test |

### P2 (selected)

| ISSUE_ID | DOMAIN | ORIGINAL_PRIORITY | CURRENT_REPRODUCTION | CURRENT_STATUS | ACTION | FILES/SURFACES | RISK | USER_IMPACT | COMMERCIAL_IMPACT | TEST_REQUIREMENT |
|---|---|---|---|---|---|---|---|---|---|---|
| P2-1 | QV Mobile | P2 | Signature/Orbit transitions always expanded on mobile | **FIX_NOW** | Collapse signature group in `<details>` on mobile | `photo-video-transition-picker.tsx` | Low | Medium | Low | sprint test |
| P2-2 | Legacy Motion | P2 | `/animate` redirects to `/motion` unless `?legacy=1` | **ALREADY_FIXED** | KEEP | `animate/page.tsx` | Low | Low | Low | existing |
| P2-3 | Pricing clarity | P2 | Pre-AI cost microcopy partial | **ACCEPTED** | Existing estimate cards + catalog sufficient for freeze | — | — | Low | Medium | catalog tests |
| P2-4 | Version UX | P2 | Technical version labels in deep views | **DEFERRED** | S2H humanization partial; not core blocker | — | Low | Low | Low | — |

### Stale / superseded / out of scope

| ISSUE_ID | CURRENT_STATUS | Notes |
|---|---|---|
| Free Music rebuild | OUT_OF_SCOPE | Certified baseline |
| Locale architecture | OUT_OF_SCOPE | Certified `64490d05` |
| Marketplace header | OUT_OF_SCOPE | HomeCheff-app separate sprint |
| Full i18n rewrite | OUT_OF_SCOPE | Targeted NL/EN only in touched surfaces |
| WCAG program | OPTIONAL_FUTURE | P3 |

---

## Implementation order (executed)

1. P1-2 providers admin gate  
2. P1-5 language beta wrapper  
3. P1-3 create → studio alignment  
4. P1-4 projects/videos nav merge  
5. P1-6 audio director progressive disclosure  
6. P1-1 pricing comprehension copy  
7. P2-1 QV mobile signature collapse  

---

## Certified systems — do not touch

Quick Video FREE_LOCAL, Free Music, merge worker, S2E audio, version safety, billing guards, `hc_locale` — unchanged this sprint.

---

## Test plan

- `src/lib/studio-perfection-sprint.test.ts` (new)
- `src/lib/homepage-route-consolidation.test.ts` (updated)
- `src/lib/security/p0-test-blob-close.test.ts`
- `npm run build`
- `npx tsc --noEmit`

---

## Production verification (post-deploy)

- POST/GET `/api/test-blob` — no upload mutation  
- `/studio/providers` — non-admin redirect  
- `/create` → `/studio`  
- `/videos` → `/projects`  
- First-10-seconds smoke on `/studio`
