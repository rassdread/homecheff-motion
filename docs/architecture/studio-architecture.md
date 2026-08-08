# HomeCheff Studio — Canonical Product Architecture

**Status:** CANONICAL PRODUCT ARCHITECTURE (Phase S.1)  
**Yields to:** `homecheff-central-identity.md` for identity / SSO decisions (when published)  
**Phase:** S.1–S.4 (foundation → generation orchestration)  
**Branch:** see release audits; generation: `docs/architecture/studio-generation-orchestration.md`

---

## 1. Product position

Studio is one product inside the HomeCheff suite (Editor → Studio → Motion → Publish / Library), deployed as a **single Next.js monolith** (`frameflow-ai`).

Studio must remain runnable **without** Growth or Marketplace runtime calls. Future ecosystem integration uses **explicit contracts**, not shared cookies or direct foreign DB access.

---

## 2. Target module boundaries (conceptual)

```
src/
  app/                         # routes + API handlers only
  components/{studio,editor}/  # UI (CLIENT)
  lib/                         # SHARED_PURE + client helpers (no Node secrets)
  server/                      # SERVER_ONLY orchestration, billing, storage, AI adapters
  types/                       # SHARED_PURE contracts
  shared/                      # reserved for future packages (not required for S.1)
```

**S.1 policy:** Do not mechanically move the entire tree. Migrate only P0/P1 boundary violations. Avoid dumping new server logic into `src/lib`.

---

## 3. Client / server split

| Class | Meaning | Examples |
|-------|---------|----------|
| **CLIENT_SAFE** | Browser OK | Components, hooks, pure UI helpers |
| **SHARED_PURE** | No Node/secrets/DB | `studio-credit-constants.ts`, `studio-user-audio-library-find.ts`, `types/*` |
| **SERVER_ONLY** | Route handlers / server modules | `studio-user-audio-library-blob.ts`, `attach-audio-mix-handoff.ts`, AI providers, Prisma |
| **BOUNDARY_VIOLATION** | Client (transitively) reaches Node/secrets | Fixed in S.1 for credits + audio mix |

**Rule:** `"use client"` modules must not import `@/server/**` (value imports). Architecture tests enforce a denylist for known leak paths.

---

## 4. Workspace route (ADR-STUDIO-003)

| Route | Role |
|-------|------|
| **`/studio?storyboardId=`** | **Canonical workspace** |
| `/studio` (no id) | Studio home / start |
| `/studio/workspace` | **Compatibility redirect** → canonical |

Owner UI: `StudioRootPage` → dynamic `StudioWorkspaceShell`.

---

## 5. State ownership

| Concern | Owner | Class |
|---------|-------|-------|
| Storyboard loading | `StudioWorkspaceShell` + `/api/studio/storyboards` | CANONICAL (server) + client cache |
| Active tool | `StudioWorkspaceShell` `activeTool` | EPHEMERAL |
| URL storyboardId | Next search params | CANONICAL navigation |
| HC project package | localStorage + optional server sync | DUPLICATE risk → S.5 |
| Credits balance | Server wallet / ledger | CANONICAL |
| Display credit estimates | `studio-credit-constants` + API preview | DERIVED |
| Audio mix plan | Pure resolve from storyboard + library list | DERIVED |
| Audio library bytes | Blob (server) | CANONICAL |

---

## 6. Credit architecture (ADR-STUDIO-002)

1. **Server-authoritative** action registry: `STUDIO_ACTION_COST_REGISTRY`
2. **Shared pure** constants: `src/lib/studio-credit-constants.ts` (USD math + fusion **intent** overrides)
3. Fusion charge path uses **intent map via `overrideCredits`** — client never decides the charged amount
4. UI may display projected costs from SHARED_PURE; server re-validates

---

## 7. AI boundary

```
Studio UI → Studio/Editor API route → server orchestration → provider adapter → Blob/DB
```

Provider SDKs and API keys stay on the server. Clients call product operations only.

---

## 8. Rendering boundary

```
Editor/Studio state → render request (API) → provider or video worker → storage → result URL/status poll
```

Studio jobs: DB `StudioJob` + `after()` (not durable queue — flagged for S.4).  
Motion merge: Express `worker/video-worker.ts`.

---

## 9. Storage boundary

| Kind | Where |
|------|--------|
| Uploads / generated media | Vercel Blob (server token) |
| Relational | Postgres via Prisma |
| Wizard caches | Browser local/IndexedDB (ephemeral) |
| Credentials | Server env only (`BLOB_*`, provider keys) |

---

## 10. Auth / Central Identity seam

- **Unchanged in S.1:** `studio_session` HMAC, host-only cookie, local `User`
- **Future (document only):** nullable `centralUserId` on local user; HomeCheff Central Identity is SoT for login; Studio keeps local product ids
- Auth implementation must not leak into unrelated UI modules beyond `requireActiveUser` / session helpers

---

## 11. Product independence

- No Growth API required for Studio core flows
- Marketplace `/discover` is placeholder — not a Studio dependency
- Affiliate appears as content/presets only

---

## 12. Code splitting (ADR-STUDIO-004)

Deliberate `next/dynamic` for:

- `StudioWorkspaceShell` (from Studio home when storyboard opens)
- `EditorCanvasWorkspace` (from Editor start when session opens)

Core nav/shell stays eager.

---

## 13. Related ADRs

- `docs/architecture/adr/ADR-STUDIO-001-client-server-boundaries.md`
- `docs/architecture/adr/ADR-STUDIO-002-credit-source-of-truth.md`
- `docs/architecture/adr/ADR-STUDIO-003-workspace-route-ownership.md`
- `docs/architecture/adr/ADR-STUDIO-004-editor-code-splitting.md`

## 14. Inventory companion

See `docs/architecture/studio-s1-boundary-inventory.md`

## 15. Release certification

See `docs/audits/studio-s1-release-certification.md` for Preview → merge → production evidence.

## 16. Adaptive Workspace (S.2)

Studio inherits the ecosystem Adaptive Workspace System (`homecheff-adaptive-workspace-system.md`, ADR-006).

Canonical Studio docs:

- `docs/architecture/studio-workspace.md`
- `docs/architecture/studio-information-architecture.md`
- `docs/architecture/adr/ADR-STUDIO-005-adaptive-workspace-postures.md`

### Robot / mascot

| Breakpoint | Expectation |
|------------|-------------|
| Mobile portrait / landscape | Robot/mascot **not** permanently rendered |
| Tablet (FOCUSED) | On-demand AI only |
| Desktop | Contextual AI in right rail / suite copilot — no permanent character chrome |

AI remains accessible on mobile via on-demand toolbar / sheet. Creative workspace always has priority.
