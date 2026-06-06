# Pixar Workspace Reality Audit

**Date:** 2026-06-05  
**Method:** Codebase is source of truth — not prior audit docs.  
**Scope:** Studio, Motion, Director V2, Version Center, Billing, Analytics, Marketplace, Assets, Voice, Music, Sound, Text, Storyboards, Handoff, Render pipeline.

---

## Executive summary

HomeCheff has a **working end-to-end production path**: Studio storyboard → handoff v25 → Instant Motion wizard → Vidu render → `/videos/[id]` with recovery, billing events, and version history. What is missing is primarily **unified workspace UX** (Pixar-style single surface), **Director V2 default rollout**, and **marketplace**.

---

## 1. What exists fully

| Area | Evidence |
|------|----------|
| Studio CRUD | `/studio/characters`, `/locations`, `/props`, `/worlds` — full libraries + edit flows |
| Storyboard editor | `/studio/storyboards/[id]` — scenes, DnD, images, jobs, corrections, AI director |
| Movie builder | `/studio/storyboards/[id]/movie-builder` — guided prep + handoff link |
| Production center | `/studio/storyboards/[id]/production` — readiness scoring |
| Asset registry | `/studio/assets` — unified media asset library |
| Handoff v25 | `src/types/motion-handoff-payload.ts`, API + import route |
| Instant Motion wizard | `/animate/instant` — story/transition modes, OCR, render |
| Video detail hub | `/videos/[id]` — playback, recovery, cost card, versions toolbar |
| Render pipeline | `src/server/instant-premium/*`, progress model, provider billing |
| Admin analytics | `/admin/render-analytics` — story/transition/full_rerender split + CSV |
| Customer usage | `/mijn-verbruik` |
| Billing server | ProviderCostEvent, CustomerBillingEvent, full_rerender tagging |

---

## 2. What exists partially

| Area | Gap |
|------|-----|
| **Director V2** | Shell + director/camera/emotion editable; voice/text/advanced read-only; music/sound metadata only; **flag off by default** |
| **Pixar Workspace** | No `/studio/workspace` — storyboard editor is a long vertical stack of 20+ panels |
| **Version Center** | Route + tabs exist; basic cards; restore API exists but **no restore UX** in Version Center |
| **Studio→Motion transparency** | Motion-side badges (`motion-scene-source-badges`) — no Studio workspace badges |
| **Voice** | Storyboard voice director + character profiles; TTS generation partial; Director V2 voice is preview-only |
| **Music / Sound** | Planning metadata + director panels; **no generated audio** |
| **Text beats** | Auto-generated preview; not editable in Director V2 |
| **Recovery UX** | Backend complete; video detail still stacks activity card + progress panel + repair card |
| **Marketplace** | `/discover` is placeholder only |
| **Per-video billing UI** | Cost card on video detail (recent); Studio image costs not in customer dashboard |

---

## 3. What is missing

| Item | Notes |
|------|-------|
| `/studio/workspace` | Pixar-style unified workspace route |
| Marketplace product surface | Discover page placeholder |
| Generated music/SFX | Sound/music are planning metadata only |
| Version Center restore/compare | API for restore exists; UI missing |
| Director V2 default on | Requires `NEXT_PUBLIC_STUDIO_DIRECTOR_V2=true` |
| Studio workspace inspector | Production diagnostics in one right column |

---

## 4. Feature flags

| Flag | Default | Effect |
|------|---------|--------|
| `NEXT_PUBLIC_STUDIO_DIRECTOR_V2` | **off** | Swaps per-scene compose tab to Director Panel V2 in `studio-scene-composer.tsx` |
| `NEXT_PUBLIC_ENABLE_DEBUG_UI` | off | Debug panels |
| `STUDIO_SCENE_IMAGE_PROVIDER` | server | Scene image backend |
| `STUDIO_VISION_PROVIDER` | server | Vision QA backend |

---

## 5. Legacy

| Item | Path | Status |
|------|------|--------|
| Classic animate workflow | `/animate`, `/animate/[id]` | Live but not in primary nav |
| `LegacyProjectDetailShell` | `src/components/animate/legacy-project-detail-shell.tsx` | Superseded by `/videos/[id]` |
| Handoff version migrations | v13–v25 tests | Backwards compat only |
| `studio-character-blob.ts` | Deprecated → `studio-reference-blob.ts` | |
| `StudioPlaceholderPage` | `src/components/studio/studio-placeholder-page.tsx` | **Unused dead code** |
| Instant progress page | `/animate/instant/progress` | Overlaps `/videos/[id]` recovery |

---

## 6. Duplicates / confusing UX

| Issue | Locations |
|-------|-----------|
| Storyboard editor panel stack | AI Director + Intelligence + Text Beats + Image Planner + Voice + Music + Sound + Audio Production + Audio Asset + Voice Identity + Media Asset + Composition + Placement + Blocking + Execution + Performance — **above** scene list |
| Director V1 panels + V2 composer | When flag on, V2 replaces compose tab but storyboard-level panels remain |
| Recovery UI triple stack | `RenderActivityStatusCard` + `InstantFinalProgressPanel` + `InstantVideoRepairCard` on video detail |
| Version UI in 3 places | Version Center, project detail toolbar, `VideoVersionsPanel` on progress page |
| Two asset libraries | `studio-asset-library.tsx` (registry) vs `studio-audio-asset-library.tsx` (static catalog) |
| Progress vs video detail | Same polling/recovery patterns duplicated |

---

## 7. Safe cleanup candidates (investigate before remove)

| Candidate | Risk |
|-----------|------|
| `StudioPlaceholderPage` | Low — unused |
| `/animate` redirect to `/animate/instant` | Medium — may have bookmarks |
| Storyboard-level director panels when V2 + workspace default | Medium — need workspace first |
| Duplicate recovery on progress page | Low after video detail consolidation |

---

## 8. Render pipeline (verified)

```
Studio handoff → /animate/instant/import
  → wizard persist → create-and-generate / segments
  → Vidu jobs → ProviderCostEvent → CustomerBillingEvent
  → export/merge → final video
  → /videos/[id] (recovery, versions, cost)
```

Full rerender: `full-rerender-project.ts` → resets transitions → same job flow with `renderType: full_rerender`.

---

## 9. Billing (verified)

- `quoteVideoPrice` — admin/test €0 customer, internal costs logged
- `syncCustomerBillingFromCostEvent` — dedup by providerCostEventId
- `project-video-cost-summary.ts` — per-project aggregation for video detail card
- Gaps: Studio scene image generation costs not surfaced in `/mijn-verbruik`

---

## 10. Analytics (verified)

- `aggregateInstantModeUsage()` — story / transition / fullRerender
- Dashboard table + CSV `instant-mode-usage.csv`
- Admin project display helpers for linked tables (uncommitted work merged in prior sprint)

---

*Next: `docs/pixar-workspace-gap-analysis.md`, `docs/director-v2-status.md`*
