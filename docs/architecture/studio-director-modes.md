# Studio Director Modes (S.6F — Responsibility Boundaries Only)

**Status:** Design only — **no UI implementation**  
**Date:** 2026-08-09  

Modes are **policy overlays** on the same ContinuityBundle, Prompt Matrix, and workspace shell.  
They are not separate products.

---

## Shared across all modes

| Concern | Owner |
|---------|-------|
| Character / Location / Prop / World identity | Continuity |
| ContinuityBundle resolution | Continuity |
| CreativeSpecification assembly | Prompt Matrix |
| Provider request formatting | Provider Transform |
| Credits / GenerationJob | Generation orchestration |
| Canonical shell | `StudioWorkspaceShell` @ `/studio?storyboardId=` |

Identity and continuity are **identical** in Quick, Professional, and Director.

---

## QUICK

**User goal:** Few choices → good result.

| Responsibility | Detail |
|----------------|--------|
| Defaults | Strong: director/style profiles, shot/energy, duration, platform aspect |
| Planners used | Auto Shot (light), intent→director map, Instant/Motion presets, Creation Assistant doors |
| User surface | Guided cards / intents / Instant flows — **not** full inspector |
| Explicit user choice | Wins when present (locks) |
| Continuity | Same bundle when entities linked; standalone Instant uses source-image case |
| Must not | Hide entity attach forever; invent entities; expose Matrix/prompts |

**Existing engines that already behave Quick-like:** video intents (`/studio/start?intent=`), Motion presets, Instant styles, assistant quick starts, Character Studio prepare flows.

---

## PROFESSIONAL

**User goal:** Full creative control without Movie Builder complexity.

| Responsibility | Detail |
|----------------|--------|
| Defaults | Moderate; empty fields may get soft suggestions |
| Planners used | Scene director enums, music/sound/voice directors, composition/blocking (as available) |
| User surface | Workspace tools + right inspector; Director V2 sections |
| Explicit user choice | Authoritative for camera/style/audio/duration |
| Continuity | Full entity attach + world linkage expected |
| Must not | Remove Classic accessibility; flatten libraries |

**Existing engines:** canonical workspace tools (~25), identity libraries, Fusion intelligence paths, audio directors, scene still Matrix wrap.

---

## DIRECTOR

**User goal:** Proposal / replan / arc / production planning.

| Responsibility | Detail |
|----------------|--------|
| Defaults | Minimal auto-apply; proposals require review/apply |
| Planners used | Auto Shot + story arc, Director proposal builder/apply/compare, Movie Builder steps, Production Center, creative review, provider execution planning |
| User surface | Director V2 + Movie Builder + Production Center + proposal UX |
| Explicit user choice | Highest authority; proposals never silently overwrite locks |
| Continuity | Full; multi-scene coherence emphasized |
| Must not | Auto-charge providers; bypass Continuity; replace domain directors |

**Existing engines:** `buildDirectorProposal` / apply, AI Director compare modal, Movie Builder, Production Center, long-form duration planner, analysis planner.

---

## Mode → Matrix `detailLevel`

| Mode | Matrix detailLevel | Typical experience IDs |
|------|--------------------|------------------------|
| Quick | `QUICK` | INSTANT_*, MOTION_PRESET, RESTAURANT_PROMO, FOOD_PROMO, SOCIAL_CAMPAIGN, OUTFIT_CHANGE (guided) |
| Professional | `PROFESSIONAL` | SCENE_STILL, CHARACTER_FUSION, VOICE_TTS, STUDIO_MOTION_HANDOFF |
| Director | `DIRECTOR` | Same IDs + proposal/replan loops; Movie/Production planning |

---

## What S.6F Implementation must not do

- Build three separate apps  
- Force users into Director UI for Quick  
- Let Quick drop linked Continuity entities  
- Let Director mode rewrite Continuity memory  
- Redesign S.2 workspace shell as a side effect
