# Director Apply Learning & Decision Memory — Foundation Report

## Summary

Studio now records user decisions when AI Director proposals are applied, partially applied, edited after apply, or dismissed. Patterns feed advisory context into future proposals — never blocking or overriding user choices.

## How apply tracking works

1. **Generate** — `recordDirectorProposalPending()` marks an open proposal
2. **Apply** — `recordDirectorProposalApplied()` stores audit + apply baseline fingerprint
3. **Dismiss** — `recordDirectorProposalRejected()` on preview close without apply
4. **Drift** — `recordDirectorModificationsIfDrift()` on proposal build / creation assistant view when baseline differs from current storyboard

Baseline captures scene titles, descriptions, character/location refs, voice profile, and render strategy at apply time.

## How decision memory works

`buildDirectorDecisionMemory()` aggregates audits into:

- Preferred scene count range (≥2 apply events)
- Often accepted / removed structure patterns
- Learning summary keys for Creation Assistant
- Retention score vs apply baseline
- Director context lines for idea enrichment

## How AI Director learns

`enrichIdeaWithDirectorDecisionMemory()` prefixes the user idea:

```
[Director preferences: User often chooses 3-5 scenes; Often removed: scene_rewritten (2×)]
```

Advisory only — no proposal blocking.

## Production Memory extension

`mergeDecisionPatternsIntoProductionMemory()` adds `decisionPatterns[]` next to existing `productionPatterns` and appends `decision:` context lines.

## UI

- **Regisseurvoorkeuren / Director Preferences** — project tool panel
- **Productiegeschiedenis** — timeline events for all four audit kinds
- **Creative Review** — retention messaging
- **Creatieassistent** — “Studio leert dat jij meestal…” section

## Key files

| Area | Files |
|------|-------|
| Types | `src/types/studio-director-decision-memory.ts` |
| Storage | `src/lib/studio-director-decision-storage.ts` |
| Audit | `src/lib/studio-director-apply-audit.ts` |
| Memory | `src/lib/studio-director-decision-memory.ts` |
| Integration | `studio-director-proposal-builder.ts`, `studio-director-proposal-flow.tsx`, `studio-creation-assistant.ts`, `studio-creative-review.ts`, `studio-production-timeline.ts` |
| UI | `studio-workspace-director-preferences-panel.tsx`, `studio-workspace-production-history-panel.tsx`, `studio-workspace-creation-assistant-panel.tsx` |
| i18n | `src/i18n/locales/en.ts`, `nl.ts` |
| Tests | `src/lib/studio-director-decision-memory-foundation.test.ts` |

## Next sprint suggestions

1. Persist audits server-side (optional Prisma table) for cross-device learning
2. Wire snapshot ID on apply to stored production snapshots for richer diff UI
3. Surface `compareDirectorApplyBaseline()` in Director Preferences panel
4. Aggregate decision patterns across storyboards at account level
5. Tie ending/CTA pattern detection to Story Architect phase hints
