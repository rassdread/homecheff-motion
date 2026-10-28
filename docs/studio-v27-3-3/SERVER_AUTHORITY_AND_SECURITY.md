# Server authority

`isAuthorizedLocalMockSceneImageExecution` in `src/server/studio/authorized-local-mock-execution.ts` accepts only:

- `STUDIO_SCENE_IMAGE_PROVIDER` exactly `mock` (the fallback when an API key is missing does not qualify)
- `STUDIO_FILM_CERT_LOCAL_AUTH` exactly `true`
- `filmCertLocalDatabaseReason` null, which requires no Vercel environment and `DATABASE_URL` on `127.0.0.1` or `localhost` port 5432 for `homecheff_film_cert_2u` only
- request Host hostname `127.0.0.1` or `localhost`

The function does not read a body. The image route does not read `provider`, `isTest`, `skipBilling`, or `freeGeneration`. Unit tests reject the disposable HTTP database, the protected Neon host, `VERCEL_ENV=preview`, a public Host, a missing Host, and an OpenAI or unset scene-image provider.

A customer request that names the mock provider still reaches `billProviderAction` unless every server condition above is already true. Those conditions are process environment plus the loopback Host. They are not browser fields.

Outside that environment, `scene_generation` keeps the registry price. A mock image setting on any other database, including production, does not become a free generation path.

Wallet middleware, credit authorization, and the ledger remain in place for paid actions. No public skip flag was added. Prices were not changed.

Cross-user: `loadSceneForImage` returns `FORBIDDEN` unless `studioStoryboardViewerCanModify` allows the viewer. The disposable-database test creates a film for user A and calls `generateStudioSceneImage` as user B. The result is `FORBIDDEN`. User A's balance stays 500 and user B's balance stays 100. Neither user gains a ledger row from that call.
