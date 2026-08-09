# Studio Product Modes (S.6F)

**Status:** Implemented architecturally (`mode-policy.ts`)  
**UI:** Modes surface in Adaptive Workspace Creative Director panel — no shell redesign.

---

## Three modes

| Mode | Target | Intent |
|------|--------|--------|
| **QUICK** | Normal users | Upload → choose experience → simple questions → generate. No professional jargon. |
| **PROFESSIONAL** | Businesses | Brand, audience, platform, style, duration, quality, camera, voice, music — still simplified. |
| **DIRECTOR** | Professional creators | Full Studio: characters, locations, props, worlds, continuity, scene/shot planning, lighting, motion, fusion, Movie Builder, Production. No feature loss. |

---

## Policy gates

| Capability | Quick | Professional | Director |
|------------|-------|--------------|----------|
| Professional terminology | no | no | yes |
| Brand controls | no | yes | yes |
| Audience / platform | no | yes | yes |
| Camera / voice / music controls | no | yes | yes |
| Entity linking | no | yes | yes |
| Scene / shot planning | no | no | yes |
| Fusion / Motion / Movie / Production | no | no | yes |
| Provider strategy hints | no | no | yes |

Modes filter **recommended planners**. They do not delete Classic, Fusion, Movie Builder, or Production Center from the product.

---

## Default resolution

```
requested mode → else preferDirector → else preferProfessional → else QUICK
```

Matrix `detailLevel` mirrors the product mode (QUICK | PROFESSIONAL | DIRECTOR).
