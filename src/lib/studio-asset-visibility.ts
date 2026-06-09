import { isRegistryAssetHiddenFromLibrary } from "@/lib/studio-asset-registry-lifecycle";
import type { StudioAssetPickerContext, StudioAssetVisibility, UserLibraryFilterOptions } from "@/types/studio-asset-visibility";
import type { StudioAsset, StudioAssetCategory } from "@/types/studio-media-asset";

const PLACEHOLDER_VOICE_PRESET_TAGS = ["voice_preset"];

export function classifyStudioAssetVisibility(asset: StudioAsset): StudioAssetVisibility {
  if (asset.visibility) {
    return asset.visibility;
  }

  if (asset.owner !== "system") {
    return "user_owned";
  }

  if (asset.sourceRef.entityType === "voice_preset") {
    return "placeholder";
  }

  if (asset.tags.some((t) => PLACEHOLDER_VOICE_PRESET_TAGS.includes(t))) {
    return "placeholder";
  }

  if (asset.sourceRef.entityType === "audio_catalog") {
    const hasPreview = Boolean(asset.previewUrl?.trim() || asset.downloadUrl?.trim());
    return hasPreview ? "system_usable" : "system_hidden";
  }

  if (asset.sourceRef.entityType === "brand_catalog") {
    return "admin_only";
  }

  if (!asset.previewUrl?.trim() && !asset.downloadUrl?.trim()) {
    return asset.category === "voice" || asset.category === "music" || asset.category === "ambience"
      ? "system_hidden"
      : "placeholder";
  }

  return "system_hidden";
}

export function isUserOwnedStudioAsset(asset: StudioAsset, userId: string): boolean {
  return classifyStudioAssetVisibility(asset) === "user_owned" && asset.owner === userId;
}

export function isVisibleInUserLibrary(
  asset: StudioAsset,
  options: UserLibraryFilterOptions
): boolean {
  const visibility = classifyStudioAssetVisibility(asset);

  if (visibility === "user_owned") {
    return asset.owner === options.userId;
  }

  if (options.showSystemAssets && options.isAdmin) {
    return visibility !== "admin_only" || options.isAdmin;
  }

  if (visibility === "system_usable" && options.pickerContext) {
    return isAssetUsableInPickerContext(asset, options.pickerContext);
  }

  return false;
}

const PICKER_CATEGORIES: Record<StudioAssetPickerContext, StudioAssetCategory[] | "all"> = {
  library_all: "all",
  reference_image: ["reference_image", "character", "prop", "location", "mouth_asset"],
  voice: ["voice"],
  music: ["music"],
  sound: ["sound_effect", "ambience"],
  character: ["character"],
  prop: ["prop"],
  location: ["location"],
  world: ["character"],
};

export function isAssetUsableInPickerContext(
  asset: StudioAsset,
  context: StudioAssetPickerContext
): boolean {
  const visibility = classifyStudioAssetVisibility(asset);

  if (visibility === "user_owned") {
    const allowed = PICKER_CATEGORIES[context];
    if (allowed === "all") {
      return true;
    }
    if (context === "reference_image") {
      if (allowed.includes(asset.category)) {
        return Boolean(asset.previewUrl?.trim() || asset.downloadUrl?.trim());
      }
      return false;
    }
    if (context === "voice") {
      if (asset.category !== "voice") {
        return false;
      }
      return (
        asset.tags.includes("voice_clone") ||
        asset.tags.includes("voice_sample") ||
        (asset.tags.includes("user_upload") && asset.origin === "uploaded")
      );
    }
    return allowed.includes(asset.category);
  }

  if (visibility === "placeholder" || visibility === "system_hidden") {
    return false;
  }

  if (visibility === "system_usable") {
    if (context === "voice") {
      return asset.category === "voice" && asset.sourceRef.entityType === "audio_catalog";
    }
    if (context === "music") {
      return asset.category === "music";
    }
    if (context === "sound") {
      return asset.category === "sound_effect" || asset.category === "ambience";
    }
    return false;
  }

  return false;
}

/** Default My Assets view — user-owned only; system catalog hidden unless admin toggle. */
export function filterUserLibraryAssets(
  assets: StudioAsset[],
  options: UserLibraryFilterOptions
): StudioAsset[] {
  const context = options.pickerContext ?? "library_all";
  return assets.filter((asset) => {
    if (isRegistryAssetHiddenFromLibrary(asset) && !(options.showSystemAssets && options.isAdmin)) {
      return false;
    }
    if (!isVisibleInUserLibrary(asset, options)) {
      return false;
    }
    if (context === "library_all") {
      const visibility = classifyStudioAssetVisibility(asset);
      if (visibility === "user_owned") {
        return true;
      }
      return Boolean(options.showSystemAssets && options.isAdmin);
    }
    return isAssetUsableInPickerContext(asset, context);
  });
}

/** @deprecated Use filterUserLibraryAssets — kept for tests migrating off system+user union. */
export function userOwnedAssetsOnly(assets: StudioAsset[], userId: string): StudioAsset[] {
  return filterUserLibraryAssets(assets, { userId, isAdmin: false, showSystemAssets: false });
}

export function filterAssetsForPickerContext(
  assets: StudioAsset[],
  options: UserLibraryFilterOptions & { pickerContext: StudioAssetPickerContext }
): StudioAsset[] {
  return filterUserLibraryAssets(assets, options);
}
