# Production Pattern Intelligence Audit

**Date:** 2026-06-06  
**Scope:** Read-only audit before Production Pattern Intelligence sprint.

---

## Patronen die al bestaan

| Systeem | Patronen |
|---------|----------|
| **Production Memory** | `buildProductionPatterns()` — regex op title/idea (HomeCheff, Garden, Designer, Affiliate, Sports, Tutorial, Community) |
| **Production Memory** | Recurring structures, durations, shot buckets, render strategies, worlds, characters |
| **Creative Review** | Top pattern in review context |
| **Production Timeline** | `memory_pattern` event type |
| **Production Planner** | Memory recommendations via `productionMemoryPlannerRecommendations()` |
| **Recurring asset detection** | Character/location reuse heuristics (separate from pattern profile) |

---

## Trends al zichtbaar

- Production Memory panel: pattern chips, worlds, characters, render approaches
- Continuity panel: recurring asset suggestions
- Production Brief: memory guidance recommendations
- AI Director: `productionMemoryContext` context lines

---

## Data ongebruikt

| Data | Status vóór sprint |
|------|-------------------|
| `productionRecords[].characterIds` + `dominantWorldIds` | Niet gecombineerd als asset patterns |
| `projectMemory.props` usage counts | Niet in pattern UI |
| Tutorial / Community pattern types | In types, niet in UI/i18n |
| Structure averages | Alleen in creation guidance, niet als Patronen-sectie |
| Timeline milestones | Geen pattern hints |

---

## Systeemoverlap

| A | B | Overlap |
|---|---|---------|
| Production Memory patterns | Pattern Intelligence profile | Profile consolideert memory output |
| Production Timeline memory events | Pattern hints | Hints verrijken milestones, geen nieuwe events |
| Creative Review pattern | Pattern context | Beide lezen memory; geen dubbele builder |
| Recurring asset detection | Asset combinations | Detection = current idea; combinations = historical pairs |

---

## Waardevolle patronen

1. **Production type** — HomeCheff, Garden, Sports, Tutorial, etc.
2. **Structure** — scene count arc labels + averages
3. **Timing** — duration buckets + shot count buckets
4. **Render** — story / hybrid / action_chain frequency
5. **Assets** — character + world pairs, recurring props

---

## Central hook

`buildProductionPatternProfile()` — pure builder over Production Memory + Project Memory records. Geen ML, geen voorspellingen.
