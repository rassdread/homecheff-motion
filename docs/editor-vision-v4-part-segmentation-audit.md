# Part Segmentation Audit (Editor Vision V4)

## Current SAM2 Integration

| Capability | Status | Notes |
|------------|--------|-------|
| Click point guidance | **Supported** | Positive/negative points via `buildSam2RemotePoints()` |
| Bounding box guidance | **Supported** | `targetBounds` passed to SAM2 remote |
| Object hint | **Supported** | `objectHint` string for disambiguation |
| Multi-point refinement | **Supported** | Add/remove points before accept |
| Multi-mask per request | **Not wired** | API accepts single mask response |
| Text/prompt segmentation | **Not available** | No SAM2 text prompt in current contract |
| Automatic part decomposition | **Not available** | Requires multiple click sessions per part |

## Part Support Assessment

| Part | Current | Required Additions | Expected Quality |
|------|---------|-------------------|------------------|
| Face | Click + hint inside head bbox | Part hierarchy seed + second-click mode | High with SAM2 mask |
| Hair | Heuristic bbox only | Click on hair region + SAM2 | Medium–high |
| Torso | Heuristic bbox | Click + SAM2 or parent-relative bounds | Medium |
| Arms (L/R) | Heuristic `arms` layer | Split L/R bounds + click SAM2 | Medium |
| Hands (L/R) | Heuristic `hands` layer | Click SAM2 per hand | Medium–high |
| Legs | Heuristic bbox | Click SAM2 | Medium |
| Clothing | Vision label + bbox | Mask from accessory layer or SAM2 | Medium |
| Accessories (tie, hat) | Vision + ONNX hybrid | SAM2 click on accessory | High |
| Logos | Vision + hybrid detection | SAM2 + logo control transforms | High |
| Props / Globe | Vision + hybrid | SAM2 click with object hint | High |

## Recommendations

1. **V4 approach**: Seed part tree from vision taxonomy (`BOUNDS_BY_TYPE`) immediately; upgrade parts to real masks via SAM2 click in part-selection mode.
2. **Multi-mask**: Future SAM2 endpoint should return ranked masks; not required for V4 foundation.
3. **Quality**: Part-level SAM2 with `targetBounds` constrained to parent part bbox yields professional contours for arms, tie, globe, logo.

## Conclusion

Current SAM2 integration **can support** part segmentation via guided clicks per part. V4 adds hierarchical selection and part model so users click the character first, then refine a specific part — preventing accidental micro-selection.
