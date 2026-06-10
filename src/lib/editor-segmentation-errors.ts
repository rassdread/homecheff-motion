export const EDITOR_SEGMENT_ERROR_CODES = [
  "image_fetch_failed",
  "replicate_timeout",
  "replicate_prediction_failed",
  "replicate_mask_format_unsupported",
  "mask_fetch_failed",
  "blob_upload_failed",
  "cutout_generation_failed",
  "response_payload_too_large",
  "SEGMENT_UNAVAILABLE",
  "segmentation_internal_error",
] as const;

export type EditorSegmentErrorCode = (typeof EDITOR_SEGMENT_ERROR_CODES)[number];

export function mapReplicateErrorToCode(error: string): EditorSegmentErrorCode {
  const lower = error.toLowerCase();
  if (lower.includes("timed out") || lower.includes("timeout")) {
    return "replicate_timeout";
  }
  return "replicate_prediction_failed";
}

export function segmentErrorHttpStatus(code: string): number {
  if (code === "SEGMENT_UNAVAILABLE") {
    return 503;
  }
  if (code === "replicate_timeout") {
    return 504;
  }
  if (
    code === "image_fetch_failed" ||
    code === "replicate_prediction_failed" ||
    code === "replicate_mask_format_unsupported" ||
    code === "mask_fetch_failed" ||
    code === "blob_upload_failed" ||
    code === "cutout_generation_failed" ||
    code === "response_payload_too_large"
  ) {
    return 502;
  }
  return 500;
}

export function classifyBlobPersistError(error: unknown): EditorSegmentErrorCode {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("EXPORT_UPLOAD") || message.toLowerCase().includes("blob")) {
    return "blob_upload_failed";
  }
  return "cutout_generation_failed";
}
