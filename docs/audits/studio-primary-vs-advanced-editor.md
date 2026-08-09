# Primary Workspace vs Classic / Advanced Surfaces

**Do not delete Classic or Advanced capabilities without proven parity.**

## Surfaces compared

| Surface | URL | Role |
|---------|-----|------|
| **Primary (S.2)** | `/studio?storyboardId=` | Canonical adaptive workspace |
| **Classic** | `/studio/storyboards/[id]/classic` | Dense storyboard editor page |
| **Metadata edit** | `…/edit` | Title/description only |
| **Movie Builder** | `…/movie-builder` | Production stepper |
| **Production Center** | `…/production` | Production ops UI |
| **Advanced hub** | `/studio/advanced` → `/studio` | Dead redirect |
| **Advanced toggle** | `hc-studio-advanced-features` | Unlocks links & form modes |
| **Editor** | `/editor/start` | Separate product (fusion/canvas) — not same as Classic |

---

## Feature parity matrix

| Capability | Primary S.2 | Classic | Movie/Production | Notes |
|------------|-------------|---------|------------------|-------|
| Scene list / select | Yes | Yes | Via production | |
| Adaptive posture (desktop/tablet/mobile) | Yes | No | No | S.2 unique |
| Tool strip progressive disclosure | Yes | Partial/dense | Partial | |
| Generate scene image | Yes | Yes | Yes | Same APIs |
| Style / director profile controls | Panels | Prominent selects | Yes | Classic always visible |
| Link to Classic editor | When advanced on | Self | — | |
| Movie Builder entry | Advanced-gated | Often visible | Self | **Parity gap** if simple mode |
| Production Center entry | Advanced-gated | Often visible | Self | **Parity gap** |
| Motion import / handoff CTAs | Make-video flows | Explicit CTAs | Yes | |
| Consistency / improve jobs UI | Tools | Dedicated chrome | Steps | |
| Advanced identity styles on create | Via `?advanced=1` / toggle | N/A | N/A | Library forms |
| Form-first asset create | `?advanced=1` | — | — | Skips guided wizard |
| Deferred shell / preview mode | Yes | No | No | ADR-004 |
| Fusion / Character Studio | Separate routes | Separate | — | Not Classic-exclusive |

---

## What Advanced/Classic can do that default Primary may hide

1. Always-on entry to **Movie Builder** and **Production Center** (Primary: often behind advanced toggle).  
2. **Classic** dense single-page control surface (less progressive disclosure).  
3. **Advanced create** (`?advanced=1`) for characters/worlds/locations/props.  
4. Extra identity style enums when advanced/admin.  
5. Legacy “Advanced” nav item (now redirect — **dead**).

## What Primary has that Classic lacks

1. Adaptive workspace postures (S.2).  
2. Tool taxonomy / inspector layout.  
3. Canonical deep-link contract `/studio?storyboardId=`.  
4. Creative memory / S.5 hub adjacency from assets.

## Editor (Fusion) vs Studio Workspace

Editor Fusion is **not** a Classic storyboard editor. It is a **parallel image-compose product**. Character Studio hub bridges into Fusion. Parity matrix above does **not** imply Editor ⊂ Classic.

## Preservation rule

Until Primary exposes Movie Builder, Production Center, and advanced create without feature loss, treat Classic/Advanced paths as **LIVE product surface**, not disposable debt.
