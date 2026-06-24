# HomeCheff Studio — P0 Production Reality Fix Report

**Sprint goal:** One sentence in → one video out. Hide Motion/Publish infrastructure from production users.

**Production readiness score:** **7/10** (up from 4/10 audit baseline)

| Area | Before | After |
|------|--------|-------|
| Long-form execution | UI-only batch plan | Server batch render + FFmpeg merge + blob URL |
| Asset persistence | Analyzed then discarded | Upload → HC persisted asset chain |
| Billing | Triple-charge risk | Single `ProductionTransaction` reservation + one capture |
| Motion visibility | Exposed in nav/handoff | Renamed to Animation / hidden in production shell |
| Publish visibility | "Publish" everywhere | "Finish Video" + `autoFinish` deep link |
| Project continuity | `finalVideoUrl` often missing | Writeback at merge + finish |
| Photo movie | No photo collect | Upload + `PhotoMoviePlan` + scene assign |
| Music video | Plan ≠ render duration | Scene duration from audio / batch execution |
| Export | Silent success on mux fail | Fail when requested audio missing (video overlay path) |
| Copilot | Raw action IDs | Human descriptions + "Create Video" CTA |

---

## Files changed (summary)

### New libraries
- `src/lib/studio-production-transaction.ts` — billing chain helpers
- `src/lib/studio-production-batch-plan.ts` — client-safe batch planning
- `src/lib/studio-production-batch-executor.ts` — server FFmpeg merge
- `src/lib/studio-production-video-merge.ts` — segment concat
- `src/lib/studio-production-continuity.ts` — HC project writeback
- `src/lib/studio-photo-movie-plan.ts` — photo → duration/batch plan
- `src/lib/studio-orchestrator-asset-persist.ts` — persist uploads to HC
- `src/lib/studio-production-handoff-filter.ts` — batch scene filtering
- `src/lib/studio-production-poll-client.ts` — poll Motion project completion
- `src/lib/studio-production-request-headers.ts` — `x-production-transaction-id`

### New server
- `src/server/studio/studio-production-batch-render.ts` — headless batch Motion create
- `src/server/studio/studio-photo-scene-assign.ts` — photo → storyboard scenes

### New API routes
- `POST /api/studio/orchestrator/upload-asset` — persist PHOTO/MUSIC/LOGO/VIDEO/etc.
- `POST /api/studio/orchestrator/execute` — advance batch / merge / complete + capture
- `POST /api/studio/orchestrator/render-batch` — server-side Motion batch render
- Existing `POST /api/studio/orchestrator/run` — reserve only, batch plan, production state

### New UI routes
- `/studio/production` — production shell (no Motion terminology)

### Modified (high impact)
- `src/components/studio/studio-production-orchestrator-panel.tsx` — collect uploads, production redirect
- `src/components/studio/studio-production-shell.tsx` — real batch loop (render → poll → merge → finish)
- `src/components/publish/publish-product-page.tsx` — `autoFinish=1` hydration
- `src/components/assistant/assistant-chat-panel.tsx` — copilot invisibility
- `src/app/api/instant-premium/create-and-generate/route.ts` — production billing bypass
- `src/app/api/publish/export/route.ts` — production billing bypass
- `src/server/studio-account/bill-provider-action.ts` — production chain bypass
- `src/server/publish/publish-video-export-service.ts` — fail on audio mux failure
- `src/i18n/locales/en.ts`, `nl.ts` — Motion→Animation, Publish→Finish Video
- `src/types/studio-video-production.ts` — `ProductionTransaction`, `PhotoMoviePlan`, lifecycle states

### Tests added
- `src/lib/studio-photo-movie-plan.test.ts`
- `src/lib/studio-production-handoff-filter.test.ts`
- Updated `src/lib/homecheff-product-suite.test.ts` for new nav labels

---

## Routes changed

| User-facing | Internal (kept) |
|-------------|-----------------|
| `/studio/start` → orchestrator | Motion routes unchanged |
| `/studio/production` → batch pipeline | `/animate/instant/*` still exists |
| `/publish/start?autoFinish=1` → Finish Video | `/publish/*` aliases kept |

---

## Validation matrix

| Scenario | Status | Notes |
|----------|--------|-------|
| A — MP3 + music video | **Partial** | Plan + batches wired; needs E2E with Vidu worker |
| B — 20 photos travel movie | **Partial** | Photo upload + plan + assign; render needs scene images |
| C — Character commercial | **Partial** | Character attach + Create Video CTA from prior sprint |
| D — Product + logo commercial | **Partial** | Logo/product collect + cost lines; analysis gated on upload |
| E — MP4 edit (subs/branding/voice) | **Partial** | Video upload persists; publish `autoFinish` opens finish |

**E2E blocked by:** Vidu/test-mode worker availability in local env (not a code gap for batch loop).

---

## Billing chain validation

```
Studio orchestrator run
  → authorizeStudioAction (studio_orchestrator_production) — RESERVE only
  → ProductionTransaction created
Motion render-batch / create-and-generate
  → x-production-transaction-id → bypass motion_render charge
Publish export
  → x-production-transaction-id → bypass publish export charge
Execute complete
  → captureStudioActionReservation once
```

No duplicate capture on Motion batches when production header present.

---

## Asset persistence validation

Upload path: `POST /api/studio/orchestrator/upload-asset` → Vercel blob → `HcPersistedProductionAsset` on HC project.

Kinds supported: `photo`, `photos`, `music`, `voice`, `video`, `logo`, `product_image`.

Music persisted to storyboard on run. Photos assigned to scenes before render.

---

## Long-form / music video validation

- `buildRenderBatchPlanForOrchestrator` drives batch count from `musicVideoPlan`, `longFormPlan`, `photoMoviePlan`
- Production shell: advance → `render-batch` → poll `finalVideoUrl` → segment → merge → blob upload → finish
- FFmpeg merge uploads public URL (not local path)

---

## Export validation

- Video overlay export fails when music mux requested but fails
- `autoFinish=1` opens publish wizard at export step with video preloaded

---

## Remaining gaps (P1)

1. Full motion handoff i18n sweep (`motion.handoff.*` strings still say Motion in places)
2. Copilot auto-start without button click
3. Publish production config auto-mux orchestrator music without re-upload
4. MP4 edit pipeline in orchestrator (video asset → publish edit flow)
5. Live E2E validation against Vidu worker in staging

---

## Build / test

- **Build:** pass
- **Tests:** 4517/4517 pass
