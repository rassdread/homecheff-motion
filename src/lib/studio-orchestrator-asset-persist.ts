/**
 * Persist orchestrator uploads as HC Project assets — upload once, use everywhere.
 */

import { randomUUID } from "node:crypto";
import { createHcAssetReference, upsertHcAssetReference } from "@/lib/hc-asset-references";
import { writeOrchestratorState } from "@/lib/studio-production-orchestrator";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { HcPersistedProductionAsset, HcPersistedProductionAssetKind } from "@/types/studio-video-production";

export function attachPersistedProductionAsset(
  project: HomeCheffProjectPackage,
  asset: HcPersistedProductionAsset
): HomeCheffProjectPackage {
  const existing = project.workflowState.aiWorkflowV2 as {
    orchestrator?: { persistedAssets?: HcPersistedProductionAsset[] };
  } | undefined;
  const current = existing?.orchestrator?.persistedAssets ?? [];
  const persistedAssets = [...current.filter((a) => a.id !== asset.id), asset];
  let next = writeOrchestratorState(project, { persistedAssets });

  const ref = createHcAssetReference({
    id: asset.id,
    url: asset.url,
    storageKey: asset.storageKey,
    kind: mapKindToHcRef(asset.kind),
    role: asset.kind,
    sourceService: "studio",
    mimeType: asset.mimeType,
  });
  next = upsertHcAssetReference(next, ref);

  if (asset.kind === "music") {
    next = writeOrchestratorState(next, { musicAudioUrl: asset.url });
  }

  return next;
}

function mapKindToHcRef(kind: HcPersistedProductionAssetKind): string {
  switch (kind) {
    case "logo":
      return "logo";
    case "product_image":
      return "product";
    case "music":
      return "audio";
    case "video":
      return "video";
    case "photo":
    case "photos":
      return "image";
    default:
      return kind;
  }
}

export function buildPersistedAsset(params: {
  kind: HcPersistedProductionAssetKind;
  url: string;
  storageKey?: string;
  fileName?: string;
  mimeType?: string;
  durationSeconds?: number;
  analysisJson?: Record<string, unknown>;
}): HcPersistedProductionAsset {
  return {
    id: randomUUID(),
    kind: params.kind,
    url: params.url,
    storageKey: params.storageKey,
    fileName: params.fileName,
    mimeType: params.mimeType,
    durationSeconds: params.durationSeconds,
    analysisJson: params.analysisJson,
    createdAt: new Date().toISOString(),
  };
}

export function listPersistedAssets(
  project: HomeCheffProjectPackage,
  kind?: HcPersistedProductionAssetKind
): HcPersistedProductionAsset[] {
  const wf = project.workflowState.aiWorkflowV2 as {
    orchestrator?: { persistedAssets?: HcPersistedProductionAsset[] };
  } | undefined;
  const assets = wf?.orchestrator?.persistedAssets ?? [];
  return kind ? assets.filter((a) => a.kind === kind) : assets;
}

export function photoUrlsFromProject(project: HomeCheffProjectPackage): string[] {
  return listPersistedAssets(project, "photo")
    .concat(listPersistedAssets(project, "photos"))
    .map((a) => a.url)
    .filter(Boolean);
}
