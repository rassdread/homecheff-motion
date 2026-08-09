# S.8E — Admin Navigation

**Date:** 2026-08-10

---

## Top chrome (`admin-layout-chrome.tsx`)

Added (discoverability):

- **Billing** → `/admin/billing` (`admin.nav.billing`)  
- **Studio finance** → `/admin/studio-finance` (`admin.nav.studioFinance`)  

Existing unchanged: Dashboard, Invites, Users, Render analytics, AI lab, Showcase.

---

## Billing Control Center sub-nav

Extended `AdminBillingShell` NAV with:

- Promo codes  
- Auto Top-Up  
- Generation jobs  
- Reconciliation  

Active tab matching supports nested paths.

---

## Constraints

- No new Admin application  
- No parallel nav IA  
- i18n keys added in `en.ts` + `nl.ts`  

---

## Status

**PASS**
