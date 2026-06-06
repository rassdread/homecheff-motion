# Deep I18N & UX Hardening Report

**Sprint:** Studio + Motion quality gate (taal, UX, kwaliteit — geen nieuwe features)  
**Date:** 2026-06-06  
**Status:** ✅ Quality gate passed (lint, typecheck, build, **1498/1498** tests)

---

## Executive summary

Motion and Studio user-facing copy is now guarded by automated i18n tests across `studio.*`, `motion.*`, `instant.*`, `maak.*`, `create.*`, `videos.*`, and `animate.*` prefixes. Dutch UI no longer surfaces forbidden developer terms (Workspace, Inspector, Provider, Storyboard, Handoff, Pipeline, Debug, etc.) in those namespaces. The AI-regisseur (Director V2) panel, verhaaleditor (workspace), and instant/maak flows received the largest copy fixes.

**Recommendation:** Subsequent phases (Workspace Embed, AI Director Proposal, Voice Clone, STT, Video Upload, Timeline Editing) may proceed from an i18n baseline; monitor remaining risks below.

---

## Mixed language issues gevonden

| Area | Issue | Resolution |
|------|-------|------------|
| `studio.directorV2.*` (NL) | English labels: Inspector, Characters, Story purpose, emotion cards, camera enums | Translated to canonical NL (AI-regisseur, Projectanalyse, Verhaaldoel, Blij/Rustig/…, Scènes) |
| `studio.workspace.*` (NL) | Scenes, chars, Workspace, Productie, power users | Verhaaleditor terminology, Scènes, pers., Video maken |
| `studio.intelligence.*` (NL) | Story arc, Story intelligence, text beats | Verhaalboog, Verhaalanalyse, tekstregels |
| `instant.storyboard.*` (NL) | Storyboard labels in wizard and stats | Videoverhaal / videoverhaalduur |
| `create.studio.title` (NL) | Storyboard- & assetstudio | Videoverhaal- & assetstudio |
| `motion.*` / `videos.*` (NL) | Provider, Storyboard, Debug | Dienst, Videoverhaal, Diagnostische |
| Components | `CardGridSkeleton` hardcoded `aria-label="Loading"` | Uses `t("common.loading")` |

**EN locale:** Studio director labels already use “AI director”, “Project analysis”. Many EN keys still use internal key names (`storyboard` in i18n keys) — acceptable; values increasingly use user-facing “storyboard” in EN (see remaining risks).

---

## Hardcoded strings gevonden

| Location | Was | Fix |
|----------|-----|-----|
| `src/components/ui/motion-studio-primitives.tsx` | `aria-label="Loading"` | `t("common.loading")` |
| `studio-*-director-panel.tsx` (prior phase) | `"Save failed"` | `t("studio.common.saveFailed")` |
| `studio-voice-preview-panel.tsx` (prior phase) | `"Generation failed"` | `t("studio.common.generationFailed")` |
| `studio-workspace-assets-*.tsx` (prior phase) | English drawer/list copy | Moved to i18n |

Component scan in `studio-i18n-deep.test.ts` guards against regressions for common literals (Production, Inspector, Save failed, etc.).

---

## Ontbrekende vertalingen

| Key | Fix |
|-----|-----|
| `studio.common.saveFailed` | Added NL: “Opslaan mislukt.” (EN existed) |
| `studio.common.generationFailed` | Added NL: “Genereren mislukt.” (EN existed) |
| `studio.start.label` | Removed orphan NL-only key (“Studio”) |

Full **nl/en key parity** verified for all user-facing prefixes in hardening test.

---

## Enum problemen

| Enum area | NL before | NL after |
|-----------|-----------|----------|
| Story purpose | Introduction, Problem, … | Introductie, Probleem, Ontdekking, … |
| Emotion cards | Happy, Calm, … | Blij, Rustig, Enthousiast, … |
| Character focus | Hero, Primary, … | Hoofdrol, Primair, Bijrol, … |
| Camera shots | Wide, Establishing, Static | Breed shot, Extreem breed, Statisch |
| Job/status labels | (verified) | Bezig, Voltooid, Mislukt / Klaar |

Users should not see raw enum slugs; dropdown/preset labels route through i18n keys under `studio.storyboards.preset.*` and `studio.directorV2.*`.

---

## Dropdown problemen

- **NL director V2 sections:** Section tabs (Director → Verhaalregie, Voice → Stem) aligned.
- **NL workspace scene list:** “Scenes” → “Scènes”.
- **Instant wizard step:** “Storyboard” → “Videoverhaal”.
- **Provider column labels:** “Provider” → “Dienst” (NL) in cost/voice/scene meta.

---

## UX copy verbeteringen

