/**
 * Studio V2 — Asset lifecycle completion.
 * When a user creates an asset after choosing "Build new", mark the registry decision fulfilled
 * and propagate use_existing with the new entity id (no new AI or schema).
 */

import {
  applyAssetDecision,
  getAssetDecision,
} from "@/lib/studio-asset-decision-execution";
import type {
  AssetDecisionKind,
  AssetDecisionSource,
  StudioAssetDecision,
  StudioAssetDecisionRegistry,
} from "@/types/studio-asset-decision";

export type AssetLifecycleDisplayStatus =
  | "use_existing"
  | "in_progress"
  | "completed"
  | "skipped";

export type FulfillAssetDecisionInput = {
  decisionId?: string;
  kind: AssetDecisionKind;
  createdEntityId: string;
  createdName: string;
  source?: AssetDecisionSource;
};

export type ResolveAssetLifecycleAfterCreateInput = FulfillAssetDecisionInput & {
  registry: StudioAssetDecisionRegistry;
  storyboardId?: string;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function getAssetLifecycleDisplayStatus(
  decision: StudioAssetDecision
): AssetLifecycleDisplayStatus {
  if (decision.mode === "skip") {
    return "skipped";
  }
  if (decision.mode === "build_new") {
    return "in_progress";
  }
  if (decision.fulfilledAt) {
    return "completed";
  }
  return "use_existing";
}

export function assetLifecycleStatusLabelKey(decision: StudioAssetDecision): string {
  const status = getAssetLifecycleDisplayStatus(decision);
  if (status === "use_existing") {
    return "studio.assetDecision.status.useExisting";
  }
  if (status === "in_progress") {
    return "studio.assetDecision.status.buildNew";
  }
  if (status === "completed") {
    return "studio.assetDecision.status.completed";
  }
  return "studio.assetDecision.status.skip";
}

export function assetLifecycleStatusClass(decision: StudioAssetDecision): string {
  const status = getAssetLifecycleDisplayStatus(decision);
  if (status === "use_existing") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (status === "in_progress") {
    return "bg-amber-50 text-amber-900";
  }
  if (status === "completed") {
    return "bg-sky-50 text-sky-900";
  }
  return "bg-zinc-100 text-zinc-600";
}

function namesMatch(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) {
    return false;
  }
  return left === right || left.includes(right) || right.includes(left);
}

export function findDecisionToFulfill(
  registry: StudioAssetDecisionRegistry,
  params: FulfillAssetDecisionInput
): StudioAssetDecision | undefined {
  if (params.decisionId) {
    const byId = getAssetDecision(registry, params.decisionId);
    if (byId && byId.kind === params.kind && byId.mode === "build_new") {
      return byId;
    }
  }

  const pending = registry.decisions.filter(
    (d) => d.kind === params.kind && d.mode === "build_new"
  );
  if (pending.length === 0) {
    return undefined;
  }

  const byName = pending.find((d) => namesMatch(d.name, params.createdName));
  if (byName) {
    return byName;
  }

  if (pending.length === 1) {
    return pending[0];
  }

  return undefined;
}

export function isAssetDecisionPendingBuild(
  registry: StudioAssetDecisionRegistry,
  kind: AssetDecisionKind,
  params: { id?: string; name?: string }
): boolean {
  for (const decision of registry.decisions) {
    if (decision.mode !== "build_new" || decision.kind !== kind) {
      continue;
    }
    if (params.id && decision.id === params.id) {
      return true;
    }
    if (params.name && namesMatch(decision.name, params.name)) {
      return true;
    }
  }
  return false;
}

export function isAssetDecisionFulfilled(
  registry: StudioAssetDecisionRegistry,
  kind: AssetDecisionKind,
  params: { id?: string; name?: string; existingId?: string }
): boolean {
  for (const decision of registry.decisions) {
    if (decision.kind !== kind || !decision.fulfilledAt || decision.mode !== "use_existing") {
      continue;
    }
    if (params.id && decision.id === params.id) {
      return true;
    }
    if (params.existingId && decision.existingId === params.existingId) {
      return true;
    }
    if (params.name && namesMatch(decision.name, params.name)) {
      return true;
    }
  }
  return false;
}

export function isAssetDecisionResolved(
  registry: StudioAssetDecisionRegistry,
  kind: AssetDecisionKind,
  params: { id?: string; name?: string; existingId?: string }
): boolean {
  for (const decision of registry.decisions) {
    if (decision.kind !== kind) {
      continue;
    }
    if (decision.mode === "skip") {
      if (params.id && decision.id === params.id) {
        return true;
      }
      if (params.name && namesMatch(decision.name, params.name)) {
        return true;
      }
    }
    if (decision.mode === "use_existing") {
      if (params.id && decision.id === params.id) {
        return true;
      }
      if (params.existingId && decision.existingId === params.existingId) {
        return true;
      }
      if (params.name && namesMatch(decision.name, params.name)) {
        return true;
      }
    }
    if (decision.mode === "build_new") {
      if (params.id && decision.id === params.id) {
        return true;
      }
      if (params.name && namesMatch(decision.name, params.name)) {
        return true;
      }
    }
  }
  return false;
}

export function fulfillAssetDecision(
  registry: StudioAssetDecisionRegistry,
  params: FulfillAssetDecisionInput & { storyboardId?: string }
): StudioAssetDecisionRegistry {
  const match = findDecisionToFulfill(registry, params);
  if (!match) {
    return registry;
  }

  const now = new Date().toISOString();
  let updated = applyAssetDecision(registry, {
    id: match.id,
    kind: params.kind,
    mode: "use_existing",
    name: params.createdName.trim() || match.name,
    existingId: params.createdEntityId,
    source: params.source ?? (match.source === "production_brief" ? "production_brief" : "workspace"),
    fulfilledAt: now,
  });

  if (params.storyboardId && !updated.storyboardId) {
    updated = { ...updated, storyboardId: params.storyboardId, updatedAt: now };
  }

  return updated;
}

export function resolveAssetLifecycleAfterCreate(
  input: ResolveAssetLifecycleAfterCreateInput
): StudioAssetDecisionRegistry {
  return fulfillAssetDecision(input.registry, {
    decisionId: input.decisionId,
    kind: input.kind,
    createdEntityId: input.createdEntityId,
    createdName: input.createdName,
    source: input.source,
    storyboardId: input.storyboardId,
  });
}

export function assetDecisionKindToToolId(
  kind: AssetDecisionKind
): import("@/lib/studio-tool-id").StudioToolId {
  if (kind === "character") {
    return "characters";
  }
  if (kind === "location") {
    return "locations";
  }
  if (kind === "prop") {
    return "props";
  }
  return "world";
}
