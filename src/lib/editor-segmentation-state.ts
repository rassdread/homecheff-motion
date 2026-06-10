import type { TranslationKey } from "@/i18n";
import { evaluateEditorMaskGate } from "@/lib/editor-mask-gate";
import type { EditorCanvasLayer, EditorShapePoint } from "@/types/homecheff-visual-editor";

export type EditorSegmentationUiState =
  | "idle"
  | "clicked"
  | "prompt_visible"
  | "segmenting"
  | "mask_ready"
  | "failed_retryable"
  | "failed_provider"
  | "failed_timeout";

export type DeriveSegmentationUiStateInput = {
  clickSegmentPoint: EditorShapePoint | null;
  clickSegmentBusy: boolean;
  refiningSelection: boolean;
  selectedLayer: EditorCanvasLayer | null;
  lastFailureCode?: string | null;
};

export function deriveSegmentationUiState(input: DeriveSegmentationUiStateInput): EditorSegmentationUiState {
  if (input.refiningSelection || input.clickSegmentBusy) {
    return "segmenting";
  }
  if (input.clickSegmentPoint) {
    return "prompt_visible";
  }
  if (input.lastFailureCode === "replicate_timeout") {
    return "failed_timeout";
  }
  if (
    input.lastFailureCode === "SEGMENT_UNAVAILABLE" ||
    input.lastFailureCode === "segmentation_internal_error"
  ) {
    return "failed_provider";
  }
  if (input.lastFailureCode) {
    return "failed_retryable";
  }
  if (input.selectedLayer && evaluateEditorMaskGate(input.selectedLayer).allowed) {
    return "mask_ready";
  }
  return "idle";
}

export function segmentationStateMessageKey(state: EditorSegmentationUiState): TranslationKey | null {
  switch (state) {
    case "idle":
      return "editor.segmentState.idle";
    case "clicked":
      return "editor.segmentState.clicked";
    case "prompt_visible":
      return "editor.segmentState.promptVisible";
    case "segmenting":
      return "editor.segmentState.segmenting";
    case "mask_ready":
      return "editor.segmentState.maskReady";
    case "failed_retryable":
      return "editor.segmentState.failedRetryable";
    case "failed_provider":
      return "editor.segmentState.failedProvider";
    case "failed_timeout":
      return "editor.segmentState.failedTimeout";
    default:
      return null;
  }
}

export function segmentationStateAllowsRetry(state: EditorSegmentationUiState): boolean {
  return (
    state === "failed_retryable" ||
    state === "failed_timeout" ||
    state === "failed_provider"
  );
}
