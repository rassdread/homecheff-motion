# S.6G — Question Flow Audit

Compares registry `quickQuestions` + mode policy vs what consumer UIs actually ask.

---

## Summary

| Band | Finding |
|------|---------|
| Registry questions | Declared for all 51 packs in `product-experience-registry.ts` |
| Director planner answers | Consumed when `orchestrateCreativeDirector({ answers })` is called |
| Consumer Quick UI | **Not wired** — Instant / Maak / Fusion use their own controls |
| Professional questions | Brand / audience / platform declared for business packs; Studio video intents collect partial briefs |
| Director Mode | Full entity + scene tools exist; not gated as “pack questions” |

**Verdict:** Question *architecture* exists. Question *product flows* are incomplete outside the Creative Director workspace panel.

---

## Exemplar flows

### LinkedIn Studio (PARTIAL)

| Registry questions | Panel / Director | Instant / Fusion UI today |
|--------------------|------------------|---------------------------|
| business_style, background, smile, attire | Supported via `answers` | Instant `clean_business` style / Fusion person_background — **not** the four Quick questions |

### Restaurant Studio (LIVE)

| Registry questions | Director | Production UI |
|--------------------|----------|---------------|
| logo, brand_colors, audience, platform, commercial_tone | YES when orchestrated | `/studio/start?intent=restaurant_promo` brief — **not** Director answers |

### Dating Studio (MISSING)

| Registry questions | Engine | UI |
|--------------------|--------|-----|
| vibe, outdoor_indoor, smile | `unimplemented_pack` | No dedicated flow; coach labels only |

### Wedding Studio (PARTIAL)

| Registry questions | Engine path |
|--------------------|-------------|
| moment, mood, music | Motion preset `wedding_entrance` / `VIDEO_INTENT` — preset UI ≠ registry questions |

### HomeCheff Studio (LIVE)

| Registry questions | Instant |
|--------------------|---------|
| dish, appetite, platform | Instant style `food_promo` + chips — partial overlap |

---

## Mode policy vs questions

| Mode | Expected question style | Actual |
|------|-------------------------|--------|
| QUICK | Simple, non-jargon | Registry ready; consumer surfaces use Instant chips/presets instead |
| PROFESSIONAL | Brand / audience / platform / quality | Video intents + Fusion branding; not unified |
| DIRECTOR | Full Studio controls | Available in workspace — not pack-scoped questionnaires |

---

## Gaps to close in implementation (not audit)

1. Map Instant style / chip / preset selection → Director `answers` for the owning pack.
2. Surface registry `quickQuestions` as the Quick Mode questionnaire (thin UI in existing panels — no shell redesign).
3. Hide or disable packs with `status: MISSING` in choosers until implemented.
4. Keep Coach suggestions optional after questions — never auto-apply.
