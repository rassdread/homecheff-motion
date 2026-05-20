# HomeCheff Motion — Premium Polish Roadmap

DeeVid-style animated poster and mascot engine. Target: premium TikTok/Reels ads, expressive mascots, typography-safe motion graphics.

## Foundation (stable)

- `raw_motion_concat` — Vidu segments are the primary source of truth
- Seamless segment assembly (`capcut_smooth`, edge trim, normalize)
- Rebuild final video (no new Vidu calls)
- Text/logo preservation, no OCR redraw chaos
- Cost-safe rebuilds, audit tracking, blob versioning
- Progress/rebuild lifecycle

**Infrastructure phase: complete.** Current focus: **premium quality phase.**

## Core architecture rule

```
INPUT IMAGE → VIDU MOTION SEGMENTS → SEGMENT POLISH → SEAMLESS TRANSITIONS → FINAL CONCAT → EXPORT
```

Never: suppress real motion, freeze scenes, slideshow behavior, over-stabilize, static overlays over animation.

Implementation constants: `PREMIUM_MOTION_PIPELINE` in `src/lib/premium-motion-engine.ts`.

## Phase 1 — Premium motion quality (in progress)

- Character motion direction (emotion, energy, personality, motionStyle)
- Secondary motion prompts (blink, breath, sway, follow-through)
- Motion variation per segment (anti-loop)
- `motionEnergy`: calm | cinematic | expressive | energetic | viral (default: expressive)
- Foreground priority (mascots, faces, hands, products)

## Phase 2 — Foreground segmentation

Heuristic / rembg / SAM2-ready / manual masks; typography stable.

## Phase 3 — Premium transitions

`capcut_smooth` default; shared keyframe overlap; no blur pulses or flash frames.

## Phase 4 — Premium camera

Subtle drift/parallax only; depth-aware; bezier easing.

## Phase 5 — Particles and FX

Scene-aware FX; smart masking around text/logos.

## Phase 6 — Advanced compositing

Minimal polish only; Vidu motion dominant; stabilize text/UI only.

## Phase 7 — Comic / story engine

Manga presets; bubble preservation; panel continuity.

## Phase 8 — UI / UX polish

Progress UX, live previews, before/after, mobile polish.

## Phase 9 — Future high-end

Alpha layers, Live2D-style rigs, emotion presets, speech-sync, depth maps.

## Verification

All changes must preserve rebuild-final-video, audit/cost tracking, existing segment reuse, lint/tests/build, and mobile-friendly flows.
