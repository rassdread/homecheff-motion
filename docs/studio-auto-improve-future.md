# Studio — Future autonomous improve loop (not implemented)

This documents a planned **fully autonomous** mode after V14 (approval-gated improve). V14 requires explicit user approval before each regeneration.

## Planned loop

1. **Auto-generate** scene stills for all scenes in a storyboard.
2. **Analyze** consistency (V11) and vision (V13) on each completed image.
3. **Build corrections** (V12) and **regeneration recommendations** (V14).
4. **Regenerate** scenes below a configurable combined score threshold (`vision × 0.6 + consistency × 0.4`), up to a max attempts per scene.
5. **Select best** generation per scene (same combined score as V14 recommended badge).
6. **Motion handoff** with V14 metadata (`selectedImageScore`, vision/consistency/improvement fields).

## Constraints (product)

- Never delete prior generations; history remains selectable.
- Do not modify Vidu or video render pipelines from this loop.
- Cost controls: per-storyboard credit budget, dry-run summary, and explicit opt-in for autonomous mode.

## Implementation notes for V15+

- Move `bulkImproveScenesWithApproval` sequential processing to a background job queue with resumable progress.
- Persist loop state on `StudioStoryboard` (threshold, max attempts, last run status).
- Reuse `improveSceneImageWithApproval` without the approval modal when autonomous flag is enabled.
