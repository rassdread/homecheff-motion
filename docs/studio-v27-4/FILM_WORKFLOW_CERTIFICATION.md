# Film workflow certification

Evidence is the exact-commit HTTPS run on `https://127.0.0.1:3457` plus the disposable database tests. Provider mode for images was the server mock. Voice and video in that browser script use the local mock path. No paid provider output was produced.

| Capability | Result | How it was tested |
| --- | --- | --- |
| Film creation | FUNCTIONALLY_CERTIFIED | Browser script, synthetic account |
| Scene creation and ordering | FUNCTIONALLY_CERTIFIED | Two scenes in the browser script |
| Storyboard link | FUNCTIONALLY_CERTIFIED | Browser script waits for the linked storyboard |
| Character linking | FUNCTIONALLY_CERTIFIED | Character A and B checked on the two scenes |
| Wizard return navigation | PARTIALLY_CERTIFIED | Code preserves `returnTo` on `/motion/start`. Not clicked on the live domain. |
| Media upload of a customer file | NOT_CERTIFIED | Not exercised against production storage |
| Media library placement | FUNCTIONALLY_CERTIFIED | Local mock video, voice, and music placed on the timeline |
| Image attachment | FUNCTIONALLY_CERTIFIED | Two mock images, `file://`, attached to the scenes |
| Video attachment | FUNCTIONALLY_CERTIFIED | Mock video, `creditsSpent` 0 |
| Voice attachment | FUNCTIONALLY_CERTIFIED | Mock dialogue, `creditsSpent` 0. Not ElevenLabs. |
| Music attachment | FUNCTIONALLY_CERTIFIED | Local sine file. Not a music provider. |
| SFX attachment | NOT_CERTIFIED | Not part of this browser journey |
| Timeline editing and persistence | FUNCTIONALLY_CERTIFIED | Place, reverse, revision checked. Requires the timeline migration in production. |
| Browser preview | FUNCTIONALLY_CERTIFIED | Local playback 720×1280 |
| Audio synchronization | PARTIALLY_CERTIFIED | Prior local certification of the player. Not re-measured as a separate audio suite in this audit. |
| MP4 export and download | FUNCTIONALLY_CERTIFIED on the local machine | Local FFmpeg. Not executed on Vercel. |

Paid AI generation: `NOT_CERTIFIED`.
