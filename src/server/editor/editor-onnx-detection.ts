import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { detectObjectsForEditor } from "@/server/animation-export/local-vision/object-detector";
import type { ObjectDetectionResult } from "@/server/animation-export/local-vision/object-detector-types";

export type EditorOnnxDetectionResult = ObjectDetectionResult & {
  available: boolean;
};

async function downloadImageToTemp(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch image (${res.status}).`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/png";
  const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  const tempPath = path.join(os.tmpdir(), `hc-editor-detect-${Date.now()}.${ext}`);
  await fs.writeFile(tempPath, buffer);
  return tempPath;
}

export async function detectEditorObjectsFromImageUrl(
  imageUrl: string
): Promise<EditorOnnxDetectionResult> {
  let tempPath: string | null = null;
  try {
    tempPath = await downloadImageToTemp(imageUrl);
    const result = await detectObjectsForEditor(tempPath);
    const available = !result.failed && result.detections.length > 0;
    return { ...result, available: available || !result.failed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      detections: [],
      failed: true,
      error: message,
      available: false,
    };
  } finally {
    if (tempPath) {
      await fs.unlink(tempPath).catch(() => undefined);
    }
  }
}
