# Studio AI orchestration (SP.3)

**Status:** Incremental — Assistant is the natural entry; modular systems remain.

## Principle

User speaks naturally → Assistant interprets → Studio chooses the workflow.

Users should not need: Prompt Matrix, continuity engine, pipeline routing.

## Current spine

```
Natural request
  → assistant-intent-router / conversational interpretation (+ optional LLM)
  → assistant-action-registry
  → buildAssistantActionRoute
  → /studio/experience   (guided / packs)   OR   tool-specific routes
  → (auth) Creative Director / production when required
```

## Capability grounding

| Registry | Path |
|----------|------|
| Assistant actions | `src/lib/assistant-action-registry.ts` |
| Assistant tools (V4) | `src/lib/assistant-tool-capability-registry.ts` |
| Generation | `src/lib/studio-generation-capabilities.ts` |
| Experience packs | `src/lib/studio-creative-director/product-experience-registry.ts` |

Do not invent capabilities that are not registered.

## SP.3 change

`create_video_production` defaults to `/studio/experience` so Pack/Director entry is discoverable. Existing `hcProject` context still deep-links to `/studio/start`.

Creative Director remains primarily **orchestration**, not mandatory public terminology.
