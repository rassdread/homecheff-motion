import { getClientImagePreprocessOptionsForRole, preprocessImageFile } from "@/lib/image-preprocess";
import { ImageUploadError, postWizardImageUpload } from "@/lib/instant-image-upload-client";
import type { UploadImageResponse } from "@/types/animation-api";

export async function uploadEditorSourceImage(file: File): Promise<UploadImageResponse> {
  if (!file.type.startsWith("image/")) {
    throw new ImageUploadError("Invalid image type.", "IMAGE_UPLOAD_FAILED");
  }
  const processed = await preprocessImageFile(file, getClientImagePreprocessOptionsForRole("studio_reference"));
  const clientUploadId = crypto.randomUUID();
  const formData = new FormData();
  formData.set("workingImage", processed.optimizedBlob, "working.jpg");
  formData.set("thumbnailImage", processed.thumbnailBlob, "thumb.jpg");
  formData.set("originalFileName", file.name);
  formData.set("mimeType", processed.mimeType);
  formData.set("sizeBytes", String(processed.optimizedBlob.size));
  formData.set("clientUploadId", clientUploadId);
  formData.set("assetType", "source_image");
  return postWizardImageUpload(formData);
}
