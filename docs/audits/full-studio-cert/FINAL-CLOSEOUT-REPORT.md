# HOMECHEFF STUDIO — FULL PRODUCT CERTIFICATION CLOSEOUT REPORT

**Date:** 2026-08-21 / 2026-08-22  
**Slice:** FULL_STUDIO_CERT_CLOSEOUT_SLICE  
**Final verdict:** `STUDIO_FULL_PRODUCT_CERTIFICATION_BLOCKED`

---

## 1. Executive verdict

S2A–S2H (+ S2E-P1) **shipped to Production** and **provider visual probes were executed** with real OpenAI outputs after a P0 multi-ref payload fix. Full product certification remains **blocked** because Production UI end-to-end scenarios (Rode loper, Pixar stress, HomeCheff E2E, Vidu, final audio mix, physical iPhone advanced) were **not** completed in this closeout window (auth-gated flows + no connected iPhone).

## 2. Previous blockers (from prior report)

| ID | Status now |
|----|------------|
| BLOCK-01 S2 stack only local | **CLEARED** — committed + deployed |
| BLOCK-02 PROVIDER_VISUAL NOT_RUN | **CLEARED → WORKING** — real probes run |
| BLOCK-03 Scenarios A–F / I / K / L | **PARTIAL** — D/E/product/identity probes only; A/C/G/I still open |

## 3. Release inventory

See `PRODUCTION-RELEASE-INVENTORY.md`.

- Included: S2A–S2H, S2E-P1, transformation stack, Finish, Projects, cert docs  
- Excluded: HC wallet / billing settlement / unrelated account work  
- Schema: **NO Prisma migration**

## 4. Commit SHA

| Commit | Message |
|--------|---------|
| `d80c5e8f` | feat(studio): ship S2A–S2H production spine for full product cert closeout |
| `0512021d` | fix(studio): use image[] for multi-reference OpenAI edits |

**Release HEAD:** `0512021d`

## 5. Deployment ID

| Deploy | Notes |
|--------|-------|
| `dpl_AkM7saY5PsQQucZhBgYEAkR7CRgm` | First S2 deploy (`d80c5e8f`) — verified “Mijn projecten” + finish/stage i18n |
| `dpl_5DAQnrEAgmBzysYLW8Zs6zK7TMyx` | Hotfix + docs era (`0512021d`/`d624cd53`) — **current** Production alias (`data-dpl-id` confirmed) |

Production URL: https://studio.homecheff.eu  
**Current Production HEAD (feature):** `0512021d` (image[] fix); docs commit `d624cd53` may still be deploying.

## 6. Production feature verification

| Signal | Result |
|--------|--------|
| S2H `/projects` “Mijn projecten” | Present on new dpl |
| `GET /api/studio/projects` | 401 AUTH_REQUIRED (expected, not 500) |
| S2F/S2G i18n in client chunk | `studio.finish.title`, `studio.productionStage.story`, `Personen & plaatsen`, `Afronden` present |
| Quick Video route | 200, `photo-video` intact, same dpl |

## 7–8. Pre-deploy / regression gates

At `d80c5e8f` intended release:

- tests **5238 / 5238** PASS  
- typecheck PASS  
- build PASS  
- targeted S2A–S2H + Slice1A/1B + PX4A7 + i18n PASS (215/215 batch)  
- Prisma validate/generate PASS; no migration  

After hotfix: openai-image + S2B2 + fusion-phase5 tests PASS (41/41).

## 9–10. Provider budget / actual

Budget: see `PROVIDER-CALL-BUDGET.md` (hard cap ≤12 image / ≤2 Vidu).

Actual this closeout:

| Kind | Count |
|------|------:|
| OpenAI image (failed multi-ref before fix) | 3 |
| OpenAI image (identity plate) | 1 |
| OpenAI generations (person/outfit/loc/product/logo) | 5 |
| OpenAI edits (outfit/location/product after fix) | 3 |
| Vidu | 0 |
| ElevenLabs | 0 |

