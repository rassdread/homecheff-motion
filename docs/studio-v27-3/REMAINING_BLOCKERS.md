# Remaining blockers

These are the gaps that keep the verdict at partial integration.

1. Browser audio element time. At the scene-2 playhead (`data-ms` 6815) the dialogue, music, and sound-effect stems were active and unmuted, and the active mix URL decoded to RMS 0.088. The `Audio` element's `currentTime` in that sample was still 0. An earlier sample showed the music stem at 451 ms. The exported AAC is not silent (mean `-36.4 dB`). That verifies the file. It does not verify three distinct tones coming out of the browser audio device.

2. Library selection reused the same local still. Eight library buttons rendered. The first attach created a new scene-image id for `/api/studio/local-media/c6c23c80-23f6-48a6-bf5f-cdcff9034d69`. A different existing video was not the selected library item.

3. Historical image and animation open in the unified workspace and offer **Open the existing editor**. No edit was saved in the legacy canvas or animation player, and the animation fixture has no rendered video to play.

4. The disposable film still has scene orders 3–17 titled `New scene`, created during the earlier V27.2 session. The original three titles are intact. Those extra rows were not deleted.

5. `studio-film-certification.browser.ts` was not run. It requires `https://127.0.0.1:3456` on `homecheff_film_cert_2u`. The server on port 3462 stayed on `homecheff_studio_v27_2_test`.

6. The full eslint tree was not repeated after removing the unused `ownerA` binding. The measured full run is 0 errors and 477 warnings. The one new warning was removed afterward.

No paid provider call was made. No HC was spent. Nothing was pushed, merged, or deployed. Production, certified preview, and the isolated V25 preview were not modified.
