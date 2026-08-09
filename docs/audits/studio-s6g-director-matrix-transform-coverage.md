# S.6G — Creative Director · Prompt Matrix · Provider Transform Coverage

---

## Creative Director coverage

| Surface | Orchestrated? | Notes |
|---------|---------------|-------|
| Workspace panel `creativeDirector` | YES | Thin UI; modes + experience + coach |
| Unit tests | YES | |
| Instant Premium | NO | Bypass |
| Fusion / Character Studio | NO | Bypass |
| Motion Hub presets | NO | Bypass (Matrix `MOTION_PRESET` when Instant path uses Matrix) |
| `/studio/start` intents | NO | Bypass |
| Maak `/create` | NO | Route fan-out only |
| Assistant | NO | Parallel recommendation router |
| SEO pages | NO | Marketing CTAs |

**Director coverage score: 1.5 / 5** (architecture 5/5 · production entry 1/5)

Director remains orchestration only — correct. S.6G implementation must *connect* doors, not expand Director ownership.

---

## Prompt Matrix coverage

| Pack status | Matrix coverage |
|-------------|-----------------|
| LIVE with dedicated engine | Strong |
| LIVE/PARTIAL shared engine | Medium |
| MISSING | None (`LEGACY_UNMAPPED`) |
| ENGINE_ONLY domains | Matrix exists without pack |

**Matrix pack coverage score: 3.0 / 5**

Prompt Matrix authority: unchanged. See `docs/audits/studio-s6g-prompt-coverage-audit.md`.

---

## Provider Transform coverage

S.6E transforms (OpenAI, Fusion, Vidu, ElevenLabs wrappers) remain last mile.

| Generation class | Transform readiness |
|------------------|---------------------|
| Scene still / Fusion still | WRAPPED / used |
| Instant / Motion Vidu | WRAPPED when Matrix path |
| Voice / Music / SFX | PARTIAL |
| Publish / Translate / Subtitles | LEGACY_UNMIGRATED |
| MISSING packs | N/A |

**Provider Transform coverage score: 3.0 / 5**

S.6G must not rewrite transforms — only ensure packs hand off via Matrix → Transform → GenerationJob.

---

## Dual door systems (must stay aligned)

1. Product: `resolveCreativeExperience` / `entryFans` / `DOOR_ALIASES`
2. Matrix: `resolveCanonicalExperienceId`

Known risk: mascot LIVE product → `CHARACTER_FUSION`, but Matrix door may under-map some mascot strings (prior S.6F audit). Fix during wiring — do not invent a second engine.

---

## Target chain for every Experience Pack (implementation)

```
Entry door
  → resolveCreativeExperience
  → orchestrateCreativeDirector
  → ContinuityBundle (required)
  → assembleCreativeSpecification
  → Provider Transform
  → GenerationJob
```

No bypass for new consumer pack work.
