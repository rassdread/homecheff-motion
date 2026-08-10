# SP.2A — Product Experience Audit (Identity)

**Date:** 2026-08-10 · **Read-only**

---

## Questions

| Question | Answer |
|----------|--------|
| Feel like one HomeCheff ecosystem? | **No** — branding yes; login no |
| Does Studio feel independent? | **Yes** — separate signup/login/session |
| Does Growth feel independent? | **Yes** locally; SSO path exists but gated |
| Can user understand ONE account? | **No** — three possible accounts |
| How many logins? | Up to **3** (HC + Growth + Studio) without SSO |
| Simplify without architecture change? | **Limited** — can clarify copy (“Studio account”) but cannot deliver one-login without SSO client |
| Can Google be primary sign-in without changing architecture? | **No in Studio** — requires HC SSO client; Google already primary-capable on HC |

---

## Studio login UX (current)

- `/login` / `/signup` email + password  
- Optional invite token on signup  
- No Google button  
- No “Continue with HomeCheff”  
- No forgot-password  
- After login: suite (Editor/Studio/Motion/Publish) feels unified **inside** Studio only

---

## Future readiness (identity)

| Target | Ready? |
|--------|--------|
| Future HomeCheff apps | HC IdP + SSO pattern scalable |
| Future Studio apps | Need product registration + local session contract |
| Future Growth apps | Pattern exists |
| Mobile / desktop / API clients | HC has native Google paths; Studio API = cookie/session today — not OAuth client |
| External integrations | No Studio identity federation API |

**Scalability:** Central IdP + per-product session is the right shape. Studio is the lagging client.

---

## Product Experience Score

**2 / 5** — Suite cohesion inside Studio; ecosystem identity story fails the one-account test.
