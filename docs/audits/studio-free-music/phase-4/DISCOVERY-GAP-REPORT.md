# HOMECHEFF STUDIO — FREE MUSIC PHASE 4 DISCOVERY & GAP REPORT

**Generated:** 2026-08-30  
**Mode:** Discovery only — no implementation  
**Authoritative Phase 3R baseline:** `HOMECHEFF_STUDIO_FREE_MUSIC_PHASE_3_COMPLETE`  
**Production SHA:** `d62cd56d90eb08c64c51a13d68090cdceff20b25`  
**Deployment:** `dpl_9FEPGB7CJRkKSke5MXtULvDNSy2r`

---

## 1. Existing Phase 4 contract (repository evidence)

Primary source: `docs/audits/studio-free-music/phase-3/PHASE-4-READINESS.md`

**Named scope:** **FREE MUSIC PUBLIC ACTIVATION + POST-LAUNCH OBSERVABILITY**

Explicit Phase 4 items:

1. PO flips `STUDIO_FREE_MUSIC_CATALOG_ENABLED=true`
2. Publish FAQ/legal/SEO pack
3. Production smoke (anonymous blocked, authenticated catalog)
4. Monitor preview/render errors
5. Content ID incident intake operational
6. Catalog usage analytics
7. Kill switch rollback proof
8. 24h / 72h post-launch checks

**Explicitly out of Phase 4:**

- Rebuild music architecture
- New source discovery
- CC BY introduction
- Pixabay / Mixkit / YouTube Audio Library

Supporting evidence:

- `phase-3/PHASE-3-FINAL-REPORT.md` § Phase 4 readiness
- `phase-3/LEGAL-FAQ-SEO-ACTIVATION-PACK.md` — READY_FOR_PO_APPROVAL, not published
- `phase-3r/PHASE-4-READINESS.md` — READY; do not enable catalog without Phase 4 plan
- `phase-3r/RENDER-ARCHITECTURE-APPLICABILITY.md` — Free Music wired to Quick Video FREE_LOCAL only

There is **no** separate Phase 4 architecture doc requiring Story/S2E/Motion Free Music wiring.

---

## 2. Certified Phase 3R baseline (frozen)

| Item | State |
|---|---|
| Masters | 55/55 Production Blob |
| Registry | ACTIVE 55 / DRAFT 0 |
| FREE_LOCAL Chromium/Safari/iPhone | PASS |
| Persistence track/volume/offset | PASS |
| Offset prior fail | `IPHONE_OFFSET_TEST_ARTIFACT` |
| Pilot | REMOVED |
| Public catalog | OFF |
| Steve | `enabled:false`, `tracks:[]`, preview 403 |
| Anonymous | 401 |

Do not reopen Phase 3R certification.

---

## 3. Current Free Music architecture

```
registry.json (55 CC0 ACTIVE)
  → admit-track (fail-closed)
  → flag.ts (public OR pilot allowlist)
  → GET /api/studio/free-music/catalog
  → GET /api/studio/free-music/asset/{id}?kind=preview|master
  → PhotoVideoFreeMusicBrowser + MusicPanel (Quick Video)
  → composition.audio.kind === "catalog"
  → draft persistence (trackId identity, no objectUrl)
  → FREE_LOCAL export (fetch master server-side)
```

Kill switches default OFF. No second catalog system. No paid provider in the music path.

---

## 4. Current 55-track catalog architecture

| Field | Value |
|---|---|
| Source | OpenGameArt CC0 |
| ACTIVE / DRAFT | 55 / 0 |
| attributionRequired | false for all 55 |
| attributionText | null for all 55 |
| contentIdRisk | UNKNOWN for all 55 |
| Categories | CHILL(35), LIFESTYLE(8), AMBIENT(4), SOCIAL(3), UPBEAT(3), CINEMATIC(1), CORPORATE(1) |
| Public API fields | id, title, artist, category, mood, durationSeconds, previewUrl, licenseDisplay, attributionRequired, contentIdNotice |
| Secrets excluded | storage keys, evidence, review notes |

---

## 5. Current Quick Video integration

**ALREADY_SUPPORTED** (certified).

- Surface: `/studio/photo-video` (+ item handoff / Start from HomeCheff)
- UI: Free Music browser (search + category), music panel (waveform offset, volume), mutual exclusion with own music
- Export: FREE_LOCAL only — do not migrate to server render
- i18n: `px4a.freeMusic.*` NL/EN present

---

## 6. Current Story / S2E integration

**NOT_APPLICABLE to repository Phase 4 contract.**

- S2E Unified Audio timeline exists (`studio-s2e-audio-timeline`)
- **Zero** Free Music / catalogTrackId wiring in S2E components
- Phase 3 render applicability: Motion/Instant/server render **out of scope**
- Wiring Free Music into Story would be a **new product phase**, not the written Phase 4 activation scope

