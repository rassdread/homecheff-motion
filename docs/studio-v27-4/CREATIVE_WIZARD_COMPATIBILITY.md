# Creative wizard compatibility

Compared `afbbd4cc` (live) with `dcd0caea` (candidate), and checked the live domain without a session.

| Wizard | Live route | Live HTTP | Candidate vs live commit | Verdict |
| --- | --- | --- | --- | --- |
| Photo animation | `/motion` | 200 | `src/app/motion/page.tsx` unchanged. New layout adds a return link. `/motion/start` still redirects to `/animate/instant` or `/motion`, and now keeps a safe `returnTo`. | UNCHANGED page, IMPROVED return link |
| Product image editor | `/editor/start` | 200 | `src/app/editor/start/page.tsx` unchanged. Layout gained the same return link. | UNCHANGED page |
| Quick ad | `/studio/quick-ad` | 200 | No diff on that route. | UNCHANGED |
| Voice / music / SFX | `/studio/audio/create` | 404 | Page and `StudioAudioCreatePage` are new. The page uses the existing music panel, sound-effects panel, and ElevenLabs voice request helpers, and can return to a film. | ADDED route. Live does not have it, so nothing was removed. |
| Video experience | `/studio/experience` | 200 | No diff on that route. | UNCHANGED |

No wizard route that exists on the live commit was deleted. The new audio route is an entry onto existing generators, not a replacement of `/motion` or the editor.
