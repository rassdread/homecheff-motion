# Zero-HC security regression

Unit policy test in `src/server/studio/authorized-local-mock-execution.test.ts`: a free account, balance 0, action `voice_generation` returns `allowed = false`, reason `free_account_provider_action`, `requiredCredits = 15`, provider `elevenlabs`.

Disposable database test, same file family as the billing regression, user with a free account and wallet 0:

- `createOwnedFilmProject` succeeds
- wallet stays 0
- `previewStudioCreditAuthorization` for `voice_generation` returns the same denial: not allowed, `free_account_provider_action`, 15 credits
- `billProviderAction` for `voice_generation` returns blocked, the stub runs 0 times, ledger rows stay 0, reserved balance stays 0
- `billProviderAction` for `scene_generation` is also blocked for that zero-credit user even while `STUDIO_SCENE_IMAGE_PROVIDER=mock` and the certification flag is on

The mock exception lives only in the scene-image route under the server authority check. It is not a wallet bypass and it does not apply to voice generation. The zero-credit user cannot obtain a paid provider execution by the process being in certification mode.
