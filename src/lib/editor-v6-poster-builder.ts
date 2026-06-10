import { mmToPixels } from "@/lib/editor-print-export";
import type {
  EditorCanvasDocument,
  EditorPosterTemplate,
  EditorPrintExportSettings,
} from "@/types/homecheff-visual-editor";

export type PosterTemplateSpec = {
  id: EditorPosterTemplate;
  labelKey: string;
  widthMm: number;
  heightMm: number;
  safeMarginMm: number;
  bleedMm: number;
  dpi: 300;
};

export const POSTER_TEMPLATE_SPECS: Record<EditorPosterTemplate, PosterTemplateSpec> = {
  a4: { id: "a4", labelKey: "editor.v6.poster.a4", widthMm: 210, heightMm: 297, safeMarginMm: 5, bleedMm: 3, dpi: 300 },
  a3: { id: "a3", labelKey: "editor.v6.poster.a3", widthMm: 297, heightMm: 420, safeMarginMm: 5, bleedMm: 3, dpi: 300 },
  a2: { id: "a2", labelKey: "editor.v6.poster.a2", widthMm: 420, heightMm: 594, safeMarginMm: 5, bleedMm: 3, dpi: 300 },
  a1: { id: "a1", labelKey: "editor.v6.poster.a1", widthMm: 594, heightMm: 841, safeMarginMm: 5, bleedMm: 3, dpi: 300 },
  instagram: { id: "instagram", labelKey: "editor.v6.poster.instagram", widthMm: 210, heightMm: 210, safeMarginMm: 4, bleedMm: 2, dpi: 300 },
  flyer: { id: "flyer", labelKey: "editor.v6.poster.flyer", widthMm: 148, heightMm: 210, safeMarginMm: 4, bleedMm: 3, dpi: 300 },
  menu: { id: "menu", labelKey: "editor.v6.poster.menu", widthMm: 210, heightMm: 297, safeMarginMm: 8, bleedMm: 3, dpi: 300 },
  event: { id: "event", labelKey: "editor.v6.poster.event", widthMm: 420, heightMm: 594, safeMarginMm: 10, bleedMm: 3, dpi: 300 },
  restaurant: { id: "restaurant", labelKey: "editor.v6.poster.restaurant", widthMm: 297, heightMm: 420, safeMarginMm: 8, bleedMm: 3, dpi: 300 },
  marketplace: { id: "marketplace", labelKey: "editor.v6.poster.marketplace", widthMm: 210, heightMm: 280, safeMarginMm: 5, bleedMm: 2, dpi: 300 },
};

export function posterTemplateToPrintSettings(template: EditorPosterTemplate): EditorPrintExportSettings {
  const spec = POSTER_TEMPLATE_SPECS[template];
  return {
    dpi: spec.dpi,
    unit: "mm",
    preset: "custom",
    width: spec.widthMm,
    height: spec.heightMm,
    bleedMm: spec.bleedMm,
    safeMarginMm: spec.safeMarginMm,
    formats: ["png", "pdf"],
    retinaScale: 1,
  };
}

export function posterPixelDimensions(template: EditorPosterTemplate): {
  width: number;
  height: number;
  safeMarginPx: number;
} {
  const spec = POSTER_TEMPLATE_SPECS[template];
  const bleedWidth = spec.widthMm + spec.bleedMm * 2;
  const bleedHeight = spec.heightMm + spec.bleedMm * 2;
  return {
    width: mmToPixels(bleedWidth, spec.dpi),
    height: mmToPixels(bleedHeight, spec.dpi),
    safeMarginPx: mmToPixels(spec.safeMarginMm, spec.dpi),
  };
}

export function applyPosterTemplate(
  document: EditorCanvasDocument,
  template: EditorPosterTemplate
): EditorCanvasDocument {
  const print = posterTemplateToPrintSettings(template);
  return {
    ...document,
    workspaceMode: "export",
    productivityState: {
      ...document.productivityState,
      posterTemplate: template,
    },
    exportSettings: {
      ...document.exportSettings,
      profile: "print_ready",
      print,
    },
    updatedAt: new Date().toISOString(),
  };
}
