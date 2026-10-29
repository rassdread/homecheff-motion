# Film duration tests

Local worker, synthetic lavfi media, commit `4880f88844e0b3f2a8dcef1bec36eee4c210f3ae`. No live Render job and no paid provider.

Each film has three scenes: a still, then two generated videos, plus voice, music, and a sound effect. Output is 720x1280.

| Film | Accept | Render | Peak RSS | Peak CPU sample | Peak temp | Output | Duration | Video | Audio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15s | 6 ms | 2.7 s | 536 MB | 136% | 7 MB | 391 KB | 15.0 s | h264 | aac |
| 30s | 4 ms | 3.7 s | 548 MB | 373% | 12 MB | 778 KB | 30.0 s | h264 | aac |
| 60s | 4 ms | 5.8 s | 484 MB | 488% | 22 MB | 1.6 MB | 60.0 s | h264 | aac |

RSS and CPU include the worker process and its FFmpeg children. CPU above 100% is a multi-core sample, not a one-core measurement. Temp is the `studio-film-*` directories during the run.

Center pixels from the three scenes were different, and the first second was not silent. Scene order follows the existing timeline assembler.

These are the longest films certified. There is still no product maximum duration in the code. A single picture segment still has the existing 120 second FFmpeg timeout.
