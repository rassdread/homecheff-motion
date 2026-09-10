# i18n Audit

**Requirement:** No mixed-language UI.

## Findings (sample, not exhaustive locale dump)

| Item | Class | Notes |
|---|---|---|
| Studio Slice 1A intents NL/EN | OK | Parity present |
| Free Music contentIdNotice | OK (Phase 4 closed) | — |
| `instant.advancedCreator.title` NL = `"Advanced creator settings"` | EN_ONLY / HARDCODED English in NL | `nl.ts` |
| Terms/FAQ Free Music | OK | Phase 4 |
| Help subscription examples | OK if prices official | Must match live prices |
| Marketing vs Studio tone | SEMANTIC_MISMATCH risk | Create/Maak vs Studio intents |

## Scope note

Full key parity scan not executed this audit. Targeted leaks found; treat as P2 i18n hygiene in perfection sprint (no broad refactor).

**Action:** Inventory remaining EN strings in `nl.ts` for user-facing Instant/Studio surfaces.
