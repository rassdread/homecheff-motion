# Motion ↔ Studio live link (future)

V21 adds **selective, user-confirmed** sync from Studio into an existing Motion project. It does not enable continuous two-way sync.

## Future directions (not implemented)

- **Auto-sync drafts** — Background refresh of QA when storyboard saves (opt-in).
- **Two-way sync** — Push Motion text tweaks back to Studio scenes (conflict policy required).
- **Conflict resolution** — Side-by-side merge UI for per-field decisions.
- **Studio as source of truth** — Policy flag on project: `studioAuthority: "studio" | "motion" | "hybrid"`.
- **Motion as render version** — Immutable render snapshots with optional “relink to Studio head”.

## Constraints (current product)

- No Vidu calls during sync.
- No automatic rerender after sync.
- Scene removal/addition requires explicit confirmation.
