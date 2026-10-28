# Authenticated browser report

## Blocker

This worktree has no `.env`. The shell had no `DATABASE_URL`, `DIRECT_URL`, blob token, or provider key. No Docker Compose file is present. A disposable database name could not be created and proven empty of real users, so no migration and no local account were created.

Roles not run in a browser:

- Authenticated project owner
- Authenticated unrelated user
- Authenticated zero-HC user

No Production or Preview account was used.

## What was checked without a browser session

`evaluateCreditPolicy` for a creator account with balance 0 and action `voice_generation` returned `allowed: false` and `insufficient_credits`. The voice handoff still opens `/studio/audio/create?mode=voice` and does not include `confirmed`.

A staged image owned by `user-a` was hidden from `user-b`.

`validateStudioReturnTo` keeps the audio create idea and mode and strips `token`.

## Anonymous UI

Local server: `http://127.0.0.1:3458`. No account was signed in. Generate was not clicked.

Voice `/studio/audio/create?mode=voice&idea=Maak%20een%20stem%20voor%20de%20keuken`:

- Script field held `Maak een stem voor de keuken`.
- Language `nl`, profile `warm_narrator`, narration `narrator`.
- Assembled request shown in the page: `model: eleven_multilingual_v2`, `language: nl`, `profile: warm_narrator`, `characters: 28`.
- Quote line: `15 HC`, the existing voice display amount. The live preview did not replace it for the anonymous session.
- Heading contrast on the white page surface: 20.7:1. The note under it: 19.92:1.
- Horizontal overflow was 0 at client widths 1425, 1265, 1065, 1009, 768, 390, and 360. Those correspond to the 1440, 1280, 1080, 1024, 768, 390, and 360 targets. A scrollbar accounts for the 15px difference on the desktop widths.

Music: the existing panel opened with the idea in the prompt, genre `cinematic`, mood `warm`, duration 30, instrumental checked, and one generate button. Overflow was 0 at client width 1265. The quote line said to sign in. Opening the form did not spend HC.

Sound effects: the existing panel opened with the idea in the description, category ambience, a generate button, and "add to scene" disabled because no scene was selected.

Film, timeline, editor, character library, photo-video, and quick-ad were not re-screenshotted in this pass. Signed-in roles were not run.
