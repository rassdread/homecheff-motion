/**
 * Dev trace for manual premium (deep-analyze) vision analysis.
 */

import type { EditorVisionAnalysisDepth } from "@/lib/editor-vision-analysis-tier";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorPremiumAnalysisFlowStep =
  | "button_handler"
  | "entrypoint"
  | "gate"
  | "prepared"
  | "style_dna_started"
  | "style_dna_completed"
  | "vision_parts_started"
  | "vision_parts_completed"
  | "pipeline_result"
  | "acceptance"
  | "document_change"
  | "save_persisted"
  | "ui_refresh"
  | "complete"
  | "failed"
  | "blocked";

export type EditorPremiumAnalysisFlowLog = {
  step: EditorPremiumAnalysisFlowStep;
  analysisDepth?: EditorVisionAnalysisDepth;
  gateAllowed?: boolean;
  providersUsed?: string[];
  styleDnaStarted?: boolean;
  styleDnaCompleted?: boolean;
  visionPartsStarted?: boolean;
  visionPartsCompleted?: boolean;
  partsCount?: number;
  mergedAnalysisPartsCount?: number;
  analysisTierBefore?: string | null;
  analysisTierAfter?: string | null;
  savePersisted?: boolean;
  uiDocumentUpdated?: boolean;
  loadingState?: "idle" | "running" | "done" | "failed";
  failureMessage?: string | null;
  trigger?: string;
  sessionId?: string;
  analysisId?: string | null;
  runId?: string | null;
};

export function analysisTierFromDocument(
  document: Pick<EditorCanvasDocument, "visionV6Meta"> | null | undefined
): string | null {
  return document?.visionV6Meta?.analysisTier ?? null;
}

export function mergedPartsCountFromDocument(
  document: Pick<EditorCanvasDocument, "visionV6Meta"> | null | undefined
): number {
  return document?.visionV6Meta?.mergedAnalysisParts?.length ?? 0;
}

export function logEditorPremiumAnalysisFlow(input: EditorPremiumAnalysisFlowLog): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return;
  }
  // eslint-disable-next-line no-console
  console.error("[editor.premium.analysis.flow]", input);
}
