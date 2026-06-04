# Motion Studio refresh — future work (V20+)

V20 implements **QA/metadata refresh only** (`refreshQa: true`). No Vidu rerender, no Motion image or text replacement.

## Planned (not implemented)

### Refresh images from Studio

- Replace Motion `AnimationImage` preview URLs from latest selected Studio scene stills.
- Rebuild transitions when sequence length changes.
- Mark `studioIntelligenceStatus` and run mask/baked-text preflight again.

### Refresh text from Studio

- Map latest `MotionHandoffScene` copy into `instantSceneTexts` / wizard-equivalent fields.
- Optional translate step; preserve user edits with conflict UI.

### Rebuild Motion draft from latest storyboard

- Full wizard slot rebuild from handoff (like initial import) without new `AnimationProject`.
- User confirms overwrite of local draft + server metadata.

### Selective scene sync

- Per-scene checkbox: sync image, text, or QA for scene `N` only.

## API sketch

```json
POST /api/instant-premium/projects/:id/refresh-studio-intelligence
{
  "refreshQa": true,
  "refreshImages": true,
  "refreshText": true,
  "sceneIds": ["scene-1"]
}
```

Until then, `refreshImages` / `refreshText` return **501 Not implemented**.
