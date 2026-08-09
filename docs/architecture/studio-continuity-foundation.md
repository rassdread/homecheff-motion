# Studio Continuity Foundation (S.6C)

**Status:** CANONICAL CONTRACT — frozen before Prompt Matrix  
**Date:** 2026-08-09  
**Depends on:** Product Truth audit, Non-Negotiables (NN-01…NN-15)  
**Nature:** Architecture contracts only. No runtime rewrite in S.6C.

---

## 0. Principle

Studio is a **persistent multi-scene creative production platform**.

Characters, Locations, Props, Worlds, Brand, Voice, and Style are **identity carriers**.  
The Prompt Matrix is an **assembler**.  
The Creative Director is an **orchestrator**.  
Providers are **adapters**.

**Continuity owns identity. Nothing bypasses Continuity.**

---

## 1. Canonical continuity pipeline

Every generation request **must** be able to receive continuity in this order (conceptual SoT):

```
World
  ↓
Characters
  ↓
Locations
  ↓
Props
  ↓
Brand
  ↓
Storyboard
  ↓
Scene
  ↓
Director
  ↓
Camera
  ↓
Provider (selection / capability)
  ↓
Prompt Matrix (assembler)
  ↓
Provider Transform
  ↓
Final Prompt (+ provider params / refs)
```

### Pipeline rules

1. **Upstream identity cannot be discarded** by Director, Matrix, or Transform.  
2. **Director may choose** shot/energy/duration; it may **not** strip Character/Location IDs or memory.  
3. **Prompt Matrix assembles** sections; it does **not** own or invent identity records.  
4. **Provider Transform** may reformat for Vidu/OpenAI/future; it must preserve identity payload (text modules + reference asset descriptors).  
5. **Brand** is a first-class continuity input even when runtime consumption is currently storage-only (S.5) — the contract reserves the slot.  
6. Stages after Continuity may **add** style/camera/quality/negative/safety — never **replace** identity modules with anonymous prose that loses entity IDs.

### Mapping to current implementation (honesty)

| Contract stage | Current code reality (S.6B) |
|----------------|----------------------------|
| World→…→Scene | Via asset links + scene junctions; no Storyboard→World FK |
| Brand | Slot reserved; gen does not read `StudioBrandKit` yet |
| Director/Camera | Rule directors + scene shot fields |
| Prompt Matrix | **Not implemented** — `studio-prompt-builder` is the interim assembler |
| Provider Transform | Partial (Vidu budget); not a unified layer |
| Reference pixels at T2I | Gap — refs in metadata/vision; Matrix must keep ref descriptors |

S.6C freezes the **target contract**. Closing gaps is later work; deleting current identity injection is forbidden.

---

## 2. Entity contracts (frozen)

### 2.1 Character

| Dimension | Contract |
|-----------|----------|
| **Identity** | Stable `id`, `ownerId`, `name`, `slug`, `role`; never reduced to nameless prompt text alone |
| **Memory** | `appearanceMemory`, `personalityMemory`, `continuityNotes`, `visualKeywords`, clothing/accessories, strength fields |
| **Reference assets** | Primary `referenceImageUrl` (+ storage key) **required**; supporting refs allowed |
| **Continuity data** | Scene links (`StudioSceneCharacter`); drift signals; consistency/vision scores as inputs to later gens |
| **Voice** | Optional owned voice fields + lock + history; travels to Motion handoff |
| **Provider transforms** | Exported as **Identity Module** + **Reference Descriptor** (URL/role), not provider-native only |
| **Required** | name, reference image, owner |
| **Optional** | world link, voice, performance/mouth, mascot flags |
| **Future** | Pixel conditioning at gen; embeddings — additive, not replacement of memory |

### 2.2 Location

| Dimension | Contract |
|-----------|----------|
| **Identity** | Stable `id`, name, slug, category |
| **Memory** | `worldMemory`, `visualIdentity`, `environmentKeywords`, `continuityNotes`, strength |
| **Reference assets** | Primary reference required at create |
| **Continuity data** | `StudioScene.locationId`; re-link across storyboards |
| **Provider transforms** | Location Identity Module + ref descriptor |
| **Required** | name, reference, owner |
| **Optional** | worldProfileId, lighting descriptors |
| **Future** | Storyboard default location; pixel lock |

