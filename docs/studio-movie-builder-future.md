# Studio — Future Auto Movie Build (not implemented)

V16 **Movie Builder** is a guided, step-by-step workflow. The user confirms each expensive step (generate, analyze, improve).

## Planned autonomous mode

1. Generate missing scene images (`generate_scene_images` job).
2. Run consistency + vision analysis jobs.
3. Improve weak scenes until combined score threshold (reuse V14 recommendation engine).
4. Auto-select best image per scene (V14 combined score).
5. Offer **Open in Motion** (existing handoff; no Vidu or render changes from Studio).

## Constraints

- Do not bypass user approval for paid API steps until a storyboard-level opt-in exists.
- Keep using `StudioJob` for long work (V15); a future worker can chain jobs.
- Never delete prior scene image generations.
