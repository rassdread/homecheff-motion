# HOMECHEFF STUDIO — AUTHENTICATED PRODUCTION CERTIFICATION CLOSEOUT REPORT

**Slice:** `FULL_STUDIO_CERT_AUTHED_PRODUCTION_CLOSEOUT`  
**Date:** 2026-08-22  
**Final verdict:** **`STUDIO_FULL_PRODUCT_CERTIFICATION_BLOCKED`**

---

## 1. Executive verdict

Authenticated Production closeout **partially advanced** non-provider surfaces (HomeCheff attach, S2H library, S2G Finish hub, Quick Video smoke, provider-visual probes from prior slice) but **cannot certify** full product because **paid Production provider scenarios remain blocked** on the certification account: **0 Studio credits**, **not Studio admin**, credit gate returns `free_account_provider_action` even with `INSTANT_PREMIUM_MODE=test`. Real Vidu (Rode loper), Pixar stress, and final audio export were **not executed on Production**.

---

## 2. Production release verified

| Signal | Result |
|--------|--------|
| URL | https://studio.homecheff.eu |
| S2H `/projects` | Mijn projecten ✓ |
| S2G Finish (`stage=finish`) | Afronden loads ✓ |
| S2F stage i18n (prior) | Deployed ✓ |
| image[] hotfix | `0512021d` (prior slice) ✓ |
| Test suite at release | 5238/5238 ✓ |

---

## 3. Authentication setup

| Field | Value |
|-------|-------|
| Profile | `.px4a7-prod-profile` |
| HC role | SUPERADMIN seller |
| Studio plan | free, 0 credits |
| Studio admin | **No** (credit gate applies) |
| Session | Authenticated (200 on gated APIs) |

Secrets not exposed. See `AUTHED-PREFLIGHT.json`.

---

## 4. Remaining blockers entering phase

- P1-A Rode loper + real Vidu  
- P1-B Pixar + scene 5 rerender  
- P1-D Real final audio MP4 + ducking  
- P1-E Physical iPhone (device unavailable)  

---

## 5. Provider call budget

See `PROVIDER-CALL-BUDGET.md`. Hard caps enforced in runner; run stopped at 0 paid calls due to 403 gate.

---

## 6. Actual provider calls / cost

See `PROVIDER-CALLS-ACTUAL.md`. **Production spend: $0.** Prior local OpenAI visual probes: ~8 image calls.

---

## 7. Scenario A Rode loper

**BLOCKED** at `create-and-generate` (403). Wizard preset visible with injected prefill. See `SCENARIO-A-RODE-LOPER.md`.

---

## 8. Rode loper Vidu

**NOT_RUN**

---

## 9. Rode loper Continue

**NOT_RUN** (no completed motion project)

---

## 10. Scenario C Pixar stress

**NOT_RUN** — storyboard API validation + credit gate. See `SCENARIO-C-PIXAR.md`.

---

## 11–16. Consistency gates

All **NOT_RUN** (no real multi-scene Production generation).

---

## 17–19. Scene 5 rerender / version safety

**NOT_RUN**

---

## 20–24. Final audio export / ducking / SFX / ambience / subtitles

**NOT_RUN**. See `AUDIO-FINAL-EXPORT.md`.

---

## 25. Scenario G HomeCheff

**WORKING** — px4a5 flows A–D PASS (2026-08-22). GAP2 Flow C PASS. See `SCENARIO-G-HOMECHEFF.md`.

---

## 26. Existing-video protection

**WORKING** (px4a5 Flow C).

---

## 27. S2G Production Finish

**WORKING** on existing storyboard (`Afronden` hub loads, 0 provider calls on open).

---

## 28. S2H Production Projects

**WORKING** — library authenticated, cards visible.

---

## 29. Returning-user loop

**PARTIAL** — not re-validated end-to-end this slice; prior S2H unit tests green.

---

## 30. Physical iPhone

**NOT_RUN** — no device. See `IPHONE-ADVANCED.md`.

---

## 31. iPhone landscape

**NOT_RUN**

---

## 32. Quick Video smoke

**WORKING** — composer present, growth hidden.

---

## 33. NL/EN

**PARTIAL** — NL default on cert account; deep workspace i18n not re-audited.

---

## 34. Provider-call safety

**PASS** — bounded; no runaway calls.

---

## 35. Billing safety

**PASS** — no erroneous debits; gate blocked unpaid actions.

---

## 36. Defect fixes made

None this slice (cert-only). Prior slice: OpenAI `image[]` P0 fix shipped.

---

## 37. Provider limitations

Prior slice: OpenAI outfit/location/product probes **PASS** when called with correct payload (local/direct API).

---

## 38. P0 / P1 / P2

| ID | Severity | Issue |
|----|----------|-------|
| B1 | **P1** | Cert account cannot invoke Production paid providers (credit gate) |
| B2 | **P1** | Rode loper Vidu NOT_RUN |
| B3 | **P1** | Pixar / rerender NOT_RUN |
| B4 | **P1** | Final audio export NOT_RUN |
| B5 | **P1** | iPhone NOT_RUN (device) |
| P2-1 | P2 | Motion hub `prefill=` vs wizard `prefillId=` param mismatch |
| P2-2 | P2 | px4a5 Flow E mobile chip visibility (automation) |

