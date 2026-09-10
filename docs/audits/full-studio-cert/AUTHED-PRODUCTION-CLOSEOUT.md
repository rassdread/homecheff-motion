# Authenticated Production Closeout — Summary

**Slice:** `FULL_STUDIO_CERT_AUTHED_PRODUCTION_CLOSEOUT`  
**Date:** 2026-08-22  
**Production:** https://studio.homecheff.eu  
**Profile:** `.px4a7-prod-profile` (authenticated; HC SUPERADMIN seller)  
**Instant mode:** `test`  
**Studio account:** `free`, 0 credits, not `admin` on Studio user record  

## Preflight

See `AUTHED-PREFLIGHT.json`. Auth OK: `/projects`, `/api/studio/projects`, `/api/me/studio-account` → 200.

## Production release

- S2H library smoke: **Mijn projecten** present  
- S2F Finish: **Afronden** loads on existing storyboard (`cmswdyqdo0001lc049saxzy14`)  
- S2 stack + `0512021d` image[] fix deployed (prior slice)  
- `GET /api/instant-premium/mode` → `{ "mode": "test" }`

## Blocker discovered this slice

**Production credit gate** returns `403` / `free_account_provider_action` for all paid provider actions (motion_render, openai_scene_image) on the cert account despite HC SUPERADMIN and `INSTANT_PREMIUM_MODE=test`. Studio `user.role` is not `admin`; wallet balance 0.

Evidence: `AUTHED-CLOSEOUT-LIVE.json` → `scenarioA.creditGate: true`.

## Scenarios

| ID | Result |
|----|--------|
| A Rode loper + Vidu | **BLOCKED** (credit gate before Vidu) |
| C Pixar stress | **NOT_RUN** (provider credit gate; storyboard API validation) |
| G HomeCheff E2E | **WORKING** (px4a5 flows A–D PASS today; GAP2 flow C PASS) |
| D Audio export | **NOT_RUN** |
| E iPhone | **NOT_RUN** (no device) |
| S2G Finish | **WORKING** (Finish hub on existing project) |
| S2H Projects | **WORKING** |
| Quick Video | **WORKING** (regression smoke) |

## Verdict

**`STUDIO_FULL_PRODUCT_CERTIFICATION_BLOCKED`**
