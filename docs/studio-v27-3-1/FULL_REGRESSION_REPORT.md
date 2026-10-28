# Full regression

V27.3 baseline was 5508 passing, 0 failing, 1 skipped, 991 suites.

This run, after the media-range tests were added:

| Check | Result |
| --- | --- |
| `npm test` | 5515 tests, 5514 pass, 0 fail, 1 skipped, 992 suites, exit 0 |
| `npx tsc --noEmit --pretty false --incremental false` | exit 0, no output |
| `npx eslint .` | exit 0, 0 errors, 476 warnings |
| `npm run build` | exit 0, compiled successfully in 36.1s, 536 static pages |

The first eslint pass reported 477 warnings. One was a new unused `ownerA` in `scripts/v2731-library-video-cert.ts`. That constant was removed. The second full-tree pass is the result above: 476 warnings, the same count as the V27.3 tree after its unused-variable removal. No warning was suppressed.

Local database integration tests, each in its own process, keys for OpenAI, ElevenLabs, Vidu, Stripe, and Blob unset:

| File | Database | Result |
| --- | --- | --- |
| `studio-film-certification.db.test.ts` | `homecheff_film_cert_2u` | pass 1, fail 0 |
| `studio-unified-film-production.db.test.ts` | `homecheff_film_cert_2u` | pass 1, fail 0 |
| `studio-film-live-providers.db.test.ts` | `homecheff_film_cert_2u` | pass 1, fail 0 |
| `studio-v24-history.db.test.ts` | `homecheff_film_cert_v24` | pass 1, fail 0 |
| `studio-timeline-migration.db.test.ts` | `homecheff_timeline_migrate_cert` | pass 1, fail 0 |

`studio-local-media.test.ts` covers the byte-range response. `studio-timeline.test.ts` covers `shouldResyncMedia`.

Port 3456 is not part of this pass. See `PORT_3456_BROWSER_CERTIFICATION.md`.

No test was removed or weakened. Leftover scenes titled New scene were not deleted.
