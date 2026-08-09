# Studio Guided Questions (S.6G)

**Code:** `src/lib/studio-creative-director/guided-questions.ts`  
**UI:** `src/components/studio/studio-guided-questions.tsx`

---

## Rules

- Driven by Experience Pack registry `quickQuestions` (+ curated P0 extras for Outfit / Animation).
- No separate React flow per pack.
- Consumer labels only — no provider names, no prompt jargon.
- Internal values stay structured (`corporate`, `9:16`, …).
- Answers become `CreativeIntentAnswers` → Creative Director → Matrix selections.

---

## Types (current)

| Type | Use |
|------|-----|
| `single_choice` | Chips / cards |
| `boolean` | Yes / No |
| `short_text` | Optional short fields |
| `platform_choice` | Share destination |
| `style_choice` | Style / vibe |

Asset selection uses existing Instant / CS upload surfaces after the funnel — not a duplicate picker in S.6G.

---

## Modes

| Mode | Questions |
|------|-----------|
| Quick | Essential only (capped) |
| Professional | + brand colors, music, etc. when declared |
| Director | Full Studio controls (workspace) — funnel may still seed answers |

---

## Coach

Suggestions appear after questions. Accept → `applyCoachSuggestionToAnswers` → Director answers only. Never Continuity / Matrix module writes.
