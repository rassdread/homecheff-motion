# Studio S.6E — Canonical Prompt Matrix Certification

**Date:** 2026-08-09  
**Repository:** homecheff-motion  
**Branch:** `feat/studio-s6e-prompt-matrix`  
**Base / docs baseline:** `3cee073b`  
**Implementation:** `b9f30137` (+ lint `bcdb669c`)  
**PR:** [#8](https://github.com/rassdread/homecheff-motion/pull/8)

---

## Preview deployment

| Field | Value |
|-------|--------|
| Deployment ID | `dpl_EhKmDeWivk1rs6CYXK2T4ygJNsDR` |
| Commit | `bcdb669c27cedc0341c68f2d53e9975805c9c37c` |
| Status | **Ready** |
| URL | `https://homecheff-motion-hyl16ymo4-sergio-s-projects-f7b64ee1.vercel.app` |
| Access | Vercel Deployment Protection; certified via `npx vercel curl` |

---

## Local gates

| Gate | Result |
|------|--------|
| Lint | PASS (0 errors) |
| Build | PASS |
| TypeScript (`tsc --noEmit`) | PASS |
| Tests | **4695/4695** PASS |

---

## Compliance counts (honest)

| Class | Count |
|-------|------:|
| MATRIX_NATIVE | 0 |
| MATRIX_WRAPPED | 9 |
| MATRIX_PARTIAL | 10 |
| LEGACY_UNMIGRATED | 4 |
| EXPERIMENTAL | 1 |
| **Registry total** | **24** canonical IDs (not ~200 doors) |

Scene T2I pixel conditioning remains **PARTIAL** (`partial_text_qa`). Not claimed solved.

---

## Preview certification matrix

Controlled user: `s6e.cert.1786238226@example.com`  
Storyboard: `cmsl44mc70002l304y1gbkg30`

| Check | Result | Evidence |
|-------|--------|----------|
| Scene + Character | **PASS** | Character attached; Matrix `continuity.character`; prompt retains chef identity |
| Character + Location + Prop | **PASS** | All three distinct IDs in ContinuityBundle/spec/modules/prompt |
| World-linked | **PASS** | World `cmsl4584k0006l304mky6c43b` on character; Matrix `continuity.world` when worlds resolved (production path) |
| Food/Restaurant Quick | **PASS** | `restaurant_promo` → `RESTAURANT_PROMO`; Quick detailLevel; entities retained |
| Outfit Fusion | **PASS** | Wrapper keeps `fusion_references_authoritative`; Preview character reference URL present (no paid FUSION_RENDER spend) |
| Standalone Photo→Video | **PASS** | Harness: no invented entities; source image continuity case |
| Studio→Vidu handoff | **PASS** | GET handoff 200; payload contains Character/Location/Prop; Vidu wrapper approved continuity + source still |
| Voice | **PASS** | Character `voiceProvider=elevenlabs`, `voiceLanguage=nl`, `voiceLock=true`; Matrix mapping preserves lock |
| BrandKit overlay | **PASS** | Created kit; Matrix optional overlay only when `available`; attacker cannot read kit (404) |
| PromptPreset overlay | **PASS** | Created preset; identity attack stripped in harness; attacker 404 |
| Duration precedence | **PASS** | Resolved 8s with provenance `user_override` / scene |
| Aspect precedence | **PASS** | Resolved `9:16` provenance `product_default` (documented Studio handoff behavior) |
| Option wiring | **PASS** | Preview PATCH shot/move/energy/action/emotion/duration persisted |
| CT tests | **PASS** | Unit + certification harness (CT-01…14 coverage) |
| Golden masters | **PASS** | Builder-equivalent prompt; identity sections retained |
| Security | **PASS** | Forged Character/Location/Prop 404; forged attach 400 owned check; cross-user Character 404 |
| Privacy | **PASS** | Debug inspection omits prompt/private description fields |
| Performance | **FAST** | ~50 Matrix assemblies &lt; 25ms/call locally |
| Credit regression | **PASS** | No generation charged in Preview smoke; cost registry unchanged; Matrix does not price |
| S.1–S.5 regression | **PASS** | Login/session, storyboard, entities, workspace HTML 200, handoff, library brand/preset, logout/relogin |

**Preview gate:** **GREEN**

---

## Merge & production

_Filled after merge._

| Field | Value |
|-------|--------|
| Merge commit | _pending_ |
| Merge timestamp | _pending_ |
| Production deployment | _pending_ |
| Production smoke | _pending_ |

---

## Final S.6E decision

Pending production smoke after merge.
