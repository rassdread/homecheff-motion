# Ecosystem IP-based default language

**Flag:** `HOMECHEFF_ECOSYSTEM_IP_DEFAULT_LANGUAGE_COMPLETE`  
**Date:** 2026-08-30

## Rule (identical across Marketplace / Growth / Studio)

| Country | Default UI language |
|---------|---------------------|
| NL, BE, SR | `nl` |
| All other / unknown | `en` |

## Priority

1. Explicit preference (`hc_locale_pref=1` + switcher / localStorage)
2. Account `preferredLanguage` (Marketplace; N/A on Growth/Studio shell until synced)
3. Existing `hc_locale` / `homecheff-language` cookie
4. IP country (`x-vercel-ip-country` / `cf-ipcountry`) — country code only
5. `en`

## Shared cookie

- Name: `hc_locale` (+ `hc_locale_pref`, legacy `homecheff-language`)
- Production domain: `.homecheff.eu` (SameSite=Lax, Secure)
- Does **not** touch auth/session cookies

## Parity modules

| App | Module |
|-----|--------|
| Marketplace | `lib/ecosystem-locale.ts` |
| Growth | `lib/i18n/ecosystem-locale.ts` |
| Studio | `src/lib/ecosystem-locale.ts` |