No unbounded retries. One recovery path after P0 fix.

## 11–16. Provider visual

See `PROVIDER-VISUAL-CERT.md` + `provider-visual/`.

Human verdicts:

- **Outfit:** PASS (identity held; clothing transferred)  
- **Location:** PASS (identity + white tee; venue changed)  
- **Product/logo:** PASS (bottle + clear HC mark; generative logo path, not pixel composite)  
- **Identity BASE edit:** route OK (plate fixture); person continuity proven via D/E  

## 17–25. Scenario matrix (closeout)

| Scenario | Status |
|----------|--------|
| A Rode loper UI+Vidu | **NOT_RUN** (auth) |
| C 8-scene Pixar | **NOT_RUN** |
| D Outfit | **WORKING** (provider probe) |
| E Location | **WORKING** |
| Product/logo | **WORKING** |
| G HomeCheff E2E | **NOT_RUN** this slice (prior GAP2 only) |
| H Quick Video | **WORKING** light smoke (prior CERTIFIED) |
| I Mobile advanced | **NOT_RUN** (no iPhone) |
| Vidu motion | **NOT_RUN** |
| Audio mix / ducking / SFX | **NOT_RUN** on Production (unit S2E-P1 green) |

## 26–33. Production S2F/G/H / continuity / i18n / a11y / perf

- S2H library page: **WORKING** (smoke)  
- S2F/S2G strings deployed: **WORKING** (bundle)  
- Authenticated Finish/Projects continuity: **NOT_RUN**  
- NL/EN deep workspace: **NOT_RUN** (i18n unit parity green)  
- a11y / perf: **NOT_RUN** beyond prior foundation  

## 34. Billing / provider safety

- Unrelated HC wallet work **excluded** from release  
- Multi-ref billing risk fixed at payload layer (no silent drop; was hard fail)  
- No duplicate charge evidence in this probe set  

## 35–36. Issues

| ID | Sev | Classification | Notes |
|----|-----|----------------|-------|
| FIX-01 multi-ref `image` vs `image[]` | P0→fixed | ORCHESTRATION_DEFECT | Shipped in `0512021d` |
| BLOCK-04 Auth UI scenarios A/C/G | P1 | CERT_EVIDENCE_GAP | Needs signed-in Production session |
| BLOCK-05 Vidu + audio final mix | P1 | CERT_EVIDENCE_GAP | Not executed |
| BLOCK-06 Physical iPhone advanced | P1 | CERT_EVIDENCE_GAP | Device not connected |
| WARN-01 Logo pixel composite | P2 | PARTIAL | Generative logo OK; deterministic post-composite not run |
| WARN-02 Clothing mask path | P2 | PARTIAL | Explicit Fusion fallback used |

## 37. Scorecard (evidence-limited)

| Category | Score | Note |
|----------|------:|------|
| First 10 seconds | 7 | Prior Slice1A |
| Beginner usability | 7 | Finish/Projects copy present |
| Mobile usability | — | NOT_RUN |
| Desktop usability | 7 | Smoke only |
| Preset usability | — | NOT_RUN |
| Character consistency | 7.5 | From D/E probes |
| Location consistency | 7.5 | Probe E |
| Product/logo | 7 | Generative; pixel path unproven |
| Motion quality | — | NOT_RUN |
| Audio coherence | — | NOT_RUN |
| Rerender safety | 7 | Router BASE_IMAGE_EDIT proven |
| Finish clarity | 8* | *code+i18n; auth UI NOT_RUN |
| Project continuity | 8* | *S2H page; auth flow NOT_RUN |
| HomeCheff integration | — | NOT_RUN this slice |
| International readiness | 7 | Bundle keys present |
| Trust | 7 | Honest exclusions |
| Performance | — | NOT_RUN |
| Power-user capability | 7 | Stack present |

Overall (partial evidence): **~7.0** — cannot certify ≥7.5 with NOT_RUN cores.

