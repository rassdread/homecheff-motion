import { Buffer } from "node:buffer";
import sharp from "sharp";
import {
  buildEditorCompositorLayers,
  type EditorCompositorLayer,
} from "@/lib/editor-compositor";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith("data:")) {
    const base64 = imageUrl.split(",")[1];
    if (!base64) {
      throw new Error("Invalid data URL");
    }
    return Buffer.from(base64, "base64");
  }
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function layerPixelRect(layer: EditorCompositorLayer, width: number, height: number) {
  const drawW = Math.max(1, Math.round(layer.width * width * layer.transform.scale));
  const drawH = Math.max(1, Math.round(layer.height * height * layer.transform.scale));
  const left = Math.round(layer.transform.x * width - drawW / 2);
  const top = Math.round(layer.transform.y * height - drawH / 2);
  return { drawW, drawH, left, top };
}

export async function renderEditorCompositionPng(
  document: EditorCanvasDocument,
  width = 1600,
  height = 1200
): Promise<Buffer> {
  const layers = buildEditorCompositorLayers(document);
  const background = layers.find((l) => l.kind === "background");
  if (!background?.imageUrl) {
    throw new Error("Missing background image for composition render");
  }

  const bgBuffer = await fetchImageBuffer(background.imageUrl);
  const pipeline = sharp(bgBuffer).resize(width, height, { fit: "fill" });
  const composites: sharp.OverlayOptions[] = [];

  for (const layer of layers) {
    if (layer.kind === "background" || layer.kind === "text" || !layer.visible || !layer.imageUrl) {
      continue;
    }
    const overlayBuffer = await fetchImageBuffer(layer.imageUrl);
    const { drawW, drawH, left, top } = layerPixelRect(layer, width, height);
    const resized = await sharp(overlayBuffer)
      .resize(drawW, drawH, { fit: "inside" })
      .png()
      .toBuffer();
    composites.push({
      input: resized,
      left: Math.max(0, left),
      top: Math.max(0, top),
      blend: "over",
    });
  }

  if (composites.length === 0) {
    return pipeline.png().toBuffer();
  }

  return pipeline.composite(composites).png().toBuffer();
}
