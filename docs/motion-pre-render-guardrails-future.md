# Motion pre-render guardrails (future)

Studio V18 surfaces character consistency, vision, and drift warnings in Motion before checkout. Rendering is **not** blocked.

## Planned (not implemented)

- **Threshold gates** — optional minimum character identity / vision score before paid render
- **Require review** — force user to acknowledge drift warnings on critical mascots
- **Auto-regenerate weak scenes** — trigger Studio improve job from Motion QA panel
- **Character lock verification** — block render when mascot lock flags are violated

All guardrails remain metadata and UX policy only until explicitly product-approved (no Vidu prompt changes without a separate spec).
