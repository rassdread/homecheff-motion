# HomeCheff Adaptive Workspace System

**Status:** CANONICAL (ecosystem)  
**ADR:** `docs/architecture/adr/ADR-006-homecheff-adaptive-workspace-system.md`  
**Applies to:** HomeCheff · Growth · Studio  

---

## Shared philosophy

HomeCheff, Growth, and Studio are the three principal product experiences. They share one Adaptive Workspace philosophy. They do **not** need identical visuals.

### Principles

1. Adaptive use of available screen space  
2. Clear left / center / right workspace ownership  
3. Rails collapse intelligently  
4. Creative or primary workspace takes priority  
5. Mobile becomes a single primary workspace  
6. Landscape uses horizontal space efficiently  
7. Contextual controls appear on demand  
8. Consistent navigation behavior across products  
9. No desktop layout squeezed into mobile  

### Postures (space-first)

| Posture | Typical width | Behavior |
|---------|---------------|----------|
| **FULL** | ≥ 1440px | Left + center + right; unconstrained width for productivity apps |
| **COMPACT** | 1024–1439px | Rails available; may collapse; center flexes |
| **FOCUSED** | 768–1023px | Single primary surface; rails as overlays/drawers |
| **MOBILE** | < 768px | Single workspace; on-demand panels |

Orientation (portrait / landscape) still gates chrome that wastes height or width (especially Studio robot + tool rails).

### Product identity

| Product | Personality |
|---------|-------------|
| HomeCheff | Place / commerce / atmosphere |
| Growth | Data / campaigns / optimization |
| Studio | Professional creative · canvas-first · cinematic · tool-oriented |

Studio must feel part of the ecosystem while remaining unmistakably Studio — not Marketplace, CRM, or generic admin.
