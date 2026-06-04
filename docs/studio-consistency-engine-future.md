# Studio — Future Consistency Engine (documentation only)

V10 introduces **world memory** and **continuity strength** so Studio can think in identities and universes, not isolated scenes. The **Consistency Engine** is the planned post-generation layer between stills and motion.

## Planned pipeline

```
Character / Location / Prop / World Memory
        ↓
   Prompt Builder (V10)
        ↓
   Scene Images (V8+)
        ↓
   Consistency Engine (future)
        ↓
   Motion (Vidu / wizard)
        ↓
   Video export
```

## Consistency Engine responsibilities (future)

- Compare generated stills against memory snapshots and reference images
- Score drift (identity, palette, props, location layout)
- Suggest or auto-apply prompt refinements and re-generation
- Feed corrected metadata into Motion handoff

## V10 scope boundary

- Memory is **stored** and injected into **prompts**
- Motion handoff **v4** carries memory snapshots for later use
- No automated image repair or video rendering in V10
