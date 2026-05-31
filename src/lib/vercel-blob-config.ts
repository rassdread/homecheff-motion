import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { head, put } from "@vercel/blob";

export const EXPORT_BLOB_UPLOAD_CODES = [
  "EXPORT_UPLOAD_AUTH_FAILED",
  "EXPORT_UPLOAD_FAILED",
] as const;

export type ExportBlobUploadCode = (typeof EXPORT_BLOB_UPLOAD_CODES)[number];

export type ExportBlobUploadContext = {
  projectId?: string;
  requestId?: string;
  uploadTarget: string;
  provider: string;
};

export class ExportBlobUploadError extends Error {
  readonly code: ExportBlobUploadCode;
  readonly projectId?: string;
  readonly requestId: string;
  readonly uploadTarget: string;
  readonly provider: string;

  constructor(params: ExportBlobUploadContext & { code: ExportBlobUploadCode; cause?: unknown }) {
    const safeMessage =
      params.code === "EXPORT_UPLOAD_AUTH_FAILED"
        ? "EXPORT_UPLOAD_AUTH_FAILED"
        : "EXPORT_UPLOAD_FAILED";
    super(safeMessage);
    this.name = "ExportBlobUploadError";
    this.code = params.code;
    this.projectId = params.projectId;
    this.requestId = params.requestId ?? randomUUID();
    this.uploadTarget = params.uploadTarget;
    this.provider = params.provider;
    if (params.cause instanceof Error && params.cause.stack) {
      this.cause = params.cause;
    }
  }
}

export function getBlobReadWriteToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() || null;
}

export function isBlobTokenConfigured(): boolean {
  return Boolean(getBlobReadWriteToken());
}

/** Safe startup log — never prints token value. */
export function logBlobConfigStatus(service: string): void {
  console.info("[blob-config]", {
    service,
    "token-present": isBlobTokenConfigured(),
  });
}

export function isBlobAccessDeniedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("access denied") ||
    lower.includes("valid token") ||
    lower.includes("no token found") ||
    lower.includes("blob_read_write_token") ||
    lower.includes("unauthorized") ||
    (lower.includes("vercel blob") &&
      (lower.includes("denied") || lower.includes("token") || lower.includes("auth")))
  );
}

export function classifyExportBlobFailure(error: unknown): ExportBlobUploadCode {
  if (error instanceof ExportBlobUploadError) {
    return error.code;
  }
  if (!isBlobTokenConfigured() || isBlobAccessDeniedError(error)) {
    return "EXPORT_UPLOAD_AUTH_FAILED";
  }
  return "EXPORT_UPLOAD_FAILED";
}

export function exportBlobErrorMessage(code: ExportBlobUploadCode): string {
  if (code === "EXPORT_UPLOAD_AUTH_FAILED") {
    return "Final video upload failed: blob storage is not authorized. Check BLOB_READ_WRITE_TOKEN on the render worker.";
  }
  return "Final video upload failed.";
}

export function logExportBlobUploadFailure(
  error: unknown,
  context: ExportBlobUploadContext & { phase: string }
): void {
  const code = classifyExportBlobFailure(error);
  const requestId =
    error instanceof ExportBlobUploadError ? error.requestId : context.requestId ?? randomUUID();
  const projectId =
    error instanceof ExportBlobUploadError ? error.projectId : context.projectId;
  const logMessage =
    error instanceof Error ? error.message : String(error);
  console.error("[export-blob-upload]", {
    phase: context.phase,
    code,
    projectId,
    requestId,
    uploadTarget: context.uploadTarget,
    provider: context.provider,
    tokenPresent: isBlobTokenConfigured(),
    logMessage: logMessage.slice(0, 300),
  });
}

export async function uploadPublicBlob(params: {
  pathname: string;
  body: Buffer | Uint8Array | Blob | ArrayBuffer | string;
  contentType: string;
  addRandomSuffix?: boolean;
  allowOverwrite?: boolean;
  context: ExportBlobUploadContext;
}): Promise<{ url: string; pathname: string }> {
  const token = getBlobReadWriteToken();
  if (!token) {
    throw new ExportBlobUploadError({
      code: "EXPORT_UPLOAD_AUTH_FAILED",
      ...params.context,
    });
  }

  const putBody =
    typeof params.body === "string"
      ? Buffer.from(params.body, "utf8")
      : Buffer.isBuffer(params.body)
        ? params.body
        : params.body instanceof Uint8Array
          ? Buffer.from(params.body)
          : params.body;

  try {
    const blob = await put(params.pathname, putBody, {
      access: "public",
      contentType: params.contentType,
      addRandomSuffix: params.addRandomSuffix ?? false,
      allowOverwrite: params.allowOverwrite ?? false,
      token,
    });
    return { url: blob.url, pathname: blob.pathname };
  } catch (error) {
    logExportBlobUploadFailure(error, { ...params.context, phase: "put" });
    throw new ExportBlobUploadError({
      code: isBlobAccessDeniedError(error)
        ? "EXPORT_UPLOAD_AUTH_FAILED"
        : "EXPORT_UPLOAD_FAILED",
      ...params.context,
      cause: error,
    });
  }
}

export async function resolvePublicBlobUrlByPathname(pathname: string): Promise<string | null> {
  const token = getBlobReadWriteToken();
  if (!token) {
    return null;
  }
  try {
    const meta = await head(pathname, { token });
    return meta.url?.trim() || null;
  } catch {
    return null;
  }
}
