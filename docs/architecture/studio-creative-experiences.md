# Studio Creative Experiences (S.6D)

**Status:** Architecture overview — read-only discovery  
**Date:** 2026-08-09  
**Depends on:** S.6B Product Truth, S.6C Continuity Foundation  
**Nature:** Documents what exists. No Prompt Matrix implementation.

---

## 1. What is a “Creative Experience”?

A user-reachable path that produces or transforms creative media (image, video, audio, identity asset, export), including wizards, tools, intents, presets, and hub cards — whether LIVE, PARTIAL, ADVANCED, LEGACY, or EXPERIMENTAL.

Experiences are **not** the same as Continuity entities. Continuity (Character/Location/Prop/World) **feeds** experiences.

---

## 2. Execution chain (canonical audit template)

For every experience, the forensic chain is:

```
UI / Route
  → Wizard / Tool / Intent
  → User selections
  → Domain builder / planner
  → ContinuityBundle (or absence)
  → Prompt builder / sections
  → Prompt Matrix inputs (today: N/A — interim assembler)
  → Provider Transform (if any)
  → Runtime provider
  → GenerationJob / billed route / legacy job
  → Storage (Prisma / Blob / library)
  → Result surface
```

### Reality vs S.6C contract

| Stage | Today |
|-------|--------|
| ContinuityBundle | **Conceptual** — resolved ad hoc via memory/identity builders when scene-linked; **not** a typed bundle on all paths |
| Prompt Matrix | **Not implemented** — `studio-prompt-builder` / fusion / instant / asset prompts are interim |
| Provider Transform | **Partial** — Vidu budget; OpenAI pass-through; Fusion archetypes |
| GenerationJob | **Only** IMAGE_GENERATE, VOICE_TTS, VIDEO_GENERATE, FUSION_RENDER wired |

**S.6D finding:** Many experiences **bypass** a formal ContinuityBundle. Scene stills and identity-linked paths are closest to compliant. Instant/Motion presets and many Fusion paths use **local** continuity (refs/preserve rules), not full Studio ContinuityBundle.

---

## 3. Experience volume (discovered)

| Family | Distinct units (approx) |
|--------|-------------------------|
| Fusion intents | 27 |
| Studio video intents | 15 |
| Motion action presets | 65 (+ photo intents) |
| Character Studio hub flows | 11 |
| Studio workspace tools | 25 |
| Instant styles/chips/animation styles | 3 + 9 + 6 |
| Publish entry modes | 8 |
| Asset wizard kinds | 4 |
| Assistant actions / tools / morphs | 19 + 45 + 19 |
| Movie Builder / Production | ADVANCED surfaces |
| SEO use-cases / workflows | Marketing → Studio CTAs (not separate engines) |

**Primary DNA experiences (end-to-end LIVE):** Storyboard + identity libraries + scene stills + Instant I2V + Fusion intelligence (Character Studio) + credits.

---

## 4. Mode placement (document only — no UI)

| Mode | Experiences that fit |
|------|----------------------|
| **Quick** | Video intents → auto director; Instant photo→video; Motion presets; assistant quick starts |
| **Professional** | Full workspace tools; entity attach; camera/style; audio directors; Fusion intelligence |
| **Director** | Director preferences; Movie Builder; Production Center; auto shot / proposals; creative review |

All modes **must** use the same Continuity Foundation when entities are linked (S.6C). Today Quick Instant paths often **omit** full Character library ContinuityBundle.

---

## 5. Prompt Matrix readiness (summary)

| Band | Meaning | Share |
|------|---------|-------|
| **Ready** | Clear Continuity + assembler path; Matrix can wrap | Scene stills, character/location/prop gen (partial) |
| **Needs Mapping** | Works but parallel builder | Instant styles, Motion presets, Fusion intents |
| **Needs Continuity** | Weak ContinuityBundle | Many Instant/Motion/Publish paths |
| **Needs Provider Transform** | Provider-specific today | Vidu, Fusion archetypes |
| **Needs Prompt Improvement** | Generic / ignores selections | Some tools/placeholders |
| **Needs Product Decision** | Simulation / legacy / dead routes | Fusion sims, `/studio/voice` missing page |

Full registry: `docs/audits/studio-creative-experience-registry.md`.
