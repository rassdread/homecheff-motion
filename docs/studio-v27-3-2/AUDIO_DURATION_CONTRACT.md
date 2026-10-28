# Audio duration contract

V27.3.1 found source files that are shorter than their timeline clips. Examples from that fixture: a sound-effect file of about 1 second on a clip of 2757 ms, and a music file of 3 seconds on a clip of 8270 ms. Those clip durations were not changed.

The current player in `studio-project-timeline.tsx` treats the clip window as the audible range. A stem is active only while the playhead is inside `startMs` through `startMs + durationMs`. Outside that window the element is paused.

Each stem is an `HTMLAudioElement`. The constructor does not set `loop`, so the default is no loop. There is no product rule in this player that repeats a short file for the rest of the clip, and none was added.

When the file ends before the clip ends, the element reaches the end of the source and stops. The scheduler seeks only when `shouldResyncMedia` says the element is more than 0.35 seconds away from the clip offset, and it calls `play()` only when the element is paused and not seeking. A seek past the end of a short file can leave `seeking` true. In that state `play()` is not called again, so the stem does not restart or duplicate after the source finishes. The clip window can continue in silence until the playhead leaves it.

This task did not rewrite clip timing and did not add automatic looping. The V27.3.1 browser measurements of those shorter files still describe this contract.
