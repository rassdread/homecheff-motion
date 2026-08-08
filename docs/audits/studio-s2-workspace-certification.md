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
