# Internal Linking Audit

**Date:** June 2026

---

## Navigation graph (primary)

```
Homepage (/)
├── Studio (/studio)
├── Editor (/editor)
├── Motion (/animate/instant)
├── Projects (/projects) — auth-aware
├── Library (/library) — auth-aware
├── Pricing (/pricing)
└── Help (/help)
```

**Global nav:** `app-shell-primary-nav.tsx` + `homecheff-primary-nav-config` expose suite links on all authenticated sessions. Mobile nav adds `/help` and `/account/billing`.

**Homepage orbit:** `universe-public-landing` resolves planet hrefs to Editor, Studio, Motion, Publish.

---

## Link health by surface

### Homepage → product hubs

| Target | Mechanism | Status |
|--------|-----------|--------|
| Studio | Orbit planets + production line | ✅ |
| Motion | Orbit planets | ✅ |
| Editor | Orbit planets | ✅ |
| Pricing | Conversion surfaces | ✅ |
| Help | Mobile nav + conversion footer | ✅ |
| Projects | Recent projects section (auth) | ✅ |
| Library | Recent assets section (auth) | ✅ |

### Studio → other surfaces

| Target | Mechanism | Status |
|--------|-----------|--------|
| Motion handoff | Studio workflow CTAs | ✅ |
| Editor assets | Asset wizards | ✅ |
| Pricing | Conversion surfaces | ✅ |
| Help | Footer / assistant | ⚠️ Add explicit help link in studio intro |

### Motion → other surfaces

| Target | Status |
|--------|--------|
| Studio storyboard import | ✅ |
| Pricing (credits) | ✅ |
| Help (`how-motion-pricing-works`) | ✅ via help center |

### Pricing → other surfaces

| Target | Status |
|--------|--------|
| Signup | ✅ |
| Account billing (auth) | ✅ |
| Help articles | ⚠️ Add inline links to credit FAQ articles |

### Help center

| Pattern | Status |
|---------|--------|
| Home → all articles | ✅ |
| Home → product hubs | ✅ **Added** (`PRODUCT_HUB_LINKS`) |
| Article → help home | ✅ |
| Article → related (same category) | ✅ **Added** |
| Article → pricing catalog | ✅ (billing articles) |
| Conversion footer → signup/pricing | ✅ |

### Account / billing (noindex)

| Target | Status |
|--------|--------|
| `/pricing` | ✅ |
| `/mijn-verbruik` | ✅ |
| Help billing articles | ⚠️ Add links from billing dashboard |

---

## Orphan / weak pages

| Page | Issue | Recommendation |
|------|-------|----------------|
| `/signup` | Not in main nav (intentional) | Linked from pricing, conversion surfaces ✅ |
| `/library` | Weak from homepage for guests | Help article + nav when suite enabled ✅ |
| `/animate` (non-instant) | Redirect | Canonical on `/animate/instant` ✅ |

---

## Cross-linking rules (going forward)

1. Every new help article links to **one product page** + **one pricing/help sibling**  
2. Pricing FAQ answers link to **matching help slug**  
3. Studio/Motion empty states link to **getting started** help article  
4. Footer component should include: Pricing, Help, Signup (verify on marketing pages)

---

## Anchor text guidance

- Prefer descriptive anchors: "image-to-video in Motion" not "click here"  
- Use brand where appropriate: "HomeCheff Studio storyboards"  
- Avoid duplicate exact-match anchors to the same URL on one page

---

## Improvements shipped this sprint

- Help home **product hub chips** → Studio, Motion, Editor, Pricing, Library, Projects  
- Help articles **related articles** block (same category)  
- Help metadata cross-links search engines to product intents via descriptions
