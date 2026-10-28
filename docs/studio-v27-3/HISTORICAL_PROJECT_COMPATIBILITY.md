# Historical projects

Fixtures were inserted only into `homecheff_studio_v27_2_test` for user A. Production was not contacted.

| Record | Id | Open result |
| --- | --- | --- |
| Image canvas | `v273-hist-image-0001` | `/studio/projects/cmvs2l72h005ydh92rnju2zdu?workflow=image` |
| Animation | `cmv273histanim0001` status `draft` | `/studio/projects/cmvs2l8fr0060dh92lnzkf46i?workflow=video` |
| Existing storyboard | `cmvrdlcet0007dh92f8qonc00` | `/studio/projects/cmvrdlbwg0005dh92s468jz8g?workflow=film` |
| Existing film | `cmvrdlbwg0005dh92s468jz8g` | same project, scenes section |

The image page text included `Project V273 historical image` and `Open the existing editor`. The animation page included `Project V273 historical animation` and the same editor action. Neither page was stuck on `Loading workspace…`. Screenshots: `evidence/history-image-1440.png`, `evidence/history-animation-1440.png`.

The storyboard open showed `Project V27` and the certification description. A scenes navigation captured a moment that still contained `Je HomeCheff-account wordt geopend…`. The following storyboard open rendered the film workspace, so that line was a transition, not the settled page.

The existing character `V272 Guide` (`cmvrdb5f6000gdhrztiq3yugk`) had an empty `referenceImageUrl`. It was set to the owned local still `/api/studio/local-media/c6c23c80-23f6-48a6-bf5f-cdcff9034d69`. The character id was not rewritten.

An edit inside the legacy canvas or animation player was not saved. Opening them creates the unified project link and offers the existing editor. That is the supported path exercised here. Playback of the historical animation file was not available because the fixture has no rendered video.
