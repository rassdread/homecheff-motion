# S.8B — Auto Top-Up Certification Notes

| Check | Result |
|-------|--------|
| Before | CONFIG_ONLY |
| After runtime | PASS — opt-in + Checkout intent (not silent off-session PI) |
| Opt-in + consent | PASS (Preview) |
| Default OFF | PASS |
| Same pack checkout as manual | PASS (same `createCreditPackCheckout`; `pack_500`) |
| Idempotent attempt key | PASS `auto_topup:{userId}:{packId}:{UTC_hour}` |
| Parallel trigger | PASS — second POST `already_pending`, same `attemptId` |
| Checkout session created | PASS — **`cs_test_…`** (TEST mode) |
| Successful TEST payment → webhook → grant | **PASS** |
| Webhook replay | **PASS** — NO-OP (ledger/`stripeSessionId` guard) |
| Failure path | **PASS** — declined TEST card; no grant; session unpaid/expired |
| Live card spend in cert | **Avoided** — TEST sandbox only |

## Environment honesty

| Scope | Stripe mode | Notes |
|-------|-------------|-------|
| Preview | **TEST** | Preview-only `rkcs_test` / `pk_test` + TEST price IDs + listen `whsec` |
| Production | **LIVE** | Unchanged `sk_live` + LIVE prices + LIVE webhook secret |
| Isolation | PASS | Fail-closed mode checks; TEST prefers env price IDs over shared-DB LIVE IDs |

Preview and Production still share Neon. Certification used a dedicated non-customer user only.

## TEST payment evidence (Preview, 2026-08-09)

- Deployment: `dpl_AopEUX8ec2oySqrptgUUsDMQXvNQ` @ `c5adca81`
- URL: `https://homecheff-motion-na4h9nil3-sergio-s-projects-f7b64ee1.vercel.app`
- User: `cmsm77ifh0000l104flx3ecp7` (`s8b.test.1786303871@example.com`)
- Plan: `creator` (10% plan discount catalog; pack path shared — no ATU-only pricing)
- Attempt: `cmsm7m72y0001ik04mkxavgu5`
- Key: `auto_topup:cmsm77ifh0000l104flx3ecp7:pack_500:2026-08-09T19`
- Session: `cs_test_b1PBfwo0ejk5D2dXsYfJuGCA3bMfCLhVaE0x9H4ieTP68sn45M5AnNqh1M`
- Webhook: `checkout.session.completed` → Preview `200` via `stripe listen` + protection bypass
- Grant: one `credit_purchase` / `PURCHASED` **+500**; wallet purchased 0→500
- Replay: signed re-POST → `200`, wallet/ledger unchanged
- Discount parity: ATU + manual pack both `price_…pack_500` @ €4.99
- Decline: ATU + manual Checkout with `4000000000000002` → unpaid, no second grant
- Cleanup: ATU disabled; reserved cleared; unpaid sessions expired

## Remaining risks (non-blocking)

- Temporary claimable Stripe sandbox key (expires 2026-08-16) — claim for durable TEST keys
- Shared Neon Preview/Production DB
- Checkout card decline leaves attempt `pending` until expire/ops transition (account was `pending_payment`)
- SCA/3DS headless probe inconclusive (session remained unpaid; no grant)
