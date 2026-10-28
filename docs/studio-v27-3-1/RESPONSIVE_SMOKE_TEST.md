# Responsive smoke

Checked after the controls had loaded. Overflow is `scrollWidth - clientWidth`.

Evidence: `docs/studio-v27-3-1/evidence/responsive-smoke.json` and the matching screenshots.

| Screen | Ready control | 1440 | 768 | 390 | 360 |
| --- | --- | ---: | ---: | ---: | ---: |
| Film timeline | `film-timeline-play` | 0 | 0 | 0 | 0 |
| Scene library, distinct video button visible | `studio-v273-attach-asset-cmvscmlyh0001dht7b64pqhgv` | 0 | 0 | 0 | 0 |
| Historical image editor | `editor-menu` | 0 | 0 | 0 | 0 |
| Historical animation page | page heading | 0 | 0 | 0 | 0 |

No new horizontal overflow. The play control, the library attach button, the editor menu, and the animation heading were visible at each width. This was not a redesign audit.
