# Authenticated user journey

Server: `http://127.0.0.1:3462` (`next dev`), with `STUDIO_DISPOSABLE_LOCAL_AUTH=true` and `STUDIO_LOCAL_MEDIA_DIR=/tmp/homecheff-studio-v27-2-media`. Paid provider keys and the blob token were empty.

User A (`v272-user-a@studio.local.test`) signed in through `/login`. The browser landed on `/`. Wallet at the end of certification: balance 500, promotional 500, reserved 0, lifetime spent 0.

## Homepage intents

The last composer (`studio-ai-home-composer`) kept the idea in the query string:

| Intent | Route |
| --- | --- |
| Animeer deze foto | `/motion?idea=Animeer+deze+foto` |
| Maak een productfoto | `/editor/start?idea=Maak+een+productfoto` |
| Maak een reclamevideo | `/studio/quick-ad?idea=Maak+een+reclamevideo` |
| Maak een stem | `/studio/audio/create?idea=Maak+een+stem&mode=voice` |
| Maak achtergrondmuziek | `/studio/audio/create?idea=Maak+achtergrondmuziek&mode=music` |
| Maak een geluidseffect | `/studio/audio/create?idea=Maak+een+geluidseffect&mode=sfx` |
| Maak een video | `/studio/experience?idea=Maak+een+video` |

## Film created in the browser

Prompt: `V27.2 Synthetic Film Certification. Create a 30-second promotional film with three scenes, one recurring character, voice-over, background music, a sound effect and an ending logo.`

A classification bug sent that sentence to the image editor because the word “background” inside “background music” matched the image-edit rule before the film rule. The image-edit branch now also requires that the text is not an explicit film request. The browser then opened:

`/studio/projects/cmvrdlbwg0005dh92s468jz8g?section=overview&workflow=film`

Idempotency reused that project on later runs. Storyboard: `cmvrdlcet0007dh92f8qonc00`.

Three scenes were saved from the scene form and were still present after refresh (`scenesAfterRefresh` counts 1, 1, 1):

1. Introduction — Open on the guide in a warm kitchen.
2. Main action — The guide prepares the product and shows the result. Scene id `cmvrdnblh000bdh92jjl4bhrb`.
3. Closing logo and call to action — The HomeCheff logo and a call to action close the film.

Scene 2 wizard links keep the project id, scene id, the scene description as `idea`, and `returnTo` for the editor, motion, voice, music, and sound tools. Evidence: `docs/studio-v27-2/evidence/browser-report.json`.