### 2.3 Prop

| Dimension | Contract |
|-----------|----------|
| **Identity** | Stable `id`, name, slug, category |
| **Memory** | `appearanceMemory`, `brandingRules`, continuity notes/strength |
| **Reference assets** | Primary reference required |
| **Continuity data** | `StudioSceneProp` junction |
| **Provider transforms** | Prop Identity Module + branding rules module |
| **Required** | name, reference, owner |
| **Optional** | world link |
| **Future** | Stronger logo/product pixel lock via Fusion/provider refs |

### 2.4 World

| Dimension | Contract |
|-----------|----------|
| **Identity** | `StudioWorldProfile` id, name, slug |
| **Memory** | `visualStyle`, `tone`, `continuityRules`, strength |
| **Reference assets** | Optional future; not required today |
| **Continuity data** | Via `worldProfileId` on Character/Location/Prop; resolved into scene memory bundle |
| **Provider transforms** | World module (style/tone/rules) |
| **Required** | name, owner |
| **Optional** | links from child entities |
| **Future** | Explicit Storyboard→World FK (additive) — do not remove profile model |

### 2.5 Brand

| Dimension | Contract |
|-----------|----------|
| **Identity** | `StudioBrandKit` id + name; kit payload (logo, colors, fonts, voice/music refs, business) |
| **Memory** | `kitJson` as durable brand memory |
| **Reference assets** | Logo/watermark/intro/outro asset ids/URLs inside kit |
| **Continuity data** | Project-optional link; favorites |
| **Provider transforms** | Brand module (colors/logo rules/tone) — **reserved** |
| **Required (contract)** | Slot in pipeline |
| **Current runtime** | Storage/API only — wiring is post-S.6C, without deleting model |
| **Future** | Generation + Fusion + Motion consume Brand module |

### 2.6 Storyboard

| Dimension | Contract |
|-----------|----------|
| **Identity** | `StudioStoryboard` id, owner, title |
| **Memory** | Director/style profiles, voice settings, production metadata |
| **Continuity data** | Ordered scenes; shared style/director across scenes |
| **Owns** | Scene collection; storyboard-level audio defaults |
| **Does not own** | Character/Location/Prop library records (links only) |

### 2.7 Scene

| Dimension | Contract |
|-----------|----------|
| **Identity** | `StudioScene` id within storyboard |
| **Memory** | title, description, action, emotion, camera/shot/movement/energy, duration |
| **Continuity data** | Linked characterIds, locationId, propIds; selected images |
| **Owns** | Scene-local creative choices + link set |
| **Must receive** | Full Continuity Bundle resolved from links + storyboard + world + brand |

---

## 3. Continuity Bundle (canonical payload)

Every generation path (Image, Video handoff, Fusion when identity-preserving, Voice when character-scoped) **must** accept or resolve a `ContinuityBundle`:

```
ContinuityBundle {
  world?: WorldIdentity
  characters: CharacterIdentity[]   // ordered, with ref descriptors
  location?: LocationIdentity
  props: PropIdentity[]
  brand?: BrandIdentity             // may be null until wired
  storyboard: StoryboardContext
  scene: SceneContext
  director: DirectorContext
  camera: CameraContext
  voice?: VoiceIdentity[]           // character-owned and/or storyboard
  style: StyleContext               // storyboard style profile + world style
  references: ReferenceDescriptor[] // role + url + entityId + entityKind
  continuityMeta: {
    strengths, driftHints, priorScores?
  }
}
```

**Rule:** Prompt Matrix input = ContinuityBundle + user/director options + quality/safety policy.  
**Forbidden:** Matrix inventing a Character without an entity id when a linked Character exists.

---

## 4. Continuity ownership (single owner each)

