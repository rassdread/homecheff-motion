# Scenario C — Pixar / Multi-Scene Consistency Final Closeout

## Verdict: **WORKING** (cinematic profile; human scores ≥7)

Storyboard: `cmt5izwgu0001gq0444v3ipil` — `promptStyleProfile: cinematic` (canonical bounded cert fixture).

## Real provider coverage

| Order | Scene intent | Real provider |
|-------|--------------|---------------|
| 0 | Anna + red box, bakery | Yes |
| 1 | Bob greets | Fixture / parallel gen |
| 2 | Anna places box | Yes |
| 3 | Product close-up | Fixture |
| 4 | Wardrobe change (blazer) | Yes |
| 5 | Multi-character | Fixture |
| 6 | Second environment, black jacket | Yes |
| 7 | Hero ending | Fixture |

Real OpenAI scene images: orders **0, 2, 4, 6** (4 calls). Evidence frames: `docs/audits/full-studio-cert/pixar-frames/`.

## Scene 5 rerender

- Base still: `scene-4-v0.jpg` (order 4 wardrobe scene used as rerender base in flow)
- Rerender produced `scene-4-v2.jpg` (black leather jacket) — **identity retained**
- `scene5ImageCountAfter: 2`; `oldStillPreserved: true`
- Client HTTP timed out on long POST; server completed (polled image count)

## Human / visual scores (cert reviewer)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Character A (Anna) | **8** | Same woman across bakery/kitchen/street |
| Character B (Bob) | **7** | Distinct supporting man in multi-char scene |
| Wardrobe | **8** | Tan coat → blazer → black leather; identity holds |
| Location | **7** | Bakery/kitchen/street recurrence readable |
| Prop/product | **8** | Red box recurring |
| Multi-character | **7** | Scene 1 handshake readable |
| Style | **8** | Cinematic photoreal consistent |
| Rerender | **8** | Controlled wardrobe change |
| User flow | **8** | API create → generate → rerender → lineage |

Character consistency **≥7** threshold met.

## Classifications

| Gate | Status |
|------|--------|
| PIXAR_STRESS | WORKING |
| CHARACTER_CONSISTENCY | CERTIFIED |
| WARDROBE_CONTINUITY | CERTIFIED |
| LOCATION_CONTINUITY | WORKING |
| PROP_PRODUCT_CONTINUITY | CERTIFIED |
| MULTI_CHARACTER | WORKING |
| SCENE_RERENDER | CERTIFIED |
| VERSION_SAFETY | CERTIFIED |
