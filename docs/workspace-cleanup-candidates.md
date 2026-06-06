# Workspace Cleanup Candidates

**Date:** 2026-06-05  
**Rule:** No removals without evidence and green CI.

---

## SAFE TO REMOVE

| Item | Path | Evidence |
|------|------|----------|
| `StudioPlaceholderPage` | `src/components/studio/studio-placeholder-page.tsx` | Zero imports in `src/` |
| Duplicate `instant.recover.notCompleted` UI | removed from `videos/[id]/page.tsx` | Replaced by `RenderActivityStatusCard` (prior sprint) |

---

## INVESTIGATE

| Item | Path | Notes |
|------|------|-------|
| Legacy `/animate` routes | `src/app/animate/page.tsx`, `[id]/page.tsx` | Still reachable; not in primary nav |
| Storyboard-level director panels when using Workspace | `studio-storyboard-editor.tsx` ~694–755 | Hide behind workspace-first UX or collapse by default |
| `/animate/instant/progress` | `src/app/animate/instant/progress/page.tsx` | Overlaps `/videos/[id]` recovery |
| `studio-audio-asset-library.tsx` vs `studio-asset-library.tsx` | Two asset UIs | Consolidate when audio registry matures |
| Director V1 compose form | `studio-scene-composer.tsx` | Keep until Director V2 default rollout |
| `NEXT_PUBLIC_STUDIO_DIRECTOR_V2` flag | `studio-director-v2-flag.ts` | Workspace bypasses flag; classic editor still uses it |

---

## KEEP

| Item | Reason |
|------|--------|
| Handoff version migrations (v13–v25) | Production imports depend on compat |
| `legacy-project-detail-shell.tsx` | Old `/animate/[id]` bookmarks |
| Movie builder + production center | Distinct prep flows; linked from workspace |
| Full storyboard editor | Power-user / classic mode via workspace link |
| Provider cost / billing event dedup | Financial integrity |

---

## Recommended next cleanup (post-workspace)

1. Default new storyboard opens in `/studio/workspace?storyboardId=`
2. Collapse storyboard editor global panels into workspace inspector tabs
3. Redirect `/animate` → `/animate/instant` with 302
4. Enable Director V2 by default after QA on workspace path
