# Free Music Phase 4 — Content ID Incident Runbook

**Status:** Operational for Phase 4 launch  
**Contact:** support@homecheff.eu  
**Scope:** Curated Free Music catalog (Quick Video), current 55 CC0 tracks

## Trust baseline

- Licence class for current catalog: **CC0**
- Attribution required: **false** for all 55
- Content ID risk: **UNKNOWN** for all 55
- **Do not** claim Content ID safe / claim-free / copyright-proof
- Approved wording: HomeCheff verifies licence/provenance used to admit tracks; third-party platforms can still make automated claims

## Intake fields (user or operator)

| Field | Required |
|---|---|
| Report date | yes |
| Reporter account / email | yes |
| Track ID (`fm_oga_…`) | yes if known |
| Track title / artist | yes |
| Platform (YouTube, Meta, TikTok, other) | yes |
| Claim / match reference or screenshot | optional |
| Studio project context (no private media needed) | optional |
| Current catalogStatus (ACTIVE/SUSPENDED/…) | operator fill |
| Licence evidence pointer (`src/data/free-music/evidence/{trackId}.v1.txt`) | operator fill |

## Outcomes

| Code | Meaning |
|---|---|
| `REVIEW` | Under investigation; catalog stays ACTIVE |
| `TEMPORARILY_DISABLE` | Set `catalogStatus` to `SUSPENDED` after PO/ops approval |
| `CLEAR` | No action; leave ACTIVE |
| `REMOVE` | `RETIRED` only after explicit rights decision |

Rules:

- One report ≠ automatic removal
- Prefer track-level `SUSPENDED` over global kill switch for isolated track issues
- Use global `STUDIO_FREE_MUSIC_CATALOG_ENABLED=false` for P0 catalog-wide security/export failures
- Do not promise legal representation

## Severity

| Level | Example | Action |
|---|---|---|
| P0 | Unauthorized asset leak; widespread broken FREE_LOCAL with catalog | Kill switch |
| P1 | Material catalog/preview/export failure for many users | Kill switch or urgent patch |
| P2 | Isolated track Content ID report | REVIEW → TEMPORARILY_DISABLE if needed |
| P3 | Cosmetic / analytics | Backlog |

## Logging

Operators may record `free_music_content_id_reported` via support tooling notes; client analytics may emit the same event type when a future report UI exists. Phase 4 minimum is this runbook + FAQ/copyright-abuse route.
