# Studio Product Truth Audit — Final

**Date:** 2026-08-09  
**HEAD at audit:** `f82d8322` (docs/studio-s6a branch) / product evidence also from `a0e28e1c` mainline code  
**Mode:** READ-ONLY forensic  
**Code/DB/prompt/production changes:** **ZERO**  
**Git commit/push/PR for this audit:** **NONE** (per absolute rules)

## Companion artifacts

| Doc | Path |
|-----|------|
| Canonical product truth | `docs/architecture/studio-product-truth.md` |
| Non-negotiables | `docs/architecture/studio-non-negotiables.md` |
| Continuity current state | `docs/architecture/studio-continuity-current-state.md` |
| Feature inventory | `docs/audits/studio-complete-feature-inventory.md` |
| Option traceability | `docs/audits/studio-option-prompt-traceability.md` |
| Primary vs Classic/Advanced | `docs/audits/studio-primary-vs-advanced-editor.md` |
| Prior S.6A prompt audit | `docs/audits/studio-s6a-prompt-matrix-audit.md` |

---

## Executive verdict

Studio **already is** a multi-scene identity-aware production system. Continuity is **real product DNA** implemented primarily as **library entities + text prompt injection + post-hoc vision/consistency**, not as pixel-conditioned generation.  

S.1–S.5 mostly **layered** shell/jobs/library without erasing DNA.  

**S.6B Prompt Matrix as previously framed is premature** until continuity contracts (especially identity modules + reference handling + scene-link inheritance expectations) are explicitly protected and gaps understood. Jumping to Matrix phrase packs risks treating PARTIAL text continuity as “solved” or accidentally bypassing it.

---

## Part summaries (DoD checklist)

| Area | Result |
|------|--------|
| Product reconstructed | Yes — see product-truth.md |
| Capabilities / hidden / routes | Yes — feature inventory + route tables |
| DB / projects / storyboard/scene | Yes |
| Character + continuity | PARTIAL — deep audit done |
| Location + continuity | PARTIAL |
| Props / World | PARTIAL |
| Cross-scene / cross-project | Manual link + text; library reuse |
| I2V / T2I / T2V / I2I | Mapped; pure T2V not found |
| Fusion | ADVANCED/CORE intelligence — audited |
| Directors | Multiple rule-based stacks |
| Camera/lighting/style/motion/duration/aspect | Traced; duration/aspect drift noted |
| Audio/voice/music/sfx/subs/translate | Mapped |
| BrandKit / PromptPreset | Storage-only |
| Options ~250+ | Classified by family in traceability doc |
| Runtime vs planning providers | Documented |
| Parallel stacks | StudioJob / Instant / Editor / Classic |
| Journeys / differentiators / risks | Below |
| Roadmap conflicts | Below |
| Zero code/DB/prompt/prod changes | Confirmed for this audit deliverable |

---

## Generation path truth (actual)

### Text → Image (scene)
User scene + linked entities → Directors/style → `studio-prompt-builder` sections (identity/continuity/…) → image wrapper → OpenAI T2I → GenerationJob → SceneImage → optional S.5 index.  
**Refs:** text + settings JSON; **not** provider image conditioning.

### Image → Video
Stills → Instant Premium AnimationImages → Vidu segments → `/videos`. Aspect often forced 9:16 from Studio handoff.

### Text → Video
**Composed only** (stills then I2V). No image-less Studio T2V API found.

### Image → Image / Fusion
Editor/Character Studio: multi-ref compose with preserve rules; `FUSION_RENDER` GenerationJob; OpenAI.

---

## Provider reality vs planning

| Capability | Runtime (typical) | Planning registry may say |
|------------|-------------------|---------------------------|
| Scene image | OpenAI images | openai_images |
| Video | Vidu | vidu; premium plan→runway |
| Voice | ElevenLabs | elevenlabs (+ openai/azure fallbacks) |
| Music | ElevenLabs | **suno** (plan) |
| Sound | ElevenLabs SFX / freesound plan | freesound economy |
| Fusion | OpenAI | openai_image |

---

## Continuity journeys

| Journey | Status |
|---------|--------|
| Same Character × 5 scenes | PARTIAL / MANUAL |
| Same Character × projects | SUPPORTED (manual re-link) |
| Same Location × 5 scenes | PARTIAL / MANUAL |
| Same Props × scenes | PARTIAL / MANUAL |
| Same voice × scenes | PARTIAL (handoff) |
| Same style × project | PARTIAL (storyboard profiles) |
| Same brand × outputs | NOT SUPPORTED via StudioBrandKit gen |
| Same world × projects | PARTIAL (via asset world links) |

---

## Roadmap conflict check

| Phase | Conflict with DNA? |
|-------|---------------------|
| S.1–S.3 | Low — shell/workflow; Classic still reachable |
| S.4 | Low — jobs wrap paths; orphans remain |
| S.5 | Low — index/storage; BrandKit/Presets unwired (honest) |
| S.6A | None — discovery |
| **Planned S.6B Prompt Matrix** | **RISK** if Matrix becomes generic modules that omit/bypass identity/continuity/memoryBundle/sourceEntities; or if “improve prompts” rewrites continuity locks |
| Planned Creative Director | **RISK** if it replaces existing directors instead of orchestrating them; modes OK if policy-layer |
| Continuity Engine (future) | Aligns with DNA — but must start from **current PARTIAL** truth, not assume STRONG |

### S.1–S.6 discoverability risk (evidence-based, not assumed regression)

- Advanced Movie Builder / Production links may be **less visible** under simple S.2 mode (toggle).  
- Classic still exists — not deleted.  
- Dual job systems increase cognitive load — duplication, not proven breakage.

---

## Risk of losing product DNA

| Risk | Severity |
|------|----------|
| Prompt Matrix without mandatory identity/continuity modules | **HIGH** |
| Treating reference images as optional “nice metadata” | **HIGH** |
| Collapsing entities into anonymous prompts | **CRITICAL** |
| Deleting Classic/Fusion before parity | **HIGH** |
| Assuming BrandKit already brands generations | **MEDIUM** (docs lie risk) |

---

## Recommended architectural order (evidence-based)

1. **Freeze non-negotiables** (this audit) into all future agent rules.  
2. **Continuity foundation (read+contract first):**  
   - Document & test-lock: memoryBundle → prompt sections must remain.  
   - Explicit product decision on reference-pixel conditioning gap (do not silently ignore).  
   - Clarify scene-link inheritance expectations (manual today).  
3. **Then Prompt Matrix architecture** that **composes over** existing section builder with identity/continuity as **required modules**, preset binding, provider transforms.  
4. **Then Creative Director modes** as policies over existing planners — not a rewrite.  
5. Parallel: Primary↔Classic parity for Movie Builder/Production visibility.

---

## Final recommendation

# CONTINUITY FOUNDATION REQUIRED BEFORE S.6B

**Not** “GO FOR S.6B” solely because S.6A ended that way.  
**Not** “implement Continuity Engine” in this audit — only sequence change.

S.6B may proceed **after** continuity contracts are written/tests locked and Matrix design explicitly preserves NN-02…NN-06.

---

## Audit DoD

All checklist items in the user brief are addressed in this document set.  
**Zero** implementation performed.