## 38. Core promise answers

1. Recurring character recognizable? **PARTIAL** (probe pair, not 8-scene)  
2. Clothing without identity replace? **YES** (probe D)  
3. Recurring location? **PARTIAL** (single probe)  
4. Products/logos protected? **PARTIAL** (generative OK; pixel composite NOT_RUN)  
5. Preset → canonical project? **NOT_RUN**  
6. Scene rerender safe? **PARTIAL** (router + BASE edit)  
7. Vidu usable motion? **NOT_RUN**  
8. Voice/music/SFX final? **NOT_RUN**  
9. Finish without jargon? **PARTIAL** (i18n/code)  
10. Return via Mijn projecten? **PARTIAL** (page live)  
11. HomeCheff handoff safe? **NOT_RUN** this slice  
12. Mobile advanced usable? **NOT_RUN**  

## 39. Provider limitations

None blocking after image[] fix on these probes. Occasional model variance expected (EXPECTED_MODEL_VARIANCE).

## 40–41. PX.5

Do **not** start PX.5.

**Recommended ONE next phase:**  
`FULL_STUDIO_CERT_AUTHED_PRODUCTION_CLOSEOUT` — signed-in Production runs for A (Rode loper+Vidu), representative C, G HomeCheff E2E/GAP2, Finish/Projects continuity, audio mix proof, and physical iPhone if available. No new features.

## 42. Production recommendation

Keep current Production release (`0512021d` once Ready). Safe for S2 UI surfaces. Do **not** claim full product certified until BLOCK-04/05/06 close.

---

## Classifications

| Area | Status |
|------|--------|
| PRODUCTION_RELEASE | CERTIFIED |
| S2F_PRODUCTION | WORKING |
| S2G_PRODUCTION | WORKING |
| S2H_PRODUCTION | WORKING |
| S2E_P1_PRODUCTION | WORKING (code; mix UI NOT_RUN) |
| PROVIDER_VISUAL_CERTIFICATION | WORKING |
| IDENTITY_PRESERVATION | WORKING |
| CLOTHING_TRANSFER | WORKING |
| LOCATION_TRANSFER | WORKING |
| PRODUCT_PRESERVATION | WORKING |
| LOGO_PRESERVATION | PARTIAL |
| MULTI_CHARACTER | NOT_RUN |
| PIXAR_STRESS | NOT_RUN |
| SCENE_RERENDER | PARTIAL |
| RODE_LOPER | NOT_RUN |
| VIDU_MOTION | NOT_RUN |
| AUDIO_FINAL_MIX | NOT_RUN |
| DUCKING | NOT_RUN |
| SFX_TIMING | NOT_RUN |
| HOMECHEFF_E2E | NOT_RUN |
| EXISTING_VIDEO_PROTECTION | PARTIAL (prior GAP2) |
| QUICK_VIDEO_REGRESSION | WORKING |
| MOBILE_ADVANCED | NOT_RUN |
| PROJECT_CONTINUITY | PARTIAL |
| FINISH | PARTIAL |
| I18N | WORKING |
| ACCESSIBILITY | NOT_RUN |
| PERFORMANCE | NOT_RUN |
| BILLING_SAFETY | WORKING |
| FULL_PRODUCT_CERTIFICATION | **BLOCKED** |

---

## Remaining blocking defects only

1. **P1 BLOCK-04** — Authenticated Production scenarios A/C/G not executed. Repair: signed-in cert session + scripts. Risk: low.  
2. **P1 BLOCK-05** — Vidu + final audio mix evidence missing. Repair: budgeted Vidu×2 + one mix export. Risk: medium.  
3. **P1 BLOCK-06** — Physical iPhone advanced smoke missing. Repair: connect device / CDP. Risk: low.  

**Smallest repair slice:** `FULL_STUDIO_CERT_AUTHED_PRODUCTION_CLOSEOUT` (do not start automatically).
