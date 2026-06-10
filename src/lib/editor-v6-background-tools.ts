import type { TranslationKey } from "@/i18n";
import { brand } from "@/lib/brand";
import type { EditorBackgroundToolId, EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const BACKGROUND_TOOL_LABEL_KEYS: Record<EditorBackgroundToolId, TranslationKey> = {
  remove: "editor.v6.background.remove",
  blur: "editor.v6.background.blur",
  replace: "editor.v6.background.replace",
  expand: "editor.v6.background.expand",
  transparent_export: "editor.v6.background.transparent",
  sky: "editor.v6.background.sky",
  gradient: "editor.v6.background.gradient",
  brand_background: "editor.v6.background.brand",
};

export const BACKGROUND_TOOL_IDS: EditorBackgroundToolId[] = [
  "remove",
  "blur",
  "replace",
  "expand",
  "transparent_export",
  "sky",
  "gradient",
  "brand_background",
];

export function brandBackgroundValue(): string {
  return `linear-gradient(135deg, ${brand.studioGreen} 0%, ${brand.studioBlue} 100%)`;
}

export function applyBackgroundToolIntent(
  document: EditorCanvasDocument,
  toolId: EditorBackgroundToolId
): { document: EditorCanvasDocument; apiMode?: "remove_background" | "replace" } {
  switch (toolId) {
    case "remove":
      return { document, apiMode: "remove_background" };
    case "replace":
    case "sky":
    case "gradient":
    case "brand_background":
      return { document, apiMode: "replace" };
    case "blur":
    case "expand":
    case "transparent_export":
      return {
        document: {
          ...document,
          exportSettings: {
            ...document.exportSettings,
            profile: "production_ready",
            production: {
              formats: ["png"],
              transparentBackground: toolId === "transparent_export",
              retinaScale: 2,
              quality: 0.92,
              width: 1600,
              height: 900,
              ...(document.exportSettings?.production ?? {}),
            },
          },
          updatedAt: new Date().toISOString(),
        },
      };
    default:
      return { document };
  }
}

export function backgroundToolPrompt(toolId: EditorBackgroundToolId): string | undefined {
  switch (toolId) {
    case "sky":
      return "replace background with bright outdoor sky";
    case "gradient":
      return "replace background with soft green to blue gradient";
    case "brand_background":
      return "replace background with clean HomeCheff brand gradient";
    case "blur":
      return "blur the background while keeping subject sharp";
    case "expand":
      return "expand background outward naturally";
    default:
      return undefined;
  }
}