Classification for Studio-wide audit:

| Workflow | Classification |
|---|---|
| Quick Video / Photo Video | ALREADY_SUPPORTED |
| Start from HomeCheff item → Quick Video | ALREADY_SUPPORTED (same composer) |
| Project reopen (QV draft) | ALREADY_SUPPORTED |
| Afronden / Finish (QV export) | ALREADY_SUPPORTED |
| Story Workspace / S2E Geluid | NOT_APPLICABLE (Phase 4 contract) |
| Director / Director V2 | NOT_APPLICABLE |
| Motion / Instant Premium | NOT_APPLICABLE |
| Product / Social / Promo Video (non-QV) | NOT_APPLICABLE unless they reuse QV composer |
| Project Library | NOT_APPLICABLE (no Free Music surface) |

---

## 7. Current entitlement / gating model

`src/lib/free-music/flag.ts`:

- `STUDIO_FREE_MUSIC_CATALOG_ENABLED` → all authenticated users
- OR `STUDIO_FREE_MUSIC_PILOT_ENABLED` + `STUDIO_FREE_MUSIC_PILOT_USER_IDS` allowlist
- Anonymous: auth required on catalog/asset APIs
- No subscription / plan / credit entitlement in Free Music flags
- **Pricing/billing changes not required** by Phase 4 contract

Controlled rollout path already exists: re-enable pilot for Steve → smoke → then public flag → remove pilot.

---

## 8. Current licensing / attribution model

| Fact | Evidence |
|---|---|
| All 55 CC0 | registry |
| No attribution required | `attributionRequired: false` × 55 |
| HomeCheff does not own music | FAQ pack + registry sources |
| Content ID residual risk | `contentIdNotice` on public track; FAQ prohibits “claim free” |
| Legal pack | Ready, **unpublished** until PO activation |

UX already shows licence display in browser rows. Deeper FAQ/SEO publish is Phase 4.

---

## 9. Current UX

Exists and was pilot-certified on Quick Video:

- Search, category filter, preview play/pause, select/selected, loading/empty/error
- Volume 0–100 UI → internal 0–1
- Offset via waveform canvas (seconds)
- Replace/remove via own-music / none paths
- Touch targets min-h-11

Gaps vs “feels like normal Studio capability” under **public** use:

- Catalog gated OFF — users see empty/unavailable messaging
- `contentIdNotice` string is English hardcoded in `toPublicCatalogTrack` (i18n debt)
- No published in-product FAQ entry points yet
- 55-track list UX not production-smoked after expansion (pilot used 5)

---

## 10. Current mobile behavior

Phase 3R physical iPhone: **PASS** for unchanged components.  
Phase 3 performance doc: mobile/desktop load tests were PARTIAL / NOT_RUN for 55.

Reuse iPhone evidence unless Phase 4 changes mobile-critical UI.

---

## 11. Current performance behavior

Design (already implemented):

- Metadata-only catalog list
- Preview `preload="none"`; one Audio element at a time
- No master preload of 55 files
- Export fetches master on demand

Unproven under public 55:

- Catalog JSON payload size / first-load latency on Production
- Repeated preview switching on mobile Safari with 55 rows

Optimize only if measured bottlenecks appear.

---

## 12. Gap matrix

| CAPABILITY | CURRENT PROD | PHASE 4 EXPECTED | GAP | RISK | REQUIRED CHANGE | TEST |
|---|---|---|---|---|---|---|
| 55 masters ACTIVE | PASS | PASS | none | low | none | reuse Phase 3R |
| FREE_LOCAL QV | PASS | PASS | none | high if touched | freeze | regression guards |
| Persistence / offset | PASS | PASS | none | high if touched | freeze | regression |
| Public catalog flag | OFF | ON (staged) | **ROLLOUT** | med | env flip + staged cert | auth smoke |
| Pilot path | OFF | optional bounded re-enable | **ROLLOUT** | low | temp env for cert | Steve 55 |
| FAQ/legal/SEO publish | draft ready | published | **DOC/PRODUCT** | med | publish pack + FAQ routes/copy | content review |
| Prod smoke (public ON) | not run | pass | **CERT** | med | run matrix | anon/auth/preview |
| Kill-switch rollback | defaults OFF proven | prove public→OFF | **CERT** | med | drill | catalog empty |
| Preview/render error monitoring | none dedicated | operational | **MISSING ops** | med | logging/alerts | manual/ops |
| Content ID incident intake | none formal | operational | **MISSING ops** | med | runbook + contact path | doc |
| Catalog usage analytics | none Free Music–specific | basic usage | **MISSING** | low | minimal events | unit |
| QV UX for 55 | built | polished if needed | **PARTIAL product** | low | measure then tweak | desktop/Safari |
| contentIdNotice i18n | EN hardcoded | NL/EN keys | **PRODUCT** | low | i18n keys | i18n test |
| S2E Free Music | none | not in Phase 4 contract | **N/A** | — | defer | — |
| Schema | registry JSON | same | none | — | **no schema** | — |
| Pricing/credits | unused by FM | unused | none | — | **no billing** | zero-call audit |

