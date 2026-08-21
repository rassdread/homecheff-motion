# PROVIDER-VISUAL-CERT.md

## Status

**PROVIDER_VISUAL_CERTIFICATION = WORKING** (routing + real outputs executed after P0 fix)

Not full product cert by itself.

## P0 found and fixed

Multi-reference OpenAI edits used repeated `image` form parts → HTTP 400 `duplicate_parameter`.

Fix (`0512021d`): use `image[]` for BASE + refs when additional images present.

## Probes executed (budgeted)

| Probe | Route intent | Calls | Result | Human visual |
|-------|--------------|------:|--------|--------------|
| Identity BASE edit (plate) | BASE_IMAGE_EDIT | 1 | OK output | N/A (color plate) |
| Outfit D (person+outfit gens) | MULTI_REF via image[] | 1 edit (+gens) | OK | PASS — same face/hair; red blazer transferred |
| Location E | MULTI_REF | 1 | OK | PASS — same person/white tee; red-carpet venue |
| Product/logo | MULTI_REF | 1 | OK | PASS — bottle recognizable; HC mark clear on label |
| Fixture gens | T2I | 5 | OK | Inputs for above |

Evidence: `docs/audits/full-studio-cert/provider-visual/`

## Not closed here

- Masked clothing path (`MASKED_MULTI_REFERENCE_EDIT`) — mask unavailable → explicit Fusion fallback (traced)
- Pixel logo post-composite path — not exercised in Fusion brand-lock pipeline this run
- Vidu motion
- Full Rode loper / 8-scene Pixar UI flows
