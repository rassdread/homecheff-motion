# Character Capabilities Reality Audit

## Welke data al bestaat

| Bron | Velden | Herbruikbaar voor capabilities |
|------|--------|--------------------------------|
| Character Identity | `role`, `personality`, `visualKeywords` (hc:type, energy), `defaultClothing`, `defaultAccessories`, `description` | Outfit/accessory presets → expected actions |
| Prop Identity | `appearanceMemory` (`hc:func=cooking\|sports\|…`) | Prop-linked action enrichment |
| World Identity | `visualStyle` (`hc:world=food_universe\|sports_universe\|…`) | World-biased supported actions |
| Scene | `action`, `description`, `title` | Action classification input |
| Blocking Director (V44) | `CharacterAction` enum via keyword match | Vocabulary reference, not persisted |
| Render Strategy | Verb patterns on scene text | Complexity scoring (now capability-aware) |

## Welke acties al impliciet bestaan

1. **Scene action presets** — user-facing action strings in composer
2. **V44 CharacterAction** — COOKING, RUNNING, PRESENTING, etc. (runtime only)
3. **Render strategy verb patterns** — kick, cook, harvest, celebrate, …

These are now unified via `studio-scene-action-extraction.ts` → capability IDs.

## Welke systemen acties gebruiken

| Systeem | Gebruikt `scene.action`? |
|---------|--------------------------|
| Shot planner (beats) | ✅ label + detail keywords |
| Render strategy | ✅ complexity + split advice |
| Blocking director | ✅ keyword → CharacterAction |
| Sound / music director | ✅ indirectly via scene text |
| Prompt builders | ✅ scene text |
| AI Director proposal | ✅ mock storyboard actions |
| Identity consumption | ❌ (framing only) |
| Project memory (DB) | ❌ (no action stats persisted) |

## Welke systemen acties negeren

- Auto-shot planner (arc/energy only)
- Scene image planner (consistency, not capability fit)
- Project memory snapshot (asset counts only)

## Welke velden herbruikbaar zijn

- `defaultClothing` / outfit keywords → chef, garden, designer, sporty
- `defaultAccessories` → spoon, basket, ball, needle
- `hc:func` on props → cooking, sports, harvest
- `hc:world` on world profiles → food, sports, community universes
- `personality` tokens → warm, energetic, creative
- `role` / `isMascot` → mascot celebrate/present bias

## Gap (pre-sprint)

No `buildCharacterCapabilities()` or `classifySceneActions()` existed. Three parallel action vocabularies were not unified.

## Sprint resolution

- `buildCharacterCapabilities()` — identity + prop + world derivation
- `classifySceneActions()` — supported / possible / unusual / unsupported
- Shared extraction module for render strategy + capabilities
- Recommendations only — no blocks
