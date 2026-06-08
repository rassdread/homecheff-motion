# Character Reference & Canonical Identity Report

## Audit

### Problem (before)

Multiple reference uploads (`chef_v1.png`, `chef_final.png`, …) left Studio without a single source of truth for:

- which image is official
- which image Motion should use
- which image storyboards should inherit

Existing schema already had `referenceImageUrl`, `referenceStorageKey`, and `primaryReferenceImageId`, but reference replacement **deleted** the previous blob and there was no archive/history UI.

### Approach (this sprint)

- **No schema migration** — canonical bundle stored in `referenceNotes` under `[identity:refs]` JSON block (same pattern as `[identity:forbidden]` elsewhere).
- **Primary reference** = existing `referenceImageUrl` + `primaryReferenceImageId`.
- **Supporting roles** (face, outfit, style, expression) reserved in bundle structure for future upload UI.
- **Archive** — on primary replace, previous primary moves to archive; blob is **not** deleted.
- Reused: Character Identity Builder fields, readiness engine concepts, memory mappers, Motion handoff pipeline.

### Key files

| Area | Files |
|------|--------|
| Canonical refs | `src/lib/studio-character-canonical-references.ts`, `src/types/studio-character-canonical-references.ts` |
| Health / readiness | `src/lib/studio-character-health.ts` |
| Story usage | `src/server/studio/studio-character-story-usage.ts` |
| Service archive | `src/server/studio/studio-character-service.ts` |
| Storyboard memory | `src/lib/studio-memory-mappers.ts`, `src/types/studio-memory-snapshots.ts` |
| Motion snapshot | `src/types/studio-character-snapshot.ts`, `toCharacterSnapshot()` |
| Character overview UI | `src/components/studio/studio-character-canonical-overview-panel.tsx` |
| Detail page | `src/components/studio/studio-character-detail-view.tsx` |
| API | `GET /api/studio/characters/[id]` returns `health` + `storyUsage` |

---

## Canonical references

- **Primary (official):** `referenceImageUrl` with badge “Officiële referentie / Official reference”.
- **Supporting:** parsed from `[identity:refs]` bundle (`face`, `outfit`, `style`, `expression`).
- **History:** `archive[]` entries with `wasPrimary: true` for former primaries.
- **Human notes:** text before `[identity:refs]` marker; machine JSON hidden from memory tab display.

Replace flow:

1. User uploads new primary via existing character form.
2. Service archives old URL into bundle, assigns new `primaryReferenceImageId`, sets `primarySetAt`.
3. Old blob retained (no `deleteStudioReferenceBlob` on replace).

---

## Storyboard consumption

`toCharacterMemorySnapshot()` now attaches `canonicalIdentity` on every character in scene memory bundles:

- `primaryReference` (official URL + id)
- `supportingReferences`
- `visualStyle`, `outfit`, `colorTheme` from identity fields
- `identityMetadata` (name, role, description, personality, appearance, visualKeywords)
- `worldProfileId` / `worldProfileName`

Storyboards loading full character rows automatically consume canonical data — no manual re-selection per scene.

---

## Motion consumption

`CharacterSnapshot` extended with optional `canonicalIdentity` (same shape as memory snapshot).

`toCharacterSnapshot()` includes full canonical bundle when `referenceStorageKey` is available (storyboard service path).

Motion handoff already passes `characterMemory` from memory mappers; payloads now carry enriched canonical identity for visual style, outfit, and color theme — not only bare `referenceImageUrl`.

---

## Character health

`buildCharacterHealthView()` checks:

| Check | Weight |
|-------|--------|
| Identity filled (name, type/role, description) | 25 |
| Voice linked (enabled + explicit choice) | 25 |
| World linked | 25 |
| Primary reference present | 25 |

**Status:**

- `Character ready` — all checks pass, no warnings
- `Needs attention` — any missing check or warning

**Warnings:**

- No voice
- No world
- No reference
- Stale reference (character `updatedAt` after `primarySetAt`)

Displayed on character detail overview tab + returned from detail API.

---

## Character readiness

Detail API response:

```json
{
  "character": { ... },
  "storyUsage": { "sceneCount", "storyboardCount", "storyboardIds" },
  "health": { "status", "score", "checks", "warnings", "references", "storyUsage" }
}
```

Overview panel sections: **Identity**, **Voice & world**, **Canonical references**, **Story usage**.

---

## Tests/build status

Run validation:

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run build
npm run test
```

New tests: `src/lib/studio-character-canonical-references.test.ts` (bundle round-trip, archive on replace, health ready/stale/warnings).

No new AI providers, no image generation, no schema migrations.
