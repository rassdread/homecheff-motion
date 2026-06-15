import type { AssetLifecycleManifestFields } from "@/types/studio-asset-lifecycle";

/** User-uploaded files reusable across Studio flows (blob manifest). */

export type UserLibraryUploadAssetType =
  | "reference_image"
  | "source_image"
  | "character_image"
  | "prop_image"
  | "location_image"
  | "audio"
  | "voice_sample"
  | "music"
  | "sound"
  | "video"
  | "export";

export type UserLibraryUploadRecord = {
  id: string;
  ownerId: string;
  assetType: UserLibraryUploadAssetType;
  sourceType: "uploaded";
  mimeType: string;
  fileName: string;
  storageKey: string;
  publicUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  originContext?: string;
  usedIn?: string[];
} & AssetLifecycleManifestFields;

export type UserLibraryUploadManifest = {
  version: 1;
  ownerId: string;
  updatedAt: string;
  uploads: UserLibraryUploadRecord[];
};
