# HC billing and legacy routes

Prices were not changed. No paid provider was called. No Stripe call was made. No real HC was spent.

## Registry, unchanged

`scene_generation` is OpenAI, reserved USD 0.06, which the existing tests capture as 30 HC. `voice_generation` is ElevenLabs, reserved USD 0.03, captured as 15 HC. `motion_render` is Vidu with an explicit default of 180 HC. Music and SFX generation are ElevenLabs entries. Film timeline export is not in the charge path: the render route does not import `billProviderAction` or `requireStudioCredits`.

## Gates

| Action | Paid | Gate |
|---|---|---|
| Photo animation create | Yes, `motion_render` | `requireStudioCredits` in `src/app/api/animations/projects/route.ts` |
| Photo animation job start | No second charge | Comment and billing note in `jobs/start/route.ts`: charged at create |
| Scene image | Yes, `scene_generation`, unless the server-only local mock gate is open | Image route |
| Voice, music, SFX | Yes, registry entries | Existing quote and capture path |
| Film export | No | No credit call |

The local mock gate opens only when `STUDIO_SCENE_IMAGE_PROVIDER=mock`, `STUDIO_FILM_CERT_LOCAL_AUTH=true`, the database is `homecheff_film_cert_2u` on `127.0.0.1`, and the host is loopback. Both flags are absent from the Vercel project. Production sets `VERCEL`, so the gate cannot open there. Client fields such as `provider=mock` or `skipBilling` are not accepted as proof.

`studio-mock-billing-isolation.db.test.ts` passed on Node 24: mock image wallet stayed 500, a stubbed paid capture moved 80 to 50 and did not double-capture, a failure refunded, and a cross-user generate was forbidden.

The historical local wallet `cmvse60ig0004dh8v563nwtww` is still balance 440, lifetime spent 60, reserved 0. This task did not repair or spend it.

## Browser certification wallet

Project `cmvssy3vu0001dhdkizz62d5r` on the disposable database. Wallet 500 to 500. Captures 0. Ledger delta 0. Mock images 2. Paid provider calls 0.

Verdict: no legacy route was found that performs a paid provider call without the server gate. The film export itself is not a paid action. The three production billing flags remain UNVERIFIED, so production flag behavior is not fully proven.
