# Media library to scene 2

From the film scene panel, **Browse library** called `GET /api/studio/library/assets?limit=40`. The page rendered 8 attach buttons (`libraryChoices: 8` in `evidence/workflow-report.json`).

The first button posted `{ libraryAssetId }` to the scene attach route. After reload, scene order 1 still pointed at the same local file and had a new selected image id:

- before library attach: `cmvs2ds5v005idh92xejfwv6i`
- after library attach: `cmvs2dumh005mdh92vwmc9q45`
- URL both times: `/api/studio/local-media/c6c23c80-23f6-48a6-bf5f-cdcff9034d69`

Introduction and the closing scene stayed empty. The attach created another scene-image row for that file. It did not copy the file to a second storage object. A distinct older video was not the asset selected by this click. Video, voice, music, and sound-effect library rows are placed on timeline tracks instead of scene stills; those paths were used by the later audio roundtrip.
