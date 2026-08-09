# S.8A — Financial Product Truth (Canonical)

**Date:** 2026-08-09  
**Phase:** S.8A — Billing, Credits & Financial Product Truth Audit  
**Mode:** READ-ONLY forensic discovery  
**Implementation:** NONE · **Commits:** NONE · **Pricing changes:** NONE

---

## Executive verdict

Studio financial reality is a **prepaid StudioWallet** charged via **reserve → capture / refund**, with **Stripe packs/subscriptions** as money-in. Subscriptions do **not** grant monthly credits. GenerationJob financial wrapping is **partial**. Fair use is **not** a dedicated meter — it is hard wallet blocking (+ legacy Motion role quotas).

**This audit is complete enough to unlock foundation work.**

---

## Document index (canonical set)

| Doc | Role |
|-----|------|
| `docs/architecture/studio-billing-product-truth.md` | Money in/out, ownership |
| `docs/architecture/studio-credit-architecture.md` | Credit lifecycle & drift |
| `docs/architecture/studio-provider-financial-flow.md` | Provider financial paths |
| `docs/audits/studio-s8a-billing-audit.md` | Billing detail |
| `docs/audits/studio-s8a-credit-audit.md` | Credits detail |
| `docs/audits/studio-s8a-provider-audit.md` | Providers |
| `docs/audits/studio-s8a-generationjob-financial-audit.md` | Jobs |
| `docs/audits/studio-s8a-subscription-audit.md` | Plans |
| `docs/audits/studio-s8a-cache-reuse-audit.md` | Cache/reuse |
| `docs/audits/studio-s8a-security-billing-audit.md` | Bypass & abuse |
| `docs/audits/studio-audio-s8-billing-inputs.md` | Audio/S.7E input registry (prior) |

---

## Ownership (final)

| Domain | Canonical owner |
|--------|-----------------|
| Money-in (Stripe, packs, plans, promos) | **Billing** |
| Consumption authorize/reserve/capture/refund | **Credits** |
| Execution tracking + idempotent charge finalize | **GenerationJobs** (when wired) |
| Provider SDK + provider job IDs | **Provider adapters** |
| COGS / usage rows | **Telemetry / metering** |
| Verification of the above | **Financial Audit (S.8)** |

No intentional overlapping write ownership. Documented **drift** exists between catalogs and parallel ledgers.

---

## Generation route pattern (truth)

```
Entry
  → GenerationJob? (partial)
  → Credit reserve
  → Provider execute
  → Provider cost event
  → Storage
  → Result
  → Capture OR refund
  → Retry = new key (paid) OR recover (free)
  → Replay = free when Job succeeded
  → Reuse/cache = skipCapture / free registry
  → Billing event (EUR) optional parallel
  → Telemetry always desirable; not always complete
```

---

## Fair use — actual behaviour (not intended marketing)

**There is no Studio fair-use policy module that soft-limits prepaid generation.**

What happens if a normal `user` generates without buying extra credits:

| Scale | What happens |
|-------|----------------|
| Until wallet empty | Each billable success captures credits; planning/UI free |
| After available < cost | `insufficient_credits` or `free_account_provider_action` — **hard stop** |
| 100 / 500 / 1,000 / 5,000 | Same rule: stops when balance insufficient — no soft overage, no automatic subscription grant |
| Motion specifically | Additionally hit **role** AnimationUsageLedger caps (user: 5/day, 30/month videos; 500/3000 estimated credits) — independent of wallet |
| Admin | Credit bypass; animation caps effectively unlimited |

**No margin math performed in S.8A.**

---

## Bypass classes (complete list found)

1. `admin_bypass` (User.role admin)  
2. Production-chain reservation/transaction IDs  
3. Free action registry + free route patterns  
4. Cache `skipCapture` / `CACHE_HIT_NO_CHARGE`  
5. Job replay / technical recover  
6. `isBillingFreeForUser` for EUR video quotes (admin / test mode + power)  
7. Client-only editor credit simulation (non-authoritative)

---

## Blocking findings (for financial foundation — not for this audit’s DoD)

These did **not** block S.8A Product Truth completion. They were **inputs for S.8B**.

S.8B status (2026-08-09, see `studio-s8b-billing-credit-foundation.md`):

1. Deferred GenerationJob wraps: STT, translation — **addressed in S.8B**  
2. Idempotency fallback allows double-charge without client key — **addressed in S.8B** (deterministic fingerprint; no random paid keys)  
3. Dual monetization narratives (wallet vs EUR CustomerBillingEvent / Vidu) — **documented / correlated; wallet remains SoT**  
4. Registry provider label vs OpenAI execution drift — **addressed in S.8B**  
5. Client localStorage credits must stay non-authoritative — **preserved + tested**  
6. Carry/expiry policy storage without proven enforcement job — **honesty: UNLIMITED only claimed in prod until scheduler exists**  
7. Stale audit docs that contradict S.7B Job wiring — forensic history preserved; S.8B docs supersede runtime claims  


---

## Non-blocking risks

- Fusion override map vs default `fusion_render`  
- Bulk/improve image bare routes  
- Motion charge-at-create vs track-only Job  
- Suggestions priced but weakly routed  
- Pack/plan TS vs DB dual catalogs  
- `subscription_grant` / `usage_charge` ledger types semi-orphaned  

---

## Definition of Done checklist

| Criterion | Result |
|-----------|--------|
| Every Billing path documented | PASS |
| Every Credit path documented | PASS |
| Every GenerationJob billing path documented | PASS |
| Every Provider billing path documented | PASS |
| Every Subscription documented | PASS |
| Every Fair Use mechanism documented | PASS (honest: wallet hard-stop + motion role quotas) |
| Every cache/reuse path documented | PASS |
| Every bypass documented | PASS |
| Every financial owner identified | PASS |
| Product Truth complete | PASS |
| Risks documented honestly | PASS |
| No implementation performed | PASS |

---

## Final decision

# GO FOR STUDIO S.8B — BILLING & CREDIT FOUNDATION

Product Truth is complete. S.8B may begin foundation work against these findings.

**Do not start S.8B automatically.**  
**Do not change prices in S.8A.**  
**Do not treat older motion monetization audits as current plan truth.**
