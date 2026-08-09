# S.8B — Auto Top-Up Certification Notes

| Check | Result |
|-------|--------|
| Before | CONFIG_ONLY |
| Opt-in + consent | Required |
| Same pack checkout as manual | PASS |
| Idempotent attempt key | PASS |
| Webhook replay (pack session) | PASS (ledger session guard) |
| Failure path | Returns AUTO_TOPUP_* codes; no negative wallet |
| Live card spend in cert | Avoided — use Stripe test / Preview |

Full Preview checklist in main S.8B audit after deploy.
