# Regression results

Node `v24.22.2`. Application commit `8ffde5d7f349b63dc1ecaa0df6fec085cab0fd81`.

## Commands

| Check | Command | Result |
|---|---|---|
| Unit | `npm test` | 5524 pass, 0 fail, 1 skip, 68.8 s |
| Types | `npx tsc --noEmit` | PASS |
| Lint | `npx eslint .` | 0 errors, 476 warnings |
| Build | `npm run build` | PASS, compile 21.1 s, TypeScript 49 s, 536 pages |
| Database | six `tsx --test` files listed in `NODE24_CERTIFICATION.md` | 6 pass |
| Export | `studio-v275-film-export.test.ts` | 3 pass, included in `npm test` |
| Browser | `studio-film-certification.browser.ts` against `https://127.0.0.1:3458` | exit 0 |

## Browser certification

Clean checkout `/Users/sergioarrias/HomeCheffProjects/homecheff-motion-v275-exact` at `8ffde5d7`. Server on `127.0.0.1:3458` only. Database `homecheff_film_cert_2u`.

- Project `cmvssy3vu0001dhdkizz62d5r`
- Wallet 500 to 500
- Reserved 0, captured 0, ledger delta 0
- Mock images 2
- Paid provider calls 0
- Duration about 21 s

The server was stopped. Ports 3456 and 3462 were still listening.

## Local export matrix

`studio-v275-film-export.test.ts` on Node 24, Homebrew FFmpeg:

- One still, 720x1280, about 1 second, H.264 and AAC. PASS.
- Three visuals, voice plus music plus a short effect, duration 3000 ms, 720x1280, H.264 and AAC. PASS.
- Missing picture returns `ok: false`, code `ffmpeg`, and does not leave the output file. PASS.

Maximum duration certified by this matrix: 3 seconds. Longer films were not certified.

## Not certified here

Vercel film encode, production blob upload, production flag values, paid provider calls.
