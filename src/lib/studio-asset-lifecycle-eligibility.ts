import type {
  AssetRemoveEligibility,
  AssetRemoveMode,
  StudioAssetKind,
} from "@/types/studio-asset-lifecycle";
import type { StudioAsset } from "@/types/studio-media-asset";
import { classifyStudioAssetVisibility } from "@/lib/studio-asset-visibility";

export function resolveAssetKindFromStudioAsset(asset: StudioAsset): StudioAssetKind {
  if (asset.id.startsWith("reference_image:gen_")) {
    return "generated_reference";
  }
  if (asset.tags.includes("user_upload") && asset.origin === "uploaded") {
    if (asset.category === "voice") {
      return "voice";
    }
    if (asset.category === "music" || asset.category === "sound_effect" || asset.category === "ambience") {
      return "audio";
    }
    return "upload";
  }
  if (asset.sourceRef.entityType === "character") {
    return "character";
  }
  if (asset.sourceRef.entityType === "prop") {
    return "prop";
  }
  if (asset.sourceRef.entityType === "location") {
    return "location";
  }
  if (asset.sourceRef.entityType === "world") {
    return "world";
  }
  if (asset.category === "voice") {
    return asset.tags.includes("voice_clone") ? "voice" : "voice";
  }
  if (asset.origin === "generated") {
    return "generated_reference";
  }
  return "upload";
}

export function classifyRemoveEligibility(params: {
  asset: StudioAsset;
  userId: string;
  usageCount: number;
  mode: AssetRemoveMode;
}): AssetRemoveEligibility {
  const { asset, userId, usageCount, mode } = params;
  const visibility = classifyStudioAssetVisibility(asset);

  if (asset.owner === "system" || visibility === "system_hidden" || visibility === "admin_only") {
    return "system_protected";
  }

  if (asset.owner !== userId && visibility !== "user_owned") {
    return "system_protected";
  }

  if (usageCount > 0 && mode === "delete") {
    return "in_use";
  }

  if (asset.sourceRef.entityType === "character" ||
      asset.sourceRef.entityType === "prop" ||
      asset.sourceRef.entityType === "location" ||
      asset.sourceRef.entityType === "world") {
    if (mode === "delete" && usageCount > 0) {
      return "in_use";
    }
    if (mode === "delete" && usageCount === 0) {
      return "hard_delete";
    }
    return mode === "archive" ? "archive_only" : "soft_hide";
  }

  if (asset.referenceAcceptance === "accepted" && usageCount > 0) {
    return mode === "delete" ? "in_use" : "soft_hide";
  }

  if (mode === "archive") {
    return "archive_only";
  }

  if (mode === "hide") {
    return "soft_hide";
  }

  return usageCount > 0 ? "in_use" : "hard_delete";
}

export function allowedRemoveModes(eligibility: AssetRemoveEligibility): AssetRemoveMode[] {
  switch (eligibility) {
    case "hard_delete":
      return ["hide", "archive", "delete"];
    case "soft_hide":
      return ["hide", "archive"];
    case "archive_only":
      return ["archive", "hide"];
    case "in_use":
      return ["hide", "archive"];
    case "system_protected":
      return [];
    default:
      return [];
  }
}

export function eligibilityMessageKey(eligibility: AssetRemoveEligibility, usageCount: number): string {
  if (eligibility === "in_use") {
    return "studio.assetsHub.lifecycle.usedWarning";
  }
  if (eligibility === "system_protected") {
    return "studio.assetsHub.lifecycle.systemProtected";
  }
  return "studio.assetsHub.lifecycle.eligible";
}
