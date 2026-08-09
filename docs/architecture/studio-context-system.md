# Studio Context System (S.6C)

**Status:** Architecture freeze  
**Rule:** Selection drives inspector. No duplicated Continuity SoT in UI.

---

## 1. Principle

```
Selected object
  → Context type
  → Right Inspector schema
  → Optional center focus
```

One selection → one primary inspector.  
Library entities remain authoritative in DB; inspector **edits** them or **links** them — it does not fork identity.

---

## 2. Context types (canonical)

| Selection | Context type | Inspector shows |
|-----------|--------------|-----------------|
| Project / CreativeProject | `project` | Title, pin/favorite/archive, links |
| Storyboard | `storyboard` | Title, director/style profiles, voice defaults, readiness |
| Scene | `scene` | Title, description, action, emotion, shot, movement, energy, duration, links |
| Character (library or scene-linked) | `character` | Identity, memory, refs, voice, strength, world |
| Location | `location` | Identity, environment, lighting, refs, world |
| Prop | `prop` | Identity, branding, refs, world |
| World | `world` | Style, tone, continuity rules |
| Brand Kit | `brand` | kitJson fields (logo, colors, fonts, …) |
| Asset / SceneImage | `asset` | Preview, metadata, versions, usage |
| GenerationJob / queue item | `job` | Status, capability, errors, retry |
| Render / Motion handoff | `render` | Aspect, duration, provider plan, prerequisites |
| Prompt Preset | `preset` | Scope, presetJson (storage) |

---

## 3. Context transitions

| User action | New context |
|-------------|-------------|
| Click scene in rail | `scene` |
| Click character chip on scene | `character` (same id) |
| Open location from scene | `location` |
| Select job in bottom bar | `job` |
| Enter make-video / render | `render` |
| Clear selection | `storyboard` or `scene` fallback |

---

## 4. Anti-duplication rules

1. **No second Character editor** that writes a parallel identity blob for the same `characterId`.  
2. Scene inspector may **link** entities; deep edit uses Character context.  
3. Director controls that affect ContinuityBundle (shot/energy) live under `scene` or `storyboard` — not a shadow Continuity store.  
4. Mobile sequential screens must use the **same context types**, not alternate schemas.

---

## 5. Continuity Bundle resolution trigger

Whenever context is `scene` (or generation is requested for a scene):

```
resolveContinuityBundle(storyboardId, sceneId)
  → World, Characters, Location, Props, Brand?, Storyboard, Scene, Director, Camera, Refs
```

Inspector edits that change links/memory **invalidate** the bundle for the next generation.

---

## 6. Current vs target

| Aspect | Today | S.6C freeze |
|--------|-------|-------------|
| Inspector panels exist | Yes (S.2) | Keep |
| Formal context type enum | Informal | **Canonical list above** |
| Brand/Preset inspector | Limited | Reserved contexts |
| Duplicate Classic forms | Exist | Allowed until parity; same entity SoT |

No UI redesign in S.6C — implementers of later phases must follow this context map.
