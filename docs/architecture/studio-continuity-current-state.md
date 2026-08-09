# Studio Continuity — Current State (Evidence)

**Status:** Forensic reconstruction  
**Date:** 2026-08-09  
**Ratings:** STRONG | PARTIAL | WEAK | NONE — for **end-to-end visual/audio lock**, not form richness.

---

## Continuity graph (implemented)

```
User
 └─ StudioWorldProfile?  ←── worldProfileId ──┐
       │                                         │
       ├─ StudioCharacter ── StudioSceneCharacter ── StudioScene ── StudioStoryboard
       ├─ StudioLocation  ── locationId ─────────────┘              │
       └─ StudioProp      ── StudioSceneProp ────────┘              │
                                                                    │
                                                         StudioSceneImage
                                                         (prompt text + generationSettings.referenceAssets JSON)

NO FK: Storyboard → World
NO pixel refs into OpenAI scene T2I generate()
YES refs into Vision QA (up to 4 URLs)
```

---

## CHARACTER_CONTINUITY_CURRENT_STATE: **PARTIAL**

### Mechanisms that exist

1. **Persistent entity** — `StudioCharacter` with appearance/personality memory, continuity notes, visual keywords, identity/continuity strength, clothing/accessories, required `referenceImageUrl`.  
2. **Scene linking** — `StudioSceneCharacter` (manual attach; new scenes start empty).  
3. **Prompt injection** — `buildCharactersPrompt` + identity context + `buildCharacterMemoryPromptChunks` via `memoryBundle`.  
4. **Reference consistency text** — lines stating alignment with primary/supporting refs (`buildReferenceConsistencyLines`).  
5. **Drift lines** — if prior scene consistency/vision scores warn (`buildCharacterIdentityDriftLinesForStoryboard`).  
6. **Post-hoc QA** — consistency report (prompt-memory) + vision comparing generated still to ref URLs.  
7. **Cross-storyboard reuse** — same `characterId` linkable on any owned storyboard (manual).  
8. **Voice ownership** — character voice fields + lock + history; Motion handoff attaches voice plan (**not** used in still gen).

### Mechanisms that do **not** exist

- Reference **pixels** / image edit conditioning on scene `IMAGE_GENERATE` (provider `generate` is text-to-image unless transform `sourceImageUrl`).  
- Auto-attach character from scene N to scene N+1.  
- Seed reuse across scenes.  
- Embedding-based identity.  
- Automatic clothing lock from previous generated look (only memory fields + drift text).

### Cross-scene character journey

| Journey | Status | Mechanism |
|---------|--------|-----------|
| Same character across 5 scenes | **PARTIAL / MANUAL** | Re-link IDs; text memory; drift if scores bad |
| Same character across projects/storyboards | **SUPPORTED (manual)** | Owner library re-link |
| Same face pixels locked | **NOT SUPPORTED** at gen | Vision can detect drift after |

---

## LOCATION_CONTINUITY_CURRENT_STATE: **PARTIAL**

### Exists

- `StudioLocation` with refs, worldMemory, visualIdentity, environmentKeywords, continuityNotes/strength, world link.  
- Per-scene `locationId`.  
- Prompt + memory chunks + ref text + vision QA with location ref URL.  
- Cross-storyboard re-link.

### Missing

- Pixel conditioning at scene gen.  
- Auto-inherit location on new scene.  
- Storyboard-default location/world.

### Same kitchen / restaurant across scenes

**PARTIAL / MANUAL** — re-select same `locationId`; text/environment memory; no image lock.

---

## PROP continuity: **PARTIAL**

Junction `StudioSceneProp`; appearanceMemory + brandingRules; same text/ref/vision pattern as location. Branding helps **text** lock for logos/products, not pixel lock at T2I.

---

## WORLD continuity: **PARTIAL**

`StudioWorldProfile` is real. Continuity/style/tone/rules enter prompts when linked assets resolve a world (`memoryBundle.world`; multi-world → first). **No** storyboard/scene world FK. **No** world reference image field.

---

## Voice continuity: **PARTIAL**

| Dimension | Status |
|-----------|--------|
| Character owns voice fields | Yes |
| Same speaker across Motion scenes | **PARTIAL** — handoff attaches plan; depends on Motion consuming it |
| Storyboard-level TTS | Separate `StudioStoryboardVoice` path |
| Still image voice | N/A |

---

## Style continuity: **PARTIAL**

Storyboard `promptStyleProfile` + `directorProfile` apply across scenes. World `visualStyle` when resolved. No BrandKit consumption. Instant/Motion may use separate style chips.

---

## Brand continuity: **WEAK / STORAGE**

`StudioBrandKit` CRUD exists; **generation paths do not read `kitJson`**. Separate Editor client brand kit / fusion brand-protection rules are **not** the Prisma BrandKit.

---

## Cross-scene dimensions matrix

| Dimension | Automatic | Manual | Provider-dependent | Not implemented |
|-----------|-----------|--------|--------------------|-----------------|
| Character ID link | | ✓ | | |
| Location ID | | ✓ | | |
| Props | | ✓ | | |
| Clothing memory text | ✓ if fields set | edit fields | | pixel lock |
| Lighting | via location/world enums in prompt | set on entity | | global lighting director |
| Camera | per-scene shot fields | ✓ / auto planner | Motion interprets | |
| Voice | handoff | character fields | ElevenLabs | |
| Style profile | storyboard-level | ✓ | | |
| Aspect ratio | ✓ forced 9:16 handoff | | Motion Instant picker elsewhere | Studio picker |
| Previous frame as seed | | | | ✓ none for next scene T2I |
| Reference pixels at gen | | | Vision only | scene T2I |

---

## Image → Video continuity

Primary path: selected scene stills → AnimationImage URLs → Vidu start/end transitions.  
**Preserves:** source still content as I2V input frames.  
**Does not invent:** character library linkage inside Vidu beyond what’s baked into the still + motion prompts.  
Aspect often **9:16** from Studio handoff.

---

## Implication for future work

Continuity today is **library + text + QA**, not **pixel-locked generation**. Any Prompt Matrix must treat identity/continuity modules as **non-optional**. Closing the reference-conditioning gap is a **continuity foundation** concern, not a phrase-pack concern.
