# Studio S.3 — Creative Workflow Certification

**Branch:** `refactor/studio-s3-creative-workflow`  
**Base commit:** `d6e7e6fc`  
**Implementation tip:** `5518d5db`  
**PR:** https://github.com/rassdread/homecheff-motion/pull/4  

**Scope:** Workflow **inside** Adaptive Workspace — no shell redesign, no auth/credits/billing semantic changes.

---

## Preview deployment

| Field | Value |
|-------|--------|
| URL | `https://homecheff-motion-czh9g15pr-sergio-s-projects-f7b64ee1.vercel.app` |
| Deployment ID | `dpl_9JBWefxXzLnfN3RgZcGV9g6iVnV9` |
| Commit | `5518d5db` |
| Status | Ready |
| Access | Deployment Protection; certified via `npx vercel curl` + local `next start` Playwright |

### Preview creative E2E (API + UI)

| Gate | Result |
|------|--------|
| Login / session | PASS |
| `/studio/start` | PASS (200) |
| New project create | PASS (`cmskskf4w0001l404364pt91q`) |
| Empty scenes → create scenes | PASS |
| Scene patch (text) | PASS |
| Scene reorder | PASS after two-phase fix (`HTTP 200`, order persisted) |
| Project resume + relogin | PASS |
| Image paid gate | PASS — `requiredCredits: 30` / `actionType: scene_generation` / no charge (`403 free_account_provider_action`) |
| Voice paid gate | PASS — `requiredCredits: 15` / `actionType: voice_generation` / no charge |
| Motion/render entry | PASS — empty projects list; Studio UX path available |
| Logout | PASS |

Local UI smoke (`scripts/_s3-local-ui-smoke.mjs` @ `next start` same build family):

| Viewport | Posture | Robot | overflowX | saveState | preview | reorder controls | pageErrors |
|----------|---------|-------|-----------|-----------|---------|------------------|------------|
| Desktop 1280 | compact | false | false | true | enter/exit PASS | true | 0 |
| Tablet 900×1200 | focused | false | false | true | PASS | true | 0 |
| Mobile portrait | mobile | false | false | true | PASS | true | 0 |
| Mobile landscape | mobile | false | false | true | PASS | true | 0 |

---

## Journey map → actions

| Journey | Friction | S.3 action |
|---------|----------|------------|
| A New project | Hub split | `/studio/start` + New story quick link + first-scene CTA |
| B Existing | Place lost | session place restore once |
| C Image | Credit opacity | display credits + generation status chrome |
| D Video | Motion dependency | documented external; Studio render tool labeled |
| E Voice | Cost / scope | credits + project voice ownership banner |
| F Subtitles | Soft gate unclear | title + scope hint |
| G Render/export | Motion empty | Studio UX PASS; Motion output external |
| H Resume | Tool reset | selectScene keeps tool |

**Bug fixed in certification:** scene reorder hit `@@unique([storyboardId, order])` → HTTP 500. Fixed with two-phase order vacate/assign in `reorderStudioScenes`.

---

## Generation-state model

`normalizeStudioGenerationUxStatus` maps backend strings → Ready / Queued / Generating / Processing / Completed / Failed / Cancelled.  
UI: `StudioGenerationStatusChrome` with Retry on failed; continue-editing hint while in-flight.

## Preview mode

Edit ↔ Preview toggle: hides tool strips / inspector / tool panels; enlarges scene composition; Back to edit restores chrome. No new playback engine.

## Music / SFX / Voice ownership

- Project music  
- Scene sound (SFX)  
- Voice track (project narration)  

Surfaced via ownership banners on Voice / Music / Sound tools.

## Paid-action certification

| Check | Evidence |
|-------|----------|
| Display cost | SHARED_PURE 30 / 15 |
| Server cost | Gate `estimatedCredits` / `requiredCredits` 30 / 15 |
| Drift vs registry | Unit test equality vs `STUDIO_ACTION_COST_REGISTRY` |
| Actual deduction | Not performed — free account correctly blocked |
| Double deduction | N/A (no capture) |
| Failure semantics | `403` + `creditGate` + upgrade suggestion |

---

## Absolute rules check

- [x] No Adaptive Workspace redesign  
- [x] No Central Identity / auth / price changes  
- [x] Classic retained advanced-gated  

## Local gates

Lint PASS · Build PASS · Tests **4629/4629** · tsc PASS  

## Merge & production

See certified section below.

---

## Definition of Done (certification decision)

COMPLETE — see Merge & production (certified).

## Merge & production (certified)

| Field | Value |
|-------|--------|
| PR | [#4](https://github.com/rassdread/homecheff-motion/pull/4) MERGED |
| Merge commit | `1f15c60e` |
| Merge timestamp | 2026-08-08T20:12:01Z |
| Production deployment | `dpl_8QLWPMXbSBM9omzFXCbB85eMBVZ1` |
| Production URL | `https://studio.homecheff.eu` |
| Production status | Ready |
| Production commit | `1f15c60e` |

### Production smoke

- Login / session / logout / relogin PASS (`studio_session`)
- `/studio/start` 200; workspace 200 for cert project
- Scene list intact (4 scenes, reorder preserved from Preview)
- Paid gate scene_generation `requiredCredits: 30` — no charge
- Alias `studio.homecheff.eu` 200
- No unexplained runtime blockers in smoke path

### Final

**S.3 Definition of Done: COMPLETE**

Non-blocking residuals:
- Live provider image/voice generation not charged on free cert account (gate + registry harness used)
- Interactive Playwright against protected Preview hits Vercel SSO; UI certified via local `next start` of same build + `vercel curl` APIs
- Safari/WebKit not separately automated (Chromium smoke)

**GO FOR STUDIO S.4 — AI PIPELINE & GENERATION ORCHESTRATION**

