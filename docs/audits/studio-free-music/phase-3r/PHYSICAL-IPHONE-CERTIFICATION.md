# Physical iPhone Free Music Certification

See `PHYSICAL-IPHONE-CERT.json` and `IPHONE-OFFSET-PERSISTENCE-GATE.json`.

Transport: iOS 26 Target.sendMessageToTarget via ios_webkit_debug_proxy.

## Final iPhone matrix

| Gate | Verdict |
|---|---|
| DEVICE | PASS |
| STEVE_SESSION | PASS |
| CATALOG_5_TRACKS | PASS (pre-expansion pilot catalog) |
| MP3_PREVIEW | PASS |
| OGG_PREVIEW | PASS |
| PORTRAIT | PASS |
| LANDSCAPE | PASS |
| MUSIC_BED_MUTUAL_EXCLUSION | PASS |
| PROJECT_SAVE_REOPEN | PASS |
| FREE_LOCAL_IPHONE | PASS |

## Offset persistence

Prior OFFSET_SET failure = **IPHONE_OFFSET_TEST_ARTIFACT**  
(inside-window tap at ~2s with start=0 / window≈15s → no `onStart` without move).

Corrected drag set `startSeconds≈1.72`; track + volume + offset persisted after leave/reopen.

## Clean export

`iphone-exports/iphone-free-music-export-clean.mp4` — RMS≈0.094 — PASS  
Historical silent export remains INVALID_FOR_FINAL_AUDIO_CERTIFICATION.
