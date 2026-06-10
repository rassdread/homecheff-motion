import { resolveProductionOutputSpec, type ProductionOutputProfileId } from "@/lib/production-output-profiles";
import type { EditorCanvasDocument, EditorProductionExportSettings } from "@/types/homecheff-visual-editor";

export const DEFAULT_PRODUCTION_EXPORT_SETTINGS: EditorProductionExportSettings = {
  formats: ["png", "webp", "jpg"],
  transparentBackground: false,
  retinaScale: 2,
  quality: 0.9,
  width: 1600,
  height: 900,
};

export type ProductionReadyExportBundle = {
  profile: "production_ready";
  sessionId: string;
  settings: EditorProductionExportSettings;
  outputProfile: ProductionOutputProfileId;
  recommendedWidth: number;
  recommendedHeight: number;
  formats: string[];
  backgroundUrl: string;
  importedLayerCount: number;
  placementCount: number;
  createdAt: string;
};

export function resolveProductionSettings(
  document: EditorCanvasDocument
): EditorProductionExportSettings {
  return document.exportSettings?.production ?? DEFAULT_PRODUCTION_EXPORT_SETTINGS;
}

export function buildProductionReadyExportBundle(
  document: EditorCanvasDocument,
  outputProfile: ProductionOutputProfileId = "web_ready"
): ProductionReadyExportBundle {
  const spec = resolveProductionOutputSpec(outputProfile);
  const settings = resolveProductionSettings(document);
  return {
    profile: "production_ready",
    sessionId: document.sessionId,
    settings: {
      ...settings,
      width: settings.width || spec.recommendedWidth,
      height: settings.height || spec.recommendedHeight,
      formats: settings.formats.length ? settings.formats : [...spec.formats],
    },
    outputProfile,
    recommendedWidth: spec.recommendedWidth,
    recommendedHeight: spec.recommendedHeight,
    formats: [...spec.formats],
    backgroundUrl: document.backgroundUrl,
    importedLayerCount: document.importedLayers?.length ?? 0,
    placementCount: document.placements.length,
    createdAt: new Date().toISOString(),
  };
}

export function productionExportPixelDimensions(settings: EditorProductionExportSettings): {
  width: number;
  height: number;
} {
  return {
    width: Math.round(settings.width * settings.retinaScale),
    height: Math.round(settings.height * settings.retinaScale),
  };
}
