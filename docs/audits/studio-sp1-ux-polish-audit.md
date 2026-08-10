# SP.1 — UX Polish Audit

**Date:** 2026-08-10 · **Read-only**

---

## States

| State | Finding |
|-------|---------|
| Empty | Uneven — some Studio lists polish; others sparse |
| Loading | Mixed — many `Suspense fallback={null}`; workspace has text fallback |
| Error | API errors often toast/inline; public dead routes → Next 404 |

---

## Responsive

| Viewport | Finding |
|----------|---------|
| Desktop | Primary design target — strong |
| Tablet | Generally usable; suite chrome density high |
| Mobile portrait | Landing OK; workspace/copilot heavy |
| Mobile landscape | Secondary; not systematically certified |

---

## Accessibility

| Area | Finding |
|------|---------|
| Forms | Labels present on auth |
| Modals / drawers | Inconsistent focus traps / aria |
| Motion | Intentional on Universe; not reduced-motion audited here |
| Contrast | Generally professional; not WCAG-certified in this pass |

---

## Consistency & terminology

| Issue | Class |
|-------|-------|
| “Studio” vs “Motion Studio” vs “Universe” | Terminology drift |
| Editor-first home vs Studio product story | Hierarchy conflict |
| Experience Pack language rare on public UI | Product vocabulary gap |

---

## Visual polish

Public SEO and product landings look professional.  
Guided Experience Pack funnel absent → polish break at critical journey.  
Orphaned richer marketing components unused on `/`.

---

## Score

**UX polish: 3 / 5**

Credible suite UI; uneven empty/loading, a11y gaps, and broken Experience Pack journey prevent “public product complete.”
