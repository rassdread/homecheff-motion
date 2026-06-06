# HomeCheff Motion Studio — Production Audit

Generated: 2026-06-05 — Motion Studio scope only (Studio, Motion, Versioning, Billing, Rendering, Motion UX).

## Executive Summary

Motion Studio delivers a credible **AI production pipeline** from Studio storyboards through Instant Motion render, versioning, and recovery. Core render logic is **COMPLETE**; user-facing polish, billing visibility, and Director V2 rollout remain **PARTIAL**.

**Motion Studio Readiness: 68/100**

| Area | Status | Score |
|------|--------|-------|
| Motion Wizard (`/animate/instant`) | PARTIAL | 72 |
| Director V2 | PARTIAL (flag off) | 55 |
| Version Center | PARTIAL | 70 |
| Video Detail (`/videos/[id]`) | PARTIAL | 65 |
| Render Progress / Recovery | COMPLETE logic, PARTIAL UX | 75 |
| Billing / Usage visibility | PARTIAL | 58 |
| Studio → Motion handoff | PARTIAL | 68 |
| Language Export / Rerenders | PARTIAL | 72 |
| Motion Analytics (admin) | PARTIAL | 60 |
| Mobile Motion UX | PARTIAL | 62 |
| Legacy `/animate` stack | DEPRECATED | — |

---

## Area Classifications

### COMPLETE

- **Render recovery backend** — cancel, retry, repair, refresh provider, rebuild final (`project-render-actions.ts`, `RenderActivityStatusCard`)
- **Instant premium render pipeline** — Vidu transitions, story overlay, poster motion
- **Version catalog logic** — `motion-version-catalog`, text/full rerender versioning
- **Studio handoff payload** — v25 motion handoff with voice/music/sound/text metadata
- **Wizard persistence** — IndexedDB draft, beginner/expert modes

### PARTIAL

- **Motion Wizard** — beginner/expert flows exist; transition-mode step 2 needs clearer frame-order UX; expert panel overload
- **Director V2** — voice/music/sound/text/advanced sections behind `NEXT_PUBLIC_STUDIO_DIRECTOR_V2`; not default
- **Video Detail** — rich hub but overlapping recovery panels (`RenderActivityStatusCard` + `InstantFinalProgressPanel` + `InstantVideoRepairCard`)
- **Version Center** — `/videos/[id]/versions` with tabs; timeline/preview polish ongoing
- **Billing** — `ProviderCostEvent` / `CustomerBillingEvent` wired server-side; per-video cost on detail incomplete
- **Full rerender billing** — Vidu jobs may lack cost events
- **Studio scene costs** — scene image / vision QA costs not fully surfaced in usage dashboard
- **Handoff UX** — sync modal exists; overwrite warnings could be clearer
- **Admin analytics** — render analytics dashboard exists; story/transition mode metrics incomplete

### BROKEN

- None identified as hard blockers in production paths (typecheck test fixtures fixed in Phase 2).

### UNUSED (prod without flag/config)

- **Director V2 UI** — requires `NEXT_PUBLIC_STUDIO_DIRECTOR_V2=true`
- **Legacy `/animate`, `/animate/[id]`** — superseded by `/animate/instant` + `/videos/[id]`

### DEPRECATED

- **Legacy animation workflow** — `src/app/animate/page.tsx`, `LegacyProjectDetailShell`
- **Old director compose panels** — duplicated when V2 flag enabled without removing V1

---

## Duplicate / Confusing UX

| Issue | Location | Impact |
|-------|----------|--------|
| Triple recovery UI | `/videos/[id]` | Users unsure which card to use |
| Director V1 + V2 | `studio-scene-composer.tsx` | Duplicate voice/music when flag on |
| Progress vs Detail | `/animate/instant/progress` vs `/videos/[id]` | Two places for same render |
| Expert wizard panels | `/animate/instant` step 5 | Intelligence + audio export overload |

---

## P0 — Must fix for production confidence

1. Consolidate render recovery on video detail (single primary card, secondary collapsed)
2. Full rerender / language export → `ProviderCostEvent` + `CustomerBillingEvent`
3. Beginner wizard transition mode — clear frame-order step (not empty storyboard)
4. Per-project cost summary on video detail
5. Director V2 flag documentation + safe default path

## P1 — High value

1. Studio → Motion handoff: source/override badges on each scene
2. Version Center: status badges, safer restore confirmations
3. Cancelled render UX: credits used, costs unknown, refresh provider CTA
4. Admin analytics: story vs transition usage, success/failure ratios
5. Mobile: version center tables, wizard step nav touch targets

## P2 — Polish

1. Expert wizard: collapse advanced panels by default
2. Video detail: unified “control room” header (status, credits, provider)
3. Studio scene generation costs in usage dashboard
4. Safe removal of legacy `/animate` routes (after redirect period)
5. Director V2: enable by default after QA

---

## Navigation Map

```
Studio /studio/storyboards → handoff → /animate/instant/import
Motion Wizard              → /animate/instant
Render progress            → /animate/instant/progress
Video hub                  → /videos/[id]
Version Center             → /videos/[id]/versions
Usage / billing            → /mijn-verbruik
Admin render analytics     → /admin/render-analytics
```

---

## Sprint Changelog

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | This audit | Done |
| 2 | Typecheck green (test fixtures) | Done |
| 3–14 | Polish, billing, recovery, readiness doc | In progress |
