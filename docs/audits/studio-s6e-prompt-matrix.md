# Studio S.6E — Canonical Prompt Matrix Certification

**Date:** 2026-08-09  
**Repository:** homecheff-motion  
**Branch:** `feat/studio-s6e-prompt-matrix`  
**Base / docs baseline:** `3cee073b`  
**Implementation:** `b9f30137` (+ lint `bcdb669c`)  
**Cert docs:** `e4d45ad7`  
**PR:** [#8](https://github.com/rassdread/homecheff-motion/pull/8) — **MERGED**

---

## Preview deployment

| Field | Value |
|-------|--------|
| Implementation deploy | `dpl_EhKmDeWivk1rs6CYXK2T4ygJNsDR` @ `bcdb669c` |
| Cert-docs deploy | `dpl_5CANQfCRETn5t9U15ADq3NwmQjSj` @ `e4d45ad7` |
| Status | **Ready** |
| Implementation URL | `https://homecheff-motion-hyl16ymo4-sergio-s-projects-f7b64ee1.vercel.app` |
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
| World-linked | **PASS** | World on character; Matrix `continuity.world` when worlds resolved (production path) |
| Food/Restaurant Quick | **PASS** | `restaurant_promo` → `RESTAURANT_PROMO`; Quick detailLevel; entities retained |
| Outfit Fusion | **PASS** | Wrapper keeps `fusion_references_authoritative`; character reference URL present (no paid FUSION_RENDER spend) |
| Standalone Photo→Video | **PASS** | Harness: no invented entities; source image continuity case |
| Studio→Vidu handoff | **PASS** | GET handoff 200; payload contains Character/Location/Prop; Vidu wrapper approved continuity + source still |
| Voice | **PASS** | `voiceProvider=elevenlabs`, `voiceLanguage=nl`, `voiceLock=true`; Matrix mapping preserves lock |
| BrandKit overlay | **PASS** | Created kit; optional overlay; cross-user denied |
| PromptPreset overlay | **PASS** | Created preset; identity attack stripped; cross-user denied |
| Duration precedence | **PASS** | Resolved 8s with provenance |
| Aspect precedence | **PASS** | Resolved `9:16` provenance `product_default` |
| Option wiring | **PASS** | PATCH shot/move/energy/action/emotion/duration persisted |
| CT tests | **PASS** | Unit + certification harness |
| Golden masters | **PASS** | Builder-equivalent prompt; identity sections retained |
| Security | **PASS** | Forged entity IDs denied; cross-user Character 404 |
| Privacy | **PASS** | Debug inspection omits prompt/private description fields |
| Performance | **FAST** | Matrix assembly &lt; 25ms/call locally |
| Credit regression | **PASS** | No generation charged; cost registry unchanged; Matrix does not price |
| S.1–S.5 regression | **PASS** | Login, storyboard, entities, workspace, handoff, library, logout/relogin |

**Preview gate:** **GREEN**

---

## Merge & production

| Field | Value |
|-------|--------|
| Merge commit | `e8f863f546e31c5176223468a07eacdae53bde85` |
| Merge timestamp | `2026-08-09T01:35:00Z` |
| Production deployment ID | `dpl_J43r3w7vUJVcutBGwoP2jSZGtP5j` |
| Production commit | `e8f863f5` |
| Production status | **Ready** |
| Production URLs | `https://studio.homecheff.eu`, `https://motion.homecheff.eu` |

### Production smoke (2026-08-09)

Same controlled user + storyboard (shared Neon). No paid provider generation.

| Check | Result |
|-------|--------|
| Login / session | PASS |
| Storyboard + linked Character/Location/Prop/World | PASS |
| Voice identity fields | PASS |
| Fusion reference URL retained on Character | PASS |
| Motion projects entry | PASS (200, empty list) |
| Handoff payload continuity | PASS (Chef/Kitchen/Pan present) |
| BrandKits / PromptPresets list | PASS |
| Workspace `/studio?storyboardId=` | PASS (no Application error) |
| Matrix prep from production scene | PASS (all continuity modules + identity in prompt) |
| Logout / relogin | PASS |
| Credit spend | None intentional (Matrix prep only) |

**Production continuity sanity:** PASS  
**Production credit sanity:** PASS (no Matrix-side billing; no double charge observed)

---

## Final S.6E decision

**S.6E COMPLETE / GO FOR STUDIO S.6F — CREATIVE DIRECTOR**

Do not start S.6F automatically.
