# Billing and provider audit

`studio-action-cost-registry.ts` is unchanged from the live commit. `scene_generation` remains provider `openai` at 30 HC. `voice_generation` remains 15 HC, provider `elevenlabs`.

The candidate free-mock path is `isAuthorizedLocalMockSceneImageExecution`. It is true only when the server provider is exactly `mock`, the certification flag is exactly `true`, the database gate matches `homecheff_film_cert_2u` on loopback, and the request Host is loopback. Production does not set `STUDIO_SCENE_IMAGE_PROVIDER`. Production does set `OPENAI_API_KEY` (present, not printed), so scene images resolve to OpenAI and stay on `billProviderAction`. Preview sets `STUDIO_SCENE_IMAGE_PROVIDER=mock`, but preview is not the certification database and is not loopback, so that preview setting does not open the free path.

The image route does not read `provider`, `isTest`, `skipBilling`, or `freeGeneration`.

Isolated database test `studio-mock-billing-isolation.db.test.ts` on the exact commit, against `homecheff_film_cert_2u` only:

- simulated paid success captured 30 HC and wrote provider `openai`
- simulated paid failure refunded and left the wallet unchanged
- a second capture of the same reservation did not debit again
- a zero-credit free account created a film, was denied voice generation with `free_account_provider_action` and 15 credits, and the paid stub did not run
- a second user received `FORBIDDEN` on the owner's scene

The exact-commit browser certification captured 0 HC.

`STUDIO_CENTRAL_HC_SPEND_ENABLED` exists on production as a sensitive variable and was not decrypted. If it is true, mapped actions such as voice can use central HC. `scene_generation` is not in that map. The value is unverified. No live wallet was read for balances and no live ledger row was written.

Provider configuration on production, presence only:

| Name | Production |
| --- | --- |
| OPENAI_API_KEY | CONFIGURED |
| ELEVENLABS_API_KEY | CONFIGURED |
| STRIPE_SECRET_KEY | CONFIGURED (name present) |
| STRIPE_WEBHOOK_SECRET | CONFIGURED (name present) |
| BLOB_READ_WRITE_TOKEN | CONFIGURED |
| FFMPEG_PATH | CONFIGURED |
| FFMPEG_FONT_PATH | CONFIGURED (name present) |
| STUDIO_SCENE_IMAGE_PROVIDER | NOT SET (OpenAI selected because the key is set) |
| STUDIO_FILM_CERT_LOCAL_AUTH | NOT SET |
| STUDIO_VISION_PROVIDER | NOT SET |
| STUDIO_CENTRAL_HC_SPEND_ENABLED | UNVERIFIED |

Stripe price ids are present by name. No Stripe call was made. No provider call was made. Prices were not changed.

Paid image, voice, music, and sound-effect generation are not certified with live provider output. Only the mock and stub paths were executed.
