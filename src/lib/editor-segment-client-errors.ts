import type { EditorSegmentErrorCode } from "@/lib/editor-segmentation-errors";

export function editorSegmentErrorMessageKey(code: string | undefined): string {
  switch (code as EditorSegmentErrorCode | undefined) {
    case "image_fetch_failed":
      return "editor.clickSegment.error.imageFetchFailed";
    case "replicate_timeout":
      return "editor.clickSegment.error.replicateTimeout";
    case "replicate_prediction_failed":
      return "editor.clickSegment.error.replicatePredictionFailed";
    case "replicate_mask_format_unsupported":
      return "editor.clickSegment.error.replicateMaskFormat";
    case "mask_fetch_failed":
      return "editor.clickSegment.error.maskFetchFailed";
    case "blob_upload_failed":
      return "editor.clickSegment.error.blobUploadFailed";
    case "cutout_generation_failed":
      return "editor.clickSegment.error.cutoutGenerationFailed";
    case "response_payload_too_large":
      return "editor.clickSegment.error.responseTooLarge";
    case "SEGMENT_UNAVAILABLE":
      return "editor.clickSegment.error.unavailable";
    default:
      return "editor.clickSegment.failed";
  }
}
