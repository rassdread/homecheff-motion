# Exact commit certification

The earlier HTTPS server on port 3456 is still a detached checkout at `cffaeb83` with copied files. It was not used for this certification.

Clean checkout: `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-v274-exact`

`git rev-parse HEAD` returned `dcd0caea75b6d08755c4431ceebc3eba651f10b7`.

`git status --short` was empty before the server started. No newer files were copied in. Dependencies came from an APFS clone of the candidate `node_modules`. The lockfile is the one in the commit.

Server: `next dev` 16.2.4 with the existing self-signed certificate for `127.0.0.1`, bound to `127.0.0.1:3457`. Environment: disposable database `homecheff_film_cert_2u` on `127.0.0.1:5432`, `STUDIO_FILM_CERT_LOCAL_AUTH=true`, `STUDIO_SCENE_IMAGE_PROVIDER=mock`, `STUDIO_VISION_PROVIDER=mock`, no Vercel variables, no OpenAI, ElevenLabs, or Stripe keys, empty blob token. The process was stopped after the run. Ports 3456 and 3462 stayed up.

Script: `src/server/studio/studio-film-certification.browser.ts` from that checkout.

`FILM_CERT_BASE_URL=https://127.0.0.1:3457`

Result: exit 0.

| Measure | Value |
| --- | --- |
| Project | `cmvsr66xt0001dhmcoc6vp2vm` |
| Wallet before | 500 |
| Wallet after | 500 |
| Wallet delta | 0 |
| Reserved | 0 |
| Captures added | 0 |
| Ledger rows | 0 |
| Mock images | 2 |
| Provider cost events | 0 |

A direct read of the disposable database matched the script: balance 500, lifetime spent 0, ledger count 0. The original V27.3.2 wallet `cmvse60ig0004dh8v563nwtww` is still 440 / lifetime spent 60.

The journey created the film, two scenes, the mock images, timeline media, the MP4, and playback at 720×1280, then logged out to 401. Paid providers were not called. This certifies mock generation and local FFmpeg. It does not certify a paid OpenAI or ElevenLabs call.
