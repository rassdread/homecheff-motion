# Isolated test results

Application commit `c722b35b`. No live job. No Docker image. Full unit suite was not repeated; V27.6 ran it on this commit (5525 pass, 0 fail, 0 skip, Node v24.22.2).

| Test | Result | Where |
|---|---|---|
| A Motion route source | PASS as UNCHANGED files. Not executed live | diff |
| B Instant-premium route source | PASS as UNCHANGED. Not executed live | diff |
| C Language-export route source | PASS as UNCHANGED. Not executed live | diff |
| D Marketplace route source | PASS as UNCHANGED. Not executed live | diff |
| E Film route | PASS | V27.6 local worker |
| F Worker authentication | PASS | this pass, local 401 |
| G Invalid bearer | PASS | this pass, local 401 |
| H Missing job | PASS | this pass, local 404 |
| I Wrong job type | PASS | code filters `TIMELINE_EXPORT`; other ids are `not_found`. No extra row was inserted |
| J Cross-user | PASS | V27.6 |
| K Duplicate dispatch | NOT_RUN as a concurrent pair. The second call after success passed in V27.6 | local worker |
| L Retry after failure | PASS for an empty timeline, V27.6. Encode retry after a crash NOT_RUN |
| M Worker restart | NOT_RUN |
| N Single-scene | PASS | V27.6 local worker, 1 second |
| O Three-scene | PASS in-process only, V27.6. Not on the worker process |
| P Voice, music, SFX | PASS | V27.6 local worker, one mixed AAC stream |
| Q H.264 | PASS local worker. NOT_VERIFIED live |
| R AAC | PASS local worker. NOT_VERIFIED live |
| S MP4 download | PASS local browser certification, V27.6, worker mode unset |
| T Storage upload failure | NOT_RUN |
| U Missing source | PASS | empty timeline, V27.6 |
| V Invalid timeline | PASS as the empty timeline case |
| W Concurrent exports | NOT_RUN |
| X No duplicate HC | PASS | V27.6 wallet 500 |
| Y Motion regression suite | PASS as the V27.6 full suite, which includes Motion tests. Live Motion job NOT_RUN |
| Z Film browser | PASS | V27.6 clean checkout, local FFmpeg |

Docker image of `Dockerfile.worker`: BLOCKED. Docker is not installed. An isolated Render service was not created.
