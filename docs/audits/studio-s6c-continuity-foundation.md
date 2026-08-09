# Studio S.6C — Continuity Foundation Audit

**Date:** 2026-08-09  
**HEAD:** `f82d8322` (+ local Product Truth docs)  
**Mode:** Architecture contracts only  
**Code / production / prompt changes:** **NONE**  
**Commits:** None unless user requests

## Companion contracts

| Doc |
|-----|
| `docs/architecture/studio-continuity-foundation.md` |
| `docs/architecture/studio-workspace-canonical.md` |
| `docs/architecture/studio-context-system.md` |
| `docs/architecture/studio-prompt-ownership.md` |
| `docs/architecture/studio-provider-independence.md` |
| `docs/architecture/studio-non-negotiables.md` (binding) |

---

## Definition of Done checklist

| Criterion | Status |
|-----------|--------|
| Continuity ownership frozen | ✓ Single-owner table |
| Entity ownership frozen | ✓ Character/Location/Prop/World/Brand/Scene/Storyboard contracts |
| Workspace architecture frozen | ✓ Desktop/tablet/mobile IA |
| Prompt ownership frozen | ✓ Continuity vs Matrix vs Transform |
| Provider independence verified | ✓ Agnostic bundle; Transform-only coupling |
| Adaptive Workspace documented | ✓ Canonical shell + placement |
| Context system documented | ✓ Selection → inspector |
| Prompt Matrix boundaries frozen | ✓ Required modules + must/must-not |
| Creative Director boundaries frozen | ✓ Quick/Pro/Director; same ContinuityBundle |
| Future certification tests documented | ✓ Below |
| No production behavior changes | ✓ |

---

## Continuity Test Matrix (future certification — no implementation in S.6C)

Tests to require before claiming Continuity STRONG or shipping Matrix regressions:

| ID | Scenario | Pass criteria |
|----|----------|---------------|
| CT-01 | Same Character across ≥5 scenes | Same `characterId` linked; ContinuityBundle includes Character Identity module each gen; job metadata retains id |
| CT-02 | Same Character across ≥2 storyboards | Re-link works; memory fields identical source row |
| CT-03 | Same kitchen/location across scenes | Same `locationId`; Location module present |
| CT-04 | Same Brand on outputs | When Brand wired: Brand module present; until then: contract slot documented, no false “branded” claims |
| CT-05 | Same voice across scenes | Character voice fields → handoff/TTS resolve to same VoiceIdentity |
| CT-06 | Same clothing | `defaultClothing` / appearance memory appear in Identity module; not dropped by Matrix |
| CT-07 | Same World | World resolved from links; World module present when worldProfileId set |
| CT-08 | Same lighting descriptors | Location/world lighting fields survive into Lighting/Identity modules |
| CT-09 | Same mood/style | Storyboard style/director + scene emotion survive assembly |
| CT-10 | Provider switch (mock↔OpenAI or future) | ContinuityBundle unchanged; only Transform differs |
| CT-11 | Motion handoff | Continuity-aware stills + voice plan attached; aspect policy documented |
| CT-12 | Non-bypass | Generation with linked entities fails cert if Identity modules omitted |
| CT-13 | Reference descriptors | ReferenceDescriptors present for linked entities with refs (pixel use may still be PARTIAL) |
| CT-14 | Fusion identity-preserving | Preserve rules + Continuity subset for character/brand intents |

---

## Frozen ownership summary

| Concern | Owner |
|---------|-------|
| Identity entities | Continuity / domain services |
| ContinuityBundle | Continuity Assembler |
| Prompt modules assembly | Prompt Matrix (S.6D) |
| Provider syntax | Provider Transform |
| Planning modes | Creative Director |
| Jobs/credits | S.4 Orchestrator |
| Workspace shell | S.2 Adaptive Workspace |

---

## Known gaps (explicit — not blockers for S.6C contract freeze)

| Gap | Handled by |
|-----|------------|
| Brand not in gen yet | Reserved pipeline slot + CT-04 |
| No pixel refs at scene T2I | CT-13 partial; enhancement later |
| No Storyboard→World FK | Future additive |
| Instant/Editor parallel assemblers | Must adopt ContinuityBundle over time |
| New scenes empty links | Product policy later |

These gaps **do not** block defining the foundation. They **do** block claiming Continuity is already STRONG.

---

## S.6D entry gate

S.6D Prompt Matrix Implementation may start **only if** it:

1. Takes ContinuityBundle as mandatory input for scene generation  
2. Implements required Identity.* modules without owning entities  
3. Keeps Provider Transform last  
4. Adds tests mapped to CT-01…CT-14 (as applicable)  
5. Does not rewrite Continuity memory schemas as a side effect  

---

## Final decision

# GO FOR STUDIO S.6D — PROMPT MATRIX IMPLEMENTATION

**Rationale:** Continuity Foundation contracts, ownership, workspace IA, prompt ownership, provider independence, Matrix/Director boundaries, and future cert tests are fully defined and documented. No production behavior was changed. Remaining gaps are tracked enhancement items, not missing contracts.

**Blockers for GO:** None for **contract phase**.  
**Blockers for claiming Continuity STRONG:** Pixel conditioning, Brand wiring, link inheritance — tracked above.
