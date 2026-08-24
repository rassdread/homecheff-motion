# Billing — Final Audit (Repair Slice)

## CERT_ACCOUNT state

| Field | Value |
|-------|-------|
| Role | `user` (not admin) |
| Plan | `free` |
| Balance | **0** |
| Promotional | **0** |
| Reserved | **0** |
| lifetimeGranted | 1505 (audit history) |

Unused promo **485** revoked (`FULL_STUDIO_CERTIFICATION_REVOKE_UNUSED`).

## This slice spend

| Action | Provider credits | Notes |
|--------|------------------|-------|
| Audio mix verification | 0 | Local FFmpeg / module |
| Merge rebuild / diagnostic worker | 0 | Provider-free composition |
| Automatic merge replay | 0 | Existing segments only |
| Orchestration repair code | 0 | No provider |
| New Vidu | **0** | Hard cap respected |
| New promo grant | **0** | Not required |

## Merge retry safety

- Rebuild / automatic finalization do not reserve generation credits for merge
- No Vidu/OpenAI calls on existing-asset orchestration
- No duplicate `usage_capture` on rebuild / automatic merge paths
- Normal free-user gate unchanged (`CERT-ACCOUNT-PREACCESS-403.json` preserved)
- No global bypass introduced

## Classification

| Gate | Status |
|------|--------|
| BILLING | CERTIFIED |
| BILLING_SAFETY | CERTIFIED |
