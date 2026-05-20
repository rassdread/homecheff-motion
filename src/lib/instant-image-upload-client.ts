import {
  IMAGE_UPLOAD_USER_MESSAGE_NL,
  type ImageUploadErrorBody,
  type ImageUploadErrorCode,
} from "@/lib/instant-image-upload-errors";
import type { UploadImageResponse } from "@/types/animation-api";

export class ImageUploadError extends Error {
  readonly code: ImageUploadErrorCode;
  readonly requestId?: string;

  constructor(message: string, code: ImageUploadErrorCode, requestId?: string) {
    super(message);
    this.name = "ImageUploadError";
    this.code = code;
    this.requestId = requestId;
  }
}

export async function postWizardImageUpload(
  formData: FormData
): Promise<UploadImageResponse> {
  const res = await fetch("/api/uploads/images", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const body = (data ?? {}) as Partial<ImageUploadErrorBody> & { error?: string };
    throw new ImageUploadError(
      body.message ?? body.error ?? IMAGE_UPLOAD_USER_MESSAGE_NL,
      body.code ?? "IMAGE_UPLOAD_FAILED",
      body.requestId
    );
  }

  return data as UploadImageResponse;
}
