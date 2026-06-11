import type {
  EditorInstructionPrintExportRecord,
  EditorInstructionPrintPreset,
} from "@/types/editor-instruction-studio";

export const PRINT_DPI_TARGET = 300;
export const PRINT_BLEED_MM_DEFAULT = 3;
export const PRINT_SAFE_MARGIN_MM_DEFAULT = 5;

export type PrintPresetSpec = {
  id: EditorInstructionPrintPreset;
  labelKey: string;
  widthMm: number;
  heightMm: number;
};

export const PRINT_PRESET_SPECS: PrintPresetSpec[] = [
  { id: "a5", labelKey: "editor.instructionStudio.v2.print.preset.a5", widthMm: 148, heightMm: 210 },
  { id: "a4", labelKey: "editor.instructionStudio.v2.print.preset.a4", widthMm: 210, heightMm: 297 },
  { id: "a3", labelKey: "editor.instructionStudio.v2.print.preset.a3", widthMm: 297, heightMm: 420 },
  { id: "a2", labelKey: "editor.v3.export.printFormat.a2", widthMm: 420, heightMm: 594 },
  { id: "a1", labelKey: "editor.v3.export.printFormat.a1", widthMm: 594, heightMm: 841 },
  { id: "a0", labelKey: "editor.v3.export.printFormat.a0", widthMm: 841, heightMm: 1189 },
  { id: "poster", labelKey: "editor.instructionStudio.v2.print.preset.poster", widthMm: 420, heightMm: 594 },
  { id: "flyer", labelKey: "editor.instructionStudio.v2.print.preset.flyer", widthMm: 148, heightMm: 210 },
  { id: "sticker", labelKey: "editor.instructionStudio.v2.print.preset.sticker", widthMm: 100, heightMm: 100 },
  { id: "label", labelKey: "editor.instructionStudio.v2.print.preset.label", widthMm: 90, heightMm: 50 },
  { id: "menu_card", labelKey: "editor.instructionStudio.v2.print.preset.menuCard", widthMm: 100, heightMm: 210 },
  {
    id: "packaging_mockup",
    labelKey: "editor.instructionStudio.v2.print.preset.packagingMockup",
    widthMm: 200,
    heightMm: 280,
  },
  { id: "large_70x100", labelKey: "editor.v3.export.printFormat.large_70x100", widthMm: 700, heightMm: 1000 },
  { id: "large_100x150", labelKey: "editor.v3.export.printFormat.large_100x150", widthMm: 1000, heightMm: 1500 },
  { id: "large_120x180", labelKey: "editor.v3.export.printFormat.large_120x180", widthMm: 1200, heightMm: 1800 },
  { id: "custom", labelKey: "editor.v3.export.printFormat.custom", widthMm: 210, heightMm: 297 },
];

export function printPresetSpec(preset: EditorInstructionPrintPreset): PrintPresetSpec {
  return PRINT_PRESET_SPECS.find((p) => p.id === preset) ?? PRINT_PRESET_SPECS[0]!;
}

export function mmToPx(mm: number, dpi = PRINT_DPI_TARGET): number {
  return Math.round((mm / 25.4) * dpi);
}

export type PrintQualityReport = {
  preset: EditorInstructionPrintPreset;
  widthPx: number;
  heightPx: number;
  dpi: number;
  bleedMm: number;
  safeMarginMm: number;
  qualityScore: number;
  warnings: string[];
  needsUpscale: boolean;
  cmykNoteKey: string;
};

export function evaluatePrintQuality(input: {
  preset: EditorInstructionPrintPreset;
  sourceWidthPx: number;
  sourceHeightPx: number;
  dpi?: number;
  bleedMm?: number;
  safeMarginMm?: number;
}): PrintQualityReport {
  const spec = printPresetSpec(input.preset);
  const dpi = input.dpi ?? PRINT_DPI_TARGET;
  const bleedMm = input.bleedMm ?? PRINT_BLEED_MM_DEFAULT;
  const safeMarginMm = input.safeMarginMm ?? PRINT_SAFE_MARGIN_MM_DEFAULT;
  const widthPx = mmToPx(spec.widthMm + bleedMm * 2, dpi);
  const heightPx = mmToPx(spec.heightMm + bleedMm * 2, dpi);
  const warnings: string[] = [];
  let qualityScore = 100;

  const needsUpscale = input.sourceWidthPx < widthPx || input.sourceHeightPx < heightPx;
  if (needsUpscale) {
    warnings.push("editor.instructionStudio.v2.print.warning.lowResolution");
    qualityScore -= 35;
  }
  if (input.sourceWidthPx < 800) {
    warnings.push("editor.instructionStudio.v2.print.warning.smallSource");
    qualityScore -= 20;
  }
  if (dpi < PRINT_DPI_TARGET) {
    warnings.push("editor.instructionStudio.v2.print.warning.dpiBelow300");
    qualityScore -= 15;
  }

  return {
    preset: input.preset,
    widthPx,
    heightPx,
    dpi,
    bleedMm,
    safeMarginMm,
    qualityScore: Math.max(0, qualityScore),
    warnings,
    needsUpscale,
    cmykNoteKey: "editor.instructionStudio.v2.print.cmykNote",
  };
}

export function createPrintExportRecord(input: {
  variantId: string;
  preset: EditorInstructionPrintPreset;
  sourceWidthPx: number;
  sourceHeightPx: number;
  format?: "png" | "pdf" | "tiff";
}): EditorInstructionPrintExportRecord {
  const report = evaluatePrintQuality({
    preset: input.preset,
    sourceWidthPx: input.sourceWidthPx,
    sourceHeightPx: input.sourceHeightPx,
  });
  return {
    id: `print_${Date.now()}`,
    variantId: input.variantId,
    preset: input.preset,
    widthPx: report.widthPx,
    heightPx: report.heightPx,
    dpi: report.dpi,
    bleedMm: report.bleedMm,
    safeMarginMm: report.safeMarginMm,
    format: input.format ?? "png",
    warnings: report.warnings,
    qualityScore: report.qualityScore,
    createdAt: new Date().toISOString(),
  };
}
