import type { EditorCanvasDocument, EditorPlacementItem } from "@/types/homecheff-visual-editor";

export type EditorPlacementExportResult = {
  mode: "composition_only" | "pixel_overlay";
  dataUrl: string | null;
  messageKey: string;
};

export async function exportEditorCanvasWithPlacements(
  editorDocument: EditorCanvasDocument
): Promise<EditorPlacementExportResult> {
  const pixelPlacements = editorDocument.placements.filter(
    (p) => p.visible !== false && (p.exactnessMode === "pixel_overlay" || p.exactnessMode === "hybrid")
  ) as EditorPlacementItem[];

  if (pixelPlacements.length === 0) {
    return {
      mode: "composition_only",
      dataUrl: null,
      messageKey: "editor.placement.export.compositionOnly",
    };
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      mode: "composition_only",
      dataUrl: null,
      messageKey: "editor.placement.export.compositionOnly",
    };
  }

  try {
    const width = 1200;
    const height = 900;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas unavailable");
    }

    const bg = await loadImage(editorDocument.backgroundUrl);
    ctx.drawImage(bg, 0, 0, width, height);

    const sorted = [...pixelPlacements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    for (const placement of sorted) {
      const img = await loadImage(placement.previewUrl);
      const w = (placement.canvasWidth ?? 0.2) * width * placement.canvasTransform.scale;
      const h = (placement.canvasHeight ?? 0.15) * height * placement.canvasTransform.scale;
      const x = placement.canvasTransform.x * width - w / 2;
      const y = placement.canvasTransform.y * height - h / 2;
      ctx.save();
      ctx.globalAlpha = placement.opacity ?? 1;
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((placement.canvasTransform.rotation * Math.PI) / 180);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }

    return {
      mode: "pixel_overlay",
      dataUrl: canvas.toDataURL("image/png"),
      messageKey: "editor.placement.export.pixelOverlay",
    };
  } catch {
    return {
      mode: "composition_only",
      dataUrl: null,
      messageKey: "editor.placement.export.compositionOnly",
    };
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}
