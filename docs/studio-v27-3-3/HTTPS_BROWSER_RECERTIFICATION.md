# HTTPS browser recertification

Script: `src/server/studio/studio-film-certification.browser.ts`

Target: `https://127.0.0.1:3456`

Database: `homecheff_film_cert_2u` on `127.0.0.1:5432`

The listening server is PID 18083 in `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-v2732-https`. Before the run, the repaired image route and `authorized-local-mock-execution.ts` were copied into that checkout. A POST to the image route compiled and returned 401 without a session. The certification then created a new synthetic account. The original V27.3.2 account was not reused and was not modified.

Exit code: 0

Fresh project: `cmvsh2rhf0043dhybnnamtsgf`

Wallet: `cmvsh2nya0004dhgxv7gzm2n1`

| Measure | Value |
| --- | --- |
| Wallet before | 500 |
| Wallet after | 500 |
| Wallet delta | 0 |
| Reserved after | 0 |
| Captures added | 0 |
| Ledger rows added | 0 |
| Mock images completed with `file://` | 2 |
| Provider cost events for the user | 0 |

Images:

- `cmvsh2tt9004hdhybw9dwjv7g` on scene `cmvsh2s280049dhybu90kkfah`, provider `mock`, completed
- `cmvsh2u25004rdhybec5m7s38` on scene `cmvsh2rwj0047dhybxpxz6fbc`, provider `mock`, completed

The script still authenticates, creates the film, creates two scenes, generates the scene images, attaches them, places timeline media, exports the MP4, checks playback at 720×1280, and checks logout returns 401. Financial assertions run after that journey. A non-zero wallet delta fails the script.

The wallet was not reset after the run. The direct database read matches the script: balance 500, lifetime spent 0, ledger count 0.
