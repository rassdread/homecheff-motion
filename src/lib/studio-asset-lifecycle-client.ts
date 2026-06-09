/**
 * Client-side asset lifecycle — storyboard decision fulfillment and registry remove/hide.
 */

import {
  loadAssetDecisionRegistry,
  saveAssetDecisionRegistry,
} from "@/lib/studio-asset-decision-storage";
import { resolveAssetLifecycleAfterCreate } from "@/lib/studio-asset-lifecycle-resolver";
import type { AssetDecisionKind } from "@/types/studio-asset-decision";
import type {
  AssetRemoveMode,
  AssetRemoveRequest,
  AssetRemoveResult,
  AssetRegistryUsageReport,
} from "@/types/studio-asset-lifecycle";

export type CompleteAssetLifecycleParams = {
  storyboardId: string;
  kind: AssetDecisionKind;
  createdEntityId: string;
  createdName: string;
  decisionId?: string;
};

export function completeAssetLifecycleAfterCreate(
  params: CompleteAssetLifecycleParams
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const registry = loadAssetDecisionRegistry({ storyboardId: params.storyboardId });
  const beforeCount = registry.decisions.filter((d) => d.mode === "build_new").length;

  const updated = resolveAssetLifecycleAfterCreate({
    registry,
    storyboardId: params.storyboardId,
    decisionId: params.decisionId,
    kind: params.kind,
    createdEntityId: params.createdEntityId,
    createdName: params.createdName,
    source: "workspace",
  });

  const afterCount = updated.decisions.filter((d) => d.mode === "build_new").length;
  if (afterCount < beforeCount || updated.updatedAt !== registry.updatedAt) {
    saveAssetDecisionRegistry(updated);
    return true;
  }

  return false;
}

export async function fetchRegistryAssetUsage(params: {
  assetId: string;
  assetKind: string;
  storageKey?: string | null;
  generationId?: string | null;
}): Promise<{ ok: true; usage: AssetRegistryUsageReport } | { ok: false }> {
  const qs = new URLSearchParams({
    assetId: params.assetId,
    assetKind: params.assetKind,
  });
  if (params.storageKey) {
    qs.set("storageKey", params.storageKey);
  }
  if (params.generationId) {
    qs.set("generationId", params.generationId);
  }
  const res = await fetch(`/api/studio/assets/usage?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    return { ok: false };
  }
  const json = (await res.json()) as { ok: boolean; usage: AssetRegistryUsageReport };
  return json.ok ? { ok: true, usage: json.usage } : { ok: false };
}

export async function removeRegistryAssetApi(
  request: AssetRemoveRequest
): Promise<{ ok: true; result: AssetRemoveResult } | { ok: false; result?: AssetRemoveResult }> {
  const res = await fetch("/api/studio/assets/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const json = (await res.json()) as AssetRemoveResult & { ok: boolean };
  return json.ok ? { ok: true, result: json } : { ok: false, result: json };
}

export async function fetchAssetsHubCounts(): Promise<
  { ok: true; counts: import("@/types/studio-asset-hub-counts").AssetsHubCountsReport } | { ok: false }
> {
  const res = await fetch("/api/studio/assets/hub-counts", { cache: "no-store" });
  if (!res.ok) {
    return { ok: false };
  }
  const json = (await res.json()) as {
    ok: boolean;
    counts: import("@/types/studio-asset-hub-counts").AssetsHubCountsReport;
  };
  return json.ok ? { ok: true, counts: json.counts } : { ok: false };
}

export type { AssetRemoveMode };
