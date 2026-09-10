# Duplication / Legacy Audit

## Highest-impact clusters

### 1. Where is my work?
| Surface | Role | Canonical? |
|---|---|---|
| `/projects` | Human project library (S2H) | **YES** |
| `/videos` | Motion/render ops gallery | No — still primary-nav |
| `/studio/storyboards` | Entity list / Advanced | No |

**User cost:** Three answers to one question.  
**Recommendation:** Primary nav emphasizes Projects; Videos becomes advanced/detail of Motion outputs.

### 2. Motion creation doors
| Door | Status |
|---|---|
| `/animate/instant` | Canonical |
| `/motion` hub | Secondary discovery |
| `/animate` legacy | Retire candidate |

### 3. Create entry IA
| Door | Intents |
|---|---|
| `/studio` Slice 1A | Quick video, Image, AI video, Animation |
| `/create`→`/` MaakChoice | New story, Photos→video, Editor, Studio stories |

**Not the same taxonomy.** New users hitting “Create” vs “Studio” learn different maps.

### 4. Finish / export
Canonical Studio: **S2G Finish hub**. Still parallel: Production Center, Movie Builder, Publish autoFinish, Instant merge, Quick Video finish.

### 5. Audio / music UI
Quick Video Free Music (certified) vs Studio Music Director + V9 panels + Director V2 music section. Labels/volume contracts risk inconsistency (known Free Music 0–1 vs 0–100 artifact history).

### 6. Director V2 vs Classic
V2 is default workspace UI; Classic remains deep-linkable. Keep Classic advanced-only; do not promote.

### 7. Provider UI
`/studio/providers` returns **200** on Production — architecture leaking to product URL space. Hide/redirect for normal users.

## Why both exist
Historical phase stacking (PX → S2 → Instant → S2H) without full retirement of prior doors.

## Product rule
Duplication is allowed only when intentional (advanced vs simple). Current state fails that test for Projects/Videos and Create/Studio.