No P0 product defects evidenced.

---

## 39. Updated scorecard

| Category | Score |
|----------|------:|
| First 10 seconds | 7.5 |
| Beginner usability | 7.0 |
| Mobile usability | 6.5 |
| Desktop usability | 8.0 |
| Preset usability | 6.0 |
| Character consistency | 7.5* |
| Location consistency | 7.5* |
| Product/logo consistency | 7.5* |
| Motion quality | N/R |
| Audio coherence | N/R |
| Rerender safety | N/R |
| Finish clarity | 8.5 |
| Project continuity | 8.0 |
| HomeCheff integration | 8.5 |
| Trust | 7.5 |
| Performance | 7.5 |
| Power-user capability | 7.0 |

\*From prior provider-visual probes only, not Production multi-scene.

**Overall: 7.2/10** — below 7.5 threshold due to blocked core scenarios.

---

## 40. Core promise answers

| # | Promise | Answer |
|---|---------|--------|
| 1 | Same character recurs | **PARTIAL** (probe evidence) |
| 2 | Outfit change w/o identity swap | **PARTIAL** |
| 3 | Location change, identity remains | **PARTIAL** |
| 4 | Product/logo protected | **PARTIAL** |
| 5 | Preset continue without reupload | **NOT_RUN** |
| 6 | Scene rerender safe | **NOT_RUN** |
| 7 | Vidu acceptable | **NOT_RUN** |
| 8 | Final audio tracks | **NO** |
| 9 | Ducking in export | **NO** |
| 10 | Finish without jargon | **YES** |
| 11 | Return via Mijn projecten | **YES** |
| 12 | HomeCheff attach safe | **YES** |
| 13 | iPhone advanced usable | **NOT_RUN** |

---

## 41. PX.5 decision

**Do not start PX.5.** Certification gaps supersede any PX.5 planning.

---

## 42. Next recommended phase (one only)

**`CERT_ACCOUNT_PRODUCTION_PROVIDER_ACCESS`** — Grant the existing certification account either (a) Studio `admin` role **or** (b) bounded promotional credits on Production, then re-run **only** blocked scenarios A, C, D, E with existing budgets. No feature work.

---

## 43. Production recommendation

**Do not declare full product certified.** Safe for: Quick Video + HomeCheff attach + S2G/S2H navigation. **Not certified for:** authenticated Rode loper Vidu, Pixar consistency, final audio mix, physical iPhone.

---

## 63. Classification matrix

| Key | Status |
|-----|--------|
| AUTH_PRODUCTION | WORKING |
| RODE_LOPER | BLOCKED |
| RODE_LOPER_VIDU | NOT_RUN |
| PRESET_CONTINUE | NOT_RUN |
| PIXAR_STRESS | NOT_RUN |
| CHARACTER_A_CONSISTENCY | NOT_RUN |
| CHARACTER_B_CONSISTENCY | NOT_RUN |
| WARDROBE_CONTINUITY | NOT_RUN |
| LOCATION_CONTINUITY | NOT_RUN |
| PRODUCT_PROP_CONTINUITY | NOT_RUN |
| MULTI_CHARACTER | NOT_RUN |
| SCENE_RERENDER | NOT_RUN |
| VERSION_SAFETY | NOT_RUN |
| FINAL_AUDIO_EXPORT | NOT_RUN |
| DUCKING_REAL_OUTPUT | NOT_RUN |
| SFX_REAL_OUTPUT | NOT_RUN |
| AMBIENCE_REAL_OUTPUT | NOT_RUN |
| SUBTITLE_TIMING | NOT_RUN |
| HOMECHEFF_E2E | WORKING |
| EXISTING_VIDEO_PROTECTION | WORKING |
| S2G_FINISH_PRODUCTION | WORKING |
| S2H_PROJECTS_PRODUCTION | WORKING |
| RETURNING_PROJECT | PARTIAL |
| PHYSICAL_IPHONE | NOT_RUN |
| IPHONE_LANDSCAPE | NOT_RUN |
| QUICK_VIDEO_REGRESSION | WORKING |
| PROVIDER_CALL_SAFETY | WORKING |
| BILLING_SAFETY | WORKING |
| FULL_PRODUCT_CERTIFICATION | **BLOCKED** |

---

## 66. Final verdict

**`STUDIO_FULL_PRODUCT_CERTIFICATION_BLOCKED`**

### Unresolved blockers

1. **Production provider access for cert account** — P1 — evidence: 403 on create-and-generate — smallest repair: admin role or promo credits — scenarios A/C/D  
2. **Real Vidu Rode loper** — P1 — NOT_RUN — depends on #1  
3. **Pixar + rerender** — P1 — NOT_RUN — depends on #1  
4. **Final audio MP4** — P1 — NOT_RUN — depends on #1  
5. **Physical iPhone** — P1 — NOT_RUN — connect device + CDP smoke  

---

*Evidence tree: `docs/audits/full-studio-cert/` · Runner: `scripts/_full-studio-authed-closeout.ts` · Live JSON: `AUTHED-CLOSEOUT-LIVE.json`*
