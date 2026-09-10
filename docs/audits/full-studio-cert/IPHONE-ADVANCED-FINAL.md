# Physical iPhone — Advanced Studio Final

## Verdict: NOT_RUN

| Preflight | Result |
|-----------|--------|
| `idevice_id -l` | Empty |
| `ios_webkit_debug_proxy` / CDP :9222 | Not reachable |
| Web Inspector | Not available |

## Classification

| Gate | Status |
|------|--------|
| PHYSICAL_IPHONE | NOT_RUN (`DEVICE_UNAVAILABLE`) |
| IPHONE_PORTRAIT | NOT_RUN |
| IPHONE_LANDSCAPE | NOT_RUN |
| IPHONE_STATE_PRESERVATION | NOT_RUN |
| IPHONE_FINISH | NOT_RUN |
| IPHONE_PROJECTS | NOT_RUN |
| QUICK_VIDEO_DEVICE_REGRESSION | NOT_RUN |

Connect iPhone, enable Web Inspector, run `ios_webkit_debug_proxy`, then `scripts/_px4a7-iphone-physical-closeout-cert.ts` or `scripts/_px4a7-iphone-studio-core-cert.ts`.
