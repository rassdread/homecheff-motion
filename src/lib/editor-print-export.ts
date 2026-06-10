import { formatEpsLimitationNote } from "@/lib/production-output-profiles";
import type {
  EditorCanvasDocument,
  EditorPrintExportSettings,
  EditorPrintSizePreset,
} from "@/types/homecheff-visual-editor";

export const DEFAULT_PRINT_SETTINGS: EditorPrintExportSettings = {
  dpi: 300,
  unit: "mm",
  preset: "a4",
  width: 210,
  height: 297,
  bleedMm: 3,
  safeMarginMm: 5,
  formats: ["png", "pdf"],
  retinaScale: 1,
};

const PRESET_MM: Record<Exclude<EditorPrintSizePreset, "custom">, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a3: { width: 297, height: 420 },
  a2: { width: 420, height: 594 },
  a1: { width: 594, height: 841 },
  square_poster: { width: 500, height: 500 },
  instagram_poster: { width: 210, height: 210 },
};

export function resolvePrintPresetMm(preset: EditorPrintSizePreset): { width: number; height: number } {
  if (preset === "custom") {
    return { width: DEFAULT_PRINT_SETTINGS.width, height: DEFAULT_PRINT_SETTINGS.height };
  }
  return PRESET_MM[preset];
}

export function mmToPixels(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

export function printDimensionsPixels(settings: EditorPrintExportSettings): {
  width: number;
  height: number;
  bleedPx: number;
  safeMarginPx: number;
} {
  const widthMm = settings.width + settings.bleedMm * 2;
  const heightMm = settings.height + settings.bleedMm * 2;
  return {
    width: mmToPixels(widthMm, settings.dpi) * settings.retinaScale,
    height: mmToPixels(heightMm, settings.dpi) * settings.retinaScale,
    bleedPx: mmToPixels(settings.bleedMm, settings.dpi),
    safeMarginPx: mmToPixels(settings.safeMarginMm, settings.dpi),
  };
}

export type PrintReadyExportBundle = {
  profile: "print_ready";
  sessionId: string;
  settings: EditorPrintExportSettings;
  pixelWidth: number;
  pixelHeight: number;
  formats: string[];
  epsNote: string;
  vectorWarningKey: string;
  backgroundUrl: string;
  createdAt: string;
};

export function resolvePrintSettings(document: EditorCanvasDocument): EditorPrintExportSettings {
  const base = document.exportSettings?.print ?? DEFAULT_PRINT_SETTINGS;
  if (base.preset !== "custom") {
    const mm = resolvePrintPresetMm(base.preset);
    return { ...base, width: mm.width, height: mm.height };
  }
  return base;
}

export function buildPrintReadyExportBundle(document: EditorCanvasDocument): PrintReadyExportBundle {
  const settings = resolvePrintSettings(document);
  const dims = printDimensionsPixels(settings);
  return {
    profile: "print_ready",
    sessionId: document.sessionId,
    settings,
    pixelWidth: dims.width,
    pixelHeight: dims.height,
    formats: [...settings.formats],
    epsNote: formatEpsLimitationNote(),
    vectorWarningKey: "editor.v5.print.vectorWarning",
    backgroundUrl: document.backgroundUrl,
    createdAt: new Date().toISOString(),
  };
}
