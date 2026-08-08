# Studio S.2 — Workspace & IA Certification (in progress)

**Branch:** `refactor/studio-s2-adaptive-workspace`  
**Base:** `9243d722` (S.1 production cert on main)

## Implemented

- Ecosystem Adaptive Workspace canon + ADR-006
- Studio IA + workspace docs + ADR-STUDIO-005
- Posture engine + robot policy gates
- Progressive tool taxonomy
- Adaptive `StudioWorkspaceShell` (rails toggle, ultrawide unconstrained, mobile landscape side tool rail, on-demand AI)
- Project context eyebrow in header
- Architecture tests

## Classic editor

KEEP — advanced-gated legacy; not deleted.

## Preview

| Field | Value |
|-------|--------|
| Deployment | `dpl_8BqawPPYkSJFWJYBP3N1z1mMtHL9` |
| URL | `https://homecheff-motion-e80m0vnly-sergio-s-projects-f7b64ee1.vercel.app` |
| Commit | `f343dcd6` |
| Status | Ready |

### Viewport posture smoke (local `next start` of same build)

| Viewport | Posture | Robot permanent | Notes |
|----------|---------|-----------------|-------|
| Ultrawide 1800 | full | false | bottom tools |
| Desktop 1280 | compact | false | |
| Laptop 1100 | compact | false | |
| Tablet portrait | focused | false | |
| Tablet landscape | compact | false | |
| Mobile portrait | mobile | false | |
| Mobile landscape | mobile | false | **side tool rail** |

Page errors: 0 · overflowX: false all viewports.

## Gates

Lint PASS · Build PASS · Tests **4614/4614** · tsc PASS

## Merge & production

| Field | Value |
|-------|--------|
| PR | [#3](https://github.com/rassdread/homecheff-motion/pull/3) MERGED |
| Merge commit | `bcbdc17726501d1bb1d40e1dfd70a1d91c944c46` |
| Merge timestamp | 2026-08-08T19:06:05Z |
| Production deployment | `dpl_7sLB5GGcTnuedFYrZ3WAU6ekscwo` |
| Production URL | `https://studio.homecheff.eu` |
| Production status | Ready |

### Production smoke

- Login / session / logout PASS (`studio_session`)
- Workspace HTML 200 on merge deploy id
- Credits preview fusion_render **25** — no drift
- Posture: mobile portrait/landscape `robot=false`; landscape side tool rail present
- Ultrawide / mobile overflowX false; pageErrors none

### Final

**S.2 Definition of Done: COMPLETE** (non-blocking: on-demand AI FAB needs an active scene; empty storyboards use tools/insights instead)

**GO FOR STUDIO S.3 — CREATIVE WORKFLOW & EDITOR UX**
