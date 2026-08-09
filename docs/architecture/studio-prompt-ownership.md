# Studio Prompt Ownership (S.6C)

**Status:** Frozen ownership map before Prompt Matrix (S.6D)  
**Law:** Continuity owns identity. Prompt Matrix assembles. Providers transform last.

---

## 1. Ownership split

| Concern | Owner | May not |
|---------|-------|---------|
| Character/Location/Prop/World/Brand **records** | Continuity / entity domains | Be owned by Matrix |
| ContinuityBundle resolution | Continuity Assembler | Be skipped by Matrix |
| Shot / energy / director **choices** | Creative Director + Scene fields | Delete entity links |
| Phrase packs, style lines, quality, negative, safety modules | **Prompt Matrix** | Own entity CRUD |
| Provider-specific syntax / budgets / native refs | **Provider Transform** | Mutate Continuity SoT |
| Job lifecycle / credits | Generation Orchestrator (S.4) | Rewrite identity |
| Final string/params to API | Transform output | Bypass Continuity input |

---

## 2. Assembly order (canonical)

```
1. Resolve ContinuityBundle          ← Continuity
2. Apply Director mode decisions     ← Creative Director (options only)
3. Assemble Matrix modules           ← Prompt Matrix
      Identity.* (from bundle — mandatory if linked)
      Story, Director, Camera, Lighting
      Audio, Voice
      Quality, Negative, Safety, Render
      Provider hints (neutral)
4. Provider Transform                ← Adapter
5. Final prompt + params + refs      ← To provider
```

**Interim (today):** steps 1+3 largely live in `studio-prompt-builder` + memory/identity modules + `studio-scene-image-prompt`.  
**S.6D:** replace/extend assembler **in place** without moving entity ownership.

---

## 3. What Matrix assembles (from Continuity)

| Module | Source |
|--------|--------|
| Identity.Character | ContinuityBundle.characters |
| Identity.Location | ContinuityBundle.location |
| Identity.Prop | ContinuityBundle.props |
| Identity.World | ContinuityBundle.world |
| Identity.Brand | ContinuityBundle.brand |
| Story | Scene + storyboard narrative fields |
| Director | Director profile + proposals |
| Camera | Shot / movement / energy |
| Lighting | Location/world lighting descriptors (+ future) |
| Voice / Audio | Character voice + storyboard + directors |
| Quality / Negative / Safety | Matrix policies + hardcoded quality lineage |
| Render | Aspect/duration/handoff constraints |

---

## 4. Forbidden prompt patterns

1. **Anonymous flatten:** “a woman in a kitchen…” with no Character/Location ids when links exist.  
2. **Budget drop of Identity modules** without Continuity policy approval.  
3. **Provider Transform inventing** a new character description that contradicts Continuity memory.  
4. **Dual assemblers** that diverge Continuity for the same scene (Studio vs Instant) long-term — Instant must adopt ContinuityBundle.

---

## 5. Presets

| Preset type | Owner | Role |
|-------------|-------|------|
| `StudioPromptPreset` | Storage (S.5) | Matrix input later — never Continuity SoT |
| Hardcoded style/director profiles | Storyboard / Director | Choices feeding Matrix |
| Motion action presets | Motion Instant | Outside Studio Continuity until bridged |

Presets may **add** style/camera notes; they may **not** overwrite Character memory fields.

---

## 6. Certification hook

Any S.6D PR that changes prompt assembly must demonstrate:

- ContinuityBundle still resolved for linked entities  
- Identity modules present in Matrix output metadata  
- ReferenceDescriptors preserved into Transform  

See Continuity Test Matrix in `studio-s6c-continuity-foundation.md`.
