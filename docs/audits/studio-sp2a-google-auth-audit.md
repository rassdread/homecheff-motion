# SP.2A — Google Auth Audit

**Date:** 2026-08-10 · **Read-only**

---

## Studio

| Item | Status |
|------|--------|
| Google login UI | **ABSENT** (`auth-form.tsx` email/password only) |
| OAuth routes / callbacks | **ABSENT** |
| `GOOGLE_CLIENT_ID` / secret | **ABSENT** (auth) |
| Google Vision OCR | EXISTS — **not identity** |

---

## HomeCheff (canonical Google owner)

| Item | Status |
|------|--------|
| Implementation | NextAuth `GoogleProvider` in `lib/auth.ts` |
| OAuth owner | **HomeCheff** |
| Storage | Prisma `Account` (`provider` + `providerAccountId`) |
| Linking | NextAuth adapter — email collision rules in HC |
| Multiple Google accounts | Provider-account model supports multi-Account; product policy HC-owned |
| Token / refresh | NextAuth / Google token handling inside HC |
| Ecosystem design | Google is **central-only** — Growth does not implement local Google login |

---

## Can Google become canonical for HC + Studio + Growth without duplication?

| Criterion | Verdict |
|-----------|---------|
| Single OAuth app / callbacks on HomeCheff | **Yes — already the design** |
| Products consume via SSO code exchange | **Yes for Growth pattern; Studio not wired** |
| Studio implementing its own Google OAuth | **Would create duplication — reject** |
| Password-only Studio users | Need SSO link + optional password reset; hashes not portable |

**Google Login Reuse: YES (via HomeCheff SSO) — NOT via Studio-native OAuth.**

---

## Blocking for “Google on Studio login”

Studio must become an SSO **client** of HomeCheff.  
Adding Google buttons that talk only to Studio would violate central identity law and create duplicate Google identities.
