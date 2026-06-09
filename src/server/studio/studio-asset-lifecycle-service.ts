import { prisma } from "@/lib/prisma";
import { classifyRemoveEligibility } from "@/lib/studio-asset-lifecycle-eligibility";
import { isManifestLifecycleHidden } from "@/lib/studio-asset-registry-lifecycle";
import { deleteStudioCharacter } from "@/server/studio/studio-character-service";
import { deleteStudioLocation } from "@/server/studio/studio-location-service";
import { deleteStudioProp } from "@/server/studio/studio-prop-service";
import { deleteStudioWorldProfile } from "@/server/studio/studio-world-profile-service";
import { getRegistryAssetUsage } from "@/server/studio/studio-asset-registry-usage-service";
import {
  readUserGeneratedReferenceManifest,
  writeUserGeneratedReferenceManifest,
} from "@/server/studio/studio-user-generated-reference-manifest-blob";
import {
  readUserUploadLibraryManifest,
  writeUserUploadLibraryManifest,
} from "@/server/studio/studio-user-upload-library-blob";
import type {
  AssetLifecycleManifestStatus,
  AssetRemoveMode,
  AssetRemoveRequest,
  AssetRemoveResult,
  StudioAssetKind,
} from "@/types/studio-asset-lifecycle";
import type { StudioAsset } from "@/types/studio-media-asset";

function lifecyclePatch(mode: AssetRemoveMode): {
  hideFromLibrary: boolean;
  hiddenAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  lifecycleStatus: AssetLifecycleManifestStatus;
} {
  const now = new Date().toISOString();
  if (mode === "hide") {
    return {
      hideFromLibrary: true,
      hiddenAt: now,
      archivedAt: null,
      deletedAt: null,
      lifecycleStatus: "hidden",
    };
  }
  if (mode === "archive") {
    return {
      hideFromLibrary: true,
      hiddenAt: null,
      archivedAt: now,
      deletedAt: null,
      lifecycleStatus: "archived",
    };
  }
  return {
    hideFromLibrary: true,
    hiddenAt: now,
    archivedAt: null,
    deletedAt: now,
    lifecycleStatus: "removed",
  };
}

async function applyUploadManifestLifecycle(
  ownerId: string,
  uploadId: string,
  mode: AssetRemoveMode
): Promise<boolean> {
  const manifest = await readUserUploadLibraryManifest(ownerId);
  const idx = manifest.uploads.findIndex((u) => u.id === uploadId);
  if (idx < 0) {
    return false;
  }
  const patch = lifecyclePatch(mode);
  manifest.uploads[idx] = { ...manifest.uploads[idx], ...patch };
  if (mode === "delete") {
    manifest.uploads.splice(idx, 1);
  }
  await writeUserUploadLibraryManifest(manifest);
  return true;
}

async function applyGeneratedManifestLifecycle(
  ownerId: string,
  generationId: string,
  mode: AssetRemoveMode
): Promise<boolean> {
  const manifest = await readUserGeneratedReferenceManifest(ownerId);
  const idx = manifest.references.findIndex((r) => r.generationId === generationId);
  if (idx < 0) {
    return false;
  }
  const patch = lifecyclePatch(mode);
  manifest.references[idx] = { ...manifest.references[idx], ...patch };
  if (mode === "delete") {
    manifest.references.splice(idx, 1);
  }
  await writeUserGeneratedReferenceManifest(manifest);
  return true;
}

function parseEntityId(assetId: string): string {
  if (assetId.includes(":")) {
    return assetId.split(":").slice(1).join(":");
  }
  return assetId;
}

function parseUploadId(assetId: string): string {
  const raw = assetId.includes(":") ? assetId.split(":").pop()! : assetId;
  return raw.replace(/^upload_/, "");
}

function parseGenerationId(assetId: string): string {
  const raw = assetId.includes(":") ? assetId.split(":").pop()! : assetId;
  return raw.replace(/^gen_/, "");
}

