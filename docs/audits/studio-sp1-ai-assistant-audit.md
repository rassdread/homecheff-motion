# SP.1 — AI Assistant Intelligence Audit

**Date:** 2026-08-10 · **Read-only**  
**Scope:** Evaluate intelligence only — no redesign

---

## Access truth

| Layer | Behavior |
|-------|----------|
| UI (FAB / panels) | Visible on allowlisted public routes |
| Interpret API | `requireActiveUser()` — **login required** |
| Execution APIs | Authenticated + billed where applicable |
| Public visitor | Discovery shell only; not full conversational product |

---

## Intelligence stack (proven)

| Capability | Implementation | Product feel |
|------------|----------------|--------------|
| Intent routing | `assistant-intent-router` + clusters + video intents | Keyword / heuristic clusters |
| Conversational interpretation | `assistant-conversational-interpretation` + optional LLM interpret | Partial; LLM gated by flag/key |
| Session / project memory | `assistant-session-memory`, `assistant-conversation-memory`, history | Present after login |
| Producer planning | `assistant-producer-planner` | Routes to suite tools |
| Prefill / wizards | Prefill engines + banners | Strong for known actions |
| Experience Pack auto-select | **Not wired from chat** | Gap |
| Creative Director routing | Workflow reasoning mentions CD; chat ≠ Director orchestrator | Gap |
| Continuity / Prompt Matrix | Studio architecture exists; assistant does not own the chain | Gap |

---

## Natural-language probes (classification)

| Utterance | Expected product behavior | Likely today |
|-----------|---------------------------|--------------|
| “I want to make a TikTok for my restaurant.” | Pack + format + restaurant context | Partial — TikTok keywords; not full Pack orchestration |
| “I need a LinkedIn photo.” | Photo / portrait path | Partial — may miss LinkedIn-specific pack |
| “Can you make me a commercial?” | Campaign / video commercial | Partial — generic video intent |
| “I want to create a complete campaign.” | Multi-asset campaign plan | Weak — planner fragments, not campaign OS |
| “I want something similar to Apple.” | Brand-style Creative Director brief | Weak — style metaphor not first-class |

Verdict: assistant is a **capable suite router**, not ChatGPT-level open NLU that hides Studio architecture.

---

## Dimension scores

| Dimension | Score /5 | Notes |
|-----------|----------|-------|
| NLU | 2.5 | Clusters + optional LLM; not open conversation |
| Intent recognition | 3.5 | Many registered intents |
| Multi-intent | 2.5 | Limited; clarify flows exist |
| Conversation memory | 3.5 | Session/project memory after login |
| Context extraction | 3 | Prefill strong for known tools |
| Creative intent | 2.5 | Producer modes; not Director-first |
| Auto Experience Pack | 1.5 | Not chat-orchestrated |
| Auto Creative Director | 1.5 | Not chat-orchestrated |
| Continuity / Prompt Matrix | 1.5 | Downstream architecture unused by chat |
| Question quality / order | 3 | Clarify options present |
| Duplicate prevention | 3 | Partial |
| Missing context | 3 | Clarifications exist |

---

## Score

**AI Assistant intelligence: 2.5 / 5**

Users still need to understand Studio’s surface areas more than “talk and create.” Login wall + missing Pack→Director chain are the main product gaps.
