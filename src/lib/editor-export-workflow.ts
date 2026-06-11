import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import { evaluatePrintQuality } from "@/lib/editor-instruction-print-export";
import type { EditorInstructionPrintPreset } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const EDITOR_EXPORT_SOCIAL_TARGETS = [
  "instagram",
  "tiktok",
  "facebook",
  "linkedin",
  "pinterest",
] as const;

export const EDITOR_EXPORT_WEB_TARGETS = [
  "website",
  "marketplace",
  "banner",
  "landing_page",
] as const;

export const EDITOR_EXPORT_PRINT_TARGETS = [
  "poster",
  "flyer",
  "menu",
  "packaging",
  "sticker",
  "label",
  "business_card",
] as const;

export type EditorExportTargetCategory = "social" | "web" | "print" | "presentation";

export type EditorExportTarget = {
  id: string;
  category: EditorExportTargetCategory;
  labelKey: string;
  printPreset?: EditorInstructionPrintPreset;
};

export const EDITOR_EXPORT_TARGETS: EditorExportTarget[] = [
  { id: "instagram", category: "social", labelKey: "editor.workflow.export.target.instagram" },
  { id: "tiktok", category: "social", labelKey: "editor.workflow.export.target.tiktok" },
  { id: "facebook", category: "social", labelKey: "editor.workflow.export.target.facebook" },
  { id: "website", category: "web", labelKey: "editor.workflow.export.target.website" },
  { id: "poster", category: "print", labelKey: "editor.workflow.export.target.poster", printPreset: "poster" },
  { id: "flyer", category: "print", labelKey: "editor.workflow.export.target.flyer", printPreset: "flyer" },
  { id: "a4", category: "print", labelKey: "editor.workflow.export.target.a4", printPreset: "a4" },
  { id: "pitch_deck", category: "presentation", labelKey: "editor.workflow.export.target.pitchDeck" },
];

export function resolveExportSourceUrl(document: EditorCanvasDocument): string {
  const approved = activeApprovedVariant(document);
  return approved?.resultUrl ?? document.backgroundUrl;
}

export function evaluateExportReadiness(
  document: EditorCanvasDocument,
  target: EditorExportTarget,
  sourceWidthPx = 1200,
  sourceHeightPx = 900
) {
  if (target.printPreset) {
    return evaluatePrintQuality({
      preset: target.printPreset,
      sourceWidthPx,
      sourceHeightPx,
    });
  }
  return {
    preset: "a4" as const,
    widthPx: sourceWidthPx,
    heightPx: sourceHeightPx,
    dpi: 72,
    bleedMm: 0,
    safeMarginMm: 0,
    qualityScore: sourceWidthPx >= 1080 ? 85 : 60,
    warnings: sourceWidthPx < 1080 ? ["editor.workflow.export.warning.lowResolution"] : [],
    needsUpscale: false,
    cmykNoteKey: "editor.instructionStudio.v2.print.cmykNote",
  };
}
