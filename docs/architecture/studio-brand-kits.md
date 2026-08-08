# Studio S.5 — Brand Kits

## Purpose

Reusable brand memory for creators and future HomeCheff businesses.

## Model

`StudioBrandKit`

- Owner + optional `projectId`
- `kitJson`: logo, colors, fonts, watermark, intro/outro asset ids, voice/music refs, website, social links, business info
- Favorite + archive status

## API

- `GET/POST /api/studio/library/brand-kits`

## Rules

- No secrets in `kitJson`
- Does not redesign Motion or billing
- Enterprise org brand kits: prepared via owner/project fields only — not implemented
- Marketplace branding: compatibility via reusable asset ids — no runtime Marketplace dependency
