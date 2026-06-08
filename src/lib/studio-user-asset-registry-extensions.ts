import { studioAssetId } from "@/lib/studio-media-asset-registry";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";
import type { UserLibraryUploadRecord } from "@/types/studio-user-upload-library";
import type { UserVoiceLibraryEntry } from "@/types/studio-user-voice-library";
import type { StudioAsset } from "@/types/studio-media-asset";

export function buildUserUploadRegistryAssets(
  uploads: UserLibraryUploadRecord[],
  ownerId: string
): StudioAsset[] {
  return uploads.map((upload) => {
    const isAudio =
      upload.assetType === "audio" ||
      upload.assetType === "music" ||
      upload.assetType === "sound" ||
      upload.assetType === "voice_sample";
    const category =
      upload.assetType === "music" ? "music"
      : upload.assetType === "sound" ? "sound_effect"
      : upload.assetType === "voice_sample" ? "voice"
      : "reference_image";

    return {
      id: studioAssetId(category, `upload_${upload.id}`),
      name: upload.fileName.replace(/\.[^.]+$/, "") || "Upload",
      category,
      description: upload.originContext ? `Uploaded (${upload.originContext})` : "User upload",
      tags: ["user_upload", upload.assetType, upload.originContext ?? ""].filter(Boolean),
      owner: ownerId,
      source: "user",
      visibility: "user_owned",
      status: "active",
      createdAt: upload.createdAt,
      updatedAt: upload.createdAt,
      sourceRef: {
        entityType: isAudio ? "audio_catalog" : "scene_image",
        entityId: upload.id,
      },
      previewUrl: upload.thumbnailUrl ?? (isAudio ? null : upload.publicUrl),
      downloadUrl: upload.publicUrl,
      storageKey: upload.storageKey,
      collectionIds: [],
      origin: "uploaded",
    };
  });
}

export function buildUserAudioLibraryRegistryAssets(
  assets: UserAudioLibraryAsset[],
  ownerId: string
): StudioAsset[] {
  return assets.map((asset) => {
    const category = asset.kind === "music" ? "music" : "sound_effect";
    return {
      id: studioAssetId(category, `user_audio_${asset.id}`),
      name: asset.name,
      category,
      description: `${asset.kind} upload — ${asset.category}`,
      tags: ["user_upload", asset.kind, asset.category, asset.mood],
      owner: ownerId,
      source: "user",
      visibility: "user_owned",
      status: "active",
      createdAt: asset.createdAt,
      updatedAt: asset.createdAt,
      sourceRef: { entityType: "audio_catalog", entityId: asset.id },
      previewUrl: null,
      downloadUrl: asset.audioUrl,
      storageKey: asset.storageKey,
      collectionIds: [],
      origin: "uploaded",
    };
  });
}

export function buildUserVoiceCloneRegistryAssets(
  clones: UserVoiceLibraryEntry[],
  ownerId: string
): StudioAsset[] {
  return clones
    .filter((c) => c.status === "completed")
    .map((clone) => ({
      id: studioAssetId("voice", `clone_${clone.cloneId}`),
      name: clone.name,
      category: "voice" as const,
      description: "Voice clone",
      tags: ["voice_clone", clone.language, clone.provider],
      owner: ownerId,
      source: "user" as const,
      visibility: "user_owned" as const,
      status: "active" as const,
      createdAt: clone.createdAt,
      updatedAt: clone.lastUsedAt || clone.createdAt,
      sourceRef: { entityType: "voice_preset" as const, entityId: clone.cloneId },
      previewUrl: clone.previewUrl || null,
      downloadUrl: clone.previewUrl || null,
      collectionIds: [],
      origin: "uploaded" as const,
    }));
}
