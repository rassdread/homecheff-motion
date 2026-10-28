# Database integration tests

The three databases already existed on `127.0.0.1:5432`. They were not created in the cloud. Every user email is `@example.test`.

| Database | Tables | Non-synthetic users | Isolation |
| --- | --- | --- | --- |
| `homecheff_film_cert_2u` | 63 | 0 | `inet_server_addr` 127.0.0.1 |
| `homecheff_film_cert_v24` | 63 | 0 | same |
| `homecheff_timeline_migrate_cert` | 60 before the test recreated timeline tables | 0 | same |

They differ from `homecheff_studio_v27_2_test` (65 tables) by `StudioAssetIntelligenceCache` and `_prisma_migrations`. The tests were not retargeted and their host and name checks were not changed. API keys for OpenAI, ElevenLabs, Vidu, Stripe, and Blob were unset in the shell. Each file also deletes the keys it uses.

`npx tsx --test` results, each in its own process:

| File | Env | Result |
| --- | --- | --- |
| `studio-film-certification.db.test.ts` | `FILM_CERT_DATABASE_URL` | pass 1, fail 0 |
| `studio-unified-film-production.db.test.ts` | `FILM_CERT_DATABASE_URL` | pass 1, fail 0 |
| `studio-film-live-providers.db.test.ts` | `FILM_CERT_DATABASE_URL` | pass 1, fail 0 |
| `studio-v24-history.db.test.ts` | `V24_CERT_DATABASE_URL` | pass 1, fail 0 |
| `studio-timeline-migration.db.test.ts` | `TIMELINE_MIGRATE_DATABASE_URL` | pass 1, fail 0 |

The live-provider file injects mocks. Its log names `providerMode: openai_image_generations:dall-e-3` inside the production spine trace. The test title is `billed film providers capture and refund test credits without a live call`, and it passed with the provider keys removed.

The timeline test logs `relation "StudioTimeline" already exists` during the second apply, then rolls that transaction back. The assertion requires that second apply to fail. The pass is that assertion, not a swallowed error.

`studio-film-certification.browser.ts` was not run. It requires `https://127.0.0.1:3456` and would need a second server on `homecheff_film_cert_2u`. The dev server on port 3462 stayed on `homecheff_studio_v27_2_test`.
