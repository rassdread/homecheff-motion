# Studio Creative Workflow (S.3)

**Status:** CANONICAL (UX model)  
**Shell:** Adaptive Workspace (S.2) — do not redesign  
**Route:** ADR-STUDIO-003 — `/studio?storyboardId=`

---

## Canonical stages (UX, not DB enums)

| Stage | Meaning | Typical entry |
|-------|---------|---------------|
| **IDEA** | Describe what to make | `/studio/start` idea / orchestrator brief |
| **SETUP** | Empty project / plan | No scenes yet |
| **BUILD** | Shape story & scenes | Story tool with scenes |
| **EDIT** | Media, voice, text, audio | Visual / Voice / Text / … |
| **PREVIEW** | Review before render | Insights / creative review |
| **RENDER** | Produce video output | Render / Versions tools + Make video |
| **EXPORT** | Download / deliver | Export / Translate tools |

Inference: `src/lib/studio-creative-workflow.ts` → `inferStudioCreativeStage`.

---

## End-to-end path

```
Idea → Project → Scenes → Media → Voice / Audio / Text → Edit → Preview → Render → Export
```

Users should not need Studio’s internal architecture (storyboard entity, tool IDs, drawers).

---

## User journeys (certified targets)

| Journey | Entry | Primary path |
|---------|-------|--------------|
| **A. New project** | Home `/studio/start` → New story / Create video | Name optional → workspace → first scene CTA |
| **B. Existing project** | Continue / Stories list → workspace | Place restore (scene + tool) in session |
| **C. Image-first** | Select scene → Visual → Generate / upload | Credit estimate before generate |
| **D. Video-first** | Make video / Motion handoff | Scene image ≠ project render |
| **E. Voice-over** | Voice tool → enable → generate TTS | Project-level voice; credit estimate |
| **F. Subtitles** | Post → Subtitles (requires voice enabled) | Soft gate + scope hint |
| **G. Render/export** | Render / Export tools + header Make video | Formats only when Motion output exists |
| **H. Resume** | Reopen same storyboard | Scenes + media from server; scene/tool from session place |

---

## Scene contract

Scenes are the building blocks. Workspace must keep:

- **selection** coherent across left rail, center, inspector, tools
- **order** persisted (`reorderStudioScenesApi`); up/down in sidebar
- **tool context** stable when changing scenes (do **not** reset tool to Story)

---

## Place persistence

`src/lib/studio-workspace-place.ts` — sessionStorage `{ sceneId, tool }` per storyboard.  
Restored **once** on first successful load; later reloads preserve in-memory selection.

---

## Credit transparency

Paid actions show estimate **before** charge using SHARED_PURE display constants (`studio-credit-constants.ts`), aligned with `STUDIO_ACTION_COST_REGISTRY` reserved USD. Server remains authoritative.

---

## Future handoff contracts (document only)

### HomeCheff listing → Studio

Suggested query/body contract (not implemented):

- `listingId`, `brandId`, `productTitle`, `productImageUrls[]`, `locale`, `returnUrl`

### Growth → Studio

- `leadId` / `companyId`, `campaignGoal`, `brandAssets[]`, `locale`, `returnUrl`

---

## Classic / Advanced editor

Advanced-gated parallel at `/studio/storyboards/[id]/classic`. Label: **Advanced editor**. Default users stay on Adaptive Workspace.

---

## Generation UX lifecycle

Mapped from existing backend status strings (no new DB enums):

`ready → queued → generating → processing → completed | failed | cancelled`

UI chrome: `StudioGenerationStatusChrome`. Retry available on failed contextual generations without rebuilding the scene.

## Edit vs Preview

Workspace view mode:

- **Edit** — tools, inspector, tool strip  
- **Preview** — reduced chrome, enlarged scene composition, immediate Back to edit  

## Audio ownership (UX)

| Layer | Scope |
|-------|--------|
| Voice track | Project narration / character speech |
| Project music | Whole-project background |
| Scene sound | SFX planned for selected scene |

## Scene reorder

Persisted via `reorderStudioScenesApi`. Server uses two-phase order updates to respect `@@unique([storyboardId, order])`.
