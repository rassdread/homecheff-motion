# V27.5 release blocker inventory

V27.4 verdict `NO_GO_WITH_BLOCKERS` is still the baseline. Classifications below are from this task's evidence.

| Blocker | Class | Evidence |
|---|---|---|
| Film export not proven on the Vercel runtime | CONFIRMED | Isolated function on Linux x64 returned ENOENT for `/usr/bin/ffmpeg`, `/usr/local/bin/ffmpeg`, and `ffmpeg`. The film route was not executed on Vercel. |
| Timeline migration required | CONFIRMED | `20261020120000_studio_timeline` is additive. It was applied only to `homecheff_v275_timeline_rehearsal`. Production was not migrated. |
| Production configuration partially unverified | CONFIRMED | `HOMECHEFF_IDENTITY_ORIGIN`, `LEGACY_STUDIO_LOGIN_ENABLED`, and `STUDIO_CENTRAL_HC_SPEND_ENABLED` exist as sensitive values and did not decrypt. Status UNVERIFIED. |
| Node 24 compatibility | RESOLVED | Node v24.22.2: typecheck, lint, 5524 unit tests, six database tests, and the production build passed. |
| Production storage and rendering not exercised | CONFIRMED | No production blob write. No production worker job. Local `file://` export passed. |

No additional product requirements were added. The repair in `8ffde5d7` makes the Vercel worker runtime fail closed. It does not make film export succeed on Vercel.
