# Security and zero HC

Wallets after every certification step, including the voice quote:

| User | Balance | Promotional | Reserved | Lifetime spent |
| --- | --- | --- | --- | --- |
| A | 500 | 500 | 0 | 0 |
| B | 100 | 100 | 0 | 0 |
| C | 0 | 0 | 0 | 0 |

## User B

User B opened `/studio/projects/cmvrdlbwg0005dh92s468jz8g?section=scenes`. The HTTP status was 200 because the studio shell renders, and the body did not contain `V27.2 Synthetic Film Certification`. The visible text was the account-loading line and the marketing footer.

Direct requests with user B’s session:

| Request | Status |
| --- | --- |
| GET user A’s uploaded image | 404 |
| GET timeline | 404 |
| GET film characters | 404 |
| GET render route | 405 |
| POST render `phase: start` | 404 |

## User C

The homepage confirm button (`studio-ai-home-confirm-make`) was visible. The browser did not open a project URL within 20 seconds. The same session then called `POST /api/studio/films` (201) and created project `cmvrfbhze005cdh92nfgvtk44`, scene `cmvrfbi8z005gdh92nkk8316z`. Dialogue was saved and quoted. No `action: "start"` was sent.

Quote response:

| Field | Value |
| --- | --- |
| HTTP | 200 |
| actionType | `voice_generation` |
| requiredCredits | 15 |
| allowed | false |
| reason | `free_account_provider_action` |
| voiceProfile | `warm_narrator` |
| provider | `elevenlabs` |

The wallet stayed at 0. No provider request was made.

Disposable password login cannot run unless `STUDIO_DISPOSABLE_LOCAL_AUTH=true`, the database gate passes, and the browser Host and Origin are both localhost. It does not run when `VERCEL_ENV` is set. Tests: `src/server/auth/disposable-local-auth.test.ts`.
