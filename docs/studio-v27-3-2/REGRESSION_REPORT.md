# Regression report

V27.3.1 baseline: 5514 passing, 0 failing, 1 skipped, 992 suites, typecheck pass, eslint 0 errors and 476 warnings, production build pass, database tests 5/5.

This run, after the film-cert login gate and the logout guard:

| Check | Result |
| --- | --- |
| `npm test` | 5519 tests, 5518 pass, 0 fail, 1 skipped, 992 suites, exit 0 |
| `npx tsc --noEmit` | exit 0, no output |
| `npx eslint .` | exit 0, 0 errors, 476 warnings |
| `npm run build` | exit 0, compiled in 31.8s, 536 static pages |

The four new tests are the film-cert login gate and the password-form method check. No assertion was removed. No warning was suppressed.

Local database integration tests, each in its own process, with OpenAI, ElevenLabs, Stripe, and Blob keys unset:

| File | Database | Result |
| --- | --- | --- |
| `studio-film-certification.db.test.ts` | `homecheff_film_cert_2u` | pass 1, fail 0 |
| `studio-unified-film-production.db.test.ts` | `homecheff_film_cert_2u` | pass 1, fail 0 |
| `studio-film-live-providers.db.test.ts` | `homecheff_film_cert_2u` | pass 1, fail 0 |
| `studio-v24-history.db.test.ts` | `homecheff_film_cert_v24` | pass 1, fail 0 |
| `studio-timeline-migration.db.test.ts` | `homecheff_timeline_migrate_cert` | pass 1, fail 0 |

The HTTPS browser script exited 0. See `PORT_3456_BROWSER_CERTIFICATION.md`.

Port 3462 and port 3456 both returned HTTP 200 for `/login` after these tests.
