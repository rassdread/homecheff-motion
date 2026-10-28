# Preview readiness

Verdict: `PARTIAL_INTEGRATION`

The existing Studio is not ready for a new isolated Preview until the port-3456 browser certification can actually run.

## Met

- Browser audio is `HTMLAudioElement` playback. Voice, music, and SFX advance on the saved timeline. Pause holds. Resume continues. Seek backward and forward resynchronize. The film clock reaches the end.
- A distinct library video was selected in the scene library UI, stayed attached after refresh, played in the timeline, and appears in a new MP4 export. The original scene still was kept.
- User B cannot read or attach that video.
- The historical image editor and the historical animation editor both saved a rename that survived reload.
- Zero-HC user C can create a film, add a scene, and save dialogue. The voice quote stays `allowed: false`, `free_account_provider_action`, 15 credits. No HC was spent.
- Unit tests, typecheck, lint, production build, and the five local database integration tests passed.
- No paid provider call, Stripe operation, production write, preview write, push, merge, or deploy.

## Not met

Port 3456 did not certify. `next dev --experimental-https` could not install a local certificate in this shell, then refused to start because the disposable server is already running in the same directory. The existing script then failed with `ERR_CONNECTION_REFUSED` at `https://127.0.0.1:3456/login`. The script was not changed, and the login gate was not widened.

`LOCAL_CERTIFIED_PREVIEW_CANDIDATE` requires that browser certification to have been completed. It was executed and it failed, so the verdict stays partial.

## Next action

Start `https://127.0.0.1:3456` against `homecheff_film_cert_2u` without stopping the disposable server from being the only process that can use this worktree, and without enabling legacy or preview login on a non-local host. Then run `src/server/studio/studio-film-certification.browser.ts` again. Do not deploy a Preview before that passes.