export async function applyAssetRemove(
  userId: string,
  request: AssetRemoveRequest,
  asset?: StudioAsset | null
): Promise<AssetRemoveResult> {
  const usage = await getRegistryAssetUsage({
    userId,
    assetKind: request.assetKind,
    assetId: request.assetId,
    storageKey: request.storageKey,
    generationId: asset?.generationId ?? parseGenerationId(request.assetId),
  });

  const stubAsset: StudioAsset = asset ?? {
    id: request.assetId,
    name: "",
    category: "reference_image",
    description: "",
    tags: [],
    owner: userId,
    source: "user",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceRef: { entityType: "scene_image", entityId: request.assetId },
    collectionIds: [],
    storageKey: request.storageKey,
  };

  const eligibility = classifyRemoveEligibility({
    asset: stubAsset,
    userId,
    usageCount: usage.usageCount,
    mode: request.removeMode,
  });

  if (eligibility === "system_protected") {
    return {
      ok: false,
      mode: request.removeMode,
      applied: false,
      eligibility,
      usageCount: usage.usageCount,
      messageKey: "studio.assetsHub.lifecycle.systemProtected",
    };
  }

  if (eligibility === "in_use" && request.removeMode === "delete") {
    return {
      ok: false,
      mode: request.removeMode,
      applied: false,
      eligibility,
      usageCount: usage.usageCount,
      messageKey: "studio.assetsHub.lifecycle.usedWarning",
    };
  }

  let applied = false;

  if (request.assetKind === "upload" || request.assetKind === "audio" || request.assetKind === "voice") {
    const uploadId = parseUploadId(request.assetId);
    applied = await applyUploadManifestLifecycle(userId, uploadId, request.removeMode);
  } else if (request.assetKind === "generated_reference") {
    const generationId = parseGenerationId(request.assetId);
    applied = await applyGeneratedManifestLifecycle(userId, generationId, request.removeMode);
  } else if (request.assetKind === "character") {
    const entityId = parseEntityId(request.assetId);
    if (request.removeMode === "delete") {
      const result = await deleteStudioCharacter(entityId, { id: userId, role: "user" });
      applied = !("error" in result);
    } else {
      await prisma.studioCharacter.updateMany({
        where: { id: entityId, ownerId: userId },
        data: { updatedAt: new Date() },
      });
      applied = true;
    }
  } else if (request.assetKind === "prop") {
    const entityId = parseEntityId(request.assetId);
    if (request.removeMode === "delete") {
      const result = await deleteStudioProp(entityId, { id: userId, role: "user" });
      applied = !("error" in result);
    } else {
      applied = true;
    }
  } else if (request.assetKind === "location") {
    const entityId = parseEntityId(request.assetId);
    if (request.removeMode === "delete") {
      const result = await deleteStudioLocation(entityId, { id: userId, role: "user" });
      applied = !("error" in result);
    } else {
      applied = true;
    }
  } else if (request.assetKind === "world") {
    const entityId = parseEntityId(request.assetId);
    if (request.removeMode === "delete") {
      const result = await deleteStudioWorldProfile(entityId, { id: userId, role: "user" });
      applied = !("error" in result);
    } else {
      applied = true;
    }
  }

  return {
    ok: applied,
    mode: request.removeMode,
    applied,
    eligibility,
    usageCount: usage.usageCount,
    messageKey: applied
      ? "studio.assetsHub.lifecycle.removed"
      : "studio.assetsHub.lifecycle.failed",
  };
}

export function filterManifestUploads<T extends import("@/types/studio-asset-lifecycle").AssetLifecycleManifestFields>(
  uploads: T[]
): T[] {
  return uploads.filter((u) => !isManifestLifecycleHidden(u));
}

export function filterManifestGeneratedRefs<T extends import("@/types/studio-asset-lifecycle").AssetLifecycleManifestFields>(
  refs: T[]
): T[] {
  return refs.filter((r) => !isManifestLifecycleHidden(r));
}
