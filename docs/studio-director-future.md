# Studio Director — future roadmap (V24+)

V23 adds **metadata-only** director planning: presets, shot types, movement, energy, flow analysis, and Motion handoff fields. No Vidu changes, no video generation, no render pipeline changes.

## Planned (not implemented)

### Automatic shot planning

- AI suggests shot type and movement per scene from script, cast, and location.
- One-click “apply director plan” with user review.

### Automatic camera progression

- Rule engine + ML to propose wide → medium → close progressions by narrative beat.
- Beat-aware templates (intro, conflict, resolution).

### AI director mode

- Conversational director assistant: “make scene 3 more intimate”, “add tension to the finale”.
- Revisions tracked in `studioDirectorAuditJson` (future column).

### Episode templates

- Reusable director profiles per show format (cooking series, product launch, documentary episode).
- Import/export director templates between storyboards.

## Constraints (unchanged)

- Do not modify Vidu prompts or segment generation until explicitly scoped.
- Motion render output must not change from director metadata alone.
