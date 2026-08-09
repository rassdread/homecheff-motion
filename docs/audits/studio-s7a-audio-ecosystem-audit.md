# Studio S.7A — Audio Ecosystem Audit (Master)

**Date:** 2026-08-09  
**Mode:** READ-ONLY — ZERO implementation / ZERO commits / ZERO production changes  
**Repository:** `rassdread/homecheff-motion`  
**Branch:** `main`  
**HEAD:** `e9024814`

---

## Artifacts

| Doc |
|-----|
| `docs/architecture/studio-audio-product-truth.md` |
| `docs/architecture/studio-audio-ownership.md` |
| `docs/architecture/studio-audio-continuity.md` |
| `docs/architecture/studio-audio-non-negotiables.md` |
| `docs/audits/studio-audio-capability-inventory.md` |
| `docs/audits/studio-audio-generationjob-coverage.md` |
| `docs/audits/studio-audio-credit-paths.md` |
| `docs/audits/studio-audio-experience-readiness.md` |
| `docs/audits/studio-audio-render-integration.md` |
| `docs/audits/studio-audio-s8-billing-inputs.md` |
| This file |

---

## Executive verdict

Studio already has a **substantial live audio stack** (ElevenLabs TTS/STT/clone/music/SFX + FFmpeg mix + STT/subtitles + overlay translation). It is **not yet** a unified Audio Ecosystem under Continuity → Matrix → Director → Job law.

**Primary gaps before product claim:**

1. Dual voice SoT (Character vs Storyboard narrator)
2. Only VOICE_TTS on GenerationJob; other audio = bare billed routes
3. Matrix audio = PARTIAL / LEGACY_UNMIGRATED; routes bypass assemble chain
4. Directors plan; generation is orthogonal (and UX strings sometimes stale)
5. Mix = voice + ≤1 music bed + ≤1 SFX bed — not per-scene timed design
6. No true dubbing; no AI lip-sync
7. No S.6G Experience Packs for audio (ENGINE_ONLY)

---

## Definition of Done checklist

| Item | Status |
|------|--------|
| Capabilities inventoried | ✓ |
| Routes/surfaces inventoried | ✓ |
| DB models mapped | ✓ |
| Character voice deep audit | ✓ |
| Storyboard voice deep audit | ✓ |
| TTS / Clone / Music / SFX mapped | ✓ |
| Mix mapped | ✓ |
| STT / subtitles / translation mapped | ✓ |
| Dubbing truth | ✓ ABSENT / PARTIAL pieces |
| Lip-sync truth | ✓ ABSENT (amplitude only) |
| Motion/render path | ✓ |
| Directors mapped | ✓ |
| Matrix coverage | ✓ |
| GenerationJob coverage | ✓ |
| Providers mapped | ✓ |
| Credit paths + bypass + duplicate risks | ✓ |
| Asset Library / reuse / Brand | ✓ |
| Continuity matrix | ✓ |
| Mobile/desktop UX | ✓ |
| Privacy/security notes | ✓ |
| Product Truth + Non-Negotiables | ✓ |
| S.8 billable input list | ✓ |
| ZERO implementation / commits | ✓ |

---

## Final decision

### GO FOR STUDIO S.7B — AUDIO FOUNDATION

**Why GO (not NO-GO):** Enough live capability exists to unify; no show-stopper security/billing vacuum found that blocks foundation work.  
**Why Foundation first (not jump to Voice Studio UI):** Ownership dualism + Job/Matrix gaps + mix honesty must be fixed before Experience Packs.

**Do not start S.7B automatically** — wait for explicit product request.

### Recommended S.7 order (evidence-based)

| Phase | Focus |
|-------|--------|
| **S.7B Audio Foundation** | Ownership model, Continuity voice rules, Job coverage for clone/music/SFX/STT, Matrix wrap honesty, mix contract |
| **S.7C Voice** | Character↔narrator unification, TTS params fidelity, clone UX polish |
| **S.7D Music / SFX** | Director→generate wiring, bed vs scene-hit honesty, library UX |
| **S.7E Subtitles / Translation** | Style/export, subtitle translate, STT Publish parity |
| **S.7F Dubbing / Lip-sync** | Only if product commits — currently ABSENT |
| **S.7G Mix / Render** | Per-scene hits, ducking, language-export audio remux |
| **S.7H Consumer Experience Packs** | Voice / Music / Captions packs on real engines |
| **S.7I Certification** | Preview + production smoke |

---

## Blocking issues for claiming “Audio Ecosystem COMPLETE”

1. Character vs Storyboard voice dual SoT  
2. GenerationJob incomplete for paid audio  
3. Matrix bypass on live audio routes  
4. False expectations (scene SFX, dubbing, lip-sync, BrandKit auto-audio)

## Non-blocking risks

- Stale i18n (“music ships”) vs live APIs  
- Clone/music double-click without job idempotency  
- `STUDIO_PLACEHOLDER_TOOL_IDS` stale vs live panels  
- June 2026 foundation docs outdated on STT/music/SFX  

## Production / code / billing / commits

| | |
|--|--|
| Production changes | **NONE** |
| Code changes | **NONE** |
| Prompt changes | **NONE** |
| Billing changes | **NONE** |
| Commit / push / PR | **NONE** (unless explicitly requested) |
