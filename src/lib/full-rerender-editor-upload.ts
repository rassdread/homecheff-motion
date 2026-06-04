import { getClientImagePreprocessOptionsForRole } from "@/lib/image-preprocess";
import { preprocessImageFile } from "@/lib/image-preprocess";
import {
  ImageUploadError,
  postWizardImageUpload,
} from "@/lib/instant-image-upload-client";
import type { UploadImageResponse } from "@/types/animation-api";
import type { FullRerenderEditorImage } from "@/lib/full-rerender-editor-types";

export async function uploadFullRerenderImageFile(
  file: File,
  uploadRole: string
): Promise<{ image: FullRerenderEditorImage; upload: UploadImageResponse }> {
  if (!file.type.startsWith("image/")) {
    throw new ImageUploadError("Invalid image type.", "IMAGE_UPLOAD_FAILED");
  }
  const processed = await preprocessImageFile(
    file,
    getClientImagePreprocessOptionsForRole(uploadRole)
  );
  const id = `new-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const formData = new FormData();
  formData.append(
    "workingImage",
    new File([processed.optimizedBlob], `working-${id}`, { type: processed.mimeType })
  );
  formData.append(
    "thumbnailImage",
    new File([processed.thumbnailBlob], `thumb-${id}`, { type: processed.mimeType })
  );
  formData.append("originalFileName", file.name);
  formData.append("mimeType", processed.mimeType);
  formData.append("sizeBytes", String(processed.optimizedBlob.size));
  formData.append("clientUploadId", id);

  const upload = await postWizardImageUpload(formData);
  const previewUrl = upload.thumbnailUrl?.trim() || upload.workingImageUrl;
  return {
    upload,
    image: {
      id,
      isNew: true,
      originalFileName: file.name,
      previewUrl,
      remoteWorkingUrl: upload.workingImageUrl,
      remoteThumbnailUrl: upload.thumbnailUrl,
      remoteStorageKey: upload.workingStorageKey,
    },
  };
}

export function applyUploadToExistingFullRerenderImage(
  image: FullRerenderEditorImage,
  upload: UploadImageResponse,
  fileName: string
): FullRerenderEditorImage {
  const previewUrl = upload.thumbnailUrl?.trim() || upload.workingImageUrl;
  return {
    ...image,
    isReplaced: !image.isNew,
    originalFileName: fileName,
    previewUrl,
    remoteWorkingUrl: upload.workingImageUrl,
    remoteThumbnailUrl: upload.thumbnailUrl,
    remoteStorageKey: upload.workingStorageKey,
  };
}
