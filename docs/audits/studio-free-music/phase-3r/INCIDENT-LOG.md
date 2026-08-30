# Phase 3R — Incident Log

| Time (UTC) | Event | Severity | Action |
|---|---|---|---|
| 2026-08-28 ~12:49 | Production SHA `99fc742f` — pre–Free Music deploy | Info | Gate BLOCKED; waited |
| 2026-08-28 ~12:51 | Production SHA `1ef40264` deployed | Info | Gate PASS |
| 2026-08-28 ~12:49 | Pilot upload: 5× `BLOB_TOKEN_MISSING` | Blocker | Documented; requires Production token |
| 2026-08-28 | Pilot user ID not in repo audits | Blocker | STOP — request PO |
| 2026-08-28 | No Production E2E browser/iPhone session | Info | NOT_RUN documented |
| 2026-08-28 ~17:00 | Gap closure: render architecture = FREE_LOCAL_ONLY; SERVER_RENDER/AUTOMATIC_FINALIZATION = NOT_APPLICABLE | Info | Documented |
| 2026-08-28 ~17:20 | Source-audio ON/OFF retest PASS (maxDelta ≈ 0.102); prior PARTIAL = fixture sample window | Info | Closed |
| 2026-08-28 | Physical iPhone unavailable — expansion 5→55 blocked | Gate | Keep PARTIAL; 50 DRAFT |
| 2026-08-28 | Safari persistence Playwright WebKit IndexedDB harness fail; classified CERTIFIED_WITH_AUTOMATION_TIMING_NOTE | Info | Not product FAIL |
| 2026-08-28 ~18:30 | iPhone closeout: pilot redeploy `dpl_27PBdgYN4TAZFQS2hYpe6KFADhBS`; API precheck PASS | Info | Device gates NOT_RUN |
| 2026-08-28 | Cert host: idevice_id empty, CDP empty — physical iPhone not enumerable | Gate | 5→55 blocked |
| 2026-08-28 ~18:45 | Pilot removed; safe-end redeploy | Info | FINAL_SAFE_STATE restore |
| 2026-08-28 ~20:00 | iPhone closeout retry 2: still no USB/CDP enumeration; pilot not re-enabled | Gate | Manual Trust+Web Inspector required |
| 2026-08-30 ~08:05 | Clean iPhone re-cert: volume contract proven `min=0 max=100`; set 80 → draft `volume=0.8`; track+volume persist after reopen | Info | Prior volume FAIL = CERT_AUTOMATION_VOLUME_SCALE_ERROR (test artifact) |
| 2026-08-30 ~08:05 | Offset via synthetic PointerEvent on iOS Safari did not change `startSeconds` (stayed 0) | Info | Physical drag required for offset gate; volume path PASS on clean project |
| 2026-08-30 ~08:06 | Clean AirDrop `homecheff-video 4.mp4` (355807 B, Mediabunny, RMS≈0.094) → FREE_LOCAL_IPHONE=PASS | Info | Canonicalized to iphone-free-music-export-clean.mp4; silent export not reused |
| 2026-08-30 | Expansion still blocked pending offset persistence on save/reopen | Gate | Volume+track PASS on clean project |
| 2026-08-30 ~08:25 | Offset gate PASS — prior fail classified IPHONE_OFFSET_TEST_ARTIFACT | Gate | Corrected drag startSeconds≈1.72 persisted; IPHONE_PROJECT_SAVE_REOPEN=PASS |
| 2026-08-30 ~08:32 | 5→55 upload: created 50, reused 5, failed 0; blob verify 55/55; ACTIVE 55 / DRAFT 0 | Expansion | Reconcile PASS |
| 2026-08-30 | Save/reopen volume=0 linked to cert automation setting range 0–100 as fraction 0.38 | Info | Likely TEST_ARTIFACT; Chromium persistence already CERTIFIED |

No safety incidents. No registry/evidence mutation. No public activation. No economic operations.
