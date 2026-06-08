# Motion Studio Coherence & User Experience Report

Sprint completed: Motion Studio Coherence, Account & User Experience (June 2026).

Constraints honored: no new AI/image/motion/voice providers, no Studio V2, no parallel systems, no schema migrations.

---

## Truth Fixes

### Motion handoff persistence
- Motion wizard drafts with a `studioHandoff.storyboardId` now sync to blob manifest `studio/{ownerId}/storyboards/{id}/workspace-state.json` via debounced PUT.
- `applyMotionHandoffImport` writes the draft to server immediately after local import.
- `hydrateStudioWorkspaceStateFromServer` restores asset decisions and motion drafts on storyboard workspace load.

### Asset lifecycle persistence
- `saveAssetDecisionRegistry` syncs to the same workspace-state blob (server truth, localStorage as fast cache).
- API: `GET/PUT /api/studio/storyboards/[id]/workspace-state`.

### Planner metadata
- `sanitizeMotionHandoffForStorage` now retains `renderStrategyPlan`, `animationPlan`, `viduExecutionPlan`, and `sceneGenerationPlan`.

### Handoff style profiles
- New `mapStudioStyleProfileToWizardPreset` and `mapStudioContinuityToWizardStrength`.
- `mapHandoffToPersistedWizardState` uses storyboard `promptStyleProfile` and `continuityStrength` instead of hardcoded `food_promo` / `balanced`.

**Flow:** Studio → Handoff → Persisted draft (blob + localStorage) → Motion → Project

---

## Billing Fixes

Added to `INSTRUMENTATION_ONLY_ACTIONS` (never sync to `CustomerBillingEvent`):
- `OPENAI_OCR`
- `STORAGE_UPLOAD`
- `INTERNAL_MERGE`

Instrumentation-only studio actions remain separate from revenue-generating Vidu renders and customer billing events.

---

## Project Profitability

- `resolveCostEventProjectId` maps `metadataJson.storyboardId` → latest linked `AnimationProject` via `studioSourceStoryboardId`.
- Studio COGS without direct `projectId` (scene images, voice previews, derivations, vision) roll up into project profitability rows.

---

## Create Flow Consolidation

- **Default:** Guided wizard on `/studio/{kind}/new` (unchanged default via `shouldShowAssetCreationWizard`).
- **Advanced:** `?advanced=1` opens the identity builder directly.
- **Legacy `existing_asset`:** removed from entry UI; normalized to `derive_from_reference` flow in `normalizeAssetCreateEntryPath`.

---

## Account Layer

- Blob profile: `studio/{userId}/account-profile.json`
- API: `GET/PATCH/DELETE /api/me/account`
- UI: `/studio/account` — name, username, email (read-only), avatar URL, locale, notifications, privacy, account delete (deactivates user)

Uses existing auth; no new auth provider.

---

## Studio Dashboard

- **Mijn Studio:** `/studio/my-studio`
- Data: `GET /api/me/studio-insights?view=dashboard`
- Shows: monthly usage counts, library totals, recent activity (no COGS/margins/admin data)
- Navigation link in studio shell header and empty view

---

## User Usage Surface

Monthly usage cards on My Studio:
- Projects, scene images, asset references, voice previews/clones, renders, exports, translations, derived assets

Hidden from users: COGS, margins, provider costs, admin profitability.

---

## Admin Separation

- Profitability dashboard remains under `/admin` render analytics (unchanged).
- My Studio and account pages expose usage counts only.
- Provider manager page remains in advanced hub (`/studio/providers`) — admin/debug tooling not linked from primary user flow.

---

## UX Consistency

- Unified save label: `studio.actions.save` (Opslaan / Save) on account page.
- i18n keys added for My Studio, account, and context labels (NL + EN).
- Create flow labels consolidated: Guided wizard default, Advanced via query param.

---

## Mobile UX

- My Studio, account, and shell nav links use `min-h-[44px]` touch targets.
- Usage and library grids stack on small screens (`sm:grid-cols-2`).

---

## Legacy Cleanup

| Item | Action |
|------|--------|
| `existing_asset` wizard entry | Removed from UI; redirected to derive flow in code |
| `?guided=1` on create pages | Replaced by default wizard + `?advanced=1` for builder |
| Duplicate create entry | `existing_asset` option removed |

---

## Tests / Build Status

New tests: `src/lib/motion-studio-coherence.test.ts` (8 cases):
- Style/continuity mapping
- Planner metadata sanitization
- Phantom billing instrumentation flags
- Legacy entry redirect
- Workspace state merge
- Project profitability storyboard rollup
- Account profile merge

Run validation:
```bash
npx prisma validate
npx prisma generate
npm run lint
npm run build
npm run test
```

---

## Remaining Gaps

1. **Snapshot history** still localStorage-only (`studio-snapshot-storage.ts`) — recovery points not yet on blob.
2. **Avatar upload** — account accepts URL only; no upload widget yet.
3. **Provider page** — still reachable via advanced hub; could add explicit admin gate.
4. **Real-time sync conflict** — last-write-wins on workspace state; no merge UI for concurrent devices.
5. **Subscription limits** — `withinLimits` on insights is always `true`; no enforcement UI.

---

## Recommended Next Sprint

1. Persist snapshot/recovery history to workspace-state blob.
2. Wire account locale to i18n client preference.
3. Enforce usage limits from subscription tier on My Studio.
4. Admin-only gate for provider registry and debug panels.
5. Context status bar in workspace (saved/unsaved, active asset/voice/reference) with live server sync indicator.

---

**Goal achieved:** Account → My Studio → Assets → Storyboard → Motion → Render with server-backed truth for handoff and asset decisions, user-facing dashboard without financial internals, and consolidated create flows.
