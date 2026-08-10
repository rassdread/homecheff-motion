# SP.1 — HomeCheff Ecosystem Audit

**Date:** 2026-08-10 · **Read-only**

---

## Model (truth)

Studio ships as a **Next.js monolith suite** (Editor · Studio · Motion · Publish · Library) under HomeCheff branding — not a live federated multi-app SSO mesh with Growth.

| Concern | Finding |
|---------|---------|
| Shared authentication | Studio-local session cookie `studio_session` |
| Google login | **Absent** — email/password (`auth-form.tsx`) |
| Email login | Present |
| Session sharing | Within this app only |
| Brand consistency | HomeCheff / Universe branding present; terminology drift (“Motion Studio”) |
| Navigation consistency | Suite nav shared across products |
| Identity consistency | One user model inside app |
| Shared users / permissions | App-local roles (`requireActiveUser`, admin) |
| Shared profiles | Account surfaces in-app |
| Shared subscriptions / billing | Studio billing (S.8) — not proven as Growth cross-app wallet SSO |
| Shared credits | Studio wallet / credits in this app |
| Shared account settings | `/account/*` login-gated |
| Cross-navigation | Suite deep links OK |
| Studio ↔ HomeCheff entry | Brand/nav; no external Growth deep-link SSO proven |
| Duplicated identities | No parallel user stores found in-app; ecosystem SSO incomplete vs product promise |

---

## Ecosystem story vs visitor expectation

| Expectation | Reality |
|-------------|---------|
| “One HomeCheff account everywhere” | True **inside Studio suite**; not verified vs separate Growth webapps |
| Google one-tap | Missing — friction for public product |
| Credits follow you | Studio-local credits/billing complete (S.8); cross-product not SP.1-proven |
| Navigate Create → Animate → Publish | Strong within monolith |

---

## Score

**HomeCheff ecosystem: 2.5 / 5**

Suite cohesion is good. Public ecosystem promise (Google + seamless HomeCheff identity) is incomplete.
