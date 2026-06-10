import {
  buildEditorCompositorLayers,
  type EditorCompositorLayer,
} from "@/lib/editor-compositor";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorCompositionRenderResult = {
  dataUrl: string | null;
  width: number;
  height: number;
  mode: "composited" | "background_only";
  messageKey: string;
};

export const DEFAULT_COMPOSITION_WIDTH = 1600;
export const DEFAULT_COMPOSITION_HEIGHT = 1200;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function drawCompositorLayer(
  ctx: CanvasRenderingContext2D,
  layer: EditorCompositorLayer,
  width: number,
  height: number
): void {
  if (!layer.visible || layer.kind === "text" || !layer.imageUrl) {
    return;
  }
  const img = (drawCompositorLayer as unknown as { _cache?: Map<string, HTMLImageElement> })._cache?.get(
    layer.imageUrl
  );
  if (!img) {
    return;
  }
  const layerW = layer.width * width;
  const layerH = layer.height * height;
  const centerX = layer.transform.x * width;
  const centerY = layer.transform.y * height;
  const drawW = layerW * layer.transform.scale;
  const drawH = layerH * layer.transform.scale;
  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.transform.rotation * Math.PI) / 180);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

export async function renderEditorCompositionToDataUrl(
  editorDocument: EditorCanvasDocument,
  options?: { width?: number; height?: number }
): Promise<EditorCompositionRenderResult> {
  const width = options?.width ?? DEFAULT_COMPOSITION_WIDTH;
  const height = options?.height ?? DEFAULT_COMPOSITION_HEIGHT;
  const layers = buildEditorCompositorLayers(editorDocument);
  const background = layers.find((l) => l.kind === "background");

  if (!background?.imageUrl) {
    return {
      dataUrl: null,
      width,
      height,
      mode: "background_only",
      messageKey: "editor.compositor.render.missingBackground",
    };
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      dataUrl: null,
      width,
      height,
      mode: "background_only",
      messageKey: "editor.compositor.render.ssr",
    };
  }

  const overlayLayers = layers.filter((l) => l.kind !== "background" && l.imageUrl);

  try {
    const urls = [background.imageUrl, ...overlayLayers.map((l) => l.imageUrl)];
    const images = await Promise.all(urls.map((url) => loadImage(url)));
    const cache = new Map<string, HTMLImageElement>();
    urls.forEach((url, index) => cache.set(url, images[index]!));
    (drawCompositorLayer as unknown as { _cache: Map<string, HTMLImageElement> })._cache = cache;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2d unavailable");
    }

    const bgImg = images[0]!;
    ctx.drawImage(bgImg, 0, 0, width, height);
    for (const layer of overlayLayers) {
      drawCompositorLayer(ctx, layer, width, height);
    }

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width,
      height,
      mode: overlayLayers.length > 0 ? "composited" : "background_only",
      messageKey:
        overlayLayers.length > 0
          ? "editor.compositor.render.success"
          : "editor.compositor.render.backgroundOnly",
    };
  } catch {
    return {
      dataUrl: null,
      width,
      height,
      mode: "background_only",
      messageKey: "editor.compositor.render.failed",
    };
  }
}

export async function resolveEditorExportImageUrl(
  editorDocument: EditorCanvasDocument
): Promise<{ url: string; composited: boolean }> {
  const rendered = await renderEditorCompositionToDataUrl(editorDocument);
  if (rendered.dataUrl) {
    return { url: rendered.dataUrl, composited: true };
  }
  return { url: editorDocument.backgroundUrl, composited: false };
}
