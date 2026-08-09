# S.6G — Continuity Coverage Audit

ContinuityBundle remains authoritative for identity. Experience Packs declare requirements; they never own entities.

---

## Product-layer continuity requirements

Declared on every pack via `continuityRequirements`:

| Level | Typical packs |
|-------|---------------|
| `required_entities` | `IDENTITY_CHARACTER` |
| `fusion_refs` | LinkedIn/CV, Family, Outfit, Mascot, Product, Branding, Logo, Fusion, … |
| `source_image` | Dating, Wedding, Birthday, Graduation, Memorial, Christmas, Pregnancy, Automotive, Animation, Real estate, … |
| `when_linked` | Restaurant, HomeCheff, Fashion, most SOCIAL/CREATIVE video, Storyboard, Film |

No product pack uses Continuity level `none` — Voice/Audio/Publish Matrix engines may (ENGINE_ONLY).

---

## Runtime wiring

| Path | ContinuityBundle? | Evidence |
|------|-------------------|----------|
| Director handoff | Always required | `requiresContinuityBundle: true` |
| Scene still Matrix | YES | `buildSceneStillViaMatrix` |
| Instant Matrix path | YES (standalone source image) | `resolveStandaloneSourceContinuityBundle` |
| Fusion domain | Partial / domain refs | Not always formal ContinuityBundle |
| Publish / Voice / Subtitles | Weak / optional / legacy | Matrix LEGACY or optional |
| BrandKit | Unused in generation | Prior continuity audit |

---

## Quality checklist (Experience Quality dimensions)

For each pack, Continuity should preserve when linked:

| Dimension | Scene / Identity packs | Instant source-image | MISSING packs |
|-----------|------------------------|----------------------|---------------|
| Character | when linked | N/A (source face) | N/A |
| Location / Prop / World | when linked | N/A | N/A |
| Brand | when brand assets linked | Instant food/business styles only | N/A |
| Voice / style / audience / platform / duration / aspect / quality | via Matrix selections when Director+assemble used | Instant has own aspect/duration path | Unimplemented |
| Motion / camera / lighting / emotion / action | Motion/Fusion domain + Matrix PARTIAL | Instant chips | Unimplemented |
| Business intent | Restaurant/HomeCheff LIVE when intent path used | food_promo style | — |

**Honest Continuity coverage score: 3.2 / 5** for LIVE/PARTIAL packs on Matrix paths; **1 / 5** for bypassed UI paths; **0 / 5** for MISSING packs.

---

## Absolute rules for S.6G implementation

- Never auto-mutate Continuity from Creative Coach.
- Never let Experience Packs rewrite Character / Location / Prop / World identity.
- Instant Continuity remains source-image case — do not pretend full entity Continuity.
- Scene T2I pixel continuity remains PARTIAL — do not claim solved.
