# CERT_ACCOUNT — Billing / Credit Audit

## Starting state (pre-grant)

| Field | Value |
|-------|-------|
| Studio role | `user` |
| Account type | `free` |
| Available credits | 0 |
| Promotional | 0 |

## Temporary access

+1505 promotional via ledger `cmt5003wi00012jlrcsfsmy10` (`FULL_STUDIO_CERTIFICATION`).

## Usage during closeout (approx)

| Phase | Credits captured (ledger) | Notes |
|-------|---------------------------|-------|
| A — Rode loper Vidu | ~450–900 | One motion capture + earlier reservation cycle; final merge via rebuild (no extra Vidu) |
| C — Scene images | ~120 | 4× `usage_capture` @ 30 (orders 0,2,4,6) |
| C — Scene 5 rerender | ~30 | Second image on scene 5; old still preserved |
| D — Audio mix | 0 | Local S2E-P1 FFmpeg; no AI providers |
| Post-access smoke | ~5 | Vision authorize only |

**Total promotional spend:** ~1020 (1505 granted − 485 revoked unused).

## Reservations / capture

Observed normal lifecycle: `usage_reservation` entries during long-running scene generation; captures on completion. No duplicate capture observed on reviewed ledger tail.

## Ending state (post-revoke)

| Field | Value |
|-------|-------|
| Balance | 0 |
| Promotional | 0 |
| Reserved | 0 |
| Available | 0 |
| lifetimeGranted | 1505 (audit history) |
| lifetimeSpent | ~1020 |

## Normal free-user regression

Pre-access 403 preserved in `CERT-ACCOUNT-PREACCESS-403.json`. Policy path unchanged; cert access was account-scoped promo only.
