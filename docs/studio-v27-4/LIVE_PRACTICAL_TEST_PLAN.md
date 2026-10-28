# Live practical test plan

Execute this only on `studio.homecheff.eu` after a separate deployment approval. Do not run it now.

The same deployment also serves `motion.homecheff.eu`. Check that domain's homepage after the release.

Free actions, no provider charge expected:

1. Open `/` and `/login`.
2. Sign in with the existing production account.
3. Open an existing animation project and an existing editor project. Confirm they still load.
4. Open `/motion`, `/editor/start`, `/studio/quick-ad`, and `/studio/experience` without submitting a generation.
5. Create a film and scenes, link characters, reorder scenes, and save. This stays free. Timeline save requires the timeline migration.
6. Reopen the film and confirm the scenes are still there.
7. Log out and confirm the session is gone. If the identity origin is set, confirm the existing ecosystem logout still runs.

Paid actions. Each one can spend HC and provider money. Stop unless the operator has accepted that cost:

8. Generate one scene image. Expect a real OpenAI image and a `scene_generation` capture of 30 HC, not a mock image and not a zero capture.
9. Generate one voice line. Expect the existing voice quote, not a free bypass.
10. Generate music or a sound effect from `/studio/audio/create` only if the cost is accepted.

Provider-dependent actions:

11. Return a generated image or video to the film.
12. Place voice, music, and any sound effect on the timeline.
13. Preview in the browser.
14. Export the MP4 and download it. Confirm the file plays and the stored URL is `https`, not `file://`.
15. Reopen the project and continue editing.

Record wallet balance before step 8 and after each paid step. A mock image that still debits HC, or a paid image that does not, is a rollback trigger.

Do not create accounts on the production database for this test. Use an existing operator account.
