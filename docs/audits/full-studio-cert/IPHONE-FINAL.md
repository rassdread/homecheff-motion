# Physical iPhone — Scenario E

## Verdict: **NOT_RUN**

| Check | Result |
|-------|--------|
| `idevice_id -l` | Empty — no device connected |
| Web Inspector / :9222 | Not attempted |
| Production login on device | Not attempted |

## Classification

| Gate | Status |
|------|--------|
| PHYSICAL_IPHONE | NOT_RUN (`DEVICE_UNAVAILABLE`) |
| IPHONE_LANDSCAPE | NOT_RUN |

Physical iPhone remains a **required hard gate** for full product certification when device policy applies. No device ≠ product defect; certification **blocked** on this gate until physical smoke completes.
