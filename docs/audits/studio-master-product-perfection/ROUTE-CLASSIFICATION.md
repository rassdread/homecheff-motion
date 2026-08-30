# Route Classification

Legend: CORE_CURRENT | CURRENT_SECONDARY | ADVANCED | INTERNAL_ONLY | LEGACY_REQUIRED | DUPLICATE | DEPRECATED_CANDIDATE | BROKEN | UNREACHABLE | UNKNOWN

| Route / workflow | Class | Action |
|---|---|---|
| `/studio` home intents | CORE_CURRENT | KEEP + POLISH |
| `/studio?storyboardId=` workspace | CORE_CURRENT | KEEP + POLISH |
| `/studio/photo-video` Quick Video | CORE_CURRENT | KEEP + POLISH |
| `/studio/photo-video/from-item` | CORE_CURRENT | KEEP |
| `/studio/from/homecheff/…` | CORE_CURRENT | KEEP + POLISH |
| `/studio/experience` | CORE_CURRENT | POLISH (naming) |
| `/projects` S2H | CORE_CURRENT | KEEP + POLISH |
| `/pricing`, `/account/billing` | CORE_CURRENT | POLISH (trust copy) |
| `/editor`, `/editor/start` | CORE_CURRENT | KEEP |
| `/animate/instant` | CORE_CURRENT | KEEP + POLISH |
| `/motion` hub | CURRENT_SECONDARY | DE-EMPHASIZE vs Instant |
| `/motion/start` | CURRENT_SECONDARY | KEEP (shim) |
| `/videos` | CURRENT_SECONDARY / DUPLICATE vs projects | MERGE narrative → Projects |
| `/studio/storyboards` | ADVANCED | DE-EMPHASIZE |
| `/studio/storyboards/[id]/classic` | ADVANCED / LEGACY_REQUIRED | HIDE default; keep deep link |
| `…/production`, `…/movie-builder` | ADVANCED | DE-EMPHASIZE |
| `/studio/production` | ADVANCED | DE-EMPHASIZE |
| `/publish` | CURRENT_SECONDARY | KEEP contextual |
| `/library` → assets | CURRENT_SECONDARY | KEEP |
| `/studio/providers` | INTERNAL_ONLY (exposed) | HIDE |
| `/animate` legacy | DEPRECATED_CANDIDATE | RETIRE / redirect |
| `/create` `/maak` | DUPLICATE IA vs `/studio` | MERGE |
| `/studio/account` | DUPLICATE | MERGE → `/account` |
| `/studio/advanced`, `/my-studio` | LEGACY_REQUIRED redirect | KEEP redirect |
| Director V2 (in-workspace) | CORE_CURRENT | KEEP |
| Director classic panels | ADVANCED | DE-EMPHASIZE |
| Free Music in QV | CORE_CURRENT | KEEP (obs pending) |
| `/admin/**` | INTERNAL_ONLY | KEEP gated |
| Debug panels | INTERNAL_ONLY | KEEP flag-gated |
| `POST /api/test-blob` | INTERNAL_ONLY / **BROKEN security** | REPAIR (remove/gate) — **P0** |

No BROKEN core product routes found via Production HTTP smoke (200/redirect). No UNREACHABLE primary CTAs in Slice 1A home.
