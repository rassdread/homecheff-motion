/**
 * Client-side asset lifecycle completion — load registry, fulfill, persist.
 */

import {
  loadAssetDecisionRegistry,
  saveAssetDecisionRegistry,
} from "@/lib/studio-asset-decision-storage";
import { resolveAssetLifecycleAfterCreate } from "@/lib/studio-asset-lifecycle-resolver";
import type { AssetDecisionKind } from "@/types/studio-asset-decision";

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
