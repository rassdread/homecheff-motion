# Implementation roadmap

V12 (`/studio/projects/[id]`) implements the shell from phase 1 without filling Passion’s null storyboard or animation links. Timeline and director execution stay later phases.

No hour estimates. Complexity is relative. Do not start phase 2 until phase 1 links Passion without copying media.

## Phase 1 — Shared project workspace

**Complexity: HIGH**

- Objective: `/studio/projects/[id]` shows the storyboard, characters, and media for that film, including Passion.
- Reuse: creative project page, storyboard scene UI, media browser, character list.
- New: a shell that reads optional `storyboardId` and `animationProjectId`, and a way to attach an existing storyboard. For Passion, create the link only when the founder starts the film phase.
- Database: none required if the nullable ids are filled. No new table.
- API: owner-checked attach endpoint.
- UI: three panes from the blueprint, still using current colors.
- Security: owner of both records.
- HC: none. Attaching is free.
- Tests: owner cannot attach another user’s storyboard. Passion ids render.
- Dependency: none.
- Risk: the storyboard page is large. Embed it. Do not fork it.
- Acceptance: Passion opens in one shell and shows Baker, Potter, and Gardener. Masters unchanged.

## Phase 2 — Canonical navigation

**Complexity: MEDIUM**

- Objective: one nav item per job. Legacy URLs still open.
- Reuse: current nav tokens.
- New: redirects for `/library` and the storyboard list only.
- Database: none.
- Tests: deep links resolve.
- Risk: breaking a bookmark. Keep detail routes.

## Phase 3 — Shared media and characters

**Complexity: MEDIUM**

- Objective: scene picker uses the V10 browser and the character editor.
- Reuse: both components.
- New: “add this asset to this scene” with no copy of the file.
- Database: scene-character link already exists. Use `AnimationImage.studioSceneId`.
- HC: none for linking.
- Acceptance: a master is referenced, not re-generated.

## Phase 4 — Scene management

**Complexity: MEDIUM**

- Objective: ordered scenes with dialogue text separate from the image prompt.
- Database: additive nullable dialogue fields only if `description` cannot hold both. Decide in the migration review.
- Acceptance: English line and Dutch subtitle text are stored before any TTS.

## Phase 5 — Unified generation

**Complexity: HIGH**

- Objective: still, motion, and voice buttons share the quote component.
- Reuse: scene image service, Vidu adapter, ElevenLabs preview.
- HC: quote, approve, reserve, capture, refund.
- Tests: failed job refunds. Repeated idempotency key does not double-charge.
- Risk: calling Vidu from a new button that skips the quote.

## Phase 6 — Timeline

**Complexity: VERY_HIGH**

- Objective: video, dialogue, music, subtitles on one ruler.
- Database: additive `StudioTimeline` and clips.
- Dependency: phases 3 and 4.
- Acceptance: reorder and trim do not call a provider.

## Phase 7 — Voice, audio, subtitles

**Complexity: HIGH**

- Objective: narrator voice, per-scene lines, Dutch overlay, one music bed.
- Reuse: catalog, language export, subtitle track.
- Paid: TTS and music only after quote.

## Phase 8 — AI director execution

**Complexity: VERY_HIGH**

- Dependency: phase 5 quote gate.
- Objective: the action list in the director doc, server-side, same services.
- Acceptance: the director cannot spend HC without `approved: true`. It cannot target the three master ids for image generation.

## Phase 9 — Export

**Complexity: HIGH**

- Objective: one export action on the shell that calls the current animation export.
- Acceptance: a downloadable MP4 whose video track is the existing renderer.

## Phase 10 — Authenticated end-to-end

**Complexity: HIGH**

- Objective: a signed-in test of Passion that does not call paid providers: open shell, see three characters, see library, see a quote that is not confirmed.
- A paid generation test is a separate, explicit decision.

## First phase

Phase 1. A timeline or a director built before the shell would become another editor.
