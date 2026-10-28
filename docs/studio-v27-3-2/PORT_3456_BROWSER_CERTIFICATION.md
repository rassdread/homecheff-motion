# Port 3456 browser certification

Script: `src/server/studio/studio-film-certification.browser.ts`

Invocation:

```text
FILM_CERT_DATABASE_URL=postgresql://sergioarrias@127.0.0.1:5432/homecheff_film_cert_2u
FILM_CERT_BASE_URL=https://127.0.0.1:3456
STUDIO_LOCAL_MEDIA_DIR=$TMPDIR/homecheff-v2732-media
STUDIO_SCENE_IMAGE_PROVIDER=mock
npx tsx src/server/studio/studio-film-certification.browser.ts
```

The final run exited 0 and printed `BROWSER_PROJECT_ID=cmvse62gr0022dhybadrgb82h`. It used the real HTTPS origin, the login form, the projects UI, scene creation, character assignment, mock images, mock video, mock dialogue, timeline placement, story reversal, MP4 render, in-browser playback, the download link, and logout. `forbiddenHosts` stayed empty. No request went to `homecheff.eu`, OpenAI, or Stripe.

## Failures before the passing run

| Run | Classification | Result |
| --- | --- | --- |
| Server not listening | `SERVER_STARTUP_FAILURE` already recorded in V27.3.1 | Connection refused |
| First click, before hydration | `BROWSER_AUTOMATION_FAILURE` | Native GET submitted the login form before React attached |
| Characters saved on the newly selected scene | `TEST_CONTRACT_MISMATCH` | Scene 1 was empty; both characters were on scene 2 |
| Image upload | `DATABASE_CONFIGURATION_FAILURE` was not it. The server lacked `STUDIO_SCENE_IMAGE_LOCAL_DIR`, so the mock image tried blob upload | 500 `EXPORT_UPLOAD_AUTH_FAILED` |
| Logout | `APPLICATION_REGRESSION` | `POST /api/auth/logout` 500, `HOMECHEFF_IDENTITY_ORIGIN missing`, projects stayed 200 |
| Film title filled before hydration | `BROWSER_AUTOMATION_FAILURE` | Create-film submit stayed disabled for 60 seconds |

## Smallest script corrections

The script still drives the same routes and assertions.

- Wait until the password field has a React fiber, then fill and submit.
- Click `1. New scene` before saving Character A. Creating a scene selects that new scene, so a reload was leaving scene 2 selected.
- Wait until the visible film-title field has a React fiber, then fill it.

The password form `method="post"` is an application fix, not a script skip.

## Credit ledger

The script created a wallet with balance 500. Video and dialogue responses reported `creditsSpent` 0, and those assertions passed. The ledger for that synthetic user still contains two `usage_capture` rows of `-30`, provider `openai`, balance 440, lifetime spent 60. The stored scene image provider asserted by the script is `mock`. No OpenAI request was observed. The preserved v272 wallets were not debited. This debit is recorded under remaining limitations. Pricing and wallet rules were not changed.
