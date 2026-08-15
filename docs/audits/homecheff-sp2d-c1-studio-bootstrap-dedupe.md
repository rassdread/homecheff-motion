# SP.2D-C1 — Studio authenticated bootstrap dedupe — FINAL

**DoD: COMPLETE** (shipped + re-measured; single-sample S1/S3)  
**PR:** https://github.com/rassdread/homecheff-motion/pull/26  
**Feature SHA:** `ac4146af29c51ad13a32712c7b249ab9083eaa91`  
**Merge SHA:** `0d9c453b65f0d8eaa7e31e6ff34795bad76c2b34`  
**Production deployment:** `dpl_Ct7Sjxnkoo6CWhaBjFCdiJaGN5DC`  
**Aliases:** `studio.homecheff.eu`, `motion.homecheff.eu`

No SSO protocol / Growth / HC / favicon / region / Neon changes.

---

## Callers before → after

### `/api/me/studio-account`

| Before (S3) | After (S3) |
|-------------|------------|
| **4** parallel (~4101 ms each) from `GlobalCreditIndicator`×2, `LowCreditBanner`, conversion/assistant | **1** (`?view=summary`, **151 ms**) via `studio-account-client` single-flight |

Warm S1: **4** → **1** (99 ms).

### `library-consistency/query`

| Before | After |
|--------|-------|
| **2** (home limit 8 + assistant limit 500, ~4101 ms) | **1** coalesced bootstrap (**1226 ms** cold / **504 ms** warm) |

### `/api/auth/session`

| Before | After |
|--------|-------|
| **1** (already single-flight) | **1** |

---

## What changed

| Area | Change |
|------|--------|
| Client | `src/lib/studio-account-client.ts` — single-flight + 5s cache |
| Hook | `useStudioWalletSummary` uses shared summary fetch |
| API | `?view=summary` skips ledger (`loadStudioAccountSummary`) |
| Library | Bootstrap coalescing in `library-consistency-client.ts` |
| Assistant | Idle-deferred library load; billing uses shared account client |
| Tests | `src/lib/studio-bootstrap-dedupe.test.ts` (3/3 pass) |

DB/query: summary path skips `loadRecentLedger(25)` on shell bootstrap. Full overview unchanged for account pages.

Blocking: assistant library no longer races shell as hard (idle defer + shared cache).

---

## Gates

| Gate | Result |
|------|--------|
| Targeted tests | **3/3 pass** |
| `tsc --noEmit` | **pass** |
| Lint (changed files) | **0 errors** (pre-existing warnings in assistant provider) |
| `npm run build` | **pass** |

---

## Re-measure (single sample each — not a distribution)

Click-relative T0 = first `studio.homecheff.eu` request.

### S1 warm

| | Before | After |
|--|-------:|------:|
| Usable | ~3017 ms | **~1946 ms** |
| Shell | ~1315 ms | **~638 ms** |
| studio-account | 4 | **1** |
| library-consistency | 2 | **1** |
| auth/session | 1 | **1** |

Target &lt;2.0 s usable: **met** (~1.95 s).

### S3 cold full SSO

| | Before | After |
|--|-------:|------:|
| Session | ~3304 ms | ~5114 ms *(SSO/IdP variance this sample)* |
| Shell | ~4286 ms | ~6307 ms *(driven by slower SSO)* |
| Usable | ~8556 ms | ~8756 ms *(SSO variance dominates)* |
| studio-account | 4 × ~4101 ms | **1 × 151 ms** |
| library-consistency | 2 × ~4101 ms | **1 × 1226 ms** |
| auth/session | 1 | **1** |
| Post-shell API span | ~4.3 s | **~2.4 s** |

Primary success (call-count + API cost): **met**.  
Cold usable &lt;6 s: **not met this sample** — SSO/HC IdP was slower (~1.7 s→~higher); post-bootstrap APIs are no longer the 4.1 s fan-out.

---

## Regressions

None observed in capture gates (S3 VALID SSO chain; S1 warm PASS). Auth/session/account still 200.

## Remaining bottlenecks

1. **Cold SSO path** (HC IdP + callback + redirects) — still dominates S3 wall time  
2. **library-consistency** single call still ~0.5–1.2 s  
3. Growth callback/JIT / shell (next ranked phases)

## Recommended next phase (do not start without approval)

**Growth callback/exchange/JIT optimization** (ranked #2 from SP.2D-A.2 comparison) — largest Growth-specific SSO cost (~1395 ms in G3).
