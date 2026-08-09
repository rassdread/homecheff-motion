# Studio Creative Specification (S.6E)

Provider-neutral intermediate representation produced by the Prompt Matrix. **Not** a giant prompt string.

## Shape (conceptual)

```
CreativeSpecification {
  matrixVersion, providerTransformVersion
  experience, detailLevel
  objective, subject
  story { title, description, action, emotion }
  continuity { characterIds, locationId, propIds, worldId, case, rules, strength }
  composition, camera, movement, lighting, style
  performance, environment, audio
  duration { resolvedSeconds, provenance, sources }
  aspectRatio { resolved, provenance, sources, why }
  platform, audience
  brand { brandKitId, available, overlayApplied }
  quality, negatives
  providerHints, overlays, modulesIncluded
}
```

## Continuity fields

Identity IDs and rules are **copied from ContinuityBundle**, never invented by Matrix when linked entities exist. Modules under `continuity.*` consume the bundle.

## Duration / aspect provenance

Conflicts are resolved explicitly (see `duration-resolution.ts`, `aspect-resolution.ts`). Final resolved value + provenance are always present.

## Overlay precedence (honest)

Product defaults → Experience defaults → Continuity → Brand (if linked) → PromptPreset (creative-only) → Explicit user choices → Director policy → Provider transform.

PromptPreset **cannot** overwrite Character/Location/Prop/World identity. BrandKit remains optional; if not linked, no brand module.
