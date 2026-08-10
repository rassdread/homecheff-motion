# SP.1 — Legacy & Cleanup Audit

**Date:** 2026-08-10 · **Read-only**

---

## Inventory

| Item | Class | Visibility | Disposition |
|------|-------|------------|-------------|
| `StudioExperiencePackFunnel` | PARTIAL | Component exists; **no `/studio/experience` page** | Needs migration / mount |
| Links to `/studio/experience` (maak, motion hub, prepare) | BROKEN / TEMPORARY | User-visible | Fix route or retarget — **not safe to ignore** |
| `UniverseMarketingSections` | UNUSED | Hidden (tests assert not on `/`) | Keep intentionally or wire — decide |
| `HomeEcosystemPage` | UNUSED / LEGACY | Hidden | Safe to remove after confirm, or revive |
| Assistant cluster router (vs open NLU) | PARTIAL | Logged-in product | Keep; evolve intelligence |
| Classic editor advanced gates | LEGACY / PARTIAL | In-product | Keep intentionally until migration policy |
| Advanced-hub aliases / beginner flows | EXPERIMENTAL / UNUSED (partial) | Mixed | Inventory before delete |
| Duplicate landing page components | DUPLICATED | Historical | Cleanup candidate |
| Placeholder Suspense `fallback={null}` | PLACEHOLDER | Subtle UX | Polish later |
| “Motion Studio” naming | DEPRECATED drift | Visible | Terminology cleanup |

---

## Disposition summary

| Action | Items |
|--------|-------|
| Safe to remove (after confirm) | Unused home ecosystem / unused marketing if product owns Universe home |
| Needs migration | Experience Pack funnel + all inbound links |
| Keep intentionally | Suite shells, Assistant stack, SEO catalog |
| Hidden from users | Orphan marketing components |
| Visible by mistake | Dead Experience Pack CTAs |

---

## Score

**Legacy / cleanup health: 3 / 5**

Not a dumpster fire — one **user-visible broken funnel** elevates cleanup from tidy-up to product blocker.
