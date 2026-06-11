import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import {
  evaluatePrintQuality,
  mmToPx,
  PRINT_DPI_TARGET,
  printPresetSpec,
} from "@/lib/editor-instruction-print-export";
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

export const EDITOR_EXPORT_TARGET_CATEGORIES = [
  "social",
  "website",
  "marketplace",
  "presentation",
  "print",
  "custom",
] as const;

export type EditorExportTargetCategory = (typeof EDITOR_EXPORT_TARGET_CATEGORIES)[number];

export const EDITOR_UPSCALE_MODES = ["safe", "creative", "maximum_detail"] as const;

export type EditorUpscaleMode = (typeof EDITOR_UPSCALE_MODES)[number];

export const EDITOR_AI_ENHANCEMENTS = [
  "upscale",
  "noise_reduction",
  "text_sharpening",
  "logo_restoration",
  "color_optimization",
  "print_optimization",
  "margin_preparation",
] as const;

export type EditorAiEnhancement = (typeof EDITOR_AI_ENHANCEMENTS)[number];

export const EDITOR_PRINT_FORMAT_PRESETS: EditorInstructionPrintPreset[] = [
  "a5",
  "a4",
  "a3",
  "a2",
  "a1",
  "a0",
  "large_70x100",
  "large_100x150",
  "large_120x180",
  "custom",
];

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
  { id: "linkedin", category: "social", labelKey: "editor.workflow.export.target.linkedin" },
  { id: "website", category: "website", labelKey: "editor.workflow.export.target.website" },
  { id: "marketplace", category: "marketplace", labelKey: "editor.workflow.export.target.marketplace" },
  { id: "pitch_deck", category: "presentation", labelKey: "editor.workflow.export.target.pitchDeck" },
  { id: "poster", category: "print", labelKey: "editor.workflow.export.target.poster", printPreset: "poster" },
  { id: "flyer", category: "print", labelKey: "editor.workflow.export.target.flyer", printPreset: "flyer" },
  { id: "a4", category: "print", labelKey: "editor.workflow.export.target.a4", printPreset: "a4" },
  { id: "packaging", category: "print", labelKey: "editor.workflow.export.target.packaging", printPreset: "packaging_mockup" },
  { id: "custom", category: "custom", labelKey: "editor.workflow.export.target.custom" },
];

export function exportTargetsForCategory(category: EditorExportTargetCategory): EditorExportTarget[] {
  return EDITOR_EXPORT_TARGETS.filter((t) => t.category === category);
}

export function resolveExportSourceUrl(document: EditorCanvasDocument): string {
  const approved = activeApprovedVariant(document);
  return approved?.resultUrl ?? document.backgroundUrl;
}

export type PrintReadinessReport = ReturnType<typeof evaluatePrintQuality> & {
  logoQualityScore: number;
  textReadabilityScore: number;
  bleedReady: boolean;
  safeMarginReady: boolean;
  colorQualityScore: number;
  printSuitabilityScore: number;
};

export function evaluatePrintReadiness(input: {
  preset: EditorInstructionPrintPreset;
  sourceWidthPx: number;
  sourceHeightPx: number;
}): PrintReadinessReport {
  const base = evaluatePrintQuality(input);
  const logoQualityScore = input.sourceWidthPx >= 1200 ? 90 : input.sourceWidthPx >= 800 ? 70 : 45;
  const textReadabilityScore = input.sourceWidthPx >= 1500 ? 88 : input.sourceWidthPx >= 1000 ? 72 : 50;
  const colorQualityScore = base.qualityScore;
  const printSuitabilityScore = Math.round(
    (base.qualityScore + logoQualityScore + textReadabilityScore + colorQualityScore) / 4
  );
  return {
    ...base,
    logoQualityScore,
    textReadabilityScore,
    bleedReady: base.bleedMm > 0,
    safeMarginReady: base.safeMarginMm > 0,
    colorQualityScore,
    printSuitabilityScore,
  };
}

export function evaluateExportReadiness(
  document: EditorCanvasDocument,
  target: EditorExportTarget,
  sourceWidthPx = 1200,
  sourceHeightPx = 900
) {
  if (target.printPreset) {
    return evaluatePrintReadiness({
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
    logoQualityScore: sourceWidthPx >= 1080 ? 80 : 55,
    textReadabilityScore: sourceWidthPx >= 1080 ? 78 : 52,
    bleedReady: false,
    safeMarginReady: false,
    colorQualityScore: sourceWidthPx >= 1080 ? 82 : 58,
    printSuitabilityScore: sourceWidthPx >= 1080 ? 80 : 55,
  };
}

export function upscaleMultiplier(mode: EditorUpscaleMode): number {
  switch (mode) {
    case "creative":
      return 2.5;
    case "maximum_detail":
      return 4;
    case "safe":
    default:
      return 2;
  }
}

export function effectiveSourceDimensions(
  sourceWidthPx: number,
  sourceHeightPx: number,
  upscaleMode: EditorUpscaleMode | null
): { widthPx: number; heightPx: number } {
  if (!upscaleMode) {
    return { widthPx: sourceWidthPx, heightPx: sourceHeightPx };
  }
  const factor = upscaleMultiplier(upscaleMode);
  return {
    widthPx: Math.round(sourceWidthPx * factor),
    heightPx: Math.round(sourceHeightPx * factor),
  };
}

export function maxSafePrintPresetForSource(
  sourceWidthPx: number,
  sourceHeightPx: number,
  upscaleMode: EditorUpscaleMode | null = null
): EditorInstructionPrintPreset {
  const { widthPx, heightPx } = effectiveSourceDimensions(
    sourceWidthPx,
    sourceHeightPx,
    upscaleMode
  );
  const ordered: EditorInstructionPrintPreset[] = [
    "a0",
    "a1",
    "a2",
    "a3",
    "large_120x180",
    "large_100x150",
    "large_70x100",
    "a4",
    "a5",
  ];
  for (const preset of ordered) {
    const spec = printPresetSpec(preset);
    const reqW = mmToPx(spec.widthMm, PRINT_DPI_TARGET);
    const reqH = mmToPx(spec.heightMm, PRINT_DPI_TARGET);
    if (widthPx >= reqW && heightPx >= reqH) {
      return preset;
    }
  }
  return "a5";
}

export type MaxSafePrintSizeReport = {
  withoutUpscale: EditorInstructionPrintPreset;
  withSafeUpscale: EditorInstructionPrintPreset;
  withPremiumUpscale: EditorInstructionPrintPreset;
};

export function computeMaxSafePrintSize(
  sourceWidthPx: number,
  sourceHeightPx: number
): MaxSafePrintSizeReport {
  return {
    withoutUpscale: maxSafePrintPresetForSource(sourceWidthPx, sourceHeightPx, null),
    withSafeUpscale: maxSafePrintPresetForSource(sourceWidthPx, sourceHeightPx, "safe"),
    withPremiumUpscale: maxSafePrintPresetForSource(sourceWidthPx, sourceHeightPx, "creative"),
  };
}

export function upscaleModeLabelKey(mode: EditorUpscaleMode): string {
  return `editor.v3.export.upscale.${mode}`;
}

export function printFormatLabelKey(preset: EditorInstructionPrintPreset): string {
  const known = `editor.v3.export.printFormat.${preset}`;
  return known;
}
