import { randomUUID } from "node:crypto";

export const IMAGE_UPLOAD_ERROR_CODES = [
  "IMAGE_UPLOAD_FAILED",
  "BLOB_UPLOAD_FAILED",
  "IMAGE_PROCESSING_FAILED",
  "DB_WRITE_FAILED",
] as const;

export type ImageUploadErrorCode = (typeof IMAGE_UPLOAD_ERROR_CODES)[number];

export const IMAGE_UPLOAD_USER_MESSAGE_NL =
  "Afbeelding uploaden mislukt. Probeer opnieuw.";

export type ImageUploadErrorBody = {
  ok: false;
  code: ImageUploadErrorCode;
  message: string;
  requestId: string;
};

export function createImageUploadRequestId(): string {
  return randomUUID();
}

export function buildImageUploadErrorBody(params: {
  code: ImageUploadErrorCode;
  requestId: string;
  message?: string;
}): ImageUploadErrorBody {
  return {
    ok: false,
    code: params.code,
    message: params.message ?? IMAGE_UPLOAD_USER_MESSAGE_NL,
    requestId: params.requestId,
  };
}

export function classifyImageUploadFailure(error: unknown): {
  code: ImageUploadErrorCode;
  httpStatus: number;
  logMessage: string;
} {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("blob_read_write_token") ||
    lower.includes("no token found") ||
    lower.includes("vercel blob") ||
    lower.includes("failed to upload") ||
    lower.includes("blob store")
  ) {
    return {
      code: "BLOB_UPLOAD_FAILED",
      httpStatus: 503,
      logMessage: message,
    };
  }

  if (
    lower.includes("sharp") ||
    lower.includes("vips") ||
    lower.includes("input buffer") ||
    lower.includes("unsupported image") ||
    lower.includes("too large") ||
    lower.includes("extract") ||
    lower.includes("process")
  ) {
    return {
      code: "IMAGE_PROCESSING_FAILED",
      httpStatus: lower.includes("too large") ? 400 : 422,
      logMessage: message,
    };
  }

  if (
    lower.includes("prisma") ||
    lower.includes("database") ||
    lower.includes("unique constraint")
  ) {
    return {
      code: "DB_WRITE_FAILED",
      httpStatus: 500,
      logMessage: message,
    };
  }

  return {
    code: "IMAGE_UPLOAD_FAILED",
    httpStatus: 500,
    logMessage: message,
  };
}

export function isBlobTokenConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function logInstantImages(
  phase: string,
  requestId: string,
  extra?: Record<string, unknown>
): void {
  console.info(`[instant-images] ${phase}`, { requestId, ...extra });
}

export function logInstantImagesError(
  requestId: string,
  code: ImageUploadErrorCode,
  logMessage: string,
  extra?: Record<string, unknown>
): void {
  console.error(`[instant-images] error code=${code}`, {
    requestId,
    logMessage,
    ...extra,
  });
}
