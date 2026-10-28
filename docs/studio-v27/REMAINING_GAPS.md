# Remaining gaps

1. Generic "Maak een video." still opens `/studio/experience`. The shortcut card `aiVideo` is still `/studio/experience` because `src/lib/studio-slice1a-home.test.ts` locks that href.

2. Experience packs that are not handled in `nextHrefForPack` still reload `/studio/experience`. YouTube is `PARTIAL` and was left on that path. Slideshow and photo-story intents stay blocked, as the existing consumer test requires.

3. Presentation and story share the storyboard brief. There is no separate presentation renderer.

4. Social video uses the existing photo-to-video Instant prefill. It does not have its own prompt template beyond `experience=SOCIAL_REELS` and the appended user idea.

5. Voice, music, and sound effects from free text now open `/studio/audio/create`. Music and sound effects mount the existing generator panels. Voice prepares the existing `buildVoiceRequest` and opens the storyboard voice tool when a storyboard id is present. See `docs/studio-v27-1/AUDIO_WORKFLOW_RECOVERY.md`.

6. A film scene with a storyboard id opens the existing workspace shell on the voice, music, or sound tool. The default film page is still the unified project workspace.

7. Recent workflows are `sessionStorage` on this browser. They are not account history. No migration was added.

8. A local image chosen on the homepage is staged in this browser and the photo-video composer reads it. It is not posted to blob storage. See `docs/studio-v27-1/REFERENCE_IMAGE_CERTIFICATION.md`.

9. Photo to video's local composer shows `idea` as text. It does not copy that sentence into a slideshow caption field. That composer has no provider prompt to preserve.

10. Contrast was adjusted on shared tokens and the homepage. It was not measured on every wizard, and disabled opacity was not redesigned.

11. Anonymous browser checks were run on a local dev server. Signed-in, zero-HC, and second-user passes were not run. This worktree has no `.env` and no disposable database.

12. V27.1 rendered a disposable 30 second local file with the existing `renderTimelineFilm` adapter. It did not create an export database job. See `docs/studio-v27-1/TIMELINE_AND_EXPORT_CERTIFICATION.md`.

13. Motion preset negatives are still not an API field. That was already true and was not changed.

14. `ProductionInstructions.negatives` is still not joined into `assembledPrompt`. That was already true and was not changed.