| Concern | Single owner module | Persistence SoT |
|---------|--------------------|-----------------|
| Character continuity | Continuity Foundation / Character domain | `StudioCharacter` + scene junction |
| Location continuity | Continuity Foundation / Location domain | `StudioLocation` + scene FK |
| Prop continuity | Continuity Foundation / Prop domain | `StudioProp` + scene junction |
| World continuity | Continuity Foundation / World domain | `StudioWorldProfile` |
| Voice continuity | Character voice subdomain (+ storyboard voice for narration) | Character voice fields / StoryboardVoice |
| Brand continuity | Brand Kit domain | `StudioBrandKit` |
| Style continuity | Storyboard style profile + World visualStyle | Storyboard + World fields |
| Scene continuity | Scene domain (links + local fields) | `StudioScene` |
| Storyboard continuity | Storyboard domain | `StudioStoryboard` |
| Continuity → prompt injection | **Continuity Assembler** (today: memory + identity + prompt-builder identity/continuity sections) | — |
| Prompt phrase/style/camera packs | **Prompt Matrix** (future) | — |
| Provider formatting | **Provider Transform** | — |
| Creative planning choices | **Creative Director** (orchestrator) | — |

**Nothing may have two owners.** Directors propose; Continuity persists; Matrix assembles; Transform adapts.

---

## 5. Provider independence

Changing OpenAI → Vidu → Kling → Runway → Veo **must not** require rebuilding Character/Location/Prop/World memory.

| Layer | Provider-independent? |
|-------|------------------------|
| Entity DB fields + refs | **Yes** (required) |
| ContinuityBundle | **Yes** |
| Matrix modules (identity…) | **Yes** |
| Provider Transform | **No** — only place for provider syntax |
| Native provider IDs on entities | Optional cache only; never sole SoT |

See `studio-provider-independence.md`.

---

## 6. Boundaries for S.6D Prompt Matrix

### Matrix MUST

- Accept ContinuityBundle as mandatory input for scene generation  
- Emit discrete modules: Identity (char/loc/prop/world/brand), Story, Director, Camera, Lighting, Audio/Voice, Quality, Negative, Safety, Render  
- Preserve entity IDs in metadata alongside prose  
- Pass ReferenceDescriptors through to Transform  

### Matrix MUST NOT

- Own Character/Location/Prop/World CRUD  
- Replace memory fields with one-off prompt strings without entity linkage  
- Drop continuity/identity sections “for token budget” without Continuity policy  
- Call providers directly (orchestrator/adapters do)

### Required Matrix modules (names frozen)

`Identity.Character` · `Identity.Location` · `Identity.Prop` · `Identity.World` · `Identity.Brand` · `Story` · `Director` · `Camera` · `Lighting` · `Audio` · `Voice` · `Provider` · `Quality` · `Negative` · `Safety` · `Render`

---

## 7. Creative Director contract

| Mode | Behavior | Continuity |
|------|----------|------------|
| Quick | Auto-fill director/camera/duration defaults | **Same ContinuityBundle** |
| Professional | Full manual options | **Same ContinuityBundle** |
| Director | Proposal / replan / arc | **Same ContinuityBundle** |

Director **orchestrates** options and planners.  
Director **never replaces** Continuity or deletes entity links.

---

## 8. Non-bypass rule (certification)

A path is **non-compliant** if it generates scene media while:

1. Scene has linked Character/Location/Prop and ContinuityBundle omits them, or  
2. Matrix output lacks Identity modules for linked entities, or  
3. Transform strips ReferenceDescriptors that Continuity provided, or  
4. Entities are flattened to anonymous text with no recoverable entity ids in job metadata.

Motion handoff and Fusion identity-preserving intents must receive ContinuityBundle (or documented subset) — not a bare prompt string alone.

---

## 9. Known gaps (tracked, not erased)

| Gap | Contract stance |
|-----|-----------------|
| No Storyboard→World FK | Future additive FK allowed |
| Brand unused in gen | Slot reserved; wire later |
| No pixel refs at scene T2I | Enhancement path; keep refs |
| New scenes empty links | Product policy later; Continuity still requires links when present |
| Dual prompt stacks (Instant/Editor) | Must converge to ContinuityBundle over time |

---

## 10. Relationship to Non-Negotiables

This foundation **implements** NN-01…NN-07, NN-14, NN-15 as architectural law for all S.6D+ work.