### Bucket summary

**ALREADY COMPLETE:** catalog/masters, admission, flags model, QV FREE_LOCAL, browser UX core, persistence, security under gated OFF, legal draft pack, economic isolation design.

**PARTIAL:** 55-track Production UX/perf smoke; performance/a11y docs; i18n for contentId notice; observability.

**MISSING:** public activation (PO), published FAQ/SEO, formal Content ID intake, catalog analytics, post-launch 24h/72h checks, public-ON kill-switch drill.

**NOT APPLICABLE:** new architecture, new providers, CC BY, S2E/Motion Free Music wiring (for this Phase 4), schema migrations, subscription entitlements.

### Gap types

| Type | Items |
|---|---|
| PRODUCT GAP | Soft UX/i18n polish for 55; optional trust copy surfacing |
| ROLLOUT GAP | Staged `CATALOG_ENABLED` / temporary pilot; PO decision |
| CERTIFICATION GAP | Public-ON smoke, rollback drill, 24h/72h, iPhone only if UI changes |
| DOCUMENTATION GAP | Publish legal/FAQ/SEO; Phase 4 audit folder; ops runbooks |

---

## 13. Already-complete items

Do not rebuild: masters, registry, admit, blob paths, QV browser/panel, FREE_LOCAL encode, draft persistence, kill switches, pilot allowlist mechanism, spoof protection, mutual exclusion, iPhone-certified interaction model.

---

## 14. Actual missing Phase 4 items

1. Explicit PO public-activation decision  
2. Staged Production enablement (pilot → public)  
3. Publish legal/FAQ/SEO activation pack  
4. Public-ON Production smoke + security  
5. Kill-switch rollback proof under public ON  
6. Minimal catalog usage analytics  
7. Content ID incident intake runbook  
8. 24h / 72h post-launch checks  
9. Optional: i18n `contentIdNotice`; 55-list UX/perf fixes **only if measured**

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| Global ON without staged pilot | Use existing pilot flags first |
| Leaving pilot on | Safe-state restore checklist |
| Touching FREE_LOCAL / QV “cleanup” | Freeze certified paths |
| Scope creep into S2E/Motion | Defer; not in Phase 4 contract |
| Overclaiming Content ID safety | Keep FAQ prohibited claims |
| 55-track UX regression | Measure payload/preview before UI work |

---

## 16. Proposed minimal implementation sequence

1. Create Phase 4 audit scaffold (this report)  
2. Optional small product fixes only if proven: i18n contentIdNotice; trust copy  
3. Add minimal catalog usage analytics (open/preview/select) — no PII  
4. Draft Content ID incident runbook  
5. Publish FAQ/legal/SEO pack behind PO  
6. **Do not** enable public flag until certification sequence passes  

No schema. No billing. No new providers. No S2E audio engine work.

---

## 17. Proposed certification sequence

1. Local unit/integration (flags, catalog 55, i18n, analytics)  
2. Production internal: temporary Steve pilot ON, public OFF → 55-track QV smoke  
3. Desktop Chromium Production verification  
4. Safari desktop verification  
5. Physical iPhone **only if** mobile-critical UI changed  
6. Non-pilot / anonymous security  
7. Billing/provider zero-call audit  
8. Kill-switch rollback (public ON → OFF)  
9. PO public ON  
10. 24h / 72h checks  
11. Remove temporary pilot; confirm safe/public intended state  

---

## 18. Schema changes required?

**No.** Registry JSON + Blob keys + draft `catalog` audio kind already represent the Phase 4 activation contract.

---

## 19. Pricing / billing changes required?

**No.** Free Music gating is feature-flag based, not plan/credit based. Catalog/preview/select/save must remain zero generation-credit.

---

## 20. Exact recommended Phase 4 implementation boundary

**In scope**

- Controlled Production activation of existing Free Music on **Quick Video**
- Publish prepared legal/FAQ/SEO pack
- Observability: error monitoring hooks, minimal usage analytics, Content ID intake runbook
- Staged cert + kill-switch rollback proof
- Minimal product polish strictly needed for public 55-track experience (measure-first)

**Out of scope**

- Phase 3R re-cert / architecture redesign
- Story/S2E/Director/Motion Free Music integration
- New music sources or licence classes
- Schema migrations
- Subscription/pricing semantics
- Migrating Quick Video off FREE_LOCAL

---

## Verdict

Repository Phase 4 is **activation + observability**, not a Studio-wide music redesign. Certified Quick Video Free Music is the product surface to activate. Implementation can proceed within the boundary above once PO accepts the staged rollout plan.
