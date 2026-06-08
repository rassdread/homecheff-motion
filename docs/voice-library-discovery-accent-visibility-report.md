# Voice Library Discovery & Accent Visibility Report

Sprint completed: full voice discovery, accent visibility, metadata diagnostics, and admin audit — using existing ElevenLabs integration, Voice Library, Persona Presets, Clone Library, Character Voice Center, and VoiceLibraryProvider. No new providers, TTS engines, schema migrations, or parallel voice library.

---

## Voice counts

| Metric | Mock catalog (dev, no API key) | Live ElevenLabs (with `ELEVENLABS_API_KEY`) |
|--------|--------------------------------|-----------------------------------------------|
| Catalog source | `mock` | `elevenlabs` |
| Total voices | **18** | Provider-dependent (typically 200+) |
| Previously visible (browse cap) | **48 max** (cap never hit on mock) | **48 max** — remainder hidden |
| Now visible | **18 / 18** (load-more pagination) | **All** via load-more (24 per page) |
| Languages | 4 (en, nl, es, fr) | From provider metadata |
| Accents (filter options) | 12 | From provider metadata |
| Persona presets | 14 (13 available) | Scored against live catalog |

Stats banner shows: `{voices} stemmen · {accents} accenten · {languages} talen · {personas} persona's` plus visible count (`X zichtbaar` / `X van Y zichtbaar`).

---

## Accent coverage

Featured “Discover by accent” chips (always shown, including count 0):

| Canonical accent | Mock voices | Persona presets using accent |
|--------------------|------------|------------------------------|
| British | 3 | 3 available |
| Jamaican | 1 | 1 available |
| Australian | **0** | 0 |
| Irish | **0** | 0 |
| Scottish | **0** | 0 |
| South African | **0** | 1 persona (matched via scoring) |
| Dutch | 1 | 2 available |
| Flemish | 1 | 0 |
| Surinamese | 1 | 0 |
| Caribbean | 1 | 1 available |

Helper: `buildVoiceAccentCoverageReport()` in `src/lib/studio-voice-accent-coverage.ts` — also exposed on `GET /api/studio/voice-library` as `accentCoverage`.

---

## Hidden voices removed

| Location | Before | After |
|----------|--------|-------|
| `studio-character-voice-library-section.tsx` | `filterVoiceLibrary(...).slice(0, 48)` | Paginated load-more (24/page), all reachable |
| `studio-character-voice-center.tsx` (per-language overrides) | `.slice(0, 48)` on catalog | All language-matching voices in dropdown |

On a live catalog of 218 voices, **170 voices were previously unreachable** in browse (218 − 48).

---

## Persona coverage

- Unavailable personas are **shown**, not hidden — amber card with reason (`studio.voicePersona.unavailable.noMatch`).
- Mock: 13/14 personas available; 1 unavailable when no voice scores ≥ threshold.
- Persona matching unchanged (scored selection, not first-N browse).

---

## Premium visibility

Category badges on every voice row:

- `premade` → Premade
- `professional` → Professional
- `cloned` / `clone` → Cloned

No category-based exclusion in `filterVoiceLibrary()`. Mock catalog: 18/18 premade.

---

## Search coverage

`filterVoiceLibrary()` haystack includes: **name, accent, language, description, category, labels**.

Verified: query `jamaican` returns Jamaican voices on mock catalog (1 result).

Search placeholder updated: “Search by name, accent, language, or description…”

---

## Metadata diagnostics

| Condition | UI badge |
|-----------|----------|
| Missing accent metadata | **Accent onbekend** / Accent unknown |
| Missing language metadata | **Taal onbekend** / Language unknown |

Voices with missing metadata remain visible (no silent filtering).

---

## Admin audit panel

Admin-only (`isAdmin` / `canAccessAdmin`):

- `GET /api/admin/studio/voice-library-audit` — force-refreshes catalog
- UI: `StudioVoiceLibraryAdminAuditPanel` — source, total count, top 100 rows (name, accent, language, category)

Wired through Character Voice Center when user role is admin.

---

## Tests / build status

New tests: `src/lib/studio-voice-accent-coverage.test.ts` (7 tests)

- Accent coverage report with zero-count accents
- Library stats builder
- Category badge mapping
- Search by accent keyword
- No hard 48-cap in browse UI (static source check)
- No hard 48-cap in per-language overrides

Run validation:

```bash
npm run lint
npm run build
npm run test
```

---

## Files changed (sprint)

| Area | Files |
|------|-------|
| Core | `studio-voice-accent-coverage.ts`, `studio-voice-accent-model.ts`, `studio-voice-library-catalog.ts` |
| API | `api/studio/voice-library/route.ts`, `api/admin/studio/voice-library-audit/route.ts` |
| Client | `studio-voice-library-client.ts` |
| UI | `studio-character-voice-library-section.tsx`, `studio-character-voice-center.tsx`, `studio-voice-library-admin-audit-panel.tsx` |
| Wiring | `studio-character-form.tsx`, `studio-workspace-character-voice-inline.tsx`, `studio-workspace-tool-panel.tsx`, `studio-workspace-shell.tsx`, `studio-workspace-character-identity-builder.tsx` |
| i18n | `en.ts`, `nl.ts` |
| Tests | `studio-voice-accent-coverage.test.ts`, `package.json` |

---

## Success criteria

Users can now:

- See **all** catalog voices (load-more, no 48 cap)
- Discover accents via chip row with counts (including zero)
- Filter by accent with one click
- Understand catalog size via stats banner and Persona & Bibliotheek availability line
- See why personas are unavailable
- See metadata gaps via badges
- (Admin) Inspect live ElevenLabs response without DevTools
