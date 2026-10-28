# Wizard to scene 2

After **Use on this scene**, the browser landed on:

`/studio/projects/cmvrdlbwg0005dh92s468jz8g?section=scenes&scene=cmvrdnblh000bdh92jjl4bhrb&workflow=film`

A reload then read `StudioScene` rows for storyboard `cmvrdlcet0007dh92f8qonc00`.

| Order | Title | Selected still |
| --- | --- | --- |
| 0 | Introduction | none |
| 1 | Main action | `/api/studio/local-media/c6c23c80-23f6-48a6-bf5f-cdcff9034d69` |
| 2 | Closing logo and call to action | none |

Scene order 1 is the scene opened from the film (`cmvrdnblh000bdh92jjl4bhrb`). Its selected image id after the return was `cmvs2ds5v005idh92xejfwv6i`. Introduction and the closing scene stayed without a selected still.

The still is a completed `StudioSceneImage` created by `saveOwnedSceneStill` only after `readCertifiedLocalFile` confirmed the local-media id belongs to the signed-in user. The provider value is `local_synthetic`. No credit reservation runs in that path.

`evidence/scene-return-1440.png` shows the film workspace on Scenes for project V27, scene **1. Main action**, character **V272 Guide**, balance **500 HC**. The kitchen still is stored on the scene; the screenshot is the workspace after reload, not a zoomed proof of the pixels.

User B `POST /api/studio/projects/{film}/scenes/{scene2}/attach-media` with user A's image URL returned **404**.

Orders 3–17 titled `New scene` already existed on this disposable storyboard. Their `createdAt` values are all before this session (28 Oct 2026, 00:32–01:00). They were not created by the wizard return.