| Concept | Canonical NL | Avoided |
|---------|--------------|---------|
| Editor shell | Verhaaleditor | Workspace |
| Story project | Videoverhaal | Storyboard (in UI copy) |
| Director panel | AI-regisseur | Director V2, Inspector |
| Analysis sidebar | Projectanalyse | Inspector, Production insights |
| Export to video | Maak video / video maken | Handoff |
| Service integration | Dienst | Provider |
| Text overlays | Tekstregels | beats, text beats |
| Story structure | Verhaalboog | Story arc |
| Readiness | Klaar | Gereed (inconsistent) |

Info panels under `studio.directorV2.info.*` rewritten from developer English to plain Dutch (user benefit, not engine jargon).

---

## Gewijzigde bestanden

### Locales
- `src/i18n/locales/nl.ts` — primary hardening target (~100+ value updates)
- `src/i18n/locales/en.ts` — director/common keys (prior phase)

### Components
- `src/components/ui/motion-studio-primitives.tsx`
- `src/components/studio/studio-workspace-assets-list.tsx` (prior)
- `src/components/studio/studio-workspace-assets-drawer.tsx` (prior)
- `src/components/studio/studio-*-director-panel.tsx` (prior)
- `src/components/studio/studio-voice-preview-panel.tsx` (prior)

### Tests
- `src/lib/studio-i18n-deep.test.ts` (existing, extended coverage)
- `src/lib/studio-motion-i18n-hardening.test.ts` (**new**)
- `src/lib/i18n-locale-parity.test.ts` (existing)
- `src/lib/studio-i18n-consistency.test.ts` (existing)
- `package.json` — test script includes hardening test
- `e2e/studio-smoke.spec.ts` (prior — duplicate link fix)

### Docs (related)
- `docs/provider-capability-matrix.md`
- `docs/elevenlabs-capability-audit.md`
- `docs/deep-i18n-audit-report.md` (earlier phase; superseded in part by this report)

### Scripts
- `scripts/patch-nl-i18n-values.ts` — value-only patch helper (do not replace substrings in keys)

---

## Nieuwe tests

| Test file | What it guards |
|-----------|----------------|
| `studio-motion-i18n-hardening.test.ts` | nl/en parity for user prefixes; forbidden dev terms in NL values; no Dutch leakage in EN values |
| `studio-i18n-deep.test.ts` | Studio/maak canonical labels; emotion/purpose enums; forbidden EN in NL studio prefixes; component hardcoded scan |

---

## Quality gate results

| Check | Result |
|-------|--------|
| `npm run lint` | ✅ 0 errors (139 pre-existing warnings) |
| `npm run typecheck` | ✅ Pass |
| `npm run build` | ✅ Pass |
| `npm run test` | ✅ **1498/1498** pass |

---

## Eventuele resterende risico’s

1. **EN “storyboard” in values** — Many EN strings still say “storyboard” instead of “video story”. Keys intentionally retain `storyboard` for code compatibility. A follow-up EN copy pass can align with the NL “Videoverhaal” glossary without renaming keys.

2. **`studio.production.*` namespace** — Still uses “Provider” in EN and some legacy “Productie” paths in NL admin-adjacent production center. Not fully renamed to “Video maken” everywhere.

3. **Admin-only routes** (`admin.*`) — Excluded from user-facing forbidden-term scan; Provider/Registry terms remain correct for admins.

4. **Route URLs** — `/studio/storyboards`, `/studio/workspace` unchanged (not user-visible labels).

5. **Partial NL in `studio.directorV2.info.camera.*` / emotion info** — Some English fragments remain in long helper paragraphs (e.g. “Close-up + slow push”, “Tracking shot”). Lower visibility; safe to polish in a micro-pass.

6. **Visual/responsive audit** — Not executed in CI; manual spot-check Safari/Chrome/mobile recommended for drawer headers and tooltips.

7. **Placeholder key `{storyboard}`** — Internal interpolation name kept for parity; NL display text says “videoverhaal” (`instant.storyboard.step7Duration`).

---

## Strict i18n standard (ongoing gate)

- **NL:** Full Dutch UI; allowed brands: HomeCheff, Motion, Studio, AI, Props, Admin.
- **EN:** Full English UI; no Dutch leakage in user namespaces.
- **Never** bulk-replace substrings that appear in i18n **keys** (e.g. `storyboard` in `studio.storyboards.*`).
- **Always** patch **values** only; run `studio-i18n-deep.test.ts` + `studio-motion-i18n-hardening.test.ts` + `i18n-locale-parity.test.ts` before merge.

---

*No new features, providers, schema migrations, or Studio/Motion functionality were added in this sprint.*
