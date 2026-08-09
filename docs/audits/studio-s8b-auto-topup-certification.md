# S.8B — Auto Top-Up Certification Notes

| Check | Result |
|-------|--------|
| Before | CONFIG_ONLY |
| After runtime | PARTIAL — opt-in + Checkout intent (not silent off-session PI) |
| Opt-in + consent | PASS (Preview) |
| Default OFF | PASS |
| Same pack checkout as manual | PASS (same `createCreditPackCheckout`; `pack_500`) |
| Idempotent attempt key | PASS `auto_topup:{userId}:{packId}:{UTC_hour}` |
| Parallel trigger | PASS — second POST `already_pending`, same `attemptId` |
| Checkout session created | PASS — **`cs_live_…`** (LIVE mode) |
| Successful TEST payment → webhook → grant | **BLOCKED** — no `sk_test` on Preview |
| Webhook replay | Deferred until TEST payment path exists |
| Failure path | Code returns `AUTO_TOPUP_*`; not fully exercised with declined LIVE card |
| Live card spend in cert | **Avoided** — Checkout URL not opened/paid |

## Environment honesty

Preview and Production use **LIVE** Stripe keys and a **shared** Neon database. S.8B Step 8 requires Stripe **TEST**. Completing Checkout would be a real charge path.

## Attempt evidence (Preview, 2026-08-09)

- User: `cmsm5j95l0000jr048ww1xf7z` (`s8b.cert.1786301061@example.com`)
- Attempt: `cmsm5n7bg0006jr0487ht5shy`
- Key: `auto_topup:cmsm5j95l0000jr048ww1xf7z:pack_500:2026-08-09T18`
- Status after duplicate: `already_pending`
- ATU disabled again after cert to avoid further LIVE sessions
