# Instant Premium i18n QA

## Manual checks

- Start in `NL`, open `/animate/instant`, confirm all wizard copy is Dutch.
- Fill wizard state to step 4, switch header language `NL | EN`, confirm current step and form state are preserved.
- Continue to step 7 in `EN`, confirm all copy/chips/helper text are English.
- Switch back to `NL`, confirm same state is preserved and text switches back.
- Logged-out view: header language switch is visible and functional.
- Logged-in view: header language switch is visible and functional.
- Classic flow (`/animate`) still loads and existing behavior remains intact.
- Skip-payment mode and Stripe mode still function with localized wizard UI.

## Prompt language note

- Instant checkout now sends `uiLanguage` (`nl` or `en`).
- Server stores a language preference hint in instant user intent to keep generated on-screen text direction aligned with selected language.
