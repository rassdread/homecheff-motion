# SP.1 — Performance Audit

**Date:** 2026-08-10 · **Read-only**  
**Mode:** Document only — no optimization

---

## Qualitative observations

| Area | Finding |
|------|---------|
| Navigation speed | Marketing/SEO pages light; suite transitions client-heavy |
| Studio load | Workspace + copilot = large client surface |
| Experience Pack load | Funnel unmounted — N/A; dead link fails fast (404) |
| Creative Director | Heavy when entered; not public-primary |
| Assistant | Client provider + history; interpret billed server-side |
| Workspace | Primary cost center |
| Generation routing | Server billed routes (S.8); not re-measured here |
| Caching | Next defaults; no SP.1 cache inventory of CDN rules |
| Images | Marketing OK; lazy-loading inconsistent |
| Lazy loading | Limited `dynamic()` / Suspense; many null fallbacks |
| Bundle size | Client-heavy Studio/Assistant — risk, not measured this pass |
| Database queries | Admin analytics heavy (S.8F); public SEO mostly static config |
| API performance | Auth-gated APIs OK pattern; not load-tested here |
| Client performance | Mobile workspace risk |
| Mobile responsiveness | Landings fine; product chrome dense |

---

## Risk classes (no fixes)

| Risk | Severity |
|------|----------|
| Studio workspace JS weight | Medium |
| Assistant + panels always-on cost | Medium |
| Admin financial sample windows | Known (S.8) — admin only |
| Missing Experience Pack page | Product, not perf |

---

## Score

**Performance posture: 3 / 5**

Acceptable for production suite; not a public-product blocker vs dead funnels / messaging. Needs measurement before SP performance work.
