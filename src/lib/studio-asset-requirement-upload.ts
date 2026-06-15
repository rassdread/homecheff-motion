import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { ImageUploadError, postWizardImageUpload } from "@/lib/instant-image-upload-client";
import { STUDIO_ASSET_REQUIREMENT_ENDPOINTS } from "@/lib/studio-asset-requirement-routing";
import { uploadUserAudioLibraryAssetApi } from "@/lib/studio-audio-library-client";
import type { BriefAssetRequirementKind } from "@/lib/studio-brief-asset-wizards";

export type UploadedRequirementReference = {
  url: string;
  storageKey?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  name: string;
  endpoint: string;
  kind: "image" | "audio";
};

export async function uploadRequirementReference(
  file: File,
  requirementKind: BriefAssetRequirementKind
): Promise<{ ok: true; asset: UploadedRequirementReference } | { ok: false; error: string; endpoint: string }> {
  const isAudio = requirementKind === "voice" || requirementKind === "music" || requirementKind === "sfx";

  if (isAudio) {
    const audioKind = requirementKind === "music" ? "music" : "sfx";
    const endpoint = STUDIO_ASSET_REQUIREMENT_ENDPOINTS.uploadAudio;
    const res = await uploadUserAudioLibraryAssetApi(file, {
      kind: audioKind,
      name: file.name.replace(/\.[^.]+$/, ""),
      category: requirementKind === "voice" ? "voice_reference" : "custom",
      mood: "neutral",
      energy: "medium",
    });
    if (!res.ok || !res.data.asset) {
      return {
        ok: false,
        error: res.data?.error ?? "Audio upload failed",
        endpoint,
      };
    }
    return {
      ok: true,
      asset: {
        url: res.data.asset.audioUrl,
        storageKey: res.data.asset.storageKey,
        name: res.data.asset.name,
        mimeType: file.type,
        endpoint,
        kind: "audio",
      },
    };
  }

  const endpoint = STUDIO_ASSET_REQUIREMENT_ENDPOINTS.uploadImage;
  try {
    const { optimizedBlob, thumbnailBlob, mimeType } = await preprocessImageFile(
      file,
      getClientImagePreprocessOptionsForRole("studio_reference")
    );
    const formData = new FormData();
    formData.set("workingImage", optimizedBlob, "working.jpg");
    formData.set("thumbnailImage", thumbnailBlob, "thumb.jpg");
    formData.set("originalFileName", file.name);
    formData.set("mimeType", mimeType);
    formData.set("sizeBytes", String(file.size));
    formData.set("clientUploadId", crypto.randomUUID());
    const uploaded = await postWizardImageUpload(formData);
    return {
      ok: true,
      asset: {
        url: uploaded.workingImageUrl,
        storageKey: uploaded.workingStorageKey,
        thumbnailUrl: uploaded.thumbnailUrl ?? uploaded.workingImageUrl,
        mimeType,
        name: file.name.replace(/\.[^.]+$/, ""),
        endpoint,
        kind: "image",
      },
    };
  } catch (e) {
    const message =
      e instanceof ImageUploadError ? e.message : e instanceof Error ? e.message : "Upload failed";
    return { ok: false, error: message, endpoint };
  }
}
