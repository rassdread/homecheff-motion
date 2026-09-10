# CERT_ACCOUNT — Bounded Production Access

## Mechanism chosen

**Option B — bounded promotional credits** via existing ledger (`adminAdjustCredits` / `MANUAL_GRANT`).

Not chosen: Studio `admin` role (unbounded `admin_bypass` — too broad for cert-only scope).

## Authorization decision tree (actual code)

`src/server/studio-account/studio-credit-policy.ts`:

1. `role === "admin"` → `admin_bypass` (0 credits, unbounded)
2. Free account + provider action + insufficient balance → `403` `free_account_provider_action`
3. Otherwise → reserve / capture via wallet ledger

HomeCheff `SUPERADMIN` does **not** propagate to Studio admin. CERT_ACCOUNT remained `role=user`, `accountType=free`.

## Pre-access proof

`CERT-ACCOUNT-PREACCESS-403.json` — `POST create-and-generate` → 403 `free_account_provider_action`, `requiredCredits: 450`, `balanceAfter: 0`.

## Grant applied

`CERT-ACCOUNT-ACCESS-GRANT.json`:

| Field | Value |
|-------|-------|
| Amount | 1505 promotional credits |
| Reason | `FULL_STUDIO_CERTIFICATION` |
| Ledger id | `cmt5003wi00012jlrcsfsmy10` |
| Mechanism | `adminAdjustCredits` promotional / `MANUAL_GRANT` |

Breakdown used registry costs: A motion×2, C scenes/edits/chars, D voice/music/sfx, +200 buffer.

## Post-access smoke

`CERT-ACCOUNT-POSTACCESS-SMOKE.json` — vision authorize OK; create-and-generate 200 after grant.

## Isolation

Normal free users without credits remain on `free_account_provider_action`. No global gate change, no `INSTANT_PREMIUM_MODE=test` bypass for non-admin.

## Cleanup

`CERT-ACCOUNT-ACCESS-REVOKE.json` — unused **485** promotional credits revoked (`FULL_STUDIO_CERTIFICATION_REVOKE_UNUSED`). Ledger preserved; `lifetimeGranted` remains 1505 for audit.

Final CERT_ACCOUNT wallet: **0** available, role **user**, plan **free**.
